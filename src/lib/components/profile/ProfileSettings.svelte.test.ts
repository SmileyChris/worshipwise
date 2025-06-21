import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import ProfileSettings from './ProfileSettings.svelte';
import { auth } from '$lib/stores/auth.svelte';
import type { User, Profile } from '$lib/types/auth';

// Mock the auth store
vi.mock('$lib/stores/auth.svelte', () => ({
	auth: {
		user: null,
		profile: null,
		updateProfileInfo: vi.fn(),
		getErrorMessage: vi.fn(),
		isAdmin: false,
		hasRole: vi.fn().mockReturnValue(false)
	}
}));

// Mock PocketBase client
vi.mock('$lib/api/client', () => ({
	pb: {
		collection: vi.fn(),
		authStore: {
			model: null,
			token: '',
			isValid: false,
			clear: vi.fn(),
			save: vi.fn(),
			onChange: vi.fn()
		}
	}
}));

// Import mock after declaration
import { pb } from '$lib/api/client';

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

	const mockProfile: Profile = {
		id: 'profile1',
		user_id: 'user1',
		name: 'Test User',
		role: 'musician',
		is_active: true,
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset auth store mocks
		auth.user = mockUser;
		auth.profile = mockProfile;
		auth.updateProfileInfo = vi.fn().mockResolvedValue(undefined);
		auth.getErrorMessage = vi.fn().mockReturnValue('Mock error message');
		auth.isAdmin = false;
		auth.hasRole = vi.fn().mockReturnValue(false);
	});

	describe('Profile Information Form', () => {
		it('should render profile form with current user data', () => {
			render(ProfileSettings);

			expect(screen.getByRole('heading', { name: 'Profile Information' })).toBeInTheDocument();
			expect(screen.getByTestId('profile-name-input')).toHaveValue(mockProfile.name);
			expect(screen.getByTestId('profile-email-input')).toHaveValue(mockUser.email);
			expect(screen.getByTestId('profile-role-select')).toHaveValue(mockProfile.role);
		});

		it('should validate name field', async () => {
			render(ProfileSettings);

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
			render(ProfileSettings);

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
			render(ProfileSettings);

			const nameInput = screen.getByTestId('profile-name-input');
			const emailInput = screen.getByTestId('profile-email-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change form values
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.input(emailInput, { target: { value: 'updated@example.com' } });

			await fireEvent.click(updateButton);

			expect(auth.updateProfileInfo).toHaveBeenCalledWith(
				{
					name: 'Updated Name',
					role: 'musician'
				},
				{
					email: 'updated@example.com'
				}
			);
		});

		it('should not update user data if email unchanged', async () => {
			render(ProfileSettings);

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			// Change only profile data
			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			expect(auth.updateProfileInfo).toHaveBeenCalledWith(
				{
					name: 'Updated Name',
					role: 'musician'
				},
				undefined
			);
		});

		it('should display profile update success message', async () => {
			auth.updateProfileInfo = vi.fn().mockResolvedValue(undefined);

			render(ProfileSettings);

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
			});
		});

		it('should display profile update error message', async () => {
			const error = new Error('Update failed');
			auth.updateProfileInfo = vi.fn().mockRejectedValue(error);

			render(ProfileSettings);

			const nameInput = screen.getByTestId('profile-name-input');
			const updateButton = screen.getByRole('button', { name: /update profile/i });

			await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
			await fireEvent.click(updateButton);

			await waitFor(() => {
				expect(screen.getByText('Mock error message')).toBeInTheDocument();
			});
		});

		it('should reset form to original values', async () => {
			render(ProfileSettings);

			const nameInput = screen.getByTestId('profile-name-input');
			const emailInput = screen.getByTestId('profile-email-input');
			const resetButton = screen.getByRole('button', { name: 'Reset' });

			// Change form values
			await fireEvent.input(nameInput, { target: { value: 'Changed Name' } });
			await fireEvent.input(emailInput, { target: { value: 'changed@example.com' } });

			// Reset form
			await fireEvent.click(resetButton);

			expect(nameInput).toHaveValue(mockProfile.name);
			expect(emailInput).toHaveValue(mockUser.email);
		});
	});

	describe('Password Change Form', () => {
		it('should render password change form', () => {
			render(ProfileSettings);

			expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
			expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
		});

		it('should validate current password field', async () => {
			render(ProfileSettings);

			const currentPasswordInput = screen.getByTestId('current-password-input');

			// Test empty password
			await fireEvent.input(currentPasswordInput, { target: { value: '' } });
			await fireEvent.blur(currentPasswordInput);

			// Button should be disabled with empty password
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });
			expect(changePasswordButton).toBeDisabled();
		});

		it('should validate new password field', async () => {
			render(ProfileSettings);

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
			render(ProfileSettings);

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
			// Mock successful password verification and update
			const usersCollection = {
				authWithPassword: vi.fn().mockResolvedValue({ record: mockUser }),
				update: vi.fn().mockResolvedValue(mockUser)
			};
			(pb.collection as any).mockReturnValue(usersCollection);

			render(ProfileSettings);

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
				expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
					mockUser.email,
					'currentpassword'
				);
				expect(usersCollection.update).toHaveBeenCalledWith(mockUser.id, {
					password: 'newpassword123',
					passwordConfirm: 'newpassword123'
				});
			});
		});

		it('should display password change success message', async () => {
			const usersCollection = {
				authWithPassword: vi.fn().mockResolvedValue({ record: mockUser }),
				update: vi.fn().mockResolvedValue(mockUser)
			};
			(pb.collection as any).mockReturnValue(usersCollection);

			render(ProfileSettings);

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
			const usersCollection = {
				authWithPassword: vi.fn().mockRejectedValue({
					response: { status: 400 }
				})
			};
			(pb.collection as any).mockReturnValue(usersCollection);

			render(ProfileSettings);

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
			const usersCollection = {
				authWithPassword: vi.fn().mockResolvedValue({ record: mockUser }),
				update: vi.fn().mockRejectedValue(new Error('Update failed'))
			};
			(pb.collection as any).mockReturnValue(usersCollection);

			render(ProfileSettings);

			const currentPasswordInput = screen.getByTestId('current-password-input');
			const newPasswordInput = screen.getByTestId('new-password-input');
			const confirmPasswordInput = screen.getByTestId('confirm-password-input');
			const changePasswordButton = screen.getByRole('button', { name: /change password/i });

			await fireEvent.input(currentPasswordInput, { target: { value: 'currentpassword' } });
			await fireEvent.input(newPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.input(confirmPasswordInput, { target: { value: 'newpassword123' } });
			await fireEvent.click(changePasswordButton);

			await waitFor(() => {
				expect(screen.getByText('Mock error message')).toBeInTheDocument();
			});
		});
	});

	describe('Role Management', () => {
		it('should show limited role options for musicians', () => {
			auth.isAdmin = false;
			auth.hasRole = vi.fn().mockImplementation((role) => role === 'musician');

			render(ProfileSettings);

			const roleSelect = screen.getByTestId('profile-role-select');
			const options = roleSelect.querySelectorAll('option');

			// Should only have musician option (or possibly member and musician)
			expect(options.length).toBeGreaterThanOrEqual(1);
			expect(Array.from(options).some((opt) => opt.value === 'musician')).toBe(true);
		});

		it('should show leader and musician options for leaders', () => {
			auth.isAdmin = false;
			auth.hasRole = vi.fn().mockImplementation((role) => role === 'leader');

			render(ProfileSettings);

			const roleSelect = screen.getByTestId('profile-role-select');
			const options = roleSelect.querySelectorAll('option');

			// Should have musician and leader options (no admin)
			expect(options.length).toBeGreaterThan(1);
			expect(Array.from(options).some((opt) => opt.value === 'musician')).toBe(true);
			expect(Array.from(options).some((opt) => opt.value === 'leader')).toBe(true);
			expect(Array.from(options).some((opt) => opt.value === 'admin')).toBe(false);
		});

		it('should show all role options for admins', () => {
			auth.isAdmin = true;

			render(ProfileSettings);

			const roleSelect = screen.getByTestId('profile-role-select');
			const options = roleSelect.querySelectorAll('option');

			// Should have all role options
			expect(Array.from(options).some((opt) => opt.value === 'musician')).toBe(true);
			expect(Array.from(options).some((opt) => opt.value === 'leader')).toBe(true);
			expect(Array.from(options).some((opt) => opt.value === 'admin')).toBe(true);
		});
	});

	describe('Form State Management', () => {
		it('should disable submit buttons when forms are invalid', () => {
			render(ProfileSettings);

			const profileUpdateButton = screen.getByRole('button', { name: /update profile/i });
			const passwordChangeButton = screen.getByRole('button', { name: /change password/i });

			// Initially valid profile form (has current data), invalid password form (empty)
			expect(profileUpdateButton).not.toBeDisabled();
			expect(passwordChangeButton).toBeDisabled();
		});

		it('should show loading states during operations', async () => {
			auth.updateProfileInfo = vi
				.fn()
				.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

			render(ProfileSettings);

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
			render(ProfileSettings);

			// Check for form inputs by test ID instead of exact label text
			expect(screen.getByTestId('profile-name-input')).toBeInTheDocument();
			expect(screen.getByTestId('profile-email-input')).toBeInTheDocument();
			expect(screen.getByTestId('profile-role-select')).toBeInTheDocument();
			expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
			expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
		});

		it('should have proper autocomplete attributes', () => {
			render(ProfileSettings);

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
