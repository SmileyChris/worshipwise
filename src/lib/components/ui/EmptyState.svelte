<script lang="ts">
	import Button from './Button.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		message?: string;
		icon?: Snippet;
		action?: {
			label: string;
			onclick: () => void;
		};
		class?: string;
	}

	let {
		title = 'No items found',
		message = '',
		icon,
		action,
		class: className = ''
	}: Props = $props();
</script>

<div class="text-center py-12 {className}">
	{#if icon}
		<div class="mb-4 flex justify-center">
			<div class="text-gray-400">
				{@render icon()}
			</div>
		</div>
	{/if}
	
	<h3 class="text-lg font-medium text-gray-900">{title}</h3>
	
	{#if message}
		<p class="mt-2 text-sm text-gray-500">{message}</p>
	{/if}
	
	{#if action}
		<div class="mt-6">
			<Button onclick={action.onclick} variant="primary">
				{action.label}
			</Button>
		</div>
	{/if}
</div>