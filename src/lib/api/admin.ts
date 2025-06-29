import type PocketBase from 'pocketbase';
import type { User, UserWithMembership } from '$lib/types/auth';
import type { ChurchMembership } from '$lib/types/church';

// Re-export types for convenience
export type { UserWithMembership };

export interface UserListResponse {
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
	items: UserWithMembership[];
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

export interface AdminAPI {
	getAdminStats(): Promise<AdminStats>;
	getUsers(
		page?: number,
		perPage?: number,
		filter?: string,
		sort?: string
	): Promise<UserListResponse>;
	searchUsers(query: string, page?: number, perPage?: number): Promise<UserListResponse>;
	getUsersByRole(role: string, page?: number, perPage?: number): Promise<UserListResponse>;
	updateUser(userId: string, userData: Partial<User>): Promise<User>;
	updateUserMembership(
		membershipId: string,
		membershipData: Partial<ChurchMembership>
	): Promise<ChurchMembership>;
	deactivateUser(userId: string): Promise<void>;
	reactivateUser(userId: string): Promise<void>;
	deleteUser(userId: string): Promise<void>;
	changeUserRole(userId: string, newRole: 'musician' | 'leader' | 'admin'): Promise<void>;
	getUserActivity(userId: string): Promise<{
		lastLogin?: string;
		servicesCreated: number;
		songsAdded: number;
	}>;
}

// Export individual functions from the API
export const getAdminStats = (pb: PocketBase) => createAdminAPI(pb).getAdminStats;
export const getUsers = (pb: PocketBase) => createAdminAPI(pb).getUsers;
export const searchUsers = (pb: PocketBase) => createAdminAPI(pb).searchUsers;
export const getUsersByRole = (pb: PocketBase) => createAdminAPI(pb).getUsersByRole;
export const updateUser = (pb: PocketBase) => createAdminAPI(pb).updateUser;
export const updateUserMembership = (pb: PocketBase) => createAdminAPI(pb).updateUserMembership;
export const deactivateUser = (pb: PocketBase) => createAdminAPI(pb).deactivateUser;
export const reactivateUser = (pb: PocketBase) => createAdminAPI(pb).reactivateUser;
export const deleteUser = (pb: PocketBase) => createAdminAPI(pb).deleteUser;
export const changeUserRole = (pb: PocketBase) => createAdminAPI(pb).changeUserRole;
export const getUserActivity = (pb: PocketBase) => createAdminAPI(pb).getUserActivity;

export function createAdminAPI(pb: PocketBase): AdminAPI {
	return {
		/**
		 * Get admin dashboard statistics
		 */
		async getAdminStats(): Promise<AdminStats> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				// Get church memberships with role breakdown for the current church
				const memberships = await pb.collection('church_memberships').getFullList({
					filter: `church_id = "${currentChurchId}"`,
					fields: 'role,is_active,created'
				});

				// Calculate statistics - total users is now church members only
				const totalUsers = memberships.length;
				const activeUsers = memberships.filter((m) => m.is_active !== false).length;
				const inactiveUsers = memberships.filter((m) => m.is_active === false).length;

				const usersByRole = {
					admin: memberships.filter((m) => m.role === 'admin').length,
					leader: memberships.filter((m) => m.role === 'leader').length,
					musician: memberships.filter((m) => m.role === 'musician').length
				};

				// Users created in last 30 days
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				const recentlyCreated = memberships.filter(
					(m) => new Date(m.created) > thirtyDaysAgo
				).length;

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
		},

		/**
		 * Get paginated list of all users with their profiles
		 */
		async getUsers(
			page: number = 1,
			perPage: number = 20,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			filter: string = '',
			sort: string = '-joined_date'
		): Promise<UserListResponse> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				// First get church memberships for the current church
				const memberships = await pb.collection('church_memberships').getList(page, perPage, {
					filter: `church_id = "${currentChurchId}"`,
					sort,
					expand: 'user_id'
				});

				// Extract users from memberships
				const usersWithMemberships: UserWithMembership[] = memberships.items
					.filter((m) => m.expand?.user_id)
					.map(
						(membership) =>
							({
								...membership.expand!.user_id,
								membership: membership
							}) as unknown as UserWithMembership
					);

				return {
					page: memberships.page,
					perPage: memberships.perPage,
					totalPages: memberships.totalPages,
					totalItems: memberships.totalItems,
					items: usersWithMemberships
				};
			} catch (error) {
				console.error('Failed to get users:', error);
				throw error;
			}
		},

		/**
		 * Search users by email, name, or church
		 */
		async searchUsers(
			query: string,
			page: number = 1,
			perPage: number = 20
		): Promise<UserListResponse> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				// Search for users first
				const users = await pb.collection('users').getFullList({
					filter: query.trim() ? `email ~ "${query}" || name ~ "${query}"` : '',
					fields: 'id,email,name,verified,created,updated'
				});

				if (users.length === 0) {
					return {
						page: 1,
						perPage,
						totalPages: 0,
						totalItems: 0,
						items: []
					};
				}

				// Get memberships for found users in the current church
				const userIds = users.map((u) => u.id);
				const memberships = await pb.collection('church_memberships').getList(page, perPage, {
					filter: `church_id = "${currentChurchId}" && (${userIds.map((id) => `user_id = "${id}"`).join(' || ')})`,
					expand: 'user_id'
				});

				// Combine users with memberships
				const usersWithMemberships: UserWithMembership[] = memberships.items
					.filter((m) => m.expand?.user_id)
					.map(
						(membership) =>
							({
								...membership.expand!.user_id,
								membership: membership
							}) as unknown as UserWithMembership
					);

				return {
					page: memberships.page,
					perPage: memberships.perPage,
					totalPages: memberships.totalPages,
					totalItems: memberships.totalItems,
					items: usersWithMemberships
				};
			} catch (error) {
				console.error('Failed to search users:', error);
				throw error;
			}
		},

		/**
		 * Filter users by role
		 */
		async getUsersByRole(
			role: string,
			page: number = 1,
			perPage: number = 20
		): Promise<UserListResponse> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				const memberships = await pb.collection('church_memberships').getList(page, perPage, {
					filter: `church_id = "${currentChurchId}" && role = "${role}"`,
					sort: '-joined_date'
				});

				// Get users for these memberships
				const userIds = memberships.items.map((m) => m.user_id);
				const users =
					userIds.length > 0
						? await pb.collection('users').getFullList({
								filter: userIds.map((id) => `id = "${id}"`).join(' || '),
								fields: 'id,email,name,verified,created,updated'
							})
						: [];

				// Combine users with memberships
				const usersWithMemberships: UserWithMembership[] = users.map(
					(user) =>
						({
							...user,
							membership: memberships.items.find((m) => m.user_id === user.id)
						}) as unknown as UserWithMembership
				);

				return {
					page: memberships.page,
					perPage: memberships.perPage,
					totalPages: memberships.totalPages,
					totalItems: memberships.totalItems,
					items: usersWithMemberships
				};
			} catch (error) {
				console.error('Failed to get users by role:', error);
				throw error;
			}
		},

		/**
		 * Update user account information
		 */
		async updateUser(userId: string, userData: Partial<User>): Promise<User> {
			try {
				const updatedUser = await pb.collection('users').update(userId, userData);
				return updatedUser as unknown as User;
			} catch (error) {
				console.error('Failed to update user:', error);
				throw error;
			}
		},

		/**
		 * Update user membership information
		 */
		async updateUserMembership(
			membershipId: string,
			membershipData: Partial<ChurchMembership>
		): Promise<ChurchMembership> {
			try {
				const updatedMembership = await pb
					.collection('church_memberships')
					.update(membershipId, membershipData);
				return updatedMembership as unknown as ChurchMembership;
			} catch (error) {
				console.error('Failed to update user membership:', error);
				throw error;
			}
		},

		/**
		 * Deactivate a user account
		 */
		async deactivateUser(userId: string): Promise<void> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				const memberships = await pb.collection('church_memberships').getList(1, 1, {
					filter: `user_id = "${userId}" && church_id = "${currentChurchId}"`
				});

				if (memberships.items.length > 0) {
					const membership = memberships.items[0];
					await pb.collection('church_memberships').update(membership.id, {
						is_active: false
					});
				}
			} catch (error) {
				console.error('Failed to deactivate user:', error);
				throw error;
			}
		},

		/**
		 * Reactivate a user account
		 */
		async reactivateUser(userId: string): Promise<void> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				const memberships = await pb.collection('church_memberships').getList(1, 1, {
					filter: `user_id = "${userId}" && church_id = "${currentChurchId}"`
				});

				if (memberships.items.length > 0) {
					const membership = memberships.items[0];
					await pb.collection('church_memberships').update(membership.id, {
						is_active: true
					});
				}
			} catch (error) {
				console.error('Failed to reactivate user:', error);
				throw error;
			}
		},

		/**
		 * Delete a user account and their profile
		 */
		async deleteUser(userId: string): Promise<void> {
			try {
				// First delete all church memberships for this user
				const memberships = await pb.collection('church_memberships').getFullList({
					filter: `user_id = "${userId}"`
				});

				for (const membership of memberships) {
					await pb.collection('church_memberships').delete(membership.id);
				}

				// Then delete the user
				await pb.collection('users').delete(userId);
			} catch (error) {
				console.error('Failed to delete user:', error);
				throw error;
			}
		},

		/**
		 * Change user role
		 */
		async changeUserRole(userId: string, newRole: 'musician' | 'leader' | 'admin'): Promise<void> {
			try {
				// Get current user
				const currentUser = pb.authStore.model;
				if (!currentUser?.id) {
					throw new Error('User not authenticated');
				}

				// Get current user's active church membership
				const userMembership = await pb
					.collection('church_memberships')
					.getFirstListItem(
						`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
						{ expand: 'church_id' }
					);

				if (!userMembership?.church_id) {
					throw new Error('No current church selected');
				}

				const currentChurchId = userMembership.church_id;

				const memberships = await pb.collection('church_memberships').getList(1, 1, {
					filter: `user_id = "${userId}" && church_id = "${currentChurchId}"`
				});

				if (memberships.items.length > 0) {
					const membership = memberships.items[0];
					await pb.collection('church_memberships').update(membership.id, {
						role: newRole
					});
				} else {
					throw new Error('User membership not found in current church');
				}
			} catch (error) {
				console.error('Failed to change user role:', error);
				throw error;
			}
		},

		/**
		 * Get user activity/usage statistics
		 */
		async getUserActivity(userId: string): Promise<{
			lastLogin?: string;
			servicesCreated: number;
			songsAdded: number;
		}> {
			try {
				// Note: PocketBase doesn't track last login by default
				// You would need to implement this in your auth flow

				// Get services created by this user
				const services = await pb.collection('services').getList(1, 1, {
					filter: `created_by = "${userId}"`,
					fields: 'id'
				});

				// Get songs added by this user
				const songs = await pb.collection('songs').getList(1, 1, {
					filter: `created_by = "${userId}"`,
					fields: 'id'
				});

				return {
					servicesCreated: services.totalItems,
					songsAdded: songs.totalItems
				};
			} catch (error) {
				console.error('Failed to get user activity:', error);
				return {
					servicesCreated: 0,
					songsAdded: 0
				};
			}
		}
	};
}
