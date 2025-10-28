import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import SongRatingButton from './SongRatingButton.svelte';
import type { Song } from '$lib/types/song';
import { mockAuthContext } from '$tests/helpers/mock-builders';

// Mock the API modules
vi.mock('$lib/api/ratings', () => ({
	createRatingsAPI: vi.fn(() => ({
		getUserRating: vi.fn(),
		getAggregateRatings: vi.fn(),
		setRating: vi.fn(),
		deleteRating: vi.fn(),
		shouldAutoRetire: vi.fn()
	}))
}));

vi.mock('$lib/context/stores.svelte', () => ({
	getAuthStore: vi.fn(() => ({
		getAuthContext: () =>
			mockAuthContext({
				user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
				church: { id: 'church-1', name: 'Test Church' },
				membership: { church_id: 'church-1' }
			})
	}))
}));

// Import mocked modules
import { createRatingsAPI } from '$lib/api/ratings';

describe('SongRatingButton', () => {
	const mockSong: Song = {
		id: 'song-1',
		title: 'Amazing Grace',
		church_id: 'church-1',
		category: 'category-1',
		created_by: 'user-1',
		is_active: true,
		created: '2024-01-01',
		updated: '2024-01-01'
	};

	let mockRatingsAPI: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRatingsAPI = {
			getUserRating: vi.fn().mockResolvedValue(null),
			getAggregateRatings: vi.fn().mockResolvedValue({
				thumbsUp: 0,
				neutral: 0,
				thumbsDown: 0,
				totalRatings: 0,
				difficultCount: 0
			}),
			setRating: vi.fn().mockResolvedValue(undefined),
			deleteRating: vi.fn().mockResolvedValue(undefined),
			shouldAutoRetire: vi.fn().mockResolvedValue(false)
		};

		// Set up the mock to return our API
		(createRatingsAPI as any).mockReturnValue(mockRatingsAPI);

		// Reset mock implementations
		mockRatingsAPI.getUserRating.mockResolvedValue(null);
		mockRatingsAPI.getAggregateRatings.mockResolvedValue({
			thumbsUp: 0,
			neutral: 0,
			thumbsDown: 0,
			totalRatings: 0,
			difficultCount: 0
		});
	});

	it('should render rating buttons', () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		expect(getByTitle('I like this song')).toBeInTheDocument();
		expect(getByTitle('Neutral')).toBeInTheDocument();
		expect(getByTitle('I would not use this song')).toBeInTheDocument();
	});

	it('should load and display user rating', async () => {
		mockRatingsAPI.getUserRating.mockResolvedValue({
			rating: 'thumbs_up',
			is_difficult: false
		});

		const { container } = render(SongRatingButton, { song: mockSong });

		await waitFor(() => {
			const thumbsUpBtn = container.querySelector('[title="I like this song"]');
			expect(thumbsUpBtn).toHaveClass('active');
		});
	});

	it('should display aggregate ratings when showAggregates is true', async () => {
		mockRatingsAPI.getAggregateRatings.mockResolvedValue({
			thumbsUp: 5,
			neutral: 2,
			thumbsDown: 1,
			totalRatings: 8,
			difficultCount: 3
		});

		const { getByText } = render(SongRatingButton, {
			song: mockSong,
			showAggregates: true
		});

		await waitFor(() => {
			expect(getByText('👍 5')).toBeInTheDocument();
			expect(getByText('👎 1')).toBeInTheDocument();
			expect(getByText('🎵 3')).toBeInTheDocument();
		});
	});

	it('should toggle rating when clicking the same button', async () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const thumbsUpBtn = getByTitle('I like this song');

		// First click - set rating
		await fireEvent.click(thumbsUpBtn);
		expect(mockRatingsAPI.setRating).toHaveBeenCalledWith(mockSong.id, {
			song_id: mockSong.id,
			rating: 'thumbs_up',
			is_difficult: false
		});

		// Second click - remove rating
		mockRatingsAPI.getUserRating.mockResolvedValue({ rating: 'thumbs_up' });
		await fireEvent.click(thumbsUpBtn);
		expect(mockRatingsAPI.deleteRating).toHaveBeenCalledWith(mockSong.id);
	});

	it('should show difficulty checkbox when rating is set', async () => {
		mockRatingsAPI.getUserRating.mockResolvedValue({
			rating: 'thumbs_up',
			is_difficult: false
		});

		const { getByLabelText } = render(SongRatingButton, { song: mockSong });

		await waitFor(() => {
			expect(getByLabelText('Difficult')).toBeInTheDocument();
		});
	});

	it('should check for auto-retire when rating thumbs down', async () => {
		mockRatingsAPI.shouldAutoRetire.mockResolvedValue(true);

		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		// Mock window.dispatchEvent
		const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

		const thumbsDownBtn = getByTitle('I would not use this song');
		await fireEvent.click(thumbsDownBtn);

		await waitFor(() => {
			expect(mockRatingsAPI.shouldAutoRetire).toHaveBeenCalledWith(mockSong.id);
			expect(dispatchEventSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'song-auto-retire',
					detail: { songId: mockSong.id }
				})
			);
		});
	});

	it('should not check auto-retire for other ratings', async () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const neutralBtn = getByTitle('Neutral');
		await fireEvent.click(neutralBtn);

		expect(mockRatingsAPI.shouldAutoRetire).not.toHaveBeenCalled();
	});

	it('should handle rating change callback', async () => {
		const onRatingChange = vi.fn();
		const { getByTitle } = render(SongRatingButton, {
			song: mockSong,
			onRatingChange
		});

		const thumbsUpBtn = getByTitle('I like this song');
		await fireEvent.click(thumbsUpBtn);

		await waitFor(() => {
			expect(onRatingChange).toHaveBeenCalledWith('thumbs_up');
		});
	});

	it('should disable buttons while saving', async () => {
		// Make setRating take some time
		mockRatingsAPI.setRating.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100))
		);

		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const thumbsUpBtn = getByTitle('I like this song');
		fireEvent.click(thumbsUpBtn);

		// Buttons should be disabled while saving
		expect(thumbsUpBtn).toBeDisabled();
		expect(getByTitle('Neutral')).toBeDisabled();
		expect(getByTitle('I would not use this song')).toBeDisabled();

		// Wait for save to complete
		await waitFor(() => {
			expect(thumbsUpBtn).not.toBeDisabled();
		});
	});
});
