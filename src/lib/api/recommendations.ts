import { pb } from './client';
import type { Song, SongUsage } from '$lib/types/song';
import type { ServiceSong } from '$lib/types/service';

export interface SongRecommendation {
	songId: string;
	title: string;
	artist?: string;
	keySignature?: string;
	reason: string;
	score: number;
	type: 'rotation' | 'seasonal' | 'flow' | 'key_compatibility' | 'popularity';
	metadata: Record<string, unknown>;
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
		avgServiceLength: number;
	};
	previous: {
		period: string;
		usageCount: number;
		uniqueSongs: number;
		avgServiceLength: number;
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
		const { excludeRecentDays = 28, worshipLeaderId, limit = 10 } = filters;

		try {
			// Get recent usage to exclude
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - excludeRecentDays);

			let recentUsageFilter = `used_date >= "${cutoffDate.toISOString()}"`;
			if (worshipLeaderId) {
				recentUsageFilter += ` && setlist_id.worship_leader = "${worshipLeaderId}"`;
			}

			const recentUsage = await pb.collection('song_usage').getFullList({
				filter: recentUsageFilter,
				fields: 'song_id'
			});

			const recentSongIds = [...new Set(recentUsage.map((u) => u.song_id))];

			// Get all songs excluding recently used ones
			let songFilter = 'is_active = true';
			if (recentSongIds.length > 0) {
				songFilter += ` && id !~ "${recentSongIds.join('|')}"`;
			}

			const availableSongs = await pb.collection('songs').getFullList({
				filter: songFilter,
				expand: 'song_usage_via_song_id'
			});

			// Get historical usage data for scoring
			const allUsage = await pb.collection('song_usage').getFullList({
				expand: 'song_id,setlist_id',
				sort: '-used_date'
			});

			// Calculate recommendations with different scoring
			const recommendations: SongRecommendation[] = [];

			for (const song of availableSongs) {
				const songUsages = allUsage.filter((u) => u.song_id === song.id);

				// Rotation-based recommendation
				if (songUsages.length > 0) {
					const lastUsed = new Date(songUsages[0].used_date);
					const daysSince = Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

					if (daysSince >= excludeRecentDays) {
						// Enhanced scoring: consider frequency, recency, and congregation familiarity
						const frequencyScore = Math.min(songUsages.length / 20, 1); // Max score at 20 uses
						const recencyScore = Math.min(daysSince / 90, 1); // Max score at 90 days
						const rotationScore = frequencyScore * 0.6 + recencyScore * 0.4;

						let reason = `Last used ${daysSince} days ago`;
						if (songUsages.length >= 10) {
							reason += '. Well-known by congregation';
						} else if (songUsages.length >= 5) {
							reason += '. Moderately familiar to congregation';
						} else {
							reason += '. Still building familiarity';
						}

						recommendations.push({
							songId: song.id,
							title: song.title,
							artist: song.artist,
							keySignature: song.key_signature,
							reason,
							score: rotationScore * 0.85,
							type: 'rotation',
							metadata: {
								daysSince,
								totalUsages: songUsages.length,
								familiarityLevel:
									songUsages.length >= 10 ? 'high' : songUsages.length >= 5 ? 'medium' : 'low'
							}
						});
					}
				} else {
					// New songs that haven't been used
					recommendations.push({
						songId: song.id,
						title: song.title,
						artist: song.artist,
						keySignature: song.key_signature,
						reason:
							'New song ready to be introduced. Consider starting slowly to build familiarity.',
						score: 0.6,
						type: 'rotation',
						metadata: { isNew: true, familiarityLevel: 'new' }
					});
				}

				// Seasonal recommendations
				const seasonalScore = await this.calculateSeasonalScore(song as unknown as Song);
				if (seasonalScore > 0) {
					const seasonalContext = await this.getChurchSeasonalContext();
					recommendations.push({
						songId: song.id,
						title: song.title,
						artist: song.artist,
						keySignature: song.key_signature,
						reason: await this.getSeasonalReason(seasonalContext),
						score: seasonalScore,
						type: 'seasonal',
						metadata: {
							season: this.getCurrentSeason(),
							hemisphere: seasonalContext.hemisphere,
							timezone: seasonalContext.timezone
						}
					});
				}

				// Popularity-based recommendations (trending songs)
				const recentUsageCount = songUsages.filter((u) => {
					const usageDate = new Date(u.used_date);
					const threeMonthsAgo = new Date();
					threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
					return usageDate >= threeMonthsAgo;
				}).length;

				const lastUsed = songUsages.length > 0 ? new Date(songUsages[0].used_date) : null;
				const daysSinceLastUsed = lastUsed
					? Math.floor((Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24))
					: Infinity;

				if (recentUsageCount >= 3 && daysSinceLastUsed >= excludeRecentDays) {
					recommendations.push({
						songId: song.id,
						title: song.title,
						artist: song.artist,
						keySignature: song.key_signature,
						reason: `Trending song - used ${recentUsageCount} times in last 3 months. Congregation favorite.`,
						score: Math.min(recentUsageCount / 6, 1) * 0.75,
						type: 'popularity',
						metadata: { recentUsageCount, trending: true }
					});
				}
			}

			// Deduplicate and sort by score
			const uniqueRecommendations = recommendations.reduce((acc, rec) => {
				const existing = acc.find((r) => r.songId === rec.songId);
				if (!existing || existing.score < rec.score) {
					return [...acc.filter((r) => r.songId !== rec.songId), rec];
				}
				return acc;
			}, [] as SongRecommendation[]);

			return uniqueRecommendations.sort((a, b) => b.score - a.score).slice(0, limit);
		} catch (error) {
			console.error('Failed to get song recommendations:', error);
			throw error;
		}
	}

	/**
	 * Analyze worship flow and provide suggestions
	 */
	async getWorshipFlowSuggestions(serviceId?: string): Promise<WorshipFlowSuggestion[]> {
		try {
			// If analyzing an existing service
			if (serviceId) {
				const service = await pb.collection('setlists').getOne(serviceId, {
					expand: 'setlist_songs_via_setlist.song'
				});

				const songs = service.expand?.setlist_songs_via_setlist || [];
				const suggestions: WorshipFlowSuggestion[] = [];

				songs.forEach((item: ServiceSong, index: number) => {
					const song = item.expand?.song_id;
					if (!song) return;

					// Analyze tempo flow
					if (index > 0) {
						const prevSong = songs[index - 1].expand?.song_id;
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
									recommendedKey: this.suggestTransitionKey(
										prevSong.key_signature,
										song.key_signature
									)
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
	async analyzeServiceBalance(serviceId: string): Promise<ServiceBalanceAnalysis> {
		try {
			const service = await pb.collection('setlists').getOne(serviceId, {
				expand: 'setlist_songs_via_setlist.song'
			});

			const songs = service.expand?.setlist_songs_via_setlist || [];
			const analysis = { fast: 0, medium: 0, slow: 0 };

			songs.forEach((item: ServiceSong) => {
				const song = item.expand?.song_id;
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
				recommendations.push(
					'Consider replacing some fast songs with medium tempo songs for better flow'
				);
			}
			if (analysis.slow > idealBalance.slow) {
				recommendations.push(
					'Too many slow songs may reduce energy - consider balancing with more upbeat songs'
				);
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
				{
					name: 'Winter/Christmas',
					months: [12, 1, 2],
					themes: ['Christmas', 'New Year', 'Hope', 'Light']
				},
				{
					name: 'Spring/Easter',
					months: [3, 4, 5],
					themes: ['Easter', 'Resurrection', 'New Life', 'Growth']
				},
				{
					name: 'Summer',
					months: [6, 7, 8],
					themes: ['Joy', 'Celebration', 'Family', 'Community']
				},
				{
					name: 'Fall/Thanksgiving',
					months: [9, 10, 11],
					themes: ['Harvest', 'Thanksgiving', 'Gratitude', 'Reflection']
				}
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
					usages.forEach((usage) => {
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
						.map((stat) => ({
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
		_periodType: 'month' | 'quarter' | 'year' = 'month'
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
			const currentUniqueSetlists = new Set(currentUsages.map((u) => u.setlist)).size;
			const prevUniqueSetlists = new Set(prevUsages.map((u) => u.setlist)).size;

			const currentStats = {
				period: this.formatPeriod(currentStart, currentEnd),
				usageCount: currentUsages.length,
				uniqueSongs: new Set(currentUsages.map((u) => u.song)).size,
				avgServiceLength:
					currentUniqueSetlists > 0 ? currentUsages.length / currentUniqueSetlists : 0
			};

			const prevStats = {
				period: this.formatPeriod(prevStart, prevEnd),
				usageCount: prevUsages.length,
				uniqueSongs: new Set(prevUsages.map((u) => u.song)).size,
				avgServiceLength: prevUniqueSetlists > 0 ? prevUsages.length / prevUniqueSetlists : 0
			};

			// Calculate changes
			const changes = {
				usageChange:
					prevStats.usageCount > 0
						? ((currentStats.usageCount - prevStats.usageCount) / prevStats.usageCount) * 100
						: 0,
				diversityChange:
					prevStats.uniqueSongs > 0
						? ((currentStats.uniqueSongs - prevStats.uniqueSongs) / prevStats.uniqueSongs) * 100
						: 0,
				lengthChange:
					prevStats.avgServiceLength > 0
						? ((currentStats.avgServiceLength - prevStats.avgServiceLength) /
								prevStats.avgServiceLength) *
							100
						: 0
			};

			// Generate insights
			const insights: string[] = [];
			if (Math.abs(changes.usageChange) > 10) {
				insights.push(
					`Song usage ${changes.usageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.usageChange).toFixed(1)}%`
				);
			}
			if (Math.abs(changes.diversityChange) > 15) {
				insights.push(
					`Song variety ${changes.diversityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.diversityChange).toFixed(1)}%`
				);
			}
			if (Math.abs(changes.lengthChange) > 15) {
				insights.push(
					`Average service length ${changes.lengthChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(changes.lengthChange).toFixed(1)}%`
				);
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

	/**
	 * Get AI-powered worship insights based on comprehensive analytics
	 */
	async getWorshipInsights(): Promise<{
		rotationHealth: {
			score: number;
			status: 'excellent' | 'good' | 'needs_attention' | 'critical';
			insights: string[];
			recommendations: string[];
		};
		diversityAnalysis: {
			keyDiversity: number;
			tempoDiversity: number;
			artistDiversity: number;
			recommendations: string[];
		};
		congregationEngagement: {
			familiarSongs: number;
			newSongIntroductionRate: number;
			optimalRotationCandidates: number;
			insights: string[];
		};
		seasonalReadiness: {
			currentSeasonAlignment: number;
			upcomingSeasonPreparation: number;
			seasonalSuggestions: string[];
		};
	}> {
		try {
			// Get comprehensive usage data
			const [allUsage, allSongs] = await Promise.all([
				pb.collection('song_usage').getFullList({
					expand: 'song_id,setlist_id',
					sort: '-used_date'
				}),
				pb.collection('songs').getFullList({
					filter: 'is_active = true'
				})
			]);

			// Analyze rotation health
			const rotationHealth = this.analyzeRotationHealth(
				allUsage as unknown as SongUsage[],
				allSongs as unknown as Song[]
			);

			// Analyze diversity
			const diversityAnalysis = this.analyzeDiversity(
				allUsage as unknown as SongUsage[],
				allSongs as unknown as Song[]
			);

			// Analyze congregation engagement
			const congregationEngagement = this.analyzeCongregationEngagement(
				allUsage as unknown as SongUsage[],
				allSongs as unknown as Song[]
			);

			// Analyze seasonal readiness
			const seasonalReadiness = await this.analyzeSeasonalReadiness(
				allUsage as unknown as SongUsage[],
				allSongs as unknown as Song[]
			);

			return {
				rotationHealth,
				diversityAnalysis,
				congregationEngagement,
				seasonalReadiness
			};
		} catch (error) {
			console.error('Failed to get worship insights:', error);
			throw error;
		}
	}

	private analyzeRotationHealth(allUsage: SongUsage[], allSongs: Song[]) {
		const now = new Date();
		const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
		const fourMonthsAgo = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

		// Categorize songs by last usage
		const neverUsed = allSongs.filter(
			(song) => !allUsage.some((usage) => usage.song_id === song.id)
		);

		const overdue = allSongs.filter((song) => {
			const lastUsage = allUsage.find((usage) => usage.song_id === song.id);
			return lastUsage && new Date(lastUsage.used_date) < fourMonthsAgo;
		});

		const total = allSongs.length;
		const overduePercentage = (overdue.length / total) * 100;
		const neverUsedPercentage = (neverUsed.length / total) * 100;

		let score = 100;
		let status: 'excellent' | 'good' | 'needs_attention' | 'critical' = 'excellent';
		const insights: string[] = [];
		const recommendations: string[] = [];

		// Scoring and status determination
		if (overduePercentage > 40) {
			score -= 40;
			status = 'critical';
			insights.push(`${overduePercentage.toFixed(1)}% of songs haven't been used in 4+ months`);
			recommendations.push(
				'Urgently review song library and retire unused songs or create rotation plan'
			);
		} else if (overduePercentage > 25) {
			score -= 25;
			status = 'needs_attention';
			insights.push(`${overduePercentage.toFixed(1)}% of songs are overdue for rotation`);
			recommendations.push('Create systematic rotation schedule for neglected songs');
		} else if (overduePercentage > 15) {
			score -= 15;
			status = 'good';
			insights.push('Most songs are in healthy rotation');
		}

		if (neverUsedPercentage > 20) {
			score -= 20;
			insights.push(`${neverUsedPercentage.toFixed(1)}% of songs have never been used`);
			recommendations.push('Consider gradual introduction of new songs or archive unused ones');
		}

		return { score, status, insights, recommendations };
	}

	private analyzeDiversity(allUsage: SongUsage[], allSongs: Song[]) {
		// Key diversity analysis
		const keysUsed = new Set(
			allUsage
				.map((usage) => {
					const song = allSongs.find((s) => s.id === usage.song_id);
					return song?.key_signature;
				})
				.filter(Boolean)
		);

		const totalPossibleKeys = 12; // Major/minor for each chromatic note
		const keyDiversity = (keysUsed.size / totalPossibleKeys) * 100;

		// Tempo diversity (categorize by tempo ranges)
		const tempos = allUsage
			.map((usage) => {
				const song = allSongs.find((s) => s.id === usage.song_id);
				return song?.tempo;
			})
			.filter((t): t is number => t !== undefined);
		const fastCount = tempos.filter((t) => t >= 120).length;
		const mediumCount = tempos.filter((t) => t >= 80 && t < 120).length;
		const slowCount = tempos.filter((t) => t < 80).length;
		const total = tempos.length;

		const idealDistribution = { fast: 0.3, medium: 0.4, slow: 0.3 };
		const actualDistribution = {
			fast: fastCount / total,
			medium: mediumCount / total,
			slow: slowCount / total
		};

		const tempoDiversity =
			100 -
			Math.abs(
				(actualDistribution.fast - idealDistribution.fast) * 100 +
					(actualDistribution.medium - idealDistribution.medium) * 100 +
					(actualDistribution.slow - idealDistribution.slow) * 100
			);

		// Artist diversity
		const artistsUsed = new Set(
			allUsage
				.map((usage) => {
					const song = allSongs.find((s) => s.id === usage.song_id);
					return song?.artist;
				})
				.filter(Boolean)
		);

		const totalArtists = new Set(allSongs.map((song) => song.artist).filter(Boolean)).size;
		const artistDiversity = totalArtists > 0 ? (artistsUsed.size / totalArtists) * 100 : 0;

		const recommendations: string[] = [];
		if (keyDiversity < 50) recommendations.push('Expand key variety for better musical flow');
		if (tempoDiversity < 70) recommendations.push('Balance fast, medium, and slow tempo songs');
		if (artistDiversity < 60)
			recommendations.push('Include songs from more diverse artists/writers');

		return {
			keyDiversity: Math.round(keyDiversity),
			tempoDiversity: Math.round(tempoDiversity),
			artistDiversity: Math.round(artistDiversity),
			recommendations
		};
	}

	private analyzeCongregationEngagement(allUsage: SongUsage[], allSongs: Song[]) {
		// Analyze familiarity levels
		const songUsageCounts = new Map<string, number>();
		allUsage.forEach((usage) => {
			const songId = usage.song_id;
			songUsageCounts.set(songId, (songUsageCounts.get(songId) || 0) + 1);
		});

		const familiarSongs = Array.from(songUsageCounts.values()).filter((count) => count >= 5).length;
		const totalSongs = allSongs.length;

		// Calculate new song introduction rate (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const recentNewSongs = allUsage.filter((usage) => {
			const usageDate = new Date(usage.used_date);
			const songUsageCount = songUsageCounts.get(usage.song_id) || 0;
			return usageDate >= sixMonthsAgo && songUsageCount <= 2;
		});

		const newSongIntroductionRate = recentNewSongs.length;

		// Find optimal rotation candidates (songs used 3-8 times, not recently)
		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

		const optimalRotationCandidates = allSongs.filter((song) => {
			const usageCount = songUsageCounts.get(song.id) || 0;
			const lastUsage = allUsage.find((usage) => usage.song_id === song.id);
			const lastUsageDate = lastUsage ? new Date(lastUsage.used_date) : null;

			return usageCount >= 3 && usageCount <= 8 && (!lastUsageDate || lastUsageDate < oneMonthAgo);
		}).length;

		const insights: string[] = [];
		if (familiarSongs / totalSongs < 0.3) {
			insights.push('Consider focusing on building familiarity with core songs');
		}
		if (newSongIntroductionRate > 12) {
			insights.push('High new song introduction rate - ensure congregation can keep up');
		} else if (newSongIntroductionRate < 3) {
			insights.push('Low new song introduction - consider adding fresh content');
		}

		return {
			familiarSongs,
			newSongIntroductionRate,
			optimalRotationCandidates,
			insights
		};
	}

	private async analyzeSeasonalReadiness(allUsage: SongUsage[], allSongs: Song[]) {
		const seasonalContext = await this.getChurchSeasonalContext();
		const currentMonth = seasonalContext.currentMonth;
		const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

		// Current season alignment using timezone-aware context
		const currentSeasonKeywords = this.getSeasonalKeywords(
			currentMonth,
			seasonalContext.hemisphere
		);
		const currentSeasonSongs = allSongs.filter((song) => {
			const title = song.title?.toLowerCase() || '';
			const tags = song.tags || [];
			return currentSeasonKeywords.some(
				(keyword) =>
					title.includes(keyword) || tags.some((tag: string) => tag.toLowerCase().includes(keyword))
			);
		});
		const currentSeasonAlignment = (currentSeasonSongs.length / allSongs.length) * 100;

		// Upcoming season preparation
		const upcomingSeasonKeywords = this.getSeasonalKeywords(nextMonth, seasonalContext.hemisphere);
		const upcomingSeasonSongs = allSongs.filter((song) => {
			const title = song.title?.toLowerCase() || '';
			const tags = song.tags || [];
			return upcomingSeasonKeywords.some(
				(keyword) =>
					title.includes(keyword) || tags.some((tag: string) => tag.toLowerCase().includes(keyword))
			);
		});
		const upcomingSeasonPreparation = (upcomingSeasonSongs.length / allSongs.length) * 100;

		const seasonalSuggestions: string[] = [];
		const currentSeasonName = this.getSeasonName(currentMonth, seasonalContext.hemisphere);
		const upcomingSeasonName = this.getSeasonName(nextMonth, seasonalContext.hemisphere);

		if (currentSeasonAlignment < 10) {
			seasonalSuggestions.push(`Add more ${currentSeasonName} themed songs`);
		}
		if (upcomingSeasonPreparation < 5) {
			seasonalSuggestions.push(`Prepare songs for upcoming ${upcomingSeasonName} season`);
		}

		// Add hemisphere-specific suggestions
		if (seasonalContext.hemisphere === 'southern') {
			seasonalSuggestions.push('Consider seasonal themes appropriate for Southern Hemisphere');
		}

		return {
			currentSeasonAlignment: Math.round(currentSeasonAlignment),
			upcomingSeasonPreparation: Math.round(upcomingSeasonPreparation),
			seasonalSuggestions,
			context: {
				hemisphere: seasonalContext.hemisphere,
				timezone: seasonalContext.timezone,
				currentSeason: currentSeasonName,
				upcomingSeason: upcomingSeasonName
			}
		};
	}

	private getSeasonalKeywords(
		month: number,
		hemisphere: 'northern' | 'southern' = 'northern'
	): string[] {
		// Adjust month for southern hemisphere (seasons are opposite)
		const adjustedMonth = hemisphere === 'southern' ? (month + 6) % 12 || 12 : month;

		// Religious seasons remain the same regardless of hemisphere
		if (month === 12 || month === 1)
			return ['christmas', 'advent', 'joy', 'peace', 'hope', 'light', 'nativity'];
		if (month === 3 || month === 4)
			return [
				'easter',
				'resurrection',
				'risen',
				'victory',
				'new life',
				'palm sunday',
				'good friday'
			];

		// Seasonal themes adjust based on hemisphere
		if (adjustedMonth >= 6 && adjustedMonth <= 8) {
			// Summer in northern hemisphere, winter in southern
			const seasonKeywords =
				hemisphere === 'northern'
					? ['joy', 'celebration', 'summer', 'family', 'vacation', 'outdoors']
					: ['warmth', 'light', 'shelter', 'community', 'comfort'];
			return [...seasonKeywords, 'fellowship', 'gathering'];
		}

		if (adjustedMonth >= 9 && adjustedMonth <= 11) {
			// Fall/Autumn themes
			const fallKeywords =
				hemisphere === 'northern'
					? ['harvest', 'thanksgiving', 'gratitude', 'fall', 'autumn', 'abundance']
					: ['spring', 'new growth', 'renewal', 'fresh start', 'blooming'];
			return [...fallKeywords, 'blessing', 'provision'];
		}

		if (adjustedMonth >= 12 || adjustedMonth <= 2) {
			// Winter themes (excluding Christmas month)
			const winterKeywords =
				hemisphere === 'northern'
					? ['winter', 'peace', 'reflection', 'rest', 'stillness']
					: ['summer', 'growth', 'abundance', 'celebration'];
			return [...winterKeywords, 'prayer', 'meditation'];
		}

		// Spring themes
		const springKeywords =
			hemisphere === 'northern'
				? ['spring', 'new life', 'growth', 'renewal', 'fresh start']
				: ['autumn', 'harvest', 'gratitude', 'reflection'];
		return [...springKeywords, 'hope', 'restoration'];
	}

	private getSeasonName(month: number, hemisphere: 'northern' | 'southern' = 'northern'): string {
		// Religious seasons remain the same
		if (month === 12 || month === 1) return 'Christmas/Advent';
		if (month === 3 || month === 4) return 'Easter/Lent';

		// Adjust for hemisphere
		const adjustedMonth = hemisphere === 'southern' ? (month + 6) % 12 || 12 : month;

		if (adjustedMonth >= 6 && adjustedMonth <= 8) {
			return hemisphere === 'northern' ? 'Summer' : 'Winter';
		}
		if (adjustedMonth >= 9 && adjustedMonth <= 11) {
			return hemisphere === 'northern' ? 'Fall/Thanksgiving' : 'Spring';
		}
		if (adjustedMonth >= 12 || adjustedMonth <= 2) {
			return hemisphere === 'northern' ? 'Winter' : 'Summer';
		}
		return hemisphere === 'northern' ? 'Spring' : 'Fall';
	}

	/**
	 * Detect hemisphere and timezone from user/organization settings
	 */
	private async getChurchSeasonalContext(): Promise<{
		hemisphere: 'northern' | 'southern';
		timezone: string;
		currentMonth: number;
	}> {
		try {
			// Try to get current user's church settings
			const user = pb.authStore.model;
			if (user?.current_church_id) {
				const church = await pb.collection('churches').getOne(user.current_church_id, {
					fields: 'timezone,hemisphere,country'
				});

				if (church) {
					return {
						hemisphere: church.hemisphere || this.detectHemisphereFromTimezone(church.timezone),
						timezone: church.timezone || 'UTC',
						currentMonth: this.getCurrentMonthInTimezone(church.timezone || 'UTC')
					};
				}
			}

			// Fallback: try to detect from browser if available
			const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const hemisphere = this.detectHemisphereFromTimezone(userTimezone);

			return {
				hemisphere,
				timezone: userTimezone,
				currentMonth: this.getCurrentMonthInTimezone(userTimezone)
			};
		} catch (error) {
			// Final fallback to UTC/Northern hemisphere
			console.warn('Could not determine church context, using defaults:', error);
			return {
				hemisphere: 'northern',
				timezone: 'UTC',
				currentMonth: new Date().getUTCMonth() + 1
			};
		}
	}

	private detectHemisphereFromCountry(country?: string): 'northern' | 'southern' {
		if (!country) return 'northern';

		const southernCountries = [
			'australia',
			'new zealand',
			'south africa',
			'argentina',
			'brazil',
			'chile',
			'uruguay',
			'paraguay',
			'bolivia',
			'peru',
			'ecuador',
			'zimbabwe',
			'botswana',
			'namibia',
			'zambia',
			'malawi',
			'madagascar',
			'mauritius',
			'indonesia',
			'east timor'
		];

		return southernCountries.some((sc) => country.toLowerCase().includes(sc))
			? 'southern'
			: 'northern';
	}

	private detectHemisphereFromTimezone(timezone: string): 'northern' | 'southern' {
		const southernTimezones = [
			'Australia/',
			'Pacific/Auckland',
			'Pacific/Fiji',
			'Africa/Johannesburg',
			'America/Sao_Paulo',
			'America/Argentina/',
			'America/Santiago',
			'Indian/Mauritius',
			'Antarctica/'
		];

		return southernTimezones.some((tz) => timezone.startsWith(tz)) ? 'southern' : 'northern';
	}

	private getCurrentMonthInTimezone(timezone: string): number {
		try {
			const now = new Date();
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				month: 'numeric'
			});
			return parseInt(formatter.format(now));
		} catch {
			console.warn('Invalid timezone, using UTC:', timezone);
			return new Date().getUTCMonth() + 1;
		}
	}

	// Helper methods
	private async calculateSeasonalScore(song: Song): Promise<number> {
		const seasonalContext = await this.getChurchSeasonalContext();
		const month = seasonalContext.currentMonth;

		// Seasonal scoring based on song tags or title keywords
		const title = song.title?.toLowerCase() || '';
		const tags = song.tags || [];

		let score = 0;

		// Get current season keywords based on hemisphere
		const seasonalKeywords = this.getSeasonalKeywords(month, seasonalContext.hemisphere);

		// Check if song matches current seasonal themes
		const titleMatches = seasonalKeywords.some((keyword) => title.includes(keyword));
		const tagMatches = tags.some((tag: string) =>
			seasonalKeywords.some((keyword) => tag.toLowerCase().includes(keyword))
		);

		if (titleMatches || tagMatches) {
			// Higher score for exact keyword matches
			if (titleMatches && tagMatches) {
				score = 0.95;
			} else if (titleMatches || tagMatches) {
				score = 0.8;
			}

			// Boost score for religious seasons (same regardless of hemisphere)
			if (
				(month === 12 || month === 1) &&
				(title.includes('christmas') || title.includes('advent'))
			) {
				score = Math.max(score, 0.95);
			}

			if (
				(month === 3 || month === 4) &&
				(title.includes('easter') || title.includes('resurrection'))
			) {
				score = Math.max(score, 0.95);
			}
		}

		return score;
	}

	// Synchronous version for backward compatibility
	private calculateSeasonalScoreSync(
		song: Song,
		hemisphere: 'northern' | 'southern' = 'northern'
	): number {
		const now = new Date();
		const month = now.getMonth() + 1;

		const title = song.title?.toLowerCase() || '';
		const tags = song.tags || [];

		const seasonalKeywords = this.getSeasonalKeywords(month, hemisphere);

		const titleMatches = seasonalKeywords.some((keyword) => title.includes(keyword));
		const tagMatches = tags.some((tag: string) =>
			seasonalKeywords.some((keyword) => tag.toLowerCase().includes(keyword))
		);

		if (titleMatches || tagMatches) {
			if (titleMatches && tagMatches) return 0.95;
			return 0.8;
		}

		return 0;
	}

	private async getSeasonalReason(context?: Record<string, unknown>): Promise<string> {
		const seasonalContext = context || (await this.getChurchSeasonalContext());
		const month = seasonalContext.currentMonth as number;
		const hemisphere = seasonalContext.hemisphere as 'northern' | 'southern';

		// Religious seasons are the same regardless of hemisphere
		if (month === 12 || month === 1) return 'Perfect for Christmas/Advent season';
		if (month === 3 || month === 4) return 'Great for Easter/Lent celebration';

		// Seasonal themes adjust for hemisphere
		const seasonName = this.getSeasonName(month, hemisphere);
		return `Ideal for ${seasonName} worship themes`;
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
