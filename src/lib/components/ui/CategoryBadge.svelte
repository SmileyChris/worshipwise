<script lang="ts">
	import type { Category } from '$lib/types/song';

	interface Props {
		category: Category;
		size?: 'sm' | 'md' | 'lg';
	}

	let { category, size = 'md' }: Props = $props();

	const sizeClasses = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-3 py-1.5 text-sm',
		lg: 'px-4 py-2 text-base'
	};
</script>

<span
	class="inline-flex items-center rounded-full font-medium {sizeClasses[size]}"
	style="background-color: {category.color || '#6B7280'}; color: white;"
>
	{category.name}
</span>