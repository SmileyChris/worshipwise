<script lang="ts">
	import type { Song } from '$lib/types/song';
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
	class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md {className}"
>
	<div class="flex items-start justify-between">
		<div class="min-w-0 flex-1">
			<!-- Song title and artist -->
			<h3 class="font-title truncate text-lg font-semibold">
				<a href="/songs/{song.id}" class="hover:text-primary text-gray-900 transition-colors">
					{song.title}
				</a>
			</h3>
			{#if song.artist}
				<p class="truncate text-sm text-gray-600">{song.artist}</p>
			{/if}

			<!-- Category and Labels -->
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{#if song.expand?.category}
					<CategoryBadge category={song.expand.category} size="sm" />
				{/if}

				{#if song.expand?.labels && song.expand.labels.length > 0}
					{#each song.expand.labels as label (label.id)}
						<LabelBadge {label} size="sm" />
					{/each}
				{/if}
			</div>

			<!-- Metadata badges -->
			<div class="mt-2 flex flex-wrap items-center gap-2">
				{#if song.key_signature}
					<Badge variant="primary">
						Key: {song.key_signature}
					</Badge>
				{/if}

				{#if song.tempo}
					<Badge variant="default">
						{song.tempo} BPM
					</Badge>
				{/if}

				{#if formattedDuration}
					<Badge variant="default">
						{formattedDuration}
					</Badge>
				{/if}

				{#if usageStatusInfo && usageStatusInfo.text}
					<Badge
						variant={usageStatusInfo.status === 'green'
							? 'success'
							: usageStatusInfo.status === 'yellow'
								? 'warning'
								: 'danger'}
					>
						{usageStatusInfo.text}
					</Badge>
				{/if}
			</div>

			<!-- Tags -->
			{#if song.tags && song.tags.length > 0}
				<div class="mt-2 flex flex-wrap gap-1">
					{#each song.tags as tag (tag)}
						<Badge variant="default" size="sm">
							{tag}
						</Badge>
					{/each}
				</div>
			{/if}

			<!-- Files indicators -->
			{#if song.chord_chart || song.audio_file || (song.sheet_music && song.sheet_music.length > 0)}
				<div class="mt-2 flex items-center gap-3 text-sm text-gray-500">
					{#if song.chord_chart}
						<span class="flex items-center gap-1">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							Chords
						</span>
					{/if}

					{#if song.audio_file}
						<span class="flex items-center gap-1">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
								/>
							</svg>
							Audio
						</span>
					{/if}

					{#if song.sheet_music && song.sheet_music.length > 0}
						<span class="flex items-center gap-1">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							Sheet Music ({song.sheet_music.length})
						</span>
					{/if}
				</div>
			{/if}

			<!-- CCLI info -->
			{#if song.ccli_number}
				<p class="mt-1 text-xs text-gray-400">CCLI: {song.ccli_number}</p>
			{/if}

			<!-- Retired status -->
			{#if song.is_retired}
				<div class="mt-2">
					<Badge variant="warning" size="sm">
						Retired {#if song.retired_reason === 'all_thumbs_down'}(75%+ leaders thumbs down){/if}
					</Badge>
				</div>
			{/if}

			<!-- Rating button -->
			<div class="mt-3">
				<SongRatingButton {song} showAggregates={true} />
			</div>
		</div>

		<!-- Actions -->
		{#if showActions}
			<div class="ml-4 flex flex-shrink-0 flex-col gap-2">
				<Button
					variant="ghost"
					size="sm"
					href="/songs/{song.id}"
					class="text-gray-600 hover:text-gray-800"
				>
					View Details
				</Button>

				{#if canEdit}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => onEdit(song)}
						class="text-gray-600 hover:text-gray-800"
					>
						Edit
					</Button>
				{/if}

				{#if auth.canManageServices}
					{#if isEditingService}
						<Button
							variant={isInCurrentService ? 'secondary' : 'primary'}
							size="sm"
							onclick={() => onAddToService(song)}
							disabled={isInCurrentService}
						>
							{isInCurrentService ? 'In Service' : 'Add to Service'}
						</Button>
					{:else}
						<Button variant="secondary" size="sm" onclick={() => onAddToService(song)}>
							Add to Service
						</Button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>
