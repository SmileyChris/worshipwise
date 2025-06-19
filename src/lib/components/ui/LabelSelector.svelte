<script lang="ts">
	import { onMount } from 'svelte';
	import { labelsApi } from '$lib/api/labels';
	import LabelBadge from './LabelBadge.svelte';
	import type { Label } from '$lib/types/song';

	interface Props {
		selectedLabelIds: string[];
		onchange?: (labelIds: string[]) => void;
	}

	let { selectedLabelIds = $bindable([]), onchange }: Props = $props();

	let availableLabels: Label[] = $state([]);
	let filteredLabels: Label[] = $state([]);
	let selectedLabels: Label[] = $state([]);
	let searchQuery = $state('');
	let showDropdown = $state(false);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			availableLabels = await labelsApi.getLabels();
			updateSelectedLabels();
		} catch (err) {
			error = 'Failed to load labels';
			console.error('Error loading labels:', err);
		} finally {
			loading = false;
		}
	});

	$effect(() => {
		updateSelectedLabels();
	});

	$effect(() => {
		const query = searchQuery.toLowerCase();
		filteredLabels = availableLabels.filter(label => 
			label.name.toLowerCase().includes(query) && 
			!selectedLabelIds.includes(label.id)
		);
	});

	function updateSelectedLabels() {
		selectedLabels = availableLabels.filter(label => selectedLabelIds.includes(label.id));
	}

	function addLabel(label: Label) {
		const newIds = [...selectedLabelIds, label.id];
		selectedLabelIds = newIds;
		if (onchange) {
			onchange(newIds);
		}
		searchQuery = '';
		showDropdown = false;
	}

	function removeLabel(labelId: string) {
		const newIds = selectedLabelIds.filter(id => id !== labelId);
		selectedLabelIds = newIds;
		if (onchange) {
			onchange(newIds);
		}
	}

	function handleInputFocus() {
		showDropdown = true;
	}

	function handleInputBlur() {
		// Delay hiding dropdown to allow for clicks
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}
</script>

<div class="relative">
	{#if loading}
		<div class="animate-pulse">
			<div class="h-10 bg-gray-200 rounded-md"></div>
		</div>
	{:else if error}
		<div class="text-red-600 text-sm">{error}</div>
	{:else}
		<!-- Selected Labels -->
		{#if selectedLabels.length > 0}
			<div class="flex flex-wrap gap-1 mb-2">
				{#each selectedLabels as label}
					<LabelBadge {label} removable onRemove={removeLabel} />
				{/each}
			</div>
		{/if}

		<!-- Label Search Input -->
		<div class="relative">
			<input
				type="text"
				bind:value={searchQuery}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				placeholder="Search labels..."
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>

			<!-- Dropdown -->
			{#if showDropdown && filteredLabels.length > 0}
				<div class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
					{#each filteredLabels as label}
						<button
							type="button"
							onclick={() => addLabel(label)}
							class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
						>
							<LabelBadge {label} size="sm" />
							{#if label.description}
								<span class="text-gray-500 text-sm">{label.description}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>