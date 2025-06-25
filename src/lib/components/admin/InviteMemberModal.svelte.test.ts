import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import InviteMemberModal from './InviteMemberModal.svelte';
import { auth } from '$lib/stores/auth.svelte';
import { ChurchesAPI } from '$lib/api/churches';

// Mock the API
vi.mock('$lib/api/churches', () => ({
	ChurchesAPI: {
		inviteUser: vi.fn()
	}
}));

// Mock auth store
vi.mock('$lib/stores/auth.svelte', () => ({
	auth: {
		currentChurch: { id: 'church1', name: 'Test Church' }
	}
}));

describe('InviteMemberModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(ChurchesAPI.inviteUser as any).mockReset();
	});

	it('should render invite form when open', () => {
		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		expect(getByText('Invite New Member')).toBeInTheDocument();
		expect(getByLabelText('Email Address')).toBeInTheDocument();
		expect(getByLabelText('Role')).toBeInTheDocument();
		expect(getByText('Send Invitation')).toBeInTheDocument();
	});

	it('should not render when closed', () => {
		const { container } = render(InviteMemberModal, {
			props: {
				open: false,
				onclose: vi.fn()
			}
		});

		expect(container.textContent).toBe('');
	});

	it('should validate email format', async () => {
		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');
		
		// Initially, submit button should be disabled
		expect(submitButton).toBeDisabled();
		
		// Invalid email - button should remain disabled
		await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
		await flushSync();
		expect(submitButton).toBeDisabled();

		// Valid email - button should be enabled
		await fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
		await flushSync();
		expect(submitButton).not.toBeDisabled();
	});

	it('should disable submit button when email is invalid', async () => {
		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const submitButton = getByText('Send Invitation');
		const emailInput = getByLabelText('Email Address');

		// Initially disabled (no email)
		expect(submitButton).toBeDisabled();

		// Still disabled with invalid email
		await fireEvent.input(emailInput, { target: { value: 'invalid' } });
		await flushSync();
		await waitFor(() => {
			expect(submitButton).toBeDisabled();
		});

		// Enabled with valid email
		await fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
		await flushSync();
		await waitFor(() => {
			expect(submitButton).not.toBeDisabled();
		});
	});

	it('should send invitation with correct data', async () => {
		const onclose = vi.fn();
		const onsuccess = vi.fn();
		(ChurchesAPI.inviteUser as any).mockResolvedValue(undefined);

		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose,
				onsuccess
			}
		});

		const emailInput = getByLabelText('Email Address');
		const roleSelect = getByLabelText('Role');
		const submitButton = getByText('Send Invitation');

		await fireEvent.input(emailInput, { target: { value: 'newuser@test.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'leader' } });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(ChurchesAPI.inviteUser).toHaveBeenCalledWith('church1', {
				email: 'newuser@test.com',
				role: 'leader',
				permissions: expect.arrayContaining([
					'songs:create',
					'songs:edit',
					'services:create',
					'services:edit',
					'services:delete',
					'users:invite'
				])
			});
		});

		// Should show success state
		await waitFor(() => {
			expect(getByText('Invitation Sent!')).toBeInTheDocument();
		});

		// Should call callbacks after delay
		await waitFor(() => {
			expect(onclose).toHaveBeenCalled();
			expect(onsuccess).toHaveBeenCalled();
		}, { timeout: 3000 });
	});

	it('should display correct permissions for each role', async () => {
		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const roleSelect = getByLabelText('Role');

		// Check musician permissions
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		expect(getByText(/Can view songs, services, and participate in worship teams/)).toBeInTheDocument();

		// Check leader permissions
		await fireEvent.change(roleSelect, { target: { value: 'leader' } });
		expect(getByText(/Can manage songs, create services, and lead worship teams/)).toBeInTheDocument();

		// Check admin permissions
		await fireEvent.change(roleSelect, { target: { value: 'admin' } });
		expect(getByText(/Full access to all church features and settings/)).toBeInTheDocument();
	});

	it('should handle API errors', async () => {
		const errorMessage = 'Failed to send invitation';
		(ChurchesAPI.inviteUser as any).mockRejectedValue(new Error(errorMessage));

		const { getByLabelText, getByText, queryByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');

		await fireEvent.input(emailInput, { target: { value: 'test@email.com' } });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(queryByText(errorMessage)).toBeInTheDocument();
		});

		// Should not show success state
		expect(queryByText('Invitation Sent!')).not.toBeInTheDocument();
	});

	it('should reset form when modal opens', async () => {
		const { getByLabelText, rerender } = render(InviteMemberModal, {
			props: {
				open: false,
				onclose: vi.fn()
			}
		});

		// Open modal
		rerender({
			open: true,
			onclose: vi.fn()
		});

		await waitFor(() => {
			const emailInput = getByLabelText('Email Address') as HTMLInputElement;
			const roleSelect = getByLabelText('Role') as HTMLSelectElement;
			
			expect(emailInput.value).toBe('');
			expect(roleSelect.value).toBe('musician');
		});
	});

	it('should show loading state while sending', async () => {
		// Create a promise we can control
		let resolveInvite: () => void;
		const invitePromise = new Promise<void>((resolve) => {
			resolveInvite = resolve;
		});
		(ChurchesAPI.inviteUser as any).mockReturnValue(invitePromise);

		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const emailInput = getByLabelText('Email Address');
		const submitButton = getByText('Send Invitation');

		await fireEvent.input(emailInput, { target: { value: 'test@email.com' } });
		await fireEvent.click(submitButton);

		// Should show loading state
		expect(getByText('Sending...')).toBeInTheDocument();
		expect(submitButton).toBeDisabled();

		// Resolve the promise
		resolveInvite!();
		
		await waitFor(() => {
			expect(getByText('Invitation Sent!')).toBeInTheDocument();
		});
	});

	it('should assign correct permissions based on role', async () => {
		(ChurchesAPI.inviteUser as any).mockResolvedValue(undefined);
		
		const { getByLabelText, getByText } = render(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			}
		});

		const emailInput = getByLabelText('Email Address');
		const roleSelect = getByLabelText('Role');
		const submitButton = getByText('Send Invitation');

		// Test musician permissions
		await fireEvent.input(emailInput, { target: { value: 'musician@test.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(ChurchesAPI.inviteUser).toHaveBeenLastCalledWith('church1', {
				email: 'musician@test.com',
				role: 'musician',
				permissions: ['songs:view', 'services:view']
			});
		});

		// Test admin permissions
		await fireEvent.input(emailInput, { target: { value: 'admin@test.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'admin' } });
		await fireEvent.click(submitButton);

		await waitFor(() => {
			expect(ChurchesAPI.inviteUser).toHaveBeenLastCalledWith('church1', {
				email: 'admin@test.com',
				role: 'admin',
				permissions: expect.arrayContaining([
					'songs:create', 'songs:edit', 'songs:delete',
					'services:create', 'services:edit', 'services:delete',
					'users:invite', 'users:manage', 'users:remove',
					'church:settings', 'church:billing'
				])
			});
		});
	});
});