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
  
  // Redirect if not authenticated
  $effect(() => {
    if (browser && !auth.isValid) {
      goto('/login');
    }
  });

  // Check system status when authenticated user loads the app
  $effect(() => {
    if (browser && auth.isValid) {
      quickstartStore.checkSystemStatus().catch(error => {
        console.error('System status check failed:', error);
        connectionError = error;
      });
    }
  });
</script>

{#if auth.isValid}
  <ErrorBoundary error={connectionError}>
    <div class="min-h-screen bg-gray-50">
      <Navigation />
      
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <!-- System status and quickstart -->
        <SystemStatus />
        
        {@render children()}
      </main>
      
      <!-- Setup wizard modal -->
      <SetupWizard bind:open={quickstartStore.showSetupWizard} />
    </div>
  </ErrorBoundary>
{:else}
  <!-- Loading or redirecting -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Loading...</p>
    </div>
  </div>
{/if}