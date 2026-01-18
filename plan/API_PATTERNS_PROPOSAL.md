# API Usage Patterns - Standardization Proposal

## Executive Summary

The WorshipWise codebase currently uses **4 different patterns** for API data fetching across ~25 routes. This proposal recommends standardizing on **2 patterns** with clear guidelines for when to use each.

---

## Current State Analysis

### Pattern Distribution

| Pattern | Pages | Example |
|---------|-------|---------|
| Store-based (`onMount`) | ~40% | `/services`, `/dashboard`, `/analytics` |
| Load function only | ~15% | `/songs/[id]` |
| Direct API in component | ~25% | `/admin/roles`, `/admin/members` |
| Mixed (load + store) | ~10% | `/songs` |
| Wrapper/Form | ~10% | `/profile`, `/login` |

### Key Issues Identified

#### 1. Songs Page: Mixed Pattern Anti-Pattern
```typescript
// +page.ts - Fetches songs
const songs = await songsApi.getSongs({ showRetired: false })
return { preloadedSongs: songs }

// +page.svelte - ALSO loads via store (ignores preloaded data)
onMount(() => {
  songsStore.loadAllSongsOnce()  // Duplicate fetch!
})

// +page.svelte - Direct API for ratings/labels (bypasses store)
const ratingsAPI = $derived.by(() => createRatingsAPI(ctx, ctx.pb))
const labelsAPI = $derived.by(() => createLabelsAPI(ctx.pb))
```

**Problems:**
- Redundant network requests
- `data.preloadedSongs` is never used
- Ratings/labels bypass the store system

#### 2. Admin Pages: No Store Integration
```typescript
// admin/roles/+page.svelte
let rolesAPI: RolesAPI;

$effect(() => {
  const ctx = auth.getAuthContext();
  if (ctx?.currentChurch) {
    rolesAPI = createRolesAPI(ctx, pb);  // Direct API creation
  }
});

onMount(() => {
  loadRoles();  // Manual state management
});
```

**Problems:**
- No real-time updates when other users make changes
- No caching between page navigations
- Inconsistent with store-based pages
- Harder to test

#### 3. Inconsistent API Initialization

**Pattern A (Stores):** Lazy `$derived.by` inside class
```typescript
// songs.svelte.ts
this.songsApi = $derived.by(() => {
  const ctx = this.getAuthContext();
  return createSongsAPI(ctx, ctx.pb);
});
```

**Pattern B (Songs page):** `$derived.by` in component
```typescript
// songs/+page.svelte
const ratingsAPI = $derived.by(() => {
  const ctx = auth.getAuthContext();
  return createRatingsAPI(ctx, ctx.pb);
});
```

**Pattern C (Admin pages):** `$effect` assignment
```typescript
// admin/roles/+page.svelte
$effect(() => {
  const ctx = auth.getAuthContext();
  if (ctx?.currentChurch) {
    rolesAPI = createRolesAPI(ctx, pb);
  }
});
```

---

## Proposed Standard: Two Patterns

### Pattern 1: Store-Based (Default for Lists/Collections)

**Use for:**
- List pages with pagination/filtering
- Data that benefits from caching across navigations
- Data requiring real-time updates
- Shared state between components

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  +page.svelte                                   │
│  ┌───────────────────────────────────────────┐  │
│  │ const store = getXxxStore()               │  │
│  │ let items = $derived(store.items)         │  │
│  │                                           │  │
│  │ onMount(() => {                           │  │
│  │   store.loadOnce()                        │  │
│  │   return store.subscribeToUpdates()       │  │
│  │ })                                        │  │
│  └───────────────────────────────────────────┘  │
│                     │                           │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐  │
│  │ XxxStore (via context)                    │  │
│  │ - Manages loading/error/data state        │  │
│  │ - Handles caching                         │  │
│  │ - Real-time subscriptions                 │  │
│  └───────────────────────────────────────────┘  │
│                     │                           │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐  │
│  │ XxxAPI (injected into store)              │  │
│  │ - Pure data fetching                      │  │
│  │ - No state management                     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Template:**
```typescript
// +page.ts
export const ssr = false;
// No load function needed - store handles data

// +page.svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getXxxStore } from '$lib/context/stores.svelte';

  const store = getXxxStore();

  // Reactive bindings to store state
  let items = $derived(store.items);
  let loading = $derived(store.loading);
  let error = $derived(store.error);

  onMount(() => {
    store.loadOnce();
    const unsubscribe = store.subscribeToUpdates();
    return () => unsubscribe?.();
  });
</script>
```

**Pages that should use this:**
- `/songs` - Song library (currently mixed - needs cleanup)
- `/services` - Service list ✓ (already correct)
- `/dashboard` - Dashboard ✓ (already correct)
- `/analytics` - Analytics ✓ (already correct)
- `/admin/roles` - Roles list (needs migration)
- `/admin/members` - Members list (needs migration)
- `/admin/skills` - Skills list (needs migration)

---

### Pattern 2: Load Function (For Single-Record Detail Pages)

**Use for:**
- Detail pages with a single primary record (`[id]`)
- Data that needs to be ready before component renders
- Data unlikely to change during page view
- Pages where preloading improves perceived performance

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  +page.ts                                       │
│  ┌───────────────────────────────────────────┐  │
│  │ export const load: PageLoad = async ({    │  │
│  │   params                                  │  │
│  │ }) => {                                   │  │
│  │   const record = await api.getOne(id)     │  │
│  │   return { record }                       │  │
│  │ }                                         │  │
│  └───────────────────────────────────────────┘  │
│                     │                           │
│                     ▼                           │
│  +page.svelte                                   │
│  ┌───────────────────────────────────────────┐  │
│  │ let { data } = $props()                   │  │
│  │ let record = $derived(data.record)        │  │
│  │                                           │  │
│  │ // Use data directly - no store needed    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Template:**
```typescript
// +page.ts
import { error } from '@sveltejs/kit';
import { pb } from '$lib/api/client';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
  try {
    const record = await pb.collection('xxx').getOne(params.id, {
      expand: 'related_field'
    });

    return { record };
  } catch (err) {
    if (err?.status === 404) {
      throw error(404, 'Not found');
    }
    throw error(500, 'Failed to load');
  }
};

// +page.svelte
<script lang="ts">
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let record = $derived(data.record);
</script>
```

**Pages that should use this:**
- `/songs/[id]` ✓ (already correct)
- `/services/[id]` (needs review - currently minimal)
- `/invites/[token]` ✓ (already correct)
- `/admin/churches/[id]/settings` (needs review)

---

## Migration Plan

### Phase 1: Clean Up Songs Page (High Priority)

**Current Issues:**
1. `+page.ts` loads songs but they're ignored
2. Component loads again via store
3. Ratings/labels use direct API calls

**Proposed Changes:**

```typescript
// +page.ts - REMOVE the load function entirely
export const ssr = false;
// Songs store handles all data loading

// +page.svelte - Move ratings/labels into store OR accept direct API
// Option A: Extend SongsStore to include ratings/labels
// Option B: Create dedicated RatingsStore, LabelsStore
// Option C: Keep direct API but document as intentional exception
```

**Recommended: Option A** - Extend SongsStore

The songs store already loads user ratings in `loadAllSongsOnce()`. Labels should also be loaded there:

```typescript
// songs.svelte.ts - Add labels loading
async loadAllSongsOnce(): Promise<void> {
  // ... existing song loading ...

  // Also load labels for filtering
  this.labels = await this.labelsApi.getLabels(churchId);
}
```

### Phase 2: Create Admin Stores (Medium Priority)

Create stores for admin functionality:

```typescript
// src/lib/stores/roles.svelte.ts
class RolesStore {
  roles = $state<Role[]>([]);
  loading = $state(false);
  error = $state<string | null>(null);

  private rolesApi: RolesAPI;

  constructor(private auth: AuthStore) {
    this.rolesApi = $derived.by(() => {
      const ctx = this.auth.getAuthContext();
      return createRolesAPI(ctx, ctx.pb);
    });
  }

  async loadRoles() { /* ... */ }
  async createRole(data: CreateRoleData) { /* ... */ }
  async updateRole(id: string, data: UpdateRoleData) { /* ... */ }
  async deleteRole(id: string) { /* ... */ }

  subscribeToUpdates() {
    return this.rolesApi.subscribe((event) => {
      // Handle real-time updates
    });
  }
}

export function createRolesStore(auth: AuthStore) {
  return new RolesStore(auth);
}
```

**Stores to create:**
- `RolesStore` - for `/admin/roles`
- `MembersStore` - for `/admin/members`
- `SkillsStore` - for `/admin/skills`
- `ChurchSettingsStore` - for `/admin/settings`

### Phase 3: Update Context Initialization

```typescript
// src/lib/context/stores.svelte.ts
export function initializeStores(): StoreContext {
  const auth = createAuthStore();

  // Core stores
  const songs = createSongsStore(auth);
  const services = createServicesStore(auth);
  const analytics = createAnalyticsStore(auth);
  const recommendations = createRecommendationsStore(auth.getAuthContext(), pb);

  // Admin stores (lazy-loaded when needed)
  const roles = createRolesStore(auth);
  const members = createMembersStore(auth);
  const skills = createSkillsStore(auth);

  // Set contexts...
}
```

---

## API Initialization Standard

All API instances should be created using `$derived.by()` for lazy evaluation:

```typescript
// ✅ CORRECT: Lazy initialization with $derived.by
private api = $derived.by(() => {
  const ctx = this.getAuthContext();
  return createXxxAPI(ctx, ctx.pb);
});

// ❌ AVOID: $effect for API creation
$effect(() => {
  if (ctx?.currentChurch) {
    this.api = createXxxAPI(ctx, pb);  // Mutable assignment
  }
});

// ❌ AVOID: Eager initialization in constructor
constructor(auth: AuthStore) {
  this.api = createXxxAPI(auth.getAuthContext(), pb);  // May be stale
}
```

**Why `$derived.by()`?**
1. Automatically re-creates API when auth context changes
2. Lazy - only creates when accessed
3. Immutable pattern - no side effects
4. Works correctly with Svelte 5 reactivity

---

## Decision Tree

```
Is this a list/collection page?
├─ YES → Does the data need real-time updates?
│        ├─ YES → Use Store Pattern (Pattern 1)
│        └─ NO  → Use Store Pattern (still benefits from caching)
│
└─ NO → Is this a detail page with [id]?
         ├─ YES → Use Load Function Pattern (Pattern 2)
         └─ NO  → Is this a form-only page?
                  ├─ YES → Direct API calls on submit (no pattern needed)
                  └─ NO  → Evaluate case-by-case
```

---

## Implementation Checklist

### Completed

- [x] Remove unused `+page.ts` from `/songs` page
- [x] Move labels loading into SongsStore
- [x] Create `RolesStore` and migrate `/admin/roles`
- [x] Create `SkillsStore` and migrate `/admin/skills`
- [x] Add real-time subscriptions to admin stores
- [x] Update context initialization with new stores

### Remaining (Future Sprints)

- [ ] Create `MembersStore` and migrate `/admin/members` (complex - uses different API pattern)
- [ ] Create `ChurchSettingsStore` for settings pages
- [ ] Review and clean up `/services/[id]` page
- [ ] Add SSR comments to all `+page.ts` files explaining why disabled
- [ ] Update TESTING_GUIDE.md with store testing patterns for new stores

---

## Testing Implications

All new stores should follow the existing dependency injection pattern for testability:

```typescript
// Test setup
import { createRolesStore } from '$lib/stores/roles.svelte';
import { createRolesAPI } from '$lib/api/roles';
import { mockAuthStore } from '$tests/helpers/mock-builders';

vi.mock('$lib/api/roles', () => ({
  createRolesAPI: vi.fn()
}));

describe('RolesStore', () => {
  let store: RolesStore;
  let mockRolesAPI: MockedRolesAPI;

  beforeEach(() => {
    mockRolesAPI = {
      getRoles: vi.fn().mockResolvedValue([mockRole]),
      createRole: vi.fn(),
      // ...
    };
    (createRolesAPI as any).mockReturnValue(mockRolesAPI);

    store = createRolesStore(mockAuthStore());
  });

  it('should load roles', async () => {
    await store.loadRoles();
    expect(store.roles).toEqual([mockRole]);
  });
});
```

---

## Summary

| Before | After |
|--------|-------|
| 4+ patterns | 2 patterns |
| Redundant data fetching | Single source of truth |
| Admin pages bypass stores | All pages use stores |
| Inconsistent API init | Standard `$derived.by()` |
| No real-time for admin | Real-time everywhere |

**Expected Benefits:**
1. Reduced network requests (no duplicate fetching)
2. Better caching across navigations
3. Real-time updates for admin operations
4. Consistent testing patterns
5. Easier onboarding for new developers
