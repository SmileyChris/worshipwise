# Testing Guide for WorshipWise

**Status**: ✅ **FULLY IMPLEMENTED** - Complete dependency injection architecture with multi-project Vitest setup

## Current Test Status

**Total Tests**: 541/542 passing (99.8% pass rate) ✅  
**Store Tests**: All 7 stores fully migrated to dependency injection  
**Component Tests**: Using Testing Library with DI patterns  
**E2E Tests**: Playwright setup ready  
**Performance**: Zero memory leaks, ~25s for full test suite  
**Architecture**: 100% dependency injection - no singletons

## Testing Stack

- **Unit**: Vitest with jsdom environment
- **Component**: Testing Library for Svelte
- **E2E**: Playwright for browser automation
- **API**: Vitest with mocked PocketBase

## Understanding Our Dependency Injection Architecture

### What is Dependency Injection?

Dependency Injection (DI) is a design pattern where objects receive their dependencies from external sources rather than creating them internally. In WorshipWise, every store receives its dependencies through constructor parameters instead of importing singletons or using Svelte's context API.

### The Problem We Solved

Previously, our stores used a singleton pattern with `getContext()`:
```typescript
// ❌ OLD: Singleton pattern with context
export const songsStore = {
  async loadSongs() {
    const auth = getContext('auth'); // ERROR in tests!
    const response = await pb.collection('songs').getList();
  }
};
```

This caused several issues:
- `lifecycle_outside_component` errors in tests
- Shared state between tests leading to pollution
- Memory leaks from persistent connections
- Difficult to mock dependencies
- Poor test isolation

### Our Solution: Constructor-Based Dependency Injection

```typescript
// ✅ NEW: Dependency injection pattern
class SongsStore {
  private songsApi: SongsAPI;
  
  constructor(private authContext: AuthContext) {
    // Dependencies are injected, not imported or fetched
    this.songsApi = createSongsAPI(authContext, authContext.pb);
  }
  
  async loadSongs() {
    // Use injected dependencies
    return await this.songsApi.getSongsPaginated();
  }
}

// Factory function for creating instances
export function createSongsStore(authContext: AuthContext) {
  return new SongsStore(authContext);
}
```

### Why This Works Better

1. **Explicit Dependencies**: Every store declares exactly what it needs
2. **Test Isolation**: Each test creates its own instances with mock dependencies
3. **No Lifecycle Issues**: No `getContext()` means tests run anywhere
4. **Easy Mocking**: Replace any dependency with a test double
5. **Type Safety**: TypeScript knows all dependencies at compile time

### The Dependency Flow

```
Root Layout (app.svelte)
    ↓ creates
AuthStore (provides AuthContext)
    ↓ passes to
Store Factories (createSongsStore, createServicesStore, etc.)
    ↓ inject into
Individual Stores (with their API dependencies)
    ↓ used by
Components (via context or props)
```

### In Testing

```typescript
// Each test creates its own isolated world
beforeEach(() => {
  // 1. Create mock auth context
  const authContext = mockAuthContext({ /* test data */ });
  
  // 2. Create mock API
  const mockAPI = { loadSongs: vi.fn() };
  
  // 3. Inject mocks
  (createSongsAPI as any).mockReturnValue(mockAPI);
  
  // 4. Create store with mocks
  const store = createSongsStore(authContext);
  
  // Store is completely isolated!
});
```

## Testing Architecture

### Complete Dependency Injection Pattern

Every store in the codebase now follows this consistent pattern:

```typescript
// Store implementation
class SongsStore {
	private songsApi: SongsAPI;

	constructor(private authContext: AuthContext) {
		// Create API instance with injected context
		this.songsApi = createSongsAPI(authContext, authContext.pb);
	}
	
	async loadSongs() {
		// Use injected API instead of singleton
		const result = await this.songsApi.getSongsPaginated();
	}
}

// Factory function for creating instances
export function createSongsStore(authContext: AuthContext): SongsStore {
	return new SongsStore(authContext);
}
```

### Test Setup Pattern

```typescript
import { createSongsStore } from './songs.svelte';
import { createSongsAPI } from '$lib/api/songs';
import { mockAuthContext } from '$tests/helpers/mock-builders';

// Mock the API module
vi.mock('$lib/api/songs', () => ({
	createSongsAPI: vi.fn()
}));

describe('SongsStore', () => {
	let songsStore: SongsStore;
	let authContext: AuthContext;
	let mockSongsAPI: any;

	beforeEach(() => {
		// Create mock auth context
		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: { church_id: 'church-1', role: 'leader' }
		});
		
		// Create mock API with all methods
		mockSongsAPI = {
			getSongsPaginated: vi.fn(),
			getSongsUsageInfo: vi.fn(),
			createSong: vi.fn(),
			updateSong: vi.fn(),
			deleteSong: vi.fn(),
			subscribe: vi.fn()
		};
		
		// Mock the factory to return our mock
		(createSongsAPI as any).mockReturnValue(mockSongsAPI);
		
		// Create store instance
		songsStore = createSongsStore(authContext);
	});
});
```

### API Mocking Strategy

We use a two-tier mocking approach:

1. **Direct API Mocking** (Preferred for store tests):
```typescript
// Mock the specific API methods your store uses
const mockSongsAPI = {
	getSongsPaginated: vi.fn().mockResolvedValue({
		items: [mockSong],
		totalItems: 1,
		totalPages: 1,
		page: 1,
		perPage: 20
	}),
	getSongsUsageInfo: vi.fn().mockResolvedValue(
		new Map([['song-1', { lastUsed: new Date(), daysSince: 7 }]])
	)
};
```

2. **PocketBase Mock** (For integration tests):
```typescript
import { mockPb } from '$tests/helpers/pb-mock';

// Setup collection expectations
mockPb.collection('songs').getFullList.mockResolvedValue(mockSongs);

// Real-time subscription testing
mockSongsAPI.subscribe.mockImplementation((handler: (data: unknown) => void) => {
	eventHandler = handler;
	return Promise.resolve(unsubscribe);
});
```
```

### Component Testing

```typescript
import { render, screen } from '@testing-library/svelte';
import SongCard from './SongCard.svelte';

test('renders song information', () => {
	render(SongCard, { song: mockSong });
	expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
});
```

### E2E Testing

```typescript
test('creates new song', async ({ page }) => {
	await page.goto('/songs');
	await page.click('[data-testid="add-song-button"]');
	await page.fill('[data-testid="title-input"]', 'New Song');
	await page.click('[data-testid="save-button"]');
	await expect(page.getByText('New Song')).toBeVisible();
});
```

## Architecture Benefits

### Before (Singleton Pattern)
- **Test Success Rate**: 167/190 tests passing (87.9%)
- **Memory Issues**: Persistent memory leaks between tests
- **Test Isolation**: Poor - stores shared state between tests
- **Performance**: Slower due to cleanup overhead
- **Maintenance**: Difficult to mock and test edge cases

### After (Complete Dependency Injection)
- **Test Success Rate**: 541/542 tests passing (99.8%)
- **Memory Performance**: Zero memory leaks
- **Test Isolation**: Perfect - each test gets fresh instances
- **Performance**: ~25s for entire suite
- **Maintenance**: Easy to mock, test, and extend

### Key Improvements
1. **No getContext() errors**: All stores receive dependencies explicitly
2. **Better type safety**: TypeScript knows exact API shapes
3. **Easier debugging**: Clear dependency flow
4. **Flexible testing**: Can inject test-specific implementations
5. **Concurrent test execution**: No shared state conflicts

## Common Testing Patterns

### 1. Real-time Subscription Testing
```typescript
it('should handle real-time updates', async () => {
	let eventHandler: (data: any) => void;
	
	// Capture the event handler
	mockAPI.subscribe.mockImplementation((handler) => {
		eventHandler = handler;
		return Promise.resolve(() => {});
	});
	
	await store.subscribeToUpdates();
	
	// Trigger real-time event
	eventHandler({
		action: 'create',
		record: { id: 'new-1', title: 'New Item' }
	});
	
	expect(store.items).toContainEqual(expect.objectContaining({ id: 'new-1' }));
});
```

### 2. Error Handling Testing
```typescript
it('should handle API errors gracefully', async () => {
	const error = new Error('Network error');
	mockAPI.getItems.mockRejectedValue(error);
	
	await store.loadItems();
	
	expect(store.error).toBe('Network error');
	expect(store.items).toEqual([]);
	expect(store.loading).toBe(false);
});
```

### 3. Loading State Testing
```typescript
it('should manage loading states correctly', async () => {
	mockAPI.getItems.mockImplementation(async () => {
		// Assert loading is true during API call
		expect(store.loading).toBe(true);
		return mockItems;
	});
	
	await store.loadItems();
	
	// Assert loading is false after completion
	expect(store.loading).toBe(false);
});
```

## Test Commands

```bash
npm run test:unit            # Run all unit tests
npm run test:unit -- songs   # Run specific test file
npm run test:e2e             # E2E tests with Playwright
npm run test:coverage        # Generate coverage report
```

## Testing Best Practices

### 1. Store Testing
- Always use dependency injection
- Mock at the API level, not PocketBase level
- Test loading states, errors, and success paths
- Verify real-time subscription cleanup

### 2. Component Testing
- Use mock stores with controlled state
- Test user interactions and outcomes
- Verify proper event handling
- Check accessibility attributes

### 3. Coverage Guidelines
- **Target**: 80%+ for business logic
- **Focus Areas**: 
  - State mutations
  - API error handling
  - Complex calculations
  - Permission checks
- **Skip**: 
  - Simple getters
  - Svelte's `$derived` values
  - Third-party integrations

### 4. Mock Data Conventions
```typescript
// Use consistent mock builders
const testUser = mockUser({ role: 'admin' });
const testChurch = mockChurch({ subscription_status: 'active' });
const testSong = mockSong({ usageStatus: 'available' });

// Create related data sets
const mockContext = mockAuthContext({
	user: testUser,
	church: testChurch,
	membership: { role: 'leader' }
});
```
