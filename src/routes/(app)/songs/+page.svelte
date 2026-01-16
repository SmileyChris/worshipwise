<script lang="ts">
	import { page } from '$app/stores';
	import SongCard from '$lib/components/songs/SongCard.svelte';
	import SongForm from '$lib/components/songs/SongForm.svelte';
	import SongsSidebar from '$lib/components/songs/SongsSidebar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

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
	import { Music, CheckCircle, Clock, PlusCircle, Search, Users, TrendingUp, ChevronDown, ChevronRight, ChevronLeft, Layout, List, X, Filter } from 'lucide-svelte';

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
	let statusFilter = $state<'all' | 'ready' | 'used'>('ready');
	let uniqueSongsTimeframe = $state<'recent' | '3months' | '6months'>('recent');
	let collapsedSidebar = $state(false);

	// Search state
	let searchQuery = $state('');
	// let selectedCategory = $state(''); // Replaced by theme
	let selectedThemeId = $state('');
	let selectedSort = $state('title');
	let showRetired = $state(false);
	let showFavorites = $state(false);
	// Christmas visibility logic: Only show songs in December or if specifically viewing the theme
	let isDecember = $derived(new Date().getMonth() === 11);
	let initialLoadComplete = $state(false);
	let filtersExpanded = $state(false);

	// Pagination state (local for client-side)
	let pageNumber = $state(1);
	let itemsPerPage = 24;

	// Data for filters
	let availableLabels = $state<Label[]>([]);



	// Reactive data from store
	let loading = $derived(songsStore.loading);
	let error = $derived(songsStore.error);
	let stats = $derived(songsStore.stats);
	let selectedSong = $derived(songsStore.selectedSong);
	
	// Use local user ratings (synced from store)
	let userRatings = $derived(songsStore.userRatings); 
	let allSongs = $derived(songsStore.allSongs);

	// Derived stats
	let uniqueSongsCount = $derived.by(() => {
		if (!allSongs || allSongs.length === 0) return stats.uniqueSongsLast6Months ?? 0;
		
		return allSongs.filter(s => {
			// Use historical sung date, not future plan date
			if (!s.daysSinceLastSung && s.daysSinceLastSung !== 0) return false;
			const days = s.daysSinceLastSung!;
			
			if (uniqueSongsTimeframe === 'recent') return days <= 30;
			if (uniqueSongsTimeframe === '3months') return days <= 90;
			if (uniqueSongsTimeframe === '6months') return days <= 180;
			return false;
		}).length;
	});

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
	let isEditingService = $derived(servicesStore.isPlanning && !!currentService);

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

	let selectedThemeLabel = $derived(availableLabels.find(l => l.id === selectedThemeId));

	// Load filters data
	async function loadFilters() {
		if (!auth.currentChurch) return;
		try {
			availableLabels = await labelsAPI.getLabels(auth.currentChurch.id);
		} catch (error) {
			console.error('Failed to load labels:', error);
		}
	}

	// Computed Theme Data (Client-side grouping)
	let themesData = $derived.by(() => {
		if (!allSongs || allSongs.length === 0) return null;
		
		const labelMap = new Map<string, { label: { id: string; name: string; color?: string }; songs: Song[] }>();

		// Helper to find label info
		const getLabelInfo = (id: string) => availableLabels.find(l => l.id === id);

		allSongs.forEach(song => {
			const hasLabels = song.labels && song.labels.length > 0;
			
			if (!hasLabels) {
				// Handle uncategorized
				const noLabelId = 'uncategorized';
				if (!labelMap.has(noLabelId)) {
					labelMap.set(noLabelId, {
						label: {
							id: noLabelId,
							name: 'Uncategorized',
							color: 'gray'
						},
						songs: []
					});
				}
				labelMap.get(noLabelId)!.songs.push(song);
			} else {
				// Add song to each of its label groups
				song.labels!.forEach(labelId => {
					// We might need label info from options if expand isn't on song
					// The song.expand?.labels might be present, but let's rely on availableLabels if possible or fallback
					let labelName = 'Unknown Label';
					let labelColor: string | undefined = undefined;

					// Try to find in availableLabels first (loaded separately)
					const labelDef = getLabelInfo(labelId);
					if (labelDef) {
						labelName = labelDef.name;
						labelColor = labelDef.color;
					} else if (song.expand?.labels) {
						// Fallback to expand data on song
						const l = song.expand.labels.find((x: any) => x.id === labelId);
						if (l) {
							labelName = l.name;
							labelColor = l.color;
						}
					}

					if (!labelMap.has(labelId)) {
						labelMap.set(labelId, {
							label: {
								id: labelId,
								name: labelName,
								color: labelColor
							},
							songs: []
						});
					}
					labelMap.get(labelId)!.songs.push(song);
				});
			}
		});

		// Sort songs within each label
		for (const data of labelMap.values()) {
			data.songs.sort((a, b) => a.title.localeCompare(b.title));
		}

		// Sort the map by label name (Uncategorized at end)
		const sortedMap = new Map(
			[...labelMap.entries()].sort((a, b) => {
				if (a[0] === 'uncategorized') return 1;
				if (b[0] === 'uncategorized') return -1;
				// Safely compare names
				return a[1].label.name.localeCompare(b[1].label.name);
			})
		);

		return sortedMap;
	});

	// Collapsible themes state
	let expandedThemes = $state(new Set<string>());

	// Unified Filter Logic
	function filterSong(s: Song, query: string, currentLabelId?: string): boolean {
		// Global Christmas filter (Include/Exclude)
		const isChristmasSong = (s.title && s.title.toLowerCase().includes('christmas')) || 
								(s.tags && s.tags.some(t => t.toLowerCase().includes('christmas'))) ||
								(s.expand?.labels && s.expand.labels.some(l => l.name.toLowerCase().includes('christmas')));

		if (!isDecember && isChristmasSong) {
			// Always hide from searches
			if (query) return false;
			
			// Always hide from "Ready to Use" filter (to match stats count)
			if (statusFilter === 'ready') return false;

			// Context check for browsing
			let inChristmasContext = false;
			if (currentLabelId) {
				const label = availableLabels.find(l => l.id === currentLabelId);
				if (label?.name.toLowerCase().includes('christmas')) inChristmasContext = true;
			} else if (selectedThemeId) {
				const label = availableLabels.find(l => l.id === selectedThemeId);
				if (label?.name.toLowerCase().includes('christmas')) inChristmasContext = true;
			}

			// Don't include in other categories or general list
			if (!inChristmasContext) return false;
		}

		// Search filter
		const matchesSearch = !query || 
			s.title.toLowerCase().includes(query) ||
			(s.artist && s.artist.toLowerCase().includes(query));

		if (!matchesSearch) return false;

		// Retired filter
		if (!showRetired && s.is_retired) return false;
		if (showRetired && !s.is_retired) return false;

		// Favorites Filter
		if (showFavorites) {
			const userRating = userRatings.get(s.id);
			if (userRating?.rating !== 'thumbs_up') return false;
		}

		// List-view specific Theme filter
		if (viewMode === 'list' && selectedThemeId) {
			if (!s.labels || !s.labels.includes(selectedThemeId)) return false;
		}

		// Status filter
		if (statusFilter === 'ready') {
			const isAvailable = s.usageStatus === 'available';
			const isNew = !s.lastUsedDate || s.daysSinceLastUsed === Infinity;
			return isAvailable || isNew;
		} else if (statusFilter === 'used') {
			// Filter by HISTORICAL usage
			if (!s.daysSinceLastSung && s.daysSinceLastSung !== 0) return false;
			const days = s.daysSinceLastSung!;
			
			if (uniqueSongsTimeframe === 'recent') return days <= 30;
			if (uniqueSongsTimeframe === '3months') return days <= 90;
			if (uniqueSongsTimeframe === '6months') return days <= 180;
		}

		return true;
	}

	let filteredThemes = $derived.by(() => {
		if (!themesData) return null;
		
		const query = searchQuery.toLowerCase().trim();
		const result = new Map();

		for (const [id, data] of themesData) {
			const matchingSongs = data.songs.filter(s => {
				// Use unified logic with category context
				return filterSong(s, query, id);
			});

			if (matchingSongs.length > 0) {
				result.set(id, { ...data, songs: matchingSongs });
			}
		}
		return result;
	});

	// Filtered and Sorted Songs for List View
	let filteredListSongs = $derived.by(() => {
		if (!songsStore.allSongs) return [];

		const query = searchQuery.toLowerCase().trim();
		
		let result = songsStore.allSongs.filter(s => filterSong(s, query));

		// Sort
		result.sort((a, b) => {
			const sortField = selectedSort.replace('-', '') as keyof Song;
			const direction = selectedSort.startsWith('-') ? -1 : 1;
			
			const valA = (a[sortField] || '').toString().toLowerCase();
			const valB = (b[sortField] || '').toString().toLowerCase();

			if (valA < valB) return -1 * direction;
			if (valA > valB) return 1 * direction;
			return 0;
		});

		return result;
	});

	// Pagination Logic
	let totalItems = $derived(filteredListSongs.length);
	let totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
	
	// Reset page when filters change
	$effect(() => {
		// Just referencing filteredListSongs to track dependencies
		filteredListSongs;
		// Reset to page 1
		pageNumber = 1;
	});

	let paginatedSongs = $derived.by(() => {
		const start = (pageNumber - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		return filteredListSongs.slice(start, end);
	});

	let hasNextPage = $derived(pageNumber < totalPages);
	let hasPrevPage = $derived(pageNumber > 1);

	// Auto-expand/collapse on search
	$effect(() => {
		if (searchQuery.trim() && filteredThemes) {
			// Expand all found themes when searching
			expandedThemes = new Set(filteredThemes.keys());
		} else {
			// Collapse all when cleared
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

	// Ensure songs are loaded
	async function ensureSongsLoaded() {
		// Always ensure we have the base songs
		if (songsStore.allSongs.length === 0) {
			await songsStore.loadAllSongsOnce();
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
		songsStore.loadUserPreferences();
		
		// Initial load
		ensureSongsLoaded();

		// Set up real-time updates with proper cleanup
		let unsubscribePromise = songsStore.subscribeToUpdates();

		// Listen for auto-retire events
		const handleAutoRetire = (event: CustomEvent) => {
			const { songId } = event.detail;
			songsStore.handleAutoRetire(songId);
		};

		window.addEventListener('song-auto-retire', handleAutoRetire as EventListener);

		return () => {
			unsubscribePromise.then((unsubscribe) => {
				if (unsubscribe) unsubscribe();
			});
			window.removeEventListener('song-auto-retire', handleAutoRetire as EventListener);
		};
	});

	// Watch for view mode or filter changes
	$effect(() => {
		// Wait for church context before loading
		if (!auth.currentChurch) return;
		
		// Ensure we always have data
		ensureSongsLoaded();
	});

	// Refresh stats when initial load is complete
	$effect(() => {
		if (auth.currentChurch && initialLoadComplete) {
			songsStore.updateGlobalStats();
		}
	});

	// Mark initial load complete after first songs fetch
	$effect(() => {
		if (songsStore.allSongs.length > 0) {
			initialLoadComplete = true;
		}
	});

	// Determine if we should show the spinner
	// We only show spinner if we have NO data to show and we are loading.
	// If we have data, we show it, even if a background refresh is happening.
	let shouldShowSpinner = $derived.by(() => {
		if (viewMode === 'list') {
			// In list view, we use allSongs. If we have songs, don't spin.
			// Only spin if loading AND we have no songs at all (initial load).
			return loading && (!songsStore.allSongs || songsStore.allSongs.length === 0);
		} else {
			// In themes view, we need themesData (which is derived from allSongs).
			// So logic is the same: if we have songs, we have themesData.
			return loading && (!songsStore.allSongs || songsStore.allSongs.length === 0);
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

	function handleNextPage() {
		if (hasNextPage) pageNumber++;
	}

	function handlePrevPage() {
		if (hasPrevPage) pageNumber--;
	}

	function handleThemeClick(themeId: string) {
		selectedThemeId = themeId;
		searchQuery = '';
		viewMode = 'list';
		pageNumber = 1; // Ensure we start at page 1
	}

	function clearError() {
		songsStore.clearError();
	}

	function setTimeframe(e: Event, timeframe: 'recent' | '3months' | '6months') {
		e.stopPropagation();
		uniqueSongsTimeframe = timeframe;
		statusFilter = 'used'; // Also switch filter to used
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

	<!-- Stats cards with filters -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Ready to Use -->
		<button class="text-left w-full focus:outline-none cursor-pointer group" onclick={() => statusFilter = 'ready'}>
			<Card class="bg-gradient-to-br from-green-50 to-white transition-all duration-300 {statusFilter === 'ready' ? 'ring-1 ring-green-400 shadow-md border-green-200' : 'border-green-100 group-hover:shadow-lg group-hover:shadow-green-100/60'}">
				<div class="flex items-center gap-4">
					<div class="bg-green-100 p-3 rounded-xl">
						<CheckCircle class="h-6 w-6 text-green-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900 leading-none">{stats.availableSongs}</div>
						<div class="text-xs text-green-500 font-bold uppercase tracking-wider mt-1">Songs Ready to Use</div>
					</div>
				</div>
			</Card>
		</button>

		<!-- Unique Songs Sung -->
		<button class="text-left w-full focus:outline-none cursor-pointer group" onclick={() => statusFilter = 'used'}>
			<Card class="bg-gradient-to-br from-amber-50 to-white transition-all duration-300 {statusFilter === 'used' ? 'ring-1 ring-amber-400 shadow-md border-amber-200' : 'border-amber-100 group-hover:shadow-lg group-hover:shadow-amber-100/60'}">
				<div class="flex items-center gap-4">
					<div class="bg-amber-100 p-3 rounded-xl self-start">
						<Clock class="h-6 w-6 text-amber-600" />
					</div>
					<div class="flex-1">
						<div class="text-2xl font-bold text-gray-900 leading-none">
							{uniqueSongsCount}
						</div>
						<div class="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">
							Unique Songs Sung
						</div>
						
						<!-- Timeframe links -->
						<div class="flex gap-2 mt-2 text-[10px] font-medium border-t border-amber-100/50 pt-2">
							<button 
								class="hover:text-amber-800 transition-colors {uniqueSongsTimeframe === 'recent' ? 'text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-2' : 'text-amber-600/70'}"
								onclick={(e) => setTimeframe(e, 'recent')}
							>
								Recently
							</button>
							<div class="text-amber-300">|</div>
							<button 
								class="hover:text-amber-800 transition-colors {uniqueSongsTimeframe === '3months' ? 'text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-2' : 'text-amber-600/70'}"
								onclick={(e) => setTimeframe(e, '3months')}
							>
								3mo
							</button>
							<div class="text-amber-300">|</div>
							<button 
								class="hover:text-amber-800 transition-colors {uniqueSongsTimeframe === '6months' ? 'text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-2' : 'text-amber-600/70'}"
								onclick={(e) => setTimeframe(e, '6months')}
							>
								6mo
							</button>
						</div>
					</div>
				</div>
			</Card>
		</button>

		<!-- Total / All -->
		<button class="text-left w-full focus:outline-none cursor-pointer group" onclick={() => statusFilter = 'all'}>
			<Card class="bg-gradient-to-br from-indigo-50 to-white transition-all duration-300 {statusFilter === 'all' ? 'ring-1 ring-indigo-400 shadow-md border-indigo-200' : 'border-indigo-100 group-hover:shadow-lg group-hover:shadow-indigo-100/60'}">
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
		</button>
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
	<div class="lg:grid lg:grid-cols-12 lg:gap-10 transition-all duration-300">
		<div class="{collapsedSidebar ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-8 transition-all duration-300">
			<!-- Search and controls -->
			<Card class="bg-gray-50/50 border-gray-100">
				<div class="space-y-6">
					<!-- Search bar with view toggle on left -->
					<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
						<!-- View Toggle -->
						<div class="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm shrink-0">
							<button
								onclick={() => (viewMode = 'themes')}
								class="rounded-lg px-3 py-1.5 transition-all flex items-center gap-2 {viewMode === 'themes'
									? 'bg-primary text-white shadow-md'
									: 'text-gray-600 hover:text-gray-900'}"
								title="Themes View"
							>
								<Layout class="h-4 w-4" />
								<span class="text-sm font-semibold hidden sm:inline">Themes</span>
							</button>
							<button
								onclick={() => (viewMode = 'list')}
								class="rounded-lg px-3 py-1.5 transition-all flex items-center gap-2 {viewMode === 'list'
									? 'bg-primary text-white shadow-md'
									: 'text-gray-600 hover:text-gray-900'}"
								title="List View"
							>
								<List class="h-4 w-4" />
								<span class="text-sm font-semibold hidden sm:inline">List</span>
							</button>
						</div>

						<!-- Search Input -->
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
							<input
								type="text"
								placeholder={viewMode === 'themes' ? "Search songs by title or artist..." : "Search songs by title, artist, or theme..."}
								bind:value={searchQuery}
								class="w-full pl-10 pr-4 py-3 bg-white border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
							/>
						</div>

						<!-- Filter Toggle -->
						<button
							onclick={() => (filtersExpanded = !filtersExpanded)}
							class="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100/50 transition-all {filtersExpanded ? 'text-primary' : ''}"
							title="Toggle Filters"
						>
							<Filter class="h-4 w-4" />
							<span class="text-sm font-semibold">Filters</span>
							{#if filtersExpanded}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronRight class="h-4 w-4" />
							{/if}
						</button>

						<!-- Top Songs Toggle -->
						{#if collapsedSidebar}
							<button
								onclick={() => collapsedSidebar = false}
								class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-gray-600 hover:text-gray-900 hover:border-primary hover:bg-gray-50 transition-all"
								title="Show Top Songs"
							>
								<TrendingUp class="h-5 w-5 text-primary" />
							</button>
						{/if}
					</div>

					{#if filtersExpanded}
						<!-- List view filters (Theme & Sort) -->
						{#if viewMode === 'list'}
							<div class="flex flex-wrap items-center gap-4 justify-end pt-2 border-t border-gray-100">
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

						<div class="flex flex-wrap gap-4 pt-2 border-t border-gray-200/50">
							<label class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-primary transition-colors">
								<input type="checkbox" bind:checked={showFavorites} class="text-primary rounded" />
								<span class="text-sm font-medium text-gray-600">Favorites</span>
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
				{#if shouldShowSpinner}
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
										<div class="grid grid-cols-1 md:grid-cols-2 {collapsedSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4">
											{#each songs as song (song.id)}
												<SongCard
													{song}
													onEdit={handleEditSong}
													onAddToService={handleAddToService}
													onThemeClick={handleThemeClick}
													{isEditingService}
													isInCurrentService={songsInCurrentService.has(song.id)}
													{ratingsLoading}
													userRating={userRatings.get(song.id) || null}
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
							title="No songs found"
							message={statusFilter !== 'all' 
								? `No ${statusFilter === 'ready' ? 'ready-to-use' : 'used'} songs match your search.` 
								: "Start adding songs to build your worship library."}
							action={{ label: 'Clear Filters', onclick: () => { searchQuery = ''; statusFilter = 'all'; } }}
						/>
					</Card>
				{/if}
			{:else}
				<!-- List View -->
				{#if shouldShowSpinner}
					<div class="flex flex-col items-center justify-center h-64">
						<LoadingSpinner />
					</div>
				{:else if !filteredListSongs || filteredListSongs.length === 0}
					<Card padding={false} class="overflow-hidden">
						<EmptyState
							title="No songs found"
							message="Try adjusting your filters or search query."
							action={{ label: 'Clear Filters', onclick: () => { searchQuery = ''; selectedThemeId = ''; showFavorites = false; showRetired = false; statusFilter = 'all'; } }}
						/>
					</Card>
				{:else}
					{#if selectedThemeId && selectedThemeLabel}
						<section class="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
							<div class="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
								<h3 class="font-title text-lg font-bold text-gray-900 flex items-center gap-2">
									{#if selectedThemeLabel.color}
										<div class="w-3 h-3 rounded-full shadow-sm" style="background-color: {selectedThemeLabel.color}"></div>
									{/if}
									{selectedThemeLabel.name}
								</h3>
								<button 
									onclick={() => { selectedThemeId = ''; searchQuery = ''; }}
									class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
									title="Clear theme filter"
								>
									<X class="h-4 w-4" />
								</button>
							</div>
							<div class="p-5">
								<div class="grid grid-cols-1 md:grid-cols-2 {collapsedSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4">
									{#each paginatedSongs as song (song.id)}
										<SongCard
											{song}
											onEdit={handleEditSong}
											onAddToService={handleAddToService}
											onThemeClick={handleThemeClick}
											{isEditingService}
											isInCurrentService={songsInCurrentService.has(song.id)}
											{ratingsLoading}
											userRating={userRatings.get(song.id) || null}
										/>
									{/each}
								</div>
							</div>
						</section>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 {collapsedSidebar ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4">
							{#each paginatedSongs as song (song.id)}
								<SongCard
									{song}
									onEdit={handleEditSong}
									onAddToService={handleAddToService}
									onThemeClick={handleThemeClick}
									{isEditingService}
									isInCurrentService={songsInCurrentService.has(song.id)}
									{ratingsLoading}
									userRating={userRatings.get(song.id) || null}
								/>
							{/each}
						</div>
					{/if}

					{#if totalPages > 1}
						<div class="flex items-center justify-between pt-6">
							<p class="text-sm text-gray-500 font-medium whitespace-nowrap">
								Page <span class="text-gray-900">{pageNumber}</span> of <span class="text-gray-900">{totalPages}</span>
							</p>
							<div class="flex gap-2">
								<Button variant="outline" size="sm" onclick={handlePrevPage} disabled={!hasPrevPage}>Previous</Button>
								<Button variant="outline" size="sm" onclick={handleNextPage} disabled={!hasNextPage}>Next</Button>
							</div>
						</div>
					{/if}
				{/if}
			{/if}
		</div>

		<!-- Sidebar -->
		<!-- Sidebar -->
		{#if !collapsedSidebar}
			<aside class="lg:col-span-3 transition-all duration-300">
				<Card padding={false} class="overflow-hidden border-transparent shadow-sm sticky top-6">
					<div class="bg-primary text-white p-5 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="bg-white/20 p-2 rounded-lg">
								<TrendingUp class="h-5 w-5 text-white" />
							</div>
							<h3 class="font-bold">Top Songs</h3>
						</div>
						<button 
							onclick={() => collapsedSidebar = true} 
							class="text-white/70 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
							title="Close Top Songs"
						>
							<X class="h-5 w-5" />
						</button>
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
		{/if}
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
