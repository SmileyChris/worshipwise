<script lang="ts">
	import { page } from '$app/stores';
	import SongCard from '$lib/components/songs/SongCard.svelte';
	import SongForm from '$lib/components/songs/SongForm.svelte';
	import SongsSidebar from '$lib/components/songs/SongsSidebar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CategorySelect from '$lib/components/ui/CategorySelect.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import LabelSelector from '$lib/components/ui/LabelSelector.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getAuthStore, getServicesStore, getSongsStore } from '$lib/context/stores.svelte';
	import type { Song, Label } from '$lib/types/song';
	import { createLabelsAPI } from '$lib/api/labels';
	import { createRatingsAPI } from '$lib/api/ratings';
	import { onMount } from 'svelte';
	import { Music, CheckCircle, Clock, PlusCircle, Search, Users, TrendingUp, ChevronDown, ChevronRight } from 'lucide-svelte';

	let { data } = $props();

	const auth = getAuthStore();
	const songsStore = getSongsStore();
	const servicesStore = getServicesStore();

	// Modal state
	let showSongForm = $state(false);
	let showDeleteConfirm = $state(false);
	let songToDelete = $state<Song | null>(null);

	// View state
	let viewMode = $state<'list' | 'themes'>('themes');

	// Search state
	let searchQuery = $state('');
	// let selectedCategory = $state(''); // Replaced by theme
	let selectedThemeId = $state('');
	let selectedSort = $state('title');
	let showRetired = $state(false);
	let showFavorites = $state(false);
	let showDifficult = $state(false);
	let initialLoadComplete = $state(false);

	// Data for filters
	let availableLabels = $state<Label[]>([]);

	// Theme data
	let themesData = $state<Map<string, { label: { id: string; name: string; color?: string }; songs: Song[] }> | null>(null);
	let themesLoading = $state(false);
	
	// Collapsible themes state
	let expandedThemes = $state(new Set<string>());

	// Filter themes based on search
	let filteredThemes = $derived.by(() => {
		if (!themesData) return null;
		if (!searchQuery.trim()) return themesData;

		const query = searchQuery.toLowerCase();
		const result = new Map();

		for (const [id, data] of themesData) {
			const matchingSongs = data.songs.filter(s =>
				s.title.toLowerCase().includes(query) ||
				(s.artist && s.artist.toLowerCase().includes(query))
			);

			if (matchingSongs.length > 0) {
				result.set(id, { ...data, songs: matchingSongs });
			}
		}
		return result;
	});

	// Auto-expand/collapse on search
	$effect(() => {
		if (searchQuery.trim() && filteredThemes) {
			// Expand all found themes
			expandedThemes = new Set(filteredThemes.keys());
		} else {
			// Collapse all when search is cleared
			expandedThemes = new Set();
		}
	});

	function toggleTheme(id: string) {
		const newSet = new Set(expandedThemes);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedThemes = newSet;
	}

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

	// Ratings state
	let ratingsLoading = $state(true);
	
	const ratingsAPI = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createRatingsAPI(ctx, ctx.pb);
	});

	const labelsAPI = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createLabelsAPI(ctx.pb);
	});

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

	// Theme options for dropdown
	let themeOptions = $derived.by(() => [
		...availableLabels.map(l => ({ value: l.id, label: l.name }))
	]);

	// Load filters data
	async function loadFilters() {
		if (!auth.currentChurch) return;
		try {
			availableLabels = await labelsAPI.getLabels(auth.currentChurch.id);
		} catch (error) {
			console.error('Failed to load labels:', error);
		}
	}

	// Load theme data
	async function loadThemesData() {
		themesLoading = true;
		try {
			themesData = await songsStore.getSongsByLabel();
		} catch (error) {
			console.error('Failed to load themes data:', error);
		} finally {
			themesLoading = false;
		}
	}

	// Load songs on mount
	onMount(() => {
		// Deep link: open song form when `?new=1` or `?new=true`
		const openNew = $page.url.searchParams.get('new');
		if (openNew === '1' || openNew === 'true') {
			songsStore.selectSong(null);
			showSongForm = true;
		}

		loadFilters(); // Load labels for filter

		if (viewMode === 'themes') {
			loadThemesData();
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
		// Wait for church context before loading
		if (!auth.currentChurch) return;

		if (viewMode === 'themes') {
			loadThemesData();
			initialLoadComplete = true;
		} else if (viewMode === 'list' && !initialLoadComplete) {
			songsStore.loadSongs().then(() => {
				initialLoadComplete = true;
			});
		}
	});

	// Watch for filter changes (avoiding infinite loops by not watching loading state)

	$effect(() => {
		// Only apply filters after initial load to avoid duplicate calls (only for list view)
		if (viewMode === 'list' && initialLoadComplete && auth.currentChurch) {
			const filters = {
				search: searchQuery,
				// category: selectedCategory, // Removed
				labels: selectedThemeId ? [selectedThemeId] : undefined,
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

	// Fetch ratings for visible songs
	$effect(() => {
		const visibleSongs: Song[] = [];
		
		if (viewMode === 'list' && songs.length > 0) {
			visibleSongs.push(...songs);
		} else if (viewMode === 'themes' && filteredThemes) {
			for (const { songs: themeSongs } of filteredThemes.values()) {
				// Only fetch ratings for expanded themes to save requests? 
				// Or fetch all so they are ready when expanded? Fetching all is safer for UX.
				visibleSongs.push(...themeSongs);
			}
		}

		if (visibleSongs.length > 0 && auth.currentChurch) {
			ratingsLoading = true;
			const songIds = visibleSongs.map(s => s.id);
			
			// Fetch ratings to populate cache
			// We don't store the result here because the API module caches it
			// and child components will read from cache
			Promise.all([
				ratingsAPI.getUserRatingsForSongs(songIds),
				ratingsAPI.getMultipleSongRatings(songIds)
			]).then(() => {
				ratingsLoading = false;
			}).catch(err => {
				console.error('Failed to pre-fetch ratings:', err);
				ratingsLoading = false;
			});
		} else {
			ratingsLoading = false;
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

	function handleThemeClick(themeId: string) {
		selectedThemeId = themeId;
		searchQuery = '';
		viewMode = 'list'; // Ensure we are in list view to see the filtered result clearly
	}

	function clearError() {
		songsStore.clearError();
	}
</script>

<svelte:head>
	<title>Songs - WorshipWise</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2 class="font-title text-3xl font-bold text-gray-900">Song Library</h2>
			<p class="mt-1 text-gray-500">Manage your worship songs and track usage patterns</p>
		</div>

		<div class="mt-4 flex items-center gap-4 md:mt-0 md:ml-4">
			{#if auth.canManageSongs}
				<Button variant="primary" onclick={handleAddSong} class="shadow-lg shadow-primary/20">Add New Song</Button>
			{/if}
		</div>
	</div>

	<!-- Stats cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<Card class="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
			<div class="flex items-center gap-4">
				<div class="bg-indigo-100 p-3 rounded-xl">
					<Music class="h-6 w-6 text-indigo-600" />
				</div>
				<div>
					<div class="text-2xl font-bold text-gray-900 leading-none">{stats.totalSongs}</div>
					<div class="text-xs text-indigo-500 font-bold uppercase tracking-wider mt-1">Total Songs</div>
				</div>
			</div>
		</Card>

		<Card class="bg-gradient-to-br from-green-50 to-white border-green-100">
			<div class="flex items-center gap-4">
				<div class="bg-green-100 p-3 rounded-xl">
					<CheckCircle class="h-6 w-6 text-green-600" />
				</div>
				<div>
					<div class="text-2xl font-bold text-gray-900 leading-none">{stats.availableSongs}</div>
					<div class="text-xs text-green-500 font-bold uppercase tracking-wider mt-1">Ready to Use</div>
				</div>
			</div>
		</Card>

		<Card class="bg-gradient-to-br from-amber-50 to-white border-amber-100">
			<div class="flex items-center gap-4">
				<div class="bg-amber-100 p-3 rounded-xl">
					<Clock class="h-6 w-6 text-amber-600" />
				</div>
				<div>
					<div class="text-2xl font-bold text-gray-900 leading-none">
						{stats.uniqueSongsLast6Months ?? 0}
					</div>
					<div class="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">
						Used Last 6 Months
					</div>
					{#if stats.uniqueSongsPrevious6Months !== undefined}
						<div class="text-xs text-gray-500 mt-1 font-medium">
							vs {stats.uniqueSongsPrevious6Months} prev.
						</div>
					{/if}
				</div>
			</div>
		</Card>
	</div>

	<!-- Service Editing Banner -->
	{#if isEditingService && currentService}
		<div class="bg-primary px-6 py-4 rounded-2xl shadow-lg shadow-primary/10 flex items-center justify-between text-white">
			<div class="flex items-center gap-4">
				<div class="bg-white/20 p-2 rounded-full animate-pulse">
					<PlusCircle class="h-5 w-5" />
				</div>
				<div>
					<p class="font-bold">Planning: {currentService.title}</p>
					<p class="text-xs text-white/80 italic">Select songs from the library to add them to this service.</p>
				</div>
			</div>
			<Button
				variant="ghost"
				size="sm"
				href="/services/{currentService.id}"
				class="bg-white/10 hover:bg-white/20 text-white border-white/20"
			>
				Return to Plan
			</Button>
		</div>
	{/if}

	<!-- Main Layout -->
	<div class="lg:grid lg:grid-cols-12 lg:gap-10">
		<div class="lg:col-span-9 space-y-8">
			<!-- Search and controls -->
			<Card class="bg-gray-50/50 border-gray-100">
				<div class="space-y-6">
					<!-- Search bar with view toggle -->
					<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder={viewMode === 'themes' ? "Search songs by title or artist..." : "Search songs by title, artist, or theme..."}
								bind:value={searchQuery}
								class="w-full pl-10 pr-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
							/>
						</div>

						<!-- View Toggle -->
						<div class="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
							<button
								onclick={() => (viewMode = 'themes')}
								class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all {viewMode === 'themes'
									? 'bg-primary text-white shadow-md'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Themes
							</button>
							<button
								onclick={() => (viewMode = 'list')}
								class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all {viewMode === 'list'
									? 'bg-primary text-white shadow-md'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								List
							</button>
						</div>
					</div>

					<!-- List view filters -->
					{#if viewMode === 'list'}
						<div class="flex flex-wrap items-center gap-4 justify-end">
							<div class="w-full sm:w-48">
								<Select
									id="filter-theme"
									name="theme_filter"
									bind:value={selectedThemeId}
									options={themeOptions}
									placeholder="All Themes"
								/>
							</div>
							<div class="w-full sm:w-40">
								<Select
									id="filter-sort"
									name="sort"
									bind:value={selectedSort}
									options={sortOptions}
								/>
							</div>
						</div>
					{/if}

					{#if viewMode === 'list'}
						<div class="flex flex-wrap gap-4 pt-2 border-t border-gray-200/50">
							<label class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-primary transition-colors">
								<input type="checkbox" bind:checked={showFavorites} class="text-primary rounded" />
								<span class="text-sm font-medium text-gray-600">Favorites</span>
							</label>
							<label class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-primary transition-colors">
								<input type="checkbox" bind:checked={showDifficult} class="text-primary rounded" />
								<span class="text-sm font-medium text-gray-600">Complex</span>
							</label>
							<label class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-primary transition-colors">
								<input type="checkbox" bind:checked={showRetired} class="text-primary rounded" />
								<span class="text-sm font-medium text-gray-600">Show Retired</span>
							</label>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Songs Content -->
			{#if viewMode === 'themes'}
				{#if themesLoading}
					<div class="flex flex-col items-center justify-center h-64">
						<LoadingSpinner />
						<p class="mt-4 text-gray-500 font-medium">Sorting your library...</p>
					</div>
				{:else if filteredThemes && filteredThemes.size > 0}
					<div class="space-y-4">
						{#each [...filteredThemes.entries()] as [labelId, { label, songs }] (labelId)}
							<section class="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-md">
								<button
									onclick={() => toggleTheme(labelId)}
									class="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors text-left"
								>
									<div class="flex items-center gap-3">
										<div class="text-gray-400">
											{#if expandedThemes.has(labelId)}
												<ChevronDown class="h-5 w-5" />
											{:else}
												<ChevronRight class="h-5 w-5" />
											{/if}
										</div>
										<h3 class="font-title text-lg font-bold text-gray-900 flex items-center gap-2">
											{#if label.color}
												<div class="w-3 h-3 rounded-full shadow-sm" style="background-color: {label.color}"></div>
											{/if}
											{label.name}
										</h3>
									</div>
									<div class="flex items-center gap-3">
										<span class="text-sm font-medium {songs.length > 0 ? 'text-gray-600' : 'text-gray-400'}">
											{songs.length} {songs.length === 1 ? 'song' : 'songs'}
										</span>
									</div>
								</button>
								
								{#if expandedThemes.has(labelId)}
									<div class="p-4 border-t border-gray-100 bg-white">
										<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
											{#each songs as song (song.id)}
												<SongCard
													{song}
													onEdit={handleEditSong}
													onAddToService={handleAddToService}
													onThemeClick={handleThemeClick}
													{isEditingService}
													isInCurrentService={songsInCurrentService.has(song.id)}
													{ratingsLoading}
												/>
											{/each}
										</div>
									</div>
								{/if}
							</section>
						{/each}
					</div>
				{:else}
					<Card padding={false} class="overflow-hidden">
						<EmptyState
							title="Empty Library"
							message="Start adding songs to build your worship library."
							action={{ label: 'Add First Song', onclick: handleAddSong }}
						/>
					</Card>
				{/if}
			{:else}
				<!-- List View -->
				{#if loading && songs.length === 0}
					<div class="flex flex-col items-center justify-center h-64">
						<LoadingSpinner />
					</div>
				{:else if songs.length === 0}
					<Card padding={false} class="overflow-hidden">
						<EmptyState
							title="No songs found"
							message="Try adjusting your filters or search query."
							action={{ label: 'Clear Filters', onclick: () => { searchQuery = ''; selectedThemeId = ''; showFavorites = false; showRetired = false; } }}
						/>
					</Card>
				{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each songs as song (song.id)}
							<SongCard
								{song}
								onEdit={handleEditSong}
								onAddToService={handleAddToService}
								onThemeClick={handleThemeClick}
								{isEditingService}
								isInCurrentService={songsInCurrentService.has(song.id)}
								{ratingsLoading}
							/>
						{/each}
					</div>

					{#if totalPages > 1}
						<div class="flex items-center justify-between pt-6">
							<p class="text-sm text-gray-500 font-medium whitespace-nowrap">
								Page <span class="text-gray-900">{currentPage}</span> of <span class="text-gray-900">{totalPages}</span>
							</p>
							<div class="flex gap-2">
								<Button variant="outline" size="sm" onclick={handlePrevPage} disabled={!hasPrevPage || loading}>Previous</Button>
								<Button variant="outline" size="sm" onclick={handleNextPage} disabled={!hasNextPage || loading}>Next</Button>
							</div>
						</div>
					{/if}
				{/if}
			{/if}
		</div>

		<!-- Sidebar -->
		<aside class="lg:col-span-3 space-y-8">
			<Card padding={false} class="overflow-hidden border-transparent shadow-sm">
				<div class="p-5 bg-primary text-white">
					<div class="flex items-center gap-3">
						<div class="bg-white/20 p-2 rounded-lg">
							<TrendingUp class="h-5 w-5 text-white" />
						</div>
						<h3 class="font-bold">Top Songs</h3>
					</div>
				</div>
				<div class="p-5 bg-white">
					<SongsSidebar
						onAddToService={handleAddToService}
						{isEditingService}
						{songsInCurrentService}
					/>
				</div>
			</Card>
		</aside>
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
