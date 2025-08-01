import { beforeEach, afterEach, vi } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from './test-utils';
import { mockPb } from './pb-mock';
import './component-helpers'; // Load component helpers globally

// Make mock builders globally available for server tests
import { resetMockCounters } from './mock-builders';
export * from './mock-builders';

// Mock SvelteKit modules as recommended in testing guide
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

// Global test setup
beforeEach(() => {
	setupTestEnvironment();
	mockPb.reset();
	vi.clearAllMocks();
	// Mock console.error to prevent error logs during tests
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	cleanupTestEnvironment();
});
