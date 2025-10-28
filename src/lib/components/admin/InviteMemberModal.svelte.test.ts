import { renderWithContext } from '$tests/helpers/component-test-utils';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InviteMemberModal from './InviteMemberModal.svelte';

// Mock auth store for tests
const mockAuthStore = {
	currentChurch: { id: 'church1', name: 'Test Church' },
	user: { id: 'user1', email: 'test@example.com' },
	churchMemberships: [],
	pendingInvites: [],
	availableChurches: []
};

// Mock the pb client
vi.mock('$lib/api/client', async () => {
	const { MockPocketBase } = await import('$tests/helpers/pb-mock');
	return {
		pb: new MockPocketBase()
	};
});

// Mock the API
const mockChurchesAPI = {
	inviteUser: vi.fn()
};

vi.mock('$lib/api/churches', () => {
	return {
		createChurchesAPI: vi.fn(() => mockChurchesAPI)
	};
});

describe('InviteMemberModal', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		(mockChurchesAPI.inviteUser as any).mockReset();
	});

	it('should render invite form when open', () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		expect(screen.getByText('Invite New Member')).toBeInTheDocument();
		expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
		expect(screen.getByLabelText('Role')).toBeInTheDocument();
	});

	it('should not render when closed', () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: false,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		expect(screen.queryByText('Invite New Member')).not.toBeInTheDocument();
	});

	it('should validate email format', async () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address');
		const submitButton = screen.getByText('Send Invitation');

		// Button should be disabled initially
		expect(submitButton).toBeDisabled();

		// Enter valid email with multiple event types to ensure reactivity
		await fireEvent.input(emailInput, { target: { value: 'valid@example.com' } });
		await fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
		await flushSync();

		// Small delay to allow derived state to update
		await new Promise((resolve) => setTimeout(resolve, 100));

		// The button should now be enabled
		expect(submitButton).not.toBeDisabled();
	});

	it('should disable submit button when email is invalid', async () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const submitButton = screen.getByText('Send Invitation');
		const emailInput = screen.getByLabelText('Email Address');

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
		(mockChurchesAPI.inviteUser as any).mockResolvedValue(undefined);

		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose,
				onsuccess
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address');
		const roleSelect = screen.getByLabelText('Role');
		const submitButton = screen.getByText('Send Invitation');

		// Fill form
		await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'leader' } });
		await flushSync();

		// Wait for button to become enabled
		expect(submitButton).not.toBeDisabled();

		// Submit form
		await fireEvent.click(submitButton);

		// Check API was called with correct data
		expect(mockChurchesAPI.inviteUser).toHaveBeenCalledWith('church1', {
			email: 'newuser@example.com',
			role: 'leader',
			permissions: [
				'songs:create',
				'songs:edit',
				'services:create',
				'services:edit',
				'services:delete',
				'users:invite'
			]
		});

		// Wait for success state
		await waitFor(() => {
			expect(screen.getByText('Invitation Sent!')).toBeInTheDocument();
		});
	});

	it('should display correct permissions for each role', async () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const roleSelect = screen.getByLabelText('Role');

		// Check musician permissions
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		expect(
			screen.getByText(/Can view songs, services, and participate in worship teams/)
		).toBeInTheDocument();

		// Check admin permissions
		await fireEvent.change(roleSelect, { target: { value: 'admin' } });
		expect(screen.getByText(/Full access to all church features and settings/)).toBeInTheDocument();
	});

	it('should handle API errors', async () => {
		const errorMessage = 'Failed to send invitation';
		(mockChurchesAPI.inviteUser as any).mockRejectedValue(new Error(errorMessage));

		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address');
		const submitButton = screen.getByText('Send Invitation');

		await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

		// Wait a bit for reactive updates
		await new Promise((resolve) => setTimeout(resolve, 50));

		await fireEvent.click(submitButton);

		expect(screen.queryByText(errorMessage)).toBeInTheDocument();

		// Should not show success state
		expect(screen.queryByText('Invitation Sent!')).not.toBeInTheDocument();
	});

	it('should reset form when modal opens', async () => {
		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
		const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement;

		// Form should be reset (default values)
		expect(emailInput.value).toBe('');
		expect(roleSelect.value).toBe('musician'); // Default role
	});

	it('should show loading state while sending', async () => {
		// Create a promise we can control
		let resolveInvite: () => void;
		const invitePromise = new Promise<void>((resolve) => {
			resolveInvite = resolve;
		});
		(mockChurchesAPI.inviteUser as any).mockReturnValue(invitePromise);

		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address');
		const submitButton = screen.getByText('Send Invitation');

		await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

		// Wait a bit for reactive updates
		await new Promise((resolve) => setTimeout(resolve, 50));

		await fireEvent.click(submitButton);

		// Button should now show loading state
		expect(screen.getByText('Sending...')).toBeInTheDocument();

		// Resolve the promise
		resolveInvite!();

		// Wait for success state
		await waitFor(() => {
			expect(screen.getByText('Invitation Sent!')).toBeInTheDocument();
		});
	});

	it('should assign correct permissions based on role', async () => {
		(mockChurchesAPI.inviteUser as any).mockResolvedValue(undefined);

		renderWithContext(InviteMemberModal, {
			props: {
				open: true,
				onclose: vi.fn()
			},
			storeOverrides: {
				auth: mockAuthStore
			}
		});

		const emailInput = screen.getByLabelText('Email Address');
		const roleSelect = screen.getByLabelText('Role');
		const submitButton = screen.getByText('Send Invitation');

		// Test musician role
		await fireEvent.input(emailInput, { target: { value: 'musician@example.com' } });
		await fireEvent.change(roleSelect, { target: { value: 'musician' } });
		expect(submitButton).not.toBeDisabled();

		await fireEvent.click(submitButton);

		expect(mockChurchesAPI.inviteUser).toHaveBeenCalledWith(
			'church1',
			expect.objectContaining({
				role: 'musician',
				permissions: ['songs:view', 'services:view']
			})
		);
	});
});
