import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import SongRatingButton from './SongRatingButton.svelte';
import type { Song } from '$lib/types/song';
import { mockAuthContext } from '$tests/helpers/mock-builders';

// Mock songs store
const mockSongsStore = {
	setSongRating: vi.fn().mockResolvedValue(undefined),
	deleteSongRating: vi.fn().mockResolvedValue(undefined)
};

vi.mock('$lib/context/stores.svelte', () => ({
	getAuthStore: vi.fn(() => ({
		getAuthContext: () =>
			mockAuthContext({
				user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
				church: { id: 'church-1', name: 'Test Church' },
				membership: { church_id: 'church-1' }
			})
	})),
	getSongsStore: vi.fn(() => mockSongsStore)
}));

describe('SongRatingButton', () => {
	const mockSong: Song = {
		id: 'song-1',
		title: 'Amazing Grace',
		church_id: 'church-1',

		created_by: 'user-1',
		is_active: true,
		created: '2024-01-01',
		updated: '2024-01-01'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockSongsStore.setSongRating.mockResolvedValue(undefined);
		mockSongsStore.deleteSongRating.mockResolvedValue(undefined);
	});

	it('should render rating buttons', () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		expect(getByTitle('I like this song')).toBeInTheDocument();
		expect(getByTitle('Neutral')).toBeInTheDocument();
		expect(getByTitle('I would not use this song')).toBeInTheDocument();
	});

	it('should display user rating from props', async () => {
		const userRating = {
			rating: 'thumbs_up' as const,
			is_difficult: false
		};

		const { container } = render(SongRatingButton, {
			song: mockSong,
			userRating
		});

		await waitFor(() => {
			const thumbsUpBtn = container.querySelector('[title="I like this song"]');
			expect(thumbsUpBtn).toHaveClass('active');
		});
	});

	it('should render without aggregate ratings', () => {
		const { queryByText } = render(SongRatingButton, {
			song: mockSong,
			showAggregates: true
		});

		// Component no longer displays aggregate ratings
		expect(queryByText(/👍 \d+/)).not.toBeInTheDocument();
		expect(queryByText(/👎 \d+/)).not.toBeInTheDocument();
	});

	it('should set rating when clicking thumbs up', async () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const thumbsUpBtn = getByTitle('I like this song');

		await fireEvent.click(thumbsUpBtn);

		await waitFor(() => {
			expect(mockSongsStore.setSongRating).toHaveBeenCalledWith(mockSong.id, {
				rating: 'thumbs_up',
				is_difficult: false
			});
		});
	});

	it('should delete rating when clicking the same button twice', async () => {
		// Start with an existing rating
		const { getByTitle } = render(SongRatingButton, {
			song: mockSong,
			userRating: { rating: 'thumbs_up', is_difficult: false }
		});

		// Click the already-active thumbs up to remove it
		const thumbsUpBtn = getByTitle('I like this song');
		await fireEvent.click(thumbsUpBtn);

		await waitFor(() => {
			expect(mockSongsStore.deleteSongRating).toHaveBeenCalledWith(mockSong.id);
		});
	});

	it('should show difficulty button when rating is set', async () => {
		const userRating = {
			rating: 'thumbs_up' as const,
			is_difficult: false
		};

		const { container } = render(SongRatingButton, {
			song: mockSong,
			userRating
		});

		// Hover to show expanded options
		const ratingContainer = container.querySelector('.song-rating-container');
		expect(ratingContainer).toBeInTheDocument();

		// Look for difficulty button in expanded options
		const difficultyBtn = container.querySelector('.difficulty-btn');
		expect(difficultyBtn).toBeInTheDocument();
	});

	it('should allow rating thumbs down', async () => {
		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const thumbsDownBtn = getByTitle('I would not use this song');
		await fireEvent.click(thumbsDownBtn);

		await waitFor(() => {
			expect(mockSongsStore.setSongRating).toHaveBeenCalledWith(mockSong.id, {
				rating: 'thumbs_down',
				is_difficult: false
			});
		});
	});

	it('should disable buttons while saving', async () => {
		// Make setSongRating take some time
		mockSongsStore.setSongRating.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100))
		);

		const { getByTitle } = render(SongRatingButton, { song: mockSong });

		const thumbsUpBtn = getByTitle('I like this song');
		fireEvent.click(thumbsUpBtn);

		// Buttons should be disabled while saving
		await waitFor(() => {
			expect(thumbsUpBtn).toBeDisabled();
		});

		// Wait for save to complete
		await waitFor(
			() => {
				expect(thumbsUpBtn).not.toBeDisabled();
			},
			{ timeout: 200 }
		);
	});

	it('should render with ratingsLoading prop', () => {
		// Component accepts ratingsLoading prop for loading state display
		const { container } = render(SongRatingButton, {
			song: mockSong,
			ratingsLoading: true
		});

		// Component should render without error
		expect(container.querySelector('.song-rating-container')).toBeInTheDocument();
	});
});
