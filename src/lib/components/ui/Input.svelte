<script lang="ts">
	/* eslint-disable svelte/no-unused-props */
	interface Props {
		label?: string;
		name: string;
		id?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'tel';
		value?: string | number;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		autocomplete?: HTMLInputElement['autocomplete'];
		class?: string;
		'data-testid'?: string;
		onkeydown?: (event: KeyboardEvent) => void;
	}

	let {
		label = '',
		name,
		id,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		required = false,
		disabled = false,
		error = '',
		autocomplete = '',
		class: className = '',
		'data-testid': testId = '',
		onkeydown
	}: Props = $props();
	
	let inputElement: HTMLInputElement;

	let inputId = id || `input-${name}`;
	let errorId = `error-${name}`;

	let inputClasses = $derived(
		`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 ${
			error ? 'ring-red-300 focus:ring-red-600' : 'ring-gray-300'
		} ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'} ${className}`
	);
	
	// Expose focus method
	export function focus() {
		inputElement?.focus();
	}
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm leading-6 font-medium text-gray-900">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<div class="relative">
		<input
			bind:this={inputElement}
			id={inputId}
			{name}
			{type}
			bind:value
			{placeholder}
			{required}
			{disabled}
			{autocomplete}
			class={inputClasses}
			aria-describedby={error ? errorId : undefined}
			aria-invalid={error ? 'true' : 'false'}
			data-testid={testId}
			{onkeydown}
		/>
	</div>

	{#if error}
		<p id={errorId} class="text-sm text-red-600" role="alert">
			{error}
		</p>
	{/if}
</div>
