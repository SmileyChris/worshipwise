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
				<div class="mb-3 h-4 w-3/4 rounded bg-gray-200"></div>
				<div class="space-y-2">
					<div class="h-3 rounded bg-gray-200"></div>
					<div class="h-3 w-5/6 rounded bg-gray-200"></div>
					<div class="h-3 w-4/6 rounded bg-gray-200"></div>
				</div>
			</div>
		</Card>
	{:else if error}
		<Card>
			<div class="py-4 text-center">
				<p class="text-sm text-red-600">{error}</p>
				<Button size="sm" variant="ghost" onclick={loadPopularSongs} class="mt-2">Try Again</Button>
			</div>
		</Card>
	{:else}
		<!-- Overall Popular Songs -->
		<Card>
			<h3 class="font-title mb-4 text-lg font-semibold text-gray-900">Popular Songs</h3>
			{#if popularSongs.length > 0}
				<div class="space-y-3">
					{#each popularSongs as song, index}
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span
										class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600"
									>
										{index + 1}
									</span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-900">
											<a href="/songs/{song.id}" class="hover:text-primary transition-colors">
												{song.title}
											</a>
										</p>
										{#if song.artist}
											<p class="truncate text-xs text-gray-500">{song.artist}</p>
										{/if}
									</div>
								</div>

								{#if song.expand?.song_usage_via_song && song.expand.song_usage_via_song.length > 0}
									<div class="mt-1 ml-7">
										<Badge size="sm" variant="default">
											{formatUsageCount(song.expand.song_usage_via_song.length)}
										</Badge>
									</div>
								{/if}
							</div>

							{#if isEditingService}
								<Button
									size="sm"
									variant={songsInCurrentService.has(song.id) ? 'secondary' : 'primary'}
									onclick={() => onAddToService(song)}
									disabled={songsInCurrentService.has(song.id)}
									class="ml-2 flex-shrink-0"
								>
									{songsInCurrentService.has(song.id) ? '✓' : '+'}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="py-6 text-center text-gray-500">
					<div class="mb-2 text-2xl">📊</div>
					<p class="text-sm">No usage data yet</p>
				</div>
			{/if}
		</Card>

		<!-- Personal Popular Songs -->
		{#if auth.user && personalPopularSongs.length > 0}
			<Card>
				<h3 class="font-title mb-4 text-lg font-semibold text-gray-900">Your Favorites</h3>
				<div class="space-y-3">
					{#each personalPopularSongs as song, index}
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span
										class="bg-primary/10 text-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
									>
										{index + 1}
									</span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-900">
											<a href="/songs/{song.id}" class="hover:text-primary transition-colors">
												{song.title}
											</a>
										</p>
										{#if song.artist}
											<p class="truncate text-xs text-gray-500">{song.artist}</p>
										{/if}
									</div>
								</div>

								{#if song.expand?.song_usage_via_song && song.expand.song_usage_via_song.length > 0}
									<div class="mt-1 ml-7">
										<Badge size="sm" class="bg-primary/10 text-primary">
											{formatUsageCount(song.expand.song_usage_via_song.length)}
										</Badge>
									</div>
								{/if}
							</div>

							{#if isEditingService}
								<Button
									size="sm"
									variant={songsInCurrentService.has(song.id) ? 'secondary' : 'primary'}
									onclick={() => onAddToService(song)}
									disabled={songsInCurrentService.has(song.id)}
									class="ml-2 flex-shrink-0"
								>
									{songsInCurrentService.has(song.id) ? '✓' : '+'}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			</Card>
		{/if}
	{/if}
</div>
