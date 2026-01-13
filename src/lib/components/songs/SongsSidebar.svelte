<script lang="ts">
	import { onMount } from 'svelte';
	import { createSongsAPI } from '$lib/api/songs';
	import { getAuthStore, getSongsStore } from '$lib/context/stores.svelte';
	import type { Song } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ShareManager from '$lib/components/share/ShareManager.svelte';
	import { Music, Activity, Compass, Users, CheckCircle, PlusCircle } from 'lucide-svelte';

	const auth = getAuthStore();
	const songsStore = getSongsStore();
	const stats = $derived(songsStore.stats);

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
	let popularSongs = $state<Song[]>([]);
	let personalPopularSongs = $state<Song[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Load popular songs data
	onMount(async () => {
		await loadPopularSongs();
	});

	async function loadPopularSongs() {
		loading = true;
		error = '';

		try {
			const [popular, personalPopular] = await Promise.all([
				songsAPI.getPopularSongs(5),
				auth.user ? songsAPI.getPersonalPopularSongs(auth.user.id, 5) : Promise.resolve([])
			]);

			popularSongs = popular;
			personalPopularSongs = personalPopular;
		} catch (err) {
			console.error('Failed to load popular songs:', err);
			error = 'Failed to load popular songs';
		} finally {
			loading = false;
		}
	}

	// Format usage count
	function formatUsageCount(count: number): string {
		if (count === 1) return '1 use';
		return `${count} uses`;
	}
</script>

<div class="space-y-6">
	<!-- Library Health -->
	<div class="space-y-3">
		<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
			<Activity class="h-3 w-3" />
			Library Health
		</h3>
		<div class="grid grid-cols-1 gap-2">
			<div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
				<div class="flex items-center gap-2">
					<Compass class="h-4 w-4 text-primary" />
					<span class="text-sm font-medium text-gray-600">Top Key</span>
				</div>
				<span class="text-sm font-bold text-gray-900">{stats.mostUsedKey || 'N/A'}</span>
			</div>
			<div class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
				<div class="flex items-center gap-2">
					<Activity class="h-4 w-4 text-primary" />
					<span class="text-sm font-medium text-gray-600">Avg Tempo</span>
				</div>
				<span class="text-sm font-bold text-gray-900">{stats.averageTempo ? `${stats.averageTempo} BPM` : 'N/A'}</span>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="animate-pulse space-y-4">
			<div class="h-32 bg-gray-100 rounded-2xl"></div>
			<div class="h-32 bg-gray-100 rounded-2xl"></div>
		</div>
	{:else if error}
		<Card>
			<div class="py-4 text-center">
				<p class="text-sm text-red-600">{error}</p>
				<Button size="sm" variant="ghost" onclick={loadPopularSongs} class="mt-2">Try Again</Button>
			</div>
		</Card>
	{:else}
		<!-- Popular Songs -->
		<div class="space-y-4">
			<h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
				<Users class="h-3 w-3" />
				Trending
			</h3>
			
			{#each popularSongs as song, index (song.id)}
				<div class="group flex items-center justify-between p-2 hover:bg-white hover:shadow-md hover:border-gray-100 rounded-xl transition-all border border-transparent">
					<div class="flex items-center gap-3 min-w-0">
						<span class="text-xs font-black text-gray-300 group-hover:text-primary transition-colors pr-1">{(index+1).toString().padStart(2, '0')}</span>
						<div class="min-w-0">
							<p class="text-sm font-bold text-gray-900 truncate">{song.title}</p>
							<p class="text-[10px] text-gray-400 truncate">{song.artist || 'Unknown'}</p>
						</div>
					</div>
					
					{#if isEditingService}
						<button
							onclick={() => onAddToService(song)}
							disabled={songsInCurrentService.has(song.id)}
							class="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all text-xs {songsInCurrentService.has(song.id) ? 'bg-green-50 text-green-500 border-green-100' : ''}"
						>
							{#if songsInCurrentService.has(song.id)}
								<CheckCircle class="h-3.5 w-3.5" />
							{:else}
								<PlusCircle class="h-3.5 w-3.5" />
							{/if}
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Share Manager (for leaders/admins) -->
		{#if auth.canManageSongs}
			<div class="pt-4">
				<ShareManager />
			</div>
		{/if}
	{/if}
</div>
