<script lang="ts">
	interface Props {
		variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
		color?: 'default' | 'red' | 'yellow' | 'blue' | 'green' | 'gray';
		size?: 'sm' | 'md';
		class?: string;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		color,
		size = 'sm',
		class: className = '',
		children
	}: Props = $props();

	let baseClasses = 'inline-flex items-center font-medium rounded-full';

	let variantClasses = $derived.by(() => {
		// Color prop takes precedence over variant
		if (color) {
			switch (color) {
				case 'red':
					return 'bg-red-100 text-red-800';
				case 'yellow':
					return 'bg-yellow-100 text-yellow-800';
				case 'blue':
					return 'bg-primary/10 text-primary';
				case 'green':
					return 'bg-green-100 text-green-800';
				case 'gray':
					return 'bg-gray-100 text-gray-800';
				default:
					return 'bg-gray-100 text-gray-800';
			}
		}

		switch (variant) {
			case 'primary':
				return 'bg-primary/10 text-primary';
			case 'success':
				return 'bg-green-100 text-green-800';
			case 'warning':
				return 'bg-secondary/10 text-secondary';
			case 'danger':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	});

	let sizeClasses = $derived.by(() => {
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
