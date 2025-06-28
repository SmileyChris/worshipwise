<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	interface Props extends HTMLTextareaAttributes {
		error?: boolean;
	}

	let {
		class: className,
		error = false,
		...restProps
	}: Props = $props();
</script>

<textarea
	class={cn(
		'block w-full rounded-md border px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
		error
			? 'border-red-300 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-gray-300 focus:border-primary focus:ring-primary',
		className
	)}
	{...restProps}
/>