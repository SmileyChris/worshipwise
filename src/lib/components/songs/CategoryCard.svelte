<script lang="ts">
	/* eslint-disable svelte/no-unused-props */
	import type { Song } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import SongCard from './SongCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		category: {
			id: string;
			name: string;
			description?: string;
			color?: string;
		};
		songs: Song[];
		onEditSong?: (song: Song) => void;
		onAddToService?: (song: Song) => void;
		isEditingService?: boolean;
		songsInCurrentService?: Set<string>;
		class?: string;
	}

	let {
		category,
		songs,
		onEditSong = () => {},
		onAddToService = () => {},
		isEditingService = false,
		songsInCurrentService = new Set(),
		class: className = ''
	}: Props = $props();

	let expanded = $state(false);

	// Show first 3 songs by default, all when expanded
	let displayedSongs = $derived(expanded ? songs : songs.slice(0, 3));
	let hasMoreSongs = $derived(songs.length > 3);

	// Get category color or default
	let categoryColor = $derived(category.color || '#6b7280');
</script>

<Card class="overflow-hidden {className}">
	<!-- Category Header -->
	<div class="border-b border-gray-200 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<!-- Category Color Indicator -->
				<div
					class="h-4 w-4 flex-shrink-0 rounded-full"
					style="background-color: {categoryColor}"
				></div>

				<div>
					<h3 class="font-title text-lg font-semibold text-gray-900">
						{category.name}
					</h3>
					{#if category.description}
						<p class="mt-1 text-sm text-gray-500">
							{category.description}
						</p>
					{/if}
				</div>
			</div>

			<!-- Song Count Badge -->
			<div class="flex items-center space-x-2">
				<span
					class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
				>
					{songs.length}
					{songs.length === 1 ? 'song' : 'songs'}
				</span>
			</div>
		</div>
	</div>

	<!-- Songs List -->
	<div class="p-4">
		{#if songs.length === 0}
			<div class="py-8 text-center text-gray-500">
				<div class="mb-2 text-4xl">🎵</div>
				<p class="text-sm">No songs in this category yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each displayedSongs as song (song.id)}
					<div class="rounded-lg border border-gray-200">
						<SongCard
							{song}
							onEdit={onEditSong}
							{onAddToService}
							{isEditingService}
							isInCurrentService={songsInCurrentService.has(song.id)}
							class="border-0 shadow-none"
						/>
					</div>
				{/each}
			</div>

			<!-- Expand/Collapse Button -->
			{#if hasMoreSongs}
				<div class="mt-4 text-center">
					<Button
						variant="ghost"
						size="sm"
						onclick={() => (expanded = !expanded)}
						class="text-primary hover:text-primary/80"
					>
						{expanded ? 'Show Less' : `Show ${songs.length - 3} More`}
						<svg
							class="ml-1 h-4 w-4 transition-transform {expanded ? 'rotate-180' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</Card>
