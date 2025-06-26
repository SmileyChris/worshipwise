import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ProfileSettings from './ProfileSettings.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { mockUser, mockChurch } from '../../../../tests/helpers/mock-builders';

// Mock PocketBase client
const mockPbUpdate = vi.fn();
const mockPbAuthWithPassword = vi.fn();
const mockLoadProfile = vi.fn();

vi.mock('$lib/api/client', () => ({
	pb: {
		collection: vi.fn((name: string) => {
			if (name === 'users') {
				return {
					update: mockPbUpdate,
					authWithPassword: mockPbAuthWithPassword
				};
			}
			return {};
		}),
		authStore: {
			update: vi.fn(),
			onChange: vi.fn(),
			model: null,
			token: null
		}
	}
}));

// Mock auth store properly with all required methods
const mockAuthStore = {
	user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
	currentChurch: { id: 'church1', name: 'Test Church' },
	loadProfile: mockLoadProfile,
	getErrorMessage: vi.fn((error: any) => error?.message || 'Unknown error'),
	loading: false,
	error: null
};

describe('ProfileSettings', () => {
	const mockUser: User = {
		id: 'user1',
		email: 'test@example.com',
		name: 'Test User',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		verified: true,
		avatar: '',
		emailVisibility: false
	};

	const mockMembership: ChurchMembership = {
		id: 'membership1',
		church_id: 'church1',
		user_id: 'user1',
		role: 'musician',
		status: 'active',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockPbUpdate.mockClear().mockResolvedValue({ id: 'user1', name: 'Test User', email: 'test@example.com' });
		mockPbAuthWithPassword.mockClear().mockResolvedValue(undefined);
		mockLoadProfile.mockClear().mockResolvedValue(undefined);
	});

	describe('Profile Information Form', () => {
		it('should render profile form with current user data', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: {
					auth: mockAuthStore
				}
			});

			expect(screen.getByRole('heading', { name: 'Profile Information' })).toBeInTheDocument();
			expect(screen.getByTestId('profile-name-input')).toHaveValue(mockUser.name);
			expect(screen.getByTestId('profile-email-input')).toHaveValue(mockUser.email);
			// Role is not editable in ProfileSettings - it's just user data
		});

		it('should validate name field', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');

			// Test too short name (this will trigger validation)
			await fireEvent.input(nameInput, { target: { value: 'A' } });
			await waitFor(() => {
				expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
			});

			// Test valid name
			await fireEvent.input(nameInput, { target: { value: 'John Doe' } });
			await waitFor(() => {
				expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
			});
		});

		it('should validate email field', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const emailInput = screen.getByTestId('profile-email-input');

			// Test invalid email
			await fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
			await waitFor(() => {
				expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
			});

			// Test valid email
			await fireEvent.input(emailInput, { target: { value: 'valid@example.com' } });
			await waitFor(() => {
				expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
			});
		});

		it('should update profile successfully', async () => {
			mockPbUpdate.mockResolvedValue({
				id: 'user1',
				name: 'Updated Name',
				email: 'updated@example.com'
			});

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const emailInput = screen.getByTestId('profile-email-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change form values
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.input(emailInput, { target: { value: 'updated@example.com' } });

			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(mockPbUpdate).toHaveBeenCalledWith('user1', {
					name: 'Updated Name',
					email: 'updated@example.com'
				});
				expect(mockLoadProfile).toHaveBeenCalled();
			});
		});

		it('should update user data when name changes', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change name only
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(mockPbUpdate).toHaveBeenCalledWith('user1', {
					name: 'Updated Name',
					email: mockUser.email // Email remains unchanged
				});
			});
		});

		it('should display success message after successful update', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'New Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
			});
		});

		it('should display error message on failed update', async () => {
			mockPbUpdate.mockRejectedValue(new Error('Update failed'));

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'New Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Update failed')).toBeInTheDocument();
			});
		});
	});

	describe('Password Change Form', () => {
		it('should render password change form', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
			expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
		});

		it('should validate password fields', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');

			// Test short password
			await fireEvent.input(newPasswordInput, { target: { value: 'short' } });
			await waitFor(() => {
				expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			});

			// Test password mismatch
			await fireEvent.input(newPasswordInput, { target: { value: 'validpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'differentpassword' } });
			await waitFor(() => {
				expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
			});
		});

		it('should change password successfully', async () => {
			mockPbAuthWithPassword.mockResolvedValue(undefined);
			mockPbUpdate.mockResolvedValue(undefined);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changeButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'oldpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });

			await fireEvent.click(changeButton);

			await waitFor(() => {
				// First verify current password
				expect(mockPbAuthWithPassword).toHaveBeenCalledWith('test@example.com', 'oldpassword');
				// Then update password
				expect(mockPbUpdate).toHaveBeenCalledWith('user1', {
					password: 'newpassword123',
					passwordConfirm: 'newpassword123'
				});
			});
		});

		it('should display success message after password change', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changeButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'oldpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });

			await fireEvent.click(changeButton);

			await waitFor(() => {
				expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
			});
		});

		it('should clear password fields after successful change', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const currentPasswordInput = screen.getByTestId('current-password-input') as HTMLInputElement;
			const newPasswordInput = screen.getByTestId('new-password-input') as HTMLInputElement;
			const confirmPasswordInput = screen.getByTestId('confirm-password-input') as HTMLInputElement;
			const changeButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'oldpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });

			await fireEvent.click(changeButton);

			await waitFor(() => {
				expect(currentPasswordInput.value).toBe('');
				expect(newPasswordInput.value).toBe('');
				expect(confirmPasswordInput.value).toBe('');
			});
		});

		it('should show loading state while updating', async () => {
			// Create a promise we can control
			let resolveUpdate: () => void;
			const updatePromise = new Promise<void>((resolve) => {
				resolveUpdate = resolve;
			});
			mockPbUpdate.mockReturnValue(updatePromise);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'New Name' } });
			await fireEvent.click(updateButton);

			// Button should be disabled while loading
			expect(updateButton).toBeDisabled();
			expect(updateButton).toHaveTextContent(/updating/i);

			// Resolve the promise
			resolveUpdate!();

			// Wait for button to be enabled again
			await waitFor(() => {
				expect(updateButton).not.toBeDisabled();
				expect(updateButton).toHaveTextContent(/update profile/i);
			});
		});

		it('should handle incorrect current password', async () => {
			mockPbAuthWithPassword.mockRejectedValue({
				response: { status: 400 }
			});

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' }),
				storeOverrides: { auth: mockAuthStore }
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changeButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'wrongpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });

			await fireEvent.click(changeButton);

			await waitFor(() => {
				expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
			});
		});
	});
});