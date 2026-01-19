import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMembersStore, type MembersStore } from './members.svelte';
import type { AuthContext, UserWithMembership } from '$lib/types/auth';
import type { ChurchMembership } from '$lib/types/church';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockAuthContext, mockUser, mockMembership } from '$tests/helpers/mock-builders';

describe('MembersStore', () => {
	let membersStore: MembersStore;
	let authContext: AuthContext;

	// Test data factories
	const mockMember = (overrides: Partial<UserWithMembership> = {}): UserWithMembership => {
		const user = mockUser(overrides);
		const membership = mockMembership({
			user_id: user.id,
			...overrides.membership
		});
		return {
			...user,
			membership,
			...overrides
		};
	};

	const createMembershipResponse = (members: UserWithMembership[], page = 1, perPage = 20) => ({
		items: members.map((m) => ({
			...m.membership,
			expand: { user_id: m }
		})),
		totalItems: members.length,
		totalPages: Math.ceil(members.length / perPage),
		page,
		perPage
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();

		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: { church_id: 'church-1' }
		});

		membersStore = createMembersStore(authContext);
	});

	describe('loadMembers', () => {
		it('should load members successfully', async () => {
			const members = [mockMember({ id: 'user-1' }), mockMember({ id: 'user-2' })];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			await membersStore.loadMembers();

			expect(membersStore.members).toHaveLength(2);
			expect(membersStore.loading).toBe(false);
			expect(membersStore.error).toBe(null);
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('church_memberships').getList.mockImplementation(async () => {
				expect(membersStore.loading).toBe(true);
				return createMembershipResponse([mockMember()]);
			});

			await membersStore.loadMembers();

			expect(membersStore.loading).toBe(false);
		});

		it('should handle errors when loading members', async () => {
			const error = new Error('Network error');
			mockPb.collection('church_memberships').getList.mockRejectedValue(error);

			await membersStore.loadMembers();

			expect(membersStore.members).toEqual([]);
			expect(membersStore.loading).toBe(false);
			expect(membersStore.error).toBe('Network error');
		});

		it('should update pagination state', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue({
				items: members.map((m) => ({ ...m.membership, expand: { user_id: m } })),
				totalItems: 50,
				totalPages: 3,
				page: 1,
				perPage: 20
			});

			await membersStore.loadMembers();

			expect(membersStore.totalItems).toBe(50);
			expect(membersStore.totalPages).toBe(3);
		});
	});

	describe('loadMembersOnce', () => {
		it('should only load members once', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			await membersStore.loadMembersOnce();
			const callCountAfterFirst = mockPb.collection('church_memberships').getList.mock.calls.length;

			await membersStore.loadMembersOnce();
			const callCountAfterSecond = mockPb.collection('church_memberships').getList.mock.calls.length;

			expect(callCountAfterSecond).toBe(callCountAfterFirst);
		});
	});

	describe('loadStats', () => {
		it('should load member statistics', async () => {
			const memberships = [
				{ is_active: true, created: new Date().toISOString() },
				{ is_active: true, created: new Date().toISOString() },
				{ is_active: false, created: new Date().toISOString() }
			];
			mockPb.collection('church_memberships').getFullList.mockResolvedValue(memberships);

			await membersStore.loadStats();

			expect(membersStore.stats).toEqual({
				totalMembers: 3,
				activeMembers: 2,
				inactiveMembers: 1,
				recentlyJoined: 3
			});
		});
	});

	describe('search', () => {
		it('should search members and reset page', async () => {
			const members = [mockMember({ name: 'John Doe' })];
			mockPb.collection('users').getFullList.mockResolvedValue([{ id: 'user-1' }]);
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			membersStore.currentPage = 3;
			await membersStore.search('John');

			expect(membersStore.searchQuery).toBe('John');
			expect(membersStore.currentPage).toBe(1);
		});

		it('should return empty for no matches', async () => {
			mockPb.collection('users').getFullList.mockResolvedValue([]);

			await membersStore.search('nonexistent');

			expect(membersStore.members).toEqual([]);
		});
	});

	describe('filterByStatus', () => {
		it('should filter by active status', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			await membersStore.filterByStatus('active');

			expect(membersStore.statusFilter).toBe('active');
			expect(membersStore.currentPage).toBe(1);
			expect(mockPb.collection('church_memberships').getList).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({
					filter: expect.stringContaining('is_active = true')
				})
			);
		});

		it('should filter by inactive status', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			await membersStore.filterByStatus('inactive');

			expect(membersStore.statusFilter).toBe('inactive');
			expect(mockPb.collection('church_memberships').getList).toHaveBeenCalledWith(
				1,
				20,
				expect.objectContaining({
					filter: expect.stringContaining('is_active = false')
				})
			);
		});
	});

	describe('clearFilters', () => {
		it('should clear all filters and reload', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			membersStore.searchQuery = 'test';
			membersStore.statusFilter = 'active';
			membersStore.currentPage = 3;

			await membersStore.clearFilters();

			expect(membersStore.searchQuery).toBe('');
			expect(membersStore.statusFilter).toBe('all');
			expect(membersStore.currentPage).toBe(1);
		});
	});

	describe('goToPage', () => {
		it('should navigate to a specific page', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue({
				...createMembershipResponse(members),
				totalPages: 5
			});

			await membersStore.loadMembers();
			await membersStore.goToPage(3);

			expect(membersStore.currentPage).toBe(3);
		});

		it('should clamp page to valid range', async () => {
			membersStore.totalPages = 5;
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			await membersStore.goToPage(10);

			expect(membersStore.currentPage).toBe(5);
		});
	});

	describe('updateMember', () => {
		beforeEach(() => {
			const membership = mockMembership({ id: 'membership-1' });
			membersStore.members = [mockMember({ id: 'user-1', membership })];
		});

		it('should update member successfully', async () => {
			const updatedMembership = mockMembership({ id: 'membership-1', is_active: false });
			mockPb.collection('church_memberships').update.mockResolvedValue(updatedMembership);

			const result = await membersStore.updateMember('membership-1', { is_active: false });

			expect(result).toEqual(updatedMembership);
			expect(membersStore.members[0].membership).toEqual(updatedMembership);
		});

		it('should handle errors when updating', async () => {
			const error = new Error('Update failed');
			mockPb.collection('church_memberships').update.mockRejectedValue(error);

			await expect(membersStore.updateMember('membership-1', {})).rejects.toThrow('Update failed');
			expect(membersStore.error).toBe('Update failed');
		});
	});

	describe('deactivateMember', () => {
		beforeEach(() => {
			const membership = mockMembership({ id: 'membership-1', is_active: true });
			membersStore.members = [mockMember({ id: 'user-1', membership })];
		});

		it('should deactivate member successfully', async () => {
			mockPb.collection('church_memberships').getList.mockResolvedValue({
				items: [{ id: 'membership-1' }],
				totalItems: 1
			});
			mockPb.collection('church_memberships').update.mockResolvedValue({});

			await membersStore.deactivateMember('user-1');

			expect(membersStore.members[0].membership?.is_active).toBe(false);
		});
	});

	describe('reactivateMember', () => {
		beforeEach(() => {
			const membership = mockMembership({ id: 'membership-1', is_active: false });
			membersStore.members = [mockMember({ id: 'user-1', membership })];
		});

		it('should reactivate member successfully', async () => {
			mockPb.collection('church_memberships').getList.mockResolvedValue({
				items: [{ id: 'membership-1' }],
				totalItems: 1
			});
			mockPb.collection('church_memberships').update.mockResolvedValue({});

			await membersStore.reactivateMember('user-1');

			expect(membersStore.members[0].membership?.is_active).toBe(true);
		});
	});

	describe('toggleMemberActive', () => {
		it('should deactivate active member', async () => {
			const membership = mockMembership({ id: 'membership-1', is_active: true });
			membersStore.members = [mockMember({ id: 'user-1', membership })];

			mockPb.collection('church_memberships').getList.mockResolvedValue({
				items: [{ id: 'membership-1' }],
				totalItems: 1
			});
			mockPb.collection('church_memberships').update.mockResolvedValue({});

			await membersStore.toggleMemberActive('user-1');

			expect(membersStore.members[0].membership?.is_active).toBe(false);
		});

		it('should reactivate inactive member', async () => {
			const membership = mockMembership({ id: 'membership-1', is_active: false });
			membersStore.members = [mockMember({ id: 'user-1', membership })];

			mockPb.collection('church_memberships').getList.mockResolvedValue({
				items: [{ id: 'membership-1' }],
				totalItems: 1
			});
			mockPb.collection('church_memberships').update.mockResolvedValue({});

			await membersStore.toggleMemberActive('user-1');

			expect(membersStore.members[0].membership?.is_active).toBe(true);
		});
	});

	describe('removeMember', () => {
		beforeEach(() => {
			membersStore.members = [
				mockMember({ id: 'user-1' }),
				mockMember({ id: 'user-2' })
			];
			membersStore.totalItems = 2;
		});

		it('should remove member successfully', async () => {
			mockPb.collection('church_memberships').getFullList.mockResolvedValue([{ id: 'membership-1' }]);
			mockPb.collection('church_memberships').delete.mockResolvedValue(undefined);
			mockPb.collection('user_roles').getFullList.mockResolvedValue([]);
			mockPb.collection('user_skills').getFullList.mockResolvedValue([]);

			await membersStore.removeMember('user-1');

			expect(membersStore.members).toHaveLength(1);
			expect(membersStore.members[0].id).toBe('user-2');
			expect(membersStore.totalItems).toBe(1);
		});

		it('should handle errors when removing member', async () => {
			const error = new Error('Remove failed');
			mockPb.collection('church_memberships').getFullList.mockRejectedValue(error);

			await expect(membersStore.removeMember('user-1')).rejects.toThrow('Remove failed');
			expect(membersStore.members).toHaveLength(2);
		});
	});

	describe('toggleAdmin', () => {
		it('should toggle admin role on', async () => {
			mockPb.collection('roles').getFirstListItem.mockResolvedValue({ id: 'admin-role' });
			mockPb.collection('user_roles').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_roles').create.mockResolvedValue({});

			await membersStore.toggleAdmin('user-1', true);

			expect(mockPb.collection('user_roles').create).toHaveBeenCalledWith({
				church_id: 'church-1',
				user_id: 'user-1',
				role_id: 'admin-role'
			});
		});

		it('should toggle admin role off', async () => {
			mockPb.collection('roles').getFirstListItem.mockResolvedValue({ id: 'admin-role' });
			mockPb.collection('user_roles').getList.mockResolvedValue({
				items: [{ id: 'user-role-1' }],
				totalItems: 1
			});
			mockPb.collection('user_roles').delete.mockResolvedValue(undefined);

			await membersStore.toggleAdmin('user-1', false);

			expect(mockPb.collection('user_roles').delete).toHaveBeenCalledWith('user-role-1');
		});
	});

	describe('toggleLeader', () => {
		it('should toggle leader skill on', async () => {
			mockPb.collection('skills').getFirstListItem.mockResolvedValue({ id: 'leader-skill' });
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_skills').create.mockResolvedValue({});

			await membersStore.toggleLeader('user-1', true);

			expect(mockPb.collection('user_skills').create).toHaveBeenCalledWith({
				church_id: 'church-1',
				user_id: 'user-1',
				skill_id: 'leader-skill'
			});
		});

		it('should toggle leader skill off', async () => {
			mockPb.collection('skills').getFirstListItem.mockResolvedValue({ id: 'leader-skill' });
			mockPb.collection('user_skills').getList.mockResolvedValue({
				items: [{ id: 'user-skill-1' }],
				totalItems: 1
			});
			mockPb.collection('user_skills').delete.mockResolvedValue(undefined);

			await membersStore.toggleLeader('user-1', false);

			expect(mockPb.collection('user_skills').delete).toHaveBeenCalledWith('user-skill-1');
		});
	});

	describe('getMemberRolesAndSkills', () => {
		it('should return member roles and skills status', async () => {
			mockPb.collection('user_roles').getList.mockResolvedValue({ items: [{}], totalItems: 1 });
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [{}], totalItems: 1 });

			const result = await membersStore.getMemberRolesAndSkills('user-1');

			expect(result).toEqual({ isAdmin: true, isLeader: true });
		});

		it('should return false values when no roles/skills', async () => {
			mockPb.collection('user_roles').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_skills').getList.mockResolvedValue({ items: [], totalItems: 0 });

			const result = await membersStore.getMemberRolesAndSkills('user-1');

			expect(result).toEqual({ isAdmin: false, isLeader: false });
		});

		it('should return default on error', async () => {
			mockPb.collection('user_roles').getList.mockRejectedValue(new Error('Failed'));

			const result = await membersStore.getMemberRolesAndSkills('user-1');

			expect(result).toEqual({ isAdmin: false, isLeader: false });
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			membersStore.error = 'Test error';

			membersStore.clearError();

			expect(membersStore.error).toBe(null);
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to members and handle delete events', async () => {
			const membership = mockMembership({ id: 'membership-1' });
			membersStore.members = [mockMember({ id: 'user-1', membership })];

			let eventHandler: (data: unknown) => void;
			mockPb.collection('church_memberships').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await membersStore.subscribeToUpdates();

			// Trigger delete event
			eventHandler!({ action: 'delete', record: { id: 'membership-1' } });

			expect(membersStore.members).toHaveLength(0);
		});

		it('should reload on create/update events', async () => {
			const members = [mockMember()];
			mockPb.collection('church_memberships').getList.mockResolvedValue(
				createMembershipResponse(members)
			);

			let eventHandler: (data: unknown) => void;
			mockPb.collection('church_memberships').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await membersStore.subscribeToUpdates();
			mockPb.collection('church_memberships').getList.mockClear();

			// Trigger create event
			eventHandler!({ action: 'create', record: { id: 'new-membership' } });

			// Should trigger reload
			expect(mockPb.collection('church_memberships').getList).toHaveBeenCalled();
		});
	});

	describe('error message extraction', () => {
		it('should extract message from PocketBase error data.message', async () => {
			const pbError = {
				data: {
					message: 'PocketBase error message'
				}
			};
			mockPb.collection('church_memberships').getList.mockRejectedValue(pbError);

			await membersStore.loadMembers();

			expect(membersStore.error).toBe('PocketBase error message');
		});

		it('should extract message from PocketBase error data.error', async () => {
			const pbError = {
				data: {
					error: 'PocketBase data error'
				}
			};
			mockPb.collection('church_memberships').getList.mockRejectedValue(pbError);

			await membersStore.loadMembers();

			expect(membersStore.error).toBe('PocketBase data error');
		});

		it('should fall back to error.message property', async () => {
			const pbError = {
				message: 'Top-level error message'
			};
			mockPb.collection('church_memberships').getList.mockRejectedValue(pbError);

			await membersStore.loadMembers();

			expect(membersStore.error).toBe('Top-level error message');
		});

		it('should handle unknown error types', async () => {
			mockPb.collection('church_memberships').getList.mockRejectedValue('String error');

			await membersStore.loadMembers();

			expect(membersStore.error).toBe('An unexpected error occurred');
		});
	});
});
