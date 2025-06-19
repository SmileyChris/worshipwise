<script lang="ts">
	import { onMount } from 'svelte';
	import { recommendationsStore } from '$lib/stores/recommendations.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SongRecommendationCard from './SongRecommendationCard.svelte';
	import WorshipFlowAnalysis from './WorshipFlowAnalysis.svelte';
	import ServiceBalanceAnalysis from './ServiceBalanceAnalysis.svelte';
	import { Lightbulb, TrendingUp, Music, Calendar, BarChart3 } from 'lucide-svelte';

	let activeTab = $state<'overview' | 'songs' | 'flow' | 'balance' | 'trends'>('overview');

	onMount(async () => {
		// Load initial recommendations
		await recommendationsStore.loadSongRecommendations();
		await recommendationsStore.loadSeasonalTrends();
		
		// Load comparative analysis for current month
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		await recommendationsStore.loadComparativePeriodAnalysis(startOfMonth, endOfMonth);
	});

	async function refreshRecommendations() {
		await recommendationsStore.loadSongRecommendations();
	}

	async function personalizeRecommendations() {
		if (authStore.user?.id) {
			await recommendationsStore.getPersonalizedRecommendations(authStore.user.id);
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Worship Insights</h1>
			<p class="text-gray-600">Smart recommendations and analytics for better worship planning</p>
		</div>
		
		<div class="flex gap-2">
			<Button variant="secondary" onclick={personalizeRecommendations}>
				<TrendingUp class="h-4 w-4 mr-2" />
				Personalize
			</Button>
			<Button onclick={refreshRecommendations}>
				<Lightbulb class="h-4 w-4 mr-2" />
				Refresh Insights
			</Button>
		</div>
	</div>

	<!-- Summary Insights -->
	{#if recommendationsStore.getSummaryInsights().length > 0}
		<Card class="bg-gradient-to-r from-blue-50 to-indigo-50">
			<div class="flex items-start gap-3">
				<Lightbulb class="h-5 w-5 text-blue-600 mt-0.5" />
				<div>
					<h3 class="font-semibold text-gray-900 mb-2">Key Insights</h3>
					<ul class="space-y-1">
						{#each recommendationsStore.getSummaryInsights() as insight}
							<li class="text-sm text-gray-700">• {insight}</li>
						{/each}
					</ul>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Navigation Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				class={`py-2 px-1 border-b-2 font-medium text-sm ${
					activeTab === 'overview'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
				}`}
				onclick={() => activeTab = 'overview'}
			>
				<BarChart3 class="h-4 w-4 mr-2 inline" />
				Overview
			</button>
			
			<button
				class={`py-2 px-1 border-b-2 font-medium text-sm ${
					activeTab === 'songs'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
				}`}
				onclick={() => activeTab = 'songs'}
			>
				<Music class="h-4 w-4 mr-2 inline" />
				Song Recommendations ({recommendationsStore.songRecommendations.length})
			</button>
			
			<button
				class={`py-2 px-1 border-b-2 font-medium text-sm ${
					activeTab === 'flow'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
				}`}
				onclick={() => activeTab = 'flow'}
			>
				Worship Flow
			</button>
			
			<button
				class={`py-2 px-1 border-b-2 font-medium text-sm ${
					activeTab === 'balance'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
				}`}
				onclick={() => activeTab = 'balance'}
			>
				Service Balance
			</button>
			
			<button
				class={`py-2 px-1 border-b-2 font-medium text-sm ${
					activeTab === 'trends'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
				}`}
				onclick={() => activeTab = 'trends'}
			>
				<Calendar class="h-4 w-4 mr-2 inline" />
				Seasonal Trends
			</button>
		</nav>
	</div>

	<!-- Loading State -->
	{#if recommendationsStore.loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Loading insights...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if recommendationsStore.error}
		<Card class="bg-red-50 border-red-200">
			<p class="text-red-800">Error: {recommendationsStore.error}</p>
		</Card>
	{/if}

	<!-- Tab Content -->
	{#if !recommendationsStore.loading && !recommendationsStore.error}
		
		{#if activeTab === 'overview'}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Quick Stats -->
				<Card>
					<h3 class="text-lg font-semibold mb-4">Quick Stats</h3>
					<div class="space-y-3">
						<div class="flex justify-between">
							<span class="text-gray-600">Total Recommendations</span>
							<Badge>{recommendationsStore.songRecommendations.length}</Badge>
						</div>
						
						<div class="flex justify-between">
							<span class="text-gray-600">Rotation Candidates</span>
							<Badge>{recommendationsStore.rotationRecommendations.length}</Badge>
						</div>
						
						<div class="flex justify-between">
							<span class="text-gray-600">Seasonal Songs</span>
							<Badge>{recommendationsStore.seasonalRecommendations.length}</Badge>
						</div>
						
						<div class="flex justify-between">
							<span class="text-gray-600">Flow Issues</span>
							<Badge variant={recommendationsStore.highPriorityFlowSuggestions.length > 0 ? 'danger' : 'success'}>
								{recommendationsStore.highPriorityFlowSuggestions.length}
							</Badge>
						</div>
					</div>
				</Card>

				<!-- Comparative Analysis -->
				{#if recommendationsStore.comparativePeriod}
					<Card>
						<h3 class="text-lg font-semibold mb-4">This Month vs Last Month</h3>
						<div class="space-y-3">
							<div class="flex justify-between items-center">
								<span class="text-gray-600">Song Usage</span>
								<div class="flex items-center gap-2">
									<Badge variant={recommendationsStore.comparativePeriod.changes.usageChange >= 0 ? 'success' : 'warning'}>
										{recommendationsStore.comparativePeriod.changes.usageChange >= 0 ? '+' : ''}
										{recommendationsStore.comparativePeriod.changes.usageChange.toFixed(1)}%
									</Badge>
								</div>
							</div>
							
							<div class="flex justify-between items-center">
								<span class="text-gray-600">Song Variety</span>
								<Badge variant={recommendationsStore.comparativePeriod.changes.diversityChange >= 0 ? 'success' : 'warning'}>
									{recommendationsStore.comparativePeriod.changes.diversityChange >= 0 ? '+' : ''}
									{recommendationsStore.comparativePeriod.changes.diversityChange.toFixed(1)}%
								</Badge>
							</div>
							
							<div class="flex justify-between items-center">
								<span class="text-gray-600">Setlist Length</span>
								<Badge>
									{recommendationsStore.comparativePeriod.changes.lengthChange >= 0 ? '+' : ''}
									{recommendationsStore.comparativePeriod.changes.lengthChange.toFixed(1)}%
								</Badge>
							</div>
						</div>

						{#if recommendationsStore.comparativePeriod.insights.length > 0}
							<div class="mt-4 pt-4 border-t">
								<h4 class="font-medium text-gray-900 mb-2">Insights</h4>
								<ul class="space-y-1">
									{#each recommendationsStore.comparativePeriod.insights as insight}
										<li class="text-sm text-gray-600">• {insight}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</Card>
				{/if}

				<!-- Top Rotation Recommendations -->
				<Card class="lg:col-span-2">
					<h3 class="text-lg font-semibold mb-4">Quick Rotation Suggestions</h3>
					{#if recommendationsStore.getQuickRotationSuggestions(3).length > 0}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							{#each recommendationsStore.getQuickRotationSuggestions(3) as recommendation}
								<SongRecommendationCard {recommendation} />
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 italic">No urgent rotation recommendations</p>
					{/if}
				</Card>
			</div>
		{/if}

		{#if activeTab === 'songs'}
			<div class="space-y-6">
				<!-- Filters -->
				<Card>
					<h3 class="text-lg font-semibold mb-4">Recommendation Filters</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Exclude Recent (days)
							</label>
							<select 
								bind:value={recommendationsStore.recommendationFilters.excludeRecentDays}
								onchange={refreshRecommendations}
								class="w-full rounded-md border-gray-300"
							>
								<option value={14}>14 days</option>
								<option value={21}>21 days</option>
								<option value={28}>28 days</option>
								<option value={42}>6 weeks</option>
								<option value={56}>8 weeks</option>
							</select>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Limit Results
							</label>
							<select 
								bind:value={recommendationsStore.recommendationFilters.limit}
								onchange={refreshRecommendations}
								class="w-full rounded-md border-gray-300"
							>
								<option value={5}>5 songs</option>
								<option value={10}>10 songs</option>
								<option value={15}>15 songs</option>
								<option value={20}>20 songs</option>
							</select>
						</div>
					</div>
				</Card>

				<!-- Recommendations by Type -->
				<div class="space-y-6">
					<!-- Rotation Recommendations -->
					{#if recommendationsStore.rotationRecommendations.length > 0}
						<Card>
							<h3 class="text-lg font-semibold mb-4">Rotation Recommendations</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each recommendationsStore.rotationRecommendations as recommendation}
									<SongRecommendationCard {recommendation} />
								{/each}
							</div>
						</Card>
					{/if}

					<!-- Seasonal Recommendations -->
					{#if recommendationsStore.seasonalRecommendations.length > 0}
						<Card>
							<h3 class="text-lg font-semibold mb-4">Seasonal Recommendations</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{#each recommendationsStore.seasonalRecommendations as recommendation}
									<SongRecommendationCard {recommendation} />
								{/each}
							</div>
						</Card>
					{/if}
				</div>
			</div>
		{/if}

		{#if activeTab === 'flow'}
			<WorshipFlowAnalysis />
		{/if}

		{#if activeTab === 'balance'}
			<ServiceBalanceAnalysis />
		{/if}

		{#if activeTab === 'trends'}
			<div class="space-y-6">
				{#if recommendationsStore.seasonalTrends.length > 0}
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{#each recommendationsStore.seasonalTrends as trend}
							<Card>
								<h3 class="text-lg font-semibold mb-4">{trend.season} - {new Date(2024, trend.month - 1).toLocaleString('default', { month: 'long' })}</h3>
								
								{#if trend.popularSongs.length > 0}
									<div class="space-y-2">
										<h4 class="font-medium text-gray-900">Popular Songs</h4>
										{#each trend.popularSongs.slice(0, 5) as song}
											<div class="flex justify-between items-center">
												<span class="text-sm">{song.title}</span>
												<Badge>{song.usageCount} uses</Badge>
											</div>
										{/each}
									</div>
								{/if}
								
								<div class="mt-4">
									<h4 class="font-medium text-gray-900 mb-2">Suggested Themes</h4>
									<div class="flex flex-wrap gap-2">
										{#each trend.suggestedThemes as theme}
											<Badge variant="secondary">{theme}</Badge>
										{/each}
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{:else}
					<Card>
						<p class="text-gray-500 italic">No seasonal trends data available</p>
					</Card>
				{/if}
			</div>
		{/if}
	{/if}
</div>