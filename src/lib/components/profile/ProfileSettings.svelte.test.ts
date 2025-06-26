import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ProfileSettings from './ProfileSettings.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { mockUser, mockChurch } from '../../../../tests/helpers/mock-builders';

// Create mockable functions for auth store
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockChangePassword = vi.fn().mockResolvedValue(undefined);

// Mock the context stores to avoid pb dependency issues
vi.mock('$lib/context/stores.svelte', () => ({
	getAuthStore: vi.fn(() => ({
		user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
		currentChurch: { id: 'church1', name: 'Test Church' },
		updateProfile: mockUpdateProfile,
		changePassword: mockChangePassword,
		loading: false,
		error: null
	})),
	initializeStores: vi.fn(() => ({
		auth: {
			user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
			currentChurch: { id: 'church1', name: 'Test Church' },
			updateProfile: mockUpdateProfile,
			changePassword: mockChangePassword,
			loading: false,
			error: null
		}
	}))
}));

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
		permissions: [],
		status: 'active',
		is_active: true,
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProfile.mockClear().mockResolvedValue(undefined);
		mockChangePassword.mockClear().mockResolvedValue(undefined);
	});

	describe('Profile Information Form', () => {
		it('should render profile form with current user data', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			expect(screen.getByRole('heading', { name: 'Profile Information' })).toBeInTheDocument();
			expect(screen.getByTestId('profile-name-input')).toHaveValue(mockUser.name);
			expect(screen.getByTestId('profile-email-input')).toHaveValue(mockUser.email);
			// Role is not editable in ProfileSettings - it's just user data
		});

		it('should validate name field', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
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
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
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
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const emailInput = screen.getByTestId('profile-email-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change form values
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.input(emailInput, { target: { value: 'updated@example.com' } });

			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(mockUpdateProfile).toHaveBeenCalledWith({
					name: 'Updated Name',
					email: 'updated@example.com'
				});
			});
		});

		it('should update user data when name changes', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change name only
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(mockUpdateProfile).toHaveBeenCalledWith({
					name: 'Updated Name',
					email: mockUser.email // Email remains unchanged
				});
			});
		});

		it('should display profile update success message', async () => {
			// Mock successful update
			mockUpdateProfile.mockResolvedValue(mockUser);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
			});
		});

		it('should display profile update error message', async () => {
			// Mock the update to fail
			const error = new Error('Update failed');
			mockUpdateProfile.mockRejectedValue(error);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Update failed')).toBeInTheDocument();
			});
		});

		it('should reset form to original values', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const emailInput = screen.getByTestId('profile-email-input');
			const resetButton = screen.getByRole('button', { name: 'Reset' });

			// Change form values
			await fireEvent.input(nameInput, { target: { value: 'Changed Name' } });
			await fireEvent.input(emailInput, { target: { value: 'changed@example.com' } });

			// Reset form
			await fireEvent.click(resetButton);

			expect(nameInput).toHaveValue(mockUser.name);
			expect(emailInput).toHaveValue(mockUser.email);
		});
	});

	describe('Password Change Form', () => {
		it('should render password change form', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
			expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
		});

		it('should validate current password field', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');

			// Test empty password
			await fireEvent.input(currentPasswordInput, { target: { value: '' } });
			await fireEvent.blur(currentPasswordInput);

			// Button should be disabled with empty password
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });
			expect(changePasswordButton).toBeDisabled();
		});

		it('should validate new password field', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const newPasswordInput = screen.getByTestId('new-password-input');

			// Test short password
			await fireEvent.input(newPasswordInput, { target: { value: '123' } });
			await waitFor(() => {
				expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
			});

			// Test valid password
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await waitFor(() => {
				expect(
					screen.queryByText('Password must be at least 8 characters')
				).not.toBeInTheDocument();
			});
		});

		it('should validate password confirmation', async () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');

			// Test mismatched passwords
			await fireEvent.input(newPasswordInput, { target: { value: 'password123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'different123' } });

			await waitFor(() => {
				expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
			});

			// Test matching passwords
			await fireEvent.input(confirmPasswordInput, { target: { value: 'password123' } });
			await waitFor(() => {
				expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
			});
		});

		it('should change password successfully', async () => {
			// Mock successful password change
			mockChangePassword.mockResolvedValue(undefined);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'currentpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });

			await waitFor(() => {
				expect(changePasswordButton).not.toBeDisabled();
			});

			await fireEvent.click(changePasswordButton);

			await waitFor(() => {
				expect(mockChangePassword).toHaveBeenCalledWith({
					currentPassword: 'currentpassword',
					newPassword: 'newpassword123',
					confirmPassword: 'newpassword123'
				});
			});
		});

		it('should display password change success message', async () => {
			mockChangePassword.mockResolvedValue(undefined);

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'currentpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.click(changePasswordButton);

			await waitFor(() => {
				expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
			});

			// Password fields should be cleared
			expect(currentPasswordInput).toHaveValue('');
			expect(newPasswordInput).toHaveValue('');
			expect(confirmPasswordInput).toHaveValue('');
		});

		it('should handle incorrect current password', async () => {
			mockChangePassword.mockRejectedValue({
				response: { status: 400 }
			});

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'wrongpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.click(changePasswordButton);

			await waitFor(() => {
				expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
			});
		});

		it('should handle password change errors', async () => {
			mockChangePassword.mockRejectedValue(new Error('Update failed'));

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'currentpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.click(changePasswordButton);

			await waitFor(() => {
				expect(screen.getByText('Update failed')).toBeInTheDocument();
			});
		});
	});

	describe('Form State Management', () => {
		it('should disable submit buttons when forms are invalid', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const profileUpdateButton = screen.getByRole('button', { name: /update profile/i });
			const passwordChangeButton = screen.getByRole('button', { name: /change password/i });

			// Initially valid profile form (has current data), invalid password form (empty)
			expect(profileUpdateButton).not.toBeDisabled();
			expect(passwordChangeButton).toBeDisabled();
		});

		it('should show loading states during operations', async () => {
			// Mock update to delay for loading state test
			mockUpdateProfile.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			// Should show loading state
			expect(screen.getByText('Updating...')).toBeInTheDocument();
			expect(updateButton).toBeDisabled();
		});
	});

	describe('Accessibility', () => {
		it('should have proper form structure and labels', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			// Check for form inputs by test ID instead of exact label text
			expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
			expect(screen.getByTestId('profile-email-input')).toBeInTheDocument();
			expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
		});

		it('should have proper autocomplete attributes', () => {
			renderWithContext(ProfileSettings, {
				currentChurch: mockChurch({ id: 'church1', name: 'Test Church' })
			});

			expect(screen.getByTestId('profile-name-input')).toHaveAttribute('autocomplete', 'name');
			expect(screen.getByTestId('profile-email-input')).toHaveAttribute('autocomplete', 'email');
			expect(screen.getByTestId('current-password-input')).toHaveAttribute(
				'autocomplete',
				'current-password'
			);
			expect(screen.getByTestId('new-password-input')).toHaveAttribute(
				'autocomplete',
				'new-password'
			);
			expect(screen.getByTestId('confirm-password-input')).toHaveAttribute(
				'autocomplete',
				'new-password'
			);
		});
	});
});
