<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Navigation from '$lib/components/layout/Navigation.svelte';
  
  let { children } = $props();
  
  // Redirect if not authenticated
  $effect(() => {
    if (browser && !auth.isValid) {
      goto('/login');
    }
  });
</script>

{#if auth.isValid}
  <div class="min-h-screen bg-gray-50">
    <Navigation />
    
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {@render children()}
    </main>
  </div>
{:else}
  <!-- Loading or redirecting -->
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-sm text-gray-500">Loading...</p>
    </div>
  </div>
{/if}