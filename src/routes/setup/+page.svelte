<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getSetupStore } from '$lib/context/stores.svelte';
	import InitialSetup from '$lib/components/setup/InitialSetup.svelte';

	const setupStore = getSetupStore();

	onMount(async () => {
		// Check if setup is actually required
		const setupRequired = await setupStore.checkSetupRequired();

		// If setup is not required, redirect to dashboard
		if (!setupRequired) {
			await goto('/dashboard');
		}
	});
</script>

{#if setupStore.loading}
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
	>
		<div class="text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-gray-600">Checking setup status...</p>
		</div>
	</div>
{:else if setupStore.setupRequired}
	<InitialSetup />
{:else}
	<div
		class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
	>
		<div class="text-center">
			<p class="text-gray-600">Redirecting to dashboard...</p>
		</div>
	</div>
{/if}
