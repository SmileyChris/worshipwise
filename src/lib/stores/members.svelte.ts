import { createMembersAPI, type MembersAPI, type MemberListResponse, type MemberStats } from '$lib/api/members';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { AuthContext, UserWithMembership } from '$lib/types/auth';
import type { ChurchMembership } from '$lib/types/church';
import { getErrorMessage } from '$lib/utils/errors';

class MembersStore {
	// Reactive state using Svelte 5 runes
	members = $state<UserWithMembership[]>([]);
	stats = $state<MemberStats | null>(null);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Pagination state
	currentPage = $state<number>(1);
	totalPages = $state<number>(1);
	totalItems = $state<number>(0);
	perPage = $state<number>(20);

	// Filter state
	searchQuery = $state<string>('');
	statusFilter = $state<'all' | 'active' | 'inactive'>('all');

	// Track if initial load is complete
	private initialized = $state<boolean>(false);

	private membersApi: MembersAPI;

	// Support live auth store or static context
	private auth: RuntimeAuthStore | null = null;
	private staticContext: AuthContext | null = null;

	constructor(authInput: RuntimeAuthStore | AuthContext) {
		if (typeof (authInput as any).getAuthContext === 'function') {
			this.auth = authInput as RuntimeAuthStore;
		} else {
			this.staticContext = authInput as AuthContext;
		}

		// API reacts to auth changes
		this.membersApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createMembersAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Load members with current filters
	 */
	async loadMembers(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			let result: MemberListResponse;

			if (this.searchQuery.trim()) {
				result = await this.membersApi.searchMembers(
					this.searchQuery,
					this.currentPage,
					this.perPage
				);
			} else if (this.statusFilter !== 'all') {
				result = await this.membersApi.getMembersByStatus(
					this.statusFilter === 'active',
					this.currentPage,
					this.perPage
				);
			} else {
				result = await this.membersApi.getMembers(this.currentPage, this.perPage);
			}

			this.members = result.items;
			this.totalPages = result.totalPages;
			this.totalItems = result.totalItems;
			this.initialized = true;
		} catch (error) {
			console.error('Failed to load members:', error);
			this.error = getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load members only if not already loaded
	 */
	async loadMembersOnce(): Promise<void> {
		if (this.initialized) return;
		await this.loadMembers();
	}

	/**
	 * Load member statistics
	 */
	async loadStats(): Promise<void> {
		try {
			this.stats = await this.membersApi.getStats();
		} catch (error) {
			console.error('Failed to load member stats:', error);
		}
	}

	/**
	 * Search members by query
	 */
	async search(query: string): Promise<void> {
		this.searchQuery = query;
		this.currentPage = 1;
		await this.loadMembers();
	}

	/**
	 * Filter by status
	 */
	async filterByStatus(status: 'all' | 'active' | 'inactive'): Promise<void> {
		this.statusFilter = status;
		this.currentPage = 1;
		await this.loadMembers();
	}

	/**
	 * Clear all filters
	 */
	async clearFilters(): Promise<void> {
		this.searchQuery = '';
		this.statusFilter = 'all';
		this.currentPage = 1;
		await this.loadMembers();
	}

	/**
	 * Go to a specific page
	 */
	async goToPage(page: number): Promise<void> {
		this.currentPage = Math.max(1, Math.min(page, this.totalPages));
		await this.loadMembers();
	}

	/**
	 * Update a member's data
	 */
	async updateMember(
		membershipId: string,
		data: Partial<ChurchMembership>
	): Promise<ChurchMembership> {
		this.loading = true;
		this.error = null;

		try {
			const updated = await this.membersApi.updateMember(membershipId, data);

			// Update in local array
			const index = this.members.findIndex((m) => m.membership?.id === membershipId);
			if (index !== -1) {
				this.members[index] = {
					...this.members[index],
					membership: updated
				};
				this.members = [...this.members];
			}

			return updated;
		} catch (error) {
			console.error('Failed to update member:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Deactivate a member
	 */
	async deactivateMember(userId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.membersApi.deactivateMember(userId);

			// Update local state
			const index = this.members.findIndex((m) => m.id === userId);
			if (index !== -1 && this.members[index].membership) {
				this.members[index].membership!.is_active = false;
				this.members = [...this.members];
			}
		} catch (error) {
			console.error('Failed to deactivate member:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Reactivate a member
	 */
	async reactivateMember(userId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.membersApi.reactivateMember(userId);

			// Update local state
			const index = this.members.findIndex((m) => m.id === userId);
			if (index !== -1 && this.members[index].membership) {
				this.members[index].membership!.is_active = true;
				this.members = [...this.members];
			}
		} catch (error) {
			console.error('Failed to reactivate member:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Toggle member active status
	 */
	async toggleMemberActive(userId: string): Promise<void> {
		const member = this.members.find((m) => m.id === userId);
		if (!member) return;

		const isCurrentlyActive = member.membership?.is_active !== false;

		if (isCurrentlyActive) {
			await this.deactivateMember(userId);
		} else {
			await this.reactivateMember(userId);
		}
	}

	/**
	 * Remove a member from the church
	 */
	async removeMember(userId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.membersApi.removeMember(userId);

			// Remove from local array
			this.members = this.members.filter((m) => m.id !== userId);
			this.totalItems = Math.max(0, this.totalItems - 1);
		} catch (error) {
			console.error('Failed to remove member:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Toggle admin role for a member
	 */
	async toggleAdmin(userId: string, isAdmin: boolean): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.membersApi.toggleMemberAdmin(userId, isAdmin);
		} catch (error) {
			console.error('Failed to toggle admin:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Toggle leader skill for a member
	 */
	async toggleLeader(userId: string, isLeader: boolean): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.membersApi.toggleMemberLeader(userId, isLeader);
		} catch (error) {
			console.error('Failed to toggle leader:', error);
			this.error = getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Get member's roles and skills status
	 */
	async getMemberRolesAndSkills(
		userId: string
	): Promise<{ isAdmin: boolean; isLeader: boolean }> {
		try {
			return await this.membersApi.getMemberRolesAndSkills(userId);
		} catch (error) {
			console.error('Failed to get member roles/skills:', error);
			return { isAdmin: false, isLeader: false };
		}
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Subscribe to real-time updates
	 */
	async subscribeToUpdates(): Promise<() => void> {
		const unsubMembers = await this.membersApi.subscribeToMembers((data: unknown) => {
			const eventData = data as {
				action: string;
				record: ChurchMembership;
			};

			if (eventData.action === 'create' || eventData.action === 'update') {
				// Reload to get updated data with expanded user
				this.loadMembers();
			} else if (eventData.action === 'delete') {
				this.members = this.members.filter(
					(m) => m.membership?.id !== eventData.record.id
				);
			}
		});

		return () => {
			if (typeof unsubMembers === 'function') {
				unsubMembers();
			}
		};
	}

}

// Export the class type for tests
export type { MembersStore };

// Factory function for creating new store instances
export function createMembersStore(auth: RuntimeAuthStore | AuthContext): MembersStore {
	return new MembersStore(auth);
}
