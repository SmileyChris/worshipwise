import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import LyricsAnalyzer from './LyricsAnalyzer.svelte';
import type { Church } from '$lib/types/church';
import { renderWithContext } from '../../../../tests/helpers/component-test-utils';
import { hasAIFeaturesEnabled } from '$lib/api/mistral-config';

// Mock environment
vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_MISTRAL_API_KEY: 'test-key'
	}
}));

// Mock the API modules
vi.mock('$lib/api/mistral', () => ({
	createMistralClient: vi.fn(() => ({
		analyzeLyrics: vi.fn()
	}))
}));

vi.mock('$lib/api/mistral-config', () => ({
	createChurchMistralClient: vi.fn(() =>
		Promise.resolve({
			analyzeLyrics: vi.fn()
		})
	),
	hasAIFeaturesEnabled: vi.fn()
}));

vi.mock('$lib/api/lyrics', () => ({
	createLyricsSearchClient: vi.fn(() => ({
		searchLyrics: vi.fn()
	})),
	validateLyricsContent: vi.fn(() => true)
}));

describe('LyricsAnalyzer Component', () => {
	const mockChurch: Church = {
		id: 'test-church',
		name: 'Test Church',
		slug: 'test-church',
		timezone: 'America/New_York',
		hemisphere: 'northern',
		subscription_type: 'free',
		subscription_status: 'active',
		max_users: 10,
		max_songs: 100,
		max_storage_mb: 1000,
		settings: {
			default_service_types: ['Sunday Morning'],
			week_start: 'sunday',
			repetition_window_days: 30,
			allow_member_song_creation: true,
			auto_approve_members: false,
			default_key_signatures: ['C', 'G', 'D'],
			mistral_api_key: 'test-api-key'
		},
		owner_user_id: 'test-user',
		is_active: true,
		created: '2024-01-01T00:00:00.000Z',
		updated: '2024-01-01T00:00:00.000Z'
	};

	const mockChurchWithoutAPI: Church = {
		...mockChurch,
		settings: {
			...mockChurch.settings,
			mistral_api_key: undefined
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock return values
		vi.mocked(hasAIFeaturesEnabled).mockResolvedValue(false);
	});

	it('should render with API key configured', async () => {
		// Mock AI features as enabled for this test
		vi.mocked(hasAIFeaturesEnabled).mockResolvedValue(true);

		renderWithContext(LyricsAnalyzer, {
			props: {
				title: 'Amazing Grace',
				artist: 'John Newton',
				lyrics: 'Amazing grace how sweet the sound',
				onAnalysisComplete: vi.fn()
			},
			currentChurch: mockChurch
		});

		expect(screen.getByText('AI Lyrics Analysis')).toBeInTheDocument();

		// Wait for the onMount to complete
		await vi.waitFor(() => {
			expect(screen.getByText('🎵 Analyze Lyrics')).toBeInTheDocument();
		});
	});

	it('should show API key required message when no key configured', () => {
		renderWithContext(LyricsAnalyzer, {
			props: {
				title: 'Amazing Grace',
				onAnalysisComplete: vi.fn()
			},
			currentChurch: mockChurchWithoutAPI
		});

		expect(screen.getByText('API Key Required')).toBeInTheDocument();
		expect(screen.getByText(/Configure your Mistral API key/)).toBeInTheDocument();
	});

	it('should disable analyze button when no title provided', () => {
		renderWithContext(LyricsAnalyzer, {
			props: {
				title: '',
				onAnalysisComplete: vi.fn()
			},
			currentChurch: mockChurch
		});

		// The analyze button should not be rendered when canAnalyze is false
		expect(screen.queryByText('🎵 Analyze Lyrics')).not.toBeInTheDocument();
	});

	it('should be disabled when disabled prop is true', () => {
		renderWithContext(LyricsAnalyzer, {
			props: {
				title: 'Amazing Grace',
				onAnalysisComplete: vi.fn(),
				disabled: true
			},
			currentChurch: mockChurch
		});

		// The analyze button should not be rendered when disabled
		expect(screen.queryByText('🎵 Analyze Lyrics')).not.toBeInTheDocument();
	});
});
