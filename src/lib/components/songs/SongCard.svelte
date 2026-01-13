<script lang="ts">
	import type { Song, SongRating, AggregateRatings } from '$lib/types/song';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CategoryBadge from '$lib/components/ui/CategoryBadge.svelte';
	import LabelBadge from '$lib/components/ui/LabelBadge.svelte';
	import SongRatingButton from './SongRatingButton.svelte';

	interface Props {
		song: Song;
		showUsageIndicator?: boolean;
		showActions?: boolean;
		onEdit?: (song: Song) => void;
		onAddToService?: (song: Song) => void;
		isInCurrentService?: boolean;
		isEditingService?: boolean;
		ratingsLoading?: boolean;
		class?: string;
	}

	const auth = getAuthStore();

	let {
		song,
		showUsageIndicator = true,
		showActions = true,
		onEdit = () => {},
		onAddToService = () => {},
		isInCurrentService = false,
		isEditingService = false,
		ratingsLoading = false,
		class: className = ''
	}: Props = $props();

	// Format duration from seconds to minutes:seconds
	let formattedDuration = $derived.by(() => {
		if (!song.duration_seconds) return null;
		const minutes = Math.floor(song.duration_seconds / 60);
		const seconds = song.duration_seconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Usage status info based on actual usage data
	let usageStatusInfo = $derived.by(() => {
		if (!showUsageIndicator || !song.usageStatus) return null;

		const status = song.usageStatus;
		const daysSince = song.daysSinceLastUsed;

		switch (status) {
			case 'recent':
				return {
					status: 'red',
					colors: 'bg-red-100 text-red-800',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Recently Used'
				};
			case 'caution':
				return {
					status: 'yellow',
					colors: 'bg-yellow-100 text-yellow-800',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Used Recently'
				};
			case 'available':
				return {
					status: 'green',
					colors: 'bg-green-100 text-green-800',
					text: 'Available'
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
</script>

<div
	class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl {className}"
>
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<!-- Song title and artist -->
			<h3 class="font-title truncate text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">
				<a href="/songs/{song.id}">
					{song.title}
				</a>
			</h3>
			{#if song.artist}
				<p class="truncate text-sm font-medium text-gray-500 mt-0.5">{song.artist}</p>
			{/if}

			<!-- Category and Usage -->
			<div class="mt-4 flex flex-wrap items-center gap-2">
				{#if song.expand?.category}
					<CategoryBadge category={song.expand.category} size="sm" />
				{/if}

				{#if usageStatusInfo && usageStatusInfo.text}
					<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {usageStatusInfo.colors}">
						{usageStatusInfo.text}
					</span>
				{/if}
			</div>

			<!-- Metadata Row -->
			<div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-400">
				{#if song.key_signature}
					<div class="flex items-center gap-1.5">
						<div class="w-2 h-2 rounded-full bg-primary/40"></div>
						<span class="font-bold text-gray-700">{song.key_signature}</span>
					</div>
				{/if}

				{#if song.tempo}
					<div class="flex items-center gap-1.5 border-l border-gray-100 pl-4">
						<span class="font-medium">{song.tempo} <span class="text-[10px] uppercase">BPM</span></span>
					</div>
				{/if}

				{#if formattedDuration}
					<div class="flex items-center gap-1.5 border-l border-gray-100 pl-4">
						<span class="font-medium">{formattedDuration}</span>
					</div>
				{/if}
			</div>

			<!-- Rating -->
			<div class="mt-3 pt-3 border-t border-gray-50">
				<SongRatingButton {song} showAggregates={true} />
			</div>
		</div>

		<!-- Action Sidebar -->
		<div class="flex flex-shrink-0 flex-col items-end gap-3">
			<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				{#if canEdit}
					<button
						onclick={() => onEdit(song)}
						class="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
						aria-label="Edit Song"
						title="Edit Song"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
				{/if}
			</div>

			{#if auth.canManageServices && isEditingService}
				<Button
					variant={isInCurrentService ? 'secondary' : 'primary'}
					size="sm"
					onclick={() => onAddToService(song)}
					disabled={isInCurrentService}
					class="rounded-xl px-4 py-2 {isInCurrentService ? 'bg-gray-100 text-gray-400 border-transparent' : 'shadow-md shadow-primary/20'}"
				>
					{isInCurrentService ? 'Added' : 'Add'}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Labels footer if present -->
	{#if song.expand?.labels && song.expand.labels.length > 0}
		<div class="mt-3 flex flex-wrap gap-1">
			{#each song.expand.labels as label (label.id)}
				<LabelBadge {label} size="sm" />
			{/each}
		</div>
	{/if}
</div>
