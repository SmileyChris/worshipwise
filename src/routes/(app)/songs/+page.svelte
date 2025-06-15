<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
</script>

<svelte:head>
  <title>Songs - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page header -->
  <div class="md:flex md:items-center md:justify-between">
    <div class="min-w-0 flex-1">
      <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        Song Library
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Manage your worship songs and track usage patterns
      </p>
    </div>
    
    {#if auth.canManageSongs}
      <div class="mt-4 flex md:ml-4 md:mt-0">
        <Button variant="primary">
          Add New Song
        </Button>
      </div>
    {/if}
  </div>
  
  <!-- Welcome message for new users -->
  <Card>
    <div class="text-center py-8">
      <div class="text-6xl mb-4">🎵</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to your Song Library</h3>
      <p class="text-gray-500 mb-6">
        Get started by adding your first worship song to the library.
      </p>
      {#if auth.canManageSongs}
        <Button variant="primary">
          Add Your First Song
        </Button>
      {:else}
        <p class="text-sm text-gray-400">
          Contact your worship leader to add songs to the library.
        </p>
      {/if}
    </div>
  </Card>
  
  <!-- Stats cards (placeholder) -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card>
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-900">0</div>
        <div class="text-sm text-gray-500">Total Songs</div>
      </div>
    </Card>
    
    <Card>
      <div class="text-center">
        <div class="text-2xl font-bold text-green-600">0</div>
        <div class="text-sm text-gray-500">Available Songs</div>
      </div>
    </Card>
    
    <Card>
      <div class="text-center">
        <div class="text-2xl font-bold text-yellow-600">0</div>
        <div class="text-sm text-gray-500">Recently Used</div>
      </div>
    </Card>
  </div>
</div>