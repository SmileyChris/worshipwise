import { pb } from './client';

export interface SongRecommendation {
	songId: string;
	title: string;
	artist?: string;
	keySignature?: string;
	reason: string;
	score: number;
	type: 'rotation' | 'seasonal' | 'flow' | 'key_compatibility' | 'popularity';
	metadata: Record<string, any>;
}

export interface WorshipFlowSuggestion {
	position: number;
	suggestion: string;
	reason: string;
	recommendedTempo?: 'slow' | 'medium' | 'fast';
	recommendedKey?: string;
}

export interface ServiceBalanceAnalysis {
	currentBalance: {
		fast: number;
		medium: number;
		slow: number;
	};
	recommendations: string[];
	idealBalance: {
		fast: number;
		medium: number;
		slow: number;
	};
}

export interface SeasonalTrend {
	season: string;
	month: number;
	popularSongs: Array<{
		songId: string;
		title: string;
		usageCount: number;
		trend: 'increasing' | 'stable' | 'decreasing';
	}>;
	suggestedThemes: string[];
}

export interface ComparativePeriod {
	current: {
		period: string;
		usageCount: number;
		uniqueSongs: number;
		avgSetlistLength: number;
	};
	previous: {
		period: string;
		usageCount: number;
		uniqueSongs: number;
		avgSetlistLength: number;
	};
	changes: {
		usageChange: number;
		diversityChange: number;
		lengthChange: number;
	};
	insights: string[];
}

class RecommendationsApi {
	/**
	 * Get song recommendations based on current usage patterns
	 */
	async getSongRecommendations(
		filters: {
			excludeRecentDays?: number;
			serviceType?: string;
			worshipLeaderId?: string;
			limit?: number;
		} = {}
	): Promise<SongRecommendation[]> {
		const {
			excludeRecentDays = 28,
			serviceType,
			worshipLeaderId,
			limit = 10
		} = filters;

		try {
			// Get recent usage to exclude
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - excludeRecentDays);

			let recentUsageFilter = `usage_date >= "${cutoffDate.toISOString()}"`;
			if (worshipLeaderId) {
				recentUsageFilter += ` && worship_leader = "${worshipLeaderId}"`;
			}

			const recentUsage = await pb.collection('song_usage').getFullList({
				filter: recentUsageFilter,
				fields: 'song'
			});

			const recentSongIds = [...new Set(recentUsage.map(u => u.song))];

			// Get all songs excluding recently used ones
			let songFilter = 'is_active = true';
			if (recentSongIds.length > 0) {
				songFilter += ` && id !~ "${recentSongIds.join('|')}"`;
			}

			const availableSongs = await pb.collection('songs').getFullList({
				filter: songFilter,
				expand: 'song_usage_via_song'
			});

			// Calculate recommendations with different scoring
			const recommendations: SongRecommendation[] = [];

			for (const song of availableSongs) {
				const usages = song.expand?.song_usage_via_song || [];
				
				// Rotation-based recommendation
				if (usages.length > 0) {
					const lastUsed = new Date(usages[0].usage_date);
					const daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));
					
					if (daysSince >= excludeRecentDays) {
						const rotationScore = Math.min(daysSince / 90, 1) * (usages.length / 10); // Favor songs used before but not too frequently
						
						recommendations.push({
							songId: song.id,
							title: song.title,
							artist: song.artist,
							keySignature: song.key_signature,
							reason: `Last used ${daysSince} days ago. Good rotation candidate.`,
							score: rotationScore * 0.8,
							type: 'rotation',
							metadata: { daysSince, totalUsages: usages.length }
						});
					}
				} else {
					// New songs that haven't been used
					recommendations.push({
						songId: song.id,
						title: song.title,
						artist: song.artist,
						keySignature: song.key_signature,
						reason: 'New song that hasn\'t been used yet. Consider introducing to congregation.',
						score: 0.6,
						type: 'rotation',
						metadata: { isNew: true }
					});
				}

				// Seasonal recommendations
				const seasonalScore = this.calculateSeasonalScore(song);
				if (seasonalScore > 0) {
					recommendations.push({
						songId: song.id,
						title: song.title,
						artist: song.artist,
						keySignature: song.key_signature,
						reason: this.getSeasonalReason(),
						score: seasonalScore,
						type: 'seasonal',
						metadata: { season: this.getCurrentSeason() }
					});
				}
			}

			// Sort by score and return top results
			return recommendations
				.sort((a, b) => b.score - a.score)
				.slice(0, limit);

		} catch (error) {
			console.error('Failed to get song recommendations:', error);
			throw error;
		}
	}

	/**
	 * Analyze worship flow and provide suggestions
	 */
	async getWorshipFlowSuggestions(setlistId?: string): Promise<WorshipFlowSuggestion[]> {
		try {
			// If analyzing an existing setlist
			if (setlistId) {
				const setlist = await pb.collection('setlists').getOne(setlistId, {
					expand: 'setlist_songs_via_setlist.song'
				});

				const songs = setlist.expand?.setlist_songs_via_setlist || [];
				const suggestions: WorshipFlowSuggestion[] = [];

				songs.forEach((item: any, index: number) => {
					const song = item.expand?.song;
					if (!song) return;

					// Analyze tempo flow
					if (index > 0) {
						const prevSong = songs[index - 1].expand?.song;
						if (prevSong && song.tempo && prevSong.tempo) {
							const tempoChange = song.tempo - prevSong.tempo;
							if (Math.abs(tempoChange) > 40) {
								suggestions.push({
									position: index,
									suggestion: `Consider a transition song between "${prevSong.title}" and "${song.title}"`,
									reason: `Large tempo change: ${tempoChange > 0 ? '+' : ''}${tempoChange} BPM`,
									recommendedTempo: tempoChange > 0 ? 'medium' : 'medium'
								});
							}
						}
					}

					// Key transition analysis
					if (index > 0) {
						const prevSong = songs[index - 1].expand?.song;
						if (prevSong && song.key_signature && prevSong.key_signature) {
							if (!this.areKeysCompatible(prevSong.key_signature, song.key_signature)) {
								suggestions.push({
									position: index,
									suggestion: `Key transition from ${prevSong.key_signature} to ${song.key_signature} may be difficult`,
									reason: 'Keys are not in circle of fifths relationship',
									recommendedKey: this.suggestTransitionKey(prevSong.key_signature, song.key_signature)
								});
							}
						}
					}
				});

				return suggestions;
			}

			// General flow suggestions
			return [
				{
					position: 0,
					suggestion: 'Start with an upbeat, familiar song to engage the congregation',
					reason: 'Opening songs should be energetic and well-known'
				},
				{
					position: 1,
					suggestion: 'Follow with 2-3 songs that build worship momentum',
					reason: 'Create a natural flow into deeper worship'
				},
				{
					position: 4,
					suggestion: 'Include a slower, more intimate song for reflection',
					reason: 'Provide space for personal worship and response'
				}
			];

		} catch (error) {
			console.error('Failed to get worship flow suggestions:', error);
			throw error;
		}
	}

	/**
	 * Analyze service balance (fast/slow songs)
	 */
	async analyzeServiceBalance(setlistId: string): Promise<ServiceBalanceAnalysis> {
		try {
			const setlist = await pb.collection('setlists').getOne(setlistId, {
				expand: 'setlist_songs_via_setlist.song'
			});

			const songs = setlist.expand?.setlist_songs_via_setlist || [];
			const analysis = { fast: 0, medium: 0, slow: 0 };

			songs.forEach((item: any) => {
				const song = item.expand?.song;
				if (song?.tempo) {
					if (song.tempo >= 120) analysis.fast++;
					else if (song.tempo >= 80) analysis.medium++;
					else analysis.slow++;
				}
			});

			const total = songs.length;
			const recommendations: string[] = [];

			// Ideal balance: 40% medium, 30% fast, 30% slow
			const idealBalance = {
				fast: Math.round(total * 0.3),
				medium: Math.round(total * 0.4),
				slow: Math.round(total * 0.3)
			};

			if (analysis.fast > idealBalance.fast) {
				recommendations.push('Consider replacing some fast songs with medium tempo songs for better flow');
			}
			if (analysis.slow > idealBalance.slow) {
				recommendations.push('Too many slow songs may reduce energy - consider balancing with more upbeat songs');
			}
			if (analysis.medium < idealBalance.medium) {
				recommendations.push('Add more medium tempo songs to create smooth transitions');
			}

			return {
				currentBalance: analysis,
				recommendations,
				idealBalance
			};

		} catch (error) {
			console.error('Failed to analyze service balance:', error);
			throw error;
		}
	}

	/**
	 * Get seasonal trends and recommendations
	 */
	async getSeasonalTrends(year: number = new Date().getFullYear()): Promise<SeasonalTrend[]> {
		try {
			const trends: SeasonalTrend[] = [];
			
			// Define seasons
			const seasons = [
				{ name: 'Winter/Christmas', months: [12, 1, 2], themes: ['Christmas', 'New Year', 'Hope', 'Light'] },
				{ name: 'Spring/Easter', months: [3, 4, 5], themes: ['Easter', 'Resurrection', 'New Life', 'Growth'] },
				{ name: 'Summer', months: [6, 7, 8], themes: ['Joy', 'Celebration', 'Family', 'Community'] },
				{ name: 'Fall/Thanksgiving', months: [9, 10, 11], themes: ['Harvest', 'Thanksgiving', 'Gratitude', 'Reflection'] }
			];

			for (const season of seasons) {
				const seasonTrends: SeasonalTrend[] = [];

				for (const month of season.months) {
					const startDate = new Date(year, month - 1, 1);
					const endDate = new Date(year, month, 0);

					const usageFilter = `usage_date >= "${startDate.toISOString()}" && usage_date <= "${endDate.toISOString()}"`;
					
					const usages = await pb.collection('song_usage').getFullList({
						filter: usageFilter,
						expand: 'song'
					});

					const songStats = new Map();
					usages.forEach(usage => {
						const song = usage.expand?.song;
						if (song) {
							const current = songStats.get(song.id) || { song, count: 0 };
							current.count++;
							songStats.set(song.id, current);
						}
					});

					const popularSongs = Array.from(songStats.values())
						.sort((a, b) => b.count - a.count)
						.slice(0, 10)
						.map(stat => ({
							songId: stat.song.id,
							title: stat.song.title,
							usageCount: stat.count,
							trend: 'stable' as const // TODO: Calculate actual trend
						}));

					seasonTrends.push({
						season: season.name,
						month,
						popularSongs,
						suggestedThemes: season.themes
					});
				}

				trends.push(...seasonTrends);
			}

			return trends;

		} catch (error) {
			console.error('Failed to get seasonal trends:', error);
			throw error;
		}
	}

	/**
	 * Compare current period with previous period
	 */
	async getComparativePeriodAnalysis(
		currentStart: Date,
		currentEnd: Date,
		periodType: 'month' | 'quarter' | 'year' = 'month'
	): Promise<ComparativePeriod> {
		try {
			// Calculate previous period
			const timeDiff = currentEnd.getTime() - currentStart.getTime();
			const prevEnd = new Date(currentStart.getTime() - 1);
			const prevStart = new Date(prevEnd.getTime() - timeDiff);

			// Get current period data
			const currentFilter = `usage_date >= "${currentStart.toISOString()}" && usage_date <= "${currentEnd.toISOString()}"`;
			const currentUsages = await pb.collection('song_usage').getFullList({
				filter: currentFilter,
				expand: 'song,setlist'
			});

			// Get previous period data
			const prevFilter = `usage_date >= "${prevStart.toISOString()}" && usage_date <= "${prevEnd.toISOString()}"`;
			const prevUsages = await pb.collection('song_usage').getFullList({
				filter: prevFilter,
				expand: 'song,setlist'
			});

			// Calculate metrics
			const currentUniqueSetlists = new Set(currentUsages.map(u => u.setlist)).size;
			const prevUniqueSetlists = new Set(prevUsages.map(u => u.setlist)).size;

			const currentStats = {
				period: this.formatPeriod(currentStart, currentEnd),
				usageCount: currentUsages.length,
				uniqueSongs: new Set(currentUsages.map(u => u.song)).size,
				avgSetlistLength: currentUniqueSetlists > 0 ? currentUsages.length / currentUniqueSetlists : 0
			};

			const prevStats = {
				period: this.formatPeriod(prevStart, prevEnd),
				usageCount: prevUsages.length,
				uniqueSongs: new Set(prevUsages.map(u => u.song)).size,
				avgSetlistLength: prevUniqueSetlists > 0 ? prevUsages.length / prevUniqueSetlists : 0
			};

			// Calculate changes
			const changes = {
				usageChange: prevStats.usageCount > 0 ? 
					((currentStats.usageCount - prevStats.usageCount) / prevStats.usageCount) * 100 : 0,
				diversityChange: prevStats.uniqueSongs > 0 ? 
					((currentStats.uniqueSongs - prevStats.uniqueSongs) / prevStats.uniqueSongs) * 100 : 0,
				lengthChange: prevStats.avgSetlistLength > 0 ? 
					((currentStats.avgSetlistLength - prevStats.avgSetlistLength) / prevStats.avgSetlistLength) * 100 : 0
			};

			// Generate insights
			const insights: string[] = [];
			if (Math.abs(changes.usageChange) > 10) {
				insights.push(`Song usage ${changes.usageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.usageChange).toFixed(1)}%`);
			}
			if (Math.abs(changes.diversityChange) > 15) {
				insights.push(`Song variety ${changes.diversityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.diversityChange).toFixed(1)}%`);
			}
			if (Math.abs(changes.lengthChange) > 15) {
				insights.push(`Average setlist length ${changes.lengthChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.lengthChange).toFixed(1)}%`);
			}

			return {
				current: currentStats,
				previous: prevStats,
				changes,
				insights
			};

		} catch (error) {
			console.error('Failed to get comparative analysis:', error);
			throw error;
		}
	}

	// Helper methods
	private calculateSeasonalScore(song: any): number {
		const now = new Date();
		const month = now.getMonth() + 1;
		
		// Simple seasonal scoring based on song tags or title keywords
		const title = song.title?.toLowerCase() || '';
		const tags = song.tags || [];
		
		let score = 0;
		
		// Christmas season (December, January)
		if (month === 12 || month === 1) {
			if (title.includes('christmas') || title.includes('joy') || title.includes('peace') ||
				tags.some((tag: string) => ['christmas', 'holiday', 'joy', 'peace'].includes(tag.toLowerCase()))) {
				score = 0.9;
			}
		}
		
		// Easter season (March, April)
		if (month === 3 || month === 4) {
			if (title.includes('resurrection') || title.includes('easter') || title.includes('risen') ||
				tags.some((tag: string) => ['easter', 'resurrection', 'victory'].includes(tag.toLowerCase()))) {
				score = 0.9;
			}
		}
		
		return score;
	}

	private getSeasonalReason(): string {
		const month = new Date().getMonth() + 1;
		if (month === 12 || month === 1) return 'Perfect for Christmas season';
		if (month === 3 || month === 4) return 'Great for Easter celebration';
		if (month >= 6 && month <= 8) return 'Ideal for summer worship';
		return 'Fits current season theme';
	}

	private getCurrentSeason(): string {
		const month = new Date().getMonth() + 1;
		if (month === 12 || month === 1 || month === 2) return 'winter';
		if (month >= 3 && month <= 5) return 'spring';
		if (month >= 6 && month <= 8) return 'summer';
		return 'fall';
	}

	private areKeysCompatible(key1: string, key2: string): boolean {
		// Simplified circle of fifths compatibility check
		const circleOfFifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab'];
		const idx1 = circleOfFifths.indexOf(key1.replace('m', ''));
		const idx2 = circleOfFifths.indexOf(key2.replace('m', ''));
		
		if (idx1 === -1 || idx2 === -1) return true; // Unknown keys, assume compatible
		
		const distance = Math.abs(idx1 - idx2);
		return distance <= 1 || distance >= 11; // Adjacent keys or same key
	}

	private suggestTransitionKey(key1: string, key2: string): string {
		// Suggest a transitional key between two incompatible keys
		const circleOfFifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab'];
		const idx1 = circleOfFifths.indexOf(key1.replace('m', ''));
		const idx2 = circleOfFifths.indexOf(key2.replace('m', ''));
		
		if (idx1 === -1 || idx2 === -1) return key1;
		
		// Find midpoint
		const midpoint = Math.floor((idx1 + idx2) / 2);
		return circleOfFifths[midpoint] || key1;
	}

	private formatPeriod(start: Date, end: Date): string {
		const options: Intl.DateTimeFormatOptions = { 
			year: 'numeric', 
			month: 'short',
			day: 'numeric'
		};
		return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
	}
}

export const recommendationsApi = new RecommendationsApi();