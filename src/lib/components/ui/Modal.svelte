<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import Button from './Button.svelte';
  
  interface Props {
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    children?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }
  
  let {
    open = false,
    title = '',
    size = 'md',
    showCloseButton = true,
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
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? "modal-title" : undefined}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    tabindex="-1"
  >
    <div class="fixed inset-0 bg-black bg-opacity-50"></div>
    
    <!-- Modal -->
    <div 
      class="relative bg-white rounded-lg shadow-xl {sizeClasses} w-full max-h-[90vh] flex flex-col"
      transition:fly={{ y: 20, duration: 200 }}
    >
      <!-- Header -->
      {#if title || showCloseButton}
        <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          {#if title}
            <h2 id="modal-title" class="text-lg font-semibold text-gray-900">{title}</h2>
          {:else}
            <div></div>
          {/if}
          
          {#if showCloseButton}
            <Button
              variant="ghost"
              size="sm"
              onclick={handleClose}
              class="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          {/if}
        </div>
      {/if}
      
      <!-- Content -->
      <div class="p-6 flex-1 overflow-y-auto">
        {#if children}
          {@render children()}
        {/if}
      </div>
      
      <!-- Footer -->
      {#if footer}
        <div class="flex justify-end gap-2 p-6 border-t border-gray-200 flex-shrink-0">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}