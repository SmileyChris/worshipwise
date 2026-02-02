import { describe, it, expect } from 'vitest';
import {
	getSeasonForMonth,
	getSeasonDisplayName,
	getSeasonalKeywords,
	songMatchesSeason,
	areKeysCompatible,
	scoreKeyCompatibility,
	categorizeTempo,
	scoreTempoFlow,
	scoreFreshness,
	calculateFamiliarity,
	categorizeFamiliarity,
	getFamiliarityDescription,
	FAMILIARITY_THRESHOLDS,
	applyPreferenceModifiers,
	scoreSong,
	detectMood,
	generateSuggestions,
	type Season,
	type UserPreferences,
	type FamiliarityLevel
} from './suggestion-engine';
import type { Song } from '$lib/types/song';

// Helper to create mock songs
function mockSong(overrides: Partial<Song> = {}): Song {
	return {
		id: 'song-1',
		title: 'Test Song',
		church_id: 'church-1',
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
		...overrides
	} as Song;
}

describe('suggestion-engine', () => {
	describe('getSeasonForMonth', () => {
		describe('Northern Hemisphere', () => {
			it('should return winter for December, January, February', () => {
				expect(getSeasonForMonth(12, 'northern')).toBe('winter');
				expect(getSeasonForMonth(1, 'northern')).toBe('winter');
				expect(getSeasonForMonth(2, 'northern')).toBe('winter');
			});

			it('should return spring for March, April, May', () => {
				expect(getSeasonForMonth(3, 'northern')).toBe('spring');
				expect(getSeasonForMonth(4, 'northern')).toBe('spring');
				expect(getSeasonForMonth(5, 'northern')).toBe('spring');
			});

			it('should return summer for June, July, August', () => {
				expect(getSeasonForMonth(6, 'northern')).toBe('summer');
				expect(getSeasonForMonth(7, 'northern')).toBe('summer');
				expect(getSeasonForMonth(8, 'northern')).toBe('summer');
			});

			it('should return fall for September, October, November', () => {
				expect(getSeasonForMonth(9, 'northern')).toBe('fall');
				expect(getSeasonForMonth(10, 'northern')).toBe('fall');
				expect(getSeasonForMonth(11, 'northern')).toBe('fall');
			});
		});

		describe('Southern Hemisphere (e.g., New Zealand)', () => {
			it('should return summer for December, January, February', () => {
				// This is the key bug fix - February in NZ should be SUMMER, not winter
				expect(getSeasonForMonth(12, 'southern')).toBe('summer');
				expect(getSeasonForMonth(1, 'southern')).toBe('summer');
				expect(getSeasonForMonth(2, 'southern')).toBe('summer');
			});

			it('should return fall for March, April, May', () => {
				expect(getSeasonForMonth(3, 'southern')).toBe('fall');
				expect(getSeasonForMonth(4, 'southern')).toBe('fall');
				expect(getSeasonForMonth(5, 'southern')).toBe('fall');
			});

			it('should return winter for June, July, August', () => {
				expect(getSeasonForMonth(6, 'southern')).toBe('winter');
				expect(getSeasonForMonth(7, 'southern')).toBe('winter');
				expect(getSeasonForMonth(8, 'southern')).toBe('winter');
			});

			it('should return spring for September, October, November', () => {
				expect(getSeasonForMonth(9, 'southern')).toBe('spring');
				expect(getSeasonForMonth(10, 'southern')).toBe('spring');
				expect(getSeasonForMonth(11, 'southern')).toBe('spring');
			});
		});

		it('should default to northern hemisphere', () => {
			expect(getSeasonForMonth(1)).toBe('winter');
			expect(getSeasonForMonth(7)).toBe('summer');
		});
	});

	describe('getSeasonDisplayName', () => {
		it('should return display names for all seasons', () => {
			expect(getSeasonDisplayName('spring')).toBe('Spring');
			expect(getSeasonDisplayName('summer')).toBe('Summer');
			expect(getSeasonDisplayName('fall')).toBe('Fall/Autumn');
			expect(getSeasonDisplayName('winter')).toBe('Winter');
		});
	});

	describe('getSeasonalKeywords', () => {
		it('should return Christmas keywords for December/January regardless of hemisphere', () => {
			const northernDec = getSeasonalKeywords(12, 'northern');
			const southernDec = getSeasonalKeywords(12, 'southern');

			// Christmas keywords are date-fixed, not hemisphere-dependent
			expect(northernDec).toContain('christmas');
			expect(southernDec).toContain('christmas');
			expect(northernDec).toContain('advent');
			expect(southernDec).toContain('advent');
		});

		it('should return Easter keywords for March/April regardless of hemisphere', () => {
			const northernMar = getSeasonalKeywords(3, 'northern');
			const southernMar = getSeasonalKeywords(3, 'southern');

			expect(northernMar).toContain('easter');
			expect(southernMar).toContain('easter');
			expect(northernMar).toContain('resurrection');
			expect(southernMar).toContain('resurrection');
		});

		it('should return summer keywords for July in northern hemisphere', () => {
			const keywords = getSeasonalKeywords(7, 'northern');
			expect(keywords).toContain('summer');
			expect(keywords).toContain('sunshine');
			// Should NOT contain generic worship words
			expect(keywords).not.toContain('joy');
			expect(keywords).not.toContain('praise');
		});

		it('should return winter keywords for July in southern hemisphere', () => {
			const keywords = getSeasonalKeywords(7, 'southern');
			expect(keywords).toContain('winter');
			expect(keywords).toContain('snow');
			// Should NOT contain generic words
			expect(keywords).not.toContain('peace');
		});

		it('should return summer keywords for February in southern hemisphere', () => {
			// This tests the hemisphere bug fix
			const keywords = getSeasonalKeywords(2, 'southern');
			expect(keywords).toContain('summer');
			expect(keywords).not.toContain('winter');
		});

		it('should NOT include generic worship words in seasonal keywords', () => {
			// These words appear in almost every worship song and should not trigger seasonal matches
			const genericWords = ['joy', 'glory', 'light', 'praise', 'hope', 'peace', 'love'];

			// Check all seasons in both hemispheres
			for (const month of [2, 5, 8, 11]) {
				for (const hemisphere of ['northern', 'southern'] as const) {
					const keywords = getSeasonalKeywords(month, hemisphere);
					for (const word of genericWords) {
						expect(keywords).not.toContain(word);
					}
				}
			}
		});
	});

	describe('songMatchesSeason', () => {
		it('should match song by title', () => {
			const song = mockSong({ title: 'Joy to the World - Christmas Carol' });
			const result = songMatchesSeason(song, 12, 'northern');

			expect(result.matches).toBe(true);
			expect(result.matchedKeywords).toContain('christmas');
		});

		it('should match song by tags', () => {
			const song = mockSong({ tags: ['easter', 'resurrection'] });
			const result = songMatchesSeason(song, 4, 'northern');

			expect(result.matches).toBe(true);
			expect(result.matchedKeywords).toContain('easter');
		});

		it('should match song by lyrics', () => {
			const song = mockSong({ lyrics: 'He is risen, alleluia!' });
			const result = songMatchesSeason(song, 4, 'northern');

			expect(result.matches).toBe(true);
			expect(result.matchedKeywords).toContain('risen');
		});

		it('should not match unrelated song', () => {
			const song = mockSong({ title: 'Amazing Grace', notes: 'Classic hymn' });
			const result = songMatchesSeason(song, 12, 'northern');

			expect(result.matches).toBe(false);
			expect(result.matchedKeywords).toHaveLength(0);
		});
	});

	describe('areKeysCompatible', () => {
		it('should consider same keys compatible', () => {
			expect(areKeysCompatible('C', 'C')).toBe(true);
			expect(areKeysCompatible('G', 'G')).toBe(true);
		});

		it('should consider adjacent keys on circle of fifths compatible', () => {
			// C -> G (1 step)
			expect(areKeysCompatible('C', 'G')).toBe(true);
			// C -> F (1 step other direction)
			expect(areKeysCompatible('C', 'F')).toBe(true);
			// C -> D (2 steps)
			expect(areKeysCompatible('C', 'D')).toBe(true);
		});

		it('should consider distant keys incompatible', () => {
			// C -> F# (6 steps - opposite side of circle)
			expect(areKeysCompatible('C', 'F#')).toBe(false);
		});

		it('should handle enharmonic equivalents', () => {
			expect(areKeysCompatible('C#', 'Db')).toBe(true);
			expect(areKeysCompatible('G#', 'Ab')).toBe(true);
		});

		it('should treat unknown keys as compatible', () => {
			expect(areKeysCompatible('C', '')).toBe(true);
			expect(areKeysCompatible('', 'G')).toBe(true);
			expect(areKeysCompatible('X', 'Y')).toBe(true);
		});
	});

	describe('scoreKeyCompatibility', () => {
		it('should return 1 for same key', () => {
			expect(scoreKeyCompatibility('C', 'C')).toBe(1);
		});

		it('should return high score for adjacent keys', () => {
			const score = scoreKeyCompatibility('C', 'G');
			expect(score).toBeGreaterThanOrEqual(0.8);
		});

		it('should return lower score for distant keys', () => {
			const score = scoreKeyCompatibility('C', 'F#');
			expect(score).toBeLessThan(0.5);
		});

		it('should return neutral score for unknown keys', () => {
			expect(scoreKeyCompatibility('C', '')).toBe(0.5);
			expect(scoreKeyCompatibility('', '')).toBe(0.5);
		});
	});

	describe('categorizeTempo', () => {
		it('should categorize slow tempos', () => {
			expect(categorizeTempo(60)).toBe('slow');
			expect(categorizeTempo(79)).toBe('slow');
		});

		it('should categorize medium tempos', () => {
			expect(categorizeTempo(80)).toBe('medium');
			expect(categorizeTempo(100)).toBe('medium');
			expect(categorizeTempo(119)).toBe('medium');
		});

		it('should categorize fast tempos', () => {
			expect(categorizeTempo(120)).toBe('fast');
			expect(categorizeTempo(150)).toBe('fast');
		});

		it('should return null for undefined tempo', () => {
			expect(categorizeTempo(undefined)).toBe(null);
		});
	});

	describe('scoreTempoFlow', () => {
		it('should give high score for similar tempos', () => {
			expect(scoreTempoFlow(100, 110)).toBe(0.9);
			expect(scoreTempoFlow(100, 115)).toBe(0.9);
		});

		it('should give moderate score for moderate differences', () => {
			expect(scoreTempoFlow(100, 130)).toBe(0.7);
		});

		it('should give low score for large differences', () => {
			expect(scoreTempoFlow(100, 150)).toBe(0.4);
		});

		it('should give very low score for very large differences', () => {
			expect(scoreTempoFlow(60, 140)).toBe(0.2);
		});

		it('should return neutral score for missing tempos', () => {
			expect(scoreTempoFlow(100, undefined)).toBe(0.5);
			expect(scoreTempoFlow(undefined, 100)).toBe(0.5);
		});
	});

	describe('scoreFreshness', () => {
		it('should penalize recently used songs', () => {
			expect(scoreFreshness(7)).toBe(0.1);
			expect(scoreFreshness(13)).toBe(0.1);
		});

		it('should give moderate score for 2-4 week old songs', () => {
			expect(scoreFreshness(20)).toBe(0.4);
		});

		it('should give high score for 1-2 month old songs', () => {
			expect(scoreFreshness(45)).toBe(0.8);
		});

		it('should give highest score for 2-4 month old songs', () => {
			expect(scoreFreshness(90)).toBe(1.0);
		});

		it('should slightly penalize very old songs', () => {
			expect(scoreFreshness(150)).toBe(0.85);
		});

		it('should handle never-used songs', () => {
			expect(scoreFreshness(undefined)).toBe(0.7);
			expect(scoreFreshness(Infinity)).toBe(0.7);
		});
	});

	describe('calculateFamiliarity', () => {
		it('should return 0 for no usage', () => {
			expect(calculateFamiliarity([])).toBe(0);
		});

		it('should return ~1 for a single use today', () => {
			const today = new Date();
			const familiarity = calculateFamiliarity([today]);
			expect(familiarity).toBeCloseTo(1, 1);
		});

		it('should return ~0.5 for a single use 90 days ago (half-life)', () => {
			const ninetyDaysAgo = new Date();
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
			const familiarity = calculateFamiliarity([ninetyDaysAgo]);
			expect(familiarity).toBeCloseTo(0.5, 1);
		});

		it('should return ~0.25 for a single use 180 days ago', () => {
			const oneEightyDaysAgo = new Date();
			oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
			const familiarity = calculateFamiliarity([oneEightyDaysAgo]);
			expect(familiarity).toBeCloseTo(0.25, 1);
		});

		it('should accumulate contributions from multiple uses', () => {
			const today = new Date();
			const weekAgo = new Date();
			weekAgo.setDate(weekAgo.getDate() - 7);
			const monthAgo = new Date();
			monthAgo.setDate(monthAgo.getDate() - 30);

			const familiarity = calculateFamiliarity([today, weekAgo, monthAgo]);
			// Should be > 2 (three recent uses)
			expect(familiarity).toBeGreaterThan(2);
		});

		it('should handle string dates', () => {
			const familiarity = calculateFamiliarity([new Date().toISOString()]);
			expect(familiarity).toBeCloseTo(1, 1);
		});

		it('should weight recent uses much higher than old uses', () => {
			const today = new Date();
			const yearAgo = new Date();
			yearAgo.setDate(yearAgo.getDate() - 365);

			const recentFamiliarity = calculateFamiliarity([today]);
			const oldFamiliarity = calculateFamiliarity([yearAgo]);

			// Recent use should be worth ~16x more than a year-old use
			expect(recentFamiliarity / oldFamiliarity).toBeGreaterThan(10);
		});
	});

	describe('categorizeFamiliarity', () => {
		it('should return "new" for score below 0.5', () => {
			expect(categorizeFamiliarity(0)).toBe('new');
			expect(categorizeFamiliarity(0.4)).toBe('new');
		});

		it('should return "low" for score between 0.5 and 1.5', () => {
			expect(categorizeFamiliarity(0.5)).toBe('low');
			expect(categorizeFamiliarity(1.0)).toBe('low');
		});

		it('should return "medium" for score between 1.5 and 3', () => {
			expect(categorizeFamiliarity(1.5)).toBe('medium');
			expect(categorizeFamiliarity(2.5)).toBe('medium');
		});

		it('should return "high" for score >= 3', () => {
			expect(categorizeFamiliarity(3.0)).toBe('high');
			expect(categorizeFamiliarity(5.0)).toBe('high');
		});
	});

	describe('getFamiliarityDescription', () => {
		it('should return descriptions for all levels', () => {
			expect(getFamiliarityDescription('high')).toBe('Well-known by congregation');
			expect(getFamiliarityDescription('medium')).toBe('Moderately familiar to congregation');
			expect(getFamiliarityDescription('low')).toBe('Building familiarity');
			expect(getFamiliarityDescription('new')).toBe('New to congregation');
		});
	});

	describe('applyPreferenceModifiers', () => {
		const song = mockSong();

		it('should return base score when no preferences', () => {
			const result = applyPreferenceModifiers(song, 50, {});
			expect(result).toBe(50);
		});

		it('should exclude disliked songs', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_down' }]])
			};

			const result = applyPreferenceModifiers(song, 50, {
				userPreferences: prefs,
				excludeDisliked: true
			});

			expect(result).toBeNull();
		});

		it('should not exclude disliked songs when disabled', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_down' }]])
			};

			const result = applyPreferenceModifiers(song, 50, {
				userPreferences: prefs,
				excludeDisliked: false
			});

			expect(result).toBe(50);
		});

		it('should boost favorite songs', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_up' }]])
			};

			const result = applyPreferenceModifiers(song, 50, {
				userPreferences: prefs,
				boostFavorites: true
			});

			expect(result).toBe(70); // 50 + 20
		});

		it('should penalize difficult songs', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'neutral', is_difficult: true }]])
			};

			const result = applyPreferenceModifiers(song, 50, {
				userPreferences: prefs,
				penalizeDifficult: true
			});

			expect(result).toBe(35); // 50 - 15
		});

		it('should combine boost and penalty', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_up', is_difficult: true }]])
			};

			const result = applyPreferenceModifiers(song, 50, {
				userPreferences: prefs,
				boostFavorites: true,
				penalizeDifficult: true
			});

			expect(result).toBe(55); // 50 + 20 - 15
		});
	});

	describe('detectMood', () => {
		it('should detect upbeat mood from fast tempo', () => {
			const song = mockSong({ tempo: 130 });
			expect(detectMood(song)).toBe('upbeat');
		});

		it('should detect reflective mood from slow tempo', () => {
			const song = mockSong({ tempo: 65 });
			expect(detectMood(song)).toBe('reflective');
		});

		it('should detect celebratory mood from keywords', () => {
			const song = mockSong({ title: 'Celebrate the King' });
			expect(detectMood(song)).toBe('celebratory');
		});

		it('should detect contemplative mood from keywords', () => {
			const song = mockSong({ notes: 'A quiet meditation' });
			expect(detectMood(song)).toBe('contemplative');
		});

		it('should detect worshipful mood from keywords', () => {
			const song = mockSong({ title: 'Holy, Holy, Holy' });
			expect(detectMood(song)).toBe('worshipful');
		});

		it('should return neutral for generic songs', () => {
			const song = mockSong({ title: 'Song Title', tempo: 100 });
			expect(detectMood(song)).toBe('neutral');
		});
	});

	describe('scoreSong', () => {
		it('should score fresh songs higher', () => {
			const freshSong = mockSong({ daysSinceLastUsed: 90 });
			const recentSong = mockSong({ id: 'song-2', daysSinceLastUsed: 7 });

			const freshResult = scoreSong(freshSong);
			const recentResult = scoreSong(recentSong);

			expect(freshResult?.score).toBeGreaterThan(recentResult?.score ?? 0);
		});

		it('should boost seasonal matches', () => {
			const christmasSong = mockSong({ title: 'Joy to the World - Christmas' });
			const regularSong = mockSong({ id: 'song-2', title: 'Regular Song' });

			const christmasResult = scoreSong(christmasSong, { currentMonth: 12 });
			const regularResult = scoreSong(regularSong, { currentMonth: 12 });

			expect(christmasResult?.score).toBeGreaterThan(regularResult?.score ?? 0);
			expect(christmasResult?.tags).toContain('seasonal');
		});

		it('should boost theme matches', () => {
			const matchingSong = mockSong({ title: 'Grace Alone' });
			const nonMatchingSong = mockSong({ id: 'song-2', title: 'Other Song' });

			const matchResult = scoreSong(matchingSong, { theme: 'grace' });
			const nonMatchResult = scoreSong(nonMatchingSong, { theme: 'grace' });

			expect(matchResult?.score).toBeGreaterThan(nonMatchResult?.score ?? 0);
			expect(matchResult?.tags).toContain('theme-match');
		});

		it('should consider key compatibility with previous song', () => {
			const compatibleSong = mockSong({ key_signature: 'G' });
			const incompatibleSong = mockSong({ id: 'song-2', key_signature: 'F#' });
			const previousSong = mockSong({ id: 'prev', key_signature: 'C' });

			const compatibleResult = scoreSong(compatibleSong, { previousSong });
			const incompatibleResult = scoreSong(incompatibleSong, { previousSong });

			expect(compatibleResult?.score).toBeGreaterThan(incompatibleResult?.score ?? 0);
		});

		it('should exclude disliked songs', () => {
			const song = mockSong();
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_down' }]])
			};

			const result = scoreSong(song, { userPreferences: prefs });

			expect(result).toBeNull();
		});

		it('should add favorite tag for boosted songs', () => {
			const song = mockSong();
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_up' }]])
			};

			const result = scoreSong(song, { userPreferences: prefs });

			expect(result?.tags).toContain('favorite');
			expect(result?.reasons).toContain('Favorited by you');
		});
	});

	describe('generateSuggestions', () => {
		const songs = [
			mockSong({ id: 'song-1', title: 'Fresh Song', daysSinceLastUsed: 90 }),
			mockSong({ id: 'song-2', title: 'Recent Song', daysSinceLastUsed: 5 }),
			mockSong({ id: 'song-3', title: 'Christmas Joy', daysSinceLastUsed: 60 }),
			mockSong({ id: 'song-4', title: 'Medium Fresh', daysSinceLastUsed: 45 }),
			mockSong({ id: 'song-5', title: 'Another Song', daysSinceLastUsed: 100 })
		];

		it('should return suggestions sorted by score', () => {
			const suggestions = generateSuggestions(songs, { maxSuggestions: 3 });

			expect(suggestions).toHaveLength(3);
			// Scores should be in descending order
			for (let i = 1; i < suggestions.length; i++) {
				expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
			}
		});

		it('should exclude specified song IDs', () => {
			const suggestions = generateSuggestions(songs, {
				excludeSongIds: ['song-1', 'song-2']
			});

			const ids = suggestions.map((s) => s.song.id);
			expect(ids).not.toContain('song-1');
			expect(ids).not.toContain('song-2');
		});

		it('should filter by minimum days since used', () => {
			const suggestions = generateSuggestions(songs, {
				minDaysSinceUsed: 50
			});

			suggestions.forEach((s) => {
				expect(s.song.daysSinceLastUsed).toBeGreaterThanOrEqual(50);
			});
		});

		it('should exclude disliked songs from suggestions', () => {
			const prefs: UserPreferences = {
				ratings: new Map([['song-1', { rating: 'thumbs_down' }]])
			};

			const suggestions = generateSuggestions(songs, { userPreferences: prefs });

			const ids = suggestions.map((s) => s.song.id);
			expect(ids).not.toContain('song-1');
		});

		it('should respect maxSuggestions limit', () => {
			const suggestions = generateSuggestions(songs, { maxSuggestions: 2 });

			expect(suggestions).toHaveLength(2);
		});

		it('should boost seasonal songs', () => {
			const suggestions = generateSuggestions(songs, {
				currentMonth: 12,
				maxSuggestions: 5
			});

			// Christmas Joy should rank higher in December
			const christmasSong = suggestions.find((s) => s.song.id === 'song-3');
			expect(christmasSong?.tags).toContain('seasonal');
		});
	});
});
