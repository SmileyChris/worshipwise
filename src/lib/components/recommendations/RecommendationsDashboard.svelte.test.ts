import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import RecommendationsDashboard from './RecommendationsDashboard.svelte';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { mockChurch } from '../../../../tests/helpers/mock-builders';

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
		const testChurch = mockChurch({ id: 'church1', name: 'Test Church' });
		renderWithContext(RecommendationsDashboard, {
			currentChurch: testChurch
		});

		expect(screen.getByText('Worship Insights')).toBeInTheDocument();
	});
});
