import type { PocketBase } from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { 
	Role, 
	UserRole, 
	CreateRoleData, 
	UpdateRoleData, 
	AssignRoleData,
	Permission 
} from '$lib/types/permissions';

export class RolesAPI {
	private pb: PocketBase;
	private authContext: AuthContext;

	constructor(authContext: AuthContext, pb: PocketBase) {
		this.authContext = authContext;
		this.pb = pb;
	}

	/**
	 * Get all roles for the current church
	 */
	async getRoles(): Promise<Role[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			return await this.pb.collection('roles').getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}"`,
				sort: 'name'
			});
		} catch (error) {
			console.error('Failed to fetch roles:', error);
			throw error;
		}
	}

	/**
	 * Get a single role by ID
	 */
	async getRole(roleId: string): Promise<Role> {
		try {
			return await this.pb.collection('roles').getOne(roleId);
		} catch (error) {
			console.error('Failed to fetch role:', error);
			throw error;
		}
	}

	/**
	 * Create a new role
	 */
	async createRole(data: CreateRoleData): Promise<Role> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// Validate permissions
			const validPermissions = data.permissions.filter(p => 
				['manage-songs', 'manage-services', 'manage-members', 'manage-church'].includes(p)
			);

			return await this.pb.collection('roles').create({
				church_id: this.authContext.currentChurch.id,
				name: data.name,
				slug: data.slug,
				permissions: validPermissions,
				is_builtin: false
			});
		} catch (error) {
			console.error('Failed to create role:', error);
			throw error;
		}
	}

	/**
	 * Update an existing role
	 */
	async updateRole(roleId: string, data: UpdateRoleData): Promise<Role> {
		try {
			const updateData: any = {};
			
			if (data.name !== undefined) {
				updateData.name = data.name;
			}
			
			if (data.permissions !== undefined) {
				// Validate permissions
				updateData.permissions = data.permissions.filter(p => 
					['manage-songs', 'manage-services', 'manage-members', 'manage-church'].includes(p)
				);
			}

			return await this.pb.collection('roles').update(roleId, updateData);
		} catch (error) {
			console.error('Failed to update role:', error);
			throw error;
		}
	}

	/**
	 * Delete a role (only if not built-in and no users assigned)
	 */
	async deleteRole(roleId: string): Promise<void> {
		try {
			// Check if any users have this role
			const userRoles = await this.pb.collection('user_roles').getList(1, 1, {
				filter: `role_id = "${roleId}"`
			});

			if (userRoles.totalItems > 0) {
				throw new Error('Cannot delete role with assigned users');
			}

			await this.pb.collection('roles').delete(roleId);
		} catch (error) {
			console.error('Failed to delete role:', error);
			throw error;
		}
	}

	/**
	 * Get all user-role assignments for the current church
	 */
	async getUserRoles(userId?: string): Promise<UserRole[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			let filter = `church_id = "${this.authContext.currentChurch.id}"`;
			if (userId) {
				filter += ` && user_id = "${userId}"`;
			}

			return await this.pb.collection('user_roles').getFullList({
				filter,
				expand: 'role_id,user_id'
			});
		} catch (error) {
			console.error('Failed to fetch user roles:', error);
			throw error;
		}
	}

	/**
	 * Assign a role to a user
	 */
	async assignRole(data: AssignRoleData): Promise<UserRole> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			// Check if assignment already exists
			const existing = await this.pb.collection('user_roles').getList(1, 1, {
				filter: `church_id = "${this.authContext.currentChurch.id}" && user_id = "${data.user_id}" && role_id = "${data.role_id}"`
			});

			if (existing.totalItems > 0) {
				throw new Error('User already has this role');
			}

			return await this.pb.collection('user_roles').create({
				church_id: this.authContext.currentChurch.id,
				user_id: data.user_id,
				role_id: data.role_id
			});
		} catch (error) {
			console.error('Failed to assign role:', error);
			throw error;
		}
	}

	/**
	 * Remove a role from a user
	 */
	async removeRole(userRoleId: string): Promise<void> {
		try {
			await this.pb.collection('user_roles').delete(userRoleId);
		} catch (error) {
			console.error('Failed to remove role:', error);
			throw error;
		}
	}

	/**
	 * Check if at least one role has each permission
	 */
	async validatePermissionCoverage(): Promise<{ 
		valid: boolean; 
		missingPermissions: Permission[] 
	}> {
		try {
			const roles = await this.getRoles();
			const allPermissions = new Set<Permission>();
			
			roles.forEach(role => {
				role.permissions.forEach(permission => {
					allPermissions.add(permission);
				});
			});

			const requiredPermissions: Permission[] = [
				'manage-songs',
				'manage-services', 
				'manage-members',
				'manage-church'
			];

			const missingPermissions = requiredPermissions.filter(p => !allPermissions.has(p));

			return {
				valid: missingPermissions.length === 0,
				missingPermissions
			};
		} catch (error) {
			console.error('Failed to validate permission coverage:', error);
			throw error;
		}
	}

	/**
	 * Get users by role
	 */
	async getUsersByRole(roleId: string): Promise<UserRole[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			return await this.pb.collection('user_roles').getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}" && role_id = "${roleId}"`,
				expand: 'user_id'
			});
		} catch (error) {
			console.error('Failed to fetch users by role:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time updates for roles
	 */
	subscribeToRoles(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb.collection('roles').subscribe('*', callback, {
			filter: `church_id = "${this.authContext.currentChurch.id}"`
		});
	}

	/**
	 * Subscribe to real-time updates for user roles
	 */
	subscribeToUserRoles(callback: (data: unknown) => void) {
		if (!this.authContext.currentChurch?.id) {
			return () => {}; // Return empty unsubscribe function
		}

		return this.pb.collection('user_roles').subscribe('*', callback, {
			filter: `church_id = "${this.authContext.currentChurch.id}"`
		});
	}
}

// Factory function for creating RolesAPI instances
export function createRolesAPI(authContext: AuthContext, pb: PocketBase): RolesAPI {
	return new RolesAPI(authContext, pb);
}