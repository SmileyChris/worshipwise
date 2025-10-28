<script lang="ts">
	import { pb } from '$lib/api/client';
	import { createLabelsAPI } from '$lib/api/labels';
	import { createLyricsSearchClient, validateLyricsContent } from '$lib/api/lyrics';
	import { createChurchMistralClient, hasAIFeaturesEnabled } from '$lib/api/mistral-config';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import type { Label, LyricsAnalysis } from '$lib/types/song';
	import { onMount } from 'svelte';

	const auth = getAuthStore();

	interface Props {
		title: string;
		artist?: string;
		lyrics?: string;
		onAnalysisComplete?: (analysis: LyricsAnalysis) => void;
		onLabelsCreated?: (labels: Label[]) => void;
		disabled?: boolean;
	}

	let {
		title,
		artist,
		lyrics,
		onAnalysisComplete = () => {},
		onLabelsCreated = () => {},
		disabled = false
	}: Props = $props();

	// State management
	let isAnalyzing = $state(false);
	let currentStep = $state<'idle' | 'searching' | 'analyzing' | 'complete' | 'error'>('idle');
	let error = $state<string | null>(null);
	let analysis = $state<LyricsAnalysis | null>(null);
	let foundLyrics = $state<string | null>(null);
	let suggestedLabels = $state<string[]>([]);
	let creatingLabels = $state(false);
	let existingLabels = $state<Label[]>([]);
	let hasAIFeatures = $state(false);

	// Check if Mistral API is configured
	const canAnalyze = $derived(!disabled && hasAIFeatures && title?.trim().length > 0);

	// Initialize clients
	const lyricsClient = createLyricsSearchClient();
	let mistralClient: Awaited<ReturnType<typeof createChurchMistralClient>> = null;
	const labelsApi = createLabelsAPI(pb);

	// Load existing labels on mount
	onMount(async () => {
		const churchId = auth.currentChurch?.id;
		hasAIFeatures = await hasAIFeaturesEnabled(pb, churchId);

		if (hasAIFeatures) {
			mistralClient = await createChurchMistralClient(pb, churchId);
		}

		try {
			if (churchId) {
				existingLabels = await labelsApi.getLabels(churchId);
			}
		} catch (err) {
			console.error('Failed to load labels:', err);
		}
	});

	async function analyzeLyrics() {
		if (!canAnalyze || !mistralClient) {
			return;
		}

		isAnalyzing = true;
		error = null;
		analysis = null;
		foundLyrics = null;

		try {
			let lyricsToAnalyze = lyrics?.trim();

			// Step 1: Search for lyrics if not provided
			if (!lyricsToAnalyze || lyricsToAnalyze.length < 50) {
				currentStep = 'searching';
				const searchResult = await lyricsClient.searchLyrics(title, artist);

				if (searchResult && validateLyricsContent(searchResult.lyrics)) {
					foundLyrics = searchResult.lyrics;
					lyricsToAnalyze = searchResult.lyrics;
				} else {
					throw new Error('Could not find lyrics for this song. Please add lyrics manually first.');
				}
			}

			// Step 2: Analyze lyrics with Mistral
			currentStep = 'analyzing';
			const result = await mistralClient.analyzeLyrics(title, artist, lyricsToAnalyze);

			analysis = result;
			currentStep = 'complete';

			// Generate label suggestions from themes and seasonal appropriateness
			generateLabelSuggestions(result);

			// Call callback with analysis
			onAnalysisComplete(result);
		} catch (err) {
			currentStep = 'error';
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
			console.error('Lyrics analysis error:', err);
		} finally {
			isAnalyzing = false;
		}
	}

	function resetAnalysis() {
		currentStep = 'idle';
		error = null;
		analysis = null;
		foundLyrics = null;
		suggestedLabels = [];
	}

	function generateLabelSuggestions(analysis: LyricsAnalysis) {
		const suggestions = new Set<string>();

		// Add themes as label suggestions
		analysis.themes.forEach((theme) => {
			// Convert to label-friendly format (lowercase, no spaces)
			const labelName = theme.toLowerCase().replace(/\s+/g, '-');
			suggestions.add(labelName);
		});

		// Add seasonal appropriateness as labels
		analysis.seasonal_appropriateness.forEach((season) => {
			const labelName = season.toLowerCase().replace(/\s+/g, '-');
			suggestions.add(labelName);
		});

		// Add service placement as a label
		if (analysis.service_placement) {
			const labelName = analysis.service_placement.toLowerCase().replace(/\s+/g, '-');
			suggestions.add(labelName);
		}

		// Filter out existing labels
		const existingLabelNames = existingLabels.map((l) => l.name.toLowerCase());
		suggestedLabels = Array.from(suggestions).filter(
			(label) => !existingLabelNames.includes(label)
		);
	}

	async function createSuggestedLabels() {
		if (suggestedLabels.length === 0) return;

		creatingLabels = true;
		error = null;

		try {
			const createdLabels: Label[] = [];

			for (const labelName of suggestedLabels) {
				try {
					// Generate a color based on the label type
					let color = '#6B7280'; // Default gray
					if (labelName.includes('christmas') || labelName.includes('easter')) {
						color = '#DC2626'; // Red for seasonal
					} else if (labelName.includes('opening') || labelName.includes('closing')) {
						color = '#2563EB'; // Blue for service placement
					} else if (labelName.includes('praise') || labelName.includes('worship')) {
						color = '#7C3AED'; // Purple for worship themes
					}

					const churchId = auth.currentChurch?.id;
					const userId = auth.user?.id;
					if (!churchId || !userId) continue;

					const label = await labelsApi.createLabel(
						{
							name: labelName,
							description: `AI-suggested label based on song analysis`,
							color
						},
						userId,
						churchId
					);
					createdLabels.push(label);
				} catch (err) {
					console.error(`Failed to create label ${labelName}:`, err);
				}
			}

			if (createdLabels.length > 0) {
				// Update existing labels list
				existingLabels = [...existingLabels, ...createdLabels];
				// Clear suggestions that were created
				suggestedLabels = suggestedLabels.filter(
					(label) => !createdLabels.find((cl) => cl.name === label)
				);
				// Notify parent component
				onLabelsCreated(createdLabels);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create labels';
		} finally {
			creatingLabels = false;
		}
	}

	// Get step display text
	const stepText = $derived.by(() => {
		switch (currentStep) {
			case 'searching':
				return 'Searching for lyrics...';
			case 'analyzing':
				return 'Analyzing with AI...';
			case 'complete':
				return 'Analysis complete';
			case 'error':
				return 'Analysis failed';
			default:
				return 'Ready to analyze';
		}
	});

	// Progress percentage
	const progress = $derived.by(() => {
		switch (currentStep) {
			case 'searching':
				return 25;
			case 'analyzing':
				return 75;
			case 'complete':
				return 100;
			case 'error':
				return 0;
			default:
				return 0;
		}
	});
</script>

<Card class="p-4">
	<div class="space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold">AI Lyrics Analysis</h3>
			{#if !hasAIFeatures}
				<Badge variant="warning" class="text-yellow-600">API Key Required</Badge>
			{/if}
		</div>

		<!-- Instructions -->
		{#if !hasAIFeatures}
			<p class="text-sm text-gray-600">
				Configure your Mistral API key in church settings or set a global key to enable AI-powered
				lyrics analysis.
			</p>
		{:else if currentStep === 'idle'}
			<p class="text-sm text-gray-600">
				Automatically search for lyrics and generate worship insights using AI.
			</p>
		{/if}

		<!-- Analysis Button -->
		{#if canAnalyze}
			<div class="flex gap-2">
				<Button variant="outline" onclick={analyzeLyrics} disabled={isAnalyzing} class="flex-1">
					{#if isAnalyzing}
						<svg class="mr-2 -ml-1 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{stepText}
					{:else if currentStep === 'complete'}
						✓ Analyze Again
					{:else}
						🎵 Analyze Lyrics
					{/if}
				</Button>

				{#if currentStep === 'complete' || currentStep === 'error'}
					<Button variant="ghost" onclick={resetAnalysis}>Reset</Button>
				{/if}
			</div>

			<!-- Progress Bar -->
			{#if isAnalyzing}
				<div class="h-2 w-full rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full bg-blue-600 transition-all duration-300"
						style="width: {progress}%"
					></div>
				</div>
			{/if}
		{/if}

		<!-- Error Display -->
		{#if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-3">
				<div class="flex items-start">
					<svg class="mt-0.5 mr-2 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						></path>
					</svg>
					<div>
						<h4 class="text-sm font-medium text-red-800">Analysis Failed</h4>
						<p class="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Found Lyrics Preview -->
		{#if foundLyrics && currentStep !== 'error'}
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-blue-800">Found Lyrics:</h4>
				<div class="max-h-32 overflow-y-auto text-sm text-blue-700">
					{foundLyrics.split('\n').slice(0, 6).join('\n')}
					{#if foundLyrics.split('\n').length > 6}
						<div class="text-blue-600 italic">... and more</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Analysis Results -->
		{#if analysis}
			<div class="space-y-3">
				<h4 class="font-medium">Analysis Results:</h4>

				<!-- Themes -->
				{#if analysis.themes.length > 0}
					<div>
						<span class="text-sm font-medium text-gray-700">Themes:</span>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each analysis.themes as theme (theme)}
								<Badge variant="primary" class="text-xs">{theme}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Service Placement & Tone -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<span class="text-sm font-medium text-gray-700">Service Placement:</span>
						<Badge variant="default" class="ml-2 text-xs">{analysis.service_placement}</Badge>
					</div>
					<div>
						<span class="text-sm font-medium text-gray-700">Tone:</span>
						<Badge variant="default" class="ml-2 text-xs">{analysis.emotional_tone}</Badge>
					</div>
				</div>

				<!-- Biblical References -->
				{#if analysis.biblical_references.length > 0}
					<div>
						<span class="text-sm font-medium text-gray-700">Biblical References:</span>
						<div class="mt-1 flex flex-wrap gap-1">
							{#each analysis.biblical_references as ref (ref)}
								<Badge variant="success" class="text-xs">{ref}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Summary -->
				<div>
					<span class="text-sm font-medium text-gray-700">Summary:</span>
					<p class="mt-1 text-sm text-gray-600">{analysis.summary}</p>
				</div>

				<!-- Confidence Score -->
				{#if analysis.confidence_score}
					<div class="text-xs text-gray-500">
						Confidence: {Math.round(analysis.confidence_score * 100)}%
					</div>
				{/if}
			</div>
		{/if}

		<!-- Label Suggestions -->
		{#if suggestedLabels.length > 0}
			<div class="mt-4 space-y-3 border-t pt-4">
				<div class="flex items-center justify-between">
					<h4 class="font-medium">Suggested Labels</h4>
					<Button
						variant="outline"
						size="sm"
						onclick={createSuggestedLabels}
						disabled={creatingLabels}
					>
						{#if creatingLabels}
							<svg class="mr-2 -ml-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Creating...
						{:else}
							Create All Labels
						{/if}
					</Button>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each suggestedLabels as label (label)}
						<Badge variant="default" class="text-xs">
							+ {label}
						</Badge>
					{/each}
				</div>
				<p class="text-xs text-gray-600">
					Click "Create All Labels" to add these AI-suggested labels to your library.
				</p>
			</div>
		{/if}
	</div>
</Card>
