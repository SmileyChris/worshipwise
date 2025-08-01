import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { createChurchesAPI, type ChurchesAPI } from '$lib/api/churches';
import { createRolesAPI, type RolesAPI } from '$lib/api/roles';
import { createSkillsAPI, type SkillsAPI } from '$lib/api/skills';
import { pb } from '$lib/api/client';
import type { AuthContext, LoginCredentials, RegisterData, User } from '$lib/types/auth';
import type { Church, ChurchMembership } from '$lib/types/church';
import type { Role, UserRole, Skill, UserSkill, Permission } from '$lib/types/permissions';

class AuthStore {
	// Reactive state using Svelte 5 runes
	user = $state<User | null>(null);
	token = $state<string>('');
	isValid = $state<boolean>(false);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Church context state - derived from membership
	currentMembership = $state<ChurchMembership | null>(null);
	availableChurches = $state<Church[]>([]);
	churchMemberships = $state<ChurchMembership[]>([]);
	churchLoading = $state<boolean>(false);

	// Invitation state
	pendingInvites = $state<any[]>([]);
	invitesLoading = $state<boolean>(false);

	// Permission state
	userRoles = $state<UserRole[]>([]);
	userSkills = $state<UserSkill[]>([]);
	permissions = $state<Set<Permission>>(new Set());

	// API instances
	private churchesAPI: ChurchesAPI;
	private rolesAPI: RolesAPI | null = null;
	private skillsAPI: SkillsAPI | null = null;

	constructor() {
		// Create API instances
		this.churchesAPI = createChurchesAPI(pb);

		if (browser) {
			// Initialize from PocketBase auth store
			this.user = pb.authStore.model as User | null;
			this.token = pb.authStore.token;
			this.isValid = pb.authStore.isValid;

			// Load profile and churches if user is already authenticated
			if (this.isValid && this.user) {
				this.loadProfile();
				this.loadUserChurches();
				this.loadPendingInvites();
				this.loadPermissions();
			}

			// Listen for auth changes from PocketBase
			pb.authStore.onChange(async () => {
				this.user = pb.authStore.model as User | null;
				this.token = pb.authStore.token;
				this.isValid = pb.authStore.isValid;
				this.error = null;

				// Load profile and church data when user logs in
				if (this.isValid && this.user) {
					await this.loadProfile();
					await this.loadUserChurches();
					await this.loadPendingInvites();
					await this.loadPermissions();
				} else {
					this.currentMembership = null;
					this.availableChurches = [];
					this.churchMemberships = [];
					this.pendingInvites = [];
					this.userRoles = [];
					this.userSkills = [];
					this.permissions = new Set();
				}

				console.log('Auth state changed:', {
					isValid: this.isValid,
					user: this.user?.email,
					permissions: Array.from(this.permissions)
				});
			});
		}
	}

	/**
	 * Login with email and password
	 */
	async login(credentials: LoginCredentials): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const authData = await pb
				.collection('users')
				.authWithPassword(credentials.email, credentials.password);

			// PocketBase automatically updates authStore, triggering our onChange listener
			console.log('Login successful:', authData.record.email);

			// Redirect to dashboard
			await goto('/dashboard');
		} catch (error: unknown) {
			console.error('Login failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Register new user
	 */
	async register(data: RegisterData): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			// Create the user account with name
			const user = await pb.collection('users').create({
				email: data.email,
				password: data.password,
				passwordConfirm: data.passwordConfirm,
				name: data.name
			});

			console.log('User account created:', user.email);

			// Auto-login to get authenticated context
			await pb.collection('users').authWithPassword(data.email, data.password);

			// Note: Church membership will be created when user joins a church
			// For now, just load existing memberships
			await this.loadUserChurches();
			console.log('Registration successful:', user.email);

			// Redirect to dashboard
			await goto('/dashboard');
		} catch (error: unknown) {
			console.error('Registration failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Logout current user
	 */
	async logout(): Promise<void> {
		try {
			pb.authStore.clear();
			await goto('/login');
			console.log('Logout successful');
		} catch (error: unknown) {
			console.error('Logout error:', error);
		}
	}

	/**
	 * Refresh authentication token
	 */
	async refreshAuth(): Promise<void> {
		if (!this.isValid) return;

		try {
			await pb.collection('users').authRefresh();
			console.log('Auth refreshed successfully');
		} catch (error: unknown) {
			console.error('Auth refresh failed:', error);
			// If refresh fails, clear auth and redirect to login
			this.logout();
		}
	}

	/**
	 * Send password reset email
	 */
	async requestPasswordReset(email: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await pb.collection('users').requestPasswordReset(email);
			console.log('Password reset email sent to:', email);
		} catch (error: unknown) {
			console.error('Password reset request failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Confirm password reset with token
	 */
	async confirmPasswordReset(
		token: string,
		password: string,
		passwordConfirm: string
	): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
			console.log('Password reset confirmed successfully');
		} catch (error: unknown) {
			console.error('Password reset confirmation failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update user profile
	 */
	async updateProfile(data: Partial<User>): Promise<void> {
		if (!this.user) return;

		this.loading = true;
		this.error = null;

		try {
			const updatedUser = await pb.collection('users').update(this.user.id, data);
			// Update local state - PocketBase won't automatically trigger onChange for profile updates
			this.user = updatedUser as unknown as User;
			console.log('Profile updated successfully');
		} catch (error: unknown) {
			console.error('Profile update failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load user profile data from church memberships
	 */
	async loadProfile(): Promise<void> {
		if (!this.user) return;

		try {
			// Get current membership (first active membership with church data)
			const memberships = await pb.collection('church_memberships').getList(1, 1, {
				filter: `user_id = "${this.user.id}" && status = "active" && is_active = true`,
				expand: 'church_id',
				sort: '-joined_date'
			});

			if (memberships.items.length > 0) {
				this.currentMembership = memberships.items[0] as unknown as ChurchMembership;
			}
		} catch (error) {
			console.error('Failed to load current membership:', error);
		}
	}

	/**
	 * Load permissions for the current user and church
	 */
	async loadPermissions(): Promise<void> {
		if (!this.user || !this.currentChurch) {
			this.userRoles = [];
			this.userSkills = [];
			this.permissions = new Set();
			return;
		}

		try {
			// Create APIs with auth context
			const authContext = this.getAuthContext();
			this.rolesAPI = createRolesAPI(authContext, pb);
			this.skillsAPI = createSkillsAPI(authContext, pb);

			// Load user roles
			this.userRoles = await this.rolesAPI.getUserRoles(this.user.id);

			// Load user skills
			this.userSkills = await this.skillsAPI.getUserSkills(this.user.id);

			// Calculate permissions from roles
			this.permissions = new Set<Permission>();
			this.userRoles.forEach((userRole) => {
				if (userRole.expand?.role_id?.permissions) {
					userRole.expand.role_id.permissions.forEach((permission) => {
						this.permissions.add(permission);
					});
				}
			});
		} catch (error) {
			console.error('Failed to load permissions:', error);
		}
	}

	/**
	 * Check if user has a specific permission
	 */
	hasPermission(permission: Permission): boolean {
		return this.permissions.has(permission);
	}

	/**
	 * Check if user has any of the specified permissions
	 */
	hasAnyPermission(permissions: Permission[]): boolean {
		return permissions.some((permission) => this.hasPermission(permission));
	}

	/**
	 * Check if user has a specific skill
	 */
	hasSkill(skillSlug: string): boolean {
		return this.userSkills.some((userSkill) => userSkill.expand?.skill_id?.slug === skillSlug);
	}

	/**
	 * Check if user has the leader skill
	 */
	hasLeaderSkill(): boolean {
		return this.hasSkill('leader');
	}

	/**
	 * Get user's display name
	 */
	displayName = $derived(this.user?.name || this.user?.email || 'User');

	/**
	 * Get current church from current membership
	 */
	currentChurch = $derived(this.currentMembership?.expand?.church_id || null);

	/**
	 * Check if user can manage songs
	 */
	canManageSongs = $derived(this.hasPermission('manage-songs'));

	/**
	 * Check if user can manage services
	 */
	canManageServices = $derived(this.hasPermission('manage-services'));

	/**
	 * Check if user can manage members
	 */
	canManageMembers = $derived(this.hasPermission('manage-members'));

	/**
	 * Check if user can manage church settings
	 */
	canManageChurch = $derived(this.hasPermission('manage-church'));

	/**
	 * Check if user is admin (has manage-church permission)
	 */
	isAdmin = $derived(this.hasPermission('manage-church'));

	/**
	 * Check if user is a worship leader (has leader skill)
	 */
	isLeader = $derived(this.hasLeaderSkill());

	/**
	 * Extract user-friendly error message
	 */
	getErrorMessage(error: unknown): string {
		// Type guard for error with response property
		if (error && typeof error === 'object' && 'response' in error) {
			const errorWithResponse = error as { response?: { data?: unknown } };
			if (errorWithResponse.response?.data) {
				const data = errorWithResponse.response.data as Record<string, unknown>;

				// Handle validation errors
				if (data.data && typeof data.data === 'object') {
					const validationData = data.data as Record<string, unknown>;
					const firstField = Object.keys(validationData)[0];
					const firstError = validationData[firstField] as { message?: string } | undefined;
					if (firstError?.message) {
						return firstError.message;
					}
				}

				// Handle general errors
				if (typeof data.message === 'string') {
					return data.message;
				}
			}
		}

		// Type guard for error with message property
		if (error && typeof error === 'object' && 'message' in error) {
			const errorWithMessage = error as { message: string };
			if (errorWithMessage.message.includes('invalid credentials')) {
				return 'Invalid email or password';
			}
			if (errorWithMessage.message.includes('email')) {
				return 'Please check your email address';
			}
			return errorWithMessage.message;
		}

		return 'An unexpected error occurred';
	}

	/**
	 * Clear any error state
	 */
	clearError(): void {
		this.error = null;
	}

	/**
	 * Load churches available to the current user
	 */
	async loadUserChurches(): Promise<void> {
		if (!this.user) return;

		this.churchLoading = true;
		try {
			// Get church memberships for this user
			const memberships = await pb.collection('church_memberships').getFullList({
				filter: `user_id = "${this.user.id}" && status = "active" && is_active = true`,
				expand: 'church_id'
			});

			// Store memberships for role access
			this.churchMemberships = memberships as unknown as ChurchMembership[];

			// Extract churches from memberships
			this.availableChurches = memberships
				.map((m) => m.expand?.church_id)
				.filter(Boolean) as unknown as Church[];

			// Set current membership - default to first one if none set
			if (!this.currentMembership && memberships.length > 0) {
				this.currentMembership = memberships[0] as unknown as ChurchMembership;
			}

			console.log('Loaded user churches:', this.availableChurches.length);
		} catch (error) {
			console.error('Failed to load user churches:', error);
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Switch to a different church context
	 */
	async switchChurch(churchId: string): Promise<void> {
		// Find the membership for the target church
		const targetMembership = this.churchMemberships.find((m) => m.church_id === churchId);
		if (!targetMembership) return;

		this.churchLoading = true;
		try {
			// Set current membership to the target church membership
			this.currentMembership = targetMembership;

			// Reload permissions for new church context
			await this.loadPermissions();

			console.log('Switched to church:', this.currentChurch?.name);
		} catch (error) {
			console.error('Failed to switch church:', error);
			this.error = 'Failed to switch church context';
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Leave a church (if not the only admin)
	 */
	async leaveChurch(churchId: string): Promise<void> {
		if (!this.user) return;

		this.churchLoading = true;
		try {
			// Check if user is the only one with manage-church permission
			const rolesWithManageChurch = await pb.collection('roles').getFullList({
				filter: `church_id = "${churchId}" && permissions ~ "manage-church"`
			});

			if (rolesWithManageChurch.length > 0) {
				// Get all users with those roles
				const roleIds = rolesWithManageChurch.map((r) => r.id);
				const userRolesWithManageChurch = await pb.collection('user_roles').getFullList({
					filter: `church_id = "${churchId}" && (${roleIds.map((id) => `role_id = "${id}"`).join(' || ')})`
				});

				// If user is the only one with manage-church permission
				if (
					userRolesWithManageChurch.length === 1 &&
					userRolesWithManageChurch[0].user_id === this.user.id
				) {
					throw new Error(
						'Cannot leave church - you are the only user with church management permissions. Grant manage-church permission to another user first.'
					);
				}
			}

			// Remove user from church by deleting their membership
			const userMembership = await pb
				.collection('church_memberships')
				.getFirstListItem(`user_id = "${this.user.id}" && church_id = "${churchId}"`);

			await pb.collection('church_memberships').delete(userMembership.id);

			// Reload churches and switch context if necessary
			await this.loadUserChurches();

			console.log('Left church successfully');
		} catch (error: unknown) {
			console.error('Failed to leave church:', error);
			this.error = error instanceof Error ? error.message : 'Failed to leave church';
			throw error;
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Delete a church (only if user has manage-church permission)
	 */
	async deleteChurch(churchId: string): Promise<void> {
		if (!this.user) return;

		// Verify user has manage-church permission for this church
		const membership = this.churchMemberships.find((m) => m.church_id === churchId);
		if (!membership) {
			throw new Error('You are not a member of this church');
		}

		// Switch to this church context to check permissions
		if (this.currentMembership?.church_id !== churchId) {
			await this.switchChurch(churchId);
		}

		if (!this.hasPermission('manage-church')) {
			throw new Error('Only users with church management permissions can delete churches');
		}

		this.churchLoading = true;
		try {
			// Delete the church (cascading deletes should handle related data)
			await pb.collection('churches').delete(churchId);

			// Reload churches
			await this.loadUserChurches();

			console.log('Church deleted successfully');
		} catch (error: unknown) {
			console.error('Failed to delete church:', error);
			this.error = error instanceof Error ? error.message : 'Failed to delete church';
			throw error;
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Check if user has multiple church affiliations
	 */
	hasMultipleChurches = $derived(this.availableChurches.length > 1);

	/**
	 * Load pending invitations for the current user
	 */
	async loadPendingInvites(): Promise<void> {
		if (!this.user?.email) return;

		this.invitesLoading = true;
		try {
			this.pendingInvites = await this.churchesAPI.getPendingInvites();
			console.log('Loaded pending invites:', this.pendingInvites.length);
		} catch (error: any) {
			console.error('Failed to load pending invites:', error);
			// Log more details about the error
			if (error.response) {
				console.error('Error response:', error.response);
			}
			this.pendingInvites = [];
		} finally {
			this.invitesLoading = false;
		}
	}

	/**
	 * Accept a church invitation
	 */
	async acceptInvitation(token: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const church = await this.churchesAPI.acceptInvitation(token);

			// Reload churches and invitations
			await this.loadUserChurches();
			await this.loadPendingInvites();

			// Switch to the new church
			await this.switchChurch(church.id);

			console.log('Invitation accepted successfully');
		} catch (error: unknown) {
			console.error('Failed to accept invitation:', error);
			this.error = error instanceof Error ? error.message : 'Failed to accept invitation';
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Decline a church invitation
	 */
	async declineInvitation(token: string): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			await this.churchesAPI.declineInvitation(token);

			// Reload invitations
			await this.loadPendingInvites();

			console.log('Invitation declined successfully');
		} catch (error: unknown) {
			console.error('Failed to decline invitation:', error);
			this.error = error instanceof Error ? error.message : 'Failed to decline invitation';
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Get count of pending invites
	 */
	pendingInvitesCount = $derived(this.pendingInvites.length);

	/**
	 * Get auth context for dependency injection
	 */
	getAuthContext(): AuthContext {
		return {
			user: this.user,
			currentMembership: this.currentMembership,
			currentChurch: this.currentChurch,
			isAuthenticated: this.isValid,
			token: this.token,
			isValid: this.isValid,
			pb: pb,
			userRoles: this.userRoles,
			userSkills: this.userSkills,
			permissions: this.permissions,
			hasPermission: (permission: Permission) => this.hasPermission(permission),
			hasSkill: (skillSlug: string) => this.hasSkill(skillSlug),
			hasLeaderSkill: () => this.hasLeaderSkill()
		};
	}

	/**
	 * Check if user has pending invites
	 */
	hasPendingInvites = $derived(this.pendingInvites.length > 0);
}

// Export the class type for tests
export type { AuthStore };

// Factory function for creating new store instances
export function createAuthStore(): AuthStore {
	return new AuthStore();
}
