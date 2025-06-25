<script lang="ts">
	import ProfileSettings from '$lib/components/profile/ProfileSettings.svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const auth = getAuthStore();

	// Redirect to login if not authenticated
	onMount(() => {
		if (!auth.isValid) {
			goto('/login');
		}
	});

	// Page metadata
	const pageTitle = 'Profile Settings';
</script>

<svelte:head>
	<title>{pageTitle} - WorshipWise</title>
	<meta
		name="description"
		content="Manage your profile settings and account preferences in WorshipWise."
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="font-title text-3xl font-bold text-gray-900">{pageTitle}</h1>
		<p class="mt-2 text-gray-600">Manage your account settings and preferences.</p>
	</div>

	{#if auth.isValid && auth.user}
		<div class="max-w-4xl">
			<ProfileSettings />
		</div>
	{:else}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-semibold text-gray-900">Authentication Required</h3>
				<p class="mt-1 text-sm text-gray-500">
					You need to be logged in to access your profile settings.
				</p>
				<div class="mt-6">
					<a
						href="/login"
						class="bg-primary hover:bg-primary/90 focus-visible:outline-primary inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
					>
						Sign In
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>
