# WorshipWise: Implementation Reference Guide

This document provides technical implementation patterns and architectural guidance for WorshipWise. For current development status and roadmap, see `DEVELOPMENT_ROADMAP.md`.

**Note**: This document reflects the current production-ready implementation. WorshipWise is an advanced church-centric worship song management system with real-time collaboration, analytics, and usage tracking.

## Architecture Overview: Church-Centric Single Server Deployment

WorshipWise leverages **PocketBase's built-in static file serving** to host both the backend API and the SvelteKit static frontend from a single server. The system is built around a **church-centric multi-tenant architecture** that provides complete data isolation between churches while enabling powerful collaboration features within each church organization.

### Technology Stack

- **SvelteKit with Static Adapter**: Pre-rendered static site
- **Svelte 5 Runes**: Universal reactivity for state management
- **PocketBase**: Backend API + static file server + file storage
- **TypeScript**: Type safety throughout the frontend (100% coverage)
- **Tailwind CSS**: Utility-first styling with responsive design
- **Chart.js**: Analytics visualizations
- **Vitest + Playwright**: Comprehensive testing strategy

### Deployment Architecture

```
┌─────────────────────────────────────┐
│         Your VPS Server             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      PocketBase              │   │
│  │                              │   │
│  │  /pb_public/                 │   │
│  │    └── (SvelteKit Build)     │   │
│  │        ├── index.html        │   │
│  │        ├── _app/             │   │
│  │        └── assets/           │   │
│  │                              │   │
│  │  /api/                       │   │
│  │    ├── collections/          │   │
│  │    ├── auth/                 │   │
│  │    └── realtime/             │   │
│  │                              │   │
│  │  /pb_data/                   │   │
│  │    └── (Database & Files)    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Benefits of This Approach

- **Single deployment**: Everything runs from one PocketBase instance
- **No CORS issues**: Frontend and backend on same origin
- **Simplified backups**: One server to backup
- **Better performance**: No cross-origin requests
- **Cost effective**: Just your existing VPS costs

## Database Schema: Church-Centric Multi-Tenant Design

### Core Collections Structure

The schema uses **seven primary collections** that work together to provide church-centric multi-tenancy, track songs, manage services, analyze usage, and prevent repetition:

1. **Churches Collection**: Central organizing unit with timezone, settings, and admin management
2. **Church Memberships Collection**: User-church relationships with role-based permissions (pastor, admin, leader, musician, member)
3. **Users Collection**: Basic authentication with PocketBase auth
4. **Songs Collection**: Central repository with title, artist, key signature, tempo, tags, file attachments, and church scoping
5. **Services Collection**: Service planning with dates, themes, team assignments, and church context
6. **Service Songs Collection**: Junction table enabling drag-and-drop ordering and key overrides
7. **Song Usage Collection**: Tracking for analytics and repetition prevention (populated via "Complete Service" action)

### Church Setup and Multi-Tenancy

WorshipWise implements a sophisticated church-centric architecture:

- **Initial Setup Flow**: First-time deployments require creating a church and admin user through `/setup` route
- **Church Context**: All data is automatically scoped to the user's church through PocketBase security rules
- **Role-Based Permissions**: Granular permissions system with pastor, admin, leader, musician, and member roles
- **Timezone-Aware Operations**: Churches have timezone settings for hemisphere-aware seasonal recommendations

### Song Usage Tracking Implementation

The Song Usage collection is populated when a worship leader marks a service as "Complete":

```typescript
// lib/api/services.ts
export async function completeService(serviceId: string) {
	const service = await pb.collection('services').getOne(serviceId, {
		expand: 'service_songs_via_service_id.song_id'
	});

	// Create usage records for each song
	const usagePromises = service.expand.service_songs_via_service_id.map((item) =>
		pb.collection('song_usage').create({
			song_id: item.song_id,
			service_id: serviceId,
			used_date: service.service_date,
			worship_leader: service.worship_leader,
			service_type: service.service_type
		})
	);

	await Promise.all(usagePromises);

	// Mark service as completed
	await pb.collection('services').update(serviceId, {
		status: 'completed'
	});
}
```

Key design decisions include **careful cascade configuration** (deleting a song should NOT delete historical usage data), **strategic indexing** for sub-100ms queries, **church-scoped permissions** ensuring complete data isolation, and **role-based security rules** maintaining data integrity.

## Project Structure: Production-Ready Architecture

```
worshipwise/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── songs/          # Song management components (22+ components)
│   │   │   ├── services/       # Service builder with real-time collaboration
│   │   │   ├── analytics/      # Chart.js reporting dashboard
│   │   │   ├── setup/          # Church onboarding flow
│   │   │   ├── admin/          # User and church management
│   │   │   └── ui/             # Comprehensive component library
│   │   ├── stores/             # Svelte 5 runes-based state management
│   │   │   ├── auth.svelte.ts           # Church-aware auth state
│   │   │   ├── setup.svelte.ts          # Initial church setup flow
│   │   │   ├── songs.svelte.ts          # Song management with church context
│   │   │   ├── services.svelte.ts       # Real-time collaborative service editing
│   │   │   ├── analytics.svelte.ts      # Church-scoped analytics
│   │   │   └── recommendations.svelte.ts # AI-powered worship insights
│   │   ├── api/                # Church-scoped API operations
│   │   │   ├── client.ts               # PocketBase initialization
│   │   │   ├── churches.ts             # Church setup and management
│   │   │   ├── songs.ts                # Song CRUD with file uploads
│   │   │   ├── services.ts             # Service operations with real-time
│   │   │   ├── analytics.ts            # Church analytics and insights
│   │   │   ├── recommendations.ts      # AI recommendations engine
│   │   │   └── realtime.ts             # WebSocket subscription management
│   │   ├── types/              # Comprehensive TypeScript definitions
│   │   │   ├── auth.ts                 # User and authentication types
│   │   │   ├── church.ts               # Church and membership types
│   │   │   ├── song.ts                 # Song and category types
│   │   │   └── service.ts              # Service and collaboration types
│   │   └── utils/              # Helper functions and algorithms
│   │       ├── analytics-utils.ts      # Chart data processing
│   │       ├── service-utils.ts        # Service building utilities
│   │       └── constants.ts            # Configuration and constants
│   ├── routes/
│   │   ├── +layout.svelte      # Church-aware auth shell with setup guard
│   │   ├── setup/              # Initial church setup flow
│   │   ├── (app)/              # Protected church-scoped routes
│   │   │   ├── dashboard/      # Analytics and insights dashboard
│   │   │   ├── songs/          # Song library with categories
│   │   │   ├── services/       # Real-time service builder
│   │   │   ├── analytics/      # Comprehensive reporting
│   │   │   └── admin/          # Church and user management
│   │   └── login/              # Authentication pages
│   └── app.html
├── pocketbase/                 # PocketBase deployment
│   ├── pb_migrations/          # Database schema migrations
│   ├── pb_data/                # Database and uploaded files
│   └── pb_public/              # Static frontend deployment target
├── plan/                       # Documentation and planning
├── tests/                      # Comprehensive test suite
│   ├── unit/                   # Vitest unit tests (190+ tests)
│   └── e2e/                    # Playwright end-to-end tests
├── static/
├── svelte.config.js            # Static adapter with SPA configuration
├── vite.config.js              # Multi-project test configuration
├── justfile                    # Development commands
└── package.json
```

## SvelteKit Configuration for Static Deployment

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA mode for client-side routing
			precompress: false,
			strict: true
		}),
		prerender: {
			entries: [] // No prerendering for full SPA
		}
	}
};
```

## PocketBase Client Configuration (Same Origin)

### Initialize PocketBase Client

```typescript
// lib/api/client.ts
import PocketBase from 'pocketbase';
import { browser } from '$app/environment';

// When serving from PocketBase, use relative URL
export const pb = new PocketBase(browser ? window.location.origin : '');

// Auto-refresh auth on client side
if (browser) {
	pb.authStore.onChange(() => {
		// Handle auth state changes
	});
}
```

### Build Configuration

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Output to PocketBase public directory
		outDir: '../pocketbase/pb_public'
	}
});
```

### No Environment Variables Needed

Since frontend and backend share the same origin, no API URL configuration is required!

## Church-Centric Authentication & Setup

### Current Implementation: Church-Aware Auth Store

The authentication system now includes sophisticated church context management:

```typescript
// lib/stores/auth.svelte.ts - Current Implementation
class AuthStore {
	user = $state(pb.authStore.model);
	token = $state(pb.authStore.token);
	isValid = $state(pb.authStore.isValid);

	// Church context
	currentChurch = $state<Church | null>(null);
	membership = $state<ChurchMembership | null>(null);
	permissions = $derived(this.membership?.permissions || []);

	async login(email: string, password: string) {
		try {
			const authData = await pb.collection('users').authWithPassword(email, password);
			await this.loadChurchContext();
			return authData;
		} catch (error) {
			console.error('Login failed:', error);
			throw error;
		}
	}

	async loadChurchContext() {
		if (!this.user) return;

		try {
			// Get user's church membership
			const membership = await pb
				.collection('church_memberships')
				.getFirstListItem(`user_id = "${this.user.id}" && status = "active"`, {
					expand: 'church_id'
				});

			this.membership = membership;
			this.currentChurch = membership.expand?.church_id || null;
		} catch (error) {
			console.error('Failed to load church context:', error);
		}
	}

	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	canManageUsers(): boolean {
		return (
			this.hasPermission('users:manage') ||
			['admin', 'pastor'].includes(this.membership?.role || '')
		);
	}
}

export const auth = new AuthStore();
```

### Initial Church Setup Flow

WorshipWise includes a sophisticated onboarding process for new deployments:

```typescript
// lib/stores/setup.svelte.ts - Church Setup Management
class SetupStore {
	step = $state(1);
	isComplete = $state(false);
	loading = $state(false);
	error = $state<string | null>(null);

	formData = $state({
		churchName: '',
		adminName: '',
		adminEmail: '',
		password: '',
		timezone: '',
		country: '',
		address: '',
		city: '',
		state: ''
	});

	async createChurchAndAdmin() {
		this.loading = true;
		try {
			// Detect hemisphere from timezone
			const hemisphere = detectHemisphereFromTimezone(this.formData.timezone);

			// Create church
			const church = await pb.collection('churches').create({
				name: this.formData.churchName,
				slug: generateSlug(this.formData.churchName),
				timezone: this.formData.timezone,
				hemisphere,
				country: this.formData.country,
				address: this.formData.address,
				city: this.formData.city,
				state: this.formData.state,
				settings: getDefaultChurchSettings(),
				is_active: true
			});

			// Create admin user
			const user = await pb.collection('users').create({
				email: this.formData.adminEmail,
				name: this.formData.adminName,
				password: this.formData.password,
				passwordConfirm: this.formData.password
			});

			// Create church membership for admin
			await pb.collection('church_memberships').create({
				church_id: church.id,
				user_id: user.id,
				role: 'pastor',
				permissions: getDefaultPermissions('pastor'),
				status: 'active',
				joined_date: new Date().toISOString(),
				is_active: true
			});

			// Update church owner
			await pb.collection('churches').update(church.id, {
				owner_user_id: user.id
			});

			this.isComplete = true;
		} catch (error) {
			this.error = error.message;
		} finally {
			this.loading = false;
		}
	}
}
```

### Protected Route Layout (Improved)

```svelte
<!-- routes/+layout.svelte -->
<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	const publicRoutes = ['/login', '/register', '/'];
	let isReady = false;

	// Synchronous auth check to prevent content flicker
	if (browser) {
		if (auth.isValid || publicRoutes.includes($page.url.pathname)) {
			isReady = true;
		} else {
			// Use microtask to ensure goto runs after initial setup
			queueMicrotask(() => goto('/login'));
		}
	} else {
		// SSR: assume ready for static generation
		isReady = true;
	}
</script>

{#if isReady}
	<slot />
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<p class="text-gray-500">Authorizing...</p>
	</div>
{/if}
```

### Note on Rate Limiting

The client-side rate limiter is purely for UX improvements (preventing accidental double-clicks). Real security comes from:

- PocketBase's built-in auth rate limits
- Server-side rate limiting via nginx or Cloudflare
- API request throttling at the collection level

## Key Features Implementation (Client-Side)

### 1. Smart Song Repetition Prevention with API Calls

```typescript
// lib/api/songs.ts
import { pb } from './client';

export async function getAvailableSongs(weeksToCheck = 4) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - weeksToCheck * 7);

	try {
		// Fetch recent usage
		const recentUsage = await pb.collection('song_usage').getFullList({
			filter: `usage_date >= "${cutoffDate.toISOString()}"`,
			fields: 'song'
		});

		const recentSongIds = recentUsage.map((u) => u.song);
		const filterQuery =
			recentSongIds.length > 0
				? `is_active = true && id !~ "${recentSongIds.join('|')}"`
				: 'is_active = true';

		// Fetch available songs
		const availableSongs = await pb.collection('songs').getFullList({
			filter: filterQuery,
			expand: 'song_usage_via_song',
			sort: '-created'
		});

		return availableSongs;
	} catch (error) {
		console.error('Failed to fetch available songs:', error);
		throw error;
	}
}

// Song store with client-side state management
// lib/stores/songs.svelte.ts
class SongStore {
	songs = $state([]);
	loading = $state(false);
	error = $state(null);

	async loadSongs() {
		this.loading = true;
		try {
			this.songs = await getAvailableSongs();
		} catch (err) {
			this.error = err.message;
		} finally {
			this.loading = false;
		}
	}

	getSongStatus(songId: string) {
		const song = this.songs.find((s) => s.id === songId);
		if (!song?.expand?.song_usage_via_song) return 'green';

		const lastUsed = new Date(song.expand.song_usage_via_song[0]?.usage_date);
		const weeksSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24 * 7);

		if (weeksSince < 1) return 'red';
		if (weeksSince < 4) return 'yellow';
		return 'green';
	}
}
```

### 2. Real-Time Setlist Builder with Connection Recovery

```typescript
// lib/api/realtime.ts
import { pb } from './client';
import { browser } from '$app/environment';

export function subscribeToService(serviceId: string, callback: (data: any) => void) {
	// Database collection and field names remain legacy for compatibility
	return pb.collection('setlist_songs').subscribe(`setlist="${serviceId}"`, callback);
}

// lib/stores/services.svelte.ts
import { subscribeToService } from '$lib/api/realtime';

class ServicesStore {
	currentService = $state(null);
	songs = $state([]);
	loading = $state(false);
	subscription = null;

	constructor() {
		// Handle connection recovery
		if (browser) {
			window.addEventListener('online', () => {
				if (this.currentService) {
					console.log('Connection restored. Refreshing service...');
					this.loadService(this.currentService.id);
				}
			});
		}
	}

	async loadSetlist(id: string) {
		this.loading = true;
		try {
			// Fetch service data (collection name is legacy)
			this.currentService = await pb.collection('setlists').getOne(id, {
				expand: 'worship_leader'
			});

			// Fetch setlist songs
			this.songs = await pb.collection('setlist_songs').getFullList({
				filter: `setlist="${id}"`,
				expand: 'song',
				sort: 'order'
			});

			// Clean up old subscription
			if (this.subscription) {
				this.subscription();
			}

			// Subscribe to real-time updates
			this.subscription = subscribeToSetlist(id, (data) => {
				if (data.action === 'create') {
					this.songs = [...this.songs, data.record];
				} else if (data.action === 'update') {
					const index = this.songs.findIndex((s) => s.id === data.record.id);
					if (index !== -1) {
						this.songs[index] = data.record;
					}
				} else if (data.action === 'delete') {
					this.songs = this.songs.filter((s) => s.id !== data.record.id);
				}
				this.songs.sort((a, b) => a.order - b.order);
			});
		} catch (error) {
			console.error('Failed to load setlist:', error);
		} finally {
			this.loading = false;
		}
	}

	async updateSongOrder(songs: any[]) {
		// Update order for each song
		const updates = songs.map((song, index) =>
			pb.collection('setlist_songs').update(song.id, { order: index })
		);

		await Promise.all(updates);
	}

	cleanup() {
		if (this.subscription) {
			this.subscription();
			this.subscription = null;
		}
	}
}
```

### Drag-and-Drop Component

```svelte
<!-- lib/components/services/ServiceBuilder.svelte -->
<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';

	let { service = $bindable() } = $props(); // Note: May use legacy field names internally

	function handleSort(e) {
		setlist.songs = e.detail.items;
		setlist.updateSongOrder(e.detail.items);
	}
</script>

<div
	use:dndzone={{ items: setlist.songs, flipDurationMs: 200 }}
	on:consider={handleSort}
	on:finalize={handleSort}
	class="space-y-2"
>
	{#each setlist.songs as song (song.id)}
		<div animate:flip={{ duration: 200 }} class="rounded-lg bg-white p-4 shadow">
			<SongCard song={song.expand.song} showKeyTranspose showDuration />
		</div>
	{/each}
</div>
```

### 3. Analytics Dashboard with API Data Fetching

```typescript
// lib/api/analytics.ts
import { pb } from './client';

export async function getAnalyticsData(dateRange: { start: Date; end: Date }) {
	const filter = `usage_date >= "${dateRange.start.toISOString()}" && usage_date <= "${dateRange.end.toISOString()}"`;

	// Fetch from analytics view
	const analytics = await pb.collection('song_analytics_view').getFullList({
		filter,
		sort: '-usage_count'
	});

	return analytics;
}

// lib/stores/analytics.svelte.ts
export class AnalyticsStore {
	songUsage = $state([]);
	loading = $state(false);
	dateRange = $state({
		start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
		end: new Date()
	});

	frequencyMap = $derived(() => {
		const map = new Map();
		this.songUsage.forEach((usage) => {
			const dateKey = usage.usage_date.substring(0, 10);
			const current = map.get(dateKey) || { count: 0, songs: [] };
			map.set(dateKey, {
				count: current.count + 1,
				songs: [...current.songs, usage.song_title]
			});
		});
		return map;
	});

	topSongs = $derived(() => {
		const songCounts = new Map();
		this.songUsage.forEach((usage) => {
			const count = songCounts.get(usage.song_id) || 0;
			songCounts.set(usage.song_id, count + 1);
		});

		return Array.from(songCounts.entries())
			.map(([id, count]) => ({
				id,
				title: this.songUsage.find((u) => u.song_id === id)?.song_title,
				count
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);
	});

	async loadAnalytics() {
		this.loading = true;
		try {
			this.songUsage = await getAnalyticsData(this.dateRange);
		} catch (error) {
			console.error('Failed to load analytics:', error);
		} finally {
			this.loading = false;
		}
	}
}
```

### 4. Worship Leader Preferences with Smart Cache Invalidation

```typescript
// lib/api/preferences.ts
import { pb } from './client';

interface CachedPreferences {
	data: any;
	timestamp: number;
	version: number;
}

export async function getLeaderPreferences(userId: string) {
	try {
		// First, do a lightweight version check
		const versionCheck = await pb.collection('users').getOne(userId, {
			fields: 'updated'
		});

		// Check cache validity
		if (typeof localStorage !== 'undefined') {
			const cached = localStorage.getItem(`preferences_${userId}`);
			if (cached) {
				const parsedCache: CachedPreferences = JSON.parse(cached);
				const serverTimestamp = new Date(versionCheck.updated).getTime();

				if (parsedCache.timestamp >= serverTimestamp) {
					return parsedCache.data;
				}
			}
		}

		// Cache is stale or missing, fetch fresh data
		const preferences = await pb.collection('users').getOne(userId, {
			expand: 'preferred_songs'
		});

		// Update cache with timestamp
		if (typeof localStorage !== 'undefined') {
			const cacheData: CachedPreferences = {
				data: preferences,
				timestamp: new Date(preferences.updated).getTime(),
				version: 1
			};
			localStorage.setItem(`preferences_${userId}`, JSON.stringify(cacheData));
		}

		return preferences;
	} catch (error) {
		// Try to load from cache if API fails
		if (typeof localStorage !== 'undefined') {
			const cached = localStorage.getItem(`preferences_${userId}`);
			if (cached) {
				const parsedCache: CachedPreferences = JSON.parse(cached);
				return parsedCache.data;
			}
		}
		throw error;
	}
}

// lib/stores/preferences.svelte.ts
class PreferencesStore {
	preferences = $state(null);
	loading = $state(false);
	subscription = null;

	async loadPreferences(userId: string) {
		this.loading = true;
		try {
			this.preferences = await getLeaderPreferences(userId);

			// Subscribe to own user record for real-time updates
			this.subscription = pb.collection('users').subscribe(userId, (data) => {
				if (data.action === 'update') {
					// Invalidate cache and reload
					if (typeof localStorage !== 'undefined') {
						localStorage.removeItem(`preferences_${userId}`);
					}
					this.loadPreferences(userId);
				}
			});
		} catch (error) {
			console.error('Failed to load preferences:', error);
		} finally {
			this.loading = false;
		}
	}

	cleanup() {
		if (this.subscription) {
			this.subscription();
			this.subscription = null;
		}
	}
}
```

## Offline Support & PWA Configuration

### Service Worker for Offline Functionality

```javascript
// static/sw.js
const CACHE_NAME = 'worshipwise-v1';
const urlsToCache = ['/', '/songs', '/services', '/analytics', '/manifest.json'];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', (event) => {
	// Cache-first strategy for static assets
	if (event.request.url.includes('/build/')) {
		event.respondWith(
			caches.match(event.request).then((response) => response || fetch(event.request))
		);
	}

	// Network-first for API calls with fallback
	if (event.request.url.includes('/api/')) {
		event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
	}
});
```

### PWA Manifest

```json
// static/manifest.json
{
	"name": "WorshipWise",
	"short_name": "WorshipWise",
	"description": "Smart worship song tracking and planning",
	"start_url": "/",
	"display": "standalone",
	"theme_color": "#4F46E5",
	"background_color": "#ffffff",
	"icons": [
		{
			"src": "/icon-192.png",
			"sizes": "192x192",
			"type": "image/png"
		},
		{
			"src": "/icon-512.png",
			"sizes": "512x512",
			"type": "image/png"
		}
	]
}
```

## UI/UX Design Principles

### Mobile-First Responsive Design

Every interface follows **thumb-friendly navigation** patterns:

- Bottom navigation bar for primary actions
- Swipe gestures for song browsing
- Large 44px touch targets throughout
- Progressive disclosure of advanced features

### Volunteer-Friendly Onboarding

The system implements **role-based progressive disclosure**:

1. **Musicians**: See only their parts, keys, and practice resources
2. **Worship Leaders**: Full service management and analytics
3. **Admins**: Complete system configuration and user management

### Real-Time Collaboration

PocketBase subscriptions enable **live multi-user editing**:

```javascript
// Real-time service updates
pb.collection('setlist_songs').subscribe('*', (e) => {
	if (e.record.setlist === currentServiceId) {
		// Database field name
		refreshServiceView();
		showToast(`${e.record.expand.user.name} updated the service`);
	}
});
```

## Performance Optimization for Static Sites

### 1. Code Splitting and Lazy Loading

```javascript
// routes/analytics/+page.svelte
<script>
  import { onMount } from 'svelte';

  let ChartComponent;

  onMount(async () => {
    // Lazy load heavy chart library only when needed
    const module = await import('$lib/components/analytics/FrequencyChart.svelte');
    ChartComponent = module.default;
  });
</script>

{#if ChartComponent}
  <svelte:component this={ChartComponent} />
{:else}
  <div class="animate-pulse bg-gray-200 h-64 rounded"></div>
{/if}
```

### 2. API Response Caching

```typescript
// lib/api/cache.ts
class APICache {
	private cache = new Map();
	private ttl = 5 * 60 * 1000; // 5 minutes

	async get(key: string, fetcher: () => Promise<any>) {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.timestamp < this.ttl) {
			return cached.data;
		}

		const data = await fetcher();
		this.cache.set(key, { data, timestamp: Date.now() });
		return data;
	}

	invalidate(pattern?: string) {
		if (pattern) {
			for (const key of this.cache.keys()) {
				if (key.includes(pattern)) {
					this.cache.delete(key);
				}
			}
		} else {
			this.cache.clear();
		}
	}
}

export const apiCache = new APICache();
```

### 3. Optimistic UI Updates

```typescript
// lib/stores/services.svelte.ts
async addSongToService(song: any) {
  // Optimistically update UI
  const tempId = `temp_${Date.now()}`;
  const optimisticSong = {
    id: tempId,
    song: song.id,
    order: this.songs.length,
    expand: { song }
  };

  this.songs = [...this.songs, optimisticSong];

  try {
    // Make API call
    const created = await pb.collection('setlist_songs').create({
      setlist: this.currentService.id,  // Database field name
      song: song.id,
      order: this.songs.length - 1
    });

    // Replace optimistic update with real data
    this.songs = this.songs.map(s =>
      s.id === tempId ? created : s
    );
  } catch (error) {
    // Revert on error
    this.songs = this.songs.filter(s => s.id !== tempId);
    throw error;
  }
}
```

## Deployment Strategy (Single Server)

### Complete Deployment Setup

1. **Build SvelteKit Application**

```bash
# In your development environment
cd worshipwise
npm run build

# This creates the static files in 'build' directory
```

2. **Server Setup Script (Improved with rsync)**

```bash
#!/bin/bash
# deploy.sh - Complete WorshipWise deployment

# Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip -d /opt/worshipwise

# Copy built frontend to PocketBase public directory (using rsync)
rsync -av --delete build/ /opt/worshipwise/pb_public/

# Create systemd service
cat > /etc/systemd/system/worshipwise.service << EOF
[Unit]
Description=WorshipWise
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/worshipwise
ExecStart=/opt/worshipwise/pocketbase serve --http="0.0.0.0:8090"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl enable worshipwise
systemctl start worshipwise
```

3. **Nginx Configuration with Cloudflare (Recommended)**

```nginx
server {
    listen 443 ssl http2;
    server_name worshipwise.yourdomain.com;

    # Cloudflare Origin Certificate
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    # Only allow Cloudflare IPs
    include /etc/nginx/cloudflare-ips.conf;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for realtime
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

4. **Automated Deployment Script (Improved)**

```bash
#!/bin/bash
# update.sh - Update WorshipWise with zero downtime

# Pull latest code
cd /home/deploy/worshipwise
git pull

# Build frontend
npm ci
npm run build

# Backup current deployment
cp -r /opt/worshipwise/pb_public /opt/worshipwise/pb_public.backup

# Deploy new build with rsync (atomic update)
rsync -av --delete build/ /opt/worshipwise/pb_public/

# Restart service
systemctl restart worshipwise

# Verify service is running
sleep 2
if systemctl is-active --quiet worshipwise; then
    echo "WorshipWise updated successfully!"
    rm -rf /opt/worshipwise/pb_public.backup
else
    echo "Update failed! Rolling back..."
    rsync -av --delete /opt/worshipwise/pb_public.backup/ /opt/worshipwise/pb_public/
    systemctl restart worshipwise
fi
```

### Docker Alternative

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app

# Download PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip /tmp/
RUN unzip /tmp/pocketbase_linux_amd64.zip -d /app/

# Copy built frontend
COPY --from=builder /app/build ./pb_public

EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups/worshipwise"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PocketBase data (includes database and uploaded files)
tar -czf $BACKUP_DIR/worshipwise_$DATE.tar.gz /opt/worshipwise/pb_data

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Optional: Sync to remote storage
# rclone copy $BACKUP_DIR/worshipwise_$DATE.tar.gz remote:backups/
```

## Security Considerations for Client-Side Apps

### 1. PocketBase Security Rules

```javascript
// PocketBase Admin Panel - API Rules Examples

// Songs Collection - Read by authenticated, write by leaders/admins
{
  "listRule": "@request.auth.id != ''",
  "viewRule": "@request.auth.id != ''",
  "createRule": "@request.auth.role = 'leader' || @request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'leader' || @request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}

// Setlists - Users can only edit their own
{
  "listRule": "@request.auth.id != ''",
  "viewRule": "@request.auth.id != ''",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id = worship_leader",
  "deleteRule": "@request.auth.id = worship_leader || @request.auth.role = 'admin'"
}
```

### 2. Client-Side Security Best Practices

```typescript
// lib/utils/security.ts
export function sanitizeInput(input: string): string {
	return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export function validateSongData(data: any): boolean {
	return (
		typeof data.title === 'string' &&
		data.title.length > 0 &&
		data.title.length < 200 &&
		(!data.key_signature || /^[A-G][#b]?m?$/.test(data.key_signature))
	);
}
```

### 3. Rate Limiting on Client

```typescript
// lib/utils/rateLimit.ts
class RateLimiter {
	private attempts = new Map();

	canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
		const now = Date.now();
		const attempts = this.attempts.get(key) || [];

		// Clean old attempts
		const validAttempts = attempts.filter((time) => now - time < windowMs);

		if (validAttempts.length >= maxAttempts) {
			return false;
		}

		validAttempts.push(now);
		this.attempts.set(key, validAttempts);
		return true;
	}
}

export const rateLimiter = new RateLimiter();
```

## Development Roadmap for Static SPA

### Phase 1: Core Foundation (Weeks 1-4)

- **Week 1**: Project setup with SvelteKit static adapter, PocketBase instance deployment
- **Week 2**: Authentication flow, protected routes, basic UI components
- **Week 3**: Song library with CRUD operations, search, and filtering
- **Week 4**: Basic service builder with drag-and-drop functionality

### Phase 2: Smart Features (Weeks 5-8)

- **Week 5**: Repetition tracking algorithm and visual indicators
- **Week 6**: Real-time subscriptions for collaborative editing
- **Week 7**: Analytics dashboard with usage charts
- **Week 8**: PWA implementation with offline support

### Phase 3: Enhanced UX (Weeks 9-12)

- **Week 9**: Worship leader preferences and personalization
- **Week 10**: Advanced filtering, saved searches, and quick actions
- **Week 11**: Mobile optimizations and gesture support
- **Week 12**: Performance optimizations and caching strategies

### Phase 4: Polish & Deploy (Weeks 13-16)

- **Week 13**: Comprehensive testing (unit, integration, E2E)
- **Week 14**: Documentation and user guides
- **Week 15**: Beta testing with select churches
- **Week 16**: Production deployment and monitoring setup

## Testing Strategy for Client-Side Apps

### Unit Testing with Vitest

```javascript
// tests/stores/songs.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SongStore } from '$lib/stores/songs.svelte';

// Mock PocketBase
vi.mock('$lib/api/client', () => ({
	pb: {
		collection: () => ({
			getFullList: vi
				.fn()
				.mockResolvedValue([{ id: '1', title: 'Amazing Grace', last_used: new Date() }])
		})
	}
}));

describe('SongStore', () => {
	it('correctly identifies song availability status', () => {
		const store = new SongStore();
		expect(store.getSongStatus('1')).toBe('red'); // Used recently
	});
});
```

### E2E Testing with Playwright

```javascript
// tests/e2e/service.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Setlist Management', () => {
	test.beforeEach(async ({ page }) => {
		// Mock PocketBase API responses
		await page.route('**/api/collections/setlists/records', async (route) => {
			await route.fulfill({ json: { items: [] } });
		});
	});

	test('allows drag and drop song reordering', async ({ page }) => {
		await page.goto('/services/new');

		// Drag first song to last position
		const firstSong = page.locator('.song-card').first();
		const lastSong = page.locator('.song-card').last();

		await firstSong.dragTo(lastSong);

		// Verify order changed
		await expect(page.locator('.song-card').first()).not.toHaveText('Amazing Grace');
	});
});
```

### API Mocking for Development

```typescript
// lib/api/mock.ts
export const mockPocketBase = {
	collection: (name: string) => ({
		getFullList: async () => {
			if (name === 'songs') {
				return [
					{ id: '1', title: 'How Great Thou Art', artist: 'Traditional' },
					{ id: '2', title: '10,000 Reasons', artist: 'Matt Redman' }
				];
			}
			return [];
		},
		authWithPassword: async () => ({
			token: 'mock-token',
			record: { id: 'user1', email: 'test@church.com' }
		})
	})
};
```

## Cost Analysis & Infrastructure

### Hosting Costs

**Self-Hosted on Your VPS**

- Additional VPS Cost: $0 (using existing server)
- Domain (optional): $12/year
- SSL Certificate: Free (Let's Encrypt)
- **Total: $0-1/month**

### Resource Requirements

- CPU: 1 core (minimum)
- RAM: 512MB-1GB
- Storage: 5GB (grows with usage)
- Bandwidth: Minimal (mostly API calls)

WorshipWise can easily run alongside other applications on your VPS with minimal resource usage.

## Getting Started Guide

### Quick Start Development

```bash
# Clone the repo
git clone https://github.com/your-church/worshipwise.git
cd worshipwise

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start PocketBase locally
./pocketbase serve

# Access the app at http://localhost:5173
# Access PocketBase Admin at http://localhost:8090/_/
```

### Production Build & Deploy

```bash
# Build the SvelteKit app
npm run build

# Copy build output to PocketBase
cp -r build/* /path/to/pocketbase/pb_public/

# Start PocketBase (serves both API and frontend)
./pocketbase serve --http="0.0.0.0:8090"
```

### Initial PocketBase Setup

1. Access PocketBase Admin UI at `http://your-server:8090/_/`
2. Create admin account
3. Import the schema:

```bash
# Import collections schema
./pocketbase migrate up
```

4. Configure settings:
   - Enable user registration (optional)
   - Set up email settings for notifications
   - Configure file upload limits

### Project Structure

```
worshipwise/
├── src/                    # SvelteKit source
├── build/                  # Build output (copy to pb_public)
├── pocketbase/            # PocketBase binary and data
│   ├── pb_public/         # Static files served by PocketBase
│   ├── pb_data/           # Database and uploads
│   └── pb_migrations/     # Database migrations
└── scripts/               # Deployment and backup scripts
```
