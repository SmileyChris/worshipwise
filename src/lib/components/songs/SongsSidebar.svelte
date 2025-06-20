<script lang="ts">
	import { onMount } from 'svelte';
	import { songsApi } from '$lib/api/songs';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Song } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

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
			// Load overall popular songs and personal popular songs in parallel
			const [popular, personalPopular] = await Promise.all([
				songsApi.getPopularSongs(5),
				auth.user ? songsApi.getPersonalPopularSongs(auth.user.id, 5) : Promise.resolve([])
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
	{#if loading}
		<Card>
			<div class="animate-pulse">
				<div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
				<div class="space-y-2">
					<div class="h-3 bg-gray-200 rounded"></div>
					<div class="h-3 bg-gray-200 rounded w-5/6"></div>
					<div class="h-3 bg-gray-200 rounded w-4/6"></div>
				</div>
			</div>
		</Card>
	{:else if error}
		<Card>
			<div class="text-center py-4">
				<p class="text-sm text-red-600">{error}</p>
				<Button size="sm" variant="ghost" onclick={loadPopularSongs} class="mt-2">
					Try Again
				</Button>
			</div>
		</Card>
	{:else}
		<!-- Overall Popular Songs -->
		<Card>
			<h3 class="text-lg font-semibold text-gray-900 mb-4 font-title">Popular Songs</h3>
			{#if popularSongs.length > 0}
				<div class="space-y-3">
					{#each popularSongs as song, index}
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="flex-shrink-0 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
										{index + 1}
									</span>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-gray-900 truncate">
											<a href="/songs/{song.id}" class="hover:text-primary transition-colors">
												{song.title}
											</a>
										</p>
										{#if song.artist}
											<p class="text-xs text-gray-500 truncate">{song.artist}</p>
										{/if}
									</div>
								</div>
								
								{#if song.expand?.usage_count !== undefined}
									<div class="mt-1 ml-7">
										<Badge size="sm" variant="default">
											{formatUsageCount(song.expand.usage_count)}
										</Badge>
									</div>
								{/if}
							</div>
							
							{#if isEditingService}
								<Button
									size="xs"
									variant={songsInCurrentService.has(song.id) ? "secondary" : "primary"}
									onclick={() => onAddToService(song)}
									disabled={songsInCurrentService.has(song.id)}
									class="ml-2 flex-shrink-0"
								>
									{songsInCurrentService.has(song.id) ? "✓" : "+"}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-6 text-gray-500">
					<div class="text-2xl mb-2">📊</div>
					<p class="text-sm">No usage data yet</p>
				</div>
			{/if}
		</Card>

		<!-- Personal Popular Songs -->
		{#if auth.user && personalPopularSongs.length > 0}
			<Card>
				<h3 class="text-lg font-semibold text-gray-900 mb-4 font-title">Your Favorites</h3>
				<div class="space-y-3">
					{#each personalPopularSongs as song, index}
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
										{index + 1}
									</span>
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium text-gray-900 truncate">
											<a href="/songs/{song.id}" class="hover:text-primary transition-colors">
												{song.title}
											</a>
										</p>
										{#if song.artist}
											<p class="text-xs text-gray-500 truncate">{song.artist}</p>
										{/if}
									</div>
								</div>
								
								{#if song.expand?.personal_usage_count !== undefined}
									<div class="mt-1 ml-7">
										<Badge size="sm" class="bg-blue-100 text-blue-800">
											{formatUsageCount(song.expand.personal_usage_count)}
										</Badge>
									</div>
								{/if}
							</div>
							
							{#if isEditingService}
								<Button
									size="xs"
									variant={songsInCurrentService.has(song.id) ? "secondary" : "primary"}
									onclick={() => onAddToService(song)}
									disabled={songsInCurrentService.has(song.id)}
									class="ml-2 flex-shrink-0"
								>
									{songsInCurrentService.has(song.id) ? "✓" : "+"}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	{/if}
</div>