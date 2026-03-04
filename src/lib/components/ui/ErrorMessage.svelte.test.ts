import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ErrorMessage from './ErrorMessage.svelte';

describe('ErrorMessage Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render with message and default title', () => {
		render(ErrorMessage, { message: 'Something went wrong' });

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText('Error')).toBeInTheDocument();
		expect(screen.getByText('Something went wrong')).toBeInTheDocument();
	});

	it('should render with custom title', () => {
		render(ErrorMessage, { message: 'Failed to load', title: 'Load Error' });

		expect(screen.getByText('Load Error')).toBeInTheDocument();
		expect(screen.getByText('Failed to load')).toBeInTheDocument();
	});

	it('should not show retry button by default', () => {
		render(ErrorMessage, { message: 'Error occurred' });

		expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
	});

	it('should show retry button when retryButton is true and onRetry provided', () => {
		const mockRetry = vi.fn();
		render(ErrorMessage, { message: 'Error', retryButton: true, onRetry: mockRetry });

		expect(screen.getByText('Try Again')).toBeInTheDocument();
	});

	it('should call onRetry when retry button is clicked', async () => {
		const user = userEvent.setup();
		const mockRetry = vi.fn();
		render(ErrorMessage, { message: 'Error', retryButton: true, onRetry: mockRetry });

		await user.click(screen.getByText('Try Again'));

		expect(mockRetry).toHaveBeenCalledOnce();
	});

	it('should apply custom class', () => {
		render(ErrorMessage, { message: 'Error', class: 'mt-4' });

		const alert = screen.getByRole('alert');
		expect(alert.className).toContain('mt-4');
	});
});
