import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Modal from './Modal.svelte';

describe('Modal Component - Basic Tests', () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render when open is true', () => {
		render(Modal, { open: true, onclose: mockOnClose });

		const modal = screen.getByRole('dialog');
		expect(modal).toBeInTheDocument();
		expect(modal).toHaveAttribute('aria-modal', 'true');
	});

	it('should not render when open is false', () => {
		render(Modal, { open: false, onclose: mockOnClose });

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('should render title when provided', () => {
		render(Modal, { 
			open: true, 
			title: 'Test Modal',
			onclose: mockOnClose 
		});

		expect(screen.getByText('Test Modal')).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
	});

	it('should render subtitle when provided', () => {
		render(Modal, { 
			open: true, 
			title: 'Test Modal',
			subtitle: 'Test subtitle',
			onclose: mockOnClose 
		});

		expect(screen.getByText('Test subtitle')).toBeInTheDocument();
	});

	it('should show close button by default', () => {
		render(Modal, { open: true, onclose: mockOnClose });

		// Look for the close button (X icon)
		const closeButton = screen.getByRole('button');
		expect(closeButton).toBeInTheDocument();
	});

	it('should hide close button when showCloseButton is false', () => {
		render(Modal, { 
			open: true, 
			showCloseButton: false,
			onclose: mockOnClose 
		});

		// Should not have any buttons
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('should apply correct size classes', () => {
		// Test sm size
		render(Modal, { open: true, size: 'sm' });
		let modalContent = screen.getByRole('dialog').querySelector('.relative');
		expect(modalContent?.className).toContain('max-w-md');
	});

	it('should apply md size class by default', () => {
		// Test default size (md)
		render(Modal, { open: true });
		const modalContent = screen.getByRole('dialog').querySelector('.relative');
		expect(modalContent?.className).toContain('max-w-lg');
	});

	it('should apply lg size class', () => {
		// Test lg size
		render(Modal, { open: true, size: 'lg' });
		const modalContent = screen.getByRole('dialog').querySelector('.relative');
		expect(modalContent?.className).toContain('max-w-2xl');
	});

	it('should apply xl size class', () => {
		// Test xl size
		render(Modal, { open: true, size: 'xl' });
		const modalContent = screen.getByRole('dialog').querySelector('.relative');
		expect(modalContent?.className).toContain('max-w-4xl');
	});

	it('should have backdrop', () => {
		render(Modal, { open: true, onclose: mockOnClose });

		const backdrop = screen.getByRole('dialog').querySelector('.bg-black');
		expect(backdrop).toBeInTheDocument();
		expect(backdrop).toHaveClass('bg-opacity-50');
	});
});