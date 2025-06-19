<script lang="ts">
	import { onMount } from 'svelte';
	import { categoriesApi } from '$lib/api/categories';
	import type { Category } from '$lib/types/song';

	interface Props {
		value: string;
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), required = false, disabled = false, placeholder = 'Select category', onchange }: Props = $props();

	let categories: Category[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			categories = await categoriesApi.getCategories();
		} catch (err) {
			error = 'Failed to load categories';
			console.error('Error loading categories:', err);
		} finally {
			loading = false;
		}
	});

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		if (onchange) {
			onchange(value);
		}
	}
</script>

{#if loading}
	<div class="animate-pulse">
		<div class="h-10 bg-gray-200 rounded-md"></div>
	</div>
{:else if error}
	<div class="text-red-600 text-sm">{error}</div>
{:else}
	<select
		bind:value
		onchange={handleChange}
		{required}
		{disabled}
		class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
	>
		{#if !required}
			<option value="">{placeholder}</option>
		{/if}
		{#each categories as category}
			<option value={category.id}>{category.name}</option>
		{/each}
	</select>
{/if}