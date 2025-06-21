import '@testing-library/jest-dom/vitest';
import { vi, beforeEach } from 'vitest';

// Import pb-mock for client tests
import './tests/helpers/pb-mock';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// Mock Web Animations API for Svelte transitions
Element.prototype.animate = vi.fn().mockReturnValue({
	finished: Promise.resolve(),
	cancel: vi.fn(),
	finish: vi.fn(),
	play: vi.fn(),
	pause: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn()
});

// Mock SvelteKit modules for client tests
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

// Mock console.error to prevent error logs during tests
beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
