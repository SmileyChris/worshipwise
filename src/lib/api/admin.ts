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

export interface RoleCount {
	roleId: string;
	roleName: string;
	roleSlug: string;
	count: number;
}

export interface AdminStats {
	totalUsers: number;
	activeUsers: number;
	inactiveUsers: number;
	roleCounts: RoleCount[];
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
	// Deprecated: Use toggleUserAdmin/toggleUserLeader instead
	changeUserRole(userId: string, newRole: 'musician' | 'leader' | 'admin'): Promise<void>;
	
	// New Permission Methods
	getUserRolesAndSkills(userId: string): Promise<{ isAdmin: boolean; isLeader: boolean }>;
	toggleUserAdmin(userId: string, isAdmin: boolean): Promise<void>;
	toggleUserLeader(userId: string, isLeader: boolean): Promise<void>;
	
	getUserActivity(userId: string): Promise<{
		lastLogin?: string;
		servicesCreated: number;
		songsAdded: number;
	}>;
}

// Export individual functions from the API
export const getAdminStats = (pb: PocketBase) => createAdminAPI(pb).getAdminStats();
export const getUsers = (pb: PocketBase, page?: number, perPage?: number, filter?: string, sort?: string) => createAdminAPI(pb).getUsers(page, perPage, filter, sort);
export const searchUsers = (pb: PocketBase, query: string, page?: number, perPage?: number) => createAdminAPI(pb).searchUsers(query, page, perPage);
export const getUsersByRole = (pb: PocketBase, role: string, page?: number, perPage?: number) => createAdminAPI(pb).getUsersByRole(role, page, perPage);
export const updateUser = (pb: PocketBase, userId: string, userData: Partial<User>) => createAdminAPI(pb).updateUser(userId, userData);
export const updateUserMembership = (pb: PocketBase, membershipId: string, membershipData: Partial<ChurchMembership>) => createAdminAPI(pb).updateUserMembership(membershipId, membershipData);
export const deactivateUser = (pb: PocketBase, userId: string) => createAdminAPI(pb).deactivateUser(userId);
export const reactivateUser = (pb: PocketBase, userId: string) => createAdminAPI(pb).reactivateUser(userId);
export const deleteUser = (pb: PocketBase, userId: string) => createAdminAPI(pb).deleteUser(userId);
export const changeUserRole = (pb: PocketBase, userId: string, newRole: 'musician' | 'leader' | 'admin') => createAdminAPI(pb).changeUserRole(userId, newRole);
export const getUserRolesAndSkills = (pb: PocketBase, userId: string) => createAdminAPI(pb).getUserRolesAndSkills(userId);
export const toggleUserAdmin = (pb: PocketBase, userId: string, isAdmin: boolean) => createAdminAPI(pb).toggleUserAdmin(userId, isAdmin);
export const toggleUserLeader = (pb: PocketBase, userId: string, isLeader: boolean) => createAdminAPI(pb).toggleUserLeader(userId, isLeader);
export const getUserActivity = (pb: PocketBase, userId: string) => createAdminAPI(pb).getUserActivity(userId);

export function createAdminAPI(pb: PocketBase): AdminAPI {
	// Helper to get current church ID
	const getCurrentChurchId = async () => {
		const currentUser = pb.authStore.model;
		if (!currentUser?.id) throw new Error('User not authenticated');

		const userMembership = await pb
			.collection('church_memberships')
			.getFirstListItem(
				`user_id = "${currentUser.id}" && status = "active" && is_active = true`,
				{ fields: 'church_id' }
			);

		if (!userMembership?.church_id) throw new Error('No current church selected');
		return userMembership.church_id;
	};

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

				// Get church memberships for the current church
				const memberships = await pb.collection('church_memberships').getFullList({
					filter: `church_id = "${currentChurchId}"`,
					fields: 'is_active,created'
				});

				// Calculate statistics - total users is now church members only
				const totalUsers = memberships.length;
				const activeUsers = memberships.filter((m) => m.is_active !== false).length;
				const inactiveUsers = memberships.filter((m) => m.is_active === false).length;

				// Get roles for this church
				const roles = await pb.collection('roles').getFullList({
					filter: `church_id = "${currentChurchId}"`,
					fields: 'id,name,slug'
				});

				// Get user_roles to count users per role
				const userRoles = await pb.collection('user_roles').getFullList({
					filter: `church_id = "${currentChurchId}"`,
					fields: 'role_id'
				});

				// Count users per role
				const roleCounts: RoleCount[] = roles.map((role) => ({
					roleId: role.id,
					roleName: role.name,
					roleSlug: role.slug,
					count: userRoles.filter((ur) => ur.role_id === role.id).length
				}));

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
					roleCounts,
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
		 * Change user role (Deprecated compatibility layer)
		 */
		async changeUserRole(userId: string, newRole: 'musician' | 'leader' | 'admin'): Promise<void> {
			try {
				if (newRole === 'admin') {
					await this.toggleUserAdmin(userId, true);
					await this.toggleUserLeader(userId, false); // Optional: Admins don't strictly need leader skill removed, but matching old logic
				} else if (newRole === 'leader') {
					await this.toggleUserAdmin(userId, false);
					await this.toggleUserLeader(userId, true);
				} else {
					await this.toggleUserAdmin(userId, false);
					await this.toggleUserLeader(userId, false);
				}
			} catch (error) {
				console.error('Failed to change user role:', error);
				throw error;
			}
		},

		/**
		 * Get User Roles and Skills status
		 */
		async getUserRolesAndSkills(userId: string): Promise<{ isAdmin: boolean; isLeader: boolean }> {
			try {
				const churchId = await getCurrentChurchId();

				// Check Admin Role
				const adminRoles = await pb.collection('user_roles').getList(1, 1, {
					filter: `church_id = "${churchId}" && user_id = "${userId}" && role_id.slug = "admin"`
				});

				// Check Leader Skill
				const leaderSkills = await pb.collection('user_skills').getList(1, 1, {
					filter: `church_id = "${churchId}" && user_id = "${userId}" && skill_id.slug = "leader"`
				});

				return {
					isAdmin: adminRoles.totalItems > 0,
					isLeader: leaderSkills.totalItems > 0
				};
			} catch (error) {
				console.error('Failed to get user roles/skills:', error);
				return { isAdmin: false, isLeader: false };
			}
		},

		/**
		 * Toggle Admin Role
		 */
		async toggleUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
			try {
				const churchId = await getCurrentChurchId();
				
				// Find admin role definition
				const adminRole = await pb.collection('roles').getFirstListItem(`church_id = "${churchId}" && slug = "admin"`);

				// Find existing assignment
				const existing = await pb.collection('user_roles').getList(1, 1, {
					filter: `church_id = "${churchId}" && user_id = "${userId}" && role_id = "${adminRole.id}"`
				});

				if (isAdmin && existing.totalItems === 0) {
					// Add role
					await pb.collection('user_roles').create({
						church_id: churchId,
						user_id: userId,
						role_id: adminRole.id
					});
				} else if (!isAdmin && existing.totalItems > 0) {
					// Remove role
					await pb.collection('user_roles').delete(existing.items[0].id);
				}
			} catch (error) {
				console.error('Failed to toggle admin role:', error);
				throw error;
			}
		},

		/**
		 * Toggle Leader Skill
		 */
		async toggleUserLeader(userId: string, isLeader: boolean): Promise<void> {
			try {
				const churchId = await getCurrentChurchId();

				// Find leader skill definition
				const leaderSkill = await pb.collection('skills').getFirstListItem(`church_id = "${churchId}" && slug = "leader"`);

				// Find existing assignment
				const existing = await pb.collection('user_skills').getList(1, 1, {
					filter: `church_id = "${churchId}" && user_id = "${userId}" && skill_id = "${leaderSkill.id}"`
				});

				if (isLeader && existing.totalItems === 0) {
					// Add skill
					await pb.collection('user_skills').create({
						church_id: churchId,
						user_id: userId,
						skill_id: leaderSkill.id
					});
				} else if (!isLeader && existing.totalItems > 0) {
					// Remove skill
					await pb.collection('user_skills').delete(existing.items[0].id);
				}
			} catch (error) {
				console.error('Failed to toggle leader skill:', error);
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
