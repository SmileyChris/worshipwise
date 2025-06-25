<script lang="ts">
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import AuthForm from '$lib/components/auth/AuthForm.svelte';
	import type { LoginCredentials } from '$lib/types/auth';

	const auth = getAuthStore();

	// Get return URL and invite flag from query params
	let returnUrl = $derived($page.url.searchParams.get('return') || '/dashboard');
	let hasInvite = $derived($page.url.searchParams.get('invite') === 'true');

	// Redirect if already logged in
	onMount(() => {
		if (auth.isValid) {
			goto(returnUrl);
		}
	});

	async function handleLogin(data: unknown) {
		const credentials = data as LoginCredentials;
		try {
			await auth.login(credentials);
			// After successful login, go to return URL instead of dashboard
			await goto(returnUrl);
		} catch (error) {
			// Error is handled in the auth store and displayed in the form
			console.error('Login failed:', error);
		}
	}
</script>

<svelte:head>
	<title>Sign In - WorshipWise</title>
	<meta name="description" content="Sign in to your WorshipWise account" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		{#if hasInvite}
			<div class="rounded-lg bg-blue-50 p-4 text-center">
				<p class="text-sm text-blue-800">
					Please sign in or create an account to accept your church invitation.
				</p>
			</div>
		{/if}
		<AuthForm mode="login" loading={auth.loading} error={auth.error} onSubmit={handleLogin} />
	</div>
</div>
