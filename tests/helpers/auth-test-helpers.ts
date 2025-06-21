import { vi } from 'vitest';
import { mockPb } from './pb-mock';
import type { User, Profile } from '$lib/types/auth';

/**
 * Helper functions for setting up authentication test scenarios
 */

export interface MockAuthState {
	user: User | null;
	profile: Profile | null;
	token: string;
	isValid: boolean;
}

/**
 * Mock a successful authentication state
 */
export function mockAuthenticatedUser(
	options: {
		userId?: string;
		email?: string;
		name?: string;
		profileName?: string;
		role?: 'musician' | 'leader' | 'admin';
		churchName?: string;
		isActive?: boolean;
	} = {}
): MockAuthState {
	const userId = options.userId || 'test-user-id';
	const email = options.email || 'test@example.com';

	const mockUser: User = {
		id: userId,
		email,
		name: options.name || 'Test User',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		verified: true,
		avatar: '',
		emailVisibility: false
	};

	const mockProfile: Profile = {
		id: 'test-profile-id',
		user_id: userId,
		name: options.profileName || options.name || 'Test User',
		role: options.role || 'musician',
		church_name: options.churchName || 'Test Church',
		is_active: options.isActive !== false,
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z'
	};

	const mockState: MockAuthState = {
		user: mockUser,
		profile: mockProfile,
		token: 'mock-auth-token',
		isValid: true
	};

	// Set up PocketBase auth store mocks
	mockPb.authStore.model = mockUser;
	mockPb.authStore.token = mockState.token;
	mockPb.authStore.isValid = mockState.isValid;

	return mockState;
}

/**
 * Mock an unauthenticated state
 */
export function mockUnauthenticatedUser(): MockAuthState {
	const mockState: MockAuthState = {
		user: null,
		profile: null,
		token: '',
		isValid: false
	};

	// Set up PocketBase auth store mocks
	mockPb.authStore.model = null;
	mockPb.authStore.token = '';
	mockPb.authStore.isValid = false;

	return mockState;
}

/**
 * Mock successful login operation
 */
export function mockSuccessfulLogin(user?: Partial<User>, profile?: Partial<Profile>) {
	const mockUser = {
		id: 'user1',
		email: 'test@example.com',
		name: 'Test User',
		...user
	};

	const mockProfile = {
		id: 'profile1',
		user_id: mockUser.id,
		name: 'Test User',
		role: 'musician' as const,
		church_name: 'Test Church',
		is_active: true,
		...profile
	};

	const usersCollection = mockPb.collection('users');
	const profilesCollection = mockPb.collection('profiles');

	usersCollection.authWithPassword = vi.fn().mockResolvedValue({
		record: mockUser
	});

	profilesCollection.getList = vi.fn().mockResolvedValue({
		items: [mockProfile]
	});

	return { mockUser, mockProfile };
}

/**
 * Mock failed login operation
 */
export function mockFailedLogin(errorMessage = 'Invalid credentials') {
	const mockError = {
		response: {
			data: { message: errorMessage }
		}
	};

	const usersCollection = mockPb.collection('users');
	usersCollection.authWithPassword = vi.fn().mockRejectedValue(mockError);

	return mockError;
}

/**
 * Mock successful registration operation
 */
export function mockSuccessfulRegistration(
	userData?: Partial<User>,
	profileData?: Partial<Profile>
) {
	const mockUser = {
		id: 'user1',
		email: 'newuser@example.com',
		name: 'New User',
		...userData
	};

	const mockProfile = {
		id: 'profile1',
		user_id: mockUser.id,
		name: 'New User',
		role: 'musician' as const,
		church_name: 'Test Church',
		is_active: true,
		...profileData
	};

	const usersCollection = mockPb.collection('users');
	const profilesCollection = mockPb.collection('profiles');

	usersCollection.create = vi.fn().mockResolvedValue(mockUser);
	usersCollection.authWithPassword = vi.fn().mockResolvedValue({
		record: mockUser
	});
	profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

	return { mockUser, mockProfile };
}

/**
 * Mock failed registration operation
 */
export function mockFailedRegistration(errorMessage = 'Registration failed', field = 'email') {
	const mockError = {
		response: {
			data: {
				data: {
					[field]: { message: errorMessage }
				}
			}
		}
	};

	const usersCollection = mockPb.collection('users');
	usersCollection.create = vi.fn().mockRejectedValue(mockError);

	return mockError;
}

/**
 * Mock successful profile update operation
 */
export function mockSuccessfulProfileUpdate(
	userUpdates?: Partial<User>,
	profileUpdates?: Partial<Profile>
) {
	const usersCollection = mockPb.collection('users');
	const profilesCollection = mockPb.collection('profiles');

	if (userUpdates) {
		usersCollection.update = vi.fn().mockResolvedValue({
			id: 'user1',
			email: 'test@example.com',
			name: 'Test User',
			...userUpdates
		});
	}

	if (profileUpdates) {
		profilesCollection.update = vi.fn().mockResolvedValue({
			id: 'profile1',
			user_id: 'user1',
			name: 'Test User',
			role: 'musician',
			church_name: 'Test Church',
			is_active: true,
			...profileUpdates
		});
	}
}

/**
 * Mock failed profile update operation
 */
export function mockFailedProfileUpdate(errorMessage = 'Update failed') {
	const mockError = {
		response: {
			data: { message: errorMessage }
		}
	};

	const usersCollection = mockPb.collection('users');
	const profilesCollection = mockPb.collection('profiles');

	usersCollection.update = vi.fn().mockRejectedValue(mockError);
	profilesCollection.update = vi.fn().mockRejectedValue(mockError);

	return mockError;
}

/**
 * Mock successful password change operation
 */
export function mockSuccessfulPasswordChange(currentPassword = 'currentpass') {
	const usersCollection = mockPb.collection('users');

	// Mock verification of current password
	usersCollection.authWithPassword = vi.fn().mockResolvedValue({
		record: { id: 'user1', email: 'test@example.com' }
	});

	// Mock password update
	usersCollection.update = vi.fn().mockResolvedValue({
		id: 'user1',
		email: 'test@example.com'
	});
}

/**
 * Mock failed password change operation
 */
export function mockFailedPasswordChange(
	reason: 'invalid_current' | 'update_failed' = 'invalid_current'
) {
	const usersCollection = mockPb.collection('users');

	if (reason === 'invalid_current') {
		usersCollection.authWithPassword = vi.fn().mockRejectedValue({
			response: { status: 400 }
		});
	} else {
		usersCollection.authWithPassword = vi.fn().mockResolvedValue({
			record: { id: 'user1', email: 'test@example.com' }
		});
		usersCollection.update = vi.fn().mockRejectedValue(new Error('Update failed'));
	}
}

/**
 * Mock password reset operations
 */
export function mockPasswordReset() {
	const usersCollection = mockPb.collection('users');

	usersCollection.requestPasswordReset = vi.fn().mockResolvedValue({});
	usersCollection.confirmPasswordReset = vi.fn().mockResolvedValue({});
}

/**
 * Mock failed password reset operations
 */
export function mockFailedPasswordReset(
	operation: 'request' | 'confirm',
	errorMessage = 'Reset failed'
) {
	const mockError = {
		response: {
			data: { message: errorMessage }
		}
	};

	const usersCollection = mockPb.collection('users');

	if (operation === 'request') {
		usersCollection.requestPasswordReset = vi.fn().mockRejectedValue(mockError);
	} else {
		usersCollection.confirmPasswordReset = vi.fn().mockRejectedValue(mockError);
	}

	return mockError;
}

/**
 * Mock token refresh operations
 */
export function mockTokenRefresh(shouldSucceed = true) {
	const usersCollection = mockPb.collection('users');

	if (shouldSucceed) {
		usersCollection.authRefresh = vi.fn().mockResolvedValue({});
	} else {
		usersCollection.authRefresh = vi.fn().mockRejectedValue(new Error('Token expired'));
	}
}

/**
 * Reset all auth-related mocks
 */
export function resetAuthMocks() {
	mockPb.reset();

	// Reset auth store state
	mockPb.authStore.model = null;
	mockPb.authStore.token = '';
	mockPb.authStore.isValid = false;
}

/**
 * Create a complete test user with all necessary data
 */
export function createTestUser(
	role: 'musician' | 'leader' | 'admin' = 'musician',
	overrides: {
		user?: Partial<User>;
		profile?: Partial<Profile>;
	} = {}
) {
	const testUser: User = {
		id: 'test-user-id',
		email: 'test@example.com',
		name: 'Test User',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		verified: true,
		avatar: '',
		emailVisibility: false,
		...overrides.user
	};

	const testProfile: Profile = {
		id: 'test-profile-id',
		user_id: testUser.id,
		name: 'Test User',
		role,
		church_name: 'Test Church',
		is_active: true,
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		...overrides.profile
	};

	return { testUser, testProfile };
}

/**
 * Simulate auth store state changes for testing reactive behavior
 */
export function simulateAuthStateChange(newState: Partial<MockAuthState>) {
	if (newState.user !== undefined) {
		mockPb.authStore.model = newState.user;
	}
	if (newState.token !== undefined) {
		mockPb.authStore.token = newState.token;
	}
	if (newState.isValid !== undefined) {
		mockPb.authStore.isValid = newState.isValid;
	}

	// Trigger onChange callback if it exists
	const onChange = mockPb.authStore.onChange.mock.calls[0]?.[0];
	if (onChange) {
		onChange();
	}
}
