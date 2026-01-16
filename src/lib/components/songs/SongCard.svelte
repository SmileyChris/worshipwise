<script lang="ts">
	import type { Song, SongRating, SongRatingValue, AggregateRatings } from '$lib/types/song';
	import { getAuthStore, getSongsStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import LabelBadge from '$lib/components/ui/LabelBadge.svelte';
	import SongRatingButton from './SongRatingButton.svelte';
	import { Plus } from 'lucide-svelte';

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
	const songsStore = getSongsStore();

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
		// Use daysSinceLastSung for historical context text, falling back to daysSinceLastUsed if that's all we have (e.g. old cached data)
		const daysSince = song.daysSinceLastSung ?? song.daysSinceLastUsed;

		// Helper to convert days to weeks
		const weeksAgo =
			daysSince !== undefined && daysSince < Infinity ? Math.floor(daysSince / 7) : null;

		switch (status) {
			case 'upcoming':
				return {
					status: 'blue',
					colors: 'bg-blue-100 text-blue-800',
					text: 'Planned',
					secondaryText: null,
					secondaryTextColors: null
				};
			case 'recent':
				return {
					status: 'red',
					colors: 'bg-red-100 text-red-800',
					text: weeksAgo === 0 ? 'Used this week' : 'Used last week',
					secondaryText: null,
					secondaryTextColors: null
				};
			case 'caution':
				return {
					status: 'amber',
					colors: 'bg-amber-100 text-amber-800',
					text: weeksAgo ? `Used ${weeksAgo} weeks ago` : 'Recently used',
					secondaryText: null,
					secondaryTextColors: null
				};
			case 'available':
				return {
					status: 'green',
					colors: 'bg-green-100 text-green-800',
					text: 'Available',
					secondaryText:
						weeksAgo && weeksAgo >= 4
							? `Sung ${Math.floor(weeksAgo / 4)} month${Math.floor(weeksAgo / 4) === 1 ? '' : 's'} ago`
							: weeksAgo
								? `Sung ${weeksAgo} weeks ago`
								: null,
					secondaryTextColors: 'text-amber-600'
				};
			case 'stale':
				return {
					status: 'gray',
					colors: 'bg-gray-100 text-gray-600',
					text: 'Not used recently',
					secondaryText: null,
					secondaryTextColors: null
				};
			default:
				return {
					status: null,
					colors: 'bg-gray-100 text-gray-800',
					text: '',
					secondaryText: null,
					secondaryTextColors: null
				};
		}
	});

	// Check if user can edit this song
	let canEdit = $derived(auth.canManageSongs || song.created_by === auth.user?.id);

	// Use aggregate ratings from song object (from enriched view)
	// If song doesn't have aggregates (old data), initialize to zeros
	const aggregates = $derived<AggregateRatings>({
		thumbsUp: song.thumbs_up ?? 0,
		thumbsDown: song.thumbs_down ?? 0,
		neutral: song.neutral ?? 0,
		totalRatings: song.total_ratings ?? 0,
		difficultCount: song.difficult_count ?? 0
	});

	const showAggregates = $derived(
		aggregates.thumbsUp > 0 || aggregates.thumbsDown > 0 || aggregates.difficultCount > 0
	);
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

			{#if usageStatusInfo && usageStatusInfo.text}
				<div class="mt-4 flex flex-wrap items-center gap-2">
					<span
						class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase {usageStatusInfo.colors}"
					>
						{usageStatusInfo.text}
					</span>
					{#if usageStatusInfo.secondaryText}
						<span
							class="ml-2 text-xs font-medium {usageStatusInfo.secondaryTextColors ||
								'text-gray-500'}"
						>
							{usageStatusInfo.secondaryText}
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
				<SongRatingButton {song} showAggregates={true} {ratingsLoading} {userRating} />
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
	{#if (song.expand?.labels && song.expand.labels.length > 0) || showAggregates || (isEditingService && auth.canManageServices)}
		<div class="mt-3 flex flex-wrap items-center gap-2">
			{#if isEditingService && auth.canManageServices}
				<button
					onclick={(e) => {
						e.stopPropagation();
						onAddToService(song);
					}}
					disabled={isInCurrentService}
					class="bg-primary/10 text-primary hover:bg-primary/20 mr-1 rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
					title={isInCurrentService ? 'Already in service' : 'Add to service'}
				>
					<Plus class="h-3 w-3" />
				</button>
			{/if}

			{#if song.expand?.labels && song.expand.labels.length > 0}
				{#each song.expand.labels as label (label.id)}
					{#if onThemeClick}
						<button
							class="cursor-pointer transition-opacity hover:opacity-80"
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
			{#if showAggregates}
				<span
					class="inline-flex items-center divide-x divide-gray-300 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
				>
					{#if aggregates.thumbsUp > 0}
						<span class="pr-1.5" title="{aggregates.thumbsUp} thumbs up"
							>👍 {aggregates.thumbsUp}</span
						>
					{/if}
					{#if aggregates.thumbsDown > 0}
						<span class="px-1.5" title="{aggregates.thumbsDown} thumbs down"
							>👎 {aggregates.thumbsDown}</span
						>
					{/if}
					{#if aggregates.difficultCount > 0}
						<span class="pl-1.5" title="{aggregates.difficultCount} marked as complex"
							>⚠️ {aggregates.difficultCount}</span
						>
					{/if}
				</span>
			{/if}
		</div>
	{/if}
</div>
