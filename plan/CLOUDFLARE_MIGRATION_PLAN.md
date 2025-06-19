# Cloudflare-Only Deployment Architecture Plan

**Status**: 📋 **OPTIONAL MIGRATION** - Alternative deployment strategy for large-scale usage

## Executive Summary

This document analyzes migrating WorshipWise from its current PocketBase-based architecture to a fully Cloudflare-native deployment using Workers, D1, R2, and Pages. This migration would transform the application from a single-server deployment to a globally distributed, serverless architecture.

**Migration Complexity**: High (6-8 weeks of development)  
**Cost Impact**: Potentially 50-80% reduction for small to medium usage  
**Performance Impact**: Significantly improved global latency  
**Scalability**: Automatic scaling with zero infrastructure management

## Current vs. Proposed Architecture

### Current Architecture (PocketBase)

```
┌─────────────────┐    ┌──────────────────┐
│   SvelteKit     │    │   PocketBase     │
│   (Static)      │────│   (Single Server)│
│                 │    │                  │
│ - Tailwind CSS  │    │ - SQLite DB      │
│ - Svelte 5      │    │ - File Storage   │
│ - TypeScript    │    │ - WebSocket      │
│                 │    │ - Auth System    │
└─────────────────┘    └──────────────────┘
```

### Proposed Architecture (Cloudflare)

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Cloudflare Pages│    │ Cloudflare       │    │ Cloudflare      │
│                 │    │ Workers          │    │ Services        │
│ - SvelteKit     │────│                  │────│                 │
│ - Static Assets │    │ - API Routes     │    │ - D1 Database   │
│ - Global CDN    │    │ - Auth Logic     │    │ - R2 Storage    │
│                 │    │ - Business Logic │    │ - Durable Objs  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Detailed Migration Analysis

### 1. Database Migration: SQLite → Cloudflare D1

#### Current State (PocketBase)

- **Database**: SQLite with PocketBase ORM
- **Location**: Single server file system
- **Features**: Full SQLite functionality, admin UI, migrations
- **Backup**: File-based backups

#### Proposed State (Cloudflare D1)

- **Database**: Cloudflare D1 (SQLite-compatible)
- **Location**: Distributed across Cloudflare edge
- **Features**: Subset of SQLite, no admin UI, programmatic access
- **Backup**: Built-in replication and snapshots

#### Migration Tasks

```sql
-- 1. Schema Migration (D1 compatible)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'musician',
    avatar TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    key_signature TEXT,
    tempo INTEGER,
    time_signature TEXT,
    genre TEXT,
    lyrics TEXT,
    chord_chart TEXT,
    notes TEXT,
    tags TEXT, -- JSON array as TEXT
    created_by TEXT NOT NULL,
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Additional tables for setlists, usage tracking, etc.
```

#### D1 Limitations to Consider

- **Row Limit**: 25MB per database (suitable for worship teams)
- **Query Timeout**: 30 seconds max
- **Concurrent Connections**: Limited by Workers concurrency
- **No Extensions**: Some SQLite extensions unavailable
- **No Direct File Access**: Must use R2 for file storage

### 2. File Storage Migration: PocketBase Files → Cloudflare R2

#### Current State (PocketBase)

- **Storage**: Local file system with HTTP serving
- **URL Pattern**: `http://localhost:8090/api/files/{collection}/{id}/{filename}`
- **Features**: Automatic thumbnails, metadata extraction
- **Security**: Built-in access control

#### Proposed State (Cloudflare R2)

- **Storage**: S3-compatible object storage
- **URL Pattern**: Custom domain with R2 or signed URLs
- **Features**: CDN integration, global replication
- **Security**: Custom access control via Workers

#### Migration Implementation

```typescript
// R2 File Upload Worker
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/api/files/upload') {
			return handleFileUpload(request, env);
		}

		if (request.method === 'GET' && url.pathname.startsWith('/api/files/')) {
			return handleFileServe(request, env);
		}

		return new Response('Not found', { status: 404 });
	}
};

async function handleFileUpload(request: Request, env: Env): Promise<Response> {
	// Authentication check
	const user = await authenticateRequest(request, env);
	if (!user) return new Response('Unauthorized', { status: 401 });

	// Parse multipart form data
	const formData = await request.formData();
	const file = formData.get('file') as File;

	// Generate secure filename
	const fileId = crypto.randomUUID();
	const extension = file.name.split('.').pop();
	const key = `songs/${fileId}.${extension}`;

	// Upload to R2
	await env.R2_BUCKET.put(key, file.stream(), {
		httpMetadata: {
			contentType: file.type,
			contentDisposition: `inline; filename="${file.name}"`
		},
		customMetadata: {
			originalName: file.name,
			uploadedBy: user.id,
			uploadedAt: new Date().toISOString()
		}
	});

	// Store file metadata in D1
	await env.DB.prepare(
		`
    INSERT INTO files (id, key, filename, content_type, size, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `
	)
		.bind(fileId, key, file.name, file.type, file.size, user.id)
		.run();

	return new Response(
		JSON.stringify({
			id: fileId,
			url: `/api/files/${fileId}`
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
}
```

### 3. API Layer Migration: PocketBase API → Cloudflare Workers

#### Current State (PocketBase)

- **Framework**: Built-in REST API with Go
- **Features**: CRUD operations, filtering, sorting, authentication
- **Real-time**: WebSocket subscriptions
- **Validation**: Built-in schema validation

#### Proposed State (Cloudflare Workers)

- **Framework**: Custom API with Hono.js or similar
- **Features**: Custom REST API implementation
- **Real-time**: Durable Objects or Server-Sent Events
- **Validation**: Custom validation with Zod

#### API Implementation Structure

```typescript
// worker.ts - Main API Worker
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('/api/*', jwt({ secret: 'your-secret' }));

// Authentication routes
app.post('/auth/login', async (c) => {
	const { email, password } = await c.req.json();

	// Verify credentials against D1
	const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

	if (!user || !(await verifyPassword(password, user.password_hash))) {
		return c.json({ error: 'Invalid credentials' }, 401);
	}

	const token = await generateJWT(user, c.env.JWT_SECRET);
	return c.json({ user, token });
});

// Songs CRUD
app.get('/api/songs', async (c) => {
	const page = parseInt(c.req.query('page') || '1');
	const limit = parseInt(c.req.query('limit') || '20');
	const search = c.req.query('search') || '';

	let query = 'SELECT * FROM songs';
	let params: any[] = [];

	if (search) {
		query += ' WHERE title LIKE ? OR artist LIKE ?';
		params.push(`%${search}%`, `%${search}%`);
	}

	query += ' ORDER BY created DESC LIMIT ? OFFSET ?';
	params.push(limit, (page - 1) * limit);

	const songs = await c.env.DB.prepare(query)
		.bind(...params)
		.all();
	return c.json(songs);
});

app.post('/api/songs', async (c) => {
	const songData = await c.req.json();
	const user = c.get('jwtPayload');

	// Validation
	const schema = z.object({
		title: z.string().min(1),
		artist: z.string().optional(),
		key_signature: z.string().optional()
		// ... other fields
	});

	const validatedData = schema.parse(songData);

	// Insert into D1
	const songId = crypto.randomUUID();
	await c.env.DB.prepare(
		`
    INSERT INTO songs (id, title, artist, key_signature, created_by)
    VALUES (?, ?, ?, ?, ?)
  `
	)
		.bind(songId, validatedData.title, validatedData.artist, validatedData.key_signature, user.sub)
		.run();

	return c.json({ id: songId, ...validatedData });
});

export default app;
```

### 4. Real-Time Features: WebSocket → Durable Objects

#### Current State (PocketBase)

- **Technology**: Native WebSocket support
- **Features**: Real-time subscriptions to collection changes
- **Scaling**: Single server limitations

#### Proposed State (Cloudflare Durable Objects)

- **Technology**: Durable Objects with WebSocket API
- **Features**: Distributed real-time state management
- **Scaling**: Automatic scaling per object

#### Real-Time Implementation

```typescript
// durable-object.ts - Real-time collaboration
export class SetlistCollaboration implements DurableObject {
	private sessions: Set<WebSocket> = new Set();
	private state: DurableObjectState;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket', { status: 400 });
		}

		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.sessions.add(server);

		server.addEventListener('message', (event) => {
			const data = JSON.parse(event.data as string);
			this.handleMessage(data, server);
		});

		server.addEventListener('close', () => {
			this.sessions.delete(server);
		});

		server.accept();

		return new Response(null, {
			status: 101,
			webSocket: client
		});
	}

	private async handleMessage(data: any, sender: WebSocket) {
		// Broadcast to all connected clients except sender
		for (const session of this.sessions) {
			if (session !== sender) {
				session.send(JSON.stringify(data));
			}
		}

		// Persist state changes
		if (data.type === 'setlist_update') {
			await this.state.storage.put('setlist', data.setlist);
		}
	}
}
```

### 5. Authentication System Migration

#### Current State (PocketBase)

- **System**: Built-in authentication with sessions
- **Features**: User management, roles, password reset
- **Storage**: Database-backed sessions

#### Proposed State (Cloudflare Workers)

- **System**: JWT-based authentication
- **Features**: Custom user management, role-based access
- **Storage**: D1 database with JWT tokens

#### Authentication Implementation

```typescript
// auth.ts - Authentication utilities
export async function generateJWT(user: User, secret: string): Promise<string> {
	const payload = {
		sub: user.id,
		email: user.email,
		role: user.role,
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours
	};

	return await sign(payload, secret);
}

export async function verifyJWT(token: string, secret: string): Promise<User | null> {
	try {
		const payload = await verify(token, secret);
		return payload as User;
	} catch {
		return null;
	}
}

export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
```

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. **Set up Cloudflare services**

   - Create Cloudflare account and configure domain
   - Set up D1 database instance
   - Create R2 bucket for file storage
   - Configure Pages for frontend deployment

2. **Development Environment**
   - Install Wrangler CLI
   - Set up local development with Miniflare
   - Configure environment variables and secrets

### Phase 2: Database Migration (Week 2)

1. **Schema conversion**

   - Convert PocketBase schema to D1-compatible SQL
   - Create migration scripts
   - Set up database seeding for development

2. **Data migration**
   - Export data from PocketBase
   - Transform data format for D1
   - Import data with validation

### Phase 3: API Development (Weeks 3-4)

1. **Core API implementation**

   - Set up Hono.js framework
   - Implement authentication endpoints
   - Create CRUD operations for all entities

2. **File handling**
   - Implement R2 upload/download
   - Create signed URL generation
   - Set up CDN serving

### Phase 4: Real-Time Features (Week 5)

1. **Durable Objects setup**

   - Implement collaboration objects
   - Create WebSocket handling
   - Add real-time state management

2. **Frontend integration**
   - Update API client for new endpoints
   - Implement WebSocket reconnection
   - Add optimistic updates

### Phase 5: Frontend Deployment (Week 6)

1. **Pages deployment**

   - Configure build process for Pages
   - Set up custom domain
   - Implement environment-specific configuration

2. **Integration testing**
   - End-to-end testing with new architecture
   - Performance testing and optimization
   - Security testing and hardening

### Phase 6: Production Migration (Weeks 7-8)

1. **Data migration**
   - Final data export/import
   - DNS cutover
   - Monitoring and rollback planning

## Cost Analysis

### Current Costs (PocketBase)

- **Server**: $5-20/month (VPS hosting)
- **Storage**: Included in server cost
- **Bandwidth**: Usually included or minimal
- **Total**: $5-20/month

### Projected Costs (Cloudflare)

- **Workers**: $5/month (10M requests)
- **D1**: $0.50/month (typical usage)
- **R2**: $1-5/month (depending on file storage)
- **Pages**: $0 (included)
- **Total**: $6-11/month

**Cost Savings**: 20-40% for typical usage, with much better scaling characteristics.

## Performance Implications

### Latency Improvements

- **Current**: Single server location (200-500ms global)
- **Proposed**: Edge deployment (10-50ms global)
- **Improvement**: 75-90% latency reduction

### Scalability

- **Current**: Vertical scaling, manual server management
- **Proposed**: Automatic scaling, zero infrastructure management
- **Capacity**: Handles 10x-100x more traffic automatically

### Reliability

- **Current**: Single point of failure
- **Proposed**: Distributed with automatic failover
- **Uptime**: 99.9%+ vs 99.5% typical

## Risks and Mitigations

### Technical Risks

1. **D1 Limitations**

   - Risk: Feature gaps compared to full SQLite
   - Mitigation: Thorough feature testing, alternative solutions

2. **Worker Execution Limits**

   - Risk: Complex operations may timeout
   - Mitigation: Optimize queries, use background processing

3. **Real-Time Complexity**
   - Risk: Durable Objects learning curve
   - Mitigation: Start with simple implementation, iterate

### Business Risks

1. **Vendor Lock-in**

   - Risk: Difficult to migrate away from Cloudflare
   - Mitigation: Use standard APIs where possible, maintain abstraction layers

2. **Cost Unpredictability**
   - Risk: Serverless costs can spike with usage
   - Mitigation: Set up billing alerts, implement rate limiting

## Recommended Decision Framework

### Choose Cloudflare If:

- ✅ Global user base requiring low latency
- ✅ Expecting significant traffic growth
- ✅ Want zero infrastructure management
- ✅ Team comfortable with serverless architecture
- ✅ Cost optimization is important

### Stay with PocketBase If:

- ✅ Simple deployment requirements
- ✅ Small, localized user base
- ✅ Complex database operations needed
- ✅ Prefer traditional server architecture
- ✅ Quick development iteration needed

## Implementation Timeline

```
Month 1: Infrastructure + Database Migration
Month 2: API Development + Real-Time Features
Month 3: Frontend Integration + Production Migration
```

**Total Effort**: 3 months with 1 full-time developer
**Risk Level**: Medium-High (new architecture)
**Business Impact**: High (significant performance + cost benefits)

## Conclusion

Migrating to Cloudflare offers significant benefits in terms of global performance, automatic scaling, and cost efficiency. However, it requires substantial development effort and introduces complexity in real-time features.

**Recommendation**: Consider this migration after completing the current roadmap through Sprint 6, when the application has stabilized and global scaling becomes a priority.

The current PocketBase architecture serves the immediate needs well, while this Cloudflare architecture positions the application for global scale and long-term growth.
