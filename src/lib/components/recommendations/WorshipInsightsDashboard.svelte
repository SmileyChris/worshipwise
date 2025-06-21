<script lang="ts">
	import { onMount } from 'svelte';
	import { recommendationsStore } from '$lib/stores/recommendations.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { 
		Brain, 
		TrendingUp, 
		Users, 
		Calendar, 
		AlertTriangle, 
		CheckCircle, 
		BarChart3,
		Music,
		RefreshCw,
		Lightbulb
	} from 'lucide-svelte';

	onMount(async () => {
		await recommendationsStore.loadWorshipInsights();
	});

	async function refreshInsights() {
		await recommendationsStore.loadWorshipInsights();
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
			case 'good': return 'text-primary bg-primary/5 border-primary/20';
			case 'needs_attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'critical': return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'excellent': return CheckCircle;
			case 'good': return CheckCircle;
			case 'needs_attention': return AlertTriangle;
			case 'critical': return AlertTriangle;
			default: return BarChart3;
		}
	}

	function getDiversityColor(percentage: number) {
		if (percentage >= 80) return 'text-green-600';
		if (percentage >= 60) return 'text-yellow-600';
		return 'text-red-600';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold font-title text-gray-900 flex items-center gap-3">
				<Brain class="h-8 w-8 text-purple-600" />
				AI Worship Insights
			</h1>
			<p class="text-gray-600">Comprehensive analysis and intelligent recommendations for your worship ministry</p>
		</div>
		
		<Button onclick={refreshInsights} disabled={recommendationsStore.loading}>
			<RefreshCw class={`h-4 w-4 mr-2 ${recommendationsStore.loading ? 'animate-spin' : ''}`} />
			Refresh Analysis
		</Button>
	</div>

	<!-- Loading State -->
	{#if recommendationsStore.loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Analyzing worship patterns...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if recommendationsStore.error}
		<Card class="bg-red-50 border-red-200">
			<p class="text-red-800">Error: {recommendationsStore.error}</p>
		</Card>
	{/if}

	<!-- Insights Content -->
	{#if !recommendationsStore.loading && !recommendationsStore.error && recommendationsStore.worshipInsights}
		{@const insights = recommendationsStore.worshipInsights}
		
		<!-- Overview Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Rotation Health -->
			<Card class={`border-2 ${getStatusColor(insights.rotationHealth.status)}`}>
				<div class="flex items-center justify-between mb-3">
					<svelte:component this={getStatusIcon(insights.rotationHealth.status)} class="h-6 w-6" />
					<Badge variant={insights.rotationHealth.status === 'excellent' ? 'success' : 
							insights.rotationHealth.status === 'good' ? 'default' : 
							insights.rotationHealth.status === 'needs_attention' ? 'warning' : 'danger'}>
						{insights.rotationHealth.score}/100
					</Badge>
				</div>
				<h3 class="font-semibold font-title text-gray-900">Rotation Health</h3>
				<p class="text-sm text-gray-600 capitalize">{insights.rotationHealth.status.replace('_', ' ')}</p>
			</Card>

			<!-- Key Diversity -->
			<Card>
				<div class="flex items-center justify-between mb-3">
					<Music class="h-6 w-6 text-primary" />
					<Badge class={getDiversityColor(insights.diversityAnalysis.keyDiversity)}>
						{insights.diversityAnalysis.keyDiversity}%
					</Badge>
				</div>
				<h3 class="font-semibold font-title text-gray-900">Key Diversity</h3>
				<p class="text-sm text-gray-600">Musical variety</p>
			</Card>

			<!-- Congregation Engagement -->
			<Card>
				<div class="flex items-center justify-between mb-3">
					<Users class="h-6 w-6 text-green-600" />
					<Badge>{insights.congregationEngagement.familiarSongs}</Badge>
				</div>
				<h3 class="font-semibold font-title text-gray-900">Familiar Songs</h3>
				<p class="text-sm text-gray-600">Well-known by congregation</p>
			</Card>

			<!-- Seasonal Readiness -->
			<Card>
				<div class="flex items-center justify-between mb-3">
					<Calendar class="h-6 w-6 text-orange-600" />
					<Badge>{insights.seasonalReadiness.currentSeasonAlignment}%</Badge>
				</div>
				<h3 class="font-semibold font-title text-gray-900">Season Alignment</h3>
				<p class="text-sm text-gray-600">Current season fit</p>
			</Card>
		</div>

		<!-- Detailed Analysis -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Rotation Health Details -->
			<Card>
				<div class="flex items-center gap-3 mb-4">
					<TrendingUp class="h-5 w-5 text-primary" />
					<h3 class="text-lg font-semibold font-title">Rotation Health Analysis</h3>
				</div>
				
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-gray-600">Overall Score</span>
						<div class="flex items-center gap-2">
							<div class="w-20 bg-gray-200 rounded-full h-2">
								<div 
									class={`h-2 rounded-full ${
										insights.rotationHealth.status === 'excellent' ? 'bg-green-500' :
										insights.rotationHealth.status === 'good' ? 'bg-primary' :
										insights.rotationHealth.status === 'needs_attention' ? 'bg-yellow-500' : 'bg-red-500'
									}`}
									style={`width: ${insights.rotationHealth.score}%`}
								></div>
							</div>
							<span class="font-medium">{insights.rotationHealth.score}/100</span>
						</div>
					</div>

					{#if insights.rotationHealth.insights.length > 0}
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Key Insights</h4>
							<ul class="space-y-1">
								{#each insights.rotationHealth.insights as insight}
									<li class="text-sm text-gray-600">• {insight}</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if insights.rotationHealth.recommendations.length > 0}
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Recommendations</h4>
							<ul class="space-y-1">
								{#each insights.rotationHealth.recommendations as recommendation}
									<li class="text-sm text-primary">• {recommendation}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Diversity Analysis -->
			<Card>
				<div class="flex items-center gap-3 mb-4">
					<BarChart3 class="h-5 w-5 text-green-600" />
					<h3 class="text-lg font-semibold font-title">Musical Diversity</h3>
				</div>
				
				<div class="space-y-4">
					<div class="space-y-3">
						{#each [
							{ label: 'Key Diversity', value: insights.diversityAnalysis.keyDiversity, color: 'bg-primary' },
							{ label: 'Tempo Balance', value: insights.diversityAnalysis.tempoDiversity, color: 'bg-green-500' },
							{ label: 'Artist Variety', value: insights.diversityAnalysis.artistDiversity, color: 'bg-purple-500' }
						] as metric}
							<div>
								<div class="flex justify-between items-center mb-1">
									<span class="text-sm text-gray-600">{metric.label}</span>
									<span class="text-sm font-medium">{metric.value}%</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div 
										class={`h-2 rounded-full ${metric.color}`}
										style={`width: ${metric.value}%`}
									></div>
								</div>
							</div>
						{/each}
					</div>

					{#if insights.diversityAnalysis.recommendations.length > 0}
						<div class="pt-3 border-t">
							<h4 class="font-medium text-gray-900 mb-2">Improvement Areas</h4>
							<ul class="space-y-1">
								{#each insights.diversityAnalysis.recommendations as recommendation}
									<li class="text-sm text-green-600">• {recommendation}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Congregation Engagement -->
			<Card>
				<div class="flex items-center gap-3 mb-4">
					<Users class="h-5 w-5 text-purple-600" />
					<h3 class="text-lg font-semibold font-title">Congregation Engagement</h3>
				</div>
				
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4 text-center">
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="text-2xl font-bold text-purple-600">
								{insights.congregationEngagement.familiarSongs}
							</div>
							<div class="text-xs text-gray-600">Familiar Songs</div>
						</div>
						
						<div class="bg-gray-50 rounded-lg p-3">
							<div class="text-2xl font-bold text-primary">
								{insights.congregationEngagement.newSongIntroductionRate}
							</div>
							<div class="text-xs text-gray-600">New Songs (6mo)</div>
						</div>
						
						<div class="bg-gray-50 rounded-lg p-3 col-span-2">
							<div class="text-2xl font-bold text-green-600">
								{insights.congregationEngagement.optimalRotationCandidates}
							</div>
							<div class="text-xs text-gray-600">Ready for Rotation</div>
						</div>
					</div>

					{#if insights.congregationEngagement.insights.length > 0}
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Engagement Insights</h4>
							<ul class="space-y-1">
								{#each insights.congregationEngagement.insights as insight}
									<li class="text-sm text-purple-600">• {insight}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Seasonal Readiness -->
			<Card>
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-3">
						<Calendar class="h-5 w-5 text-orange-600" />
						<h3 class="text-lg font-semibold font-title">Seasonal Readiness</h3>
					</div>
					{#if insights.seasonalReadiness.context}
						<div class="text-xs text-gray-500">
							<div>{insights.seasonalReadiness.context.hemisphere === 'southern' ? '🌏 Southern' : '🌍 Northern'} Hemisphere</div>
							<div>{insights.seasonalReadiness.context.timezone}</div>
						</div>
					{/if}
				</div>
				
				<div class="space-y-4">
					<div class="space-y-3">
						<div>
							<div class="flex justify-between items-center mb-1">
								<span class="text-sm text-gray-600">Current Season</span>
								<span class="text-sm font-medium">{insights.seasonalReadiness.currentSeasonAlignment}%</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-2">
								<div 
									class="h-2 rounded-full bg-orange-500"
									style={`width: ${insights.seasonalReadiness.currentSeasonAlignment}%`}
								></div>
							</div>
						</div>
						
						<div>
							<div class="flex justify-between items-center mb-1">
								<span class="text-sm text-gray-600">Next Season Prep</span>
								<span class="text-sm font-medium">{insights.seasonalReadiness.upcomingSeasonPreparation}%</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-2">
								<div 
									class="h-2 rounded-full bg-yellow-500"
									style={`width: ${insights.seasonalReadiness.upcomingSeasonPreparation}%`}
								></div>
							</div>
						</div>
					</div>

					{#if insights.seasonalReadiness.seasonalSuggestions.length > 0}
						<div>
							<h4 class="font-medium text-gray-900 mb-2">Seasonal Actions</h4>
							<ul class="space-y-1">
								{#each insights.seasonalReadiness.seasonalSuggestions as suggestion}
									<li class="text-sm text-orange-600">• {suggestion}</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if insights.seasonalReadiness.context}
						<div class="pt-3 border-t text-xs text-gray-600">
							<p>
								🌍 Analysis considers your organization's location in the <strong>{insights.seasonalReadiness.context.hemisphere}</strong> hemisphere.
								Current season: <strong>{insights.seasonalReadiness.context.currentSeason}</strong>
								{#if insights.seasonalReadiness.context.upcomingSeason}
									→ {insights.seasonalReadiness.context.upcomingSeason}
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Action Items Summary -->
		<Card class="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
			<div class="flex items-start gap-3">
				<Lightbulb class="h-6 w-6 text-purple-600 mt-0.5" />
				<div class="flex-1">
					<h3 class="text-lg font-semibold font-title text-gray-900 mb-3">Recommended Actions</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- High Priority Actions -->
						{#if insights.rotationHealth.status === 'critical' || insights.rotationHealth.status === 'needs_attention'}
							<div>
								<h4 class="font-medium text-red-800 mb-2">🚨 High Priority</h4>
								<ul class="space-y-1">
									{#each insights.rotationHealth.recommendations as rec}
										<li class="text-sm text-red-700">• {rec}</li>
									{/each}
								</ul>
							</div>
						{/if}
						
						<!-- Medium Priority Actions -->
						<div>
							<h4 class="font-medium text-yellow-800 mb-2">⚡ Medium Priority</h4>
							<ul class="space-y-1">
								{#each insights.diversityAnalysis.recommendations.slice(0, 2) as rec}
									<li class="text-sm text-yellow-700">• {rec}</li>
								{/each}
								{#each insights.seasonalReadiness.seasonalSuggestions.slice(0, 1) as rec}
									<li class="text-sm text-yellow-700">• {rec}</li>
								{/each}
							</ul>
						</div>
					</div>
					
					<div class="mt-4 pt-4 border-t border-purple-200">
						<p class="text-sm text-purple-700">
							💡 These insights are generated from your worship usage patterns and can help optimize your song rotation for better congregation engagement.
						</p>
					</div>
				</div>
			</div>
		</Card>
	{/if}
</div>