import type { AuthContext } from '$lib/types/auth';
import type { Song } from '$lib/types/song';
import type { Service } from '$lib/types/service';

export interface SongSuggestion {
	song: Song;
	reason: string;
	confidence: number;
	tags: string[];
}

export interface AIPromptOptions {
	theme?: string;
	mood?: string;
	liturgicalSeason?: string;
	excludeRecentDays?: number;
	maxSuggestions?: number;
}

export class AISuggestionsAPI {
	private authContext: AuthContext;
	private pb: any;

	constructor(authContext: AuthContext, pb: any) {
		this.authContext = authContext;
		this.pb = pb;
	}

	/**
	 * Get AI-powered song suggestions based on service context
	 */
	async getSongSuggestions(
		service: Service,
		availableSongs: Song[],
		options: AIPromptOptions = {}
	): Promise<SongSuggestion[]> {
		try {
			// Simulate AI processing (in production, this would call an AI service)
			// For now, we'll use a rule-based system to demonstrate the functionality
			
			const suggestions: SongSuggestion[] = [];
			const {
				theme = service.theme || '',
				mood = '',
				liturgicalSeason = '',
				excludeRecentDays = 30,
				maxSuggestions = 5
			} = options;

			// Filter out recently used songs if requested
			const eligibleSongs = availableSongs.filter(song => {
				if (excludeRecentDays > 0 && song.daysSinceLastUsed !== undefined) {
					return song.daysSinceLastUsed >= excludeRecentDays;
				}
				return true;
			});

			// Score songs based on various factors
			const scoredSongs = eligibleSongs.map(song => {
				let score = 0;
				const reasons: string[] = [];
				const tags: string[] = [];

				// Theme matching
				if (theme && song.notes?.toLowerCase().includes(theme.toLowerCase())) {
					score += 30;
					reasons.push(`Matches theme: ${theme}`);
					tags.push('theme-match');
				}

				// Mood matching
				if (mood) {
					const songMood = this.detectMood(song);
					if (songMood === mood) {
						score += 25;
						reasons.push(`Fits ${mood} mood`);
						tags.push('mood-match');
					}
				}

				// Liturgical season matching
				if (liturgicalSeason && song.tags?.includes(liturgicalSeason.toLowerCase())) {
					score += 20;
					reasons.push(`Appropriate for ${liturgicalSeason}`);
					tags.push('seasonal');
				}

				// Tempo variety (prefer songs with different tempos)
				if (song.tempo) {
					score += 5;
					tags.push(`${song.tempo}bpm`);
				}

				// Key signature variety
				if (song.key_signature) {
					score += 5;
					tags.push(song.key_signature);
				}

				// Popular songs (placeholder - in production, track usage stats)
				if (song.title.toLowerCase().includes('amazing') || 
					song.title.toLowerCase().includes('holy') ||
					song.title.toLowerCase().includes('praise')) {
					score += 10;
					tags.push('popular');
				}

				// Not used recently bonus
				if (song.daysSinceLastUsed && song.daysSinceLastUsed > 60) {
					score += 15;
					reasons.push('Not used in 60+ days');
					tags.push('fresh');
				}

				return {
					song,
					score,
					reasons,
					tags
				};
			});

			// Sort by score and take top suggestions
			const topSuggestions = scoredSongs
				.filter(s => s.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, maxSuggestions)
				.map(({ song, score, reasons, tags }) => ({
					song,
					reason: reasons.length > 0 ? reasons.join('. ') : 'Good fit for this service',
					confidence: Math.min(score / 100, 1),
					tags
				}));

			// If we don't have enough suggestions, add some random eligible songs
			if (topSuggestions.length < maxSuggestions) {
				const remainingCount = maxSuggestions - topSuggestions.length;
				const unusedSongs = eligibleSongs.filter(
					song => !topSuggestions.find(s => s.song.id === song.id)
				);
				
				for (let i = 0; i < remainingCount && i < unusedSongs.length; i++) {
					const song = unusedSongs[i];
					topSuggestions.push({
						song,
						reason: 'Available for selection',
						confidence: 0.3,
						tags: ['alternative']
					});
				}
			}

			return topSuggestions;
		} catch (error) {
			console.error('Failed to get AI suggestions:', error);
			throw error;
		}
	}

	/**
	 * Detect mood of a song based on its attributes
	 */
	private detectMood(song: Song): string {
		// Simple mood detection based on tempo and keywords
		if (song.tempo && song.tempo >= 120) {
			return 'upbeat';
		} else if (song.tempo && song.tempo <= 80) {
			return 'reflective';
		}

		const title = song.title.toLowerCase();
		const notes = (song.notes || '').toLowerCase();
		const combined = title + ' ' + notes;

		if (combined.includes('celebrate') || combined.includes('rejoice') || combined.includes('victory')) {
			return 'celebratory';
		} else if (combined.includes('quiet') || combined.includes('still') || combined.includes('peace')) {
			return 'contemplative';
		} else if (combined.includes('worship') || combined.includes('holy') || combined.includes('worthy')) {
			return 'worshipful';
		}

		return 'neutral';
	}

	/**
	 * Get song recommendations based on current service songs
	 */
	async getComplementarySongs(
		currentSongs: Song[],
		availableSongs: Song[],
		maxSuggestions: number = 3
	): Promise<SongSuggestion[]> {
		try {
			// Analyze current service composition
			const currentKeys = currentSongs
				.map(s => s.key_signature)
				.filter(Boolean) as string[];
			const currentTempos = currentSongs
				.map(s => s.tempo)
				.filter(Boolean) as number[];
			const avgTempo = currentTempos.length > 0 
				? currentTempos.reduce((a, b) => a + b, 0) / currentTempos.length 
				: 100;

			// Filter out songs already in the service
			const eligibleSongs = availableSongs.filter(
				song => !currentSongs.find(cs => cs.id === song.id)
			);

			// Score based on complementary attributes
			const suggestions = eligibleSongs
				.map(song => {
					let score = 0;
					const reasons: string[] = [];
					const tags: string[] = [];

					// Key compatibility
					if (song.key_signature && currentKeys.length > 0) {
						if (this.areKeysCompatible(song.key_signature, currentKeys[currentKeys.length - 1])) {
							score += 20;
							reasons.push('Compatible key');
							tags.push('key-compatible');
						}
					}

					// Tempo flow
					if (song.tempo) {
						const tempoDiff = Math.abs(song.tempo - avgTempo);
						if (tempoDiff < 20) {
							score += 15;
							reasons.push('Similar tempo');
							tags.push('tempo-match');
						} else if (tempoDiff > 40) {
							score += 10;
							reasons.push('Provides tempo variety');
							tags.push('tempo-variety');
						}
					}

					return { song, score, reasons, tags };
				})
				.filter(s => s.score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, maxSuggestions)
				.map(({ song, score, reasons, tags }) => ({
					song,
					reason: reasons.join('. '),
					confidence: Math.min(score / 50, 1),
					tags
				}));

			return suggestions;
		} catch (error) {
			console.error('Failed to get complementary songs:', error);
			throw error;
		}
	}

	/**
	 * Check if two keys are musically compatible
	 */
	private areKeysCompatible(key1: string, key2: string): boolean {
		// Simplified key compatibility check
		// In production, this would use proper music theory
		const keyCircle = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];
		const idx1 = keyCircle.indexOf(key1);
		const idx2 = keyCircle.indexOf(key2);
		
		if (idx1 === -1 || idx2 === -1) return false;
		
		const distance = Math.abs(idx1 - idx2);
		return distance <= 2 || distance >= 10; // Adjacent keys or opposite sides
	}
}

export function createAISuggestionsAPI(authContext: AuthContext, pb: any): AISuggestionsAPI {
	return new AISuggestionsAPI(authContext, pb);
}