import { pb } from '$lib/api/client';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import type { User, Profile, LoginCredentials, RegisterData } from '$lib/types/auth';
import type { Church } from '$lib/types/church';

class AuthStore {
	// Reactive state using Svelte 5 runes
	user = $state<User | null>(null);
	profile = $state<Profile | null>(null);
	token = $state<string>('');
	isValid = $state<boolean>(false);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Church context state
	currentChurch = $state<Church | null>(null);
	availableChurches = $state<Church[]>([]);
	churchMemberships = $state<Record<string, any>[]>([]);
	churchLoading = $state<boolean>(false);

	constructor() {
		if (browser) {
			// Initialize from PocketBase auth store
			this.user = pb.authStore.model as User | null;
			this.token = pb.authStore.token;
			this.isValid = pb.authStore.isValid;

			// Load profile and churches if user is already authenticated
			if (this.isValid && this.user) {
				this.loadProfile();
				this.loadUserChurches();
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
				} else {
					this.profile = null;
					this.currentChurch = null;
					this.availableChurches = [];
					this.churchMemberships = [];
				}

				console.log('Auth state changed:', {
					isValid: this.isValid,
					user: this.user?.email,
					profile: this.profile?.name
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
			// Create the user account (basic auth fields only)
			const user = await pb.collection('users').create({
				email: data.email,
				password: data.password,
				passwordConfirm: data.passwordConfirm
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
	 * Update profile information via church membership
	 */
	async updateProfileInfo(profileData: Partial<Profile>, userData?: Partial<User>): Promise<void> {
		if (!this.user || !this.profile) return;

		this.loading = true;
		this.error = null;

		try {
			// Update user record if userData is provided
			if (userData) {
				const updatedUser = await pb.collection('users').update(this.user.id, userData);
				this.user = updatedUser as unknown as User;
			}

			// Update church membership record with profile data
			const membershipData: any = {};
			if (profileData.preferred_keys) membershipData.preferred_keys = profileData.preferred_keys;
			if (profileData.notification_preferences) membershipData.notification_preferences = profileData.notification_preferences;
			if (profileData.role) membershipData.role = profileData.role;

			if (Object.keys(membershipData).length > 0) {
				const updatedMembership = await pb.collection('church_memberships').update(this.profile.id, membershipData);
				
				// Update local profile with new data
				this.profile = {
					...this.profile,
					...profileData,
					preferred_keys: updatedMembership.preferred_keys,
					notification_preferences: updatedMembership.notification_preferences,
					role: updatedMembership.role
				};
			}

			console.log('Profile information updated successfully');
		} catch (error: unknown) {
			console.error('Profile info update failed:', error);
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
			// Get the user's primary church membership (first active one)
			const memberships = await pb.collection('church_memberships').getList(1, 1, {
				filter: `user_id = "${this.user.id}" && status = "active" && is_active = true`,
				expand: 'church_id',
				sort: '-created'
			});

			if (memberships.items.length > 0) {
				const membership = memberships.items[0];
				// Create a profile-like object from membership data
				this.profile = {
					id: membership.id,
					user_id: this.user.id,
					name: this.user.name,
					role: membership.role,
					church_id: membership.church_id,
					church_name: membership.expand?.church_id?.name,
					preferred_keys: membership.preferred_keys,
					notification_preferences: membership.notification_preferences,
					is_active: membership.is_active,
					created: membership.created,
					updated: membership.updated
				} as Profile;
			}
		} catch (error) {
			console.error('Failed to load profile from memberships:', error);
		}
	}

	/**
	 * Check if user has specific role
	 */
	hasRole(role: string): boolean {
		return this.profile?.role === role;
	}

	/**
	 * Check if user has any of the specified roles
	 */
	hasAnyRole(roles: string[]): boolean {
		return this.profile ? roles.includes(this.profile.role) : false;
	}

	/**
	 * Get user's display name
	 */
	displayName = $derived(this.profile?.name || this.user?.name || this.user?.email || 'User');

	/**
	 * Check if user can manage songs (leader or admin)
	 */
	canManageSongs = $derived(this.hasAnyRole(['leader', 'admin']));

	/**
	 * Check if user can manage services (leader or admin)
	 */
	canManageServices = $derived(this.hasAnyRole(['leader', 'admin']));

	/**
	 * Check if user is admin
	 */
	isAdmin = $derived(this.hasRole('admin'));

	/**
	 * Extract user-friendly error message
	 */
	getErrorMessage(error: unknown): string {
		if (error?.response?.data) {
			const data = error.response.data;

			// Handle validation errors
			if (data.data) {
				const firstField = Object.keys(data.data)[0];
				const firstError = data.data[firstField];
				if (firstError?.message) {
					return firstError.message;
				}
			}

			// Handle general errors
			if (data.message) {
				return data.message;
			}
		}

		// Fallback to generic messages
		if (error?.message) {
			if (error.message.includes('invalid credentials')) {
				return 'Invalid email or password';
			}
			if (error.message.includes('email')) {
				return 'Please check your email address';
			}
			return error.message;
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
			this.churchMemberships = memberships;

			// Extract churches from memberships
			this.availableChurches = memberships
				.map((m) => m.expand?.church_id)
				.filter(Boolean) as unknown as Church[];

			// Set current church from profile preference or first available
			if (this.profile?.church_id) {
				const currentChurch = this.availableChurches.find((c) => c.id === this.profile!.church_id);
				if (currentChurch) {
					this.currentChurch = currentChurch;
				} else if (this.availableChurches.length > 0) {
					// Profile has invalid church_id, use first available
					this.currentChurch = this.availableChurches[0];
					await this.updateProfileInfo({ church_id: this.currentChurch.id });
				}
			} else if (this.availableChurches.length > 0) {
				// No preference set, default to first church
				this.currentChurch = this.availableChurches[0];
				// Update profile with default church if we have one
				if (this.profile) {
					await this.updateProfileInfo({ church_id: this.currentChurch.id });
				}
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
		const targetChurch = this.availableChurches.find((c) => c.id === churchId);
		if (!targetChurch || !this.profile) return;

		this.churchLoading = true;
		try {
			// Update user's profile with new church context
			await this.updateProfileInfo({ church_id: churchId });
			this.currentChurch = targetChurch;

			console.log('Switched to church:', targetChurch.name);
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
		if (!this.user || !this.profile) return;

		this.churchLoading = true;
		try {
			// Check if user is the only admin
			const adminMemberships = await pb.collection('church_memberships').getList(1, 50, {
				filter: `church_id = "${churchId}" && role = "admin" && status = "active"`
			});

			if (adminMemberships.items.length === 1 && adminMemberships.items[0].user_id === this.user.id) {
				throw new Error(
					'Cannot leave church - you are the only administrator. Transfer admin role to another user or delete the church.'
				);
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
			this.error = error.message || 'Failed to leave church';
			throw error;
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Delete a church (only if user is admin)
	 */
	async deleteChurch(churchId: string): Promise<void> {
		if (!this.user || !this.profile) return;

		// Verify user is admin of this church
		const membership = this.churchMemberships.find(m => m.church_id === churchId);
		if (!membership || membership.role !== 'admin') {
			throw new Error('Only church administrators can delete churches');
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
			this.error = error.message || 'Failed to delete church';
			throw error;
		} finally {
			this.churchLoading = false;
		}
	}

	/**
	 * Get user's role in current church
	 */
	getCurrentChurchRole = $derived(() => {
		if (!this.currentChurch?.id || !this.churchMemberships.length) return 'member';
		
		const membership = this.churchMemberships.find(
			(m) => m.church_id === this.currentChurch!.id
		);
		return membership?.role || 'member';
	});

	/**
	 * Check if user can manage current church (is admin)
	 */
	canManageChurch = $derived(this.getCurrentChurchRole() === 'admin');

	/**
	 * Check if user has multiple church affiliations
	 */
	hasMultipleChurches = $derived(this.availableChurches.length > 1);
}

// Export singleton instance
export const auth = new AuthStore();
