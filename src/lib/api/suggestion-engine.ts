/**
 * Unified Song Suggestion Engine
 *
 * Shared logic for song suggestions, used by both real-time planning suggestions
 * and library health recommendations.
 */

import type { Song, SongRatingValue } from '$lib/types/song';
import type { Service } from '$lib/types/service';
import type { AuthContext } from '$lib/types/auth';

// ============================================================================
// Types
// ============================================================================

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Hemisphere = 'northern' | 'southern';

export interface UserPreferences {
	/** Map of song ID to user's rating for that song */
	ratings: Map<string, { rating: SongRatingValue; is_difficult?: boolean }>;
}

export interface SuggestionOptions {
	/** Exclude songs the user has rated thumbs_down (default: true) */
	excludeDisliked?: boolean;
	/** Boost score for songs the user has rated thumbs_up (default: true) */
	boostFavorites?: boolean;
	/** Penalize songs marked as difficult by the user (default: true) */
	penalizeDifficult?: boolean;
	/** User's ratings map */
	userPreferences?: UserPreferences;
	/** Church hemisphere for seasonal suggestions */
	hemisphere?: Hemisphere;
	/** Current month (1-12) in church's timezone */
	currentMonth?: number;
}

export interface ScoredSong {
	song: Song;
	score: number;
	reasons: string[];
	tags: string[];
}

// ============================================================================
// Seasonal Logic (Fixed Hemisphere Handling)
// ============================================================================

/**
 * Get the meteorological season for a given month and hemisphere.
 * This uses direct mapping instead of month adjustment to avoid confusion.
 */
export function getSeasonForMonth(month: number, hemisphere: Hemisphere = 'northern'): Season {
	// December, January, February
	if (month === 12 || month === 1 || month === 2) {
		return hemisphere === 'northern' ? 'winter' : 'summer';
	}
	// March, April, May
	if (month >= 3 && month <= 5) {
		return hemisphere === 'northern' ? 'spring' : 'fall';
	}
	// June, July, August
	if (month >= 6 && month <= 8) {
		return hemisphere === 'northern' ? 'summer' : 'winter';
	}
	// September, October, November
	return hemisphere === 'northern' ? 'fall' : 'spring';
}

/**
 * Get display name for a season
 */
export function getSeasonDisplayName(season: Season): string {
	switch (season) {
		case 'spring':
			return 'Spring';
		case 'summer':
			return 'Summer';
		case 'fall':
			return 'Fall/Autumn';
		case 'winter':
			return 'Winter';
	}
}

/**
 * Get seasonal keywords for song matching.
 * Religious seasons (Christmas, Easter) are fixed dates regardless of hemisphere.
 */
export function getSeasonalKeywords(month: number, hemisphere: Hemisphere = 'northern'): string[] {
	// Religious seasons are date-fixed (not hemisphere-dependent)
	if (month === 12 || month === 1) {
		return ['christmas', 'advent', 'nativity', 'joy', 'peace', 'hope', 'light', 'messiah', 'born'];
	}
	if (month === 3 || month === 4) {
		return [
			'easter',
			'resurrection',
			'risen',
			'cross',
			'victory',
			'new life',
			'palm',
			'good friday',
			'lent'
		];
	}

	// Meteorological seasons depend on hemisphere
	const season = getSeasonForMonth(month, hemisphere);

	// Meteorological seasons - use VERY specific keywords only.
	// Generic worship words like "joy", "glory", "light", "praise" appear in almost
	// every worship song and should NOT be used as seasonal indicators.
	// Most worship songs aren't seasonally themed - only match explicitly seasonal content.
	switch (season) {
		case 'spring':
			// Only match songs explicitly about spring/nature themes
			return ['spring', 'springtime', 'bloom', 'blooming', 'flowers'];
		case 'summer':
			// Very few worship songs are summer-themed
			return ['summer', 'summertime', 'sunshine'];
		case 'fall':
			// Harvest/thanksgiving themes are common in worship
			return ['fall', 'autumn', 'harvest', 'thanksgiving'];
		case 'winter':
			// Distinct from Christmas - specifically about winter season
			return ['winter', 'wintertime', 'snow'];
	}
}

/**
 * Check if a song matches seasonal keywords
 */
export function songMatchesSeason(
	song: Song,
	month: number,
	hemisphere: Hemisphere = 'northern'
): { matches: boolean; matchedKeywords: string[] } {
	const keywords = getSeasonalKeywords(month, hemisphere);
	const title = (song.title || '').toLowerCase();
	const notes = (song.notes || '').toLowerCase();
	const tags = song.tags || [];
	const lyrics = (song.lyrics || '').toLowerCase();

	const searchText = `${title} ${notes} ${tags.join(' ').toLowerCase()} ${lyrics}`;
	const matchedKeywords = keywords.filter((kw) => searchText.includes(kw));

	return {
		matches: matchedKeywords.length > 0,
		matchedKeywords
	};
}

// ============================================================================
// Key Compatibility (Circle of Fifths)
// ============================================================================

const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

/**
 * Normalize a key signature for comparison (handles enharmonic equivalents)
 */
function normalizeKey(key: string): string {
	const normalized = key.replace('m', ''); // Remove minor suffix for comparison
	// Handle common enharmonic equivalents
	const enharmonics: Record<string, string> = {
		'C#': 'Db',
		'D#': 'Eb',
		'G#': 'Ab',
		'A#': 'Bb'
	};
	return enharmonics[normalized] || normalized;
}

/**
 * Check if two keys are musically compatible (within 2 steps on circle of fifths)
 */
export function areKeysCompatible(key1: string, key2: string): boolean {
	if (!key1 || !key2) return true; // Unknown keys are compatible

	const norm1 = normalizeKey(key1);
	const norm2 = normalizeKey(key2);

	const idx1 = CIRCLE_OF_FIFTHS.indexOf(norm1);
	const idx2 = CIRCLE_OF_FIFTHS.indexOf(norm2);

	if (idx1 === -1 || idx2 === -1) return true; // Unknown key, assume compatible

	const distance = Math.abs(idx1 - idx2);
	// Compatible if within 2 steps (either direction, wrapping around)
	return distance <= 2 || distance >= CIRCLE_OF_FIFTHS.length - 2;
}

/**
 * Score key compatibility (0-1, higher is more compatible)
 */
export function scoreKeyCompatibility(key1: string, key2: string): number {
	if (!key1 || !key2) return 0.5; // Neutral score for unknown

	const norm1 = normalizeKey(key1);
	const norm2 = normalizeKey(key2);

	if (norm1 === norm2) return 1; // Same key

	const idx1 = CIRCLE_OF_FIFTHS.indexOf(norm1);
	const idx2 = CIRCLE_OF_FIFTHS.indexOf(norm2);

	if (idx1 === -1 || idx2 === -1) return 0.5;

	const distance = Math.min(
		Math.abs(idx1 - idx2),
		CIRCLE_OF_FIFTHS.length - Math.abs(idx1 - idx2)
	);

	// Score decreases with distance: 1 step = 0.9, 2 steps = 0.7, etc.
	return Math.max(0, 1 - distance * 0.15);
}

// ============================================================================
// Tempo Flow Analysis
// ============================================================================

export type TempoCategory = 'slow' | 'medium' | 'fast';

/**
 * Categorize tempo into slow/medium/fast
 */
export function categorizeTempo(tempo?: number): TempoCategory | null {
	if (!tempo) return null;
	if (tempo < 80) return 'slow';
	if (tempo < 120) return 'medium';
	return 'fast';
}

/**
 * Score tempo flow between two songs (smooth transitions score higher)
 */
export function scoreTempoFlow(tempo1?: number, tempo2?: number): number {
	if (!tempo1 || !tempo2) return 0.5; // Neutral

	const diff = Math.abs(tempo1 - tempo2);

	// Similar tempo (within 20 BPM) = smooth transition
	if (diff <= 20) return 0.9;
	// Moderate difference (20-40 BPM) = acceptable
	if (diff <= 40) return 0.7;
	// Large jump (40-60 BPM) = jarring but possible
	if (diff <= 60) return 0.4;
	// Very large jump = difficult transition
	return 0.2;
}

// ============================================================================
// Freshness/Rotation Scoring
// ============================================================================

/**
 * Score song freshness based on days since last use.
 * Songs not used recently get higher scores.
 */
export function scoreFreshness(daysSinceLastUsed?: number): number {
	if (daysSinceLastUsed === undefined || daysSinceLastUsed === Infinity) {
		// Never used - fresh but might be unfamiliar
		return 0.7;
	}

	if (daysSinceLastUsed < 14) {
		// Used within 2 weeks - too recent
		return 0.1;
	}
	if (daysSinceLastUsed < 30) {
		// 2-4 weeks - getting stale
		return 0.4;
	}
	if (daysSinceLastUsed < 60) {
		// 1-2 months - good rotation candidate
		return 0.8;
	}
	if (daysSinceLastUsed < 120) {
		// 2-4 months - ideal for bringing back
		return 1.0;
	}
	// Over 4 months - might be forgotten, slight penalty
	return 0.85;
}

// ============================================================================
// Congregation Familiarity
// ============================================================================

/**
 * Half-life for familiarity decay in days.
 * Familiarity contribution from a usage halves every 90 days.
 */
const FAMILIARITY_HALF_LIFE_DAYS = 90;

/**
 * Calculate congregation familiarity score based on usage history.
 * Uses exponential decay so recent uses count more than old ones.
 *
 * @param usageDates - Array of dates when the song was used
 * @returns Familiarity score (unbounded, but typically 0-10)
 */
export function calculateFamiliarity(usageDates: (Date | string)[]): number {
	if (usageDates.length === 0) return 0;

	const now = Date.now();
	let familiarity = 0;

	for (const date of usageDates) {
		const useDate = typeof date === 'string' ? new Date(date) : date;
		const daysSince = (now - useDate.getTime()) / (1000 * 60 * 60 * 24);

		// Exponential decay: contribution = 2^(-daysSince/halfLife)
		// A use today = 1.0, 90 days ago = 0.5, 180 days ago = 0.25, etc.
		const contribution = Math.pow(2, -daysSince / FAMILIARITY_HALF_LIFE_DAYS);
		familiarity += contribution;
	}

	return familiarity;
}

/**
 * Familiarity thresholds for categorization
 */
export const FAMILIARITY_THRESHOLDS = {
	HIGH: 3.0, // Well-known (e.g., 3+ recent uses or 6+ uses in last 6 months)
	MEDIUM: 1.5, // Moderately familiar
	LOW: 0.5 // Building familiarity
} as const;

export type FamiliarityLevel = 'high' | 'medium' | 'low' | 'new';

/**
 * Categorize familiarity score into a level
 */
export function categorizeFamiliarity(familiarityScore: number): FamiliarityLevel {
	if (familiarityScore >= FAMILIARITY_THRESHOLDS.HIGH) return 'high';
	if (familiarityScore >= FAMILIARITY_THRESHOLDS.MEDIUM) return 'medium';
	if (familiarityScore >= FAMILIARITY_THRESHOLDS.LOW) return 'low';
	return 'new';
}

/**
 * Get human-readable description of familiarity level
 */
export function getFamiliarityDescription(level: FamiliarityLevel): string {
	switch (level) {
		case 'high':
			return 'Well-known by congregation';
		case 'medium':
			return 'Moderately familiar to congregation';
		case 'low':
			return 'Building familiarity';
		case 'new':
			return 'New to congregation';
	}
}

// ============================================================================
// User Preference Scoring
// ============================================================================

/**
 * Apply user preference modifiers to a song score.
 * Returns null if song should be excluded entirely.
 */
export function applyPreferenceModifiers(
	song: Song,
	baseScore: number,
	options: SuggestionOptions
): number | null {
	const {
		excludeDisliked = true,
		boostFavorites = true,
		penalizeDifficult = true,
		userPreferences
	} = options;

	if (!userPreferences) {
		return baseScore;
	}

	const rating = userPreferences.ratings.get(song.id);

	if (rating) {
		// Exclude disliked songs entirely
		if (excludeDisliked && rating.rating === 'thumbs_down') {
			return null;
		}

		// Boost favorites
		if (boostFavorites && rating.rating === 'thumbs_up') {
			baseScore += 20;
		}

		// Penalize difficult songs
		if (penalizeDifficult && rating.is_difficult) {
			baseScore -= 15;
		}
	}

	return baseScore;
}

// ============================================================================
// Combined Scoring
// ============================================================================

export interface ScoreSongOptions extends SuggestionOptions {
	/** Previous song in service for flow analysis */
	previousSong?: Song;
	/** Theme to match against */
	theme?: string;
	/** Mood to match (from tempo/keywords) */
	mood?: string;
}

/**
 * Score a song for suggestion, combining all factors.
 * Returns null if the song should be excluded.
 */
export function scoreSong(song: Song, options: ScoreSongOptions = {}): ScoredSong | null {
	const {
		previousSong,
		theme,
		mood,
		hemisphere = 'northern',
		currentMonth = new Date().getMonth() + 1
	} = options;

	let score = 0;
	const reasons: string[] = [];
	const tags: string[] = [];

	// 1. Freshness scoring (0-30 points)
	const freshnessScore = scoreFreshness(song.daysSinceLastUsed) * 30;
	score += freshnessScore;
	if (song.daysSinceLastUsed && song.daysSinceLastUsed > 60) {
		reasons.push('Not used in 60+ days');
		tags.push('fresh');
	}

	// 2. Seasonal matching (0-25 points)
	const seasonalMatch = songMatchesSeason(song, currentMonth, hemisphere);
	if (seasonalMatch.matches) {
		score += 25;
		const season = getSeasonForMonth(currentMonth, hemisphere);
		reasons.push(`Matches ${getSeasonDisplayName(season)} themes`);
		tags.push('seasonal');
	}

	// 3. Theme matching (0-30 points)
	if (theme) {
		const lowerTheme = theme.toLowerCase();
		const title = (song.title || '').toLowerCase();
		const notes = (song.notes || '').toLowerCase();
		const songTags = (song.tags || []).join(' ').toLowerCase();

		if (title.includes(lowerTheme) || notes.includes(lowerTheme) || songTags.includes(lowerTheme)) {
			score += 30;
			reasons.push(`Matches theme: ${theme}`);
			tags.push('theme-match');
		}
	}

	// 4. Key compatibility with previous song (0-20 points)
	if (previousSong?.key_signature && song.key_signature) {
		const keyScore = scoreKeyCompatibility(previousSong.key_signature, song.key_signature) * 20;
		score += keyScore;
		if (keyScore >= 15) {
			reasons.push('Compatible key');
			tags.push('key-compatible');
		}
	}

	// 5. Tempo flow (0-15 points)
	if (previousSong?.tempo && song.tempo) {
		const tempoScore = scoreTempoFlow(previousSong.tempo, song.tempo) * 15;
		score += tempoScore;
		if (tempoScore >= 10) {
			reasons.push('Smooth tempo transition');
			tags.push('tempo-flow');
		}
	}

	// 6. Mood matching (0-20 points)
	if (mood) {
		const songMood = detectMood(song);
		if (songMood === mood) {
			score += 20;
			reasons.push(`Fits ${mood} mood`);
			tags.push('mood-match');
		}
	}

	// Add key and tempo as info tags
	if (song.key_signature) {
		tags.push(song.key_signature);
	}
	if (song.tempo) {
		tags.push(`${song.tempo}bpm`);
	}

	// Apply user preference modifiers
	const adjustedScore = applyPreferenceModifiers(song, score, options);

	if (adjustedScore === null) {
		return null; // Song excluded
	}

	// Add reason if boosted by favorite
	if (adjustedScore > score) {
		reasons.push('Favorited by you');
		tags.push('favorite');
	}

	return {
		song,
		score: adjustedScore,
		reasons: reasons.length > 0 ? reasons : ['Available for selection'],
		tags
	};
}

/**
 * Detect the mood of a song based on tempo and keywords
 */
export function detectMood(
	song: Song
): 'upbeat' | 'reflective' | 'celebratory' | 'contemplative' | 'worshipful' | 'neutral' {
	// Tempo-based detection
	if (song.tempo && song.tempo >= 120) {
		return 'upbeat';
	} else if (song.tempo && song.tempo <= 75) {
		return 'reflective';
	}

	// Keyword-based detection
	const title = (song.title || '').toLowerCase();
	const notes = (song.notes || '').toLowerCase();
	const combined = title + ' ' + notes;

	if (
		combined.includes('celebrate') ||
		combined.includes('rejoice') ||
		combined.includes('victory')
	) {
		return 'celebratory';
	}
	if (
		combined.includes('quiet') ||
		combined.includes('still') ||
		combined.includes('peace') ||
		combined.includes('rest')
	) {
		return 'contemplative';
	}
	if (
		combined.includes('worship') ||
		combined.includes('holy') ||
		combined.includes('worthy') ||
		combined.includes('praise')
	) {
		return 'worshipful';
	}

	return 'neutral';
}

// ============================================================================
// Batch Suggestion Generation
// ============================================================================

export interface GenerateSuggestionsOptions extends SuggestionOptions {
	/** Songs already in the service to exclude */
	excludeSongIds?: string[];
	/** Minimum days since last use */
	minDaysSinceUsed?: number;
	/** Maximum suggestions to return */
	maxSuggestions?: number;
	/** Theme for the service */
	theme?: string;
	/** Previous song for flow analysis */
	previousSong?: Song;
	/** Mood to match (from tempo/keywords) */
	mood?: string;
}

/**
 * Generate song suggestions from a pool of available songs.
 */
export function generateSuggestions(
	availableSongs: Song[],
	options: GenerateSuggestionsOptions = {}
): ScoredSong[] {
	const {
		excludeSongIds = [],
		minDaysSinceUsed = 0,
		maxSuggestions = 5,
		...scoringOptions
	} = options;

	const excludeSet = new Set(excludeSongIds);

	const scoredSongs = availableSongs
		// Filter out excluded songs
		.filter((song) => !excludeSet.has(song.id))
		// Filter by minimum days since use
		.filter((song) => {
			if (minDaysSinceUsed <= 0) return true;
			return (song.daysSinceLastUsed ?? Infinity) >= minDaysSinceUsed;
		})
		// Score each song
		.map((song) => scoreSong(song, scoringOptions))
		// Remove excluded (null) results
		.filter((result): result is ScoredSong => result !== null)
		// Sort by score descending
		.sort((a, b) => b.score - a.score);

	return scoredSongs.slice(0, maxSuggestions);
}

// ============================================================================
// Song Suggestion API (for Service Builder)
// ============================================================================

export interface SongSuggestion {
	song: Song;
	reason: string;
	confidence: number;
	tags: string[];
}

export interface SuggestionOptions {
	theme?: string;
	mood?: string;
	liturgicalSeason?: string;
	excludeRecentDays?: number;
	maxSuggestions?: number;
	userPreferences?: UserPreferences;
	hemisphere?: Hemisphere;
	currentMonth?: number;
}

export class SuggestionsAPI {
	constructor(
		private authContext: AuthContext,
		private pb: any
	) {}

	/**
	 * Get song suggestions based on service context
	 */
	async getSongSuggestions(
		service: Service,
		availableSongs: Song[],
		options: SuggestionOptions = {}
	): Promise<SongSuggestion[]> {
		const {
			theme = service.theme || '',
			mood = '',
			liturgicalSeason = '',
			excludeRecentDays = 30,
			maxSuggestions = 5,
			userPreferences,
			hemisphere = 'northern',
			currentMonth = new Date().getMonth() + 1
		} = options;

		// Use the shared suggestion engine
		const scoredSongs = generateSuggestions(availableSongs, {
			excludeSongIds: [],
			minDaysSinceUsed: excludeRecentDays,
			maxSuggestions: maxSuggestions * 2,
			theme,
			mood: mood || undefined,
			userPreferences,
			hemisphere,
			currentMonth
		});

		// Apply liturgical season filtering if specified
		let filteredSongs = scoredSongs;
		if (liturgicalSeason) {
			filteredSongs = scoredSongs.filter((scored) => {
				const tags = scored.song.tags || [];
				return tags.some((tag) => tag.toLowerCase().includes(liturgicalSeason.toLowerCase()));
			});

			// Boost scores for seasonal matches
			filteredSongs = filteredSongs.map((scored) => ({
				...scored,
				score: scored.score + 20,
				reasons: [...scored.reasons, `Appropriate for ${liturgicalSeason}`],
				tags: [...scored.tags, 'liturgical']
			}));

			// Add back non-seasonal songs if we don't have enough
			if (filteredSongs.length < maxSuggestions) {
				const seasonalIds = new Set(filteredSongs.map((s) => s.song.id));
				const remaining = scoredSongs
					.filter((s) => !seasonalIds.has(s.song.id))
					.slice(0, maxSuggestions - filteredSongs.length);
				filteredSongs = [...filteredSongs, ...remaining];
			}
		}

		// Convert to SongSuggestion format
		const suggestions: SongSuggestion[] = filteredSongs
			.slice(0, maxSuggestions)
			.map((scored) => this.scoredToSuggestion(scored));

		// Add fallbacks if needed
		if (suggestions.length < maxSuggestions) {
			const usedIds = new Set(suggestions.map((s) => s.song.id));
			const fallbacks = availableSongs
				.filter((song) => !usedIds.has(song.id))
				.filter((song) => {
					if (excludeRecentDays > 0 && song.daysSinceLastUsed !== undefined) {
						return song.daysSinceLastUsed >= excludeRecentDays;
					}
					return true;
				})
				.slice(0, maxSuggestions - suggestions.length)
				.map((song) => ({
					song,
					reason: 'Available for selection',
					confidence: 0.3,
					tags: ['alternative']
				}));

			suggestions.push(...fallbacks);
		}

		return suggestions;
	}

	/**
	 * Get songs that complement the current service selection
	 */
	async getComplementarySongs(
		currentSongs: Song[],
		availableSongs: Song[],
		maxSuggestions: number = 3
	): Promise<SongSuggestion[]> {
		const lastSong = currentSongs.length > 0 ? currentSongs[currentSongs.length - 1] : undefined;

		// Calculate average tempo for variety scoring
		const currentTempos = currentSongs.map((s) => s.tempo).filter(Boolean) as number[];
		const avgTempo =
			currentTempos.length > 0
				? currentTempos.reduce((a, b) => a + b, 0) / currentTempos.length
				: 100;

		// Filter out songs already in the service
		const eligibleSongs = availableSongs.filter(
			(song) => !currentSongs.find((cs) => cs.id === song.id)
		);

		const scored = eligibleSongs
			.map((song) => {
				let score = 0;
				const reasons: string[] = [];
				const tags: string[] = [];

				// Key compatibility with last song
				if (lastSong?.key_signature && song.key_signature) {
					if (areKeysCompatible(lastSong.key_signature, song.key_signature)) {
						score += 20;
						reasons.push('Compatible key');
						tags.push('key-compatible');
					}
				}

				// Tempo flow
				if (lastSong?.tempo && song.tempo) {
					const flowScore = scoreTempoFlow(lastSong.tempo, song.tempo);
					score += flowScore * 15;
					if (flowScore >= 0.7) {
						reasons.push('Smooth tempo transition');
						tags.push('tempo-flow');
					}
				}

				// Tempo variety from service average
				if (song.tempo) {
					const tempoDiff = Math.abs(song.tempo - avgTempo);
					if (tempoDiff > 40) {
						score += 10;
						reasons.push('Provides tempo variety');
						tags.push('tempo-variety');
					}
				}

				// Freshness bonus
				if (song.daysSinceLastUsed && song.daysSinceLastUsed > 60) {
					score += 10;
					reasons.push('Not used recently');
					tags.push('fresh');
				}

				// Add key/tempo as info tags
				if (song.key_signature) tags.push(song.key_signature);
				if (song.tempo) tags.push(`${song.tempo}bpm`);

				return { song, score, reasons, tags };
			})
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, maxSuggestions)
			.map(({ song, score, reasons, tags }) => ({
				song,
				reason: reasons.length > 0 ? reasons.join('. ') : 'Complements current selection',
				confidence: Math.min(score / 50, 1),
				tags
			}));

		return scored;
	}

	private scoredToSuggestion(scored: ScoredSong): SongSuggestion {
		return {
			song: scored.song,
			reason: scored.reasons.length > 0 ? scored.reasons.join('. ') : 'Good fit for this service',
			confidence: Math.min(scored.score / 100, 1),
			tags: scored.tags
		};
	}
}

export function createSuggestionsAPI(authContext: AuthContext, pb: any): SuggestionsAPI {
	return new SuggestionsAPI(authContext, pb);
}
