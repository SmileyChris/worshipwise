<script lang="ts">
	import type { Song } from '$lib/types/song';
	import { createSuggestionsAPI } from '$lib/api/suggestions';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getSongsStore } from '$lib/context/stores.svelte';

	interface Props {
		open: boolean;
		song?: Song | null;
		onclose: () => void;
		onsuccess?: () => void;
	}

	let { open = $bindable(), song = null, onclose, onsuccess }: Props = $props();

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const suggestionsAPI = createSuggestionsAPI(authContext, authContext.pb);
	const songsStore = getSongsStore();

	let selectedSongId = $state(song?.id || '');
	let notes = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Get all songs for selection
	let allSongs = $derived(songsStore.songs);

	// Song options for dropdown
	let songOptions = $derived.by(() => 
		allSongs.map(s => ({
			value: s.id,
			label: `${s.title}${s.artist ? ` - ${s.artist}` : ''}`
		}))
	);

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			selectedSongId = song?.id || '';
			notes = '';
			error = null;
		}
	});

	async function handleSubmit() {
		if (!selectedSongId) {
			error = 'Please select a song';
			return;
		}

		loading = true;
		error = null;

		try {
			await suggestionsAPI.createSuggestion({
				song_id: selectedSongId,
				notes
			});

			onsuccess?.();
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create suggestion';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		onclose();
	}
</script>

<Modal {open} title="Suggest a Song" onclose={handleCancel}>
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
		{#if !song}
			<div>
				<label for="song-select" class="block text-sm font-medium text-gray-700 mb-1">
					Select Song
				</label>
				<Select
					id="song-select"
					bind:value={selectedSongId}
					options={songOptions}
					placeholder="Choose a song..."
					required
				/>
			</div>
		{:else}
			<div class="rounded-lg bg-gray-50 p-3">
				<p class="text-sm font-medium text-gray-900">
					{song.title}
					{#if song.artist}
						<span class="font-normal text-gray-600">by {song.artist}</span>
					{/if}
				</p>
			</div>
		{/if}

		<div>
			<label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
				Notes (Optional)
			</label>
			<TextArea
				id="notes"
				bind:value={notes}
				placeholder="Why do you think this song would be good for our church?"
				rows="4"
				maxlength="1000"
			/>
			<p class="mt-1 text-xs text-gray-500">
				{notes.length}/1000 characters
			</p>
		</div>

		{#if error}
			<div class="rounded-md bg-red-50 p-3">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		<div class="flex items-center justify-end gap-3 pt-2">
			<Button
				type="button"
				variant="ghost"
				onclick={handleCancel}
				disabled={loading}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				variant="primary"
				disabled={loading || !selectedSongId}
			>
				{loading ? 'Suggesting...' : 'Suggest Song'}
			</Button>
		</div>
	</form>
</Modal>