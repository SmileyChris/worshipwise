# Testing Guide for WorshipWise

This guide outlines the testing strategy, setup, and patterns for ensuring high-quality code in the WorshipWise application.

## Testing Stack

- **Unit Testing**: Vitest with jsdom environment
- **Component Testing**: Testing Library for Svelte
- **E2E Testing**: Playwright for browser automation
- **Visual Testing**: Playwright with screenshot comparison
- **API Testing**: Vitest with mocked PocketBase
- **Performance Testing**: Lighthouse CI integration

## Test Configuration

### Vitest Configuration

The project uses a multi-project Vitest setup defined in `vite.config.ts`:

```typescript
// vite.config.ts
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
```

### Test Setup Files

#### Client Test Setup

```typescript
// vitest-setup-client.ts
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock PocketBase
vi.mock('$lib/api/client', () => ({
	pb: {
		collection: vi.fn(),
		authStore: {
			model: null,
			token: '',
			isValid: false,
			onChange: vi.fn(),
			clear: vi.fn()
		}
	}
}));

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => () => {})
	}
}));

// Clear all mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		},
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] }
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 12'] }
		}
	],
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	}
});
```

## Testing Patterns

### 1. Unit Testing Svelte 5 Stores

```typescript
// src/lib/stores/songs.svelte.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SongStore } from './songs.svelte';

// Mock PocketBase
const mockPb = {
	collection: vi.fn(() => ({
		getFullList: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		subscribe: vi.fn()
	}))
};

vi.mock('$lib/api/client', () => ({
	pb: mockPb
}));

describe('SongStore', () => {
	let songStore: SongStore;

	beforeEach(() => {
		songStore = new SongStore();
		vi.clearAllMocks();
	});

	it('initializes with empty state', () => {
		expect(songStore.songs).toEqual([]);
		expect(songStore.loading).toBe(false);
		expect(songStore.error).toBe(null);
	});

	it('loads songs successfully', async () => {
		const mockSongs = [
			{ id: '1', title: 'Amazing Grace', artist: 'Traditional' },
			{ id: '2', title: 'How Great Thou Art', artist: 'Traditional' }
		];

		mockPb.collection().getFullList.mockResolvedValue(mockSongs);

		await songStore.loadSongs();

		expect(songStore.songs).toEqual(mockSongs);
		expect(songStore.loading).toBe(false);
		expect(songStore.error).toBe(null);
	});

	it('handles loading errors', async () => {
		const errorMessage = 'Failed to load songs';
		mockPb.collection().getFullList.mockRejectedValue(new Error(errorMessage));

		await songStore.loadSongs();

		expect(songStore.songs).toEqual([]);
		expect(songStore.loading).toBe(false);
		expect(songStore.error).toBe(errorMessage);
	});

	it('creates new song', async () => {
		const newSong = { title: 'New Song', artist: 'New Artist' };
		const createdSong = { id: '3', ...newSong };

		mockPb.collection().create.mockResolvedValue(createdSong);

		await songStore.createSong(newSong);

		expect(mockPb.collection().create).toHaveBeenCalledWith(newSong);
		expect(songStore.songs).toContain(createdSong);
	});

	it('filters songs correctly', () => {
		songStore.songs = [
			{ id: '1', title: 'Amazing Grace', artist: 'Traditional' },
			{ id: '2', title: 'How Great Thou Art', artist: 'Traditional' },
			{ id: '3', title: '10,000 Reasons', artist: 'Matt Redman' }
		];

		songStore.searchTerm = 'amazing';

		expect(songStore.filteredSongs).toEqual([
			{ id: '1', title: 'Amazing Grace', artist: 'Traditional' }
		]);
	});
});
```

### 2. Component Testing

```typescript
// src/lib/components/songs/SongCard.svelte.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SongCard from './SongCard.svelte';
import type { Song } from '$lib/types/song';

const mockSong: Song = {
	id: '1',
	title: 'Amazing Grace',
	artist: 'Traditional',
	key_signature: 'G',
	tempo: 80,
	duration_seconds: 240,
	tags: ['hymn', 'traditional'],
	is_active: true,
	created: '2023-01-01T00:00:00Z',
	updated: '2023-01-01T00:00:00Z'
};

describe('SongCard', () => {
	it('renders song information correctly', () => {
		render(SongCard, { props: { song: mockSong } });

		expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
		expect(screen.getByText('Traditional')).toBeInTheDocument();
		expect(screen.getByText('Key: G')).toBeInTheDocument();
		expect(screen.getByText('80 BPM')).toBeInTheDocument();
		expect(screen.getByText('4:00')).toBeInTheDocument(); // Duration formatted
	});

	it('displays tags correctly', () => {
		render(SongCard, { props: { song: mockSong } });

		expect(screen.getByText('hymn')).toBeInTheDocument();
		expect(screen.getByText('traditional')).toBeInTheDocument();
	});

	it('calls onEdit when edit button is clicked', async () => {
		const onEdit = vi.fn();
		render(SongCard, {
			props: {
				song: mockSong,
				onEdit,
				showActions: true
			}
		});

		const editButton = screen.getByText('Edit');
		await fireEvent.click(editButton);

		expect(onEdit).toHaveBeenCalledWith(mockSong);
	});

	it('calls onAddToSetlist when add button is clicked', async () => {
		const onAddToSetlist = vi.fn();
		render(SongCard, {
			props: {
				song: mockSong,
				onAddToSetlist,
				showActions: true
			}
		});

		const addButton = screen.getByText('Add to Setlist');
		await fireEvent.click(addButton);

		expect(onAddToSetlist).toHaveBeenCalledWith(mockSong);
	});

	it('hides actions when showActions is false', () => {
		render(SongCard, {
			props: {
				song: mockSong,
				showActions: false
			}
		});

		expect(screen.queryByText('Edit')).not.toBeInTheDocument();
		expect(screen.queryByText('Add to Setlist')).not.toBeInTheDocument();
	});

	it('shows usage indicator when enabled', () => {
		render(SongCard, {
			props: {
				song: mockSong,
				showUsageIndicator: true
			}
		});

		// Assuming the song is available (green status)
		expect(screen.getByText('Available')).toBeInTheDocument();
	});

	it('applies custom CSS classes', () => {
		const customClass = 'custom-card-class';
		render(SongCard, {
			props: {
				song: mockSong,
				class: customClass
			}
		});

		const cardElement = screen.getByText('Amazing Grace').closest('.bg-white');
		expect(cardElement).toHaveClass(customClass);
	});
});
```

### 3. Form Testing

```typescript
// src/lib/components/forms/SongForm.svelte.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SongForm from './SongForm.svelte';
import type { Song } from '$lib/types/song';

describe('SongForm', () => {
	it('renders form fields correctly', () => {
		render(SongForm);

		expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/artist/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/key signature/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/tempo/i)).toBeInTheDocument();
	});

	it('validates required fields', async () => {
		const onSubmit = vi.fn();
		render(SongForm, { props: { onSubmit } });

		const submitButton = screen.getByText('Save Song');
		await fireEvent.click(submitButton);

		expect(screen.getByText('Title is required')).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('submits form with valid data', async () => {
		const onSubmit = vi.fn();
		render(SongForm, { props: { onSubmit } });

		// Fill form
		await fireEvent.input(screen.getByLabelText(/title/i), {
			target: { value: 'Amazing Grace' }
		});
		await fireEvent.input(screen.getByLabelText(/artist/i), {
			target: { value: 'Traditional' }
		});
		await fireEvent.change(screen.getByLabelText(/key signature/i), {
			target: { value: 'G' }
		});
		await fireEvent.input(screen.getByLabelText(/tempo/i), {
			target: { value: '80' }
		});

		const submitButton = screen.getByText('Save Song');
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				title: 'Amazing Grace',
				artist: 'Traditional',
				key_signature: 'G',
				tempo: 80
			});
		});
	});

	it('populates form when editing existing song', () => {
		const existingSong: Partial<Song> = {
			title: 'How Great Thou Art',
			artist: 'Traditional',
			key_signature: 'C',
			tempo: 72
		};

		render(SongForm, { props: { song: existingSong } });

		expect(screen.getByDisplayValue('How Great Thou Art')).toBeInTheDocument();
		expect(screen.getByDisplayValue('Traditional')).toBeInTheDocument();
		expect(screen.getByDisplayValue('C')).toBeInTheDocument();
		expect(screen.getByDisplayValue('72')).toBeInTheDocument();
	});

	it('shows loading state during submission', async () => {
		const onSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
		render(SongForm, { props: { onSubmit } });

		// Fill required fields
		await fireEvent.input(screen.getByLabelText(/title/i), {
			target: { value: 'Test Song' }
		});

		const submitButton = screen.getByText('Save Song');
		await fireEvent.click(submitButton);

		expect(screen.getByText('Saving...')).toBeInTheDocument();
		expect(submitButton).toBeDisabled();
	});
});
```

### 4. E2E Testing

```typescript
// e2e/songs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Song Management', () => {
	test.beforeEach(async ({ page }) => {
		// Mock PocketBase authentication
		await page.route('**/api/collections/users/auth-with-password', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					token: 'mock-token',
					record: {
						id: 'user1',
						email: 'test@church.com',
						name: 'Test User',
						role: 'leader'
					}
				})
			});
		});

		// Mock songs API
		await page.route('**/api/collections/songs/records', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						items: [
							{
								id: '1',
								title: 'Amazing Grace',
								artist: 'Traditional',
								key_signature: 'G',
								tempo: 80,
								is_active: true
							},
							{
								id: '2',
								title: 'How Great Thou Art',
								artist: 'Traditional',
								key_signature: 'C',
								tempo: 72,
								is_active: true
							}
						],
						totalItems: 2
					})
				});
			}
		});

		// Login
		await page.goto('/login');
		await page.fill('[data-testid="email"]', 'test@church.com');
		await page.fill('[data-testid="password"]', 'password123');
		await page.click('[data-testid="login-button"]');
		await page.waitForURL('/songs');
	});

	test('displays song library', async ({ page }) => {
		await expect(page.locator('[data-testid="song-card"]')).toHaveCount(2);
		await expect(page.getByText('Amazing Grace')).toBeVisible();
		await expect(page.getByText('How Great Thou Art')).toBeVisible();
	});

	test('filters songs by search term', async ({ page }) => {
		await page.fill('[data-testid="search-input"]', 'Amazing');
		await page.waitForTimeout(300); // Debounce delay

		await expect(page.locator('[data-testid="song-card"]')).toHaveCount(1);
		await expect(page.getByText('Amazing Grace')).toBeVisible();
		await expect(page.getByText('How Great Thou Art')).not.toBeVisible();
	});

	test('opens song creation form', async ({ page }) => {
		await page.click('[data-testid="add-song-button"]');
		await expect(page.getByText('Add New Song')).toBeVisible();
		await expect(page.getByLabel('Title')).toBeVisible();
		await expect(page.getByLabel('Artist')).toBeVisible();
	});

	test('creates new song', async ({ page }) => {
		// Mock create song API
		await page.route('**/api/collections/songs/records', async (route) => {
			if (route.request().method() === 'POST') {
				const postData = await route.request().postDataJSON();
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: '3',
						...postData,
						created: new Date().toISOString(),
						updated: new Date().toISOString()
					})
				});
			}
		});

		await page.click('[data-testid="add-song-button"]');

		// Fill form
		await page.fill('[data-testid="title-input"]', '10,000 Reasons');
		await page.fill('[data-testid="artist-input"]', 'Matt Redman');
		await page.selectOption('[data-testid="key-select"]', 'A');
		await page.fill('[data-testid="tempo-input"]', '125');

		await page.click('[data-testid="save-button"]');

		// Verify success
		await expect(page.getByText('Song created successfully')).toBeVisible();
		await expect(page.getByText('10,000 Reasons')).toBeVisible();
	});
});
```

### 5. Setlist E2E Testing

```typescript
// e2e/setlists.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Setlist Management', () => {
	test('creates and manages setlist', async ({ page }) => {
		// Mock APIs
		await page.route('**/api/collections/setlists/records', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: 'setlist1',
						title: 'Sunday Morning Service',
						service_date: '2023-12-10',
						status: 'draft'
					})
				});
			}
		});

		await page.goto('/setlists');
		await page.click('[data-testid="create-setlist-button"]');

		// Fill setlist form
		await page.fill('[data-testid="setlist-title"]', 'Sunday Morning Service');
		await page.fill('[data-testid="service-date"]', '2023-12-10');
		await page.selectOption('[data-testid="service-type"]', 'Sunday Morning');

		await page.click('[data-testid="create-button"]');

		// Verify setlist creation
		await expect(page.getByText('Sunday Morning Service')).toBeVisible();
	});

	test('adds songs to setlist with drag and drop', async ({ page }) => {
		await page.goto('/setlists/setlist1/edit');

		// Drag song from library to setlist
		const songCard = page.locator('[data-testid="song-card"]').first();
		const setlistArea = page.locator('[data-testid="setlist-songs"]');

		await songCard.dragTo(setlistArea);

		// Verify song was added
		await expect(setlistArea.getByText('Amazing Grace')).toBeVisible();
	});

	test('reorders songs in setlist', async ({ page }) => {
		await page.goto('/setlists/setlist1/edit');

		// Assuming songs are already in the setlist
		const firstSong = page.locator('[data-testid="setlist-song"]').first();
		const secondSong = page.locator('[data-testid="setlist-song"]').nth(1);

		await firstSong.dragTo(secondSong);

		// Verify reordering
		await expect(page.locator('[data-testid="setlist-song"]').first()).not.toContainText(
			'Amazing Grace'
		);
	});
});
```

### 6. Visual Testing

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Tests', () => {
	test('song library page', async ({ page }) => {
		await page.goto('/songs');
		await expect(page).toHaveScreenshot('song-library.png');
	});

	test('setlist builder page', async ({ page }) => {
		await page.goto('/setlists/new');
		await expect(page).toHaveScreenshot('setlist-builder.png');
	});

	test('analytics dashboard', async ({ page }) => {
		await page.goto('/analytics');
		await expect(page).toHaveScreenshot('analytics-dashboard.png');
	});

	test('mobile responsive design', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/songs');
		await expect(page).toHaveScreenshot('mobile-song-library.png');
	});
});
```

## API Testing

### PocketBase Mock Utilities

```typescript
// src/lib/test-utils/pocketbase-mock.ts
import { vi } from 'vitest';

export function createMockPocketBase() {
	const mockCollection = vi.fn(() => ({
		getFullList: vi.fn(),
		getOne: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
		authWithPassword: vi.fn()
	}));

	return {
		collection: mockCollection,
		authStore: {
			model: null,
			token: '',
			isValid: false,
			onChange: vi.fn(),
			clear: vi.fn()
		},
		realtime: {
			subscribe: vi.fn(),
			unsubscribe: vi.fn()
		}
	};
}

export function mockApiResponse<T>(data: T, delay = 0) {
	return new Promise<T>((resolve) => {
		setTimeout(() => resolve(data), delay);
	});
}

export function mockApiError(message: string, status = 400) {
	const error = new Error(message);
	(error as any).status = status;
	return Promise.reject(error);
}
```

### Integration Testing

```typescript
// src/lib/api/songs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPocketBase, mockApiResponse, mockApiError } from '../test-utils/pocketbase-mock';
import { SongsAPI } from './songs';

// Mock the PocketBase client
const mockPb = createMockPocketBase();
vi.mock('$lib/api/client', () => ({
	pb: mockPb
}));

describe('SongsAPI', () => {
	let songsApi: SongsAPI;

	beforeEach(() => {
		songsApi = new SongsAPI();
		vi.clearAllMocks();
	});

	describe('getAvailableSongs', () => {
		it('returns songs not used recently', async () => {
			const mockSongs = [
				{ id: '1', title: 'Song 1', is_active: true },
				{ id: '2', title: 'Song 2', is_active: true }
			];

			mockPb
				.collection()
				.getFullList.mockResolvedValueOnce([]) // No recent usage
				.mockResolvedValueOnce(mockSongs); // Available songs

			const result = await songsApi.getAvailableSongs(4);

			expect(result).toEqual(mockSongs);
			expect(mockPb.collection).toHaveBeenCalledWith('song_usage');
			expect(mockPb.collection).toHaveBeenCalledWith('songs');
		});

		it('excludes recently used songs', async () => {
			const recentUsage = [{ song: 'song1' }];
			const allSongs = [
				{ id: 'song1', title: 'Recently Used Song' },
				{ id: 'song2', title: 'Available Song' }
			];

			mockPb
				.collection()
				.getFullList.mockResolvedValueOnce(recentUsage)
				.mockResolvedValueOnce([allSongs[1]]);

			const result = await songsApi.getAvailableSongs(4);

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Available Song');
		});

		it('handles API errors gracefully', async () => {
			mockPb.collection().getFullList.mockRejectedValue(new Error('API Error'));

			await expect(songsApi.getAvailableSongs(4)).rejects.toThrow('API Error');
		});
	});

	describe('createSong', () => {
		it('creates song successfully', async () => {
			const songData = { title: 'New Song', artist: 'Artist' };
			const createdSong = { id: '1', ...songData };

			mockPb.collection().create.mockResolvedValue(createdSong);

			const result = await songsApi.createSong(songData);

			expect(result).toEqual(createdSong);
			expect(mockPb.collection).toHaveBeenCalledWith('songs');
			expect(mockPb.collection().create).toHaveBeenCalledWith(songData);
		});
	});
});
```

## Performance Testing

### Lighthouse CI Configuration

```json
// .lighthouserc.json
{
	"ci": {
		"collect": {
			"url": [
				"http://localhost:4173",
				"http://localhost:4173/songs",
				"http://localhost:4173/setlists",
				"http://localhost:4173/analytics"
			],
			"startServerCommand": "npm run preview",
			"numberOfRuns": 3
		},
		"assert": {
			"assertions": {
				"categories:performance": ["error", { "minScore": 0.8 }],
				"categories:accessibility": ["error", { "minScore": 0.9 }],
				"categories:best-practices": ["error", { "minScore": 0.9 }],
				"categories:seo": ["error", { "minScore": 0.8 }]
			}
		},
		"upload": {
			"target": "temporary-public-storage"
		}
	}
}
```

### Bundle Analysis

```typescript
// scripts/analyze-bundle.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function analyzeBundleSize() {
	try {
		await execAsync('npm run build');

		const { stdout } = await execAsync('du -sh build/');
		const totalSize = stdout.split('\t')[0];

		console.log(`Bundle size: ${totalSize}`);

		// Check if bundle is under threshold
		const sizeInKB = parseInt(totalSize.replace('K', ''));
		if (sizeInKB > 500) {
			console.error('Bundle size exceeds 500KB threshold');
			process.exit(1);
		}
	} catch (error) {
		console.error('Bundle analysis failed:', error);
		process.exit(1);
	}
}

analyzeBundleSize();
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run build
        run: npm run build

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Test Coverage

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/test-utils/',
				'**/*.test.{ts,js}',
				'**/*.spec.{ts,js}',
				'src/app.html',
				'src/app.d.ts',
				'vite.config.ts',
				'svelte.config.js'
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80
				}
			}
		}
	}
});
```

### Test Scripts

```json
{
	"scripts": {
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage",
		"test:e2e": "playwright test",
		"test:e2e:ui": "playwright test --ui",
		"test:visual": "playwright test --grep='visual'",
		"test:mobile": "playwright test --project='Mobile Chrome'",
		"test:all": "npm run test:coverage && npm run test:e2e"
	}
}
```

This comprehensive testing guide provides a solid foundation for maintaining high code quality and ensuring the reliability of the WorshipWise application throughout development and deployment.
