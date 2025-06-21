<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		label?: string;
		name: string;
		id?: string;
		value?: string;
		options?: Option[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		class?: string;
		'data-testid'?: string;
		children?: any;
		onchange?: (value: string) => void;
	}

	let {
		label = '',
		name,
		id,
		value = $bindable(),
		options = [],
		placeholder = 'Select an option',
		required = false,
		disabled = false,
		error = '',
		class: className = '',
		'data-testid': testId = '',
		children,
		onchange
	}: Props = $props();

	let selectId = id || `select-${name}`;
	let errorId = `error-${name}`;

	let selectClasses = $derived(
		`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset transition-colors focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 ${
			error ? 'ring-red-300 focus:ring-red-600' : 'ring-gray-300'
		} ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'} ${className}`
	);
</script>

<div class="space-y-1">
	{#if label}
		<label for={selectId} class="block text-sm leading-6 font-medium text-gray-900">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<select
		id={selectId}
		{name}
		bind:value
		{required}
		{disabled}
		class={selectClasses}
		aria-describedby={error ? errorId : undefined}
		aria-invalid={error ? 'true' : 'false'}
		data-testid={testId}
		onchange={(e) => {
			const target = e.target as HTMLSelectElement;
			value = target.value;
			if (onchange) {
				onchange(value);
			}
		}}
	>
		<option value="">{placeholder}</option>
		{#if children}
			{@render children()}
		{:else}
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		{/if}
	</select>

	{#if error}
		<p id={errorId} class="text-sm text-red-600" role="alert">
			{error}
		</p>
	{/if}
</div>
