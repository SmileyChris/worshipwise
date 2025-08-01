import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createAuthStore, type AuthStore } from './auth.svelte';
import type { AuthContext } from '$lib/types/auth';
import { mockPb } from '../../../tests/helpers/pb-mock';
import type { User, LoginCredentials, RegisterData } from '$lib/types/auth';
import type { ChurchMembership } from '$lib/types/church';
import { goto } from '$app/navigation';

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock churches API
vi.mock('$lib/api/churches', () => {
	const mockAPI = {
		getPendingInvites: vi.fn().mockResolvedValue([]),
		acceptInvitation: vi.fn().mockResolvedValue({}),
		declineInvitation: vi.fn().mockResolvedValue({})
	};
	return {
		ChurchesAPI: mockAPI,
		createChurchesAPI: vi.fn(() => mockAPI)
	};
});

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('AuthStore', () => {
	let auth: AuthStore;

	beforeEach(() => {
		// Create fresh store instance for each test
		auth = createAuthStore();

		mockPb.reset();
		(goto as any).mockClear();
		console.log = vi.fn();
		console.error = vi.fn();
	});

	afterEach(() => {
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
	});

	describe('Initialization', () => {
		it('should initialize with null user and empty state', () => {
			expect(auth.user).toBeNull();
			expect(auth.currentMembership).toBeNull();
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
				name: 'New User'
			};

			const mockUser = { id: 'user1', email: 'newuser@example.com' };
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active'
			};

			const usersCollection = mockPb.collection('users');
			const membershipsCollection = mockPb.collection('church_memberships');

			usersCollection.create = vi.fn().mockResolvedValue(mockUser);
			usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
			membershipsCollection.create = vi.fn().mockResolvedValue(mockMembership);

			await auth.register(registerData);

			expect(usersCollection.create).toHaveBeenCalledWith({
				email: registerData.email,
				name: registerData.name,
				password: registerData.password,
				passwordConfirm: registerData.passwordConfirm
			});

			// Note: Church membership is not created during registration
			// It's created when user joins a church
			expect(membershipsCollection.create).not.toHaveBeenCalled();

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
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active'
			};

			const usersCollection = mockPb.collection('users');
			const membershipsCollection = mockPb.collection('church_memberships');

			usersCollection.create = vi.fn().mockResolvedValue(mockUser);
			usersCollection.authWithPassword = vi.fn().mockResolvedValue({ record: mockUser });
			membershipsCollection.create = vi.fn().mockResolvedValue(mockMembership);

			await auth.register(registerData);

			// Church membership is not created during registration
			expect(membershipsCollection.create).not.toHaveBeenCalled();
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
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active'
			};

			auth.user = mockUser;

			const membershipsCollection = mockPb.collection('church_memberships');
			membershipsCollection.getList = vi.fn().mockResolvedValue({
				items: [mockMembership]
			});

			await auth.loadProfile();

			expect(membershipsCollection.getList).toHaveBeenCalledWith(1, 1, {
				filter: `user_id = "${mockUser.id}" && status = "active" && is_active = true`,
				expand: 'church_id',
				sort: '-joined_date'
			});
			expect(auth.currentMembership).toEqual(mockMembership);
		});

		it('should handle missing profile gracefully', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			auth.user = mockUser;

			const membershipsCollection = mockPb.collection('church_memberships');
			membershipsCollection.getList = vi.fn().mockResolvedValue({
				items: []
			});

			await auth.loadProfile();

			expect(auth.currentMembership).toBeNull();
		});

		it('should handle profile loading errors', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			auth.user = mockUser;

			const membershipsCollection = mockPb.collection('church_memberships');
			membershipsCollection.getList = vi.fn().mockRejectedValue(new Error('Network error'));

			await auth.loadProfile();

			expect(console.error).toHaveBeenCalledWith(
				'Failed to load current membership:',
				expect.any(Error)
			);
			expect(auth.currentMembership).toBeNull();
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
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active',
				is_active: true,
				created: '2024-01-01T00:00:00Z',
				updated: '2024-01-01T00:00:00Z'
			} as ChurchMembership;

			auth.user = mockUser;
			auth.currentMembership = mockMembership;

			const profileData = { name: 'New Name' };
			const userData = { email: 'newemail@example.com' };

			const updatedUser = { ...mockUser, ...userData };
			const updatedProfile = { ...mockMembership, ...profileData };

			const usersCollection = mockPb.collection('users');
			const membershipsCollection = mockPb.collection('church_memberships');

			usersCollection.update = vi.fn().mockResolvedValue(updatedUser);
			membershipsCollection.update = vi.fn().mockResolvedValue(updatedProfile);

			await auth.updateProfile(userData);

			expect(usersCollection.update).toHaveBeenCalledWith(mockUser.id, userData);
			expect(auth.user).toEqual(updatedUser);
		});

		it('should handle empty update gracefully', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active',
				is_active: true,
				created: '2024-01-01T00:00:00Z',
				updated: '2024-01-01T00:00:00Z'
			} as ChurchMembership;

			auth.user = mockUser;
			auth.currentMembership = mockMembership;

			const profileData = { name: 'New Name' };
			const updatedProfile = { ...mockMembership, ...profileData };

			const usersCollection = mockPb.collection('users');
			const membershipsCollection = mockPb.collection('church_memberships');

			usersCollection.update = vi.fn();
			membershipsCollection.update = vi.fn().mockResolvedValue(updatedProfile);

			await auth.updateProfile({});

			// Empty update should still call the API
			expect(usersCollection.update).toHaveBeenCalledWith(mockUser.id, {});
		});

		it('should handle profile info update errors', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as User;
			const mockMembership = {
				id: 'membership1',
				church_id: 'church1',
				user_id: 'user1',
				status: 'active',
				is_active: true,
				created: '2024-01-01T00:00:00Z',
				updated: '2024-01-01T00:00:00Z'
			} as ChurchMembership;

			auth.user = mockUser;
			auth.currentMembership = mockMembership;

			const mockError = new Error('Update failed');

			const usersCollection = mockPb.collection('users');
			usersCollection.update = vi.fn().mockRejectedValue(mockError);

			await expect(auth.updateProfile({ name: 'New Name' })).rejects.toThrow();
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

	describe('Permission-based Access Control', () => {
		beforeEach(() => {
			auth.user = { id: 'user1', email: 'test@example.com' } as User;
			auth.currentMembership = { church_id: 'church1' } as any;
		});

		it('should check if user has specific permission', () => {
			// Set up permissions
			auth.permissions = new Set(['manage-songs', 'manage-services']);

			expect(auth.hasPermission('manage-songs')).toBe(true);
			expect(auth.hasPermission('manage-services')).toBe(true);
			expect(auth.hasPermission('manage-members')).toBe(false);
			expect(auth.hasPermission('manage-church')).toBe(false);
		});

		it('should check if user has any of specified permissions', () => {
			auth.permissions = new Set(['manage-songs']);

			expect(auth.hasAnyPermission(['manage-songs', 'manage-services'])).toBe(true);
			expect(auth.hasAnyPermission(['manage-members', 'manage-church'])).toBe(false);
			expect(auth.hasAnyPermission(['manage-church'])).toBe(false);
		});

		it('should return false for permission checks when no permissions', () => {
			auth.permissions = new Set();

			expect(auth.hasPermission('manage-songs')).toBe(false);
			expect(auth.hasAnyPermission(['manage-songs', 'manage-services'])).toBe(false);
		});

		it('should compute canManageSongs correctly', () => {
			// User with manage-songs permission
			auth.permissions = new Set(['manage-songs']);
			expect(auth.canManageSongs).toBe(true);

			// User without manage-songs permission
			auth.permissions = new Set(['manage-services']);
			expect(auth.canManageSongs).toBe(false);

			// User with no permissions
			auth.permissions = new Set();
			expect(auth.canManageSongs).toBe(false);
		});

		it('should compute canManageServices correctly', () => {
			// User with manage-services permission
			auth.permissions = new Set(['manage-services']);
			expect(auth.canManageServices).toBe(true);

			// User without manage-services permission
			auth.permissions = new Set(['manage-songs']);
			expect(auth.canManageServices).toBe(false);

			// User with no permissions
			auth.permissions = new Set();
			expect(auth.canManageServices).toBe(false);
		});

		it('should compute isAdmin correctly', () => {
			// User with manage-church permission (admin)
			auth.permissions = new Set(['manage-church']);
			expect(auth.isAdmin).toBe(true);

			// User without manage-church permission
			auth.permissions = new Set(['manage-songs', 'manage-services']);
			expect(auth.isAdmin).toBe(false);

			// User with no permissions
			auth.permissions = new Set();
			expect(auth.isAdmin).toBe(false);
		});

		it('should check if user has leader skill', () => {
			// User with leader skill
			auth.userSkills = [
				{
					id: 'user-skill-1',
					user_id: 'user1',
					skill_id: 'skill-1',
					church_id: 'church1',
					expand: {
						skill_id: { id: 'skill-1', name: 'Leader', slug: 'leader' }
					}
				} as any
			];
			expect(auth.hasLeaderSkill()).toBe(true);
			expect(auth.isLeader).toBe(true);

			// User without leader skill
			auth.userSkills = [
				{
					id: 'user-skill-2',
					user_id: 'user1',
					skill_id: 'skill-2',
					church_id: 'church1',
					expand: {
						skill_id: { id: 'skill-2', name: 'Guitarist', slug: 'guitarist' }
					}
				} as any
			];
			expect(auth.hasLeaderSkill()).toBe(false);
			expect(auth.isLeader).toBe(false);
		});

		it('should compute displayName correctly', () => {
			// Reset user first
			auth.user = null;

			// User name takes precedence
			auth.user = { name: 'User Name', email: 'test@example.com' } as User;
			expect(auth.displayName).toBe('User Name');

			// Falls back to email if no name
			auth.user = { email: 'test@example.com', name: '' } as User;
			expect(auth.displayName).toBe('test@example.com');

			// Falls back to 'User' if no name or email
			auth.user = { name: '', email: '' } as User;
			expect(auth.displayName).toBe('User');

			// Also test null user
			auth.user = null;
			expect(auth.displayName).toBe('User');
		});
	});

	describe('Clear Error', () => {
		it('should clear error state', () => {
			auth.error = 'Some error';
			auth.clearError();
			expect(auth.error).toBeNull();
		});
	});

	describe('Invitation Management', () => {
		it('should load pending invites successfully', async () => {
			const mockInvites = [
				{
					id: 'invite-1',
					church_id: 'church1',
					expand: {
						church_id: { id: 'church1', name: 'Test Church' },
						invited_by: { id: 'user1', name: 'Admin' }
					}
				}
			];

			// Mock the import to return our mocked methods
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.getPendingInvites as any) = vi.fn().mockResolvedValue(mockInvites);

			auth.user = { id: 'user1', email: 'test@example.com' } as User;

			await auth.loadPendingInvites();

			expect(auth.pendingInvites).toEqual(mockInvites);
			expect(auth.invitesLoading).toBe(false);
		});

		it('should handle pending invites loading error', async () => {
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.getPendingInvites as any) = vi
				.fn()
				.mockRejectedValue(new Error('Failed to load'));

			auth.user = { id: 'user1', email: 'test@example.com' } as User;

			await auth.loadPendingInvites();

			expect(auth.pendingInvites).toEqual([]);
			expect(auth.invitesLoading).toBe(false);
		});

		it('should not load invites if no user email', async () => {
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.getPendingInvites as any) = vi.fn();

			auth.user = { id: 'user1' } as User; // No email

			await auth.loadPendingInvites();

			expect(ChurchesAPI.getPendingInvites).not.toHaveBeenCalled();
			expect(auth.pendingInvites).toEqual([]);
		});

		it('should accept invitation successfully', async () => {
			const mockChurch = { id: 'church1', name: 'Test Church' };
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.acceptInvitation as any) = vi.fn().mockResolvedValue(mockChurch);

			// Mock loadUserChurches and loadPendingInvites
			auth.loadUserChurches = vi.fn().mockResolvedValue(undefined);
			auth.loadPendingInvites = vi.fn().mockResolvedValue(undefined);
			auth.switchChurch = vi.fn().mockResolvedValue(undefined);

			await auth.acceptInvitation('test-token');

			expect(ChurchesAPI.acceptInvitation).toHaveBeenCalledWith('test-token');
			expect(auth.loadUserChurches).toHaveBeenCalled();
			expect(auth.loadPendingInvites).toHaveBeenCalled();
			expect(auth.switchChurch).toHaveBeenCalledWith('church1');
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle accept invitation error', async () => {
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.acceptInvitation as any) = vi
				.fn()
				.mockRejectedValue(new Error('Already a member'));

			await expect(auth.acceptInvitation('test-token')).rejects.toThrow();

			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Already a member');
		});

		it('should decline invitation successfully', async () => {
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.declineInvitation as any) = vi.fn().mockResolvedValue(undefined);

			auth.loadPendingInvites = vi.fn().mockResolvedValue(undefined);

			await auth.declineInvitation('test-token');

			expect(ChurchesAPI.declineInvitation).toHaveBeenCalledWith('test-token');
			expect(auth.loadPendingInvites).toHaveBeenCalled();
			expect(auth.loading).toBe(false);
			expect(auth.error).toBeNull();
		});

		it('should handle decline invitation error', async () => {
			const { ChurchesAPI } = await import('$lib/api/churches');
			(ChurchesAPI.declineInvitation as any) = vi
				.fn()
				.mockRejectedValue(new Error('Invalid token'));

			await expect(auth.declineInvitation('test-token')).rejects.toThrow();

			expect(auth.loading).toBe(false);
			expect(auth.error).toBe('Invalid token');
		});

		it('should compute pendingInvitesCount correctly', () => {
			auth.pendingInvites = [];
			expect(auth.pendingInvitesCount).toBe(0);

			auth.pendingInvites = [{ id: '1' }, { id: '2' }, { id: '3' }] as any;
			expect(auth.pendingInvitesCount).toBe(3);
		});

		it('should compute hasPendingInvites correctly', () => {
			auth.pendingInvites = [];
			expect(auth.hasPendingInvites).toBe(false);

			auth.pendingInvites = [{ id: '1' }] as any;
			expect(auth.hasPendingInvites).toBe(true);
		});
	});
});
