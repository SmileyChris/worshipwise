<script lang="ts">
	import { onMount } from 'svelte';
	import type { Song, SongRatingValue, AggregateRatings } from '$lib/types/song';
	import { createRatingsAPI } from '$lib/api/ratings';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		song: Song;
		showAggregates?: boolean;
		onRatingChange?: (rating: SongRatingValue | null) => void;
		ratingsLoading?: boolean;
	}

	let { song, showAggregates = true, onRatingChange, ratingsLoading = false }: Props = $props();

	const auth = getAuthStore();
	const ratingsAPI = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createRatingsAPI(ctx, ctx.pb);
	});

	let currentRating = $state<SongRatingValue | null>(null);
	let isDifficult = $state(false);
	let loading = $state(false);
	let saving = $state(false);

	// Load user's rating
	async function loadRatings() {
		loading = true;
		try {
			const userRating = await ratingsAPI.getUserRating(song.id);
			if (userRating) {
				currentRating = userRating.rating;
				isDifficult = userRating.is_difficult || false;
			}
		} catch (error) {
			console.error('Failed to load ratings:', error);
		} finally {
			loading = false;
		}
	}

	// Handle rating change
	async function handleRatingChange(newRating: SongRatingValue) {
		if (saving) return;

		saving = true;
		try {
			// Toggle rating if clicking the same one
			if (currentRating === newRating) {
				await ratingsAPI.deleteRating(song.id);
				currentRating = null;
				onRatingChange?.(null);
			} else {
				await ratingsAPI.setRating(song.id, {
					song_id: song.id,
					rating: newRating,
					is_difficult: isDifficult
				});
				currentRating = newRating;
				onRatingChange?.(newRating);
			}
		} catch (error) {
			console.error('Failed to update rating:', error);
		} finally {
			saving = false;
		}
	}

	// Handle difficulty toggle
	async function handleDifficultyToggle() {
		if (saving || !currentRating) return;

		const newValue = !isDifficult;
		saving = true;
		try {
			await ratingsAPI.setRating(song.id, {
				song_id: song.id,
				rating: currentRating,
				is_difficult: newValue
			});
			isDifficult = newValue;
			// Notify parent that rating changed (difficulty affects aggregates)
			onRatingChange?.(currentRating);
		} catch (error) {
			console.error('Failed to update difficulty:', error);
		} finally {
			saving = false;
		}
	}

	// Watch for loading state change or initial mount
	$effect(() => {
		if (!ratingsLoading) {
			loadRatings();
		}
	});
</script>

<div class="song-rating-container" tabindex="0">
	<div class="rating-buttons">
		<!-- Show current vote or placeholder -->
		{#if currentRating === 'thumbs_up'}
			<button
				class="rating-btn current-vote"
				disabled={saving}
				onclick={() => handleRatingChange('thumbs_up')}
				title="You like this song"
			>
				{#if isDifficult}<span class="difficulty-indicator">⚠️</span>{/if}👍
			</button>
		{:else if currentRating === 'neutral'}
			<button
				class="rating-btn current-vote"
				disabled={saving}
				onclick={() => handleRatingChange('neutral')}
				title="You rated this neutral"
			>
				{#if isDifficult}<span class="difficulty-indicator">⚠️</span>{/if}😐
			</button>
		{:else if currentRating === 'thumbs_down'}
			<button
				class="rating-btn current-vote"
				disabled={saving}
				onclick={() => handleRatingChange('thumbs_down')}
				title="You would not use this song"
			>
				{#if isDifficult}<span class="difficulty-indicator">⚠️</span>{/if}👎
			</button>
		{:else}
			<!-- No vote - show faded thumbs up as trigger -->
			<button
				class="rating-btn placeholder"
				disabled={saving}
				title="Vote on this song"
			>
				👍
			</button>
		{/if}

		<!-- Expanded options (shown on hover) - expands to the left -->
		<div class="expanded-options">
			{#if currentRating}
				<button
					class="rating-btn difficulty-btn"
					class:active={isDifficult}
					class:faded={!isDifficult}
					disabled={saving}
					onclick={handleDifficultyToggle}
					title={isDifficult ? 'Marked as complex' : 'Mark as complex'}
				>
					⚠️
				</button>
				<div class="separator"></div>
			{/if}

			<button
				class="rating-btn"
				class:active={currentRating === 'thumbs_up'}
				class:faded={currentRating && currentRating !== 'thumbs_up'}
				disabled={saving}
				onclick={() => handleRatingChange('thumbs_up')}
				title="I like this song"
			>
				👍
			</button>

			<button
				class="rating-btn"
				class:active={currentRating === 'neutral'}
				class:faded={currentRating && currentRating !== 'neutral'}
				disabled={saving}
				onclick={() => handleRatingChange('neutral')}
				title="Neutral"
			>
				😐
			</button>

			<button
				class="rating-btn"
				class:active={currentRating === 'thumbs_down'}
				class:faded={currentRating && currentRating !== 'thumbs_down'}
				disabled={saving}
				onclick={() => handleRatingChange('thumbs_down')}
				title="I would not use this song"
			>
				👎
			</button>
		</div>
	</div>
</div>

<style>
	.song-rating-container {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.rating-buttons {
		position: relative;
		display: flex;
		gap: 0.25rem;
	}

	.rating-btn {
		background: transparent;
		border: 1px solid var(--border-subtle);
		border-radius: 0.375rem;
		padding: 0.375rem 0.5rem;
		font-size: 1.125rem;
		cursor: pointer;
		transition: all 0.2s ease;
		opacity: 0.6;
	}

	.rating-btn:hover:not(:disabled) {
		opacity: 1;
		border-color: var(--border);
		transform: scale(1.05);
	}

	.rating-btn.active {
		opacity: 1;
		background-color: var(--bg-secondary);
		border-color: var(--primary);
	}

	.rating-btn.faded {
		opacity: 0.3;
	}

	.rating-btn.faded:hover:not(:disabled) {
		opacity: 0.7;
	}

	.rating-btn:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	/* Current vote display */
	.rating-btn.current-vote {
		opacity: 1;
		background-color: var(--bg-secondary);
		border-color: var(--primary);
	}

	/* Placeholder state (no vote) */
	.rating-btn.placeholder {
		opacity: 0.25;
	}

	.rating-btn.placeholder:hover:not(:disabled) {
		opacity: 0.5;
	}

	/* Expanded options - hidden by default */
	.expanded-options {
		position: absolute;
		right: 0;
		top: 0;
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		pointer-events: none;
		background: white;
		padding: 0.125rem;
		border-radius: 0.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 10;
		transition: opacity 0.2s ease;
	}

	/* Show expanded options on hover or focus */
	.song-rating-container:hover .expanded-options,
	.song-rating-container:focus-within .expanded-options {
		opacity: 1;
		pointer-events: auto;
	}

	/* Current vote fades and shifts to align with expanded position */
	.current-vote,
	.placeholder {
		transition: opacity 0.3s ease, transform 0.3s ease;
	}

	.song-rating-container:hover .current-vote,
	.song-rating-container:focus-within .current-vote,
	.song-rating-container:hover .placeholder,
	.song-rating-container:focus-within .placeholder {
		opacity: 0;
		transform: translateX(-5px);
		pointer-events: none;
	}

	.separator {
		width: 1px;
		height: 1.5rem;
		background-color: var(--border-subtle);
		opacity: 0.5;
		margin: 0 0.25rem;
	}

	.difficulty-btn {
		margin-left: 0.125rem;
	}

	.difficulty-indicator {
		font-size: 0.65rem;
		margin-right: 0.125rem;
		opacity: 0.8;
	}
</style>
