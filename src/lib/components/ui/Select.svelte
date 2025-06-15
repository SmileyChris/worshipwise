<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }
  
  interface Props {
    label?: string;
    name: string;
    value?: string;
    options: Option[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
    'data-testid'?: string;
  }
  
  let {
    label = '',
    name,
    value = $bindable(),
    options,
    placeholder = 'Select an option',
    required = false,
    disabled = false,
    error = '',
    class: className = '',
    'data-testid': testId = ''
  }: Props = $props();
  
  let selectId = `select-${name}`;
  let errorId = `error-${name}`;
  
  let selectClasses = $derived(
    `block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset transition-colors focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 ${
      error 
        ? 'ring-red-300 focus:ring-red-600' 
        : 'ring-gray-300'
    } ${
      disabled 
        ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
        : 'bg-white'
    } ${className}`
  );
</script>

<div class="space-y-1">
  {#if label}
    <label for={selectId} class="block text-sm font-medium leading-6 text-gray-900">
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
  >
    <option value="">{placeholder}</option>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  
  {#if error}
    <p id={errorId} class="text-sm text-red-600" role="alert">
      {error}
    </p>
  {/if}
</div>