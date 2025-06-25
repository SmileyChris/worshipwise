import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ChurchSwitcher from './ChurchSwitcher.svelte';

vi.mock('$lib/stores/auth.svelte', () => ({
	auth: {
		user: { id: 'user1', email: 'test@example.com' },
		currentChurch: { id: 'church1', name: 'Test Church' },
		availableChurches: [{ id: 'church1', name: 'Test Church' }],
		churchMemberships: [],
		switchChurch: vi.fn(),
		leaveChurch: vi.fn(),
		error: null
	}
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((fn) => {
			fn({ url: { pathname: '/dashboard' } });
			return vi.fn();
		})
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('ChurchSwitcher - Basic Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render when user has a church', () => {
		render(ChurchSwitcher);

		expect(screen.getByRole('button')).toBeInTheDocument();
		expect(screen.getByText('Test Church')).toBeInTheDocument();
	});

	it('should have proper aria attributes', () => {
		render(ChurchSwitcher);

		const button = screen.getByRole('button');
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(button).toHaveAttribute('aria-haspopup', 'true');
	});

	it('should show church icon', () => {
		render(ChurchSwitcher);

		// Check for the Church icon SVG
		const svg = screen.getByRole('button').querySelector('svg');
		expect(svg).toBeInTheDocument();
	});
});
