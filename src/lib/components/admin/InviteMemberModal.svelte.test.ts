import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import InviteMemberModal from './InviteMemberModal.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { mockChurch } from '../../../../tests/helpers/mock-builders';
import { ChurchesAPI } from '$lib/api/churches';

// Mock the API
vi.mock('$lib/api/churches', () => ({
	ChurchesAPI: {
		inviteUser: vi.fn()
	}
}));

describe('InviteMemberModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(ChurchesAPI.inviteUser as any).mockReset();
	});

	it('should render invite form when open', () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		expect(getByText('Invite New Member')).toBeInTheDocument();
		expect(getByLabelText('Email Address')).toBeInTheDocument();
		expect(getByLabelText('Role')).toBeInTheDocument();
		expect(getByText('Send Invitation')).toBeInTheDocument();
	});

	it('should not render when closed', () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { container } = renderWithContext(InviteMemberModal, {
			props: {
				open: false,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		expect(container.textContent).toBe('');
	});

	it('should validate email format', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');

		// Invalid email - button should be disabled
		await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
		await flushSync();
		expect(submitButton).toBeDisabled();

		// Valid email - button should be enabled
		await fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
		await flushSync();
		expect(submitButton).not.toBeDisabled();
	});

	it('should disable submit button when email is invalid', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const submitButton = getByText('Send Invitation');
		const emailInput = getByLabelText('Email Address');

		// Invalid emails should disable the button
		const invalidEmails = ['invalid', 'test@', '@domain.com', 'test.domain.com'];

		for (const email of invalidEmails) {
			await fireEvent.input(emailInput, { target: { value: email } });
			await flushSync();
			expect(submitButton).toBeDisabled();
		}
	});

	it('should send invitation with correct data', async () => {
		const onclose = vi.fn();
		const onsuccess = vi.fn();
		(ChurchesAPI.inviteUser as any).mockResolvedValue(undefined);

		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose,
				onsuccess
			},
			currentChurch: testChurch
		});

		const emailInput = getByLabelText('Email Address');
		const roleSelect = getByLabelText('Role');
		const submitButton = getByText('Send Invitation');

		// Fill out form
		await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		await fireEvent.click(submitButton);

		// Should call API with correct data
		await waitFor(() => {
			expect(ChurchesAPI.inviteUser).toHaveBeenCalledWith({
				email: 'test@example.com',
				role: 'musician',
				churchId: 'church1'
			});
		});

		// Should call callbacks after delay
		await waitFor(() => {
			expect(onclose).toHaveBeenCalled();
			expect(onsuccess).toHaveBeenCalled();
		}, { timeout: 3000 });
	});

	it('should display correct permissions for each role', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const roleSelect = getByLabelText('Role');

		// Check musician permissions
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		expect(getByText(/View songs and participate in services/)).toBeInTheDocument();

		// Check admin permissions
		await fireEvent.change(roleSelect, { target: { value: 'admin' } });
		expect(getByText(/Full access to all church features and settings/)).toBeInTheDocument();
	});

	it('should handle API errors', async () => {
		const errorMessage = 'Failed to send invitation';
		(ChurchesAPI.inviteUser as any).mockRejectedValue(new Error(errorMessage));

		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText, queryByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');

		// Submit with valid data
		await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(queryByText(errorMessage)).toBeInTheDocument();
		});

		// Should not show success state
		expect(queryByText('Invitation Sent!')).not.toBeInTheDocument();
	});

	it('should reset form when modal opens', async () => {
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, rerender } = renderWithContext(InviteMemberModal, {
			props: {
				open: false,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		// Open modal
		rerender({
			open: true,
			onclose: vi.fn()
		});

		const emailInput = getByLabelText('Email Address') as HTMLInputElement;
		const roleSelect = getByLabelText('Role') as HTMLSelectElement;

		// Form should be reset
		expect(emailInput.value).toBe('');
		expect(roleSelect.value).toBe('musician'); // Default role
	});

	it('should show loading state while sending', async () => {
		// Create a promise we can control
		let resolveInvite: () => void;
		const invitePromise = new Promise<void>((resolve) => {
			resolveInvite = resolve;
		});
		(ChurchesAPI.inviteUser as any).mockReturnValue(invitePromise);

		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');

		// Submit form
		await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
		await fireEvent.click(submitButton);

		// Should show loading state
		expect(getByText('Sending...')).toBeInTheDocument();

		// Resolve the promise
		resolveInvite!();

		// Should show success state
		await waitFor(() => {
			expect(getByText('Invitation Sent!')).toBeInTheDocument();
		});
	});

	it('should assign correct permissions based on role', async () => {
		(ChurchesAPI.inviteUser as any).mockResolvedValue(undefined);
		
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		const { getByLabelText, getByText } = renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			currentChurch: testChurch
		});

		const emailInput = getByLabelText('Email Address');
		const roleSelect = getByLabelText('Role');
		const submitButton = getByText('Send Invitation');

		// Test different roles
		const roles = ['musician', 'leader', 'admin'];
		
		for (const role of roles) {
			await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
			await fireEvent.change(roleSelect, { target: { value: role } });
			await fireEvent.click(submitButton);

			await waitFor(() => {
				expect(ChurchesAPI.inviteUser).toHaveBeenCalledWith({
					email: 'test@example.com',
					role: role,
					churchId: 'church1'
				});
			});

			// Wait for invitation to complete before next iteration
			await waitFor(() => {
				expect(getByText('Invitation Sent!')).toBeInTheDocument();
			});

			vi.clearAllMocks();
			(ChurchesAPI.inviteUser as any).mockResolvedValue(undefined);
		}
	});
});