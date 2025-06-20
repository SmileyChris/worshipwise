<script lang="ts">
	import type { Service, ServiceSong, CreateServiceSongData } from '$lib/types/service';
	import type { Song } from '$lib/types/song';
	import { servicesStore } from '$lib/stores/services.svelte';
	import { songsStore } from '$lib/stores/songs.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	interface Props {
		serviceId: string;
		onClose?: () => void;
	}

	let { serviceId, onClose = () => {} }: Props = $props();

	let searchQuery = $state('');
	let selectedSection = $state<ServiceSong['section_type']>('Praise & Worship');
	let draggedSong = $state<Song | null>(null);
	let draggedServiceSong = $state<ServiceSong | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Computed values
	let filteredSongs = $derived.by(() => {
		const songs = songsStore.songs || [];
		if (!searchQuery) return songs;
		const query = searchQuery.toLowerCase();
		return songs.filter(
			(song) =>
				song.title.toLowerCase().includes(query) ||
				(song.artist && song.artist.toLowerCase().includes(query))
		);
	});

	let totalDuration = $derived.by(() => {
		return servicesStore.currentServiceDuration || 0;
	});

	let formattedDuration = $derived.by(() => {
		const duration = Number(totalDuration) || 0;
		const minutes = Math.floor(duration / 60);
		const seconds = duration % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Section types for dropdown
	const sectionTypes: ServiceSong['section_type'][] = [
		'Opening',
		'Call to Worship',
		'Praise & Worship',
		'Intercession',
		'Offering',
		'Communion',
		'Response',
		'Closing',
		'Special Music'
	];

	onMount(async () => {
		loading = true;
		try {
			// Load the service and its songs
			await servicesStore.loadService(serviceId);
			// Load available songs
			await songsStore.loadSongs();
		} catch (err: any) {
			error = err.message || 'Failed to load service';
		} finally {
			loading = false;
		}
	});

	// Drag and drop handlers for songs from library
	function handleSongDragStart(event: DragEvent, song: Song) {
		draggedSong = song;
		draggedServiceSong = null;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'copy';
			event.dataTransfer.setData('text/plain', song.id);
		}
	}

	// Drag and drop handlers for reordering service songs
	function handleServiceSongDragStart(event: DragEvent, song: ServiceSong, index: number) {
		draggedServiceSong = song;
		draggedSong = null;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', index.toString());
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = draggedSong ? 'copy' : 'move';
		}
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		dragOverIndex = null;

		try {
			if (draggedSong) {
				// Adding a new song to the service
				const newSong: CreateServiceSongData = {
					service_id: serviceId,
					song_id: draggedSong.id,
					order_position: dropIndex,
					section_type: selectedSection
				};
				await servicesStore.addSongToService(newSong);
			} else if (draggedServiceSong && event.dataTransfer) {
				// Reordering existing songs
				const fromIndex = parseInt(event.dataTransfer.getData('text/plain'));
				if (fromIndex !== dropIndex) {
					// Create new order for all songs
					const songs = [...servicesStore.currentServiceSongs];
					const [movedSong] = songs.splice(fromIndex, 1);
					songs.splice(dropIndex, 0, movedSong);

					// Generate the new order array
					const newOrder = songs.map((song, index) => ({
						id: song.id,
						position: index
					}));

					await servicesStore.reorderServiceSongs(newOrder);
				}
			}
		} catch (err: any) {
			error = err.message || 'Failed to update service';
		} finally {
			draggedSong = null;
			draggedServiceSong = null;
		}
	}

	async function removeSongFromService(songId: string) {
		try {
			await servicesStore.removeSongFromService(songId);
		} catch (err: any) {
			error = err.message || 'Failed to remove song';
		}
	}

	async function updateSongKey(songId: string, newKey: string) {
		try {
			await servicesStore.updateServiceSong(songId, { transposed_key: newKey });
		} catch (err: any) {
			error = err.message || 'Failed to update key';
		}
	}

	async function updateSongNotes(songId: string, notes: string) {
		try {
			await servicesStore.updateServiceSong(songId, { transition_notes: notes });
		} catch (err: any) {
			error = err.message || 'Failed to update notes';
		}
	}

	// Get song usage status
	function getSongUsageStatus(song: Song): { color: string; text: string; icon: string } {
		const status = song.usageStatus || 'available';
		const daysSince = song.daysSinceLastUsed;

		switch (status) {
			case 'recent':
				return {
					color: 'text-red-600 bg-red-50',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Recently Used',
					icon: '⚠️'
				};
			case 'caution':
				return {
					color: 'text-yellow-600 bg-yellow-50',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Used Recently',
					icon: '⚡'
				};
			case 'available':
			default:
				return {
					color: 'text-green-600 bg-green-50',
					text: 'Available',
					icon: '✓'
				};
		}
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<div class="text-gray-500">Loading service...</div>
	</div>
{:else if error}
	<div class="rounded-lg bg-red-50 p-4 text-red-800">
		{error}
	</div>
{:else if servicesStore.currentService}
	<div class="flex h-full flex-col">
		<!-- Header -->
		<div class="border-b border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold font-title text-gray-900">
						{servicesStore.currentService.title}
					</h2>
					<p class="text-sm text-gray-600">
						{new Date(servicesStore.currentService.service_date).toLocaleDateString()}
						{#if servicesStore.currentService.service_type}
							• {servicesStore.currentService.service_type}
						{/if}
					</p>
				</div>
				<div class="flex items-center gap-4">
					<Badge variant="primary">
						{servicesStore.currentServiceSongs.length} songs • {formattedDuration()}
					</Badge>
					<Button variant="ghost" onclick={onClose}>Close</Button>
				</div>
			</div>
		</div>

		<div class="flex flex-1 overflow-hidden">
			<!-- Songs Library -->
			<div class="w-1/3 border-r border-gray-200 bg-gray-50 p-4">
				<h3 class="mb-3 text-lg font-medium font-title text-gray-900">Song Library</h3>

				<!-- Search -->
				<input
					type="search"
					placeholder="Search songs..."
					bind:value={searchQuery}
					class="mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>

				<!-- Section selector -->
				<select
					bind:value={selectedSection}
					class="mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				>
					{#each sectionTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>

				<!-- Songs list -->
				<div class="space-y-2 overflow-y-auto" style="max-height: calc(100vh - 300px);">
					{#each filteredSongs() as song}
						{@const usageStatus = getSongUsageStatus(song)}
						<div
							role="button"
							tabindex="0"
							draggable="true"
							ondragstart={(e) => handleSongDragStart(e, song)}
							class="cursor-move rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md"
						>
							<div class="flex items-start justify-between">
								<div class="min-w-0 flex-1">
									<h4 class="truncate font-medium text-gray-900">{song.title}</h4>
									{#if song.artist}
										<p class="truncate text-sm text-gray-600">{song.artist}</p>
									{/if}
									<div class="mt-1 flex items-center gap-2">
										{#if song.key_signature}
											<Badge variant="default" size="sm">
												{song.key_signature}
											</Badge>
										{/if}
										{#if song.tempo}
											<Badge variant="default" size="sm">
												{song.tempo} BPM
											</Badge>
										{/if}
									</div>
								</div>
								<div class={`rounded px-2 py-1 text-xs font-medium ${usageStatus.color}`}>
									{usageStatus.icon}
									{usageStatus.text}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Service -->
			<div class="flex-1 p-4">
				<h3 class="mb-3 text-lg font-medium font-title text-gray-900">Service Order</h3>

				<div class="space-y-2">
					{#each servicesStore.currentServiceSongs as song, index (song.id)}
						<div
							role="button"
							tabindex="0"
							animate:flip={{ duration: 200 }}
							draggable="true"
							ondragstart={(e) => handleServiceSongDragStart(e, song, index)}
							ondragover={(e) => handleDragOver(e, index)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, index)}
							class="group relative rounded-lg border border-gray-200 bg-white p-4 transition-all {dragOverIndex ===
							index
								? 'border-blue-400 bg-blue-50'
								: ''}"
						>
							<div class="flex items-start gap-4">
								<!-- Drag handle -->
								<div class="cursor-move text-gray-400">
									<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
										/>
									</svg>
								</div>

								<!-- Song info -->
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between">
										<div>
											<h4 class="font-medium text-gray-900">
												{index + 1}. {song.expand?.song_id?.title || 'Unknown Song'}
											</h4>
											{#if song.expand?.song_id?.artist}
												<p class="text-sm text-gray-600">{song.expand.song_id.artist}</p>
											{/if}
										</div>
										{#if song.section_type}
											<Badge variant="primary" size="sm">
												{song.section_type}
											</Badge>
										{/if}
									</div>

									<!-- Key and tempo -->
									<div class="mt-2 flex items-center gap-4">
										{#if song.transposed_key || song.expand?.song_id?.key_signature}
											<div class="flex items-center gap-2">
												<span class="text-sm text-gray-500">Key:</span>
												<select
													value={song.transposed_key || song.expand?.song_id?.key_signature}
													onchange={(e: Event) => {
														const target = e.target as HTMLSelectElement;
														updateSongKey(song.id, target.value);
													}}
													class="h-7 rounded border-gray-300 py-0 text-sm"
												>
													<option value="">Original</option>
													{#each ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as key}
														<option value={key}>{key}</option>
													{/each}
												</select>
											</div>
										{/if}

										{#if song.tempo_override || song.expand?.song_id?.tempo}
											<Badge variant="default" size="sm">
												{song.tempo_override || song.expand?.song_id?.tempo} BPM
											</Badge>
										{/if}

										{#if song.duration_override || song.expand?.song_id?.duration_seconds}
											<Badge variant="default" size="sm">
												{Math.floor(
													(song.duration_override || song.expand?.song_id?.duration_seconds || 0) /
														60
												)}:{(
													(song.duration_override || song.expand?.song_id?.duration_seconds || 0) %
													60
												)
													.toString()
													.padStart(2, '0')}
											</Badge>
										{/if}
									</div>

									<!-- Transition notes -->
									<div class="mt-2">
										<input
											type="text"
											placeholder="Add transition notes..."
											value={song.transition_notes || ''}
											onchange={(e: Event) => {
												const target = e.target as HTMLInputElement;
												updateSongNotes(song.id, target.value);
											}}
											class="h-7 w-full rounded border-gray-300 text-sm"
										/>
									</div>
								</div>

								<!-- Remove button -->
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeSongFromService(song.id)}
									class="opacity-0 transition-opacity group-hover:opacity-100"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</Button>
							</div>
						</div>
					{/each}

					<!-- Drop zone for new songs -->
					<div
						role="region"
						ondragover={(e) => handleDragOver(e, servicesStore.currentServiceSongs.length)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, servicesStore.currentServiceSongs.length)}
						class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOverIndex ===
						servicesStore.currentServiceSongs.length
							? 'border-blue-400 bg-blue-50'
							: 'border-gray-300'}"
					>
						<p class="text-sm text-gray-500">Drag songs here to add them to the service</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
