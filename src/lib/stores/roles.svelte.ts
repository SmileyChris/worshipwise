import { createRolesAPI, type RolesAPI } from '$lib/api/roles';
import type { AuthStore as RuntimeAuthStore } from '$lib/stores/auth.svelte';
import type { AuthContext } from '$lib/types/auth';
import type {
	Role,
	UserRole,
	CreateRoleData,
	UpdateRoleData,
	AssignRoleData,
	Permission
} from '$lib/types/permissions';

class RolesStore {
	// Reactive state using Svelte 5 runes
	roles = $state<Role[]>([]);
	userRoles = $state<UserRole[]>([]);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Permission coverage validation
	missingPermissions = $state<Permission[]>([]);

	// Track if initial load is complete
	private initialized = $state<boolean>(false);

	private rolesApi: RolesAPI;

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
		this.rolesApi = $derived.by(() => {
			const ctx = this.getAuthContext();
			return createRolesAPI(ctx, ctx.pb);
		});
	}

	private getAuthContext(): AuthContext {
		return this.auth ? this.auth.getAuthContext() : (this.staticContext as AuthContext);
	}

	/**
	 * Load all roles for the current church
	 */
	async loadRoles(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			this.roles = await this.rolesApi.getRoles();

			// Validate permission coverage
			const coverage = await this.rolesApi.validatePermissionCoverage();
			this.missingPermissions = coverage.missingPermissions;

			this.initialized = true;
		} catch (error) {
			console.error('Failed to load roles:', error);
			this.error = this.getErrorMessage(error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load roles only if not already loaded
	 */
	async loadRolesOnce(): Promise<void> {
		if (this.initialized) return;
		await this.loadRoles();
	}

	/**
	 * Create a new role
	 */
	async createRole(data: CreateRoleData): Promise<Role> {
		this.loading = true;
		this.error = null;

		try {
			const newRole = await this.rolesApi.createRole(data);
			this.roles = [...this.roles, newRole];

			// Re-validate permission coverage
			const coverage = await this.rolesApi.validatePermissionCoverage();
			this.missingPermissions = coverage.missingPermissions;

			return newRole;
		} catch (error) {
			console.error('Failed to create role:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update an existing role
	 */
	async updateRole(roleId: string, data: UpdateRoleData): Promise<Role> {
		this.loading = true;
		this.error = null;

		try {
			const updatedRole = await this.rolesApi.updateRole(roleId, data);

			// Update in local array
			const index = this.roles.findIndex((r) => r.id === roleId);
			if (index !== -1) {
				this.roles[index] = updatedRole;
				this.roles = [...this.roles]; // Trigger reactivity
			}

			// Re-validate permission coverage
			const coverage = await this.rolesApi.validatePermissionCoverage();
			this.missingPermissions = coverage.missingPermissions;

			return updatedRole;
		} catch (error) {
			console.error('Failed to update role:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Delete a role
	 */
	async deleteRole(roleId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.rolesApi.deleteRole(roleId);
			this.roles = this.roles.filter((r) => r.id !== roleId);

			// Re-validate permission coverage
			const coverage = await this.rolesApi.validatePermissionCoverage();
			this.missingPermissions = coverage.missingPermissions;
		} catch (error) {
			console.error('Failed to delete role:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Get users assigned to a specific role
	 */
	async getUsersByRole(roleId: string): Promise<UserRole[]> {
		try {
			return await this.rolesApi.getUsersByRole(roleId);
		} catch (error) {
			console.error('Failed to get users by role:', error);
			return [];
		}
	}

	/**
	 * Assign a role to a user
	 */
	async assignRole(data: AssignRoleData): Promise<UserRole> {
		this.loading = true;
		this.error = null;

		try {
			const userRole = await this.rolesApi.assignRole(data);
			this.userRoles = [...this.userRoles, userRole];
			return userRole;
		} catch (error) {
			console.error('Failed to assign role:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Remove a role from a user
	 */
	async removeRole(userRoleId: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.rolesApi.removeRole(userRoleId);
			this.userRoles = this.userRoles.filter((ur) => ur.id !== userRoleId);
		} catch (error) {
			console.error('Failed to remove role:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
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
		const unsubRoles = await this.rolesApi.subscribeToRoles((data: unknown) => {
			const eventData = data as {
				action: string;
				record: Role;
			};

			if (eventData.action === 'create') {
				this.roles = [...this.roles, eventData.record];
			} else if (eventData.action === 'update') {
				const index = this.roles.findIndex((r) => r.id === eventData.record.id);
				if (index !== -1) {
					this.roles[index] = eventData.record;
					this.roles = [...this.roles];
				}
			} else if (eventData.action === 'delete') {
				this.roles = this.roles.filter((r) => r.id !== eventData.record.id);
			}
		});

		return () => {
			if (typeof unsubRoles === 'function') {
				unsubRoles();
			}
		};
	}

	/**
	 * Get error message from API error
	 */
	private getErrorMessage(error: unknown): string {
		if (error && typeof error === 'object' && 'response' in error) {
			const apiError = error as { response?: { data?: { message?: string } } };
			if (apiError.response?.data?.message) {
				return apiError.response.data.message;
			}
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'An unexpected error occurred';
	}
}

// Export the class type for tests
export type { RolesStore };

// Factory function for creating new store instances
export function createRolesStore(auth: RuntimeAuthStore | AuthContext): RolesStore {
	return new RolesStore(auth);
}
