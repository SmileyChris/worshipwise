import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatDaysSince, formatWeeksSince } from './date-utils';

describe('date-utils', () => {
	describe('formatRelativeTime', () => {
		beforeEach(() => {
			// Mock Date.now() to return a fixed time for consistent testing
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return "just now" for times less than 60 seconds ago', () => {
			const date = new Date('2026-02-03T11:59:30Z');
			expect(formatRelativeTime(date)).toBe('just now');
		});

		it('should return minutes ago for times less than an hour ago', () => {
			const fiveMinutesAgo = new Date('2026-02-03T11:55:00Z');
			expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');

			const oneMinuteAgo = new Date('2026-02-03T11:59:00Z');
			expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
		});

		it('should return hours ago for times less than a day ago', () => {
			const twoHoursAgo = new Date('2026-02-03T10:00:00Z');
			expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

			const oneHourAgo = new Date('2026-02-03T11:00:00Z');
			expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
		});

		it('should return days ago for times less than a week ago', () => {
			const threeDaysAgo = new Date('2026-01-31T12:00:00Z');
			expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');

			const oneDayAgo = new Date('2026-02-02T12:00:00Z');
			expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
		});

		it('should return weeks ago for times less than a month ago', () => {
			const twoWeeksAgo = new Date('2026-01-20T12:00:00Z');
			expect(formatRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');

			const oneWeekAgo = new Date('2026-01-27T12:00:00Z');
			expect(formatRelativeTime(oneWeekAgo)).toBe('1 week ago');
		});

		it('should return months ago for times less than a year ago', () => {
			const twoMonthsAgo = new Date('2025-12-03T12:00:00Z');
			expect(formatRelativeTime(twoMonthsAgo)).toBe('2 months ago');

			const oneMonthAgo = new Date('2026-01-03T12:00:00Z');
			expect(formatRelativeTime(oneMonthAgo)).toBe('1 month ago');
		});

		it('should return years ago for times more than a year ago', () => {
			const twoYearsAgo = new Date('2024-02-03T12:00:00Z');
			expect(formatRelativeTime(twoYearsAgo)).toBe('2 years ago');

			const oneYearAgo = new Date('2025-02-03T12:00:00Z');
			expect(formatRelativeTime(oneYearAgo)).toBe('1 year ago');
		});

		it('should handle string dates', () => {
			expect(formatRelativeTime('2026-02-03T11:55:00Z')).toBe('5 minutes ago');
		});

		it('should handle timestamp numbers', () => {
			const fiveMinutesAgo = new Date('2026-02-03T11:55:00Z').getTime();
			expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
		});

		it('should handle future dates', () => {
			const futureDate = new Date('2026-02-04T12:00:00Z');
			expect(formatRelativeTime(futureDate)).toBe('in the future');
		});
	});

	describe('formatDaysSince', () => {
		it('should return "today" for 0 days', () => {
			expect(formatDaysSince(0)).toBe('today');
		});

		it('should return "yesterday" for 1 day', () => {
			expect(formatDaysSince(1)).toBe('yesterday');
		});

		it('should return "X days ago" for 2-6 days', () => {
			expect(formatDaysSince(2)).toBe('2 days ago');
			expect(formatDaysSince(6)).toBe('6 days ago');
		});

		it('should return "X weeks ago" for 7-27 days', () => {
			expect(formatDaysSince(7)).toBe('1 week ago');
			expect(formatDaysSince(14)).toBe('2 weeks ago');
			expect(formatDaysSince(21)).toBe('3 weeks ago');
		});

		it('should return "X months ago" for 30-364 days', () => {
			expect(formatDaysSince(30)).toBe('1 month ago');
			expect(formatDaysSince(60)).toBe('2 months ago');
			expect(formatDaysSince(180)).toBe('6 months ago');
		});

		it('should return "X years ago" for 365+ days', () => {
			expect(formatDaysSince(365)).toBe('1 year ago');
			expect(formatDaysSince(730)).toBe('2 years ago');
		});
	});

	describe('formatWeeksSince', () => {
		it('should return "this week" for 0 days', () => {
			expect(formatWeeksSince(0)).toBe('this week');
		});

		it('should return "last week" for 1-6 days', () => {
			expect(formatWeeksSince(1)).toBe('last week');
			expect(formatWeeksSince(6)).toBe('last week');
		});

		it('should return "X weeks ago" for 7-27 days', () => {
			expect(formatWeeksSince(7)).toBe('1 week ago');
			expect(formatWeeksSince(14)).toBe('2 weeks ago');
			expect(formatWeeksSince(21)).toBe('3 weeks ago');
		});

		it('should return "X months ago" for 4+ weeks', () => {
			expect(formatWeeksSince(28)).toBe('1 month ago');
			expect(formatWeeksSince(56)).toBe('2 months ago');
		});

		it('should return "X years ago" for 12+ months', () => {
			expect(formatWeeksSince(365)).toBe('1 year ago');
			expect(formatWeeksSince(730)).toBe('2 years ago');
		});
	});
});
