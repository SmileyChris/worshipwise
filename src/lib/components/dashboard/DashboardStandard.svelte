<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import { Music } from 'lucide-svelte';
  import { getSongsStore } from '$lib/context/stores.svelte';

  const songsStore = getSongsStore();
</script>

<div class="space-y-6">
  <!-- Recent Songs -->
  <Card>
    <div class="mb-4 flex items-center justify-between">
      <h3 class="font-title text-lg font-medium text-gray-900">Recent Songs</h3>
      <a href="/songs" class="text-primary hover:text-primary/90 text-sm">View All</a>
    </div>

    {#if songsStore.songs.length > 0}
      <div class="space-y-3">
        {#each songsStore.songs.slice(0, 5) as song (song.id)}
          <div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div>
              <div class="font-medium text-gray-900">{song.title}</div>
              {#if song.artist}
                <div class="text-sm text-gray-500">{song.artist}</div>
              {/if}
            </div>
            {#if song.key_signature}
              <span class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                {song.key_signature}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <EmptyState
        title="No songs yet"
        action={{ label: 'Add Your First Song', onclick: () => (window.location.href = '/songs?new=1') }}
        class="py-6"
      >
        {#snippet icon()}
          <Music class="h-12 w-12 text-gray-300" />
        {/snippet}
      </EmptyState>
    {/if}
  </Card>

  <!-- Compact links -->
  <div class="flex flex-wrap gap-4 text-sm">
    <a href="/songs?new=1" class="text-primary hover:text-primary/90">Add Song</a>
    <a href="/songs" class="text-primary hover:text-primary/90">Songs</a>
    <a href="/services" class="text-primary hover:text-primary/90">Services</a>
    <a href="/insights" class="text-primary hover:text-primary/90">Insights</a>
  </div>
</div>
