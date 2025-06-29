<script lang="ts">
	import type { Song } from '$lib/types/song';
	import type { Service } from '$lib/types/service';
	import type { SongSuggestion, AIPromptOptions } from '$lib/api/ai-suggestions';
	import { createAISuggestionsAPI } from '$lib/api/ai-suggestions';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { onMount } from 'svelte';

	interface Props {
		service: Service;
		availableSongs: Song[];
		currentSongs: Song[];
		onAddSong: (song: Song) => void;
	}

	let { service, availableSongs, currentSongs, onAddSong }: Props = $props();

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const aiApi = createAISuggestionsAPI(authContext, authContext.pb);

	let suggestions = $state<SongSuggestion[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showOptions = $state(false);

	// AI prompt options
	let theme = $state(service.theme || '');
	let mood = $state<'upbeat' | 'reflective' | 'celebratory' | 'contemplative' | 'worshipful' | ''>('');
	let liturgicalSeason = $state<string>('');
	let excludeRecentDays = $state(30);

	async function generateSuggestions() {
		loading = true;
		error = null;
		
		try {
			const options: AIPromptOptions = {
				theme,
				mood: mood || undefined,
				liturgicalSeason,
				excludeRecentDays,
				maxSuggestions: 5
			};

			suggestions = await aiApi.getSongSuggestions(service, availableSongs, options);
			
			if (suggestions.length === 0) {
				error = 'No suitable songs found. Try adjusting your criteria.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate suggestions';
		} finally {
			loading = false;
		}
	}

	async function getComplementarySuggestions() {
		if (currentSongs.length === 0) {
			error = 'Add some songs to the service first to get complementary suggestions.';
			return;
		}

		loading = true;
		error = null;

		try {
			suggestions = await aiApi.getComplementarySongs(currentSongs, availableSongs);
			
			if (suggestions.length === 0) {
				error = 'No complementary songs found.';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to get complementary songs';
		} finally {
			loading = false;
		}
	}

	function getConfidenceColor(confidence: number): string {
		if (confidence >= 0.8) return 'text-green-600';
		if (confidence >= 0.5) return 'text-yellow-600';
		return 'text-gray-600';
	}

	function getConfidenceText(confidence: number): string {
		if (confidence >= 0.8) return 'High match';
		if (confidence >= 0.5) return 'Good match';
		return 'Possible match';
	}

	// Auto-generate suggestions when component mounts
	onMount(() => {
		if (availableSongs.length > 0) {
			generateSuggestions();
		}
	});
</script>

<Card class="h-full flex flex-col">
	<div class="p-4 border-b border-gray-200">
		<div class="flex items-center justify-between mb-2">
			<h3 class="font-title text-lg font-medium text-gray-900">AI Song Suggestions</h3>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (showOptions = !showOptions)}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
				</svg>
			</Button>
		</div>

		{#if showOptions}
			<div class="space-y-3 pt-3 border-t border-gray-200">
				<div>
					<label for="theme" class="block text-sm font-medium text-gray-700">Theme</label>
					<input
						id="theme"
						type="text"
						bind:value={theme}
						placeholder="e.g., Grace, Hope, Thanksgiving"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
					/>
				</div>

				<div>
					<label for="mood" class="block text-sm font-medium text-gray-700">Mood</label>
					<select
						id="mood"
						bind:value={mood}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
					>
						<option value="">Any mood</option>
						<option value="upbeat">Upbeat</option>
						<option value="reflective">Reflective</option>
						<option value="celebratory">Celebratory</option>
						<option value="contemplative">Contemplative</option>
						<option value="worshipful">Worshipful</option>
					</select>
				</div>

				<div>
					<label for="season" class="block text-sm font-medium text-gray-700">Liturgical Season</label>
					<select
						id="season"
						bind:value={liturgicalSeason}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
					>
						<option value="">Any season</option>
						<option value="advent">Advent</option>
						<option value="christmas">Christmas</option>
						<option value="epiphany">Epiphany</option>
						<option value="lent">Lent</option>
						<option value="easter">Easter</option>
						<option value="pentecost">Pentecost</option>
						<option value="ordinary">Ordinary Time</option>
					</select>
				</div>

				<div>
					<label for="exclude-recent" class="block text-sm font-medium text-gray-700">
						Exclude songs used in last
					</label>
					<div class="mt-1 flex items-center gap-2">
						<input
							id="exclude-recent"
							type="number"
							bind:value={excludeRecentDays}
							min="0"
							max="365"
							class="block w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
						/>
						<span class="text-sm text-gray-500">days</span>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex gap-2 mt-3">
			<Button
				variant="primary"
				size="sm"
				onclick={generateSuggestions}
				disabled={loading}
				class="flex-1"
			>
				{#if loading}
					<div class="border-white mx-auto h-4 w-4 animate-spin rounded-full border-b-2"></div>
				{:else}
					<svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Generate Suggestions
				{/if}
			</Button>
			<Button
				variant="secondary"
				size="sm"
				onclick={getComplementarySuggestions}
				disabled={loading || currentSongs.length === 0}
				title="Get songs that complement your current selection"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
				</svg>
			</Button>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if error}
			<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
				{error}
			</div>
		{:else if suggestions.length > 0}
			<div class="space-y-3">
				{#each suggestions as suggestion (suggestion.song.id)}
					<div class="rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md transition-shadow">
						<div class="flex items-start justify-between mb-2">
							<div class="min-w-0 flex-1">
								<h4 class="font-medium text-gray-900 truncate">{suggestion.song.title}</h4>
								{#if suggestion.song.artist}
									<p class="text-sm text-gray-600 truncate">{suggestion.song.artist}</p>
								{/if}
							</div>
							<div class="flex items-center gap-1 text-sm {getConfidenceColor(suggestion.confidence)}">
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
								<span>{getConfidenceText(suggestion.confidence)}</span>
							</div>
						</div>

						<p class="text-sm text-gray-700 mb-2">{suggestion.reason}</p>

						<div class="flex items-center justify-between">
							<div class="flex flex-wrap gap-1">
								{#each suggestion.tags as tag (tag)}
									<Badge variant="default" size="xs">{tag}</Badge>
								{/each}
							</div>
							<Button
								variant="primary"
								size="sm"
								onclick={() => onAddSong(suggestion.song)}
							>
								Add to Service
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{:else if !loading}
			<div class="text-center py-8">
				<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<p class="mt-2 text-sm text-gray-500">
					Click "Generate Suggestions" to get AI-powered song recommendations
				</p>
			</div>
		{/if}
	</div>
</Card>