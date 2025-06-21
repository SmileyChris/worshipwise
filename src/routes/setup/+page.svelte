<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { setupStore } from '$lib/stores/setup.svelte';
	import InitialSetup from '$lib/components/setup/InitialSetup.svelte';

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
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Checking setup status...</p>
		</div>
	</div>
{:else if setupStore.setupRequired}
	<InitialSetup />
{:else}
	<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
		<div class="text-center">
			<p class="text-gray-600">Redirecting to dashboard...</p>
		</div>
	</div>
{/if}