<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { songsStore } from '$lib/stores/songs.svelte';
	import type { Song, CreateSongData, UpdateSongData } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SongCard from '$lib/components/songs/SongCard.svelte';
	import SongForm from '$lib/components/songs/SongForm.svelte';

	// Modal state
	let showSongForm = $state(false);
	let showDeleteConfirm = $state(false);
	let songToDelete = $state<Song | null>(null);

	// Search state
	let searchQuery = $state('');
	let selectedKey = $state('');
	let selectedSort = $state('title');
	let initialLoadComplete = $state(false);

	// Reactive data from store
	let songs = $derived(songsStore.songs);
	let loading = $derived(songsStore.loading);
	let error = $derived(songsStore.error);
	let stats = $derived(songsStore.stats);
	let currentPage = $derived(songsStore.currentPage);
	let totalPages = $derived(songsStore.totalPages);
	let hasNextPage = $derived(songsStore.hasNextPage);
	let hasPrevPage = $derived(songsStore.hasPrevPage);
	let selectedSong = $derived(songsStore.selectedSong);
	let availableKeys = $derived(songsStore.availableKeys);

	// Sort options
	const sortOptions = [
		{ value: 'title', label: 'Title A-Z' },
		{ value: '-title', label: 'Title Z-A' },
		{ value: 'artist', label: 'Artist A-Z' },
		{ value: '-artist', label: 'Artist Z-A' }
	];

	// Key options (will be populated from available keys)
	let keyOptions = $derived.by(() => [
		{ value: '', label: 'All Keys' },
		...availableKeys().map((key: string) => ({ value: key, label: key }))
	]);

	// Load songs on mount
	onMount(() => {
		songsStore.loadSongs().then(() => {
			initialLoadComplete = true;
		});

		// Set up real-time updates with proper cleanup
		let unsubscribePromise = songsStore.subscribeToUpdates();
		
		return () => {
			// Cleanup subscription on component unmount
			unsubscribePromise.then((unsubscribe) => {
				if (unsubscribe) unsubscribe();
			});
		};
	});

	// Watch for filter changes (avoiding infinite loops by not watching loading state)
	$effect(() => {
		// Only apply filters after initial load to avoid duplicate calls
		if (initialLoadComplete) {
			const filters = {
				search: searchQuery,
				key: selectedKey,
				sort: selectedSort
			};
			
			// Use a timeout to debounce rapid changes (especially for search)
			const timeoutId = setTimeout(() => {
				songsStore.applyFilters(filters).catch((error) => {
					console.error('Failed to apply filters:', error);
					// Don't rethrow to prevent infinite retries
				});
			}, 300);
			
			// Cleanup timeout on next effect run
			return () => clearTimeout(timeoutId);
		}
	});

	// Handlers
	function handleAddSong() {
		songsStore.selectSong(null);
		showSongForm = true;
	}

	function handleEditSong(song: Song) {
		songsStore.selectSong(song);
		showSongForm = true;
	}

	function handleDeleteSong(song: Song) {
		songToDelete = song;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (songToDelete) {
			try {
				await songsStore.deleteSong(songToDelete.id);
				showDeleteConfirm = false;
				songToDelete = null;
			} catch (error) {
				console.error('Failed to delete song:', error);
			}
		}
	}

	function handleAddToSetlist(song: Song) {
		// TODO: Implement add to setlist functionality
		console.log('Add to setlist:', song.title);
	}

	async function handleSongFormSubmit(event: CustomEvent) {
		try {
			const data = event.detail;

			if ('id' in data) {
				// Update existing song
				await songsStore.updateSong(data.id, data.data);
			} else {
				// Create new song
				await songsStore.createSong(data);
			}

			showSongForm = false;
			songsStore.selectSong(null);
		} catch (error) {
			console.error('Failed to save song:', error);
		}
	}

	function handleSongFormCancel() {
		showSongForm = false;
		songsStore.selectSong(null);
	}

	async function handleNextPage() {
		await songsStore.nextPage();
	}

	async function handlePrevPage() {
		await songsStore.prevPage();
	}

	function clearError() {
		songsStore.clearError();
	}
</script>

<svelte:head>
	<title>Songs - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2
				class="text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Song Library
			</h2>
			<p class="mt-1 text-sm text-gray-500">Manage your worship songs and track usage patterns</p>
		</div>

		{#if auth.canManageSongs}
			<div class="mt-4 flex md:mt-0 md:ml-4">
				<Button variant="primary" onclick={handleAddSong}>Add New Song</Button>
			</div>
		{/if}
	</div>

	<!-- Error display -->
	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-800">{error}</p>
					<Button variant="ghost" size="sm" onclick={clearError} class="mt-2">Dismiss</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Stats cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-gray-900">{stats.totalSongs}</div>
				<div class="text-sm text-gray-500">Total Songs</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-green-600">{stats.availableSongs}</div>
				<div class="text-sm text-gray-500">Available Songs</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-yellow-600">{stats.recentlyUsed}</div>
				<div class="text-sm text-gray-500">Recently Used</div>
			</div>
		</Card>
	</div>

	{#if songs.length === 0 && !loading}
		<!-- Welcome message for new users -->
		<Card>
			<div class="py-8 text-center">
				<div class="mb-4 text-6xl">🎵</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">Welcome to your Song Library</h3>
				<p class="mb-6 text-gray-500">
					Get started by adding your first worship song to the library.
				</p>
				{#if auth.canManageSongs}
					<Button variant="primary" onclick={handleAddSong}>Add Your First Song</Button>
				{:else}
					<p class="text-sm text-gray-400">
						Contact your worship leader to add songs to the library.
					</p>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Search and filters -->
		<Card padding={false} class="p-4">
			<div class="flex flex-col gap-4 md:flex-row">
				<div class="flex-1">
					<Input
						name="search"
						placeholder="Search songs by title or artist..."
						bind:value={searchQuery}
						class="w-full"
					/>
				</div>

				<div class="flex gap-4">
					<Select
						name="key_filter"
						bind:value={selectedKey}
						options={keyOptions}
						placeholder="Filter by key"
						class="min-w-[120px]"
					/>

					<Select
						name="sort"
						bind:value={selectedSort}
						options={sortOptions}
						class="min-w-[140px]"
					/>
				</div>
			</div>
		</Card>

		<!-- Songs grid -->
		{#if loading}
			<div class="py-8 text-center">
				<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
				<p class="mt-2 text-sm text-gray-500">Loading songs...</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{#each songs as song (song.id)}
					<SongCard
						{song}
						onEdit={handleEditSong}
						onDelete={handleDeleteSong}
						onAddToSetlist={handleAddToSetlist}
					/>
				{/each}
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<Card padding={false} class="p-4">
					<div class="flex items-center justify-between">
						<div class="text-sm text-gray-500">
							Page {currentPage} of {totalPages}
						</div>

						<div class="flex gap-2">
							<Button
								variant="secondary"
								size="sm"
								onclick={handlePrevPage}
								disabled={!hasPrevPage || loading}
							>
								Previous
							</Button>

							<Button
								variant="secondary"
								size="sm"
								onclick={handleNextPage}
								disabled={!hasNextPage || loading}
							>
								Next
							</Button>
						</div>
					</div>
				</Card>
			{/if}
		{/if}
	{/if}
</div>

<!-- Song Form Modal -->
<Modal
	open={showSongForm}
	title={selectedSong ? 'Edit Song' : 'Add New Song'}
	size="lg"
	onclose={handleSongFormCancel}
>
	<SongForm song={selectedSong} {loading} {error} oncancel={handleSongFormCancel} />
</Modal>

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteConfirm}
	title="Delete Song"
	size="sm"
	onclose={() => (showDeleteConfirm = false)}
>
	{#if songToDelete}
		<div class="text-center">
			<div class="mb-4 text-6xl text-red-600">⚠️</div>
			<p class="mb-4 text-gray-900">
				Are you sure you want to delete "<strong>{songToDelete.title}</strong>"?
			</p>
			<p class="mb-6 text-sm text-gray-500">
				This action cannot be undone. The song will be permanently removed from your library.
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showDeleteConfirm = false)} disabled={loading}>
			Cancel
		</Button>

		<Button variant="danger" onclick={confirmDelete} {loading} disabled={loading}>
			{loading ? 'Deleting...' : 'Delete Song'}
		</Button>
	{/snippet}
</Modal>
