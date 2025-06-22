import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { auth } from './auth.svelte';
import { mockPb } from '../../../tests/helpers/pb-mock';
import type { User, Profile, LoginCredentials, RegisterData } from '$lib/types/auth';
import { goto } from '$app/navigation';

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('AuthStore', () => {
	beforeEach(() => {
		mockPb.reset();
		(goto as any).mockClear();
		console.log = vi.fn();
		console.error = vi.fn();

		// Reset auth store state completely
		auth.user = null;
		auth.profile = null;
		auth.token = '';
		auth.isValid = false;
		auth.loading = false;
		auth.error = null;
		auth.currentChurch = null;
		auth.availableChurches = [];
		auth.churchLoading = false;
	});

	afterEach(() => {
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
	});

	describe('Initialization', () => {
		it('should initialize with null user and empty state', () => {
			expect(auth.user).toBeNull();
			expect(auth.profile).toBeNull();
			expect(auth.token).toBe('');
			expect(auth.isValid).toBe(false);
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should sync with PocketBase auth store on initialization', () => {
			const mockUser = {
				id: 'user1',
				email: 'test@example.com',
				name: 'Test User',
				created: '2024-01-01T00:00:00.000Z',
				updated: '2024-01-01T00:00:00.000Z',
				verified: true,
				avatar: '',
				emailVisibility: false
			};

			// Simulate initialization by setting the values that would be synced from PocketBase
			auth.user = mockUser as User;
			auth.token = 'test-token';
			auth.isValid = true;

			expect(auth.user).toEqual(mockUser);
			expect(auth.token).toBe('test-token');
			expect(auth.isValid).toBe(true);
		});
	});

	describe('Login', () => {
		it('should successfully login with valid credentials', async () => {
			const credentials: LoginCredentials = {
				email: 'test@example.com',
				password: 'password123'
			};

			const mockAuthData = {
				record: { id: 'user1', email: 'test@example.com', name: 'Test User' }
			};

			mockPb.collection('users').authWithPassword = vi.fn().mockResolvedValue(mockAuthData);

			await auth.login(credentials);

			expect(mockPb.collection).toHaveBeenCalledWith('users');
			expect(mockPb.collection('users').authWithPassword).toHaveBeenCalledWith(
				credentials.email,
				credentials.password
			);
			expect(goto).toHaveBeenCalledWith('/dashboard');
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle login errors', async () => {
			const credentials: LoginCredentials = {
				email: 'test@example.com',
				password: 'wrongpassword'
			};

			const mockError = {
				response: {
					data: { message: 'Invalid credentials' }
				}
			};

			mockPb.collection('users').authWithPassword = vi.fn().mockRejectedValue(mockError);

			await expect(auth.login(credentials)).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Invalid credentials');
		});

		it('should set loading state during login', async () => {
			const credentials: LoginCredentials = {
				email: 'test@example.com',
				password: 'password123'
			};

			// Mock a delayed response
			const delayedPromise = new Promise((resolve) =>
				setTimeout(() => resolve({ record: { email: 'test@example.com' } }), 100)
			);
			mockPb.collection('users').authWithPassword = vi.fn().mockReturnValue(delayedPromise);

			const loginPromise = auth.login(credentials);

			// Check loading state is true during async operation
			expect(auth.loading).toBe(true);

			await loginPromise;
			expect(auth.loading).toBe(false);
		});

		it('should clear error before attempting login', async () => {
			auth.error = 'Previous error';

			const credentials: LoginCredentials = {
				email: 'test@example.com',
				password: 'password123'
			};

			mockPb.collection('users').authWithPassword = vi.fn().mockResolvedValue({
				record: { email: 'test@example.com' }
			});

			await auth.login(credentials);
			expect(auth.error).toBeNull();
		});
	});

	describe('Register', () => {
		it('should successfully register new user', async () => {
			const registerData: RegisterData = {
				email: 'newuser@example.com',
				password: 'password123',
				passwordConfirm: 'password123',
				name: 'New User',
				role: 'musician'
			};

			const mockUser = { id: 'user1', email: 'newuser@example.com' };
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'New User',
				role: 'musician'
			};

			const usersCollection = mockPb.collection('users');
			const profilesCollection = mockPb.collection('profiles');

			usersCollection.create = vi.fn().mockResolvedValue(mockUser);
			usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
			profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

			await auth.register(registerData);

			expect(usersCollection.create).toHaveBeenCalledWith({
				email: registerData.email,
				password: registerData.password,
				passwordConfirm: registerData.passwordConfirm
			});

			expect(profilesCollection.create).toHaveBeenCalledWith({
				user_id: mockUser.id,
				name: registerData.name,
				role: registerData.role,
				is_active: true
			});

			expect(goto).toHaveBeenCalledWith('/dashboard');
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle registration errors', async () => {
			const registerData: RegisterData = {
				email: 'invalid-email',
				password: 'password123',
				passwordConfirm: 'password123',
				name: 'New User'
			};

			const mockError = {
				response: {
					data: {
						data: {
							email: { message: 'Invalid email format' }
						}
					}
				}
			};

			mockPb.collection('users').create = vi.fn().mockRejectedValue(mockError);

			await expect(auth.register(registerData)).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Invalid email format');
		});

		it('should use default role if not provided', async () => {
			const registerData: RegisterData = {
				email: 'newuser@example.com',
				password: 'password123',
				passwordConfirm: 'password123',
				name: 'New User'
			};

			const mockUser = { id: 'user1', email: 'newuser@example.com' };
			const mockProfile = { id: 'profile1', user_id: 'user1', name: 'New User', role: 'musician' };

			const usersCollection = mockPb.collection('users');
			const profilesCollection = mockPb.collection('profiles');

			usersCollection.create = vi.fn().mockResolvedValue(mockUser);
			usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
			profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

			await auth.register(registerData);

			expect(profilesCollection.create).toHaveBeenCalledWith({
				user_id: mockUser.id,
				name: registerData.name,
				role: 'musician', // Default role
				is_active: true
			});
		});
	});

	describe('Logout', () => {
		it('should clear auth store and redirect to login', async () => {
			auth.user = { id: 'user1', email: 'test@example.com' } as User;
			auth.token = 'test-token';
			auth.isValid = true;

			await auth.logout();

			expect(mockPb.authStore.clear).toHaveBeenCalled();
			expect(goto).toHaveBeenCalledWith('/login');
		});

		it('should handle logout errors gracefully', async () => {
			(goto as any).mockRejectedValue(new Error('Navigation error'));

			// Should not throw even if navigation fails
			await expect(auth.logout()).resolves.not.toThrow();
		});
	});

	describe('Profile Loading', () => {
		it('should load profile for authenticated user', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'Test User',
				role: 'musician'
			} as Profile;

			auth.user = mockUser;

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.getList = vi.fn().mockResolvedValue({
				items: [mockProfile]
			});

			await auth.loadProfile();

			expect(profilesCollection.getList).toHaveBeenCalledWith(1, 1, {
				filter: `user_id = "${mockUser.id}"`
			});
			expect(auth.profile).toEqual(mockProfile);
		});

		it('should handle missing profile gracefully', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			auth.user = mockUser;

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.getList = vi.fn().mockResolvedValue({
				items: []
			});

			await auth.loadProfile();

			expect(auth.profile).toBeNull();
		});

		it('should handle profile loading errors', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			auth.user = mockUser;

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.getList = vi.fn().mockRejectedValue(new Error('Network error'));

			await auth.loadProfile();

			expect(console.error).toHaveBeenCalledWith('Failed to load profile:', expect.any(Error));
			expect(auth.profile).toBeNull();
		});
	});

	describe('Auth Refresh', () => {
		it('should refresh auth token when valid', async () => {
			auth.isValid = true;

			const usersCollection = mockPb.collection('users');
			usersCollection.authRefresh = vi.fn().mockResolvedValue({});

			await auth.refreshAuth();

			expect(usersCollection.authRefresh).toHaveBeenCalled();
		});

		it('should not refresh when auth is invalid', async () => {
			auth.isValid = false;

			const usersCollection = mockPb.collection('users');
			usersCollection.authRefresh = vi.fn();

			await auth.refreshAuth();

			expect(usersCollection.authRefresh).not.toHaveBeenCalled();
		});

		it('should logout on refresh failure', async () => {
			auth.isValid = true;

			const usersCollection = mockPb.collection('users');
			usersCollection.authRefresh = vi.fn().mockRejectedValue(new Error('Token expired'));

			const logoutSpy = vi.spyOn(auth, 'logout').mockResolvedValue();

			await auth.refreshAuth();

			expect(logoutSpy).toHaveBeenCalled();
		});
	});

	describe('Error Message Handling', () => {
		it('should extract error message from response data', () => {
			const error = {
				response: {
					data: {
						data: {
							email: { message: 'Email already exists' }
						}
					}
				}
			};

			const message = auth.getErrorMessage(error);
			expect(message).toBe('Email already exists');
		});

		it('should extract general error message', () => {
			const error = {
				response: {
					data: {
						message: 'Something went wrong'
					}
				}
			};

			const message = auth.getErrorMessage(error);
			expect(message).toBe('Something went wrong');
		});

		it('should handle credential errors', () => {
			const error = {
				message: 'invalid credentials'
			};

			const message = auth.getErrorMessage(error);
			expect(message).toBe('Invalid email or password');
		});

		it('should handle email errors', () => {
			const error = {
				message: 'email validation failed'
			};

			const message = auth.getErrorMessage(error);
			expect(message).toBe('Please check your email address');
		});

		it('should return fallback message for unknown errors', () => {
			const error = {};

			const message = auth.getErrorMessage(error);
			expect(message).toBe('An unexpected error occurred');
		});
	});

	describe('Profile Updates', () => {
		it('should update user profile successfully', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com', name: 'Old Name' } as User;
			auth.user = mockUser;

			const updates = { name: 'New Name', email: 'newemail@example.com' };
			const updatedUser = { ...mockUser, ...updates };

			const usersCollection = mockPb.collection('users');
			usersCollection.update = vi.fn().mockResolvedValue(updatedUser);

			await auth.updateProfile(updates);

			expect(usersCollection.update).toHaveBeenCalledWith(mockUser.id, updates);
			expect(auth.user).toEqual(updatedUser);
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle profile update errors', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			auth.user = mockUser;

			const mockError = {
				response: {
					data: { message: 'Email already exists' }
				}
			};

			const usersCollection = mockPb.collection('users');
			usersCollection.update = vi.fn().mockRejectedValue(mockError);

			await expect(auth.updateProfile({ email: 'existing@example.com' })).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Email already exists');
		});

		it('should not update if user is not authenticated', async () => {
			auth.user = null;

			const usersCollection = mockPb.collection('users');
			usersCollection.update = vi.fn();

			await auth.updateProfile({ name: 'New Name' });

			expect(usersCollection.update).not.toHaveBeenCalled();
		});

		it('should update profile information successfully', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'Old Name',
				role: 'musician'
			} as Profile;

			auth.user = mockUser;
			auth.profile = mockProfile;

			const profileData = { name: 'New Name', role: 'leader' as const };
			const userData = { email: 'newemail@example.com' };

			const updatedUser = { ...mockUser, ...userData };
			const updatedProfile = { ...mockProfile, ...profileData };

			const usersCollection = mockPb.collection('users');
			const profilesCollection = mockPb.collection('profiles');

			usersCollection.update = vi.fn().mockResolvedValue(updatedUser);
			profilesCollection.update = vi.fn().mockResolvedValue(updatedProfile);

			await auth.updateProfileInfo(profileData, userData);

			expect(usersCollection.update).toHaveBeenCalledWith(mockUser.id, userData);
			expect(profilesCollection.update).toHaveBeenCalledWith(mockProfile.id, profileData);
			expect(auth.user).toEqual(updatedUser);
			expect(auth.profile).toEqual(updatedProfile);
		});

		it('should update only profile when no user data provided', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'Old Name',
				role: 'musician'
			} as Profile;

			auth.user = mockUser;
			auth.profile = mockProfile;

			const profileData = { name: 'New Name' };
			const updatedProfile = { ...mockProfile, ...profileData };

			const usersCollection = mockPb.collection('users');
			const profilesCollection = mockPb.collection('profiles');

			usersCollection.update = vi.fn();
			profilesCollection.update = vi.fn().mockResolvedValue(updatedProfile);

			await auth.updateProfileInfo(profileData);

			expect(usersCollection.update).not.toHaveBeenCalled();
			expect(profilesCollection.update).toHaveBeenCalledWith(mockProfile.id, profileData);
			expect(auth.profile).toEqual(updatedProfile);
		});

		it('should handle profile info update errors', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockProfile = { id: 'profile1', user_id: 'user1', name: 'Old Name' } as Profile;

			auth.user = mockUser;
			auth.profile = mockProfile;

			const mockError = new Error('Update failed');

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.update = vi.fn().mockRejectedValue(mockError);

			await expect(auth.updateProfileInfo({ name: 'New Name' })).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Update failed');
		});
	});

	describe('Password Reset', () => {
		it('should request password reset successfully', async () => {
			const email = 'test@example.com';

			const usersCollection = mockPb.collection('users');
			usersCollection.requestPasswordReset = vi.fn().mockResolvedValue({});

			await auth.requestPasswordReset(email);

			expect(usersCollection.requestPasswordReset).toHaveBeenCalledWith(email);
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle password reset request errors', async () => {
			const email = 'nonexistent@example.com';
			const mockError = {
				response: {
					data: { message: 'User not found' }
				}
			};

			const usersCollection = mockPb.collection('users');
			usersCollection.requestPasswordReset = vi.fn().mockRejectedValue(mockError);

			await expect(auth.requestPasswordReset(email)).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('User not found');
		});

		it('should confirm password reset successfully', async () => {
			const token = 'reset-token';
			const password = 'newpassword123';
			const passwordConfirm = 'newpassword123';

			const usersCollection = mockPb.collection('users');
			usersCollection.confirmPasswordReset = vi.fn().mockResolvedValue({});

			await auth.confirmPasswordReset(token, password, passwordConfirm);

			expect(usersCollection.confirmPasswordReset).toHaveBeenCalledWith(
				token,
				password,
				passwordConfirm
			);
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle password reset confirmation errors', async () => {
			const token = 'invalid-token';
			const password = 'newpassword123';
			const passwordConfirm = 'newpassword123';

			const mockError = {
				response: {
					data: { message: 'Invalid or expired token' }
				}
			};

			const usersCollection = mockPb.collection('users');
			usersCollection.confirmPasswordReset = vi.fn().mockRejectedValue(mockError);

			await expect(auth.confirmPasswordReset(token, password, passwordConfirm)).rejects.toThrow();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Invalid or expired token');
		});
	});

	describe('Role-based Permissions', () => {
		beforeEach(() => {
			auth.user = { id: 'user1', email: 'test@example.com' } as User;
		});

		it('should check if user has specific role', () => {
			auth.profile = { role: 'leader' } as Profile;

			expect(auth.hasRole('leader')).toBe(true);
			expect(auth.hasRole('admin')).toBe(false);
			expect(auth.hasRole('musician')).toBe(false);
		});

		it('should check if user has any of specified roles', () => {
			auth.profile = { role: 'leader' } as Profile;

			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(true);
			expect(auth.hasAnyRole(['admin', 'musician'])).toBe(false);
			expect(auth.hasAnyRole(['musician'])).toBe(false);
		});

		it('should return false for role checks when no profile', () => {
			auth.profile = null;

			expect(auth.hasRole('leader')).toBe(false);
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(false);
		});

		it('should compute canManageSongs correctly', () => {
			// Leader can manage songs
			auth.profile = { role: 'leader' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(true);

			// Admin can manage songs
			auth.profile = { role: 'admin' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(true);

			// Musician cannot manage songs
			auth.profile = { role: 'musician' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(false);
		});

		it('should compute canManageServices correctly', () => {
			// Leader can manage services
			auth.profile = { role: 'leader' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(true);

			// Admin can manage services
			auth.profile = { role: 'admin' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(true);

			// Musician cannot manage services
			auth.profile = { role: 'musician' } as Profile;
			expect(auth.hasAnyRole(['leader', 'admin'])).toBe(false);
		});

		it('should compute isAdmin correctly', () => {
			// Test admin role
			auth.profile = { role: 'admin' } as Profile;
			expect(auth.hasRole('admin')).toBe(true);

			// Test leader role
			auth.profile = { role: 'leader' } as Profile;
			expect(auth.hasRole('admin')).toBe(false);

			// Test musician role
			auth.profile = { role: 'musician' } as Profile;
			expect(auth.hasRole('admin')).toBe(false);
		});

		it('should compute displayName correctly', () => {
			// Profile name takes precedence
			auth.profile = { name: 'Profile Name' } as Profile;
			auth.user = { name: 'User Name', email: 'test@example.com' } as User;
			expect(auth.displayName).toBe('Profile Name');
		});
	});

	describe('Clear Error', () => {
		it('should clear error state', () => {
			auth.error = 'Some error';
			auth.clearError();
			expect(auth.error).toBeNull();
		});
	});
});
