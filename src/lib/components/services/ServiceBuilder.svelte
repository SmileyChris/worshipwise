<script lang="ts">
	import type { ServiceSong, CreateServiceSongData } from '$lib/types/service';
	import type { Song } from '$lib/types/song';
	import { getServicesStore, getSongsStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CommentThread from './CommentThread.svelte';
	import ApprovalWorkflow from './ApprovalWorkflow.svelte';
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
	let showAISuggestions = $state(true);
	let isEditing = $state(false);

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
				<div class="flex-1">
					{#if isEditing}
						<div class="flex flex-col gap-2 max-w-xl">
							<input
								type="text"
								value={servicesStore.currentService.title}
								onchange={(e) => updateService({ title: e.currentTarget.value })}
								class="font-title text-xl font-bold text-gray-900 border-none p-0 focus:ring-0 bg-transparent hover:bg-gray-50 rounded px-2 -ml-2"
								placeholder="Service Title"
							/>
							<div class="flex gap-4">
								<input
									type="date"
									value={servicesStore.currentService.service_date.split('T')[0]}
									onchange={(e) => updateService({ service_date: e.currentTarget.value })}
									class="text-sm text-gray-600 border border-gray-200 rounded px-2 py-0.5"
								/>
								<select
									value={servicesStore.currentService.service_type}
									onchange={(e) => updateService({ service_type: e.currentTarget.value })}
									class="text-sm text-gray-600 border border-gray-200 rounded px-2 py-0.5"
								>
									{#each sectionTypes as type}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>
						</div>
					{:else}
						<h2 class="font-title text-2xl font-bold text-gray-900">
							{servicesStore.currentService.title}
						</h2>
						<p class="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
							<svg class="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							{new Date(servicesStore.currentService.service_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
							{#if servicesStore.currentService.service_type}
								<span class="text-gray-300">•</span>
								<span class="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
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
						variant={isEditing ? 'primary' : 'ghost'} 
						size="sm"
						onclick={() => (isEditing = !isEditing)}
					>
						{#if isEditing}
							<svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							Done Planning
						{:else}
							<svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							Plan Service
						{/if}
					</Button>
					<Button variant="ghost" size="sm" onclick={() => (showComments = !showComments)}>
						<svg class="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						Comments
					</Button>
					<Button variant="ghost" size="sm" onclick={onClose}>Close</Button>
				</div>
			</div>
		</div>

		<div class="flex flex-1 overflow-hidden">
			<!-- Service (Left) -->
			<div class="flex-1 overflow-y-auto bg-gray-50/30 p-6 scrollbar-thin">
				<div class="max-w-4xl mx-auto space-y-6">
					<!-- Approval Workflow -->
					<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<ApprovalWorkflow 
							service={servicesStore.currentService} 
							onUpdate={() => servicesStore.loadService(serviceId)}
						/>
					</div>

					<div class="flex items-center justify-between">
						<h3 class="font-title text-xl font-bold text-gray-900">Service Order</h3>
						{#if !isEditing && servicesStore.currentServiceSongs.length === 0}
							<p class="text-sm text-gray-500">No songs added yet.</p>
						{/if}
					</div>

					<div class="space-y-3">
						{#each servicesStore.currentServiceSongs as song, index (song.id)}
							<div
								animate:flip={{ duration: 200 }}
								class="group relative rounded-xl border bg-white p-5 transition-all shadow-sm {isEditing ? 'hover:shadow-md border-gray-200' : 'border-gray-100'} {dragOverIndex ===
								index
									? 'border-primary ring-2 ring-primary/10 bg-primary/5'
									: ''}"
							>
								{#if isEditing}
									<button
										type="button"
										class="absolute inset-0 w-full h-full opacity-0 z-10 cursor-move"
										draggable="true"
										ondragstart={(e) => handleServiceSongDragStart(e, song, index)}
										ondragover={(e) => handleDragOver(e, index)}
										ondragleave={handleDragLeave}
										ondrop={(e) => handleDrop(e, index)}
										aria-label="Reorder song"
									></button>
								{/if}
								<div class="flex items-start gap-4 relative z-0">
									<!-- Drag handle -->
									{#if isEditing}
										<div class="mt-1 cursor-move text-gray-400 group-hover:text-primary transition-colors">
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
											</svg>
										</div>
									{:else}
										<div class="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-xs font-bold text-gray-400">
											{index + 1}
										</div>
									{/if}

									<!-- Song info -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-4">
											<div>
												<h4 class="font-bold text-gray-900 text-lg">
													{isEditing ? (index + 1) + '. ' : ''}{song.expand?.song_id?.title || 'Unknown Song'}
												</h4>
												{#if song.expand?.song_id?.artist}
													<p class="text-md text-gray-500 font-medium">{song.expand.song_id.artist}</p>
												{/if}
											</div>
											{#if song.section_type}
												<Badge variant="primary" size="sm" class="font-semibold uppercase tracking-wider">
													{song.section_type}
												</Badge>
											{/if}
										</div>

										<!-- Key and tempo -->
										<div class="mt-4 flex flex-wrap items-center gap-3">
											<div class="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
												<span class="text-xs font-bold text-gray-400 uppercase tracking-tighter">Key</span>
												{#if isEditing}
													<select
														value={song.transposed_key || song.expand?.song_id?.key_signature}
														onchange={(e: Event) => {
															const target = e.target as HTMLSelectElement;
															updateSongKey(song.id, target.value);
														}}
														class="h-7 border-none bg-transparent p-0 text-sm font-bold text-primary focus:ring-0"
													>
														<option value="">Original</option>
														{#each ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as key (key)}
															<option value={key}>{key}</option>
														{/each}
													</select>
												{:else}
													<span class="text-sm font-bold text-gray-700">
														{song.transposed_key || song.expand?.song_id?.key_signature || 'Original'}
													</span>
												{/if}
											</div>

											{#if song.tempo_override || song.expand?.song_id?.tempo}
												<div class="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
													<span class="text-xs font-bold text-gray-400 uppercase tracking-tighter">BPM</span>
													<span class="text-sm font-bold text-gray-700">
														{song.tempo_override || song.expand?.song_id?.tempo}
													</span>
												</div>
											{/if}

											{#if song.duration_override || song.expand?.song_id?.duration_seconds}
												<div class="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
													<svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<span class="text-sm font-bold text-gray-700">
														{Math.floor(
															(song.duration_override || song.expand?.song_id?.duration_seconds || 0) /
																60
														)}:{(
															(song.duration_override || song.expand?.song_id?.duration_seconds || 0) %
															60
														)
															.toString()
															.padStart(2, '0')}
													</span>
												</div>
											{/if}
										</div>

										<!-- Transition notes -->
										{#if isEditing}
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
														class="w-full rounded-lg border-gray-200 bg-gray-50 text-sm focus:border-primary focus:ring-primary pl-9"
													/>
													<svg class="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
													</svg>
												</div>
											</div>
										{:else if song.transition_notes}
											<div class="mt-3 flex items-start gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
												<svg class="h-4 w-4 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												<p class="text-sm text-blue-700 italic">"{song.transition_notes}"</p>
											</div>
										{/if}
									</div>

									<!-- Remove button -->
									{#if isEditing}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => removeSongFromService(song.id)}
											class="text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100"
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

						{#if isEditing}
							<!-- Drop zone for new songs -->
							<div
								role="region"
								ondragover={(e) => handleDragOver(e, servicesStore.currentServiceSongs.length)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, servicesStore.currentServiceSongs.length)}
								class="rounded-xl border-2 border-dashed p-10 text-center transition-all {dragOverIndex ===
								servicesStore.currentServiceSongs.length
									? 'border-primary bg-primary/5 ring-4 ring-primary/5'
									: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
							>
								<div class="mx-auto h-12 w-12 text-gray-300 mb-3">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
								</div>
								<p class="text-md font-medium text-gray-600">Drag songs here to add them to the service</p>
								<p class="text-sm text-gray-400 mt-1">or use the suggestions from the right panel</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Sidebar (Song Library / AI Suggestions) (Right) -->
			<div class="w-[400px] border-l border-gray-200 bg-white flex flex-col shadow-xl z-10 transition-all {!isEditing && !showAISuggestions ? 'hidden' : 'flex'}">
				<!-- Tab Navigation -->
				{#if isEditing}
					<div class="border-b border-gray-100 bg-white px-2">
						<nav class="flex gap-1 py-2">
							<button
								onclick={() => showAISuggestions = false}
								class="flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all {!showAISuggestions
									? 'bg-primary text-white shadow-md'
									: 'text-gray-500 hover:bg-gray-50'}"
							>
								Library
							</button>
							<button
								onclick={() => showAISuggestions = true}
								class="flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all {showAISuggestions
									? 'bg-primary text-white shadow-md'
									: 'text-gray-500 hover:bg-gray-50'}"
							>
								AI Suggestions
							</button>
						</nav>
					</div>
				{/if}

				<div class="flex-1 overflow-hidden flex flex-col">
					{#if showAISuggestions}
						<div class="flex-1 overflow-hidden">
							<AISuggestions
								service={servicesStore.currentService}
								availableSongs={songsStore.songs}
								currentSongs={servicesStore.currentServiceSongs.map(ss => ss.expand?.song_id).filter((s): s is Song => s !== undefined)}
								onAddSong={addSongFromSuggestion}
								isPlanning={isEditing}
							/>
						</div>
					{:else if isEditing}
						<!-- Song Library -->
						<div class="flex-1 p-6 overflow-hidden flex flex-col bg-gray-50/50">
							<div class="mb-6">
								<h3 class="font-title text-xl font-bold text-gray-900 mb-4">Song Library</h3>
								
								<!-- Search -->
								<div class="relative mb-4">
									<input
										type="search"
										placeholder="Search songs..."
										bind:value={searchQuery}
										class="focus:border-primary focus:ring-primary block w-full rounded-xl border-gray-200 bg-white shadow-sm pl-10 h-11"
									/>
									<svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
								</div>

								<!-- Section selector -->
								<label for="default-section" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Default Section</label>
								<select
									id="default-section"
									bind:value={selectedSection}
									class="focus:border-primary focus:ring-primary block w-full rounded-xl border-gray-200 bg-white shadow-sm h-11 transition-all"
								>
									{#each sectionTypes as type (type)}
										<option value={type}>{type}</option>
									{/each}
								</select>
							</div>

							<!-- Songs list -->
							<div class="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
								{#each filteredSongs as song (song.id)}
									{@const usageStatus = getSongUsageStatus(song)}
									<div
										role="button"
										tabindex="0"
										draggable="true"
										ondragstart={(e) => handleSongDragStart(e, song)}
										class="cursor-move rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 group"
									>
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<h4 class="truncate font-bold text-gray-900 group-hover:text-primary transition-colors">{song.title}</h4>
												{#if song.artist}
													<p class="truncate text-sm text-gray-500 font-medium">{song.artist}</p>
												{/if}
												<div class="mt-2 flex flex-wrap items-center gap-2">
													{#if song.key_signature}
														<span class="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter">
															{song.key_signature}
														</span>
													{/if}
													{#if song.tempo}
														<span class="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase tracking-tighter">
															{song.tempo} BPM
														</span>
													{/if}
												</div>
											</div>
											<div class={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-tight whitespace-nowrap border ${usageStatus.color.replace('bg-', 'bg-opacity-10 border-')}`}>
												{usageStatus.icon} {usageStatus.text}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Comments sidebar -->
			{#if showComments}
				<div class="w-96 border-l border-gray-200 bg-white shadow-2xl z-20">
					<CommentThread serviceId={serviceId} onClose={() => (showComments = false)} />
				</div>
			{/if}
		</div>
	</div>
{/if}
