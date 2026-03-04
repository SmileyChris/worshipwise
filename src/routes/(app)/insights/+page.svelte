<script lang="ts">
	import { onMount } from 'svelte';
	import { getRecommendationsStore, getAuthStore } from '$lib/context/stores.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
	import SongRecommendationCard from '$lib/components/recommendations/SongRecommendationCard.svelte';
	import RecommendationsDashboard from '$lib/components/recommendations/RecommendationsDashboard.svelte';
	import {
		Sparkles,
		Music,
		Calendar,
		BarChart3,
		TrendingUp,
		AlertTriangle,
		CheckCircle,
		RefreshCw
	} from 'lucide-svelte';

	const store = getRecommendationsStore();
	const auth = getAuthStore();

	type Tab = 'overview' | 'rotation' | 'seasonal' | 'optimization';
	let activeTab = $state<Tab>('overview');

	const tabs: { id: Tab; label: string; icon: typeof Sparkles }[] = [
		{ id: 'overview', label: 'Overview', icon: Sparkles },
		{ id: 'rotation', label: 'Song Rotation', icon: Music },
		{ id: 'seasonal', label: 'Seasonal', icon: Calendar },
		{ id: 'optimization', label: 'Service Optimization', icon: BarChart3 }
	];

	onMount(async () => {
		await Promise.all([store.loadSongRecommendations(), store.loadWorshipInsights()]);
	});

	async function handleRetry() {
		await Promise.all([store.loadSongRecommendations(), store.loadWorshipInsights()]);
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'excellent':
				return 'text-green-600';
			case 'good':
				return 'text-blue-600';
			case 'needs_attention':
				return 'text-yellow-600';
			case 'critical':
				return 'text-red-600';
			default:
				return 'text-gray-600';
		}
	}

	function getScoreBarColor(score: number) {
		if (score >= 80) return 'bg-green-500';
		if (score >= 60) return 'bg-blue-500';
		if (score >= 40) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	let overdueSongs = $derived(
		store.songRecommendations.filter(
			(r) => r.type === 'rotation' && (r.metadata?.daysSinceLastUse as number) > 60
		)
	);
</script>

<svelte:head>
	<title>Worship Insights - WorshipWise</title>
	<meta
		name="description"
		content="Smart recommendations and insights for better worship planning"
	/>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-title flex items-center gap-3 text-3xl font-bold text-gray-900">
				<Sparkles class="text-primary h-8 w-8" />
				Insights Hub
			</h1>
			<p class="text-gray-600">Smart recommendations and analytics for worship planning</p>
		</div>

		<Button variant="secondary" onclick={handleRetry} disabled={store.loading}>
			<RefreshCw class="mr-2 h-4 w-4 {store.loading ? 'animate-spin' : ''}" />
			Refresh
		</Button>
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8" aria-label="Insights tabs">
			{#each tabs as tab (tab.id)}
				<button
					class="inline-flex items-center border-b-2 px-1 py-2 text-sm font-medium transition-colors {activeTab ===
					tab.id
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					onclick={() => (activeTab = tab.id)}
					aria-current={activeTab === tab.id ? 'page' : undefined}
				>
					<tab.icon class="mr-2 h-4 w-4" />
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Loading -->
	{#if store.loading}
		<LoadingSpinner message="Loading insights..." />
	{/if}

	<!-- Error -->
	{#if store.error && !store.loading}
		<ErrorMessage message={store.error} retryButton onRetry={handleRetry} />
	{/if}

	<!-- Tab Content -->
	{#if !store.loading && !store.error}
		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			{#if store.worshipInsights}
				{@const insights = store.worshipInsights}

				<!-- Metric Cards -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-500">Rotation Health</p>
								<p class="text-2xl font-bold {getStatusColor(insights.rotationHealth.status)}">
									{insights.rotationHealth.score}<span class="text-sm font-normal">/100</span>
								</p>
							</div>
							{#if insights.rotationHealth.status === 'excellent' || insights.rotationHealth.status === 'good'}
								<CheckCircle class="h-8 w-8 text-green-400" />
							{:else}
								<AlertTriangle class="h-8 w-8 text-yellow-400" />
							{/if}
						</div>
						<div class="mt-2 h-1.5 w-full rounded-full bg-gray-200">
							<div
								class="h-1.5 rounded-full {getScoreBarColor(insights.rotationHealth.score)}"
								style="width: {insights.rotationHealth.score}%"
							></div>
						</div>
					</Card>

					<Card>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-500">Diversity Score</p>
								<p class="text-2xl font-bold text-gray-900">
									{Math.round(
										(insights.diversityAnalysis.keyDiversity +
											insights.diversityAnalysis.tempoDiversity +
											insights.diversityAnalysis.artistDiversity) /
											3
									)}<span class="text-sm font-normal">%</span>
								</p>
							</div>
							<BarChart3 class="h-8 w-8 text-blue-400" />
						</div>
						<div class="mt-2 flex gap-1">
							<div class="flex-1" title="Key: {insights.diversityAnalysis.keyDiversity}%">
								<div class="h-1.5 rounded-full bg-gray-200">
									<div
										class="h-1.5 rounded-full bg-blue-500"
										style="width: {insights.diversityAnalysis.keyDiversity}%"
									></div>
								</div>
							</div>
							<div class="flex-1" title="Tempo: {insights.diversityAnalysis.tempoDiversity}%">
								<div class="h-1.5 rounded-full bg-gray-200">
									<div
										class="h-1.5 rounded-full bg-green-500"
										style="width: {insights.diversityAnalysis.tempoDiversity}%"
									></div>
								</div>
							</div>
							<div class="flex-1" title="Artist: {insights.diversityAnalysis.artistDiversity}%">
								<div class="h-1.5 rounded-full bg-gray-200">
									<div
										class="h-1.5 rounded-full bg-purple-500"
										style="width: {insights.diversityAnalysis.artistDiversity}%"
									></div>
								</div>
							</div>
						</div>
					</Card>

					<Card>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-500">Seasonal Alignment</p>
								<p class="text-2xl font-bold text-gray-900">
									{insights.seasonalReadiness.currentSeasonAlignment}<span class="text-sm font-normal"
										>%</span
									>
								</p>
							</div>
							<Calendar class="h-8 w-8 text-orange-400" />
						</div>
						{#if insights.seasonalReadiness.context}
							<p class="mt-2 text-xs text-gray-500">
								{insights.seasonalReadiness.context.currentSeason}
								{#if insights.seasonalReadiness.context.upcomingSeason}
									&rarr; {insights.seasonalReadiness.context.upcomingSeason}
								{/if}
							</p>
						{/if}
					</Card>

					<Card>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-500">Songs in Rotation</p>
								<p class="text-2xl font-bold text-gray-900">
									{insights.congregationEngagement.optimalRotationCandidates}
								</p>
							</div>
							<TrendingUp class="h-8 w-8 text-green-400" />
						</div>
						<p class="mt-2 text-xs text-gray-500">
							{insights.congregationEngagement.familiarSongs} familiar &middot;
							{insights.congregationEngagement.newSongIntroductionRate} new (6mo)
						</p>
					</Card>
				</div>

				<!-- Insights & Recommendations -->
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{#if insights.rotationHealth.insights.length > 0 || insights.rotationHealth.recommendations.length > 0}
						<Card>
							<h3 class="font-title mb-3 text-lg font-semibold text-gray-900">
								Rotation Insights
							</h3>
							{#if insights.rotationHealth.insights.length > 0}
								<ul class="space-y-1">
									{#each insights.rotationHealth.insights as insight, i (i)}
										<li class="text-sm text-gray-600">&bull; {insight}</li>
									{/each}
								</ul>
							{/if}
							{#if insights.rotationHealth.recommendations.length > 0}
								<h4 class="mt-3 mb-2 text-sm font-medium text-gray-900">Recommendations</h4>
								<ul class="space-y-1">
									{#each insights.rotationHealth.recommendations as rec, i (i)}
										<li class="text-primary text-sm">&bull; {rec}</li>
									{/each}
								</ul>
							{/if}
						</Card>
					{/if}

					{#if insights.diversityAnalysis.recommendations.length > 0}
						<Card>
							<h3 class="font-title mb-3 text-lg font-semibold text-gray-900">
								Diversity Improvements
							</h3>
							<ul class="space-y-1">
								{#each insights.diversityAnalysis.recommendations as rec, i (i)}
									<li class="text-sm text-gray-600">&bull; {rec}</li>
								{/each}
							</ul>
						</Card>
					{/if}
				</div>

				<!-- Quick Rotation Suggestions -->
				{#if store.getQuickRotationSuggestions(3).length > 0}
					<div>
						<h3 class="font-title mb-3 text-lg font-semibold text-gray-900">
							Top Rotation Suggestions
						</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
							{#each store.getQuickRotationSuggestions(3) as recommendation (recommendation.songId)}
								<SongRecommendationCard {recommendation} />
							{/each}
						</div>
					</div>
				{/if}
			{:else}
				<Card>
					<p class="py-4 text-center text-gray-500 italic">
						No insights data available. Try refreshing.
					</p>
				</Card>
			{/if}
		{/if}

		<!-- Song Rotation Tab -->
		{#if activeTab === 'rotation'}
			<div class="space-y-6">
				<!-- Overdue songs alert -->
				{#if overdueSongs.length > 0}
					<Card class="border-yellow-200 bg-yellow-50">
						<div class="flex items-start gap-3">
							<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
							<div>
								<h3 class="font-medium text-yellow-800">
									{overdueSongs.length} song{overdueSongs.length !== 1 ? 's' : ''} overdue for rotation
								</h3>
								<p class="mt-1 text-sm text-yellow-700">
									These songs haven't been used in over 60 days.
								</p>
							</div>
						</div>
					</Card>
				{/if}

				<!-- Rotation recommendations -->
				{#if store.rotationRecommendations.length > 0}
					<div>
						<h3 class="font-title mb-3 text-lg font-semibold text-gray-900">
							Rotation Recommendations
							<Badge class="ml-2">{store.rotationRecommendations.length}</Badge>
						</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each store.rotationRecommendations as recommendation (recommendation.songId)}
								<SongRecommendationCard {recommendation} />
							{/each}
						</div>
					</div>
				{:else}
					<Card>
						<p class="py-4 text-center text-gray-500 italic">
							No rotation recommendations at this time. Your song rotation looks healthy!
						</p>
					</Card>
				{/if}
			</div>
		{/if}

		<!-- Seasonal Tab -->
		{#if activeTab === 'seasonal'}
			<div class="space-y-6">
				<!-- Current season context -->
				{#if store.worshipInsights?.seasonalReadiness}
					{@const seasonal = store.worshipInsights.seasonalReadiness}
					<Card class="bg-gradient-to-r from-orange-50 to-yellow-50">
						<div class="flex items-start gap-3">
							<Calendar class="mt-0.5 h-6 w-6 text-orange-600" />
							<div class="flex-1">
								<h3 class="font-title font-semibold text-gray-900">Current Season</h3>
								{#if seasonal.context}
									<p class="text-sm text-gray-600">
										{seasonal.context.currentSeason}
										{#if seasonal.context.upcomingSeason}
											&mdash; preparing for {seasonal.context.upcomingSeason}
										{/if}
									</p>
								{/if}
								<div class="mt-3 flex gap-6">
									<div>
										<p class="text-xs text-gray-500">Alignment</p>
										<p class="text-lg font-bold text-orange-600">
											{seasonal.currentSeasonAlignment}%
										</p>
									</div>
									<div>
										<p class="text-xs text-gray-500">Next Season Prep</p>
										<p class="text-lg font-bold text-yellow-600">
											{seasonal.upcomingSeasonPreparation}%
										</p>
									</div>
								</div>
								{#if seasonal.seasonalSuggestions.length > 0}
									<div class="mt-3 border-t border-orange-200 pt-3">
										<h4 class="mb-1 text-sm font-medium text-gray-900">Suggestions</h4>
										<ul class="space-y-1">
											{#each seasonal.seasonalSuggestions as suggestion, i (i)}
												<li class="text-sm text-orange-700">&bull; {suggestion}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						</div>
					</Card>
				{/if}

				<!-- Seasonal song recommendations -->
				{#if store.seasonalRecommendations.length > 0}
					<div>
						<h3 class="font-title mb-3 text-lg font-semibold text-gray-900">
							Seasonal Song Picks
							<Badge class="ml-2">{store.seasonalRecommendations.length}</Badge>
						</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each store.seasonalRecommendations as recommendation (recommendation.songId)}
								<SongRecommendationCard {recommendation} />
							{/each}
						</div>
					</div>
				{:else}
					<Card>
						<p class="py-4 text-center text-gray-500 italic">
							No seasonal recommendations right now.
						</p>
					</Card>
				{/if}
			</div>
		{/if}

		<!-- Service Optimization Tab -->
		{#if activeTab === 'optimization'}
			<RecommendationsDashboard />
		{/if}
	{/if}
</div>
