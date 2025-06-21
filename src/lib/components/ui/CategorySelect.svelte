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

	let {
		value = $bindable(),
		required = false,
		disabled = false,
		placeholder = 'Select category',
		onchange
	}: Props = $props();

	let categories: Category[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	async function loadCategories() {
		loading = true;
		try {
			categories = await categoriesApi.getCategories();
			error = '';
		} catch (err) {
			error = 'Failed to load categories';
			console.error('Error loading categories:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Initial load
		loadCategories();

		// Listen for data refresh events
		const handleDataRefresh = () => {
			console.log('Refreshing categories due to data update');
			loadCategories();
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('worshipwise:data-refreshed', handleDataRefresh);

			// Cleanup on unmount
			return () => {
				window.removeEventListener('worshipwise:data-refreshed', handleDataRefresh);
			};
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
		<div class="h-10 rounded-md bg-gray-200"></div>
	</div>
{:else if error}
	<div class="text-sm text-red-600">{error}</div>
{:else}
	<select
		bind:value
		onchange={handleChange}
		{required}
		{disabled}
		class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
	>
		{#if !required}
			<option value="">{placeholder}</option>
		{/if}
		{#each categories as category}
			<option value={category.id}>{category.name}</option>
		{/each}
	</select>
{/if}
