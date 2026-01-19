import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRolesStore, type RolesStore } from './roles.svelte';
import type { AuthContext } from '$lib/types/auth';
import type { Role, UserRole, Permission } from '$lib/types/permissions';
import { mockPb } from '$tests/helpers/pb-mock';
import { mockAuthContext } from '$tests/helpers/mock-builders';

describe('RolesStore', () => {
	let rolesStore: RolesStore;
	let authContext: AuthContext;

	// Test data factories
	const mockRole = (overrides: Partial<Role> = {}): Role => ({
		id: 'role-1',
		church_id: 'church-1',
		name: 'Worship Leader',
		slug: 'worship-leader',
		permissions: ['manage-songs', 'manage-services'] as Permission[],
		is_builtin: false,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides
	});

	const mockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
		id: 'user-role-1',
		church_id: 'church-1',
		user_id: 'user-1',
		role_id: 'role-1',
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();

		authContext = mockAuthContext({
			church: { id: 'church-1', name: 'Test Church' },
			user: { id: 'user-1' },
			membership: { church_id: 'church-1' }
		});

		rolesStore = createRolesStore(authContext);
	});

	describe('loadRoles', () => {
		it('should load roles successfully', async () => {
			const roles = [mockRole()];
			mockPb.collection('roles').mockGetFullList(roles);

			await rolesStore.loadRoles();

			expect(rolesStore.roles).toEqual(roles);
			expect(rolesStore.loading).toBe(false);
			expect(rolesStore.error).toBe(null);
			expect(mockPb.collection).toHaveBeenCalledWith('roles');
		});

		it('should handle loading state correctly', async () => {
			mockPb.collection('roles').getFullList.mockImplementation(async () => {
				expect(rolesStore.loading).toBe(true);
				return [mockRole()];
			});

			await rolesStore.loadRoles();

			expect(rolesStore.loading).toBe(false);
		});

		it('should handle errors when loading roles', async () => {
			const error = new Error('Network error');
			mockPb.collection('roles').getFullList.mockRejectedValue(error);

			await rolesStore.loadRoles();

			expect(rolesStore.roles).toEqual([]);
			expect(rolesStore.loading).toBe(false);
			expect(rolesStore.error).toBe('Network error');
		});

		it('should validate permission coverage after loading', async () => {
			const roles = [
				mockRole({ permissions: ['manage-songs'] as Permission[] }),
				mockRole({ id: 'role-2', permissions: ['manage-services'] as Permission[] })
			];
			mockPb.collection('roles').mockGetFullList(roles);

			await rolesStore.loadRoles();

			// Missing manage-members and manage-church
			expect(rolesStore.missingPermissions).toContain('manage-members');
			expect(rolesStore.missingPermissions).toContain('manage-church');
		});
	});

	describe('loadRolesOnce', () => {
		it('should only load roles once', async () => {
			const roles = [mockRole()];
			mockPb.collection('roles').mockGetFullList(roles);

			await rolesStore.loadRolesOnce();
			const callCountAfterFirst = mockPb.collection('roles').getFullList.mock.calls.length;

			await rolesStore.loadRolesOnce();
			const callCountAfterSecond = mockPb.collection('roles').getFullList.mock.calls.length;

			// Second call should not trigger additional API calls
			expect(callCountAfterSecond).toBe(callCountAfterFirst);
		});

		it('should load roles if not initialized', async () => {
			const roles = [mockRole()];
			mockPb.collection('roles').mockGetFullList(roles);

			await rolesStore.loadRolesOnce();

			expect(rolesStore.roles).toEqual(roles);
		});
	});

	describe('createRole', () => {
		it('should create role successfully', async () => {
			const newRole = mockRole({ id: 'role-new', name: 'New Role' });
			mockPb.collection('roles').create.mockResolvedValue(newRole);
			mockPb.collection('roles').mockGetFullList([newRole]); // For permission validation

			const result = await rolesStore.createRole({
				name: 'New Role',
				slug: 'new-role',
				permissions: ['manage-songs'] as Permission[]
			});

			expect(result).toEqual(newRole);
			expect(rolesStore.roles).toContainEqual(newRole);
			expect(mockPb.collection('roles').create).toHaveBeenCalledWith(
				expect.objectContaining({
					church_id: 'church-1',
					name: 'New Role',
					slug: 'new-role'
				})
			);
		});

		it('should handle errors when creating role', async () => {
			const error = new Error('Validation failed');
			mockPb.collection('roles').create.mockRejectedValue(error);

			await expect(
				rolesStore.createRole({
					name: 'New Role',
					slug: 'new-role',
					permissions: []
				})
			).rejects.toThrow('Validation failed');

			expect(rolesStore.error).toBe('Validation failed');
		});
	});

	describe('updateRole', () => {
		beforeEach(() => {
			rolesStore.roles = [mockRole()];
		});

		it('should update role successfully', async () => {
			const updatedRole = mockRole({ name: 'Updated Role' });
			mockPb.collection('roles').update.mockResolvedValue(updatedRole);
			mockPb.collection('roles').mockGetFullList([updatedRole]); // For permission validation

			const result = await rolesStore.updateRole('role-1', { name: 'Updated Role' });

			expect(result).toEqual(updatedRole);
			expect(rolesStore.roles[0]).toEqual(updatedRole);
		});

		it('should handle updating non-existent role', async () => {
			const updatedRole = mockRole({ id: 'different-id', name: 'Updated Role' });
			mockPb.collection('roles').update.mockResolvedValue(updatedRole);
			mockPb.collection('roles').mockGetFullList([updatedRole]);

			await rolesStore.updateRole('different-id', { name: 'Updated Role' });

			// Original role unchanged
			expect(rolesStore.roles[0].id).toBe('role-1');
		});

		it('should handle errors when updating role', async () => {
			const error = new Error('Update failed');
			mockPb.collection('roles').update.mockRejectedValue(error);

			await expect(rolesStore.updateRole('role-1', { name: 'Updated' })).rejects.toThrow(
				'Update failed'
			);

			expect(rolesStore.error).toBe('Update failed');
		});
	});

	describe('deleteRole', () => {
		beforeEach(() => {
			rolesStore.roles = [mockRole(), mockRole({ id: 'role-2', name: 'Role 2' })];
		});

		it('should delete role successfully', async () => {
			mockPb.collection('roles').delete.mockResolvedValue(undefined);
			mockPb.collection('roles').mockGetFullList([mockRole({ id: 'role-2' })]); // For permission validation

			await rolesStore.deleteRole('role-1');

			expect(rolesStore.roles).toHaveLength(1);
			expect(rolesStore.roles[0].id).toBe('role-2');
			expect(mockPb.collection('roles').delete).toHaveBeenCalledWith('role-1');
		});

		it('should handle errors when deleting role', async () => {
			const error = new Error('Cannot delete role with assigned users');
			mockPb.collection('roles').delete.mockRejectedValue(error);

			await expect(rolesStore.deleteRole('role-1')).rejects.toThrow(
				'Cannot delete role with assigned users'
			);

			expect(rolesStore.roles).toHaveLength(2); // Unchanged
			expect(rolesStore.error).toBe('Cannot delete role with assigned users');
		});
	});

	describe('getUsersByRole', () => {
		it('should return users for a role', async () => {
			const userRoles = [mockUserRole(), mockUserRole({ id: 'user-role-2', user_id: 'user-2' })];
			mockPb.collection('user_roles').mockGetFullList(userRoles);

			const result = await rolesStore.getUsersByRole('role-1');

			expect(result).toEqual(userRoles);
		});

		it('should return empty array on error', async () => {
			mockPb.collection('user_roles').getFullList.mockRejectedValue(new Error('Failed'));

			const result = await rolesStore.getUsersByRole('role-1');

			expect(result).toEqual([]);
		});
	});

	describe('assignRole', () => {
		it('should assign role to user successfully', async () => {
			const userRole = mockUserRole();
			mockPb.collection('user_roles').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_roles').create.mockResolvedValue(userRole);

			const result = await rolesStore.assignRole({
				user_id: 'user-1',
				role_id: 'role-1'
			});

			expect(result).toEqual(userRole);
			expect(rolesStore.userRoles).toContainEqual(userRole);
		});

		it('should handle errors when assigning role', async () => {
			const error = new Error('User already has this role');
			mockPb.collection('user_roles').getList.mockResolvedValue({ items: [], totalItems: 0 });
			mockPb.collection('user_roles').create.mockRejectedValue(error);

			await expect(
				rolesStore.assignRole({
					user_id: 'user-1',
					role_id: 'role-1'
				})
			).rejects.toThrow('User already has this role');

			expect(rolesStore.error).toBe('User already has this role');
		});
	});

	describe('removeRole', () => {
		beforeEach(() => {
			rolesStore.userRoles = [mockUserRole()];
		});

		it('should remove role from user successfully', async () => {
			mockPb.collection('user_roles').delete.mockResolvedValue(undefined);

			await rolesStore.removeRole('user-role-1');

			expect(rolesStore.userRoles).toHaveLength(0);
		});

		it('should handle errors when removing role', async () => {
			const error = new Error('Remove failed');
			mockPb.collection('user_roles').delete.mockRejectedValue(error);

			await expect(rolesStore.removeRole('user-role-1')).rejects.toThrow('Remove failed');

			expect(rolesStore.userRoles).toHaveLength(1); // Unchanged
			expect(rolesStore.error).toBe('Remove failed');
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			rolesStore.error = 'Test error';

			rolesStore.clearError();

			expect(rolesStore.error).toBe(null);
		});
	});

	describe('real-time subscriptions', () => {
		it('should subscribe to roles and handle create events', async () => {
			const unsubscribe = vi.fn();
			let eventHandler: (data: unknown) => void;

			mockPb.collection('roles').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return unsubscribe;
				}
			);

			const result = await rolesStore.subscribeToUpdates();

			expect(mockPb.collection('roles').subscribe).toHaveBeenCalled();

			// Test create event
			const newRole = mockRole({ id: 'role-new' });
			eventHandler!({ action: 'create', record: newRole });

			expect(rolesStore.roles).toContainEqual(newRole);
		});

		it('should handle role update events', async () => {
			rolesStore.roles = [mockRole()];

			let eventHandler: (data: unknown) => void;
			mockPb.collection('roles').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await rolesStore.subscribeToUpdates();

			const updatedRole = mockRole({ name: 'Updated Name' });
			eventHandler!({ action: 'update', record: updatedRole });

			expect(rolesStore.roles[0].name).toBe('Updated Name');
		});

		it('should handle role delete events', async () => {
			rolesStore.roles = [mockRole()];

			let eventHandler: (data: unknown) => void;
			mockPb.collection('roles').subscribe.mockImplementation(
				async (topic: string, handler: (data: unknown) => void) => {
					eventHandler = handler;
					return vi.fn();
				}
			);

			await rolesStore.subscribeToUpdates();

			eventHandler!({ action: 'delete', record: { id: 'role-1' } });

			expect(rolesStore.roles).toHaveLength(0);
		});
	});

	describe('error message extraction', () => {
		it('should extract message from API error response', async () => {
			const apiError = {
				response: {
					data: {
						message: 'API specific error message'
					}
				}
			};
			mockPb.collection('roles').getFullList.mockRejectedValue(apiError);

			await rolesStore.loadRoles();

			expect(rolesStore.error).toBe('API specific error message');
		});

		it('should handle unknown error types', async () => {
			mockPb.collection('roles').getFullList.mockRejectedValue('String error');

			await rolesStore.loadRoles();

			expect(rolesStore.error).toBe('An unexpected error occurred');
		});
	});
});
