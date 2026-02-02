<script lang="ts">
	import type { ServiceSong, CreateServiceSongData } from '$lib/types/service';
	import type { Song } from '$lib/types/song';
	import { getServicesStore, getSongsStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CommentThread from './CommentThread.svelte';
	import AISuggestions from './AISuggestions.svelte';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';

	const servicesStore = getServicesStore();
	const songsStore = getSongsStore();

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
	let showComments = $state(false);
	// showAISuggestions is now implicitly true when planning, or we just show the component directly

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
			// Load the service and its songs if not already loaded or different
			if (servicesStore.currentService?.id !== serviceId) {
				await servicesStore.loadService(serviceId);
			}
			// Load available songs
			await songsStore.loadSongs();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to load service';
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
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to update service';
		} finally {
			draggedSong = null;
			draggedServiceSong = null;
		}
	}

	async function removeSongFromService(songId: string) {
		try {
			await servicesStore.removeSongFromService(songId);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to remove song';
		}
	}

	async function updateSongKey(songId: string, newKey: string) {
		try {
			await servicesStore.updateServiceSong(songId, { transposed_key: newKey });
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to update key';
		}
	}

	async function updateSongNotes(songId: string, notes: string) {
		try {
			await servicesStore.updateServiceSong(songId, { transition_notes: notes });
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to update notes';
		}
	}

	// Update service details
	async function updateService(data: any) {
		if (!servicesStore.currentService) return;
		try {
			await servicesStore.updateService(serviceId, data);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to update service';
		}
	}

	// Add song from AI suggestions
	async function addSongFromSuggestion(song: Song) {
		try {
			const newSong: CreateServiceSongData = {
				service_id: serviceId,
				song_id: song.id,
				order_position: servicesStore.currentServiceSongs.length,
				section_type: selectedSection
			};
			await servicesStore.addSongToService(newSong);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to add song';
		}
	}

	async function deleteService() {
		if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
			return;
		}

		try {
			await servicesStore.deleteService(serviceId);
			servicesStore.stopPlanning();
			onClose();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to delete service';
		}
	}

	// Get song usage status
	function getSongUsageStatus(song: Song): { color: string; text: string; icon: string } {
		const status = song.usageStatus || 'available';
		// Use historical sung date for context text
		const daysSince = song.daysSinceLastSung ?? song.daysSinceLastUsed;

		switch (status) {
			case 'upcoming':
				return {
					color: 'text-blue-600 bg-blue-50',
					text: 'Planned',
					icon: '🗓️'
				};
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
					color: 'text-amber-600 bg-amber-50',
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
		<div class="mb-4 flex items-center gap-4">
			<Button
				variant="ghost"
				onclick={() => {
					servicesStore.stopPlanning();
					onClose();
				}}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-900"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Services
			</Button>
		</div>

		<div class="flex items-center justify-between">
			<div class="flex-1">
				{#if servicesStore.isPlanning}
					<div class="flex max-w-xl flex-col gap-2">
						<div class="flex items-center gap-2">
							<input
								type="text"
								value={servicesStore.currentService.title}
								onchange={(e) => updateService({ title: e.currentTarget.value })}
								class="font-title -ml-2 flex-1 rounded border-none bg-transparent p-0 px-2 text-3xl font-bold text-gray-900 hover:bg-gray-50 focus:ring-0 sm:text-4xl"
								placeholder="Service Title"
							/>
							<select
								value={servicesStore.currentService.status || 'draft'}
								onchange={(e) => updateService({ status: e.currentTarget.value })}
								class="bg-primary/10 text-primary cursor-pointer rounded border-none px-2 py-1 text-xs font-bold tracking-wider uppercase focus:ring-0"
							>
								<option value="draft">Draft</option>
								<option value="planned">Planned</option>
							</select>
						</div>
						<div class="flex gap-4">
							<input
								type="date"
								value={servicesStore.currentService.service_date.split('T')[0]}
								onchange={(e) => updateService({ service_date: e.currentTarget.value })}
								class="rounded border border-gray-200 px-2 py-0.5 text-sm text-gray-600"
							/>
							<select
								value={servicesStore.currentService.service_type}
								onchange={(e) => updateService({ service_type: e.currentTarget.value })}
								class="rounded border border-gray-200 px-2 py-0.5 text-sm text-gray-600"
							>
								{#each sectionTypes as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<h1 class="font-title text-3xl font-bold text-gray-900 sm:text-4xl">
							{servicesStore.currentService.title}
						</h1>
						{#if servicesStore.currentService.status}
							<span
								class="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-600 uppercase"
							>
								{servicesStore.currentService.status}
							</span>
						{/if}
					</div>
					<p class="mt-2 flex items-center gap-2 text-xl text-gray-600">
						{new Date(servicesStore.currentService.service_date).toLocaleDateString(undefined, {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
						{#if servicesStore.currentService.service_type}
							<span class="text-gray-300">•</span>
							<span
								class="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase"
							>
								{servicesStore.currentService.service_type}
							</span>
						{/if}
					</p>
				{/if}
			</div>
			<div class="flex items-center gap-4">
				<Badge variant="primary">
					{servicesStore.currentServiceSongs.length} songs • {formattedDuration}
				</Badge>
				<div class="h-6 w-px bg-gray-200"></div>
				<Button
					variant={servicesStore.isPlanning ? 'primary' : 'ghost'}
					size="sm"
					onclick={() => (servicesStore.isPlanning = !servicesStore.isPlanning)}
				>
					{#if servicesStore.isPlanning}
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Done Planning
					{:else}
						<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						Plan Service
					{/if}
				</Button>
				<Button variant="ghost" size="sm" onclick={() => (showComments = !showComments)}>
					<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
						/>
					</svg>
					Comments
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={deleteService}
					class="text-red-500 hover:bg-red-50"
				>
					<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
					Delete
				</Button>
			</div>
		</div>

		<div class="flex min-h-0 flex-1 overflow-hidden">
			<div class="scrollbar-thin flex-1 overflow-y-auto bg-gray-50/30 p-6">
				<div class="mx-auto max-w-4xl space-y-6">
					<div class="flex items-center justify-between">
						<h2 class="font-title text-lg font-semibold text-gray-900">Service Order</h2>
						{#if !servicesStore.isPlanning && servicesStore.currentServiceSongs.length === 0}
							<p class="text-sm text-gray-500">No songs added yet.</p>
						{/if}
					</div>

					<div class="space-y-3">
						{#each servicesStore.currentServiceSongs as song, index (song.id)}
							<div
								animate:flip={{ duration: 200 }}
								class="group relative rounded-xl border bg-white p-5 shadow-sm transition-all {servicesStore.isPlanning
									? 'border-gray-200 hover:shadow-md'
									: 'border-gray-100'} {dragOverIndex === index
									? 'border-primary ring-primary/10 bg-primary/5 ring-2'
									: ''}"
							>
								{#if servicesStore.isPlanning}
									<button
										type="button"
										class="absolute inset-0 z-10 h-full w-full cursor-move opacity-0"
										draggable="true"
										ondragstart={(e) => handleServiceSongDragStart(e, song, index)}
										ondragover={(e) => handleDragOver(e, index)}
										ondragleave={handleDragLeave}
										ondrop={(e) => handleDrop(e, index)}
										aria-label="Reorder song"
									></button>
								{/if}
								<div class="relative z-0 flex items-start gap-4">
									<!-- Drag handle -->
									{#if servicesStore.isPlanning}
										<div
											class="group-hover:text-primary mt-1 cursor-move text-gray-400 transition-colors"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M4 8h16M4 16h16"
												/>
											</svg>
										</div>
									{:else}
										<div
											class="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-xs font-bold text-gray-400"
										>
											{index + 1}
										</div>
									{/if}

									<!-- Song info -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-4">
											<div>
												<h4 class="text-lg font-bold text-gray-900">
													{servicesStore.isPlanning ? index + 1 + '. ' : ''}{song.expand?.song_id
														?.title || 'Unknown Song'}
												</h4>
												{#if song.expand?.song_id?.artist}
													<p class="text-md font-medium text-gray-500">
														{song.expand.song_id.artist}
													</p>
												{/if}
											</div>
											{#if song.section_type}
												<Badge
													variant="primary"
													size="sm"
													class="font-semibold tracking-wider uppercase"
												>
													{song.section_type}
												</Badge>
											{/if}
										</div>

										<!-- Key and tempo -->
										<div class="mt-4 flex flex-wrap items-center gap-3">
											<div
												class="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1"
											>
												<span class="text-xs font-bold tracking-tighter text-gray-400 uppercase"
													>Key</span
												>
												{#if servicesStore.isPlanning}
													<select
														value={song.transposed_key || song.expand?.song_id?.key_signature}
														onchange={(e: Event) => {
															const target = e.target as HTMLSelectElement;
															updateSongKey(song.id, target.value);
														}}
														class="text-primary h-7 border-none bg-transparent p-0 text-sm font-bold focus:ring-0"
													>
														<option value="">Original</option>
														{#each ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as key (key)}
															<option value={key}>{key}</option>
														{/each}
													</select>
												{:else}
													<span class="text-sm font-bold text-gray-700">
														{song.transposed_key ||
															song.expand?.song_id?.key_signature ||
															'Original'}
													</span>
												{/if}
											</div>

											{#if song.tempo_override || song.expand?.song_id?.tempo}
												<div
													class="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1"
												>
													<span class="text-xs font-bold tracking-tighter text-gray-400 uppercase"
														>BPM</span
													>
													<span class="text-sm font-bold text-gray-700">
														{song.tempo_override || song.expand?.song_id?.tempo}
													</span>
												</div>
											{/if}

											{#if song.duration_override || song.expand?.song_id?.duration_seconds}
												<div
													class="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1"
												>
													<svg
														class="h-3.5 w-3.5 text-gray-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
													<span class="text-sm font-bold text-gray-700">
														{Math.floor(
															(song.duration_override ||
																song.expand?.song_id?.duration_seconds ||
																0) / 60
														)}:{(
															(song.duration_override ||
																song.expand?.song_id?.duration_seconds ||
																0) % 60
														)
															.toString()
															.padStart(2, '0')}
													</span>
												</div>
											{/if}
										</div>

										<!-- Transition notes -->
										{#if servicesStore.isPlanning}
											<div class="mt-4">
												<div class="relative">
													<input
														type="text"
														placeholder="Add transition notes..."
														value={song.transition_notes || ''}
														onchange={(e: Event) => {
															const target = e.target as HTMLInputElement;
															updateSongNotes(song.id, target.value);
														}}
														class="focus:border-primary focus:ring-primary w-full rounded-lg border-gray-200 bg-gray-50 pl-9 text-sm"
													/>
													<svg
														class="absolute top-2.5 left-3 h-4 w-4 text-gray-400"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
														/>
													</svg>
												</div>
											</div>
										{:else if song.transition_notes}
											<div
												class="mt-3 flex items-start gap-2 rounded-lg border border-blue-100/50 bg-blue-50/50 p-3"
											>
												<svg
													class="mt-0.5 h-4 w-4 text-blue-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												<p class="text-sm text-blue-700 italic">"{song.transition_notes}"</p>
											</div>
										{/if}
									</div>

									<!-- Remove button -->
									{#if servicesStore.isPlanning}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => removeSongFromService(song.id)}
											class="text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</Button>
									{/if}
								</div>
							</div>
						{/each}

						{#if servicesStore.isPlanning}
							<!-- Drop zone for new songs -->
							<div
								role="region"
								ondragover={(e) => handleDragOver(e, servicesStore.currentServiceSongs.length)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, servicesStore.currentServiceSongs.length)}
								class="rounded-xl border-2 border-dashed p-10 text-center transition-all {dragOverIndex ===
								servicesStore.currentServiceSongs.length
									? 'border-primary bg-primary/5 ring-primary/5 ring-4'
									: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
							>
								<div class="mx-auto mb-3 h-12 w-12 text-gray-300">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 4v16m8-8H4"
										/>
									</svg>
								</div>
								<p class="text-md font-medium text-gray-600">
									Drag songs here to add them to the service
								</p>
								<p class="mt-1 text-sm text-gray-400">
									or use the suggestions from the right panel
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Sidebar (AI Suggestions) (Right) -->
			{#if servicesStore.isPlanning}
				<div class="z-10 flex w-[400px] flex-col border-l border-gray-200 bg-white shadow-xl">
					<div class="flex flex-1 flex-col overflow-hidden">
						<div class="flex-1 overflow-hidden">
							<AISuggestions
								service={servicesStore.currentService}
								availableSongs={songsStore.songs}
								currentSongs={servicesStore.currentServiceSongs
									.map((ss) => ss.expand?.song_id)
									.filter((s): s is Song => s !== undefined)}
								onAddSong={addSongFromSuggestion}
								isPlanning={servicesStore.isPlanning}
							/>
						</div>
					</div>
				</div>
			{/if}

			<!-- Comments sidebar -->
			{#if showComments}
				<div class="z-20 w-96 border-l border-gray-200 bg-white shadow-2xl">
					<CommentThread {serviceId} onClose={() => (showComments = false)} />
				</div>
			{/if}
		</div>
	</div>
{/if}
