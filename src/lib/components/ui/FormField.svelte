<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		for?: string;
		required?: boolean;
		error?: string;
		helpText?: string;
		description?: string;
		class?: string;
		children: Snippet;
	}

	let {
		label,
		for: forId = '',
		required = false,
		error = '',
		helpText = '',
		description = '',
		class: className = '',
		children
	}: Props = $props();

	// Generate unique IDs for accessibility
	const errorId = forId ? `${forId}-error` : undefined;
	const descriptionId = forId ? `${forId}-description` : undefined;
	const helpId = forId ? `${forId}-help` : undefined;
</script>

<div class="space-y-1 {className}">
	<!-- Label -->
	<label for={forId} class="block text-sm font-medium leading-6 text-gray-900">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>

	<!-- Description (if provided) -->
	{#if description}
		<p id={descriptionId} class="text-sm text-gray-500">
			{description}
		</p>
	{/if}

	<!-- Input slot -->
	<div>
		{@render children()}
	</div>

	<!-- Error message -->
	{#if error}
		<p id={errorId} class="text-sm text-red-600" role="alert">
			{error}
		</p>
	{/if}

	<!-- Help text -->
	{#if helpText && !error}
		<p id={helpId} class="text-xs text-gray-500">
			{helpText}
		</p>
	{/if}
</div>