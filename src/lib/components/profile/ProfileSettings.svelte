<script lang="ts">
	// Type imports
	import type { User, Profile } from '$lib/types/auth';

	// Component imports
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	// Store import
	import { auth } from '$lib/stores/auth.svelte';
	import { pb } from '$lib/api/client';

	// Props interface
	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// Form state
	let email = $state(auth.user?.email || '');
	let name = $state(auth.profile?.name || '');
	let churchName = $state(auth.profile?.church_name || '');
	let role = $state(auth.profile?.role || 'musician');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Loading and error states
	let isUpdatingProfile = $state(false);
	let isChangingPassword = $state(false);
	let profileError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let profileSuccess = $state<string | null>(null);
	let passwordSuccess = $state<string | null>(null);

	// Role options
	const roleOptions = [
		{ value: 'musician', label: 'Musician' },
		{ value: 'leader', label: 'Leader' },
		{ value: 'admin', label: 'Admin' }
	];

	// Filter role options based on current user permissions
	let availableRoleOptions = $derived.by(() => {
		if (auth.isAdmin) {
			return roleOptions; // Admin can choose any role
		} else if (auth.hasRole('leader')) {
			return roleOptions.filter((opt) => opt.value !== 'admin'); // Leaders can't become admin
		} else {
			return roleOptions.filter((opt) => opt.value === 'musician'); // Musicians can only be musicians
		}
	});

	// Reset form to current values
	function resetForm() {
		email = auth.user?.email || '';
		name = auth.profile?.name || '';
		churchName = auth.profile?.church_name || '';
		role = auth.profile?.role || 'musician';
		clearErrors();
		clearSuccessMessages();
	}

	// Clear all errors
	function clearErrors() {
		profileError = null;
		passwordError = null;
		// Validation errors are now derived, so they don't need manual clearing
	}

	// Clear success messages
	function clearSuccessMessages() {
		profileSuccess = null;
		passwordSuccess = null;
	}

	// Validation functions
	function validateEmail(email: string): string {
		if (!email) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return 'Please enter a valid email address';
		}
		return '';
	}

	function validateName(name: string): string {
		if (!name.trim()) return 'Name is required';
		if (name.trim().length < 2) return 'Name must be at least 2 characters';
		return '';
	}

	function validateCurrentPassword(password: string): string {
		if (!password) return 'Current password is required';
		return '';
	}

	function validateNewPassword(password: string): string {
		if (!password) return 'New password is required';
		if (password.length < 8) return 'Password must be at least 8 characters';
		return '';
	}

	function validateConfirmPassword(newPass: string, confirmPass: string): string {
		if (!confirmPass) return 'Please confirm your new password';
		if (newPass !== confirmPass) return 'Passwords do not match';
		return '';
	}

	// Validation state - computed from reactive inputs
	let emailError = $derived(email ? validateEmail(email) : '');
	let nameError = $derived(name ? validateName(name) : '');
	let currentPasswordError = $derived(
		currentPassword ? validateCurrentPassword(currentPassword) : ''
	);
	let newPasswordError = $derived(newPassword ? validateNewPassword(newPassword) : '');
	let confirmPasswordError = $derived(
		confirmPassword ? validateConfirmPassword(newPassword, confirmPassword) : ''
	);

	// Profile form validation
	let isProfileValid = $derived(email && name && !emailError && !nameError);

	// Password form validation
	let isPasswordValid = $derived(
		currentPassword &&
			newPassword &&
			confirmPassword &&
			!currentPasswordError &&
			!newPasswordError &&
			!confirmPasswordError
	);

	// Handle profile update
	async function handleProfileUpdate(event: Event) {
		event.preventDefault();

		// Clear previous messages
		clearErrors();
		clearSuccessMessages();

		// Final validation
		const finalEmailError = validateEmail(email);
		const finalNameError = validateName(name);

		if (finalEmailError || finalNameError) {
			return;
		}

		if (!auth.user || !auth.profile) {
			profileError = 'User not authenticated';
			return;
		}

		isUpdatingProfile = true;

		try {
			// Prepare profile data
			const profileData: Partial<Profile> = {
				name: name.trim(),
				church_name: churchName.trim() || undefined,
				role: role as 'musician' | 'leader' | 'admin'
			};

			// Prepare user data if email changed
			const userData = email !== auth.user.email ? { email } : undefined;

			// Update using the auth store method
			await auth.updateProfileInfo(profileData, userData);

			profileSuccess = 'Profile updated successfully!';
		} catch (error: any) {
			console.error('Profile update failed:', error);
			profileError = auth.getErrorMessage(error);
		} finally {
			isUpdatingProfile = false;
		}
	}

	// Handle password change
	async function handlePasswordChange(event: Event) {
		event.preventDefault();

		// Clear previous messages
		clearErrors();
		clearSuccessMessages();

		// Final validation
		const finalCurrentPasswordError = validateCurrentPassword(currentPassword);
		const finalNewPasswordError = validateNewPassword(newPassword);
		const finalConfirmPasswordError = validateConfirmPassword(newPassword, confirmPassword);

		if (finalCurrentPasswordError || finalNewPasswordError || finalConfirmPasswordError) {
			return;
		}

		if (!auth.user) {
			passwordError = 'User not authenticated';
			return;
		}

		isChangingPassword = true;

		try {
			// First verify current password by attempting to authenticate
			await pb.collection('users').authWithPassword(auth.user.email, currentPassword);

			// Update password
			await pb.collection('users').update(auth.user.id, {
				password: newPassword,
				passwordConfirm: confirmPassword
			});

			// Clear password fields
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';

			passwordSuccess = 'Password changed successfully!';
		} catch (error: any) {
			console.error('Password change failed:', error);
			if (error.response?.status === 400) {
				passwordError = 'Current password is incorrect';
			} else {
				passwordError = auth.getErrorMessage(error);
			}
		} finally {
			isChangingPassword = false;
		}
	}

	// Reset form when user/profile changes
	$effect(() => {
		if (auth.user && auth.profile) {
			resetForm();
		}
	});
</script>

<div class="space-y-8 {className}">
	<!-- Profile Information -->
	<Card class="p-6">
		<div class="mb-6">
			<h2 class="font-title text-lg font-semibold text-gray-900">Profile Information</h2>
			<p class="mt-1 text-sm text-gray-600">
				Update your personal information and account settings.
			</p>
		</div>

		<form onsubmit={handleProfileUpdate} class="space-y-4">
			{#if profileError}
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-red-800">{profileError}</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profileSuccess}
				<div class="rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-green-800">{profileSuccess}</p>
						</div>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Input
					label="Full Name"
					name="name"
					bind:value={name}
					placeholder="Enter your full name"
					required
					error={nameError}
					autocomplete="name"
					data-testid="profile-name-input"
				/>

				<Input
					label="Email Address"
					name="email"
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					required
					error={emailError}
					autocomplete="email"
					data-testid="profile-email-input"
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Input
					label="Church Name"
					name="churchName"
					bind:value={churchName}
					placeholder="Enter your church name (optional)"
					autocomplete="organization"
					data-testid="profile-church-input"
				/>

				<Select
					label="Role"
					name="role"
					bind:value={role}
					options={availableRoleOptions}
					required
					data-testid="profile-role-select"
				/>
			</div>

			<div class="flex justify-end gap-3">
				<Button type="button" variant="secondary" onclick={resetForm} disabled={isUpdatingProfile}>
					Reset
				</Button>
				<Button
					type="submit"
					variant="primary"
					loading={isUpdatingProfile}
					disabled={!isProfileValid || isUpdatingProfile}
				>
					{isUpdatingProfile ? 'Updating...' : 'Update Profile'}
				</Button>
			</div>
		</form>
	</Card>

	<!-- Password Change -->
	<Card class="p-6">
		<div class="mb-6">
			<h2 class="font-title text-lg font-semibold text-gray-900">Change Password</h2>
			<p class="mt-1 text-sm text-gray-600">Update your password to keep your account secure.</p>
		</div>

		<form onsubmit={handlePasswordChange} class="space-y-4">
			{#if passwordError}
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-red-800">{passwordError}</p>
						</div>
					</div>
				</div>
			{/if}

			{#if passwordSuccess}
				<div class="rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-green-800">{passwordSuccess}</p>
						</div>
					</div>
				</div>
			{/if}

			<Input
				label="Current Password"
				name="currentPassword"
				type="password"
				bind:value={currentPassword}
				placeholder="Enter your current password"
				required
				error={currentPasswordError}
				autocomplete="current-password"
				data-testid="current-password-input"
			/>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Input
					label="New Password"
					name="newPassword"
					type="password"
					bind:value={newPassword}
					placeholder="Enter your new password"
					required
					error={newPasswordError}
					autocomplete="new-password"
					data-testid="new-password-input"
				/>

				<Input
					label="Confirm New Password"
					name="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="Confirm your new password"
					required
					error={confirmPasswordError}
					autocomplete="new-password"
					data-testid="confirm-password-input"
				/>
			</div>

			<div class="flex justify-end">
				<Button
					type="submit"
					variant="primary"
					loading={isChangingPassword}
					disabled={!isPasswordValid || isChangingPassword}
				>
					{isChangingPassword ? 'Changing Password...' : 'Change Password'}
				</Button>
			</div>
		</form>
	</Card>
</div>
