import { pb } from './client';
import type { User, Profile } from '$lib/types/auth';

export interface UserWithProfile {
	id: string;
	email: string;
	name: string;
	verified: boolean;
	created: string;
	updated: string;
	profile?: Profile;
}

export interface UserListResponse {
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
	items: UserWithProfile[];
}

export interface AdminStats {
	totalUsers: number;
	activeUsers: number;
	inactiveUsers: number;
	usersByRole: {
		admin: number;
		leader: number;
		musician: number;
	};
	recentlyCreated: number; // Users created in last 30 days
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
	try {
		// Get total users count
		const usersCount = await pb.collection('users').getList(1, 1, {
			fields: 'id'
		});

		// Get profiles with role breakdown
		const profiles = await pb.collection('profiles').getFullList({
			fields: 'role,is_active,created'
		});

		// Calculate statistics
		const totalUsers = usersCount.totalItems;
		const activeUsers = profiles.filter(p => p.is_active !== false).length;
		const inactiveUsers = profiles.filter(p => p.is_active === false).length;

		const usersByRole = {
			admin: profiles.filter(p => p.role === 'admin').length,
			leader: profiles.filter(p => p.role === 'leader').length,
			musician: profiles.filter(p => p.role === 'musician').length
		};

		// Users created in last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const recentlyCreated = profiles.filter(p => new Date(p.created) > thirtyDaysAgo).length;

		return {
			totalUsers,
			activeUsers,
			inactiveUsers,
			usersByRole,
			recentlyCreated
		};
	} catch (error) {
		console.error('Failed to get admin stats:', error);
		throw error;
	}
}

/**
 * Get paginated list of all users with their profiles
 */
export async function getUsers(
	page: number = 1,
	perPage: number = 20,
	filter: string = '',
	sort: string = '-created'
): Promise<UserListResponse> {
	try {
		// Get users with pagination
		const users = await pb.collection('users').getList(page, perPage, {
			filter,
			sort,
			fields: 'id,email,name,verified,created,updated'
		});

		// Get profiles for all users in this page
		const userIds = users.items.map(user => user.id);
		const profiles = userIds.length > 0 
			? await pb.collection('profiles').getFullList({
				filter: userIds.map(id => `user_id = "${id}"`).join(' || ')
			})
			: [];

		// Combine users with their profiles
		const usersWithProfiles: UserWithProfile[] = users.items.map(user => ({
			...user,
			profile: profiles.find(p => p.user_id === user.id)
		}));

		return {
			page: users.page,
			perPage: users.perPage,
			totalPages: users.totalPages,
			totalItems: users.totalItems,
			items: usersWithProfiles
		};
	} catch (error) {
		console.error('Failed to get users:', error);
		throw error;
	}
}

/**
 * Search users by email, name, or church
 */
export async function searchUsers(
	query: string,
	page: number = 1,
	perPage: number = 20
): Promise<UserListResponse> {
	const filter = query.trim() ? 
		`email ~ "${query}" || name ~ "${query}"` : '';
	
	return getUsers(page, perPage, filter);
}

/**
 * Filter users by role
 */
export async function getUsersByRole(
	role: string,
	page: number = 1,
	perPage: number = 20
): Promise<UserListResponse> {
	try {
		// First get profiles with the specified role
		const profiles = await pb.collection('profiles').getList(page, perPage, {
			filter: `role = "${role}"`,
			sort: '-created'
		});

		// Get users for these profiles
		const userIds = profiles.items.map(p => p.user_id);
		const users = userIds.length > 0 
			? await pb.collection('users').getFullList({
				filter: userIds.map(id => `id = "${id}"`).join(' || '),
				fields: 'id,email,name,verified,created,updated'
			})
			: [];

		// Combine users with profiles
		const usersWithProfiles: UserWithProfile[] = users.map(user => ({
			...user,
			profile: profiles.items.find(p => p.user_id === user.id)
		}));

		return {
			page: profiles.page,
			perPage: profiles.perPage,
			totalPages: profiles.totalPages,
			totalItems: profiles.totalItems,
			items: usersWithProfiles
		};
	} catch (error) {
		console.error('Failed to get users by role:', error);
		throw error;
	}
}

/**
 * Update user account information
 */
export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
	try {
		const updatedUser = await pb.collection('users').update(userId, userData);
		return updatedUser as User;
	} catch (error) {
		console.error('Failed to update user:', error);
		throw error;
	}
}

/**
 * Update user profile information
 */
export async function updateUserProfile(profileId: string, profileData: Partial<Profile>): Promise<Profile> {
	try {
		const updatedProfile = await pb.collection('profiles').update(profileId, profileData);
		return updatedProfile as Profile;
	} catch (error) {
		console.error('Failed to update user profile:', error);
		throw error;
	}
}

/**
 * Deactivate a user account
 */
export async function deactivateUser(userId: string): Promise<void> {
	try {
		// Get user's profile
		const profiles = await pb.collection('profiles').getList(1, 1, {
			filter: `user_id = "${userId}"`
		});

		if (profiles.items.length > 0) {
			const profile = profiles.items[0];
			await pb.collection('profiles').update(profile.id, {
				is_active: false
			});
		}
	} catch (error) {
		console.error('Failed to deactivate user:', error);
		throw error;
	}
}

/**
 * Reactivate a user account
 */
export async function reactivateUser(userId: string): Promise<void> {
	try {
		// Get user's profile
		const profiles = await pb.collection('profiles').getList(1, 1, {
			filter: `user_id = "${userId}"`
		});

		if (profiles.items.length > 0) {
			const profile = profiles.items[0];
			await pb.collection('profiles').update(profile.id, {
				is_active: true
			});
		}
	} catch (error) {
		console.error('Failed to reactivate user:', error);
		throw error;
	}
}

/**
 * Delete a user account and their profile
 */
export async function deleteUser(userId: string): Promise<void> {
	try {
		// First delete the profile
		const profiles = await pb.collection('profiles').getList(1, 1, {
			filter: `user_id = "${userId}"`
		});

		if (profiles.items.length > 0) {
			await pb.collection('profiles').delete(profiles.items[0].id);
		}

		// Then delete the user
		await pb.collection('users').delete(userId);
	} catch (error) {
		console.error('Failed to delete user:', error);
		throw error;
	}
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, newRole: 'musician' | 'leader' | 'admin'): Promise<void> {
	try {
		// Get user's profile
		const profiles = await pb.collection('profiles').getList(1, 1, {
			filter: `user_id = "${userId}"`
		});

		if (profiles.items.length > 0) {
			const profile = profiles.items[0];
			await pb.collection('profiles').update(profile.id, {
				role: newRole
			});
		} else {
			throw new Error('User profile not found');
		}
	} catch (error) {
		console.error('Failed to change user role:', error);
		throw error;
	}
}

/**
 * Get user activity/usage statistics
 */
export async function getUserActivity(userId: string): Promise<{
	lastLogin?: string;
	setlistsCreated: number;
	songsAdded: number;
}> {
	try {
		// Note: PocketBase doesn't track last login by default
		// You would need to implement this in your auth flow
		
		// Get setlists created by this user
		const setlists = await pb.collection('setlists').getList(1, 1, {
			filter: `created_by = "${userId}"`,
			fields: 'id'
		});

		// Get songs added by this user
		const songs = await pb.collection('songs').getList(1, 1, {
			filter: `created_by = "${userId}"`,
			fields: 'id'
		});

		return {
			setlistsCreated: setlists.totalItems,
			songsAdded: songs.totalItems
		};
	} catch (error) {
		console.error('Failed to get user activity:', error);
		return {
			setlistsCreated: 0,
			songsAdded: 0
		};
	}
}