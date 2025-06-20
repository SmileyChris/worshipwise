<script lang="ts">
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
	<div class="p-4 border-b border-gray-200">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<!-- Category Color Indicator -->
				<div 
					class="w-4 h-4 rounded-full flex-shrink-0"
					style="background-color: {categoryColor}"
				></div>
				
				<div>
					<h3 class="text-lg font-semibold text-gray-900 font-title">
						{category.name}
					</h3>
					{#if category.description}
						<p class="text-sm text-gray-500 mt-1">
							{category.description}
						</p>
					{/if}
				</div>
			</div>
			
			<!-- Song Count Badge -->
			<div class="flex items-center space-x-2">
				<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
					{songs.length} {songs.length === 1 ? 'song' : 'songs'}
				</span>
			</div>
		</div>
	</div>

	<!-- Songs List -->
	<div class="p-4">
		{#if songs.length === 0}
			<div class="text-center py-8 text-gray-500">
				<div class="text-4xl mb-2">🎵</div>
				<p class="text-sm">No songs in this category yet</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each displayedSongs as song (song.id)}
					<div class="border border-gray-200 rounded-lg">
						<SongCard
							{song}
							onEdit={onEditSong}
							onAddToService={onAddToService}
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
						onclick={() => expanded = !expanded}
						class="text-primary hover:text-primary/80"
					>
						{expanded ? 'Show Less' : `Show ${songs.length - 3} More`}
						<svg 
							class="ml-1 w-4 h-4 transition-transform {expanded ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</Card>