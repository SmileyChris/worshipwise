<script lang="ts">
	import type { Label } from '$lib/types/song';

	interface Props {
		label: Label;
		size?: 'sm' | 'md' | 'lg';
		removable?: boolean;
		onRemove?: (labelId: string) => void;
	}

	let { label, size = 'sm', removable = false, onRemove }: Props = $props();

	const sizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};

	function handleRemove() {
		if (onRemove) {
			onRemove(label.id);
		}
	}
</script>

<span
	class="inline-flex items-center rounded-full border {sizeClasses[size]} {removable ? 'pr-1' : ''}"
	style="background-color: {label.color ? label.color + '20' : '#F3F4F6'}; border-color: {label.color || '#D1D5DB'}; color: {label.color || '#374151'};"
>
	{label.name}
	{#if removable}
		<button
			onclick={handleRemove}
			class="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-current hover:bg-black hover:bg-opacity-20"
			aria-label="Remove {label.name}"
		>
			<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</span>