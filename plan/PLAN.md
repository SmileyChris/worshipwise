# WorshipWise: Implementation Reference

**Note**: For current development status, see `DEVELOPMENT_ROADMAP.md`. This provides architectural patterns and implementation guidance.

## Architecture: Church-Centric Single Server

**Technology Stack:**
- SvelteKit + Static Adapter (pre-rendered SPA)
- Svelte 5 Runes for state management 
- PocketBase (API + static serving + files)
- TypeScript (100% coverage)
- Tailwind CSS + Chart.js
- Vitest + Playwright testing

**Deployment:**
```
VPS Server
└── PocketBase
    ├── /pb_public/ (SvelteKit build)
    ├── /api/ (REST API + WebSocket)
    └── /pb_data/ (SQLite + files)
```

**Benefits:** Single deployment, no CORS, church-based multi-tenancy

## Key Implementation Patterns

### Svelte 5 Runes State Management
```typescript
// Store pattern with dependency injection
export function createSongsStore(authContext: AuthContext) {
  let songs = $state<Song[]>([]);
  let loading = $state(false);
  
  let filteredSongs = $derived(
    songs.filter(song => song.title.includes(searchTerm))
  );
  
  return {
    get songs() { return songs; },
    get loading() { return loading; },
    get filteredSongs() { return filteredSongs; },
    loadSongs: async () => { /* implementation */ }
  };
}
```

### PocketBase Integration
```typescript
// Client setup
export const pb = new PocketBase(browser ? window.location.origin : '');
pb.autoCancellation(false); // Better UX during tab switching

// Church-scoped queries
const songs = await pb.collection('songs').getFullList({
  filter: `church_id = "${currentChurch.id}"`,
  sort: '-created'
});

// Real-time subscriptions
pb.collection('services').subscribe('*', (e) => {
  if (e.action === 'update') {
    updateLocalService(e.record);
  }
});
```

### Component Patterns
```svelte
<script lang="ts">
  interface Props {
    song: Song;
    editable?: boolean;
    onEdit?: (song: Song) => void;
  }
  
  let { song, editable = false, onEdit = () => {} }: Props = $props();
  
  let usageStatus = $derived(getSongUsageStatus(song));
</script>

<div class="song-card">
  <h3>{song.title}</h3>
  {#if editable}
    <button onclick={() => onEdit(song)}>Edit</button>
  {/if}
</div>
```

## Database Schema (Consolidated)

**Core Collections:**
- Users (auth + profile data)
- Churches (organization + timezone)
- Church Memberships (roles + permissions)
- Songs (metadata + files)
- Services (planning + dates)
- Service Songs (junction + ordering)
- Song Usage (analytics tracking)

**Key Features:**
- Church-based data isolation
- Role-based permissions (pastor/admin/leader/musician/member)
- File attachments (sheet music, audio, chord charts)
- Usage tracking (green/yellow/red availability)
- Real-time collaboration

## Testing Strategy

**Dependency Injection Pattern:**
```typescript
// Test setup
beforeEach(() => {
  const authContext = mockAuthContext({
    church: { id: 'church-1' },
    user: { id: 'user-1' }
  });
  songsStore = createSongsStore(authContext);
});
```

**Coverage:** 199/199 store tests passing, zero memory leaks

## Deployment

```bash
# Build frontend
npm run build

# Copy to PocketBase
cp -r build/* pocketbase/pb_public/

# Start PocketBase
cd pocketbase && ./pocketbase serve
```

## Performance Optimizations

- Lazy loading for heavy components
- Virtual lists for long song lists
- Optimistic UI updates
- Client-side caching with TTL
- Code splitting by route
- WebSocket subscriptions with proper cleanup