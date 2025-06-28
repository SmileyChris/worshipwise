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
	}

	let { song, showAggregates = true, onRatingChange }: Props = $props();

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const ratingsAPI = createRatingsAPI(authContext, authContext.pb);

	let currentRating = $state<SongRatingValue | null>(null);
	let isDifficult = $state(false);
	let aggregates = $state<AggregateRatings | null>(null);
	let loading = $state(false);
	let saving = $state(false);

	// Load user's rating and aggregates
	async function loadRatings() {
		loading = true;
		try {
			// Load user's rating
			const userRating = await ratingsAPI.getUserRating(song.id);
			if (userRating) {
				currentRating = userRating.rating;
				isDifficult = userRating.is_difficult || false;
			}

			// Load aggregate ratings if needed
			if (showAggregates) {
				aggregates = await ratingsAPI.getAggregateRatings(song.id);
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

			// Reload aggregates
			if (showAggregates) {
				aggregates = await ratingsAPI.getAggregateRatings(song.id);
			}

			// Check if song should be auto-retired
			if (newRating === 'thumbs_down') {
				const shouldRetire = await ratingsAPI.shouldAutoRetire(song.id);
				if (shouldRetire) {
					// Trigger retire event
					window.dispatchEvent(new CustomEvent('song-auto-retire', { 
						detail: { songId: song.id } 
					}));
				}
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

		saving = true;
		try {
			isDifficult = !isDifficult;
			await ratingsAPI.setRating(song.id, {
				song_id: song.id,
				rating: currentRating,
				is_difficult: isDifficult
			});
		} catch (error) {
			console.error('Failed to update difficulty:', error);
			isDifficult = !isDifficult; // Revert
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		loadRatings();
	});
</script>

<div class="song-rating-container">
	<div class="rating-buttons">
		<button
			class="rating-btn"
			class:active={currentRating === 'thumbs_up'}
			disabled={saving}
			onclick={() => handleRatingChange('thumbs_up')}
			title="I like this song"
		>
			👍
		</button>
		
		<button
			class="rating-btn"
			class:active={currentRating === 'neutral'}
			disabled={saving}
			onclick={() => handleRatingChange('neutral')}
			title="Neutral"
		>
			😐
		</button>
		
		<button
			class="rating-btn"
			class:active={currentRating === 'thumbs_down'}
			disabled={saving}
			onclick={() => handleRatingChange('thumbs_down')}
			title="I would not use this song"
		>
			👎
		</button>
	</div>

	{#if currentRating}
		<label class="difficulty-toggle">
			<input
				type="checkbox"
				bind:checked={isDifficult}
				onchange={handleDifficultyToggle}
				disabled={saving}
			/>
			<span>Difficult</span>
		</label>
	{/if}

	{#if showAggregates && aggregates && aggregates.totalRatings > 0}
		<div class="aggregate-ratings">
			<span class="rating-count" title="{aggregates.thumbsUp} people like this">
				👍 {aggregates.thumbsUp}
			</span>
			<span class="rating-count" title="{aggregates.thumbsDown} people would not use this">
				👎 {aggregates.thumbsDown}
			</span>
			{#if aggregates.difficultCount > 0}
				<span class="difficulty-count" title="{aggregates.difficultCount} people find this difficult">
					🎵 {aggregates.difficultCount}
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.song-rating-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.rating-buttons {
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

	.rating-btn:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.difficulty-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.difficulty-toggle input[type="checkbox"] {
		cursor: pointer;
	}

	.aggregate-ratings {
		display: flex;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.rating-count,
	.difficulty-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	@media (max-width: 640px) {
		.song-rating-container {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>