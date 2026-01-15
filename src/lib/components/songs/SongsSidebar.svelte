<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { createSongsAPI } from '$lib/api/songs';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import type { Song } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ShareManager from '$lib/components/share/ShareManager.svelte';
	import { Users, CheckCircle, PlusCircle, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';

	const auth = getAuthStore();

	const songsAPI = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createSongsAPI(ctx, ctx.pb);
	});

	interface Props {
		onAddToService?: (song: Song) => void;
		isEditingService?: boolean;
		songsInCurrentService?: Set<string>;
	}

	let {
		onAddToService = () => {},
		isEditingService = false,
		songsInCurrentService = new Set()
	}: Props = $props();

	// State
	interface TopSongItem {
		song: Song;
		rank: number;
		comparisonRank: number | null;
		usageCount: number;
	}

	let selectedPeriod = $state<'current' | 'previous'>('current');
	let topSongs = $state<TopSongItem[]>([]);
	let previousPeriodTotalSongs = $state(0);
	let loading = $state(true);
	let error = $state('');

	// Load top songs data
	onMount(async () => {
		await loadTopSongs();
	});

	// Re-load when period changes
	$effect(() => {
		loadTopSongs();
	});

	async function loadTopSongs() {
		loading = true;
		error = '';

		try {
			const result = await songsAPI.getTopSongs(10, selectedPeriod);
			topSongs = result.topSongs;
			previousPeriodTotalSongs = result.previousPeriodTotalSongs;
		} catch (err) {
			console.error('Failed to load top songs:', err);
			error = 'Failed to load top songs';
		} finally {
			loading = false;
		}
	}

	// Format usage count
	function formatUsageCount(count: number): string {
		if (count === 1) return '1 use';
		return `${count} uses`;
	}

	function getRankChange(item: TopSongItem) {
		if (item.comparisonRank === null) return 'new';
		
		// In both views, change = comparisonRank (older) - rank (newer)
		const change = item.comparisonRank - item.rank;

		if (change > 0) return 'up';
		if (change < 0) return 'down';
		return 'same';
	}

	function getChangeAmount(item: TopSongItem) {
		if (item.comparisonRank === null) return 0;
		return Math.abs(item.comparisonRank - item.rank);
	}
</script>

<div class="space-y-6">
	<!-- Period Toggle -->
	<div class="flex flex-col gap-4">
		<div class="flex items-center justify-between px-1">
			<span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
				{selectedPeriod === 'current' ? 'Last 6 months' : 'prev. 6 months'}
			</span>
			
			{#if previousPeriodTotalSongs >= 10}
				<div class="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
					<button 
						onclick={() => selectedPeriod = 'current'}
						class="px-2 py-1 text-[10px] font-bold rounded-md transition-all {selectedPeriod === 'current' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}"
					>
						Current
					</button>
					<button 
						onclick={() => selectedPeriod = 'previous'}
						class="px-2 py-1 text-[10px] font-bold rounded-md transition-all {selectedPeriod === 'previous' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}"
					>
						Previous
					</button>
				</div>
			{/if}
		</div>

		{#if loading && topSongs.length === 0}
			<div class="animate-pulse space-y-4">
				<div class="h-10 bg-gray-50 rounded-xl"></div>
				<div class="h-10 bg-gray-50 rounded-xl"></div>
				<div class="h-10 bg-gray-50 rounded-xl"></div>
				<div class="h-10 bg-gray-50 rounded-xl"></div>
				<div class="h-10 bg-gray-50 rounded-xl"></div>
			</div>
		{:else if error}
			<Card>
				<div class="py-4 text-center">
					<p class="text-sm text-red-600">{error}</p>
					<Button size="sm" variant="ghost" onclick={loadTopSongs} class="mt-2">Try Again</Button>
				</div>
			</Card>
		{:else}
			<div class="space-y-3 transition-opacity duration-200 {loading ? 'opacity-60' : 'opacity-100'}">
				{#each topSongs as item (item.song.id)}
					{@const change = getRankChange(item)}
					{@const amount = getChangeAmount(item)}
					<div 
						animate:flip={{ duration: 400 }}
						class="group flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all border border-transparent"
					>
						<a 
							href="/songs/{item.song.id}"
							class="flex items-center gap-3 min-w-0 flex-1"
						>
							<!-- Rank & Change -->
							<div class="flex flex-col items-center justify-center w-8">
								<span class="text-sm font-bold text-gray-900 leading-none">{item.rank}</span>
								
								{#if change === 'new'}
									<span class="text-[9px] font-bold text-green-600 uppercase mt-0.5">New</span>
								{:else if change === 'up'}
									<div class="flex items-center text-green-600 mt-0.5">
										<TrendingUp class="h-3 w-3" />
										<span class="text-[9px] font-bold ml-0.5">{amount}</span>
									</div>
								{:else if change === 'down'}
									<div class="flex items-center text-red-500 mt-0.5">
										<TrendingDown class="h-3 w-3" />
										<span class="text-[9px] font-bold ml-0.5">{amount}</span>
									</div>
								{:else}
									<Minus class="h-3 w-3 text-gray-300 mt-0.5" />
								{/if}
							</div>

							<div class="min-w-0">
								<p class="text-sm font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{item.song.title}</p>
								<div class="flex items-center gap-2 text-[10px] text-gray-500">
									{#if item.song.artist}
										<span class="truncate max-w-[80px]">{item.song.artist}</span>
										<span class="text-gray-300">•</span>
									{/if}
									<span>{formatUsageCount(item.usageCount)}</span>
								</div>
							</div>
						</a>
						
						{#if isEditingService}
							<button
								onclick={() => onAddToService(item.song)}
								disabled={songsInCurrentService.has(item.song.id)}
								class="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all text-xs {songsInCurrentService.has(item.song.id) ? 'bg-green-50 text-green-500 border-green-100' : ''}"
							>
								{#if songsInCurrentService.has(item.song.id)}
									<CheckCircle class="h-3.5 w-3.5" />
								{:else}
									<PlusCircle class="h-3.5 w-3.5" />
								{/if}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Share Manager (for leaders/admins) -->
	{#if auth.canManageSongs}
		<div class="pt-4 border-t border-gray-100">
			<ShareManager />
		</div>
	{/if}
</div>
