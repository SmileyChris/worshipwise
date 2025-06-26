<script lang="ts">
	import { onMount } from 'svelte';
	import { getRecommendationsStore, getAuthStore } from '$lib/context/stores.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SongRecommendationCard from './SongRecommendationCard.svelte';
	import WorshipFlowAnalysis from './WorshipFlowAnalysis.svelte';
	import ServiceBalanceAnalysis from './ServiceBalanceAnalysis.svelte';
	import WorshipInsightsDashboard from './WorshipInsightsDashboard.svelte';
	import { Lightbulb, TrendingUp, Music, Calendar, BarChart3, Brain } from 'lucide-svelte';

	const recommendationsStore = getRecommendationsStore();
	const auth = getAuthStore();

	let activeTab = $state<'overview' | 'songs' | 'flow' | 'balance' | 'trends' | 'insights'>(
		'overview'
	);

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
		if (auth.user?.id) {
			await recommendationsStore.getPersonalizedRecommendations(auth.user.id);
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-title text-3xl font-bold text-gray-900">Worship Insights</h1>
			<p class="text-gray-600">Smart recommendations and analytics for better worship planning</p>
		</div>

		<div class="flex gap-2">
			<Button variant="secondary" onclick={personalizeRecommendations}>
				<TrendingUp class="mr-2 h-4 w-4" />
				Personalize
			</Button>
			<Button onclick={refreshRecommendations}>
				<Lightbulb class="mr-2 h-4 w-4" />
				Refresh Insights
			</Button>
		</div>
	</div>

	<!-- Summary Insights -->
	{#if recommendationsStore.getSummaryInsights().length > 0}
		<Card class="from-primary/5 to-primary/10 bg-gradient-to-r">
			<div class="flex items-start gap-3">
				<Lightbulb class="text-primary mt-0.5 h-5 w-5" />
				<div>
					<h3 class="font-title mb-2 font-semibold text-gray-900">Key Insights</h3>
					<ul class="space-y-1">
						{#each recommendationsStore.getSummaryInsights() as insight, index (index)}
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
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'overview'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'overview')}
			>
				<BarChart3 class="mr-2 inline h-4 w-4" />
				Overview
			</button>

			<button
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'songs'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'songs')}
			>
				<Music class="mr-2 inline h-4 w-4" />
				Song Recommendations ({recommendationsStore.songRecommendations.length})
			</button>

			<button
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'flow'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'flow')}
			>
				Worship Flow
			</button>

			<button
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'balance'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'balance')}
			>
				Service Balance
			</button>

			<button
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'trends'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'trends')}
			>
				<Calendar class="mr-2 inline h-4 w-4" />
				Seasonal Trends
			</button>

			<button
				class={`border-b-2 px-1 py-2 text-sm font-medium ${
					activeTab === 'insights'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
				onclick={() => (activeTab = 'insights')}
			>
				<Brain class="mr-2 inline h-4 w-4" />
				AI Insights
			</button>
		</nav>
	</div>

	<!-- Loading State -->
	{#if recommendationsStore.loading}
		<div class="py-12 text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-gray-600">Loading insights...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if recommendationsStore.error}
		<Card class="border-red-200 bg-red-50">
			<p class="text-red-800">Error: {recommendationsStore.error}</p>
		</Card>
	{/if}

	<!-- Tab Content -->
	{#if !recommendationsStore.loading && !recommendationsStore.error}
		{#if activeTab === 'overview'}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Quick Stats -->
				<Card>
					<h3 class="font-title mb-4 text-lg font-semibold">Quick Stats</h3>
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
							<Badge
								variant={recommendationsStore.highPriorityFlowSuggestions.length > 0
									? 'danger'
									: 'success'}
							>
								{recommendationsStore.highPriorityFlowSuggestions.length}
							</Badge>
						</div>
					</div>
				</Card>

				<!-- Comparative Analysis -->
				{#if recommendationsStore.comparativePeriod}
					<Card>
						<h3 class="font-title mb-4 text-lg font-semibold">This Month vs Last Month</h3>
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-gray-600">Song Usage</span>
								<div class="flex items-center gap-2">
									<Badge
										variant={recommendationsStore.comparativePeriod.changes.usageChange >= 0
											? 'success'
											: 'warning'}
									>
										{recommendationsStore.comparativePeriod.changes.usageChange >= 0 ? '+' : ''}
										{recommendationsStore.comparativePeriod.changes.usageChange.toFixed(1)}%
									</Badge>
								</div>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-gray-600">Song Variety</span>
								<Badge
									variant={recommendationsStore.comparativePeriod.changes.diversityChange >= 0
										? 'success'
										: 'warning'}
								>
									{recommendationsStore.comparativePeriod.changes.diversityChange >= 0 ? '+' : ''}
									{recommendationsStore.comparativePeriod.changes.diversityChange.toFixed(1)}%
								</Badge>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-gray-600">Service Length</span>
								<Badge>
									{recommendationsStore.comparativePeriod.changes.lengthChange >= 0 ? '+' : ''}
									{recommendationsStore.comparativePeriod.changes.lengthChange.toFixed(1)}%
								</Badge>
							</div>
						</div>

						{#if recommendationsStore.comparativePeriod.insights.length > 0}
							<div class="mt-4 border-t pt-4">
								<h4 class="mb-2 font-medium text-gray-900">Insights</h4>
								<ul class="space-y-1">
									{#each recommendationsStore.comparativePeriod.insights as insight, index (index)}
										<li class="text-sm text-gray-600">• {insight}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</Card>
				{/if}

				<!-- Top Rotation Recommendations -->
				<Card class="lg:col-span-2">
					<h3 class="font-title mb-4 text-lg font-semibold">Quick Rotation Suggestions</h3>
					{#if recommendationsStore.getQuickRotationSuggestions(3).length > 0}
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							{#each recommendationsStore.getQuickRotationSuggestions(3) as recommendation (recommendation.songId)}
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
					<h3 class="font-title mb-4 text-lg font-semibold">Recommendation Filters</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<label for="exclude-recent-days" class="mb-2 block text-sm font-medium text-gray-700">
								Exclude Recent (days)
							</label>
							<select
								id="exclude-recent-days"
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
							<label for="limit-results" class="mb-2 block text-sm font-medium text-gray-700">
								Limit Results
							</label>
							<select
								id="limit-results"
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
					{#if recommendationsStore.rotationRecommendations().length > 0}
						<Card>
							<h3 class="font-title mb-4 text-lg font-semibold">Rotation Recommendations</h3>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								{#each recommendationsStore.rotationRecommendations() as recommendation (recommendation.songId)}
									<SongRecommendationCard {recommendation} />
								{/each}
							</div>
						</Card>
					{/if}

					<!-- Seasonal Recommendations -->
					{#if recommendationsStore.seasonalRecommendations().length > 0}
						<Card>
							<h3 class="font-title mb-4 text-lg font-semibold">Seasonal Recommendations</h3>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
								{#each recommendationsStore.seasonalRecommendations() as recommendation (recommendation.songId)}
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
					<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{#each recommendationsStore.seasonalTrends as trend (trend.season)}
							<Card>
								<h3 class="font-title mb-4 text-lg font-semibold">
									{trend.season} - {new Date(2024, trend.month - 1).toLocaleString('default', {
										month: 'long'
									})}
								</h3>

								{#if trend.popularSongs.length > 0}
									<div class="space-y-2">
										<h4 class="font-medium text-gray-900">Popular Songs</h4>
										{#each trend.popularSongs.slice(0, 5) as song, index (index)}
											<div class="flex items-center justify-between">
												<span class="text-sm">{song.title}</span>
												<Badge>{song.usageCount} uses</Badge>
											</div>
										{/each}
									</div>
								{/if}

								<div class="mt-4">
									<h4 class="mb-2 font-medium text-gray-900">Suggested Themes</h4>
									<div class="flex flex-wrap gap-2">
										{#each trend.suggestedThemes as theme (theme)}
											<Badge variant="default">{theme}</Badge>
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

		{#if activeTab === 'insights'}
			<WorshipInsightsDashboard />
		{/if}
	{/if}
</div>
