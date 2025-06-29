<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import EmptyState from './EmptyState.svelte';

	interface Props {
		items: any[];
		loading?: boolean;
		columns?: {
			default?: number;
			sm?: number;
			md?: number;
			lg?: number;
			xl?: number;
		};
		gap?: number;
		emptyState?: {
			title?: string;
			message?: string;
			icon?: Snippet;
			action?: {
				label: string;
				onclick: () => void;
			};
		};
		class?: string;
		children: Snippet<[any, number]>;
	}

	let {
		items = [],
		loading = false,
		columns = { default: 1, md: 2, lg: 3 },
		gap = 4,
		emptyState,
		class: className = '',
		children
	}: Props = $props();

	// Build grid classes based on columns prop
	const gridClasses = $derived.by(() => {
		let classes = ['grid'];
		
		// Default columns
		if (columns.default) {
			classes.push(`grid-cols-${columns.default}`);
		}
		
		// Responsive columns
		if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
		if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
		if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
		if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);
		
		// Gap
		classes.push(`gap-${gap}`);
		
		return classes.join(' ');
	});
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<LoadingSpinner message="Loading..." />
	</div>
{:else if items.length === 0}
	{#if emptyState}
		<EmptyState {...emptyState} />
	{:else}
		<EmptyState title="No items found" />
	{/if}
{:else}
	<div class="{gridClasses} {className}">
		{#each items as item, index}
			{@render children(item, index)}
		{/each}
	</div>
{/if}