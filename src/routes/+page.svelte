<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import AuthForm from '$lib/components/auth/AuthForm.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { setupStore } from '$lib/stores/setup.svelte';
	import { onMount } from 'svelte';
	import type { LoginCredentials } from '$lib/types/auth';

	let showSetupRedirect = $state(false);

	// Check if setup is required and redirect authenticated users
	onMount(async () => {
		if (auth.isValid) {
			goto('/dashboard');
			return;
		}

		// Check if churches exist - if not, show setup option
		const setupRequired = await setupStore.checkSetupRequired();
		showSetupRedirect = setupRequired;
	});

	async function handleLogin(data: unknown) {
		const credentials = data as LoginCredentials;
		try {
			await auth.login(credentials);
			// Navigation is handled in the auth store
		} catch (error) {
			// Error is handled in the auth store and displayed in the form
			console.error('Login failed:', error);
		}
	}
</script>

<svelte:head>
	<title>WorshipWise - Smart Worship Song Tracking</title>
	<meta name="description" content="Smart worship song tracking and planning for churches" />
</svelte:head>

{#if setupStore.loading}
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
	>
		<div class="text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if showSetupRedirect}
	<!-- No churches exist - show setup message -->
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
		<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
			<div class="text-center">
				<h1 class="font-title mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
					Welcome to <span class="text-primary ml-4 inline-flex items-baseline gap-4">
						<svg class="size-14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<use href="/logo.svg#svg1" width="24" height="24" />
						</svg>
						WorshipWise</span
					>
				</h1>
				<p class="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
					Get started by setting up your church and creating your first admin account.
				</p>

				<Card class="mx-auto max-w-md">
					<h2 class="font-title mb-4 text-2xl font-bold text-gray-900">Initial Setup Required</h2>
					<p class="mb-6 text-gray-600">
						Welcome to your new WorshipWise installation! Let's get your church set up so you can
						start tracking and planning worship services.
					</p>
					<Button variant="primary" size="lg" class="w-full">
						<a href="/setup" class="text-white">Begin Setup</a>
					</Button>
				</Card>
			</div>
		</div>
	</div>
{:else}
	<!-- Churches exist - show login form for existing users -->
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
		<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
				<!-- Welcome section -->
				<div class="text-center lg:text-left">
					<h1 class="font-title mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
						Welcome back to <span
							class="text-primary mt-2 block flex items-center justify-center gap-4 lg:justify-start"
						>
							<svg class="size-12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<use href="/logo.svg#svg1" width="24" height="24" />
							</svg>
							WorshipWise</span
						>
					</h1>
					<p class="mb-8 text-lg text-gray-600">
						Sign in to access your worship planning dashboard, collaborate with your team, and track
						your song usage.
					</p>

					<!-- Quick features -->
					<div class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
						<div class="flex items-center gap-2 text-gray-600">
							<div class="text-lg">🎵</div>
							<span>Smart song library</span>
						</div>
						<div class="flex items-center gap-2 text-gray-600">
							<div class="text-lg">📋</div>
							<span>Service planning</span>
						</div>
						<div class="flex items-center gap-2 text-gray-600">
							<div class="text-lg">👥</div>
							<span>Team collaboration</span>
						</div>
						<div class="flex items-center gap-2 text-gray-600">
							<div class="text-lg">📊</div>
							<span>Usage analytics</span>
						</div>
					</div>
				</div>

				<!-- Login form section -->
				<div class="flex justify-center">
					<div class="w-full max-w-md">
						<AuthForm
							mode="login"
							loading={auth.loading}
							error={auth.error}
							onSubmit={handleLogin}
						/>

						<div class="mt-6 text-center">
							<p class="text-sm text-gray-600">
								Need an account?
								<a href="/register" class="text-primary hover:text-primary/80 font-medium"
									>Create one here</a
								>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
