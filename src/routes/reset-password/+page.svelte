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

	// Form state
	let email = $state('');
	let success = $state(false);

	// Validation function
	function validateEmail(email: string): string {
		if (!email) return 'Email is required';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return 'Please enter a valid email address';
		}
		return '';
	}

	// Real-time validation using derived
	let emailError = $derived(email ? validateEmail(email) : '');

	// Form validation
	let isValid = $derived(email && !emailError);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		// Final validation
		const finalEmailError = validateEmail(email);
		emailError = finalEmailError;

		if (finalEmailError) {
			return;
		}

		try {
			await auth.requestPasswordReset(email);
			success = true;
		} catch (error) {
			// Error is handled in the auth store and displayed below
			console.error('Password reset request failed:', error);
		}
	}

	function handleBackToLogin() {
		goto('/login');
	}

	function handleTryAgain() {
		success = false;
		email = '';
		emailError = '';
		auth.clearError();
	}
</script>

<svelte:head>
	<title>Reset Password - WorshipWise</title>
	<meta name="description" content="Reset your WorshipWise account password" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<Card class="mx-auto w-full max-w-md">
			<div class="mb-6 text-center">
				<h1 class="font-title text-2xl font-bold text-gray-900">Reset Password</h1>
				<p class="mt-2 text-sm text-gray-600">
					{#if success}
						Check your email for reset instructions
					{:else}
						Enter your email to receive a password reset link
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
								<h3 class="text-sm font-medium text-green-800">Email sent successfully!</h3>
								<div class="mt-2 text-sm text-green-700">
									<p>
										We've sent a password reset link to <strong>{email}</strong>. Please check your
										email and follow the instructions to reset your password.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div class="text-sm text-gray-600">
						<p>Didn't receive the email?</p>
						<ul class="mt-2 list-inside list-disc space-y-1">
							<li>Check your spam/junk folder</li>
							<li>Make sure the email address is correct</li>
							<li>Wait a few minutes and try again</li>
						</ul>
					</div>

					<div class="flex space-x-3">
						<Button variant="ghost" onclick={handleTryAgain} class="flex-1">Try Again</Button>
						<Button variant="primary" onclick={handleBackToLogin} class="flex-1">
							Back to Login
						</Button>
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
						label="Email Address"
						name="email"
						type="email"
						bind:value={email}
						placeholder="Enter your email address"
						required
						error={emailError}
						autocomplete="email"
						data-testid="email-input"
					/>

					<Button
						type="submit"
						variant="primary"
						size="lg"
						class="w-full"
						loading={auth.loading}
						disabled={!isValid || auth.loading}
					>
						{auth.loading ? 'Sending...' : 'Send Reset Link'}
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
