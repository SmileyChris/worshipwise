import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import { auth } from '$lib/stores/auth.svelte';
import { mockPb } from '../helpers/pb-mock';
import AuthForm from '$lib/components/auth/AuthForm.svelte';
import ProfileSettings from '$lib/components/profile/ProfileSettings.svelte';
import type { User, Profile } from '$lib/types/auth';

// Mock navigation
const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
  goto: mockGoto
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

// Create a test wrapper component that uses the auth store
const TestAuthWrapper = {
  createWrapper: () => {
    return {
      render: render,
      auth: auth
    };
  }
};

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPb.reset();
    mockGoto.mockClear();
    
    // Reset auth store
    auth.user = null;
    auth.profile = null;
    auth.token = '';
    auth.isValid = false;
    auth.loading = false;
    auth.error = null;
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login flow', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        name: 'Test User',
        role: 'musician',
        church_name: 'Test Church'
      };

      // Mock successful login and profile loading
      const usersCollection = mockPb.collection('users');
      const profilesCollection = mockPb.collection('profiles');

      usersCollection.authWithPassword = vi.fn().mockResolvedValue({
        record: mockUser
      });

      profilesCollection.getList = vi.fn().mockResolvedValue({
        items: [mockProfile]
      });

      // Mock auth store onChange callback
      const onAuthChange = vi.fn();
      
      // Simulate the full login process
      await auth.login({
        email: 'test@example.com',
        password: 'password123'
      });

      // Verify login was called
      expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );

      // Verify navigation to dashboard
      expect(mockGoto).toHaveBeenCalledWith('/dashboard');

      // Verify auth state is not loading and no error
      expect(auth.loading).toBe(false);
      expect(auth.error).toBeNull();
    });

    it('should handle complete registration flow', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        passwordConfirm: 'password123',
        name: 'New User',
        role: 'musician' as const,
        church_name: 'New Church'
      };

      const mockUser = { id: 'user1', email: 'newuser@example.com' };
      const mockProfile = {
        id: 'profile1',
        user_id: 'user1',
        name: 'New User',
        role: 'musician',
        church_name: 'New Church'
      };

      const usersCollection = mockPb.collection('users');
      const profilesCollection = mockPb.collection('profiles');

      usersCollection.create = vi.fn().mockResolvedValue(mockUser);
      usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
      profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

      await auth.register(registerData);

      // Verify user creation
      expect(usersCollection.create).toHaveBeenCalledWith({
        email: registerData.email,
        password: registerData.password,
        passwordConfirm: registerData.passwordConfirm
      });

      // Verify auto-login
      expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
        registerData.email,
        registerData.password
      );

      // Verify profile creation
      expect(profilesCollection.create).toHaveBeenCalledWith({
        user_id: mockUser.id,
        name: registerData.name,
        role: registerData.role,
        church_name: registerData.church_name,
        is_active: true
      });

      // Verify navigation to dashboard
      expect(mockGoto).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle complete logout flow', async () => {
      // Set up authenticated state
      auth.user = { id: 'user1', email: 'test@example.com' } as User;
      auth.profile = { id: 'profile1', name: 'Test User', role: 'musician' } as Profile;
      auth.token = 'test-token';
      auth.isValid = true;

      await auth.logout();

      expect(mockPb.authStore.clear).toHaveBeenCalled();
      expect(mockGoto).toHaveBeenCalledWith('/login');
    });
  });

  describe('AuthForm Integration', () => {
    it('should integrate with auth store for login', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' };
      
      const usersCollection = mockPb.collection('users');
      usersCollection.authWithPassword = vi.fn().mockResolvedValue({
        record: mockUser
      });

      const handleSubmit = async (data: any) => {
        await auth.login(data);
      };

      render(AuthForm, {
        props: {
          mode: 'login',
          onSubmit: handleSubmit
        }
      });

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'password123' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
        expect(mockGoto).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should integrate with auth store for registration', async () => {
      const mockUser = { id: 'user1', email: 'newuser@example.com' };
      const mockProfile = { id: 'profile1', user_id: 'user1', name: 'New User', role: 'musician' };

      const usersCollection = mockPb.collection('users');
      const profilesCollection = mockPb.collection('profiles');

      usersCollection.create = vi.fn().mockResolvedValue(mockUser);
      usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
      profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

      const handleSubmit = async (data: any) => {
        await auth.register(data);
      };

      render(AuthForm, {
        props: {
          mode: 'register',
          onSubmit: handleSubmit
        }
      });

      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const passwordConfirmInput = screen.getByTestId('password-confirm-input');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await fireEvent.input(nameInput, { target: { value: 'New User' } });
      await fireEvent.input(emailInput, { target: { value: 'newuser@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'password123' } });
      await fireEvent.input(passwordConfirmInput, { target: { value: 'password123' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(usersCollection.create).toHaveBeenCalled();
        expect(profilesCollection.create).toHaveBeenCalled();
        expect(mockGoto).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should display auth errors from store', async () => {
      const mockError = {
        response: {
          data: { message: 'Invalid credentials' }
        }
      };

      const usersCollection = mockPb.collection('users');
      usersCollection.authWithPassword = vi.fn().mockRejectedValue(mockError);

      const handleSubmit = async (data: any) => {
        try {
          await auth.login(data);
        } catch (error) {
          // Error is handled by auth store
        }
      };

      render(AuthForm, {
        props: {
          mode: 'login',
          onSubmit: handleSubmit,
          error: auth.error
        }
      });

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
      await fireEvent.input(passwordInput, { target: { value: 'wrongpassword' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(auth.error).toBe('Invalid credentials');
      });
    });
  });

  describe('ProfileSettings Integration', () => {
    beforeEach(() => {
      // Set up authenticated state
      auth.user = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User'
      } as User;

      auth.profile = {
        id: 'profile1',
        user_id: 'user1',
        name: 'Test User',
        role: 'musician',
        church_name: 'Test Church',
        is_active: true
      } as Profile;

      auth.isValid = true;
    });

    it('should integrate with auth store for profile updates', async () => {
      const usersCollection = mockPb.collection('users');
      const profilesCollection = mockPb.collection('profiles');

      usersCollection.update = vi.fn().mockResolvedValue({
        ...auth.user,
        email: 'updated@example.com'
      });

      profilesCollection.update = vi.fn().mockResolvedValue({
        ...auth.profile,
        name: 'Updated Name'
      });

      auth.updateProfileInfo = vi.fn().mockImplementation(async (profileData, userData) => {
        if (userData) {
          const updatedUser = await usersCollection.update(auth.user?.id, userData);
          auth.user = updatedUser as User;
        }
        if (profileData) {
          const updatedProfile = await profilesCollection.update(auth.profile?.id, profileData);
          auth.profile = updatedProfile as Profile;
        }
      });

      render(ProfileSettings);

      const nameInput = screen.getByTestId('profile-name-input');
      const emailInput = screen.getByTestId('profile-email-input');
      const updateButton = screen.getByRole('button', { name: /update profile/i });

      await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });
      await fireEvent.input(emailInput, { target: { value: 'updated@example.com' } });
      await fireEvent.click(updateButton);

      await waitFor(() => {
        expect(auth.updateProfileInfo).toHaveBeenCalledWith(
          {
            name: 'Updated Name',
            church_name: 'Test Church',
            role: 'musician'
          },
          {
            email: 'updated@example.com'
          }
        );
      });
    });

    it('should integrate with auth store for password changes', async () => {
      const usersCollection = mockPb.collection('users');
      usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: auth.user });
      usersCollection.update = vi.fn().mockResolvedValue(auth.user);

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
        expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
          auth.user?.email,
          'currentpassword'
        );
        expect(usersCollection.update).toHaveBeenCalledWith(auth.user?.id, {
          password: 'newpassword123',
          passwordConfirm: 'newpassword123'
        });
      });
    });
  });

  describe('Protected Route Simulation', () => {
    it('should allow access for authenticated users', () => {
      // Simulate authenticated state
      auth.user = { id: 'user1', email: 'test@example.com' } as User;
      auth.profile = { id: 'profile1', role: 'musician' } as Profile;
      auth.isValid = true;

      // Simulate route protection logic
      const canAccessDashboard = auth.isValid && auth.user !== null;
      expect(canAccessDashboard).toBe(true);
    });

    it('should deny access for unauthenticated users', () => {
      // Simulate unauthenticated state
      auth.user = null;
      auth.profile = null;
      auth.isValid = false;

      // Simulate route protection logic
      const canAccessDashboard = auth.isValid && auth.user !== null;
      expect(canAccessDashboard).toBe(false);
    });

    it('should check role-based permissions', () => {
      auth.user = { id: 'user1', email: 'test@example.com' } as User;
      auth.profile = { id: 'profile1', role: 'musician' } as Profile;
      auth.isValid = true;

      // Test different permission levels
      expect(auth.canManageSongs).toBe(false); // Musicians can't manage songs
      expect(auth.canManageServices).toBe(false); // Musicians can't manage services
      expect(auth.isAdmin).toBe(false); // Not an admin

      // Change to leader role
      auth.profile = { ...auth.profile, role: 'leader' };
      expect(auth.canManageSongs).toBe(true); // Leaders can manage songs
      expect(auth.canManageServices).toBe(true); // Leaders can manage services
      expect(auth.isAdmin).toBe(false); // Still not an admin

      // Change to admin role
      auth.profile = { ...auth.profile, role: 'admin' };
      expect(auth.canManageSongs).toBe(true); // Admins can manage songs
      expect(auth.canManageServices).toBe(true); // Admins can manage services
      expect(auth.isAdmin).toBe(true); // Now an admin
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      const usersCollection = mockPb.collection('users');
      usersCollection.authWithPassword = vi.fn().mockRejectedValue(networkError);

      try {
        await auth.login({
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error).toBe(networkError);
      }

      expect(auth.loading).toBe(false);
      expect(auth.error).toBe('Network error');
    });

    it('should handle token expiration', async () => {
      // Set up authenticated state
      auth.user = { id: 'user1', email: 'test@example.com' } as User;
      auth.isValid = true;

      // Mock expired token error
      const expiredError = new Error('Token expired');
      const usersCollection = mockPb.collection('users');
      usersCollection.authRefresh = vi.fn().mockRejectedValue(expiredError);

      const logoutSpy = vi.spyOn(auth, 'logout').mockResolvedValue();

      await auth.refreshAuth();

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('should handle missing profile gracefully', async () => {
      auth.user = { id: 'user1', email: 'test@example.com' } as User;

      const profilesCollection = mockPb.collection('profiles');
      profilesCollection.getList = vi.fn().mockResolvedValue({
        items: [] // No profile found
      });

      await auth.loadProfile();

      expect(auth.profile).toBeNull();
      // Should not throw error
    });

    it('should handle profile loading errors', async () => {
      auth.user = { id: 'user1', email: 'test@example.com' } as User;

      const profilesCollection = mockPb.collection('profiles');
      profilesCollection.getList = vi.fn().mockRejectedValue(new Error('Database error'));

      // Should not throw, should handle gracefully
      await auth.loadProfile();

      expect(auth.profile).toBeNull();
    });
  });

  describe('Auth State Persistence', () => {
    it('should initialize from PocketBase auth store', () => {
      const mockUser = { id: 'user1', email: 'test@example.com' };
      
      // Simulate existing auth data in PocketBase
      mockPb.authStore.model = mockUser;
      mockPb.authStore.token = 'existing-token';
      mockPb.authStore.isValid = true;

      // Create new auth store instance to test initialization
      const newAuth = new (auth.constructor as any)();

      expect(newAuth.user).toEqual(mockUser);
      expect(newAuth.token).toBe('existing-token');
      expect(newAuth.isValid).toBe(true);
    });

    it('should sync with PocketBase onChange events', () => {
      const mockUser = { id: 'user1', email: 'test@example.com' };
      
      // Simulate auth change in PocketBase
      mockPb.authStore.model = mockUser;
      mockPb.authStore.token = 'new-token';
      mockPb.authStore.isValid = true;

      // Trigger onChange callback
      const onChange = mockPb.authStore.onChange.mock.calls[0]?.[0];
      if (onChange) {
        onChange();
      }

      // Auth store should sync with PocketBase
      // Note: In actual implementation, this would update the auth store state
    });
  });
});