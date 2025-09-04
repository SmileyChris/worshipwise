<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { Music } from 'lucide-svelte';
  import { getQuickstartStore, getSongsStore } from '$lib/context/stores.svelte';

  const quickstart = getQuickstartStore();
  const songs = getSongsStore();

  function openSetupWizard() {
    quickstart.showSetupWizard = true;
  }
</script>

<div class="space-y-6">
  <!-- Hero / Primary CTAs -->
  <Card>
    <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h2 class="font-title text-xl font-semibold text-gray-900">Welcome to WorshipWise</h2>
        <p class="mt-1 text-gray-600">Plan services and manage songs with your team.</p>
      </div>

      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <a href="/songs?new=1" class="bg-primary hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-white">
          <Music class="mr-2 h-4 w-4" />
          Add Song
        </a>
        <a href="/services" class="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50">
          Plan Service
        </a>
      </div>
    </div>

    {#if !quickstart.isSetupComplete}
      <div class="mt-3">
        <Button variant="outline" size="sm" onclick={openSetupWizard}>Open Setup Wizard</Button>
      </div>
    {/if}
  </Card>

  <!-- Empty state for first songs -->
  {#if songs.songs.length === 0}
    <Card class="p-0">
      <EmptyState
        title="No songs yet"
        action={{ label: 'Add Your First Song', onclick: () => (window.location.href = '/songs?new=1') }}
        class="py-8"
      >
        {#snippet icon()}
          <Music class="h-12 w-12 text-gray-300" />
        {/snippet}
        <p class="mt-2 text-sm text-gray-600">Start by adding a few songs your church uses most.</p>
      </EmptyState>
    </Card>
  {/if}
</div>
