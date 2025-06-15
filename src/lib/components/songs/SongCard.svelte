<script lang="ts">
  import type { Song } from '$lib/types/song';
  import { auth } from '$lib/stores/auth.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  
  interface Props {
    song: Song;
    showUsageIndicator?: boolean;
    showActions?: boolean;
    onEdit?: (song: Song) => void;
    onDelete?: (song: Song) => void;
    onAddToSetlist?: (song: Song) => void;
    class?: string;
  }
  
  let {
    song,
    showUsageIndicator = true,
    showActions = true,
    onEdit = () => {},
    onDelete = () => {},
    onAddToSetlist = () => {},
    class: className = ''
  }: Props = $props();
  
  // Format duration from seconds to minutes:seconds
  let formattedDuration = $derived(() => {
    if (!song.duration_seconds) return null;
    const minutes = Math.floor(song.duration_seconds / 60);
    const seconds = song.duration_seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });
  
  // Usage status (placeholder - would need actual usage data)
  let usageStatus = $derived(() => {
    if (!showUsageIndicator) return null;
    // This would need to be calculated based on song_usage records
    // For now, return a placeholder
    return 'green'; // 'green' | 'yellow' | 'red'
  });
  
  let statusColors = $derived(() => {
    switch (usageStatus) {
      case 'red': return 'bg-red-100 text-red-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  });
  
  let statusText = $derived(() => {
    switch (usageStatus) {
      case 'red': return 'Recently Used';
      case 'yellow': return 'Used Recently';
      case 'green': return 'Available';
      default: return '';
    }
  });
  
  // Check if user can edit this song
  let canEdit = $derived(() => {
    return auth.canManageSongs || song.created_by === auth.user?.id;
  });
  
  let canDelete = $derived(() => {
    return auth.isAdmin;
  });
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow {className}">
  <div class="flex items-start justify-between">
    <div class="flex-1 min-w-0">
      <!-- Song title and artist -->
      <h3 class="font-semibold text-lg text-gray-900 truncate">{song.title}</h3>
      {#if song.artist}
        <p class="text-gray-600 text-sm truncate">{song.artist}</p>
      {/if}
      
      <!-- Metadata badges -->
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        {#if song.key_signature}
          <Badge variant="primary">
            Key: {song.key_signature}
          </Badge>
        {/if}
        
        {#if song.tempo}
          <Badge variant="default">
            {song.tempo} BPM
          </Badge>
        {/if}
        
        {#if formattedDuration}
          <Badge variant="default">
            {formattedDuration}
          </Badge>
        {/if}
        
        {#if usageStatus && statusText}
          <Badge variant={usageStatus === 'green' ? 'success' : usageStatus === 'yellow' ? 'warning' : 'danger'}>
            {statusText}
          </Badge>
        {/if}
      </div>
      
      <!-- Tags -->
      {#if song.tags && song.tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-2">
          {#each song.tags as tag}
            <Badge variant="default" size="sm">
              {tag}
            </Badge>
          {/each}
        </div>
      {/if}
      
      <!-- Files indicators -->
      {#if song.chord_chart || song.audio_file || (song.sheet_music && song.sheet_music.length > 0)}
        <div class="flex items-center gap-3 mt-2 text-sm text-gray-500">
          {#if song.chord_chart}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Chords
            </span>
          {/if}
          
          {#if song.audio_file}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Audio
            </span>
          {/if}
          
          {#if song.sheet_music && song.sheet_music.length > 0}
            <span class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sheet Music ({song.sheet_music.length})
            </span>
          {/if}
        </div>
      {/if}
      
      <!-- CCLI info -->
      {#if song.ccli_number}
        <p class="text-xs text-gray-400 mt-1">CCLI: {song.ccli_number}</p>
      {/if}
    </div>
    
    <!-- Actions -->
    {#if showActions}
      <div class="flex flex-col gap-2 ml-4 flex-shrink-0">
        {#if canEdit}
          <Button
            variant="ghost"
            size="sm"
            onclick={() => onEdit(song)}
            class="text-gray-600 hover:text-gray-800"
          >
            Edit
          </Button>
        {/if}
        
        {#if auth.canManageSetlists}
          <Button
            variant="primary"
            size="sm"
            onclick={() => onAddToSetlist(song)}
          >
            Add to Setlist
          </Button>
        {/if}
        
        {#if canDelete}
          <Button
            variant="danger"
            size="sm"
            onclick={() => onDelete(song)}
            class="text-red-600 hover:text-red-800"
          >
            Delete
          </Button>
        {/if}
      </div>
    {/if}
  </div>
</div>