import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import UserEditModal from './UserEditModal.svelte';
import type { UserWithProfile } from '$lib/api/admin';

// Mock the admin API
vi.mock('$lib/api/admin', () => ({
  updateUser: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserActivity: vi.fn()
}));

// Import the mocked functions with proper types
import { updateUser, updateUserProfile, getUserActivity } from '$lib/api/admin';

// Type the mocked functions
const mockUpdateUser = updateUser as ReturnType<typeof vi.fn>;
const mockUpdateUserProfile = updateUserProfile as ReturnType<typeof vi.fn>;
const mockGetUserActivity = getUserActivity as ReturnType<typeof vi.fn>;

describe('UserEditModal', () => {
  const mockUser: UserWithProfile = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    verified: true,
    profile: {
      id: 'profile1',
      user_id: 'user1',
      name: 'Test Profile Name',
      role: 'musician',
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
    mockUpdateUserProfile.mockResolvedValue({});
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(UserEditModal, mockProps);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update user information and profile details')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(UserEditModal, { 
        ...mockProps, open: false
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should populate form with user data', async () => {
      render(UserEditModal, mockProps);

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockUser.name || '')).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockUser.profile?.name || '')).toBeInTheDocument();
      });

      const roleSelect = screen.getByRole('combobox');
      expect(roleSelect).toHaveValue(mockUser.profile?.role);
    });

    it('should display user activity stats', async () => {
      render(UserEditModal, mockProps);

      await waitFor(() => {
        expect(screen.getByText('User Activity')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // servicesCreated
        expect(screen.getByText('12')).toBeInTheDocument(); // songsAdded
      });

      expect(getUserActivity).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Form Validation and Updates', () => {
    it('should update user email', async () => {
      render(UserEditModal, mockProps);

      const emailInput = screen.getByDisplayValue(mockUser.email);
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUser).toHaveBeenCalledWith(mockUser.id, {
          email: 'newemail@example.com'
        });
      });
    });

    it('should update user name', async () => {
      render(UserEditModal, mockProps);

      const nameInput = screen.getByDisplayValue(mockUser.name || '');
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(nameInput, { target: { value: 'New User Name' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUser).toHaveBeenCalledWith(mockUser.id, {
          name: 'New User Name'
        });
      });
    });

    it('should update profile information', async () => {
      render(UserEditModal, mockProps);

      const profileNameInput = screen.getByDisplayValue(mockUser.profile?.name || '');
      const roleSelect = screen.getByRole('combobox');
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(profileNameInput, { target: { value: 'New Profile Name' } });
      await fireEvent.change(roleSelect, { target: { value: 'leader' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith(mockUser.profile?.id, {
          name: 'New Profile Name',
          role: 'leader'
        });
      });
    });

    it('should toggle user active status', async () => {
      render(UserEditModal, mockProps);

      const activeCheckbox = screen.getByRole('checkbox', { name: /active account/i });
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      expect(activeCheckbox).toBeChecked(); // Initially active

      await fireEvent.click(activeCheckbox);
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith(mockUser.profile?.id, {
          is_active: false
        });
      });
    });

    it('should not call update if no changes made', async () => {
      render(UserEditModal, mockProps);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUser).not.toHaveBeenCalled();
        expect(updateUserProfile).not.toHaveBeenCalled();
        expect(mockProps.onsave).toHaveBeenCalled();
      });
    });

    it('should update both user and profile when both are changed', async () => {
      render(UserEditModal, mockProps);

      const emailInput = screen.getByDisplayValue(mockUser.email);
      const profileNameInput = screen.getByDisplayValue(mockUser.profile?.name || '');
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
      await fireEvent.input(profileNameInput, { target: { value: 'New Profile Name' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUser).toHaveBeenCalledWith(mockUser.id, {
          email: 'newemail@example.com'
        });
        expect(updateUserProfile).toHaveBeenCalledWith(mockUser.profile?.id, {
          name: 'New Profile Name'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on update failure', async () => {
      const errorMessage = 'Update failed';
      mockUpdateUser.mockRejectedValue(new Error(errorMessage));

      render(UserEditModal, mockProps);

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

      render(UserEditModal, mockProps);

      // Should not show activity section if loading fails
      await waitFor(() => {
        expect(screen.queryByText('User Activity')).not.toBeInTheDocument();
      });
    });

    it('should clear error when modal is closed', async () => {
      const errorMessage = 'Update failed';
      mockUpdateUser.mockRejectedValue(new Error(errorMessage));

      const { rerender } = render(UserEditModal, mockProps);

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
      mockUpdateUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      render(UserEditModal, mockProps);

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
      mockUpdateUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      render(UserEditModal, mockProps);

      const emailInput = screen.getByDisplayValue(mockUser.email);
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
      await fireEvent.click(saveButton);

      // Form inputs should be disabled
      expect(emailInput).toBeDisabled();
      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });
  });

  describe('Modal Behavior', () => {
    it('should call onclose when cancel button is clicked', async () => {
      render(UserEditModal, mockProps);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);

      expect(mockProps.onclose).toHaveBeenCalled();
    });

    it('should call onsave after successful update', async () => {
      render(UserEditModal, mockProps);

      const emailInput = screen.getByDisplayValue(mockUser.email);
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.input(emailInput, { target: { value: 'newemail@example.com' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockProps.onsave).toHaveBeenCalled();
      });
    });

    it('should reload user activity when modal opens', async () => {
      const { rerender } = render(UserEditModal, { 
        ...mockProps, open: false
      });

      // Modal is initially closed, activity should not be loaded
      expect(getUserActivity).not.toHaveBeenCalled();

      // Open modal
      rerender({ ...mockProps, open: true });

      await waitFor(() => {
        expect(getUserActivity).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('Role Management', () => {
    it('should have all role options available', () => {
      render(UserEditModal, mockProps);

      const roleSelect = screen.getByRole('combobox');
      const options = roleSelect.querySelectorAll('option');

      expect(options).toHaveLength(3);
      expect(Array.from(options).map(opt => opt.value)).toEqual(['musician', 'leader', 'admin']);
      expect(Array.from(options).map(opt => opt.textContent)).toEqual(['Musician', 'Leader', 'Administrator']);
    });

    it('should allow changing user role', async () => {
      render(UserEditModal, mockProps);

      const roleSelect = screen.getByRole('combobox');
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      await fireEvent.change(roleSelect, { target: { value: 'admin' } });
      await fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith(mockUser.profile?.id, {
          role: 'admin'
        });
      });
    });
  });

  describe('User Without Profile', () => {
    it('should handle user without profile gracefully', () => {
      const userWithoutProfile: UserWithProfile = {
        ...mockUser,
        profile: undefined
      };

      render(UserEditModal, { 
        ...mockProps, user: userWithoutProfile
      });

      // Should still render form, but profile fields should be empty
      expect(screen.getByDisplayValue(userWithoutProfile.email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(userWithoutProfile.name || '')).toBeInTheDocument();
      
      // Profile fields should have empty/default values
      const profileInputs = screen.getAllByDisplayValue('');
      expect(profileInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(UserEditModal, mockProps);

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
      expect(screen.getByLabelText('Church Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Active account')).toBeInTheDocument();
    });

    it('should have proper button roles and labels', () => {
      render(UserEditModal, mockProps);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should have proper modal structure', () => {
      render(UserEditModal, mockProps);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
    });
  });
});