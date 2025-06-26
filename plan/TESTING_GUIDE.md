# Testing Guide for WorshipWise

**Status**: ✅ **IMPLEMENTED** - Multi-project Vitest setup with dependency injection

## Current Test Status

**Store Tests (199/199 passing - 100%)** ✅  
**Component Tests**: Dependency injection migration in progress  
**E2E Tests**: Playwright setup ready  
**Memory Performance**: Zero memory leaks (2.5s for 199 tests)

## Testing Stack

- **Unit**: Vitest with jsdom environment
- **Component**: Testing Library for Svelte
- **E2E**: Playwright for browser automation
- **API**: Vitest with mocked PocketBase

## Key Testing Patterns

### Dependency Injection Testing (Current)

```typescript
import { createSongsStore } from './songs.svelte';
import { mockAuthContext } from '$tests/helpers/mock-builders';

describe('SongsStore', () => {
	let songsStore: SongsStore;
	let authContext: AuthContext;

	beforeEach(() => {
		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1', current_church_id: 'church-1' }
		});
		songsStore = createSongsStore(authContext);
	});
});
```

### PocketBase Mocking

```typescript
import { mockPb } from '$tests/helpers/pb-mock';

// Setup expectations
mockPb.collection('songs').getFullList.mockResolvedValue(mockSongs);

// Real-time subscription testing (TWO parameters)
mockPb
	.collection('songs')
	.subscribe.mockImplementation((topic: string, handler: (data: unknown) => void) => {
		eventHandler = handler;
		return Promise.resolve(unsubscribe);
	});
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

## Migration Benefits

**Before (Singleton)**: Memory leaks, 167/190 tests passing (87.9%)  
**After (Dependency Injection)**: 199/199 passing (100%), zero memory leaks, 20% faster

## Test Commands

```bash
npm run test:unit            # Unit tests with Vitest
npm run test:e2e             # E2E tests with Playwright
npm run test:coverage        # Coverage report
```

## Coverage Requirements

- **Minimum**: 80% for testable logic
- **Focus**: State mutations, API interactions, business logic
- **Skip**: Derived values (test in integration/E2E instead)
