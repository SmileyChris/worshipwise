import { pb } from '$lib/api/client';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import type { User, Profile, LoginCredentials, RegisterData } from '$lib/types/auth';

class AuthStore {
	// Reactive state using Svelte 5 runes
	user = $state<User | null>(null);
	profile = $state<Profile | null>(null);
	token = $state<string>('');
	isValid = $state<boolean>(false);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	constructor() {
		if (browser) {
			// Initialize from PocketBase auth store
			this.user = pb.authStore.model as User | null;
			this.token = pb.authStore.token;
			this.isValid = pb.authStore.isValid;

			// Listen for auth changes from PocketBase
			pb.authStore.onChange(() => {
				this.user = pb.authStore.model as User | null;
				this.token = pb.authStore.token;
				this.isValid = pb.authStore.isValid;
				this.error = null;

				console.log('Auth state changed:', {
					isValid: this.isValid,
					user: this.user?.email
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
				church_name: data.church_name || '',
				is_active: true
			});

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
	 * Check if user has specific role
	 */
	hasRole(role: string): boolean {
		return this.user?.role === role;
	}

	/**
	 * Check if user has any of the specified roles
	 */
	hasAnyRole(roles: string[]): boolean {
		return this.user ? roles.includes(this.user.role) : false;
	}

	/**
	 * Get user's display name
	 */
	displayName = $derived(this.user?.name || this.user?.email || 'User');

	/**
	 * Check if user can manage songs (leader or admin)
	 */
	canManageSongs = $derived(this.hasAnyRole(['leader', 'admin']));

	/**
	 * Check if user can manage setlists (leader or admin)
	 */
	canManageSetlists = $derived(this.hasAnyRole(['leader', 'admin']));

	/**
	 * Check if user is admin
	 */
	isAdmin = $derived(this.hasRole('admin'));

	/**
	 * Extract user-friendly error message
	 */
	private getErrorMessage(error: any): string {
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
}

// Export singleton instance
export const auth = new AuthStore();
