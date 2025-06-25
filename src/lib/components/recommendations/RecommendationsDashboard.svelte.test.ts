import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import RecommendationsDashboard from './RecommendationsDashboard.svelte';

// Mock the recommendations store with all required methods
vi.mock('$lib/stores/recommendations.svelte', () => ({
	recommendationsStore: {
		loadRecommendations: vi.fn().mockResolvedValue(undefined),
		loadSongRecommendations: vi.fn().mockResolvedValue(undefined),
		loadSeasonalTrends: vi.fn().mockResolvedValue(undefined),
		loadComparativePeriodAnalysis: vi.fn().mockResolvedValue(undefined),
		clearCache: vi.fn(),
		getSummaryInsights: vi.fn().mockReturnValue({
			totalRecommendations: 0,
			highestScore: 0,
			topCategory: 'Worship',
			needsAttention: []
		}),
		rotationRecommendations: vi.fn().mockReturnValue([]),
		seasonalRecommendations: vi.fn().mockReturnValue([]),
		getQuickRotationSuggestions: vi.fn().mockReturnValue([]),
		highPriorityFlowSuggestions: [],
		recommendations: [],
		songRecommendations: [],
		worshipFlow: [],
		serviceBalance: null,
		seasonalTrends: [],
		isLoading: false,
		error: null,
		lastUpdated: null
	}
}));

describe('RecommendationsDashboard - Basic Rendering', () => {
	it('should render the dashboard', () => {
		render(RecommendationsDashboard);

		expect(screen.getByText('Worship Insights')).toBeInTheDocument();
	});
});
