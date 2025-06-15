<script lang="ts">
  interface Props {
    class?: string;
    padding?: boolean;
    children?: import('svelte').Snippet;
  }
  
  let {
    class: className = '',
    padding = true,
    children
  }: Props = $props();
  
  let cardClasses = $derived(
    `bg-white rounded-lg border border-gray-200 shadow-sm ${
      padding ? 'p-6' : ''
    } ${className}`
  );
</script>

<div class={cardClasses}>
  {#if children}
    {@render children()}
  {/if}
</div>