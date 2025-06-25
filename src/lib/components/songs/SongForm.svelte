<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Song, CreateSongData, UpdateSongData, LyricsAnalysis, Label } from '$lib/types/song';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import CategorySelect from '$lib/components/ui/CategorySelect.svelte';
	import LabelSelector from '$lib/components/ui/LabelSelector.svelte';
	import LyricsAnalyzer from './LyricsAnalyzer.svelte';

	interface Props {
		song?: Song | null;
		loading?: boolean;
		error?: string | null;
		oncancel?: () => void;
		ondelete?: (song: Song) => void;
	}

	let {
		song = null,
		loading = false,
		error = null,
		oncancel = () => {},
		ondelete = () => {}
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		submit: CreateSongData | { id: string; data: UpdateSongData };
		delete: Song;
		cancel: void;
	}>();

	// Form state
	let title = $state(song?.title || '');
	let artist = $state(song?.artist || '');
	let category = $state(song?.category || '');
	let selectedLabelIds = $state(song?.labels || []);
	let keySignature = $state(song?.key_signature || '');
	let tempo = $state(song?.tempo?.toString() || '');
	let durationMinutes = $state('');
	let durationSeconds = $state('');
	let ccliNumber = $state(song?.ccli_number || '');
	let copyrightInfo = $state(song?.copyright_info || '');
	let lyrics = $state(song?.lyrics || '');
	let notes = $state(song?.notes || '');
	let tagsInput = $state('');
	let lyricsAnalysis = $state<LyricsAnalysis | null>(song?.lyrics_analysis || null);

	// File inputs
	let chordChart: File | null = null;
	let audioFile: File | null = null;
	let sheetMusic: FileList | null = null;

	// Initialize form when song changes
	$effect(() => {
		if (song) {
			title = song.title;
			artist = song.artist || '';
			category = song.category || '';
			selectedLabelIds = song.labels || [];
			keySignature = song.key_signature || '';
			tempo = song.tempo?.toString() || '';
			ccliNumber = song.ccli_number || '';
			copyrightInfo = song.copyright_info || '';
			lyrics = song.lyrics || '';
			notes = song.notes || '';
			tagsInput = song.tags?.join(', ') || '';
			lyricsAnalysis = song.lyrics_analysis || null;

			// Handle duration
			if (song.duration_seconds) {
				durationMinutes = Math.floor(song.duration_seconds / 60).toString();
				durationSeconds = (song.duration_seconds % 60).toString();
			}
		}
	});

	// Key signature options
	const keyOptions = [
		{ value: 'C', label: 'C' },
		{ value: 'C#', label: 'C#' },
		{ value: 'Db', label: 'Db' },
		{ value: 'D', label: 'D' },
		{ value: 'D#', label: 'D#' },
		{ value: 'Eb', label: 'Eb' },
		{ value: 'E', label: 'E' },
		{ value: 'F', label: 'F' },
		{ value: 'F#', label: 'F#' },
		{ value: 'Gb', label: 'Gb' },
		{ value: 'G', label: 'G' },
		{ value: 'G#', label: 'G#' },
		{ value: 'Ab', label: 'Ab' },
		{ value: 'A', label: 'A' },
		{ value: 'A#', label: 'A#' },
		{ value: 'Bb', label: 'Bb' },
		{ value: 'B', label: 'B' },
		{ value: 'Cm', label: 'Cm' },
		{ value: 'C#m', label: 'C#m' },
		{ value: 'Dm', label: 'Dm' },
		{ value: 'D#m', label: 'D#m' },
		{ value: 'Ebm', label: 'Ebm' },
		{ value: 'Em', label: 'Em' },
		{ value: 'Fm', label: 'Fm' },
		{ value: 'F#m', label: 'F#m' },
		{ value: 'Gm', label: 'Gm' },
		{ value: 'G#m', label: 'G#m' },
		{ value: 'Am', label: 'Am' },
		{ value: 'A#m', label: 'A#m' },
		{ value: 'Bbm', label: 'Bbm' },
		{ value: 'Bm', label: 'Bm' }
	];

	// Validation functions
	function validateTitle(value: string): string {
		if (!value.trim()) return 'Title is required';
		if (value.length > 200) return 'Title must be less than 200 characters';
		return '';
	}

	function validateCategory(value: string): string {
		if (!value.trim()) return 'Category is required';
		return '';
	}

	function validateTempo(value: string): string {
		if (!value) return '';
		const num = parseInt(value);
		if (isNaN(num)) return 'Tempo must be a number';
		if (num < 60 || num > 200) return 'Tempo must be between 60 and 200 BPM';
		return '';
	}

	function validateDuration(): string {
		if (!durationMinutes && !durationSeconds) return '';

		const minutes = parseInt(durationMinutes) || 0;
		const seconds = parseInt(durationSeconds) || 0;

		if (minutes < 0 || seconds < 0 || seconds >= 60) {
			return 'Please enter a valid duration';
		}

		const totalSeconds = minutes * 60 + seconds;
		if (totalSeconds < 30 || totalSeconds > 1800) {
			return 'Duration must be between 30 seconds and 30 minutes';
		}

		return '';
	}

	// Validation state - computed from reactive inputs
	let titleError = $derived(validateTitle(title));
	let categoryError = $derived(validateCategory(category));
	let tempoError = $derived(validateTempo(tempo));
	let durationError = $derived(validateDuration());

	// Computed values
	let isEditing = $derived(!!song);
	let isValid = $derived(
		title.trim().length > 0 &&
			category.trim().length > 0 &&
			!titleError &&
			!categoryError &&
			!tempoError &&
			!durationError
	);
	let canDelete = $derived(isEditing && auth.isAdmin);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);

	// File input handlers
	function handleChordChartChange(event: Event) {
		const target = event.target as HTMLInputElement;
		chordChart = target.files?.[0] || null;
	}

	function handleAudioFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		audioFile = target.files?.[0] || null;
	}

	function handleSheetMusicChange(event: Event) {
		const target = event.target as HTMLInputElement;
		sheetMusic = target.files;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();

		// Final validation
		const finalTitleError = validateTitle(title);
		const finalCategoryError = validateCategory(category);
		const finalTempoError = validateTempo(tempo);
		const finalDurationError = validateDuration();

		if (finalTitleError || finalCategoryError || finalTempoError || finalDurationError) {
			return;
		}

		// Calculate duration in seconds
		let durationInSeconds: number | undefined;
		if (durationMinutes || durationSeconds) {
			const minutes = parseInt(durationMinutes) || 0;
			const seconds = parseInt(durationSeconds) || 0;
			durationInSeconds = minutes * 60 + seconds;
		}

		// Parse tags
		const tags = tagsInput
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);

		// Prepare form data
		const formData: CreateSongData = {
			title: title.trim(),
			artist: artist.trim() || undefined,
			category: category.trim(),
			labels: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
			key_signature: keySignature || undefined,
			tempo: tempo ? parseInt(tempo) : undefined,
			duration_seconds: durationInSeconds,
			tags: tags.length > 0 ? tags : undefined,
			lyrics: lyrics.trim() || undefined,
			ccli_number: ccliNumber.trim() || undefined,
			copyright_info: copyrightInfo.trim() || undefined,
			notes: notes.trim() || undefined,
			chord_chart: chordChart || undefined,
			audio_file: audioFile || undefined,
			sheet_music: sheetMusic ? Array.from(sheetMusic) : undefined,
			lyrics_analysis: lyricsAnalysis || undefined
		};

		if (isEditing && song) {
			dispatch('submit', { id: song.id, data: formData as UpdateSongData });
		} else {
			dispatch('submit', formData);
		}
	}

	function handleCancel() {
		oncancel();
		dispatch('cancel');
	}

	function handleDeleteClick() {
		showDeleteConfirm = true;
	}

	function handleDeleteConfirm() {
		if (song) {
			showDeleteConfirm = false;
			ondelete(song);
			dispatch('delete', song);
		}
	}

	function handleDeleteCancel() {
		showDeleteConfirm = false;
	}

	function handleAnalysisComplete(analysis: LyricsAnalysis) {
		lyricsAnalysis = analysis;
		// If lyrics were found during analysis, update the lyrics field too
		if (!lyrics.trim() && analysis.title === title) {
			// Note: The LyricsAnalyzer component would need to be modified to also return the found lyrics
			// For now, we just store the analysis
		}
	}

	function handleLabelsCreated(labels: Label[]) {
		// Add the newly created label IDs to the selected labels
		const newLabelIds = labels.map(label => label.id);
		selectedLabelIds = [...selectedLabelIds, ...newLabelIds];
		
		// The LabelSelector component should automatically update to show these new labels
		// since it fetches labels from the API
	}
</script>

<Card class="mx-auto max-w-2xl">
	<div class="mb-6">
		<h2 class="font-title text-xl font-bold text-gray-900">
			{isEditing ? 'Edit Song' : 'Add New Song'}
		</h2>
		<p class="text-sm text-gray-600">
			{isEditing ? 'Update song information' : 'Add a new song to your library'}
		</p>
	</div>

	{#if error}
		<div class="mb-4 rounded-md bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-4">
		<!-- Basic Information -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Input
				label="Song Title"
				name="title"
				bind:value={title}
				placeholder="Enter song title"
				required
				error={titleError}
				data-testid="title-input"
			/>

			<Input
				label="Artist/Author"
				name="artist"
				bind:value={artist}
				placeholder="Enter artist or author name"
				data-testid="artist-input"
			/>
		</div>

		<!-- Category and Labels -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<label for="song-category" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
					Category <span class="text-red-500">*</span>
				</label>
				<CategorySelect id="song-category" bind:value={category} required />
				{#if categoryError}
					<p class="mt-1 text-sm text-red-600">{categoryError}</p>
				{/if}
			</div>

			<div>
				<label for="song-labels" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
					Labels (optional)
				</label>
				<LabelSelector id="song-labels" bind:selectedLabelIds />
			</div>
		</div>

		<!-- Musical Information -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<Select
				label="Key Signature"
				name="key_signature"
				bind:value={keySignature}
				options={keyOptions}
				placeholder="Select key"
				data-testid="key-select"
			/>

			<Input
				label="Tempo (BPM)"
				name="tempo"
				type="number"
				bind:value={tempo}
				placeholder="120"
				error={tempoError}
				data-testid="tempo-input"
			/>

			<div>
				<label
					for="duration_minutes"
					class="mb-1 block text-sm leading-6 font-medium text-gray-900"
				>
					Duration
				</label>
				<div class="flex gap-2">
					<Input
						name="duration_minutes"
						type="number"
						bind:value={durationMinutes}
						placeholder="3"
						class="flex-1"
					/>
					<span class="flex items-center text-gray-500">:</span>
					<Input
						name="duration_seconds"
						type="number"
						bind:value={durationSeconds}
						placeholder="30"
						class="flex-1"
					/>
				</div>
				{#if durationError}
					<p class="mt-1 text-sm text-red-600">{durationError}</p>
				{/if}
			</div>
		</div>

		<!-- Tags -->
		<Input
			label="Tags (optional)"
			name="tags"
			bind:value={tagsInput}
			placeholder="worship, contemporary, fast (comma-separated)"
		/>

		<!-- Lyrics -->
		<div>
			<label for="lyrics" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
				Lyrics
			</label>
			<textarea
				id="lyrics"
				name="lyrics"
				bind:value={lyrics}
				rows="6"
				class="focus:ring-primary block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				placeholder="Enter song lyrics..."
			></textarea>
		</div>

		<!-- AI Lyrics Analysis -->
		<LyricsAnalyzer
			{title}
			{artist}
			{lyrics}
			onAnalysisComplete={handleAnalysisComplete}
			onLabelsCreated={handleLabelsCreated}
			disabled={loading}
		/>

		<!-- File Uploads -->
		<div class="space-y-4">
			<h3 class="text-sm font-medium text-gray-900">Attachments</h3>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label for="chord_chart" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
						Chord Chart
					</label>
					<input
						type="file"
						id="chord_chart"
						name="chord_chart"
						accept=".pdf,.jpg,.jpeg,.png"
						onchange={handleChordChartChange}
						class="file:bg-primary/10 file:text-primary hover:file:bg-primary/20 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
					/>
				</div>

				<div>
					<label for="audio_file" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
						Audio File
					</label>
					<input
						type="file"
						id="audio_file"
						name="audio_file"
						accept=".mp3,.wav,.m4a"
						onchange={handleAudioFileChange}
						class="file:bg-primary/10 file:text-primary hover:file:bg-primary/20 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
					/>
				</div>
			</div>

			<div>
				<label for="sheet_music" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
					Sheet Music (up to 3 files)
				</label>
				<input
					type="file"
					id="sheet_music"
					name="sheet_music"
					accept=".pdf,.jpg,.jpeg,.png"
					multiple
					onchange={handleSheetMusicChange}
					class="file:bg-primary/10 file:text-primary hover:file:bg-primary/20 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
				/>
			</div>
		</div>

		<!-- Copyright Information -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Input label="CCLI Number" name="ccli_number" bind:value={ccliNumber} placeholder="1234567" />

			<Input
				label="Copyright Info"
				name="copyright_info"
				bind:value={copyrightInfo}
				placeholder="© 2023 Publisher Name"
			/>
		</div>

		<!-- Notes -->
		<div>
			<label for="notes" class="mb-1 block text-sm leading-6 font-medium text-gray-900">
				Notes
			</label>
			<textarea
				id="notes"
				name="notes"
				bind:value={notes}
				rows="3"
				class="focus:ring-primary block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
				placeholder="Additional notes about this song..."
			></textarea>
		</div>

		<!-- Form Actions -->
		<div class="flex {canDelete ? 'justify-between' : 'justify-end'} gap-3 pt-4">
			{#if canDelete}
				<Button type="button" variant="danger" onclick={handleDeleteClick} disabled={loading}>
					Delete Song
				</Button>
			{/if}

			<div class="flex gap-3">
				<Button type="button" variant="secondary" onclick={handleCancel} disabled={loading}>
					Cancel
				</Button>

				<Button
					type="submit"
					variant="primary"
					{loading}
					disabled={!isValid || loading}
					data-testid="save-button"
				>
					{loading ? 'Saving...' : isEditing ? 'Update Song' : 'Add Song'}
				</Button>
			</div>
		</div>
	</form>
</Card>

<!-- Delete Confirmation Modal -->
<Modal open={showDeleteConfirm} title="Delete Song" size="sm" onclose={handleDeleteCancel}>
	{#if song}
		<div class="text-center">
			<div class="mb-4 text-6xl text-red-600">⚠️</div>
			<p class="mb-4 text-gray-900">
				Are you sure you want to delete "<strong>{song.title}</strong>"?
			</p>
			<p class="mb-6 text-sm text-gray-500">
				This action cannot be undone. The song will be permanently removed from your library.
			</p>
		</div>
	{/if}

	{#snippet footer()}
		<Button variant="secondary" onclick={handleDeleteCancel} disabled={loading}>Cancel</Button>

		<Button variant="danger" onclick={handleDeleteConfirm} {loading} disabled={loading}>
			{loading ? 'Deleting...' : 'Delete Song'}
		</Button>
	{/snippet}
</Modal>
