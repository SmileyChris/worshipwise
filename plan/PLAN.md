# WorshipWise: Comprehensive Development Plan

Creating a worship song tracking system requires balancing powerful features with volunteer-friendly simplicity. Based on extensive research of Svelte 5 patterns, PocketBase architecture, and worship planning needs, here's a comprehensive development plan for WorshipWise that delivers maximum value while maintaining ease of use.

## Architecture Overview: Single Server Deployment

WorshipWise leverages **PocketBase's built-in static file serving** to host both the backend API and the SvelteKit static frontend from a single server. This simplified architecture reduces complexity while maintaining all features.

### Technology Stack
- **SvelteKit with Static Adapter**: Pre-rendered static site
- **Svelte 5 Runes**: Universal reactivity for state management
- **PocketBase**: Backend API + static file server
- **TypeScript**: Type safety throughout the frontend
- **Tailwind CSS**: Utility-first styling

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

## Database Schema: Intelligent Design for Worship Tracking

### Core Collections Structure

The schema uses **six primary collections** that work together to track songs, manage setlists, analyze usage, and prevent repetition:

1. **Users Collection** (formerly Worship Leaders): Auth-enabled collection managing users with flexible roles (leader, musician, tech, admin)
2. **Songs Collection**: Central repository with title, artist, key signature, tempo, tags, and file attachments
3. **Setlists Collection**: Service planning with dates, themes, and team assignments
4. **Setlist Songs Collection**: Junction table enabling drag-and-drop ordering and key overrides
5. **Song Usage Collection**: Tracking for analytics and repetition prevention (populated via "Complete Service" action)
6. **Analytics View**: Pre-aggregated data for instant reporting

### Song Usage Tracking Implementation
The Song Usage collection is populated when a worship leader marks a service as "Complete":
```typescript
// lib/api/setlists.ts
export async function completeService(setlistId: string) {
  const setlist = await pb.collection('setlists').getOne(setlistId, {
    expand: 'setlist_songs_via_setlist.song'
  });
  
  // Create usage records for each song
  const usagePromises = setlist.expand.setlist_songs_via_setlist.map(item => 
    pb.collection('song_usage').create({
      song: item.song,
      setlist: setlistId,
      usage_date: setlist.service_date,
      worship_leader: setlist.worship_leader
    })
  );
  
  await Promise.all(usagePromises);
  
  // Mark setlist as completed
  await pb.collection('setlists').update(setlistId, { 
    status: 'completed' 
  });
}
```

Key design decisions include **careful cascade configuration** (deleting a song should NOT delete historical usage data), **strategic indexing** for sub-100ms queries, and **role-based permissions** ensuring data integrity.

## Project Structure: Client-Side Architecture

```
worshipwise/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── songs/          # SongCard, SongForm, SongSearch
│   │   │   ├── setlists/       # SetlistBuilder, SetlistTimeline
│   │   │   ├── analytics/      # FrequencyChart, UsageHeatmap
│   │   │   └── ui/             # Shared components (Button, Modal, etc.)
│   │   ├── stores/
│   │   │   ├── auth.svelte.ts       # PocketBase auth state
│   │   │   ├── songs.svelte.ts      # Song management with API calls
│   │   │   ├── setlists.svelte.ts   # Setlist state and subscriptions
│   │   │   └── analytics.svelte.ts  # Analytics data fetching
│   │   ├── api/
│   │   │   ├── client.ts            # PocketBase client initialization
│   │   │   ├── songs.ts             # Song CRUD operations
│   │   │   ├── setlists.ts          # Setlist operations
│   │   │   └── realtime.ts          # WebSocket subscriptions
│   │   └── utils/
│   │       ├── repetition.ts         # Song repetition algorithms
│   │       ├── transpose.ts          # Key transposition logic
│   │       └── constants.ts         # API URLs, config
│   ├── routes/
│   │   ├── +layout.svelte       # App shell with auth check
│   │   ├── +page.svelte         # Landing/dashboard
│   │   ├── login/               # Auth pages
│   │   ├── songs/               # Song library views
│   │   ├── setlists/           # Setlist management
│   │   └── analytics/          # Reporting dashboard
│   └── app.html
├── static/
│   ├── favicon.png
│   └── manifest.json            # PWA manifest
├── svelte.config.js             # Static adapter config
├── vite.config.js              # Vite configuration
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

## Authentication Management

### Auth Store with Svelte 5 Runes
```typescript
// lib/stores/auth.svelte.ts
import { pb } from '$lib/api/client';
import { goto } from '$app/navigation';

class AuthStore {
  user = $state(pb.authStore.model);
  token = $state(pb.authStore.token);
  isValid = $state(pb.authStore.isValid);

  constructor() {
    // Listen for auth changes
    pb.authStore.onChange(() => {
      this.user = pb.authStore.model;
      this.token = pb.authStore.token;
      this.isValid = pb.authStore.isValid;
    });
  }

  async login(email: string, password: string) {
    try {
      const authData = await pb.collection('worship_leaders').authWithPassword(email, password);
      return authData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout() {
    pb.authStore.clear();
    goto('/login');
  }

  async register(data: RegisterData) {
    try {
      const user = await pb.collection('worship_leaders').create(data);
      await this.login(data.email, data.password);
      return user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }
}

export const auth = new AuthStore();
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
  <div class="flex items-center justify-center min-h-screen">
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
  cutoffDate.setDate(cutoffDate.getDate() - (weeksToCheck * 7));
  
  try {
    // Fetch recent usage
    const recentUsage = await pb.collection('song_usage').getFullList({
      filter: `usage_date >= "${cutoffDate.toISOString()}"`,
      fields: 'song'
    });
    
    const recentSongIds = recentUsage.map(u => u.song);
    const filterQuery = recentSongIds.length > 0 
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
    const song = this.songs.find(s => s.id === songId);
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

export function subscribeToSetlist(setlistId: string, callback: (data: any) => void) {
  return pb.collection('setlist_songs').subscribe(`setlist="${setlistId}"`, callback);
}

// lib/stores/setlists.svelte.ts
import { subscribeToSetlist } from '$lib/api/realtime';

class SetlistStore {
  currentSetlist = $state(null);
  songs = $state([]);
  loading = $state(false);
  subscription = null;
  
  constructor() {
    // Handle connection recovery
    if (browser) {
      window.addEventListener('online', () => {
        if (this.currentSetlist) {
          console.log('Connection restored. Refreshing setlist...');
          this.loadSetlist(this.currentSetlist.id);
        }
      });
    }
  }
  
  async loadSetlist(id: string) {
    this.loading = true;
    try {
      // Fetch setlist with related data
      this.currentSetlist = await pb.collection('setlists').getOne(id, {
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
          const index = this.songs.findIndex(s => s.id === data.record.id);
          if (index !== -1) {
            this.songs[index] = data.record;
          }
        } else if (data.action === 'delete') {
          this.songs = this.songs.filter(s => s.id !== data.record.id);
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
<!-- lib/components/setlists/SetlistBuilder.svelte -->
<script lang="ts">
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  
  let { setlist = $bindable() } = $props();
  
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
    <div animate:flip={{ duration: 200 }} class="bg-white p-4 rounded-lg shadow">
      <SongCard song={song.expand.song} showKeyTranspose showDuration />
    </div>
  {/each}
</div>
```

### 3. Analytics Dashboard with API Data Fetching

```typescript
// lib/api/analytics.ts
import { pb } from './client';

export async function getAnalyticsData(dateRange: { start: Date, end: Date }) {
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
    this.songUsage.forEach(usage => {
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
    this.songUsage.forEach(usage => {
      const count = songCounts.get(usage.song_id) || 0;
      songCounts.set(usage.song_id, count + 1);
    });
    
    return Array.from(songCounts.entries())
      .map(([id, count]) => ({
        id,
        title: this.songUsage.find(u => u.song_id === id)?.song_title,
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
const urlsToCache = [
  '/',
  '/songs',
  '/setlists',
  '/analytics',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/build/')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
  
  // Network-first for API calls with fallback
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
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
2. **Worship Leaders**: Full setlist management and analytics
3. **Admins**: Complete system configuration and user management

### Real-Time Collaboration

PocketBase subscriptions enable **live multi-user editing**:
```javascript
// Real-time setlist updates
pb.collection('setlist_songs').subscribe('*', (e) => {
  if (e.record.setlist === currentSetlistId) {
    refreshSetlistView();
    showToast(`${e.record.expand.user.name} updated the setlist`);
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
// lib/stores/setlists.svelte.ts
async addSongToSetlist(song: any) {
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
      setlist: this.currentSetlist.id,
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
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
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
- **Week 4**: Basic setlist builder with drag-and-drop functionality

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
      getFullList: vi.fn().mockResolvedValue([
        { id: '1', title: 'Amazing Grace', last_used: new Date() }
      ])
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
// tests/e2e/setlist.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Setlist Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock PocketBase API responses
    await page.route('**/api/collections/setlists/records', async route => {
      await route.fulfill({ json: { items: [] } });
    });
  });

  test('allows drag and drop song reordering', async ({ page }) => {
    await page.goto('/setlists/new');
    
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