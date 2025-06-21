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
		} catch (error: any) {
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

			// Create the profile record with additional user data
			const profile = await pb.collection('profiles').create({
				user_id: user.id,
				name: data.name,
				role: data.role || 'musician',
				is_active: true
			});

			// Set the profile in the store
			this.profile = profile as unknown as Profile;

			console.log('Profile created:', profile.name);
			console.log('Registration successful:', user.email);

			// Redirect to dashboard
			await goto('/dashboard');
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
			console.error('Profile update failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update profile information
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

			// Update profile record
			const updatedProfile = await pb.collection('profiles').update(this.profile.id, profileData);
			this.profile = updatedProfile as unknown as Profile;

			console.log('Profile information updated successfully');
		} catch (error: any) {
			console.error('Profile info update failed:', error);
			this.error = this.getErrorMessage(error);
			throw error;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load user profile data
	 */
	async loadProfile(): Promise<void> {
		if (!this.user) return;

		try {
			const profiles = await pb.collection('profiles').getList(1, 1, {
				filter: `user_id = "${this.user.id}"`
			});

			if (profiles.items.length > 0) {
				this.profile = profiles.items[0] as unknown as Profile;
			}
		} catch (error) {
			console.error('Failed to load profile:', error);
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
	getErrorMessage(error: any): string {
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
			// Get all profiles for this user to find their churches
			const userProfiles = await pb.collection('profiles').getList(1, 50, {
				filter: `user_id = "${this.user.id}"`,
				expand: 'church_id'
			});

			// Extract unique churches from profiles
			const churchIds = [...new Set(userProfiles.items.map((p) => p.church_id).filter(Boolean))];

			if (churchIds.length > 0) {
				const churches = await pb.collection('churches').getList(1, 50, {
					filter: churchIds.map((id) => `id = "${id}"`).join(' || ')
				});

				this.availableChurches = churches.items as unknown as Church[];
			} else {
				this.availableChurches = [];
			}

			// Set current church from profile or first available
			if (this.profile?.church_id) {
				const currentChurch = this.availableChurches.find((c) => c.id === this.profile!.church_id);
				if (currentChurch) {
					this.currentChurch = currentChurch;
				}
			} else if (this.availableChurches.length > 0) {
				// Default to first church if no preference set
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
			const adminProfiles = await pb.collection('profiles').getList(1, 50, {
				filter: `church_id = "${churchId}" && role = "admin"`
			});

			if (adminProfiles.items.length === 1 && adminProfiles.items[0].user_id === this.user.id) {
				throw new Error(
					'Cannot leave church - you are the only administrator. Transfer admin role to another user or delete the church.'
				);
			}

			// Remove user from church by deleting their profile for this church
			const userProfile = await pb
				.collection('profiles')
				.getFirstListItem(`user_id = "${this.user.id}" && church_id = "${churchId}"`);

			await pb.collection('profiles').delete(userProfile.id);

			// Reload churches and switch context if necessary
			await this.loadUserChurches();

			console.log('Left church successfully');
		} catch (error: any) {
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
		if (this.profile.church_id !== churchId || this.profile.role !== 'admin') {
			throw new Error('Only church administrators can delete churches');
		}

		this.churchLoading = true;
		try {
			// Delete the church (cascading deletes should handle related data)
			await pb.collection('churches').delete(churchId);

			// Reload churches
			await this.loadUserChurches();

			console.log('Church deleted successfully');
		} catch (error: any) {
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
	getCurrentChurchRole = $derived(this.profile?.role || 'member');

	/**
	 * Check if user can manage current church (is admin)
	 */
	canManageChurch = $derived(this.getCurrentChurchRole === 'admin');

	/**
	 * Check if user has multiple church affiliations
	 */
	hasMultipleChurches = $derived(this.availableChurches.length > 1);
}

// Export singleton instance
export const auth = new AuthStore();
