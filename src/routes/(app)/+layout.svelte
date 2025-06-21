<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { quickstartStore } from '$lib/stores/quickstart.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import SystemStatus from '$lib/components/quickstart/SystemStatus.svelte';
	import SetupWizard from '$lib/components/quickstart/SetupWizard.svelte';
	import ErrorBoundary from '$lib/components/quickstart/ErrorBoundary.svelte';

	let { children } = $props();

	let connectionError = $state(null);

	// Check system status on load (regardless of auth state for setup)
	$effect(() => {
		if (browser) {
			quickstartStore.checkSystemStatus().catch((error) => {
				console.error('System status check failed:', error);
				connectionError = error;
			});
		}
	});

	// Redirect if not authenticated and setup is complete
	$effect(() => {
		if (browser && !auth.isValid && !quickstartStore.systemStatus.needsSetup) {
			goto('/login');
		}
	});
</script>

{#if auth.isValid || quickstartStore.systemStatus.needsSetup}
	<ErrorBoundary error={connectionError}>
		<div class="min-h-screen bg-gray-50">
			{#if auth.isValid}
				<Navigation />
			{/if}

			<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{#if auth.isValid}
					<!-- System status and quickstart for authenticated users -->
					<SystemStatus />
					{@render children()}
				{:else if quickstartStore.systemStatus.needsSetup}
					<!-- Setup mode for unauthenticated users -->
					<div class="text-center py-12">
						<h1 class="text-3xl font-bold text-gray-900 mb-4">🎵 Welcome to WorshipWise</h1>
						<p class="text-lg text-gray-600 mb-8">Your system is ready! Let's create your first worship account.</p>
						<button 
							onclick={() => (quickstartStore.showSetupWizard = true)}
							class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90"
						>
							Get Started
						</button>
					</div>
				{/if}
			</main>

			<!-- Setup wizard modal -->
			<SetupWizard open={quickstartStore.showSetupWizard} />
		</div>
	</ErrorBoundary>
{:else}
	<!-- Loading or redirecting -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
			<p class="mt-2 text-sm text-gray-500">Loading...</p>
		</div>
	</div>
{/if}
