import type PocketBase from 'pocketbase';
import type { AuthContext, User, UserWithMembership } from '$lib/types/auth';
import type { ChurchMembership } from '$lib/types/church';

export interface MemberListResponse {
	page: number;
	perPage: number;
	totalPages: number;
	totalItems: number;
	items: UserWithMembership[];
}

export interface MemberStats {
	totalMembers: number;
	activeMembers: number;
	inactiveMembers: number;
	recentlyJoined: number; // Members joined in last 30 days
}

export class MembersAPI {
	private pb: PocketBase;
	private authContext: AuthContext;

	constructor(authContext: AuthContext, pb: PocketBase) {
		this.authContext = authContext;
		this.pb = pb;
	}

	/**
	 * Get members statistics for the current church
	 */
	async getStats(): Promise<MemberStats> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		const memberships = await this.pb.collection('church_memberships').getFullList({
			filter: `church_id = "${churchId}"`,
			fields: 'is_active,created'
		});

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return {
			totalMembers: memberships.length,
			activeMembers: memberships.filter((m) => m.is_active !== false).length,
			inactiveMembers: memberships.filter((m) => m.is_active === false).length,
			recentlyJoined: memberships.filter((m) => new Date(m.created) > thirtyDaysAgo).length
		};
	}

	/**
	 * Get paginated list of members for the current church
	 */
	async getMembers(
		page: number = 1,
		perPage: number = 20,
		filter: string = '',
		sort: string = '-joined_date'
	): Promise<MemberListResponse> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		let membershipFilter = `church_id = "${churchId}"`;
		if (filter) {
			membershipFilter += ` && ${filter}`;
		}

		const memberships = await this.pb.collection('church_memberships').getList(page, perPage, {
			filter: membershipFilter,
			sort,
			expand: 'user_id'
		});

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
	}

	/**
	 * Search members by email or name
	 */
	async searchMembers(
		query: string,
		page: number = 1,
		perPage: number = 20
	): Promise<MemberListResponse> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		// Search for users first
		const users = await this.pb.collection('users').getFullList({
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
		const memberships = await this.pb.collection('church_memberships').getList(page, perPage, {
			filter: `church_id = "${churchId}" && (${userIds.map((id) => `user_id = "${id}"`).join(' || ')})`,
			expand: 'user_id'
		});

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
	}

	/**
	 * Get members by active status
	 */
	async getMembersByStatus(
		isActive: boolean,
		page: number = 1,
		perPage: number = 20
	): Promise<MemberListResponse> {
		const filter = `is_active = ${isActive}`;
		return this.getMembers(page, perPage, filter);
	}

	/**
	 * Update a member's membership data
	 */
	async updateMember(
		membershipId: string,
		data: Partial<ChurchMembership>
	): Promise<ChurchMembership> {
		const updated = await this.pb.collection('church_memberships').update(membershipId, data);
		return updated as unknown as ChurchMembership;
	}

	/**
	 * Update a user's account data
	 */
	async updateUser(userId: string, data: Partial<User>): Promise<User> {
		const updated = await this.pb.collection('users').update(userId, data);
		return updated as unknown as User;
	}

	/**
	 * Deactivate a member (set is_active to false)
	 */
	async deactivateMember(userId: string): Promise<void> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		const memberships = await this.pb.collection('church_memberships').getList(1, 1, {
			filter: `user_id = "${userId}" && church_id = "${churchId}"`
		});

		if (memberships.items.length > 0) {
			await this.pb.collection('church_memberships').update(memberships.items[0].id, {
				is_active: false
			});
		}
	}

	/**
	 * Reactivate a member (set is_active to true)
	 */
	async reactivateMember(userId: string): Promise<void> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		const memberships = await this.pb.collection('church_memberships').getList(1, 1, {
			filter: `user_id = "${userId}" && church_id = "${churchId}"`
		});

		if (memberships.items.length > 0) {
			await this.pb.collection('church_memberships').update(memberships.items[0].id, {
				is_active: true
			});
		}
	}

	/**
	 * Remove a member from the church (delete membership)
	 */
	async removeMember(userId: string): Promise<void> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		// Find and delete the membership
		const memberships = await this.pb.collection('church_memberships').getFullList({
			filter: `user_id = "${userId}" && church_id = "${churchId}"`
		});

		for (const membership of memberships) {
			await this.pb.collection('church_memberships').delete(membership.id);
		}

		// Also clean up user roles and skills for this church
		const userRoles = await this.pb.collection('user_roles').getFullList({
			filter: `user_id = "${userId}" && church_id = "${churchId}"`
		});
		for (const role of userRoles) {
			await this.pb.collection('user_roles').delete(role.id);
		}

		const userSkills = await this.pb.collection('user_skills').getFullList({
			filter: `user_id = "${userId}" && church_id = "${churchId}"`
		});
		for (const skill of userSkills) {
			await this.pb.collection('user_skills').delete(skill.id);
		}
	}

	/**
	 * Toggle admin role for a member
	 */
	async toggleMemberAdmin(userId: string, isAdmin: boolean): Promise<void> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		// Find admin role definition
		const adminRole = await this.pb
			.collection('roles')
			.getFirstListItem(`church_id = "${churchId}" && slug = "admin"`);

		// Find existing assignment
		const existing = await this.pb.collection('user_roles').getList(1, 1, {
			filter: `church_id = "${churchId}" && user_id = "${userId}" && role_id = "${adminRole.id}"`
		});

		if (isAdmin && existing.totalItems === 0) {
			// Add role
			await this.pb.collection('user_roles').create({
				church_id: churchId,
				user_id: userId,
				role_id: adminRole.id
			});
		} else if (!isAdmin && existing.totalItems > 0) {
			// Remove role
			await this.pb.collection('user_roles').delete(existing.items[0].id);
		}
	}

	/**
	 * Toggle leader skill for a member
	 */
	async toggleMemberLeader(userId: string, isLeader: boolean): Promise<void> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		// Find leader skill definition
		const leaderSkill = await this.pb
			.collection('skills')
			.getFirstListItem(`church_id = "${churchId}" && slug = "leader"`);

		// Find existing assignment
		const existing = await this.pb.collection('user_skills').getList(1, 1, {
			filter: `church_id = "${churchId}" && user_id = "${userId}" && skill_id = "${leaderSkill.id}"`
		});

		if (isLeader && existing.totalItems === 0) {
			// Add skill
			await this.pb.collection('user_skills').create({
				church_id: churchId,
				user_id: userId,
				skill_id: leaderSkill.id
			});
		} else if (!isLeader && existing.totalItems > 0) {
			// Remove skill
			await this.pb.collection('user_skills').delete(existing.items[0].id);
		}
	}

	/**
	 * Get member's roles and skills status
	 */
	async getMemberRolesAndSkills(
		userId: string
	): Promise<{ isAdmin: boolean; isLeader: boolean }> {
		if (!this.authContext.currentChurch?.id) {
			throw new Error('No church selected');
		}

		const churchId = this.authContext.currentChurch.id;

		// Check Admin Role
		const adminRoles = await this.pb.collection('user_roles').getList(1, 1, {
			filter: `church_id = "${churchId}" && user_id = "${userId}" && role_id.slug = "admin"`
		});

		// Check Leader Skill
		const leaderSkills = await this.pb.collection('user_skills').getList(1, 1, {
			filter: `church_id = "${churchId}" && user_id = "${userId}" && skill_id.slug = "leader"`
		});

		return {
			isAdmin: adminRoles.totalItems > 0,
			isLeader: leaderSkills.totalItems > 0
		};
	}

	/**
	 * Subscribe to real-time updates for memberships
	 */
	subscribeToMembers(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb.collection('church_memberships').subscribe('*', callback, {
			filter: `church_id = "${this.authContext.currentChurch.id}"`
		});
	}
}

// Factory function for creating MembersAPI instances
export function createMembersAPI(authContext: AuthContext, pb: PocketBase): MembersAPI {
	return new MembersAPI(authContext, pb);
}
