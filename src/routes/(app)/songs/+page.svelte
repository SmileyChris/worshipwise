<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore, getSongsStore, getServicesStore } from '$lib/context/stores.svelte';
	import type { Song, Category } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import SongCard from '$lib/components/songs/SongCard.svelte';
	import CategoryCard from '$lib/components/songs/CategoryCard.svelte';
	import SongsSidebar from '$lib/components/songs/SongsSidebar.svelte';
	import SongForm from '$lib/components/songs/SongForm.svelte';
	import CategorySelect from '$lib/components/ui/CategorySelect.svelte';
	import LabelSelector from '$lib/components/ui/LabelSelector.svelte';

	const auth = getAuthStore();
	const songsStore = getSongsStore();
	const servicesStore = getServicesStore();

	// Modal state
	let showSongForm = $state(false);
	let showDeleteConfirm = $state(false);
	let songToDelete = $state<Song | null>(null);

	// View state
	let viewMode = $state<'list' | 'categories'>('categories');

	// Search state
	let searchQuery = $state('');
	let selectedKey = $state('');
	let selectedCategory = $state('');
	let selectedLabelIds = $state<string[]>([]);
	let selectedSort = $state('title');
	let showRetired = $state(false);
	let showFavorites = $state(false);
	let showDifficult = $state(false);
	let initialLoadComplete = $state(false);

	// Category data
	let categoriesData = $state<Map<string, { category: Category; songs: Song[] }> | null>(null);
	let categoriesLoading = $state(false);

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

	// Service editing state
	let currentService = $derived(servicesStore.currentService);
	let currentServiceSongs = $derived(servicesStore.currentServiceSongs);
	let isEditingService = $derived(!!currentService);

	// Create a set of song IDs that are in the current service for quick lookup
	let songsInCurrentService = $derived.by(() => {
		if (!currentServiceSongs) return new Set<string>();
		return new Set(currentServiceSongs.map((serviceSong) => serviceSong.song_id as string));
	});

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
		...availableKeys.map((key: string) => ({ value: key, label: key }))
	]);

	// Load category data
	async function loadCategoriesData() {
		categoriesLoading = true;
		try {
			categoriesData = (await songsStore.getSongsByCategory()) as unknown as Map<
				string,
				{ category: Category; songs: Song[] }
			>;
		} catch (error) {
			console.error('Failed to load categories data:', error);
		} finally {
			categoriesLoading = false;
		}
	}

	// Load songs on mount
	onMount(() => {
		if (viewMode === 'categories') {
			loadCategoriesData();
		} else {
			songsStore.loadSongs().then(() => {
				initialLoadComplete = true;
			});
		}
		
		// Load user preferences
		songsStore.loadUserPreferences();

		// Set up real-time updates with proper cleanup
		let unsubscribePromise = songsStore.subscribeToUpdates();
		
		// Listen for auto-retire events
		const handleAutoRetire = (event: CustomEvent) => {
			const { songId } = event.detail;
			songsStore.handleAutoRetire(songId);
		};
		
		window.addEventListener('song-auto-retire', handleAutoRetire as EventListener);

		return () => {
			// Cleanup subscription on component unmount
			unsubscribePromise.then((unsubscribe) => {
				if (unsubscribe) unsubscribe();
			});
			
			// Cleanup event listener
			window.removeEventListener('song-auto-retire', handleAutoRetire as EventListener);
		};
	});

	// Watch for view mode changes
	$effect(() => {
		if (viewMode === 'categories') {
			loadCategoriesData();
		} else if (viewMode === 'list' && !initialLoadComplete) {
			songsStore.loadSongs().then(() => {
				initialLoadComplete = true;
			});
		}
	});

	// Watch for filter changes (avoiding infinite loops by not watching loading state)
	$effect(() => {
		// Only apply filters after initial load to avoid duplicate calls (only for list view)
		if (viewMode === 'list' && initialLoadComplete) {
			const filters = {
				search: searchQuery,
				key: selectedKey,
				category: selectedCategory,
				labels: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
				sort: selectedSort,
				showRetired,
				showFavorites,
				showDifficult
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
				showSongForm = false; // Close the song form if it's open
			} catch (error) {
				console.error('Failed to delete song:', error);
			}
		}
	}

	async function handleAddToService(song: Song) {
		if (!currentService) {
			// TODO: Show modal to select service or create new one
			console.log('No service is currently being edited');
			return;
		}

		try {
			await servicesStore.addSongToService({
				song_id: song.id
			});
			// Optional: Show success message
		} catch (error) {
			console.error('Failed to add song to service:', error);
			// TODO: Show error message
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
				class="font-title text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Song Library
			</h2>
			<p class="mt-1 text-sm text-gray-500">Manage your worship songs and track usage patterns</p>
		</div>

		<div class="mt-4 flex items-center gap-4 md:mt-0 md:ml-4">
			<!-- View Toggle -->
			<div class="flex rounded-lg border border-gray-300 bg-gray-50 p-1">
				<button
					onclick={() => (viewMode = 'categories')}
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors {viewMode ===
					'categories'
						? 'text-primary bg-white shadow-sm'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					Categories
				</button>
				<button
					onclick={() => (viewMode = 'list')}
					class="rounded-md px-3 py-1 text-sm font-medium transition-colors {viewMode === 'list'
						? 'text-primary bg-white shadow-sm'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					List
				</button>
			</div>

			{#if auth.canManageSongs}
				<Button variant="primary" onclick={handleAddSong}>Add New Song</Button>
			{/if}
		</div>
	</div>

	<!-- Service Editing Banner -->
	{#if isEditingService && currentService}
		<Card class="bg-primary/5 border-primary/20">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="bg-primary h-3 w-3 animate-pulse rounded-full"></div>
					<div>
						<p class="text-primary/90 text-sm font-medium">
							Currently editing: <span class="font-semibold">{currentService.title}</span>
						</p>
						<p class="text-primary/80 text-xs">
							Click "Add to Service" to add songs to this service
						</p>
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					href="/services/{currentService.id}"
					class="text-primary/80 hover:text-primary"
				>
					Go to Service
				</Button>
			</div>
		</Card>
	{/if}

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

	<!-- Main Layout with Sidebar -->
	<div class="lg:grid lg:grid-cols-12 lg:gap-8">
		<!-- Main Content -->
		<div class="lg:col-span-9">
			<!-- Stats cards (shown for both views) -->
			<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
				<Card>
					<div class="text-center">
						<div class="font-title text-2xl font-bold text-gray-900">{stats.totalSongs}</div>
						<div class="text-sm text-gray-500">Total Songs</div>
					</div>
				</Card>

				<Card>
					<div class="text-center">
						<div class="font-title text-2xl font-bold text-green-600">{stats.availableSongs}</div>
						<div class="text-sm text-gray-500">Available Songs</div>
					</div>
				</Card>

				<Card>
					<div class="text-center">
						<div class="font-title text-2xl font-bold text-yellow-600">{stats.recentlyUsed}</div>
						<div class="text-sm text-gray-500">Recently Used</div>
					</div>
				</Card>
			</div>

			{#if viewMode === 'categories'}
				<!-- Categories View -->
				{#if categoriesLoading}
					<div class="py-8 text-center">
						<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
						<p class="mt-2 text-sm text-gray-500">Loading categories...</p>
					</div>
				{:else if categoriesData && categoriesData.size > 0}
					<div class="space-y-6">
						{#each [...categoriesData.entries()] as [categoryId, { category, songs }] (categoryId)}
							<CategoryCard
								{category}
								{songs}
								onEditSong={handleEditSong}
								onAddToService={handleAddToService}
								{isEditingService}
								{songsInCurrentService}
							/>
						{/each}
					</div>
				{:else}
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
				{/if}
			{:else}
				<!-- List View -->
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
						<div class="space-y-4">
							<!-- Search bar -->
							<div class="flex-1">
								<Input
									name="search"
									placeholder="Search songs by title or artist..."
									bind:value={searchQuery}
									class="w-full"
								/>
							</div>

							<!-- Toggle filters -->
							<div class="flex flex-wrap gap-3">
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="checkbox" bind:checked={showRetired} class="rounded border-gray-300 text-primary focus:ring-primary" />
									<span class="text-sm font-medium text-gray-700">Show Retired Songs</span>
								</label>
								
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="checkbox" bind:checked={showFavorites} class="rounded border-gray-300 text-primary focus:ring-primary" />
									<span class="text-sm font-medium text-gray-700">My Favorites</span>
								</label>
								
								<label class="flex items-center gap-2 cursor-pointer">
									<input type="checkbox" bind:checked={showDifficult} class="rounded border-gray-300 text-primary focus:ring-primary" />
									<span class="text-sm font-medium text-gray-700">Difficult Songs</span>
								</label>
							</div>

							<!-- Filters row -->
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div>
									<label for="filter-category" class="mb-1 block text-sm font-medium text-gray-700"
										>Category</label
									>
									<CategorySelect
										id="filter-category"
										bind:value={selectedCategory}
										placeholder="All categories"
									/>
								</div>

								<div>
									<label for="filter-labels" class="mb-1 block text-sm font-medium text-gray-700"
										>Labels</label
									>
									<LabelSelector id="filter-labels" bind:selectedLabelIds />
								</div>

								<div>
									<label for="filter-key" class="mb-1 block text-sm font-medium text-gray-700"
										>Key</label
									>
									<Select
										id="filter-key"
										name="key_filter"
										bind:value={selectedKey}
										options={keyOptions}
										placeholder="All keys"
									/>
								</div>

								<div>
									<label for="filter-sort" class="mb-1 block text-sm font-medium text-gray-700"
										>Sort</label
									>
									<Select
										id="filter-sort"
										name="sort"
										bind:value={selectedSort}
										options={sortOptions}
									/>
								</div>
							</div>
						</div>
					</Card>

					<!-- Songs grid -->
					{#if loading}
						<div class="py-8 text-center">
							<div
								class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"
							></div>
							<p class="mt-2 text-sm text-gray-500">Loading songs...</p>
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
							{#each songs as song (song.id)}
								<SongCard
									{song}
									onEdit={handleEditSong}
									onAddToService={handleAddToService}
									{isEditingService}
									isInCurrentService={songsInCurrentService.has(song.id)}
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
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="mt-6 lg:col-span-3 lg:mt-0">
			<SongsSidebar
				onAddToService={handleAddToService}
				{isEditingService}
				{songsInCurrentService}
			/>
		</div>
	</div>
</div>

<!-- Song Form Modal -->
<Modal
	open={showSongForm}
	title={selectedSong ? 'Edit Song' : 'Add New Song'}
	size="lg"
	onclose={handleSongFormCancel}
>
	<SongForm
		song={selectedSong}
		{loading}
		{error}
		oncancel={handleSongFormCancel}
		ondelete={handleDeleteSong}
	/>
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
