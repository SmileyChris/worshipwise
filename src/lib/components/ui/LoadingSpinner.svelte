<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
		color?: 'primary' | 'gray' | 'white';
		message?: string;
		class?: string;
	}

	let {
		size = 'md',
		color = 'primary',
		message = '',
		class: className = ''
	}: Props = $props();

	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12'
	};

	const colorClasses = {
		primary: 'border-primary',
		gray: 'border-gray-600',
		white: 'border-white'
	};

	const spinnerClasses = $derived(`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-b-2`);
</script>

<div class="flex flex-col items-center justify-center {className}">
	<div class={spinnerClasses}></div>
	{#if message}
		<p class="mt-2 text-sm text-gray-500">{message}</p>
	{/if}
</div>