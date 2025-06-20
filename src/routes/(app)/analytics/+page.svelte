<script lang="ts">
	import { onMount } from 'svelte';
	import { analyticsStore } from '$lib/stores/analytics.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import UsageTrendChart from '$lib/components/analytics/UsageTrendChart.svelte';
	import KeyUsageChart from '$lib/components/analytics/KeyUsageChart.svelte';
	import ServiceTypeChart from '$lib/components/analytics/ServiceTypeChart.svelte';

	// Date range state
	let dateFrom = $state('');
	let dateTo = $state('');
	let showInsights = $state(false);

	// Load analytics on mount
	onMount(async () => {
		if (auth.user) {
			await analyticsStore.loadAnalytics();
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
			<h2 class="text-2xl font-bold font-title text-gray-900 sm:text-3xl">Analytics</h2>
			<p class="mt-1 text-sm text-gray-500">
				Insights into your worship song usage and service patterns
			</p>
		</div>

		<div class="mt-4 flex items-center gap-3 md:mt-0 md:ml-4">
			{#if insights.length > 0}
				<Button
					variant="ghost"
					onclick={() => (showInsights = !showInsights)}
					class="text-blue-600 hover:text-blue-800"
				>
					{showInsights ? 'Hide' : 'Show'} Insights
				</Button>
			{/if}

			<Button variant="ghost" onclick={() => analyticsStore.loadAnalytics()}>Refresh</Button>
		</div>
	</div>

	<!-- Error message -->
	{#if analyticsStore.error}
		<div class="rounded-lg bg-red-50 p-4 text-red-800">
			{analyticsStore.error}
			<button
				onclick={() => analyticsStore.clearError()}
				class="ml-2 text-red-600 underline hover:text-red-800"
			>
				Dismiss
			</button>
		</div>
	{/if}

	<!-- Date Range Filter -->
	<Card>
		<div class="p-4">
			<h3 class="mb-3 text-lg font-medium font-title text-gray-900">Filter by Date Range</h3>
			<div class="flex flex-wrap items-center gap-4">
				<div>
					<label for="date-from" class="block text-sm font-medium text-gray-700">From</label>
					<input
						id="date-from"
						type="date"
						bind:value={dateFrom}
						class="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
				<div>
					<label for="date-to" class="block text-sm font-medium text-gray-700">To</label>
					<input
						id="date-to"
						type="date"
						bind:value={dateTo}
						class="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
				<div class="flex items-end gap-2">
					<Button onclick={applyDateFilter}>Apply Filter</Button>
					{#if analyticsStore.isDateFiltered()}
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
				<h3 class="mb-3 text-lg font-medium font-title text-gray-900">📊 Key Insights</h3>
				<div class="space-y-2">
					{#each insights as insight}
						<div class="flex items-start gap-2">
							<div class="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600"></div>
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
				<h3 class="mb-2 text-lg font-medium font-title text-gray-900">No Analytics Data Yet</h3>
				<p class="mb-6 text-gray-500">
					Create some setlists and mark them as completed to see analytics data.
				</p>
				<Button variant="primary" onclick={() => (window.location.href = '/setlists')}>
					Create Your First Setlist
				</Button>
			</div>
		</Card>
	{:else}
		<!-- Overview Cards -->
		{#if analyticsStore.overview}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-blue-600">
							{formatNumber(analyticsStore.overview.totalSongs)}
						</div>
						<div class="text-sm text-gray-500">Total Songs</div>
					</div>
				</Card>

				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-green-600">
							{formatNumber(analyticsStore.overview.totalSetlists)}
						</div>
						<div class="text-sm text-gray-500">Completed Setlists</div>
					</div>
				</Card>

				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-purple-600">
							{formatNumber(analyticsStore.overview.totalUsages)}
						</div>
						<div class="text-sm text-gray-500">Song Uses</div>
					</div>
				</Card>

				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-yellow-600">
							{analyticsStore.overview.avgSongsPerSetlist}
						</div>
						<div class="text-sm text-gray-500">Avg Songs per Setlist</div>
					</div>
				</Card>

				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-indigo-600">
							{formatDuration(analyticsStore.overview.avgServiceDuration)}
						</div>
						<div class="text-sm text-gray-500">Avg Service Duration</div>
					</div>
				</Card>

				<Card>
					<div class="p-6 text-center">
						<div class="text-3xl font-bold font-title text-rose-600">
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
							<h3 class="text-lg font-medium font-title text-gray-900">Most Popular Songs</h3>
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
							{#each analyticsStore.songUsageStats.slice(0, 10) as song}
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
							<h3 class="text-lg font-medium font-title text-gray-900">Service Types</h3>
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
							{#each analyticsStore.serviceTypeStats as serviceType}
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
						<h3 class="mb-4 text-lg font-medium font-title text-gray-900">Popular Keys</h3>
						<div class="space-y-3">
							{#each analyticsStore.keyUsageStats.slice(0, 8) as keyData}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="rounded bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800">
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
							<h3 class="text-lg font-medium font-title text-gray-900">Worship Leaders</h3>
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
							{#each analyticsStore.worshipLeaderStats as leader}
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-gray-900">{leader.name}</p>
										<p class="text-sm text-gray-500">
											{leader.uniqueSongs} unique songs • {formatDuration(leader.avgDuration)} avg
										</p>
										{#if leader.favoriteKeys.length > 0}
											<div class="mt-1 flex gap-1">
												{#each leader.favoriteKeys as key}
													<span class="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-600">
														{key}
													</span>
												{/each}
											</div>
										{/if}
									</div>
									<Badge variant="success">
										{leader.setlistCount}
									</Badge>
								</div>
							{/each}
						</div>
					</div>
				</Card>
			{/if}
		</div>

		<!-- Charts Section -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Usage Trends Chart -->
			{#if analyticsStore.usageTrends.length > 0}
				<Card>
					<div class="p-6">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-lg font-medium font-title text-gray-900">Usage Trends</h3>
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
						<h3 class="mb-4 text-lg font-medium font-title text-gray-900">Key Distribution</h3>
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
						<h3 class="mb-4 text-lg font-medium font-title text-gray-900">Service Type Analysis</h3>
						<div class="h-64">
							<ServiceTypeChart data={analyticsStore.serviceTypeStats} class="h-full w-full" />
						</div>
					</div>
				</Card>
			{/if}
		</div>
	{/if}
</div>
