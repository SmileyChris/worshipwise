<script lang="ts">
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	const auth = getAuthStore();

	// Redirect if already logged in
	onMount(() => {
		if (auth.isValid) {
			goto('/dashboard');
		}
	});

	// URL parameters
	let token = $state('');
	let email = $state('');

	// Form state
	let password = $state('');
	let passwordConfirm = $state('');
	let success = $state(false);
	let tokenError = $state('');

	// Extract token and email from URL parameters
	$effect(() => {
		const params = new URLSearchParams(window.location.search);
		token = params.get('token') || '';
		email = params.get('email') || '';

		// Validate token presence
		if (!token) {
			tokenError = 'Invalid or missing reset token. Please request a new password reset.';
		}
	});

	// Validation functions
	function validatePassword(password: string): string {
		if (!password) return 'Password is required';
		if (password.length < 8) {
			return 'Password must be at least 8 characters';
		}
		return '';
	}

	function validatePasswordConfirm(password: string, confirm: string): string {
		if (!confirm) return 'Please confirm your password';
		if (password !== confirm) {
			return 'Passwords do not match';
		}
		return '';
	}

	// Real-time validation using derived
	let passwordError = $derived(password ? validatePassword(password) : '');
	let passwordConfirmError = $derived(
		passwordConfirm ? validatePasswordConfirm(password, passwordConfirm) : ''
	);

	// Form validation
	let isValid = $derived(
		token && password && passwordConfirm && !passwordError && !passwordConfirmError && !tokenError
	);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Final validation
		const finalPasswordError = validatePassword(password);
		const finalPasswordConfirmError = validatePasswordConfirm(password, passwordConfirm);

		passwordError = finalPasswordError;
		passwordConfirmError = finalPasswordConfirmError;

		if (finalPasswordError || finalPasswordConfirmError || !token) {
			return;
		}

		try {
			await auth.confirmPasswordReset(token, password, passwordConfirm);
			success = true;
		} catch (error) {
			// Error is handled in the auth store and displayed below
			console.error('Password reset confirmation failed:', error);
		}
	}

	function handleSignIn() {
		goto('/login');
	}

	function handleRequestNewReset() {
		goto('/reset-password');
	}
</script>

<svelte:head>
	<title>Confirm Password Reset - WorshipWise</title>
	<meta name="description" content="Set your new WorshipWise account password" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<Card class="mx-auto w-full max-w-md">
			<div class="mb-6 text-center">
				<h1 class="font-title text-2xl font-bold text-gray-900">Set New Password</h1>
				<p class="mt-2 text-sm text-gray-600">
					{#if success}
						Your password has been successfully reset
					{:else if tokenError}
						Reset link invalid or expired
					{:else}
						Enter your new password below
						{#if email}
							<br />
							<span class="font-medium">for {email}</span>
						{/if}
					{/if}
				</p>
			</div>

			{#if success}
				<!-- Success state -->
				<div class="space-y-4">
					<div class="rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.053 10.5a.75.75 0 00-1.06 1.061l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<h3 class="text-sm font-medium text-green-800">Password reset successful!</h3>
								<div class="mt-2 text-sm text-green-700">
									<p>
										Your password has been successfully updated. You can now sign in with your new
										password.
									</p>
								</div>
							</div>
						</div>
					</div>

					<Button variant="primary" onclick={handleSignIn} class="w-full">
						Continue to Sign In
					</Button>
				</div>
			{:else if tokenError}
				<!-- Token error state -->
				<div class="space-y-4">
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
								<h3 class="text-sm font-medium text-red-800">Invalid reset link</h3>
								<div class="mt-2 text-sm text-red-700">
									<p>{tokenError}</p>
								</div>
							</div>
						</div>
					</div>

					<div class="flex space-x-3">
						<Button variant="ghost" onclick={handleRequestNewReset} class="flex-1">
							Request New Reset
						</Button>
						<Button variant="primary" onclick={handleSignIn} class="flex-1">Back to Login</Button>
					</div>
				</div>
			{:else}
				<!-- Form state -->
				<form onsubmit={handleSubmit} class="space-y-4">
					{#if auth.error}
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
									<p class="text-sm text-red-800">{auth.error}</p>
								</div>
							</div>
						</div>
					{/if}

					<Input
						label="New Password"
						name="password"
						type="password"
						bind:value={password}
						placeholder="Enter your new password"
						required
						error={passwordError}
						autocomplete="new-password"
						data-testid="password-input"
					/>

					<Input
						label="Confirm New Password"
						name="passwordConfirm"
						type="password"
						bind:value={passwordConfirm}
						placeholder="Confirm your new password"
						required
						error={passwordConfirmError}
						autocomplete="new-password"
						data-testid="password-confirm-input"
					/>

					<Button
						type="submit"
						variant="primary"
						size="lg"
						class="w-full"
						loading={auth.loading}
						disabled={!isValid || auth.loading}
					>
						{auth.loading ? 'Updating Password...' : 'Update Password'}
					</Button>
				</form>

				<div class="mt-6 text-center">
					<p class="text-sm text-gray-600">
						Remember your password?
						<a href="/login" class="text-primary hover:text-primary/90 font-medium">
							Back to Sign In
						</a>
					</p>
				</div>
			{/if}
		</Card>
	</div>
</div>
