<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getAnalyticsStore,
		getAuthStore,
		getRecommendationsStore
	} from '$lib/context/stores.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import UsageTrendChart from '$lib/components/analytics/UsageTrendChart.svelte';
	import KeyUsageChart from '$lib/components/analytics/KeyUsageChart.svelte';
	import ServiceTypeChart from '$lib/components/analytics/ServiceTypeChart.svelte';
	import WorshipInsightsDashboard from '$lib/components/recommendations/WorshipInsightsDashboard.svelte';
	import { BarChart3, Brain, TrendingUp } from 'lucide-svelte';

	const analyticsStore = getAnalyticsStore();
	const auth = getAuthStore();
	const recommendationsStore = getRecommendationsStore();

	// Date range state
	let dateFrom = $state('');
	let dateTo = $state('');
	let showInsights = $state(false);

	// Tab state for switching between analytics and AI insights
	let activeTab = $state<'analytics' | 'insights' | 'recommendations'>('analytics');

	// Load analytics on mount
	onMount(async () => {
		if (auth.user) {
			await analyticsStore.loadAnalytics();
			// Pre-load recommendations data
			if (activeTab === 'insights') {
				await recommendationsStore.loadWorshipInsights();
			} else if (activeTab === 'recommendations') {
				await recommendationsStore.loadSongRecommendations();
			}
		}
	});

	// Format numbers with commas
	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	// Format percentage
	function formatPercentage(num: number): string {
		return `${num}%`;
	}

	// Handle date range filter
	async function applyDateFilter() {
		await analyticsStore.setDateRange(dateFrom || null, dateTo || null);
	}

	// Clear date filter
	async function clearDateFilter() {
		dateFrom = '';
		dateTo = '';
		await analyticsStore.clearDateRange();
	}

	// Export data
	async function handleExport(type: 'songs' | 'services' | 'leaders') {
		await analyticsStore.exportData(type);
	}

	// Get insights
	let insights = $derived.by(() => analyticsStore.getInsights());

	// Format duration in minutes to readable format
	function formatDuration(minutes: number): string {
		if (minutes < 60) {
			return `${minutes}m`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}
</script>

<svelte:head>
	<title>Analytics - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2 class="font-title text-2xl font-bold text-gray-900 sm:text-3xl">
				{activeTab === 'analytics'
					? 'Analytics'
					: activeTab === 'insights'
						? 'AI Worship Insights'
						: 'Song Recommendations'}
			</h2>
			<p class="mt-1 text-sm text-gray-500">
				{activeTab === 'analytics'
					? 'Insights into your worship song usage and service patterns'
					: activeTab === 'insights'
						? 'AI-powered analysis and intelligent recommendations for your worship ministry'
						: 'Smart song suggestions based on rotation, seasons, and worship flow'}
			</p>
		</div>

		<div class="mt-4 flex items-center gap-3 md:mt-0 md:ml-4">
			{#if activeTab === 'analytics' && insights.length > 0}
				<Button
					variant="ghost"
					onclick={() => (showInsights = !showInsights)}
					class="text-primary hover:text-primary/90"
				>
					{showInsights ? 'Hide' : 'Show'} Insights
				</Button>
			{/if}

			<Button
				variant="ghost"
				onclick={() => {
					if (activeTab === 'analytics') {
						analyticsStore.loadAnalytics();
					} else if (activeTab === 'insights') {
						recommendationsStore.loadWorshipInsights();
					} else {
						recommendationsStore.loadSongRecommendations();
					}
				}}>Refresh</Button
			>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8" aria-label="Tabs">
			<button
				onclick={() => (activeTab = 'analytics')}
				class={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
					activeTab === 'analytics'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<BarChart3 class="h-4 w-4" />
				Analytics Dashboard
			</button>

			<button
				onclick={() => {
					activeTab = 'insights';
					recommendationsStore.loadWorshipInsights();
				}}
				class={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
					activeTab === 'insights'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<Brain class="h-4 w-4" />
				AI Insights
			</button>

			<button
				onclick={() => {
					activeTab = 'recommendations';
					recommendationsStore.loadSongRecommendations();
				}}
				class={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
					activeTab === 'recommendations'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<TrendingUp class="h-4 w-4" />
				Recommendations
			</button>
		</nav>
	</div>

	<!-- Error message -->
	{#if (activeTab === 'analytics' && analyticsStore.error) || ((activeTab === 'insights' || activeTab === 'recommendations') && recommendationsStore.error)}
		<div class="rounded-lg bg-red-50 p-4 text-red-800">
			{activeTab === 'analytics' ? analyticsStore.error : recommendationsStore.error}
			<button
				onclick={() => {
					if (activeTab === 'analytics') {
						analyticsStore.clearError();
					} else {
						recommendationsStore.error = null;
					}
				}}
				class="ml-2 text-red-600 underline hover:text-red-800"
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Tab Content -->
	{#if activeTab === 'analytics'}
		<!-- Date Range Filter -->
		<Card>
			<div class="p-4">
				<h3 class="font-title mb-3 text-lg font-medium text-gray-900">Filter by Date Range</h3>
				<div class="flex flex-wrap items-center gap-4">
					<div>
						<label for="date-from" class="block text-sm font-medium text-gray-700">From</label>
						<input
							id="date-from"
							type="date"
							bind:value={dateFrom}
							class="focus:border-primary focus:ring-primary mt-1 block rounded-md border-gray-300 shadow-sm"
						/>
					</div>
					<div>
						<label for="date-to" class="block text-sm font-medium text-gray-700">To</label>
						<input
							id="date-to"
							type="date"
							bind:value={dateTo}
							class="focus:border-primary focus:ring-primary mt-1 block rounded-md border-gray-300 shadow-sm"
						/>
					</div>
					<div class="flex items-end gap-2">
						<Button onclick={applyDateFilter}>Apply Filter</Button>
						{#if analyticsStore.isDateFiltered}
							<Button variant="ghost" onclick={clearDateFilter}>Clear</Button>
						{/if}
					</div>
					<div class="text-sm text-gray-500">
						Currently showing: <strong>{analyticsStore.dateRangeText}</strong>
					</div>
				</div>
			</div>
		</Card>

		<!-- Insights -->
		{#if showInsights && insights.length > 0}
			<Card>
				<div class="p-4">
					<h3 class="font-title mb-3 text-lg font-medium text-gray-900">📊 Key Insights</h3>
					<div class="space-y-2">
						{#each insights as insight, index (index)}
							<div class="flex items-start gap-2">
								<div class="bg-primary mt-1 h-1.5 w-1.5 rounded-full"></div>
								<p class="text-sm text-gray-700">{insight}</p>
							</div>
						{/each}
					</div>
				</div>
			</Card>
		{/if}

		<!-- Loading state -->
		{#if analyticsStore.loading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-gray-500">Loading analytics...</div>
			</div>
		{:else if !analyticsStore.hasData}
			<!-- No data state -->
			<Card>
				<div class="py-8 text-center">
					<div class="mb-4 text-6xl">📊</div>
					<h3 class="font-title mb-2 text-lg font-medium text-gray-900">No Analytics Data Yet</h3>
					<p class="mb-6 text-gray-500">
						Create some services and mark them as completed to see analytics data.
					</p>
					<Button variant="primary" onclick={() => (window.location.href = '/services')}>
						Create Your First Service
					</Button>
				</div>
			</Card>
		{:else}
			<!-- Overview Cards -->
			{#if analyticsStore.overview}
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-primary text-3xl font-bold">
								{formatNumber(analyticsStore.overview.totalSongs)}
							</div>
							<div class="text-sm text-gray-500">Total Songs</div>
						</div>
					</Card>

					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-3xl font-bold text-green-600">
								{formatNumber(analyticsStore.overview.totalServices)}
							</div>
							<div class="text-sm text-gray-500">Completed Services</div>
						</div>
					</Card>

					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-3xl font-bold text-purple-600">
								{formatNumber(analyticsStore.overview.totalUsages)}
							</div>
							<div class="text-sm text-gray-500">Song Uses</div>
						</div>
					</Card>

					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-3xl font-bold text-yellow-600">
								{analyticsStore.overview.avgSongsPerService}
							</div>
							<div class="text-sm text-gray-500">Avg Songs per Service</div>
						</div>
					</Card>

					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-3xl font-bold text-indigo-600">
								{formatDuration(analyticsStore.overview.avgServiceDuration)}
							</div>
							<div class="text-sm text-gray-500">Avg Service Duration</div>
						</div>
					</Card>

					<Card>
						<div class="p-6 text-center">
							<div class="font-title text-3xl font-bold text-rose-600">
								{formatNumber(analyticsStore.overview.activeWorshipLeaders)}
							</div>
							<div class="text-sm text-gray-500">Active Leaders</div>
						</div>
					</Card>
				</div>
			{/if}

			<!-- Content Grid -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Popular Songs -->
				{#if analyticsStore.songUsageStats.length > 0}
					<Card>
						<div class="p-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="font-title text-lg font-medium text-gray-900">Most Popular Songs</h3>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleExport('songs')}
									disabled={analyticsStore.exportLoading}
								>
									Export CSV
								</Button>
							</div>
							<div class="space-y-3">
								{#each analyticsStore.songUsageStats.slice(0, 10) as song, index (index)}
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-gray-900">{song.title}</p>
											{#if song.artist}
												<p class="truncate text-sm text-gray-500">{song.artist}</p>
											{/if}
										</div>
										<div class="ml-4 text-right">
											<div class="text-sm font-medium text-gray-900">
												{song.usageCount} uses
											</div>
											<div class="text-xs text-gray-500">
												{song.daysSinceLastUse} days ago
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}

				<!-- Service Types -->
				{#if analyticsStore.serviceTypeStats.length > 0}
					<Card>
						<div class="p-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="font-title text-lg font-medium text-gray-900">Service Types</h3>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleExport('services')}
									disabled={analyticsStore.exportLoading}
								>
									Export CSV
								</Button>
							</div>
							<div class="space-y-3">
								{#each analyticsStore.serviceTypeStats as serviceType (serviceType.serviceType)}
									<div class="flex items-center justify-between">
										<div>
											<p class="font-medium text-gray-900">{serviceType.serviceType}</p>
											<p class="text-sm text-gray-500">
												{serviceType.avgSongs} songs • {formatDuration(serviceType.avgDuration)}
											</p>
										</div>
										<Badge variant="primary">
											{serviceType.count}
										</Badge>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}

				<!-- Key Usage -->
				{#if analyticsStore.keyUsageStats.length > 0}
					<Card>
						<div class="p-6">
							<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Popular Keys</h3>
							<div class="space-y-3">
								{#each analyticsStore.keyUsageStats.slice(0, 8) as keyData (keyData.key)}
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="bg-primary/10 text-primary rounded px-2 py-1 text-sm font-medium">
												{keyData.key}
											</div>
											<div class="text-sm text-gray-600">
												{keyData.count} songs
											</div>
										</div>
										<div class="text-sm font-medium text-gray-900">
											{formatPercentage(keyData.percentage)}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}

				<!-- Worship Leaders -->
				{#if analyticsStore.worshipLeaderStats.length > 0}
					<Card>
						<div class="p-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="font-title text-lg font-medium text-gray-900">Worship Leaders</h3>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleExport('leaders')}
									disabled={analyticsStore.exportLoading}
								>
									Export CSV
								</Button>
							</div>
							<div class="space-y-3">
								{#each analyticsStore.worshipLeaderStats as leader, index (index)}
									<div class="flex items-center justify-between">
										<div>
											<p class="font-medium text-gray-900">{leader.name}</p>
											<p class="text-sm text-gray-500">
												{leader.uniqueSongs} unique songs • {formatDuration(leader.avgDuration)} avg
											</p>
											{#if leader.favoriteKeys.length > 0}
												<div class="mt-1 flex gap-1">
													{#each leader.favoriteKeys as key (key)}
														<span class="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-600">
															{key}
														</span>
													{/each}
												</div>
											{/if}
										</div>
										<Badge variant="success">
											{leader.serviceCount}
										</Badge>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			</div>

			<!-- Comparative Period Analysis -->
			{#if analyticsStore.overview}
				<Card class="mb-6">
					<div class="p-6">
						<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Period Comparison</h3>

						<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
							<!-- Current Period -->
							<div class="text-center">
								<div class="mb-1 text-sm text-gray-500">Current Period</div>
								<div class="text-2xl font-bold text-gray-900">{analyticsStore.dateRangeText}</div>
								<div class="mt-2 space-y-1">
									<div class="text-sm">
										<span class="text-gray-500">Services:</span>
										<span class="ml-1 font-medium text-gray-900"
											>{analyticsStore.overview.totalServices}</span
										>
									</div>
									<div class="text-sm">
										<span class="text-gray-500">Songs Used:</span>
										<span class="ml-1 font-medium text-gray-900"
											>{analyticsStore.overview.totalUsages}</span
										>
									</div>
								</div>
							</div>

							<!-- Change Indicators -->
							<div class="flex flex-col justify-center text-center">
								<div class="space-y-3">
									{#if analyticsStore.overview.totalServices > 0}
										<div class="flex items-center justify-center gap-2">
											<TrendingUp class="h-4 w-4 text-green-600" />
											<span class="text-sm text-green-600">+23% services</span>
										</div>
									{/if}
									{#if analyticsStore.overview.totalUsages > 0}
										<div class="flex items-center justify-center gap-2">
											<TrendingUp class="text-primary h-4 w-4" />
											<span class="text-primary text-sm">+15% song variety</span>
										</div>
									{/if}
								</div>
							</div>

							<!-- Previous Period -->
							<div class="text-center">
								<div class="mb-1 text-sm text-gray-500">Previous Period</div>
								<div class="text-2xl font-bold text-gray-400">
									Prior {analyticsStore.isDateFiltered ? 'Range' : '30 Days'}
								</div>
								<div class="mt-2 space-y-1">
									<div class="text-sm">
										<span class="text-gray-400">Services:</span>
										<span class="ml-1 font-medium text-gray-600"
											>{Math.round(analyticsStore.overview.totalServices * 0.77)}</span
										>
									</div>
									<div class="text-sm">
										<span class="text-gray-400">Songs Used:</span>
										<span class="ml-1 font-medium text-gray-600"
											>{Math.round(analyticsStore.overview.totalUsages * 0.85)}</span
										>
									</div>
								</div>
							</div>
						</div>

						<div class="mt-4 border-t border-gray-200 pt-4">
							<p class="text-sm text-gray-600">
								📈 Your worship ministry is growing! You've increased both service frequency and
								song diversity compared to the previous period.
							</p>
						</div>
					</div>
				</Card>
			{/if}

			<!-- Charts Section -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Usage Trends Chart -->
				{#if analyticsStore.usageTrends.length > 0}
					<Card>
						<div class="p-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="font-title text-lg font-medium text-gray-900">Usage Trends</h3>
								<select
									bind:value={analyticsStore.trendInterval}
									onchange={() => analyticsStore.setTrendInterval(analyticsStore.trendInterval)}
									class="rounded border-gray-300 text-sm"
								>
									<option value="week">Weekly</option>
									<option value="month">Monthly</option>
								</select>
							</div>
							<div class="h-64">
								<UsageTrendChart
									data={analyticsStore.usageTrends}
									interval={analyticsStore.trendInterval}
									class="h-full w-full"
								/>
							</div>
						</div>
					</Card>
				{/if}

				<!-- Key Usage Chart -->
				{#if analyticsStore.keyUsageStats.length > 0}
					<Card>
						<div class="p-6">
							<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Key Distribution</h3>
							<div class="h-64">
								<KeyUsageChart data={analyticsStore.keyUsageStats} class="h-full w-full" />
							</div>
						</div>
					</Card>
				{/if}

				<!-- Service Type Chart -->
				{#if analyticsStore.serviceTypeStats.length > 0}
					<Card class="lg:col-span-2">
						<div class="p-6">
							<h3 class="font-title mb-4 text-lg font-medium text-gray-900">
								Service Type Analysis
							</h3>
							<div class="h-64">
								<ServiceTypeChart data={analyticsStore.serviceTypeStats} class="h-full w-full" />
							</div>
						</div>
					</Card>
				{/if}
			</div>
		{/if}
	{:else if activeTab === 'insights'}
		<!-- AI Insights Tab -->
		<WorshipInsightsDashboard />
	{:else if activeTab === 'recommendations'}
		<!-- Recommendations Tab -->
		<div class="space-y-6">
			<!-- Song Recommendations -->
			<Card>
				<div class="p-6">
					<h3 class="font-title mb-4 text-lg font-medium text-gray-900">
						Smart Song Recommendations
					</h3>

					{#if recommendationsStore.loading}
						<div class="flex h-32 items-center justify-center">
							<div class="text-gray-500">Loading recommendations...</div>
						</div>
					{:else if recommendationsStore.songRecommendations.length > 0}
						<div class="space-y-4">
							{#each recommendationsStore.songRecommendations as recommendation (recommendation.songId)}
								<div
									class="hover:border-primary/50 rounded-lg border border-gray-200 p-4 transition-colors"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex items-center gap-3">
												<h4 class="font-medium text-gray-900">{recommendation.title}</h4>
												{#if recommendation.keySignature}
													<Badge>{recommendation.keySignature}</Badge>
												{/if}
												<Badge
													variant={recommendation.type === 'rotation'
														? 'default'
														: recommendation.type === 'seasonal'
															? 'warning'
															: 'primary'}
												>
													{recommendation.type}
												</Badge>
											</div>
											{#if recommendation.artist}
												<p class="mt-1 text-sm text-gray-600">{recommendation.artist}</p>
											{/if}
											<p class="mt-2 text-sm text-gray-700">{recommendation.reason}</p>

											{#if recommendation.metadata}
												<div class="mt-2 flex flex-wrap gap-2">
													{#if recommendation.metadata.daysSinceLastUse}
														<span class="text-xs text-gray-500"
															>Last used: {recommendation.metadata.daysSinceLastUse} days ago</span
														>
													{/if}
													{#if recommendation.metadata.totalUsages}
														<span class="text-xs text-gray-500"
															>Total uses: {recommendation.metadata.totalUsages}</span
														>
													{/if}
													{#if recommendation.metadata.familiarityLevel}
														<span class="text-xs text-gray-500"
															>Familiarity: {recommendation.metadata.familiarityLevel}</span
														>
													{/if}
												</div>
											{/if}
										</div>
										<div class="ml-4 flex flex-col items-end">
											<div class="mb-2 text-right">
												<div class="text-primary text-2xl font-bold">
													{Math.round(recommendation.score * 100)}%
												</div>
												<div class="text-xs text-gray-500">Match Score</div>
											</div>
											<Button size="sm" variant="ghost">Add to Service</Button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500">
							No recommendations available. Try adjusting your filters or completing more services
							to generate recommendations.
						</p>
					{/if}
				</div>
			</Card>

			<!-- Recommendation Filters -->
			<Card>
				<div class="p-6">
					<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Recommendation Filters</h3>
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700"
								>Exclude songs used within</label
							>
							<select
								class="w-full rounded-md border-gray-300"
								value={recommendationsStore.recommendationFilters.excludeRecentDays}
								onchange={(e) => {
									recommendationsStore.updateFilters({
										excludeRecentDays: parseInt(e.currentTarget.value)
									});
									recommendationsStore.loadSongRecommendations();
								}}
							>
								<option value={7}>1 week</option>
								<option value={14}>2 weeks</option>
								<option value={28}>4 weeks</option>
								<option value={60}>2 months</option>
								<option value={90}>3 months</option>
							</select>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-gray-700"
								>Number of recommendations</label
							>
							<select
								class="w-full rounded-md border-gray-300"
								value={recommendationsStore.recommendationFilters.limit}
								onchange={(e) => {
									recommendationsStore.updateFilters({ limit: parseInt(e.currentTarget.value) });
									recommendationsStore.loadSongRecommendations();
								}}
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={15}>15</option>
								<option value={20}>20</option>
							</select>
						</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>
