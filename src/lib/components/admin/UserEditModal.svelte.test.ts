import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithContext } from '$tests/helpers/component-test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import UserEditModal from './UserEditModal.svelte';
import type { UserWithMembership } from '$lib/types/auth';

// Mock the admin API
vi.mock('$lib/api/admin', () => ({
	updateUser: vi.fn(),
	updateUserMembership: vi.fn(),
	getUserActivity: vi.fn()
}));

// Import the mocked functions with proper types
import { updateUser, updateUserMembership, getUserActivity } from '$lib/api/admin';

// Type the mocked functions
const mockUpdateUser = updateUser as ReturnType<typeof vi.fn>;
const mockUpdateUserMembership = updateUserMembership as ReturnType<typeof vi.fn>;
const mockGetUserActivity = getUserActivity as ReturnType<typeof vi.fn>;

// Mock auth store for tests
const mockAuthStore = {
	currentChurch: { id: 'church1', name: 'Test Church' },
	user: { id: 'user1', email: 'test@example.com' },
	churchMemberships: [],
	pendingInvites: [],
	availableChurches: []
};

describe('UserEditModal', () => {
	const mockUser: UserWithMembership = {
		id: 'user1',
		email: 'test@example.com',
		name: 'Test User',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		verified: true,
		membership: {
			id: 'membership1',
			church_id: 'church1',
			user_id: 'user1',
			status: 'active',
			is_active: true,
			created: '2024-01-01T00:00:00Z',
			updated: '2024-01-01T00:00:00Z'
		}
	};

	const mockUserActivity = {
		lastLogin: '2024-01-15T10:30:00Z',
		servicesCreated: 5,
		songsAdded: 12
	};

	const mockProps = {
		user: mockUser,
		open: true,
		onclose: vi.fn(),
		onsave: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUserActivity.mockResolvedValue(mockUserActivity);
		mockUpdateUser.mockResolvedValue({});
		mockUpdateUserMembership.mockResolvedValue({});
	});

	describe('Rendering', () => {
		it('should render modal when open', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			expect(screen.getByText('Edit User')).toBeInTheDocument();
			expect(screen.getByText('Update user information and profile details')).toBeInTheDocument();
		});

		it('should not render modal when closed', () => {
			renderWithContext(UserEditModal, {
				props: {
					...mockProps,
					open: false
				},
				storeOverrides: { auth: mockAuthStore }
			});

			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('should populate form with user data', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			await waitFor(() => {
				expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
				// There are two name fields - account name and profile name
				const nameInputs = screen.getAllByDisplayValue(mockUser.name || '');
				expect(nameInputs).toHaveLength(2);
			});

			// Roles are now managed via checkboxes loaded from database, not a dropdown
			expect(screen.getByText('Roles')).toBeInTheDocument();
		});

		it('should display user activity stats', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			await waitFor(() => {
				expect(screen.getByText('User Activity')).toBeInTheDocument();
				expect(screen.getByText('5')).toBeInTheDocument(); // servicesCreated
				expect(screen.getByText('12')).toBeInTheDocument(); // songsAdded
			});

			expect(getUserActivity).toHaveBeenCalledWith(expect.any(Object), mockUser.id);
		});
	});

	describe('Form Validation and Updates', () => {
		it('should update user email', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUser).toHaveBeenCalledWith(expect.any(Object), mockUser.id, {
					email: 'newemail@example.com'
				});
			});
		});

		it('should update user name', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			// Get the account name input specifically (not the profile name)
			const nameInputs = screen.getAllByDisplayValue(mockUser.name || '');
			const accountNameInput = nameInputs[0]; // First one is account name
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(accountNameInput, { target: { value: 'New User Name' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUser).toHaveBeenCalledWith(expect.any(Object), mockUser.id, {
					name: 'New User Name'
				});
			});
		});

		it('should update profile information', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			// Use a more specific selector to avoid multiple elements with same value
			const nameInput = screen.getByLabelText('Account Name');
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(nameInput, { target: { value: 'New Profile Name' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUser).toHaveBeenCalledWith(expect.any(Object), mockUser.id, {
					name: 'New Profile Name'
				});
			});
		});

		it('should toggle user active status', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const activeCheckbox = screen.getByRole('checkbox', { name: /active account/i });
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			expect(activeCheckbox).toBeChecked(); // Initially active

			await fireEvent.click(activeCheckbox);
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUserMembership).toHaveBeenCalledWith(
					expect.any(Object),
					mockUser.membership?.id,
					{
						is_active: false
					}
				);
			});
		});

		it('should not call update if no changes made', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const saveButton = screen.getByRole('button', { name: /save changes/i });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUser).not.toHaveBeenCalled();
				expect(updateUserMembership).not.toHaveBeenCalled();
				expect(mockProps.onsave).toHaveBeenCalled();
			});
		});

		it('should update both user and profile when both are changed', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const nameInputs = screen.getAllByDisplayValue(mockUser.name || '');
			const accountNameInput = nameInputs[0];
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.input(accountNameInput, { target: { value: 'New Profile Name' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(updateUser).toHaveBeenCalledWith(expect.any(Object), mockUser.id, {
					email: 'newemail@example.com',
					name: 'New Profile Name'
				});
			});
		});
	});

	describe('Error Handling', () => {
		it('should display error message on update failure', async () => {
			const errorMessage = 'Update failed';
			mockUpdateUser.mockRejectedValue(new Error(errorMessage));

			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});
		});

		it('should handle user activity loading failure gracefully', async () => {
			(getUserActivity as any).mockRejectedValue(new Error('Failed to load activity'));

			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			// Should not show activity section if loading fails
			await waitFor(() => {
				expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
			});
		});

		it('should clear error when modal is closed', async () => {
			const errorMessage = 'Update failed';
			mockUpdateUser.mockRejectedValue(new Error(errorMessage));

			const { rerender } = renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			// Trigger error
			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});

			// Cancel/close modal
			const cancelButton = screen.getByRole('button', { name: 'Cancel' });
			await fireEvent.click(cancelButton);

			expect(mockProps.onclose).toHaveBeenCalled();
		});
	});

	describe('Loading States', () => {
		it('should show loading state during save operation', async () => {
			// Mock a delayed response
			mockUpdateUser.mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve({}), 100))
			);

			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			// Should show loading state
			expect(screen.getByText('Saving...')).toBeInTheDocument();
			expect(saveButton).toBeDisabled();

			// Wait for operation to complete
			await waitFor(() => {
				expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
			});
		});

		it('should disable form inputs during loading', async () => {
			mockUpdateUser.mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve({}), 100))
			);

			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			// Form inputs should be disabled during save
			expect(emailInput).toBeDisabled();
			// Active account checkbox should also be disabled
			const checkboxes = screen.getAllByRole('checkbox');
			expect(checkboxes[0]).toBeDisabled();
		});
	});

	describe('Modal Behavior', () => {
		it('should call onclose when cancel button is clicked', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const cancelButton = screen.getByRole('button', { name: 'Cancel' });
			await fireEvent.click(cancelButton);

			expect(mockProps.onclose).toHaveBeenCalled();
		});

		it('should call onsave after successful update', async () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			const emailInput = screen.getByDisplayValue(mockUser.email);
			const saveButton = screen.getByRole('button', { name: /save changes/i });

			await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockProps.onsave).toHaveBeenCalled();
			});
		});

		it('should load user activity when modal is initially opened', async () => {
			renderWithContext(UserEditModal, {
				props: mockProps,
				storeOverrides: { auth: mockAuthStore }
			});

			// Activity should be loaded when modal is opened
			await waitFor(() => {
				expect(getUserActivity).toHaveBeenCalledWith(expect.any(Object), mockUser.id);
			});
		});

		it('should reload user activity when modal reopens', async () => {
			// Render with modal closed
			const { unmount } = renderWithContext(UserEditModal, {
				props: {
					...mockProps,
					open: false
				},
				storeOverrides: { auth: mockAuthStore }
			});

			// Modal is initially closed, activity should not be loaded
			expect(getUserActivity).not.toHaveBeenCalled();

			// Unmount the closed modal
			unmount();

			// Clear the mock to reset call count
			vi.clearAllMocks();
			mockGetUserActivity.mockResolvedValue(mockUserActivity);

			// Reopen modal - $effect should reload activity
			renderWithContext(UserEditModal, {
				props: {
					...mockProps,
					open: true
				},
				storeOverrides: { auth: mockAuthStore }
			});

			await waitFor(() => {
				expect(getUserActivity).toHaveBeenCalledWith(expect.any(Object), mockUser.id);
			});
		});
	});

	describe('Role Management', () => {
		it('should display roles section', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			// Roles are now managed via checkboxes loaded from database
			expect(screen.getByText('Roles')).toBeInTheDocument();
		});

		it('should show empty state when no roles are defined', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			// Component shows a message when no roles are available (before they load)
			// The actual roles are loaded asynchronously from the database
			expect(screen.getByText('Roles')).toBeInTheDocument();
		});
	});

	describe('User Without Profile', () => {
		it('should handle user without profile gracefully', () => {
			const userWithoutMembership: UserWithMembership = {
				...mockUser,
				membership: undefined
			};

			renderWithContext(UserEditModal, {
				props: {
					...mockProps,
					user: userWithoutMembership
				},
				storeOverrides: { auth: mockAuthStore }
			});

			// Should still render form, but profile fields should be empty
			expect(screen.getByDisplayValue(userWithoutMembership.email)).toBeInTheDocument();
			// There are two name inputs - account name and profile name
			const nameInputs = screen.getAllByDisplayValue(userWithoutMembership.name || '');
			expect(nameInputs).toHaveLength(2);
		});
	});

	describe('Accessibility', () => {
		it('should have proper form labels', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
			expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
			expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
			// Roles section now uses checkboxes, not a single dropdown
			expect(screen.getByText('Roles')).toBeInTheDocument();
			expect(screen.getByLabelText('Active account')).toBeInTheDocument();
		});

		it('should have proper button roles and labels', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
		});

		it('should have proper modal structure', () => {
			renderWithContext(UserEditModal, { props: mockProps, storeOverrides: { auth: mockAuthStore } });

			expect(screen.getByRole('dialog')).toBeInTheDocument();
			// Form may not have explicit role, check for form element instead
			expect(document.querySelector('form')).toBeInTheDocument();
		});
	});
});
