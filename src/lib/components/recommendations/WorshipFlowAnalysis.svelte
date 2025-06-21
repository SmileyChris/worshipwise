<script lang="ts">
	import { onMount } from 'svelte';
	import { recommendationsStore } from '$lib/stores/recommendations.svelte';
	import { servicesStore } from '$lib/stores/services.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { AlertTriangle, CheckCircle, Music, ArrowRight } from 'lucide-svelte';

	let selectedServiceId = $state<string>('');
	let showGeneralTips = $state<boolean>(true);

	onMount(async () => {
		// Load services for selection
		await servicesStore.loadServices();
		
		// Load general flow suggestions
		if (!selectedServiceId) {
			await recommendationsStore.loadWorshipFlowSuggestions();
		}
	});

	async function analyzeService() {
		if (selectedServiceId) {
			await recommendationsStore.loadWorshipFlowSuggestions(selectedServiceId);
			showGeneralTips = false;
		}
	}

	function getSeverityColor(suggestion: any) {
		if (suggestion.reason.includes('Large tempo change') || suggestion.reason.includes('difficult')) {
			return 'danger';
		}
		return 'warning';
	}

	function getSeverityIcon(suggestion: any) {
		if (suggestion.reason.includes('Large tempo change') || suggestion.reason.includes('difficult')) {
			return AlertTriangle;
		}
		return CheckCircle;
	}
</script>

<div class="space-y-6">
	<!-- Setlist Selection -->
	<Card>
		<h3 class="text-lg font-semibold font-title mb-4">Analyze Worship Flow</h3>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Select a service to analyze (optional)
				</label>
				<div class="flex gap-3">
					<select 
						bind:value={selectedServiceId}
						class="flex-1 rounded-md border-gray-300"
					>
						<option value="">-- General flow tips --</option>
						{#each servicesStore.services as service}
							<option value={service.id}>
								{service.title || `Service ${new Date(service.service_date).toLocaleDateString()}`}
							</option>
						{/each}
					</select>
					<Button onclick={analyzeService} disabled={!selectedServiceId}>
						Analyze Flow
					</Button>
				</div>
			</div>
			
			{#if !selectedServiceId}
				<Button 
					variant="secondary" 
					onclick={() => { showGeneralTips = true; recommendationsStore.loadWorshipFlowSuggestions(); }}
				>
					Show General Flow Tips
				</Button>
			{/if}
		</div>
	</Card>

	<!-- Loading State -->
	{#if recommendationsStore.loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
			<p class="mt-2 text-sm text-gray-600">Analyzing worship flow...</p>
		</div>
	{/if}

	<!-- Flow Suggestions -->
	{#if !recommendationsStore.loading && recommendationsStore.worshipFlowSuggestions.length > 0}
		<div class="space-y-4">
			{#if selectedServiceId && !showGeneralTips}
				<h3 class="text-lg font-semibold font-title">Setlist Flow Analysis</h3>
			{:else}
				<h3 class="text-lg font-semibold font-title">General Worship Flow Guidelines</h3>
			{/if}

			{#each recommendationsStore.worshipFlowSuggestions as suggestion, index}
				<Card class={`border-l-4 ${
					getSeverityColor(suggestion) === 'danger' 
						? 'border-red-500 bg-red-50' 
						: getSeverityColor(suggestion) === 'warning'
						? 'border-yellow-500 bg-yellow-50'
						: 'border-primary/50 bg-primary/5'
				}`}>
					<div class="flex items-start gap-3">
						<div class={`mt-0.5 ${
							getSeverityColor(suggestion) === 'danger' 
								? 'text-red-600' 
								: getSeverityColor(suggestion) === 'warning'
								? 'text-yellow-600'
								: 'text-primary'
						}`}>
							{#if getSeverityIcon(suggestion) === AlertTriangle}
								<AlertTriangle class="h-5 w-5" />
							{:else if getSeverityIcon(suggestion) === CheckCircle}
								<CheckCircle class="h-5 w-5" />
							{:else}
								<Music class="h-5 w-5" />
							{/if}
						</div>
						
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								{#if typeof suggestion.position === 'number'}
									<Badge variant="default">Position {suggestion.position + 1}</Badge>
								{/if}
								<h4 class="font-medium text-gray-900">{suggestion.suggestion}</h4>
							</div>
							
							<p class="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
							
							{#if suggestion.recommendedTempo || suggestion.recommendedKey}
								<div class="flex gap-3 text-xs">
									{#if suggestion.recommendedTempo}
										<div class="flex items-center gap-1">
											<span class="text-gray-500">Recommended tempo:</span>
											<Badge variant="default">{suggestion.recommendedTempo}</Badge>
										</div>
									{/if}
									
									{#if suggestion.recommendedKey}
										<div class="flex items-center gap-1">
											<span class="text-gray-500">Suggested key:</span>
											<Badge variant="default">{suggestion.recommendedKey}</Badge>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- No Issues Found -->
	{#if !recommendationsStore.loading && selectedServiceId && !showGeneralTips && recommendationsStore.worshipFlowSuggestions.length === 0}
		<Card class="border-green-200 bg-green-50">
			<div class="flex items-center gap-3">
				<CheckCircle class="h-5 w-5 text-green-600" />
				<div>
					<h4 class="font-medium text-green-900">Great Flow!</h4>
					<p class="text-sm text-green-700">This service has good worship flow with no major issues detected.</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Worship Flow Best Practices -->
	{#if showGeneralTips || !selectedServiceId}
		<Card>
			<h3 class="text-lg font-semibold font-title mb-4">Worship Flow Best Practices</h3>
			<div class="space-y-4">
				<div class="flex items-start gap-3">
					<ArrowRight class="h-4 w-4 text-primary mt-1" />
					<div>
						<h4 class="font-medium">Opening (Songs 1-2)</h4>
						<p class="text-sm text-gray-600">Start with familiar, energetic songs to engage the congregation. Consider 120+ BPM.</p>
					</div>
				</div>
				
				<div class="flex items-start gap-3">
					<ArrowRight class="h-4 w-4 text-primary mt-1" />
					<div>
						<h4 class="font-medium">Building (Songs 3-4)</h4>
						<p class="text-sm text-gray-600">Build momentum with songs that transition from celebration to worship. Medium tempo works well.</p>
					</div>
				</div>
				
				<div class="flex items-start gap-3">
					<ArrowRight class="h-4 w-4 text-primary mt-1" />
					<div>
						<h4 class="font-medium">Worship (Songs 5-6)</h4>
						<p class="text-sm text-gray-600">Create space for intimate worship with slower, contemplative songs. 60-90 BPM is ideal.</p>
					</div>
				</div>
				
				<div class="flex items-start gap-3">
					<ArrowRight class="h-4 w-4 text-primary mt-1" />
					<div>
						<h4 class="font-medium">Response (Song 7)</h4>
						<p class="text-sm text-gray-600">End with a song of response or sending. Can be either reflective or celebratory based on service theme.</p>
					</div>
				</div>
			</div>
		</Card>

		<!-- Key Transition Tips -->
		<Card>
			<h3 class="text-lg font-semibold font-title mb-4">Key Transition Guidelines</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<h4 class="font-medium mb-2">Easy Transitions</h4>
					<ul class="space-y-1 text-gray-600">
						<li>• Same key</li>
						<li>• Adjacent keys (G → D, C → F)</li>
						<li>• Relative major/minor (Am → C)</li>
						<li>• Perfect 5th up or down</li>
					</ul>
				</div>
				
				<div>
					<h4 class="font-medium mb-2">Difficult Transitions</h4>
					<ul class="space-y-1 text-gray-600">
						<li>• Distant keys (C → F#)</li>
						<li>• Non-circle of fifths</li>
						<li>• Large tempo + key changes</li>
						<li>• Major to minor (same key)</li>
					</ul>
				</div>
			</div>
		</Card>
	{/if}
</div>