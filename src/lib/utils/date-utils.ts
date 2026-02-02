/**
 * Shared date/time formatting utilities
 */

/**
 * Formats a date as a relative time string (e.g., "5 minutes ago", "2 days ago")
 * @param date - Date object, ISO string, or timestamp in milliseconds
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | string | number): string {
	const timestamp = new Date(date).getTime();
	const now = Date.now();
	const seconds = Math.floor((now - timestamp) / 1000);

	if (seconds < 0) {
		// Future date
		return 'in the future';
	}

	if (seconds < 60) {
		return 'just now';
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	}

	const days = Math.floor(hours / 24);
	if (days < 7) {
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
	}

	const months = Math.floor(days / 30);
	if (months < 12) {
		return `${months} month${months === 1 ? '' : 's'} ago`;
	}

	const years = Math.floor(days / 365);
	return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Formats a number of days as a relative time string
 * @param days - Number of days since an event
 * @returns Human-readable relative time string
 */
export function formatDaysSince(days: number): string {
	if (days === 0) {
		return 'today';
	}

	if (days === 1) {
		return 'yesterday';
	}

	if (days < 7) {
		return `${days} days ago`;
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
	}

	const months = Math.floor(days / 30);
	if (months < 12) {
		return `${months} month${months === 1 ? '' : 's'} ago`;
	}

	const years = Math.floor(days / 365);
	return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Formats days since as weeks (useful for song usage displays)
 * @param days - Number of days since last use
 * @returns Human-readable string like "2 weeks ago"
 */
export function formatWeeksSince(days: number): string {
	if (days === 0) {
		return 'this week';
	}

	if (days < 7) {
		return 'last week';
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
	}

	const months = Math.floor(weeks / 4);
	if (months < 12) {
		return `${months} month${months === 1 ? '' : 's'} ago`;
	}

	const years = Math.floor(months / 12);
	return `${years} year${years === 1 ? '' : 's'} ago`;
}
