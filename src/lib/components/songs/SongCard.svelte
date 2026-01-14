<script lang="ts">
	import type { Song, SongRating, SongRatingValue, AggregateRatings } from '$lib/types/song';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CategoryBadge from '$lib/components/ui/CategoryBadge.svelte';
	import LabelBadge from '$lib/components/ui/LabelBadge.svelte';
	import SongRatingButton from './SongRatingButton.svelte';
	import { createRatingsAPI } from '$lib/api/ratings';

	interface Props {
		song: Song;
		showUsageIndicator?: boolean;
		showActions?: boolean;
		onEdit?: (song: Song) => void;
		onAddToService?: (song: Song) => void;
		onThemeClick?: (themeId: string) => void;
		isInCurrentService?: boolean;
		isEditingService?: boolean;
		ratingsLoading?: boolean;
		userRating?: { rating: SongRatingValue; is_difficult?: boolean } | null;
		class?: string;
	}

	const auth = getAuthStore();

	let {
		song,
		showUsageIndicator = true,
		showActions = true,
		onEdit = () => {},
		onAddToService = () => {},
		onThemeClick,
		isInCurrentService = false,
		isEditingService = false,
		ratingsLoading = false,
		userRating = null,
		class: className = ''
	}: Props = $props();

	// Format duration from seconds to minutes:seconds
	let formattedDuration = $derived.by(() => {
		if (!song.duration_seconds) return null;
		const minutes = Math.floor(song.duration_seconds / 60);
		const seconds = song.duration_seconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Usage status info based on actual usage data (weekly-focused)
	let usageStatusInfo = $derived.by(() => {
		if (!showUsageIndicator || !song.usageStatus) return null;

		const status = song.usageStatus;
		const daysSince = song.daysSinceLastUsed;

		// Helper to convert days to weeks
		const weeksAgo =
			daysSince !== undefined && daysSince < Infinity ? Math.floor(daysSince / 7) : null;

		switch (status) {
			case 'recent':
				return {
					status: 'red',
					colors: 'bg-red-100 text-red-800',
					text: weeksAgo === 0 ? 'Used this week' : 'Used last week'
				};
			case 'caution':
				return {
					status: 'yellow',
					colors: 'bg-yellow-100 text-yellow-800',
					text: weeksAgo ? `Used ${weeksAgo} weeks ago` : 'Recently used'
				};
			case 'available':
				return {
					status: 'green',
					colors: 'bg-green-100 text-green-800',
					text: 'Available'
				};
			case 'stale':
				return {
					status: 'gray',
					colors: 'bg-gray-100 text-gray-600',
					text: 'Not used recently'
				};
			default:
				return {
					status: null,
					colors: 'bg-gray-100 text-gray-800',
					text: ''
				};
		}
	});

	// Check if user can edit this song
	let canEdit = $derived(auth.canManageSongs || song.created_by === auth.user?.id);

	// Use aggregate ratings from song object (from enriched view)
	// If song doesn't have aggregates (old data), initialize to zeros
	let aggregates = $state<AggregateRatings>({
		thumbsUp: song.thumbs_up ?? 0,
		thumbsDown: song.thumbs_down ?? 0,
		neutral: song.neutral ?? 0,
		totalRatings: song.total_ratings ?? 0,
		difficultCount: song.difficult_count ?? 0
	});

	// Update aggregates when song prop changes
	$effect(() => {
		aggregates = {
			thumbsUp: song.thumbs_up ?? 0,
			thumbsDown: song.thumbs_down ?? 0,
			neutral: song.neutral ?? 0,
			totalRatings: song.total_ratings ?? 0,
			difficultCount: song.difficult_count ?? 0
		};
	});

	const ratingsAPI = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createRatingsAPI(ctx, ctx.pb);
	});

	// Reload aggregates when rating changes (fetches fresh data)
	async function handleRatingChange() {
		try {
			const freshAggregates = await ratingsAPI.getAggregateRatings(song.id);
			// Update the local aggregates with fresh data
			aggregates = freshAggregates;
		} catch (err) {
			console.error('Failed to reload aggregate ratings:', err);
		}
	}
</script>

<div
	class="group hover:border-primary/20 relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl {className}"
>
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<!-- Song title and artist -->
			<h3
				class="font-title group-hover:text-primary truncate text-xl font-bold text-gray-900 transition-colors"
			>
				<a href="/songs/{song.id}">
					{song.title}
				</a>
			</h3>
			{#if song.artist}
				<p class="mt-0.5 truncate text-sm font-medium text-gray-500">{song.artist}</p>
			{/if}

			<!-- Category and Usage -->
			{#if song.expand?.category || (usageStatusInfo && usageStatusInfo.text)}
				<div class="mt-4 flex flex-wrap items-center gap-2">
					{#if song.expand?.category}
						<CategoryBadge category={song.expand.category} size="sm" />
					{/if}

					{#if usageStatusInfo && usageStatusInfo.text}
						<span
							class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase {usageStatusInfo.colors}"
						>
							{usageStatusInfo.text}
						</span>
					{/if}
				</div>
			{/if}

			<!-- Metadata Row -->
			{#if song.key_signature || song.tempo || formattedDuration}
				<div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
					{#if song.key_signature}
						<div class="flex items-center gap-1.5">
							<div class="bg-primary/40 h-2 w-2 rounded-full"></div>
							<span class="font-bold text-gray-700">{song.key_signature}</span>
						</div>
					{/if}

					{#if song.tempo}
						<div class="flex items-center gap-1.5 border-l border-gray-100 pl-4">
							<span class="font-medium"
								>{song.tempo} <span class="text-[10px] uppercase">BPM</span></span
							>
						</div>
					{/if}

					{#if formattedDuration}
						<div class="flex items-center gap-1.5 border-l border-gray-100 pl-4">
							<span class="font-medium">{formattedDuration}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Action Sidebar -->
		<div class="flex flex-shrink-0 flex-col items-end gap-3">
			<!-- Rating buttons at top -->
			<div class="flex items-center gap-2">
				<SongRatingButton {song} showAggregates={true} {ratingsLoading} {userRating} onRatingChange={handleRatingChange} />
			</div>

			{#if auth.canManageServices && isEditingService}
				<Button
					variant={isInCurrentService ? 'secondary' : 'primary'}
					size="sm"
					onclick={() => onAddToService(song)}
					disabled={isInCurrentService}
					class="rounded-xl px-4 py-2 {isInCurrentService
						? 'border-transparent bg-gray-100 text-gray-400'
						: 'shadow-primary/20 shadow-md'}"
				>
					{isInCurrentService ? 'Added' : 'Add'}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Labels and vote counts footer -->
	{#if (song.expand?.labels && song.expand.labels.length > 0) || (aggregates && aggregates.totalRatings > 0)}
		<div class="mt-3 flex flex-wrap gap-2 items-center">
			{#if song.expand?.labels && song.expand.labels.length > 0}
				{#each song.expand.labels as label (label.id)}
					{#if onThemeClick}
						<button
							class="hover:opacity-80 transition-opacity cursor-pointer"
							onclick={() => onThemeClick(label.id)}
							type="button"
						>
							<LabelBadge {label} size="sm" />
						</button>
					{:else}
						<LabelBadge {label} size="sm" />
					{/if}
				{/each}
			{/if}

			<!-- Vote counts pill -->
			{#if aggregates && aggregates.totalRatings > 0}
				<span class="inline-flex items-center divide-x divide-gray-300 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
					{#if aggregates.thumbsUp > 0}
						<span class="pr-1.5" title="{aggregates.thumbsUp} thumbs up">👍 {aggregates.thumbsUp}</span>
					{/if}
					{#if aggregates.thumbsDown > 0}
						<span class="px-1.5" title="{aggregates.thumbsDown} thumbs down">👎 {aggregates.thumbsDown}</span>
					{/if}
					{#if aggregates.difficultCount > 0}
						<span class="pl-1.5" title="{aggregates.difficultCount} marked as complex">⚠️ {aggregates.difficultCount}</span>
					{/if}
				</span>
			{/if}

			<!-- Difficult indicator -->
			{#if aggregates && aggregates.difficultCount > 2}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
					title="{aggregates.difficultCount} people marked this as difficult"
				>
					⚠️ Complex
				</span>
			{/if}
		</div>
	{/if}
</div>
