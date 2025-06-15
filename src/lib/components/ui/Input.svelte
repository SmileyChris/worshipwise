<script lang="ts">
  interface Props {
    label?: string;
    name: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel';
    value?: string | number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    autocomplete?: string;
    class?: string;
    'data-testid'?: string;
  }
  
  let {
    label = '',
    name,
    type = 'text',
    value = $bindable(),
    placeholder = '',
    required = false,
    disabled = false,
    error = '',
    autocomplete = '',
    class: className = '',
    'data-testid': testId = ''
  }: Props = $props();
  
  let inputId = `input-${name}`;
  let errorId = `error-${name}`;
  
  let inputClasses = $derived(
    `block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 ${
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
    <label for={inputId} class="block text-sm font-medium leading-6 text-gray-900">
      {label}
      {#if required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <div class="relative">
    <input
      id={inputId}
      {name}
      {type}
      bind:value
      {placeholder}
      {required}
      {disabled}
      autocomplete={autocomplete as any}
      class={inputClasses}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? 'true' : 'false'}
      data-testid={testId}
    />
  </div>
  
  {#if error}
    <p id={errorId} class="text-sm text-red-600" role="alert">
      {error}
    </p>
  {/if}
</div>