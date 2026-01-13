<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		padding?: boolean;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', padding = true, children, ...rest }: Props = $props();

	let cardClasses = $derived(
		`bg-white rounded-lg border border-gray-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`
	);
</script>

<div class={cardClasses} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</div>
