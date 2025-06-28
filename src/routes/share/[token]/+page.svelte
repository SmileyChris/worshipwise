<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { pb } from '$lib/api/client';
	import { createShareAPI } from '$lib/api/share';
	import { createSongsAPI } from '$lib/api/songs';
	import { createRatingsAPI } from '$lib/api/ratings';
	import type { Song, AggregateRatings } from '$lib/types/song';
	import type { TeamShareLink } from '$lib/types/notification';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	// Get token from URL
	let token = $derived($page.params.token);

	// State
	let shareLink = $state<TeamShareLink | null>(null);
	let songs = $state<Song[]>([]);
	let ratings = $state<Map<string, AggregateRatings>>(new Map());
	let loading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');

	// Create anonymous auth context
	const anonymousAuthContext = {
		pb,
		isAuthenticated: false,
		user: null,
		currentChurch: null,
		membership: null,
		membershipRole: 'musician',
		permissions: {
			canViewSongs: true,
			canManageSongs: false,
			canViewServices: false,
			canManageServices: false,
			canViewAnalytics: false,
			canManageChurch: false,
			canManageMembers: false
		},
		canViewSongs: true,
		canManageSongs: false,
		canViewServices: false,
		canManageServices: false,
		canViewAnalytics: false,
		canManageChurch: false,
		canManageMembers: false
	};

	// Filtered songs
	let filteredSongs = $derived.by(() => {
		if (!searchQuery) return songs;
		
		const query = searchQuery.toLowerCase();
		return songs.filter(song => 
			song.title.toLowerCase().includes(query) ||
			(song.artist && song.artist.toLowerCase().includes(query))
		);
	});

	// Load share link data
	async function loadShareData() {
		loading = true;
		error = null;

		try {
			// Get share link details
			const shareAPI = createShareAPI(anonymousAuthContext, pb);
			const linkData = await shareAPI.getShareLinkByToken(token);

			if (!linkData) {
				error = 'Invalid or expired share link';
				return;
			}

			shareLink = linkData;

			// Update auth context with church info
			if (linkData.expand?.church_id) {
				anonymousAuthContext.currentChurch = linkData.expand.church_id as any;
			}

			// Load songs
			const songsAPI = createSongsAPI(anonymousAuthContext, pb);
			songs = await songsAPI.getSongs({ showRetired: false });

			// Load ratings if access type includes ratings
			if (linkData.access_type === 'ratings' || linkData.access_type === 'both') {
				const ratingsAPI = createRatingsAPI(anonymousAuthContext, pb);
				const songIds = songs.map(s => s.id);
				ratings = await ratingsAPI.getMultipleSongRatings(songIds);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load share data';
		} finally {
			loading = false;
		}
	}

	// Submit anonymous rating
	async function submitRating(songId: string, rating: 'thumbs_up' | 'thumbs_down') {
		if (!shareLink || shareLink.access_type === 'suggestions') return;

		try {
			// For anonymous ratings, we could create a special anonymous user
			// or track by IP/session. For now, we'll just show a message
			alert('Anonymous rating feature coming soon!');
		} catch (err) {
			console.error('Failed to submit rating:', err);
		}
	}

	onMount(() => {
		loadShareData();
	});
</script>

<svelte:head>
	<title>Team Share - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	{#if loading}
		<div class="py-12 text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-sm text-gray-500">Loading shared content...</p>
		</div>
	{:else if error}
		<Card class="border-red-200 bg-red-50">
			<div class="text-center">
				<h2 class="text-lg font-semibold text-red-900">Access Error</h2>
				<p class="mt-2 text-sm text-red-700">{error}</p>
			</div>
		</Card>
	{:else if shareLink}
		<!-- Church info -->
		<Card>
			<div class="text-center">
				<h1 class="text-2xl font-bold text-gray-900">
					{shareLink.expand?.church_id?.name || 'Church'} Song Library
				</h1>
				<p class="mt-2 text-sm text-gray-600">
					This link allows you to view 
					{#if shareLink.access_type === 'ratings'}
						and rate songs
					{:else if shareLink.access_type === 'suggestions'}
						song suggestions
					{:else}
						songs, ratings, and suggestions
					{/if}
				</p>
				<p class="mt-1 text-xs text-gray-500">
					Link expires: {new Date(shareLink.expires_at).toLocaleDateString()}
				</p>
			</div>
		</Card>

		<!-- Search -->
		<Card padding={false} class="p-4">
			<Input
				placeholder="Search songs by title or artist..."
				bind:value={searchQuery}
				class="w-full"
			/>
		</Card>

		<!-- Songs list -->
		{#if filteredSongs.length === 0}
			<Card class="py-8 text-center">
				<p class="text-gray-500">
					{searchQuery ? 'No songs found matching your search.' : 'No songs available.'}
				</p>
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredSongs as song (song.id)}
					<Card>
						<div class="space-y-2">
							<!-- Song info -->
							<div>
								<h3 class="font-semibold text-gray-900">{song.title}</h3>
								{#if song.artist}
									<p class="text-sm text-gray-600">{song.artist}</p>
								{/if}
							</div>

							<!-- Metadata -->
							<div class="flex flex-wrap gap-2 text-xs">
								{#if song.key_signature}
									<Badge variant="secondary" size="sm">Key: {song.key_signature}</Badge>
								{/if}
								{#if song.tempo}
									<Badge variant="secondary" size="sm">{song.tempo} BPM</Badge>
								{/if}
							</div>

							<!-- Ratings (if allowed) -->
							{#if shareLink.access_type === 'ratings' || shareLink.access_type === 'both'}
								{@const songRatings = ratings.get(song.id)}
								{#if songRatings && songRatings.totalRatings > 0}
									<div class="flex gap-3 text-sm text-gray-600">
										<span>👍 {songRatings.thumbsUp}</span>
										<span>👎 {songRatings.thumbsDown}</span>
										{#if songRatings.difficultCount > 0}
											<span>🎵 {songRatings.difficultCount} difficult</span>
										{/if}
									</div>
								{/if}

								<!-- Anonymous rating buttons -->
								<div class="flex gap-2 pt-2">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => submitRating(song.id, 'thumbs_up')}
										class="flex-1"
									>
										👍 Like
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => submitRating(song.id, 'thumbs_down')}
										class="flex-1"
									>
										👎 Pass
									</Button>
								</div>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	{/if}
</div>