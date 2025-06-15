# Component Development Guide

This guide outlines the patterns, conventions, and best practices for developing components in WorshipWise using Svelte 5 and TypeScript.

## Component Architecture

### Component Types

1. **UI Components** (`src/lib/components/ui/`): Reusable, generic interface elements
2. **Feature Components** (`src/lib/components/songs/`, `src/lib/components/setlists/`): Domain-specific components
3. **Layout Components** (`src/lib/components/layout/`): Page structure and navigation
4. **Form Components** (`src/lib/components/forms/`): Input handling and validation

### Component Structure

Each component should follow this structure:

```svelte
<!-- ComponentName.svelte -->
<script lang="ts">
  // 1. Type imports
  import type { ComponentType } from './types';
  
  // 2. Component imports
  import Button from '$lib/components/ui/Button.svelte';
  
  // 3. Store imports
  import { songStore } from '$lib/stores/songs.svelte';
  
  // 4. Utility imports
  import { formatDuration } from '$lib/utils/format';
  
  // 5. Props (using $props rune)
  let { 
    data,
    onUpdate = () => {},
    class: className = '',
    ...restProps 
  }: Props = $props();
  
  // 6. State (using $state rune)
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // 7. Derived values (using $derived rune)
  let isValid = $derived(data.title.length > 0);
  let displayName = $derived(`${data.title} - ${data.artist}`);
  
  // 8. Effects (using $effect rune)
  $effect(() => {
    // Side effects go here
    console.log('Data changed:', data);
  });
  
  // 9. Event handlers
  function handleSubmit() {
    isLoading = true;
    // Handle logic
  }
  
  // 10. Lifecycle (if needed)
  import { onMount } from 'svelte';
  onMount(() => {
    // Component mounted logic
  });
</script>

<!-- 11. Markup -->
<div class="component-wrapper {className}" {...restProps}>
  <!-- Component content -->
</div>

<!-- 12. Styles (if component-specific) -->
<style>
  .component-wrapper {
    /* Component-specific styles */
  }
</style>
```

## Svelte 5 Runes Patterns

### State Management

```svelte
<script lang="ts">
  // Simple state
  let count = $state(0);
  
  // Object state
  let user = $state({
    name: '',
    email: '',
    role: 'musician'
  });
  
  // Array state
  let songs = $state<Song[]>([]);
  
  // State with type annotation
  let status = $state<'loading' | 'success' | 'error'>('loading');
</script>
```

### Derived State

```svelte
<script lang="ts">
  let songs = $state<Song[]>([]);
  let searchTerm = $state('');
  
  // Derived filtering
  let filteredSongs = $derived(
    songs.filter(song => 
      song.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  // Derived calculations
  let totalDuration = $derived(
    songs.reduce((sum, song) => sum + (song.duration_seconds || 0), 0)
  );
  
  // Complex derived state
  let songsByKey = $derived(() => {
    const grouped = new Map();
    songs.forEach(song => {
      const key = song.key_signature || 'Unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(song);
    });
    return grouped;
  });
</script>
```

### Effects

```svelte
<script lang="ts">
  let searchTerm = $state('');
  let results = $state<Song[]>([]);
  
  // Effect for API calls
  $effect(() => {
    if (searchTerm.length > 2) {
      searchSongs(searchTerm).then(data => {
        results = data;
      });
    }
  });
  
  // Effect with cleanup
  $effect(() => {
    const unsubscribe = songStore.subscribe(songs => {
      // Handle subscription
    });
    
    return () => {
      unsubscribe();
    };
  });
  
  // Effect with dependencies
  $effect(() => {
    console.log('User or songs changed:', user, songs);
  });
</script>
```

### Props and Bindable

```svelte
<script lang="ts">
  // Props interface
  interface Props {
    song: Song;
    editable?: boolean;
    onUpdate?: (song: Song) => void;
    class?: string;
  }
  
  // Props destructuring
  let { 
    song, 
    editable = false, 
    onUpdate = () => {},
    class: className = '' 
  }: Props = $props();
  
  // Bindable props for two-way binding
  let { value = $bindable() }: { value: string } = $props();
</script>

<!-- Usage -->
<input bind:value />
```

## Component Patterns

### 1. UI Components

#### Button Component
```svelte
<!-- src/lib/components/ui/Button.svelte -->
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
    onclick?: () => void;
    children?: import('svelte').Snippet;
  }
  
  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    class: className = '',
    onclick = () => {},
    children
  }: Props = $props();
  
  let baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';
  
  let variantClasses = $derived(() => {
    switch (variant) {
      case 'primary': return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'secondary': return 'bg-gray-200 text-gray-900 hover:bg-gray-300';
      case 'danger': return 'bg-red-600 text-white hover:bg-red-700';
      case 'ghost': return 'hover:bg-gray-100 text-gray-900';
      default: return '';
    }
  });
  
  let sizeClasses = $derived(() => {
    switch (size) {
      case 'sm': return 'h-8 px-3 text-sm';
      case 'lg': return 'h-12 px-8 text-lg';
      default: return 'h-10 px-4';
    }
  });
  
  let combinedClasses = $derived(
    `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`
  );
</script>

<button 
  {type}
  class={combinedClasses}
  {disabled}
  onclick={onclick}
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  
  {#if children}
    {@render children()}
  {/if}
</button>
```

#### Modal Component
```svelte
<!-- src/lib/components/ui/Modal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  
  interface Props {
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }
  
  let {
    open = false,
    title = '',
    size = 'md',
    children,
    footer
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  
  let sizeClasses = $derived(() => {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      default: return 'max-w-lg';
    }
  });
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    on:keydown={handleKeydown}
  >
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50" 
      onclick={handleClose}
    ></div>
    
    <!-- Modal -->
    <div 
      class="relative bg-white rounded-lg shadow-xl {sizeClasses} w-full mx-4"
      transition:fly={{ y: 20, duration: 200 }}
    >
      <!-- Header -->
      {#if title}
        <div class="flex items-center justify-between p-6 border-b">
          <h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
          <button
            onclick={handleClose}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}
      
      <!-- Content -->
      <div class="p-6">
        {#if children}
          {@render children()}
        {/if}
      </div>
      
      <!-- Footer -->
      {#if footer}
        <div class="flex justify-end gap-2 p-6 border-t">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
```

### 2. Feature Components

#### Song Card Component
```svelte
<!-- src/lib/components/songs/SongCard.svelte -->
<script lang="ts">
  import type { Song } from '$lib/types/song';
  import { formatDuration } from '$lib/utils/format';
  import { getSongUsageStatus } from '$lib/utils/songs';
  import Button from '$lib/components/ui/Button.svelte';
  
  interface Props {
    song: Song;
    showUsageIndicator?: boolean;
    showActions?: boolean;
    onEdit?: (song: Song) => void;
    onAddToSetlist?: (song: Song) => void;
    class?: string;
  }
  
  let {
    song,
    showUsageIndicator = true,
    showActions = true,
    onEdit = () => {},
    onAddToSetlist = () => {},
    class: className = ''
  }: Props = $props();
  
  let usageStatus = $derived(
    showUsageIndicator ? getSongUsageStatus(song) : null
  );
  
  let statusColors = $derived(() => {
    switch (usageStatus) {
      case 'red': return 'bg-red-100 text-red-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  });
  
  let formattedDuration = $derived(
    song.duration_seconds ? formatDuration(song.duration_seconds) : null
  );
</script>

<div class="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow {className}">
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h3 class="font-semibold text-lg text-gray-900">{song.title}</h3>
      {#if song.artist}
        <p class="text-gray-600 text-sm">{song.artist}</p>
      {/if}
      
      <div class="flex items-center gap-2 mt-2">
        {#if song.key_signature}
          <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            Key: {song.key_signature}
          </span>
        {/if}
        
        {#if song.tempo}
          <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
            {song.tempo} BPM
          </span>
        {/if}
        
        {#if formattedDuration}
          <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
            {formattedDuration}
          </span>
        {/if}
        
        {#if usageStatus}
          <span class="px-2 py-1 text-xs font-medium rounded {statusColors}">
            {usageStatus === 'red' ? 'Recently Used' : 
             usageStatus === 'yellow' ? 'Used Recently' : 'Available'}
          </span>
        {/if}
      </div>
      
      {#if song.tags && song.tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-2">
          {#each song.tags as tag}
            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>
    
    {#if showActions}
      <div class="flex gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => onEdit(song)}
        >
          Edit
        </Button>
        <Button
          variant="primary"
          size="sm"
          onclick={() => onAddToSetlist(song)}
        >
          Add to Setlist
        </Button>
      </div>
    {/if}
  </div>
</div>
```

### 3. Form Components

#### Form Field Component
```svelte
<!-- src/lib/components/forms/FormField.svelte -->
<script lang="ts">
  interface Props {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
    value?: string | number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    options?: Array<{ value: string; label: string }>;
    class?: string;
    children?: import('svelte').Snippet;
  }
  
  let {
    label,
    name,
    type = 'text',
    value = $bindable(),
    placeholder = '',
    required = false,
    disabled = false,
    error = '',
    options = [],
    class: className = '',
    children
  }: Props = $props();
  
  let inputId = `field-${name}`;
  let errorId = `error-${name}`;
  
  let inputClasses = $derived(
    `block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
      error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
    } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`
  );
</script>

<div class="space-y-1 {className}">
  <label for={inputId} class="block text-sm font-medium text-gray-700">
    {label}
    {#if required}
      <span class="text-red-500">*</span>
    {/if}
  </label>
  
  {#if type === 'select'}
    <select
      id={inputId}
      {name}
      bind:value
      {required}
      {disabled}
      class={inputClasses}
      aria-describedby={error ? errorId : undefined}
    >
      <option value="">{placeholder || 'Select an option'}</option>
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  {:else if type === 'textarea'}
    <textarea
      id={inputId}
      {name}
      bind:value
      {placeholder}
      {required}
      {disabled}
      class={inputClasses}
      rows="4"
      aria-describedby={error ? errorId : undefined}
    ></textarea>
  {:else if children}
    {#if children}
      {@render children()}
    {/if}
  {:else}
    <input
      id={inputId}
      {name}
      {type}
      bind:value
      {placeholder}
      {required}
      {disabled}
      class={inputClasses}
      aria-describedby={error ? errorId : undefined}
    />
  {/if}
  
  {#if error}
    <p id={errorId} class="text-sm text-red-600">{error}</p>
  {/if}
</div>
```

## Store Integration

### Using Stores in Components

```svelte
<script lang="ts">
  import { songStore } from '$lib/stores/songs.svelte';
  import { setlistStore } from '$lib/stores/setlists.svelte';
  
  // Access store state
  let songs = $derived(songStore.songs);
  let loading = $derived(songStore.loading);
  let error = $derived(songStore.error);
  
  // Call store methods
  function handleAddSong(songData: CreateSongData) {
    songStore.createSong(songData);
  }
  
  function handleLoadSongs() {
    songStore.loadSongs();
  }
  
  // Subscribe to store changes
  $effect(() => {
    if (songs.length === 0) {
      songStore.loadSongs();
    }
  });
</script>
```

## Testing Components

### Unit Testing with Vitest

```typescript
// SongCard.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SongCard from './SongCard.svelte';
import type { Song } from '$lib/types/song';

const mockSong: Song = {
  id: '1',
  title: 'Amazing Grace',
  artist: 'Traditional',
  key_signature: 'G',
  tempo: 80,
  duration_seconds: 240,
  tags: ['hymn', 'traditional'],
  is_active: true,
  created: new Date().toISOString(),
  updated: new Date().toISOString()
};

describe('SongCard', () => {
  it('renders song information correctly', () => {
    render(SongCard, { song: mockSong });
    
    expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
    expect(screen.getByText('Traditional')).toBeInTheDocument();
    expect(screen.getByText('Key: G')).toBeInTheDocument();
    expect(screen.getByText('80 BPM')).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(SongCard, { song: mockSong, onEdit });
    
    const editButton = screen.getByText('Edit');
    await editButton.click();
    
    expect(onEdit).toHaveBeenCalledWith(mockSong);
  });
  
  it('hides actions when showActions is false', () => {
    render(SongCard, { song: mockSong, showActions: false });
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Add to Setlist')).not.toBeInTheDocument();
  });
});
```

## Performance Considerations

### Lazy Loading

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let HeavyComponent: any = null;
  let shouldLoad = $state(false);
  
  onMount(async () => {
    if (shouldLoad) {
      HeavyComponent = (await import('./HeavyComponent.svelte')).default;
    }
  });
  
  function loadComponent() {
    shouldLoad = true;
  }
</script>

{#if HeavyComponent}
  <svelte:component this={HeavyComponent} />
{:else if shouldLoad}
  <div class="animate-pulse">Loading...</div>
{:else}
  <button onclick={loadComponent}>Load Component</button>
{/if}
```

### Virtual Lists

```svelte
<script lang="ts">
  import { VirtualList } from 'svelte-virtual-list';
  
  let { items = [] }: { items: any[] } = $props();
  
  const itemHeight = 80;
  const listHeight = 400;
</script>

<div class="h-[400px]">
  <VirtualList {items} {itemHeight} let:item>
    <SongCard song={item} />
  </VirtualList>
</div>
```

## Accessibility Guidelines

### ARIA Labels and Roles

```svelte
<script lang="ts">
  let isExpanded = $state(false);
  let buttonId = 'menu-button';
  let menuId = 'menu-items';
</script>

<div class="relative">
  <button
    id={buttonId}
    class="flex items-center gap-2"
    aria-haspopup="true"
    aria-expanded={isExpanded}
    aria-controls={menuId}
    onclick={() => isExpanded = !isExpanded}
  >
    Options
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  
  {#if isExpanded}
    <div
      id={menuId}
      class="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg"
      role="menu"
      aria-labelledby={buttonId}
    >
      <button
        class="block w-full px-4 py-2 text-left hover:bg-gray-100"
        role="menuitem"
        onclick={() => {/* handle action */}}
      >
        Edit
      </button>
      <button
        class="block w-full px-4 py-2 text-left hover:bg-gray-100"
        role="menuitem"
        onclick={() => {/* handle action */}}
      >
        Delete
      </button>
    </div>
  {/if}
</div>
```

### Focus Management

```svelte
<script lang="ts">
  import { tick } from 'svelte';
  
  let dialogOpen = $state(false);
  let dialogElement: HTMLElement;
  let previousFocus: HTMLElement;
  
  async function openDialog() {
    previousFocus = document.activeElement as HTMLElement;
    dialogOpen = true;
    await tick();
    dialogElement?.focus();
  }
  
  function closeDialog() {
    dialogOpen = false;
    previousFocus?.focus();
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeDialog();
    }
  }
</script>

{#if dialogOpen}
  <div
    bind:this={dialogElement}
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:keydown={handleKeydown}
  >
    <!-- Dialog content -->
  </div>
{/if}
```

This component guide provides a comprehensive foundation for building consistent, maintainable, and accessible components in WorshipWise using Svelte 5 patterns and best practices.