<script lang="ts">
	interface Props {
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
		size?: 'sm' | 'md';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'default', size = 'sm', class: className = '', children }: Props = $props();

	let baseClasses = 'inline-flex items-center font-medium rounded-full';

	let variantClasses = $derived(() => {
		switch (variant) {
			case 'primary':
				return 'bg-blue-100 text-blue-800';
			case 'success':
				return 'bg-green-100 text-green-800';
			case 'warning':
				return 'bg-yellow-100 text-yellow-800';
			case 'danger':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	});

	let sizeClasses = $derived(() => {
		switch (size) {
			case 'md':
				return 'px-3 py-1 text-sm';
			default:
				return 'px-2 py-1 text-xs';
		}
	});

	let combinedClasses = $derived(`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`);
</script>

<span class={combinedClasses}>
	{#if children}
		{@render children()}
	{/if}
</span>
