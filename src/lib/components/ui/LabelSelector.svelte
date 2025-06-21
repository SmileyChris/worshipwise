<script lang="ts">
	import { onMount } from 'svelte';
	import { labelsApi } from '$lib/api/labels';
	import LabelBadge from './LabelBadge.svelte';
	import type { Label } from '$lib/types/song';

	interface Props {
		selectedLabelIds: string[];
		id?: string;
		onchange?: (labelIds: string[]) => void;
	}

	let { selectedLabelIds = $bindable([]), id, onchange }: Props = $props();

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
		filteredLabels = availableLabels.filter(
			(label) => label.name.toLowerCase().includes(query) && !selectedLabelIds.includes(label.id)
		);
	});

	function updateSelectedLabels() {
		selectedLabels = availableLabels.filter((label) => selectedLabelIds.includes(label.id));
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
		const newIds = selectedLabelIds.filter((id) => id !== labelId);
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
			<div class="h-10 rounded-md bg-gray-200"></div>
		</div>
	{:else if error}
		<div class="text-sm text-red-600">{error}</div>
	{:else}
		<!-- Selected Labels -->
		{#if selectedLabels.length > 0}
			<div class="mb-2 flex flex-wrap gap-1">
				{#each selectedLabels as label (label.id)}
					<LabelBadge {label} removable onRemove={removeLabel} />
				{/each}
			</div>
		{/if}

		<!-- Label Search Input -->
		<div class="relative">
			<input
				{id}
				type="text"
				bind:value={searchQuery}
				onfocus={handleInputFocus}
				onblur={handleInputBlur}
				placeholder="Search labels..."
				class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
			/>

			<!-- Dropdown -->
			{#if showDropdown && filteredLabels.length > 0}
				<div
					class="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none"
				>
					{#each filteredLabels as label (label.id)}
						<button
							type="button"
							onclick={() => addLabel(label)}
							class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100"
						>
							<LabelBadge {label} size="sm" />
							{#if label.description}
								<span class="text-sm text-gray-500">{label.description}</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
