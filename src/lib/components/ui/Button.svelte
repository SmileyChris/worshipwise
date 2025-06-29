<script lang="ts">
	/* eslint-disable svelte/no-unused-props */
	import type { Snippet } from 'svelte';
	
	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		onclick?: () => void;
		href?: string;
		target?: string;
		title?: string;
		'data-testid'?: string;
		children?: Snippet;
		icon?: Snippet;
		iconPosition?: 'left' | 'right';
		fullWidth?: boolean;
		align?: 'left' | 'center' | 'right';
		grow?: boolean;
		iconOnly?: boolean;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		class: className = '',
		onclick = () => {},
		href = '',
		target = '',
		title = '',
		'data-testid': testId = '',
		children,
		icon,
		iconPosition = 'left',
		fullWidth = false,
		align = 'center',
		grow = false,
		iconOnly = false
	}: Props = $props();

	let baseClasses = $derived.by(() => {
		const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
		const widthClass = fullWidth ? 'w-full' : grow ? 'flex-1' : '';
		const displayClass = fullWidth || grow ? 'flex' : 'inline-flex';
		
		return `${displayClass} items-center ${justifyClass} ${widthClass} font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-md`;
	});

	let variantClasses = $derived.by(() => {
		switch (variant) {
			case 'primary':
				return 'bg-primary text-white hover:bg-primary/90 shadow-sm';
			case 'secondary':
				return 'bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-sm';
			case 'danger':
				return 'bg-red-600 text-white hover:bg-red-700 shadow-sm';
			case 'ghost':
				return 'border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900';
			case 'outline':
				return 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900';
			case 'success':
				return 'bg-green-600 text-white hover:bg-green-700 shadow-sm';
			default:
				return '';
		}
	});

	let sizeClasses = $derived.by(() => {
		if (iconOnly) {
			switch (size) {
				case 'sm':
					return 'h-8 w-8 text-sm';
				case 'lg':
					return 'h-12 w-12 text-lg';
				default:
					return 'h-10 w-10';
			}
		} else {
			switch (size) {
				case 'sm':
					return 'h-8 px-3 text-sm gap-1.5';
				case 'lg':
					return 'h-12 px-8 text-lg gap-3';
				default:
					return 'h-10 px-4 gap-2';
			}
		}
	});

	let combinedClasses = $derived(`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`);

	let isDisabled = $derived(disabled || loading);
</script>

{#if href}
	<a {href} {target} {title} class={combinedClasses} data-testid={testId}>
		{#if loading}
			<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if icon && iconPosition === 'left'}
			{@render icon()}
		{/if}

		{#if children}
			{@render children()}
		{/if}
		
		{#if icon && iconPosition === 'right' && !loading}
			{@render icon()}
		{/if}
	</a>
{:else}
	<button
		{type}
		{title}
		class={combinedClasses}
		disabled={isDisabled}
		{onclick}
		data-testid={testId}
	>
		{#if loading}
			<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if icon && iconPosition === 'left'}
			{@render icon()}
		{/if}

		{#if children}
			{@render children()}
		{/if}
		
		{#if icon && iconPosition === 'right' && !loading}
			{@render icon()}
		{/if}
	</button>
{/if}
