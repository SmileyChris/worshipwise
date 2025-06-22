import { describe, it, expect } from 'vitest';
import {
	SECTION_TYPES,
	calculateServiceDuration,
	formatServiceDuration,
	formatServiceDurationLong,
	reorderSongs,
	generateOrderMapping,
	checkSchedulingConflicts,
	validateServiceData,
	groupSongsBySection,
	calculateSectionDuration,
	findOptimalInsertionPosition,
	generateServicePDFData,
	validateServiceFlow
} from '$lib/utils/service-utils';
import { createMockSong } from '../../helpers/test-utils';

describe('Service Utils', () => {
	const mockServiceSongs = [
		{
			id: '1',
			service_id: 'service-1',
			song_id: 'song-1',
			order_position: 1,
			section_type: 'Opening' as const,
			duration_override: 240,
			created: '2023-01-01T00:00:00Z',
			updated: '2023-01-01T00:00:00Z',
			expand: { song_id: createMockSong({ id: 'song-1', duration_seconds: 180, title: 'Song 1' }) }
		},
		{
			id: '2',
			service_id: 'service-1',
			song_id: 'song-2',
			order_position: 2,
			section_type: 'Praise & Worship' as const,
			created: '2023-01-01T00:00:00Z',
			updated: '2023-01-01T00:00:00Z',
			expand: { song_id: createMockSong({ id: 'song-2', duration_seconds: 300, title: 'Song 2' }) }
		},
		{
			id: '3',
			service_id: 'service-1',
			song_id: 'song-3',
			order_position: 3,
			section_type: 'Closing' as const,
			created: '2023-01-01T00:00:00Z',
			updated: '2023-01-01T00:00:00Z',
			expand: { song_id: createMockSong({ id: 'song-3', duration_seconds: 200, title: 'Song 3' }) }
		}
	];

	describe('SECTION_TYPES', () => {
		it('should contain all standard service sections', () => {
			expect(SECTION_TYPES).toContain('Opening');
			expect(SECTION_TYPES).toContain('Praise & Worship');
			expect(SECTION_TYPES).toContain('Closing');
			expect(SECTION_TYPES).toHaveLength(9);
		});
	});

	describe('calculateServiceDuration', () => {
		it('should calculate total duration using duration overrides and defaults', () => {
			const duration = calculateServiceDuration(mockServiceSongs as any);
			// 240 (override) + 300 (default) + 200 (default) = 740
			expect(duration).toBe(740);
		});

		it('should handle empty song list', () => {
			expect(calculateServiceDuration([])).toBe(0);
		});

		it('should handle songs without duration', () => {
			const songsWithoutDuration = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Opening' as const,
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z',
					expand: {
						song_id: createMockSong({ id: 'song-1', title: 'Song 1', duration_seconds: undefined })
					}
				}
			];
			expect(calculateServiceDuration(songsWithoutDuration)).toBe(0);
		});
	});

	describe('formatServiceDuration', () => {
		it('should format zero duration', () => {
			expect(formatServiceDuration(0)).toBe('0:00');
		});

		it('should format seconds', () => {
			expect(formatServiceDuration(45)).toBe('0:45');
		});

		it('should format minutes and seconds', () => {
			expect(formatServiceDuration(125)).toBe('2:05');
		});

		it('should pad single digit seconds', () => {
			expect(formatServiceDuration(65)).toBe('1:05');
		});
	});

	describe('formatServiceDurationLong', () => {
		it('should format zero duration', () => {
			expect(formatServiceDurationLong(0)).toBe('0 minutes');
		});

		it('should format single minute', () => {
			expect(formatServiceDurationLong(60)).toBe('1 minute');
		});

		it('should format multiple minutes', () => {
			expect(formatServiceDurationLong(300)).toBe('5 minutes');
		});

		it('should format hours', () => {
			expect(formatServiceDurationLong(3600)).toBe('1 hour');
		});

		it('should format hours and minutes', () => {
			expect(formatServiceDurationLong(3900)).toBe('1 hour 5 minutes');
		});

		it('should handle plural hours', () => {
			expect(formatServiceDurationLong(7200)).toBe('2 hours');
		});
	});

	describe('reorderSongs', () => {
		const songs = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

		it('should reorder songs correctly', () => {
			const result = reorderSongs(songs, 0, 2);
			expect(result.map((s) => s.id)).toEqual(['2', '3', '1', '4']);
		});

		it('should handle moving to end', () => {
			const result = reorderSongs(songs, 0, 3);
			expect(result.map((s) => s.id)).toEqual(['2', '3', '4', '1']);
		});

		it('should handle same position', () => {
			const result = reorderSongs(songs, 1, 1);
			expect(result.map((s) => s.id)).toEqual(['1', '2', '3', '4']);
		});

		it('should handle invalid indices', () => {
			expect(reorderSongs(songs, -1, 2)).toEqual(songs);
			expect(reorderSongs(songs, 0, 10)).toEqual(songs);
		});
	});

	describe('generateOrderMapping', () => {
		it('should generate correct order mapping', () => {
			const songs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
			const mapping = generateOrderMapping(songs);

			expect(mapping).toEqual([
				{ id: 'a', position: 0 },
				{ id: 'b', position: 1 },
				{ id: 'c', position: 2 }
			]);
		});

		it('should handle empty array', () => {
			expect(generateOrderMapping([])).toEqual([]);
		});
	});

	describe('checkSchedulingConflicts', () => {
		const existingServices = [
			{ id: '1', service_date: '2024-01-01', service_type: 'Sunday Morning' },
			{ id: '2', service_date: '2024-01-01', service_type: 'Sunday Evening' },
			{ id: '3', service_date: '2024-01-02', service_type: 'Sunday Morning' }
		];

		it('should detect conflicts', () => {
			const result = checkSchedulingConflicts('2024-01-01', 'Sunday Morning', existingServices);

			expect(result.hasConflict).toBe(true);
			expect(result.conflictMessage).toContain('already scheduled');
		});

		it('should not detect conflicts for different dates', () => {
			const result = checkSchedulingConflicts('2024-01-03', 'Sunday Morning', existingServices);

			expect(result.hasConflict).toBe(false);
		});

		it('should not detect conflicts for different service types', () => {
			const result = checkSchedulingConflicts('2024-01-01', 'Wednesday Night', existingServices);

			expect(result.hasConflict).toBe(false);
		});

		it('should exclude current service when editing', () => {
			const result = checkSchedulingConflicts(
				'2024-01-01',
				'Sunday Morning',
				existingServices,
				'1'
			);

			expect(result.hasConflict).toBe(false);
		});
	});

	describe('validateServiceData', () => {
		it('should validate correct data', () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const tomorrowString = tomorrow.toISOString().split('T')[0];

			const data = {
				title: 'Sunday Service',
				service_date: tomorrowString,
				estimated_duration: 60
			};

			const result = validateServiceData(data);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it('should require title', () => {
			const data = {
				title: '',
				service_date: '2024-12-31'
			};

			const result = validateServiceData(data);
			expect(result.isValid).toBe(false);
			expect(result.errors.title).toBe('Title is required');
		});

		it('should validate title length', () => {
			const data = {
				title: 'a'.repeat(201),
				service_date: '2024-12-31'
			};

			const result = validateServiceData(data);
			expect(result.isValid).toBe(false);
			expect(result.errors.title).toBe('Title must be less than 200 characters');
		});

		it('should require service date', () => {
			const data = {
				title: 'Sunday Service',
				service_date: ''
			};

			const result = validateServiceData(data);
			expect(result.isValid).toBe(false);
			expect(result.errors.service_date).toBe('Service date is required');
		});

		it('should validate duration range', () => {
			const data = {
				title: 'Sunday Service',
				service_date: '2024-12-31',
				estimated_duration: 500
			};

			const result = validateServiceData(data);
			expect(result.isValid).toBe(false);
			expect(result.errors.estimated_duration).toBe(
				'Duration must be between 10 minutes and 8 hours'
			);
		});
	});

	describe('groupSongsBySection', () => {
		it('should group songs by section type', () => {
			const grouped = groupSongsBySection(mockServiceSongs as any);

			expect(grouped['Opening']).toHaveLength(1);
			expect(grouped['Praise & Worship']).toHaveLength(1);
			expect(grouped['Closing']).toHaveLength(1);
		});

		it('should handle songs without section type', () => {
			const songsWithoutSection = [
				{
					...mockServiceSongs[0],
					section_type: undefined as any,
					expand: {
						song_id: createMockSong({ duration_seconds: 300, title: 'Uncategorized Song' })
					}
				}
			];

			const grouped = groupSongsBySection(songsWithoutSection);
			expect(grouped['Uncategorized']).toHaveLength(1);
		});
	});

	describe('calculateSectionDuration', () => {
		it('should calculate section duration', () => {
			const openingSongs = mockServiceSongs.filter((s) => s.section_type === 'Opening');
			const duration = calculateSectionDuration(openingSongs);
			expect(duration).toBe(240); // duration_override
		});
	});

	describe('findOptimalInsertionPosition', () => {
		it('should find position after same section type', () => {
			const songs = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Opening',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				},
				{
					id: '2',
					service_id: 'service-1',
					song_id: 'song-2',
					order_position: 2,
					section_type: 'Opening',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				},
				{
					id: '3',
					service_id: 'service-1',
					song_id: 'song-3',
					order_position: 3,
					section_type: 'Praise & Worship',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				}
			];

			const position = findOptimalInsertionPosition(songs, 'Opening');
			expect(position).toBe(2);
		});

		it('should find position based on service flow order', () => {
			const songs = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Opening',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				},
				{
					id: '2',
					service_id: 'service-1',
					song_id: 'song-2',
					order_position: 2,
					section_type: 'Closing',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				}
			];

			const position = findOptimalInsertionPosition(songs, 'Praise & Worship');
			expect(position).toBe(1);
		});

		it('should append at end if no appropriate position found', () => {
			const songs = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Opening',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				}
			];

			const position = findOptimalInsertionPosition(songs, 'Special Music');
			expect(position).toBe(1);
		});
	});

	describe('generateServicePDFData', () => {
		const mockService = {
			id: 'service1',
			title: 'Sunday Service',
			service_date: '2024-01-01',
			service_type: 'Sunday Morning',
			theme: 'New Beginnings',
			worship_leader: 'user1',
			created: '2024-01-01T00:00:00Z',
			updated: '2024-01-01T00:00:00Z',
			expand: { 
				worship_leader: { 
					id: 'user1',
					name: 'John Doe',
					email: 'john@example.com',
					created: '2024-01-01T00:00:00Z',
					updated: '2024-01-01T00:00:00Z',
					verified: true,
					avatar: '',
					emailVisibility: false
				} 
			}
		};

		it('should generate correct PDF data structure', () => {
			const pdfData = generateServicePDFData(mockService, mockServiceSongs as any);

			expect(pdfData.title).toBe('Sunday Service');
			expect(pdfData.date).toBe('2024-01-01');
			expect(pdfData.worshipLeader).toBe('John Doe');
			expect(pdfData.sections).toHaveLength(3);
		});

		it('should handle missing data gracefully', () => {
			const minimalService = {
				id: 'service2',
				title: 'Service',
				service_date: '2024-01-01',
				worship_leader: 'user1',
				created: '2024-01-01T00:00:00Z',
				updated: '2024-01-01T00:00:00Z'
			};

			const pdfData = generateServicePDFData(minimalService, []);
			expect(pdfData.worshipLeader).toBe('Unknown');
			expect(pdfData.sections).toHaveLength(0);
		});
	});

	describe('validateServiceFlow', () => {
		it('should validate good service flow', () => {
			const goodFlow = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Opening',
					duration_override: 300,
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z',
					expand: { song_id: createMockSong({ duration_seconds: 300 }) }
				},
				{
					id: '2',
					service_id: 'service-1',
					song_id: 'song-2',
					order_position: 2,
					section_type: 'Praise & Worship',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z',
					expand: { song_id: createMockSong({ duration_seconds: 400 }) }
				},
				{
					id: '3',
					service_id: 'service-1',
					song_id: 'song-3',
					order_position: 3,
					section_type: 'Closing',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z',
					expand: { song_id: createMockSong({ duration_seconds: 400 }) }
				}
			];

			const result = validateServiceFlow(goodFlow);
			expect(result.warnings).toHaveLength(0);
			expect(result.isValid).toBe(true);
		});

		it('should suggest missing sections', () => {
			const missingOpening = [
				{
					id: '1',
					service_id: 'service-1',
					song_id: 'song-1',
					order_position: 1,
					section_type: 'Praise & Worship',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				},
				{
					id: '2',
					service_id: 'service-1',
					song_id: 'song-2',
					order_position: 2,
					section_type: 'Closing',
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				}
			];

			const result = validateServiceFlow(missingOpening);
			expect(result.suggestions).toContain('Consider adding an opening song to start the service');
		});

		it('should warn about long services', () => {
			const longSongs = Array(10)
				.fill(null)
				.map((_, i) => ({
					id: `song-${i}`,
					service_id: 'service-1',
					song_id: `song-${i}`,
					order_position: i + 1,
					section_type: 'Praise & Worship',
					duration_override: 800, // 13+ minutes each = over 2 hours total
					created: '2023-01-01T00:00:00Z',
					updated: '2023-01-01T00:00:00Z'
				}));

			const result = validateServiceFlow(longSongs);
			expect(result.warnings).toContain('Service duration is very long (over 2 hours)');
		});

		it('should handle empty service', () => {
			const result = validateServiceFlow([]);
			expect(result.isValid).toBe(true);
		});
	});
});
