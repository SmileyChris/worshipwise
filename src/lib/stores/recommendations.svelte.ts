import {
	recommendationsApi,
	type SongRecommendation,
	type WorshipFlowSuggestion,
	type ServiceBalanceAnalysis,
	type SeasonalTrend,
	type ComparativePeriod
} from '$lib/api/recommendations';

class RecommendationsStore {
	// Loading states
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	// Recommendations data
	songRecommendations = $state<SongRecommendation[]>([]);
	worshipFlowSuggestions = $state<WorshipFlowSuggestion[]>([]);
	serviceBalanceAnalysis = $state<ServiceBalanceAnalysis | null>(null);
	seasonalTrends = $state<SeasonalTrend[]>([]);
	comparativePeriod = $state<ComparativePeriod | null>(null);

	// Filter preferences
	recommendationFilters = $state<{
		excludeRecentDays: number;
		serviceType?: string;
		worshipLeaderId?: string;
		limit: number;
	}>({
		excludeRecentDays: 28,
		limit: 10
	});

	// Derived state
	rotationRecommendations = $derived(() => 
		this.songRecommendations.filter(r => r.type === 'rotation')
	);

	seasonalRecommendations = $derived(() => 
		this.songRecommendations.filter(r => r.type === 'seasonal')
	);

	flowRecommendations = $derived(() => 
		this.songRecommendations.filter(r => r.type === 'flow')
	);

	keyCompatibilityRecommendations = $derived(() => 
		this.songRecommendations.filter(r => r.type === 'key_compatibility')
	);

	highPriorityFlowSuggestions = $derived(() => 
		this.worshipFlowSuggestions.filter(s => 
			s.reason.includes('Large tempo change') || 
			s.reason.includes('difficult')
		)
	);

	/**
	 * Load song recommendations based on current filters
	 */
	async loadSongRecommendations() {
		this.loading = true;
		this.error = null;

		try {
			this.songRecommendations = await recommendationsApi.getSongRecommendations(
				this.recommendationFilters
			);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load recommendations';
			console.error('Failed to load song recommendations:', error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load worship flow suggestions for a specific service
	 */
	async loadWorshipFlowSuggestions(serviceId?: string) {
		this.loading = true;
		this.error = null;

		try {
			this.worshipFlowSuggestions = await recommendationsApi.getWorshipFlowSuggestions(serviceId);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load flow suggestions';
			console.error('Failed to load worship flow suggestions:', error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Analyze service balance for a service
	 */
	async analyzeServiceBalance(serviceId: string) {
		this.loading = true;
		this.error = null;

		try {
			this.serviceBalanceAnalysis = await recommendationsApi.analyzeServiceBalance(serviceId);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to analyze service balance';
			console.error('Failed to analyze service balance:', error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load seasonal trends
	 */
	async loadSeasonalTrends(year?: number) {
		this.loading = true;
		this.error = null;

		try {
			this.seasonalTrends = await recommendationsApi.getSeasonalTrends(year);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load seasonal trends';
			console.error('Failed to load seasonal trends:', error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load comparative period analysis
	 */
	async loadComparativePeriodAnalysis(
		currentStart: Date,
		currentEnd: Date,
		periodType: 'month' | 'quarter' | 'year' = 'month'
	) {
		this.loading = true;
		this.error = null;

		try {
			this.comparativePeriod = await recommendationsApi.getComparativePeriodAnalysis(
				currentStart,
				currentEnd,
				periodType
			);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Failed to load comparative analysis';
			console.error('Failed to load comparative analysis:', error);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update recommendation filters
	 */
	updateFilters(newFilters: Partial<typeof this.recommendationFilters>) {
		this.recommendationFilters = { ...this.recommendationFilters, ...newFilters };
	}

	/**
	 * Get recommendations for a specific worship leader
	 */
	async getPersonalizedRecommendations(worshipLeaderId: string) {
		this.updateFilters({ worshipLeaderId });
		await this.loadSongRecommendations();
	}

	/**
	 * Get quick rotation suggestions (most urgent)
	 */
	getQuickRotationSuggestions(count: number = 5): SongRecommendation[] {
		return this.rotationRecommendations()
			.sort((a, b) => {
				// Prioritize songs that haven't been used in longer time
				const aDays = a.metadata?.daysSinceLastUse || 0;
				const bDays = b.metadata?.daysSinceLastUse || 0;
				return bDays - aDays;
			})
			.slice(0, count);
	}

	/**
	 * Get current season recommendations
	 */
	getCurrentSeasonRecommendations(): SongRecommendation[] {
		return this.seasonalRecommendations().filter(r => r.score > 0.7);
	}

	/**
	 * Check if service balance needs attention
	 */
	needsBalanceAttention(): boolean {
		if (!this.serviceBalanceAnalysis) return false;
		return this.serviceBalanceAnalysis.recommendations.length > 0;
	}

	/**
	 * Get summary insights across all recommendation types
	 */
	getSummaryInsights(): string[] {
		const insights: string[] = [];

		// Rotation insights
		const overdueSongs = this.rotationRecommendations().filter(r => 
			r.metadata?.daysSinceLastUse > 60
		);
		if (overdueSongs.length > 0) {
			insights.push(`${overdueSongs.length} songs haven't been used in over 2 months`);
		}

		const newSongs = this.rotationRecommendations().filter(r => r.metadata?.isNew);
		if (newSongs.length > 0) {
			insights.push(`${newSongs.length} new songs ready to be introduced`);
		}

		// Flow insights
		const criticalFlowIssues = this.highPriorityFlowSuggestions.length;
		if (criticalFlowIssues > 0) {
			insights.push(`${criticalFlowIssues} worship flow issues detected`);
		}

		// Balance insights
		if (this.serviceBalanceAnalysis?.recommendations.length) {
			insights.push('Service tempo balance could be improved');
		}

		// Seasonal insights
		const seasonalSongs = this.getCurrentSeasonRecommendations();
		if (seasonalSongs.length > 0) {
			insights.push(`${seasonalSongs.length} songs perfect for current season`);
		}

		return insights;
	}

	/**
	 * Clear all data
	 */
	clear() {
		this.songRecommendations = [];
		this.worshipFlowSuggestions = [];
		this.serviceBalanceAnalysis = null;
		this.seasonalTrends = [];
		this.comparativePeriod = null;
		this.error = null;
	}
}

export const recommendationsStore = new RecommendationsStore();