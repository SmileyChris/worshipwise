export interface Category {
	id: string;
	name: string;
	description?: string;
	color?: string;
	sort_order: number;
	is_active: boolean;
	created: string;
	updated: string;
}

export interface Label {
	id: string;
	name: string;
	description?: string;
	color?: string;
	created_by: string;
	is_active: boolean;
	created: string;
	updated: string;

	// Expanded relations
	expand?: {
		created_by?: {
			id: string;
			name: string;
			email: string;
		};
	};
}

export interface LyricsAnalysis {
	title: string;
	artist?: string;
	themes: string[];
	biblical_references: string[];
	worship_elements: string[];
	emotional_tone: string;
	service_placement: string;
	seasonal_appropriateness: string[];
	complexity_level: 'Simple' | 'Moderate' | 'Complex';
	summary: string;
	analyzed_at: string;
	confidence_score?: number;
}

export interface Song {
	id: string;
	church_id: string;
	title: string;
	artist?: string;
	category: string;
	labels?: string[];
	key_signature?: string;
	tempo?: number;
	duration_seconds?: number;
	tags?: string[];
	lyrics?: string;
	chord_chart?: string;
	audio_file?: string;
	sheet_music?: string[];
	ccli_number?: string;
	copyright_info?: string;
	notes?: string;
	lyrics_analysis?: LyricsAnalysis;
	created_by: string;
	is_active: boolean;
	created: string;
	updated: string;

	// Usage tracking (computed client-side)
	lastUsedDate?: Date | null;
	daysSinceLastUsed?: number;
	usageStatus?: 'available' | 'caution' | 'recent';

	// Expanded relations
	expand?: {
		created_by?: {
			id: string;
			name: string;
			email: string;
		};
		category?: Category;
		labels?: Label[];
		song_usage_via_song?: SongUsage[];
	};
}

export interface CreateSongData {
	title: string;
	artist?: string;
	category: string;
	labels?: string[];
	key_signature?: string;
	tempo?: number;
	duration_seconds?: number;
	tags?: string[];
	lyrics?: string;
	chord_chart?: File;
	audio_file?: File;
	sheet_music?: File[];
	ccli_number?: string;
	copyright_info?: string;
	notes?: string;
	lyrics_analysis?: LyricsAnalysis;
}

export interface UpdateSongData {
	title?: string;
	artist?: string;
	category?: string;
	labels?: string[];
	key_signature?: string;
	tempo?: number;
	duration_seconds?: number;
	tags?: string[];
	lyrics?: string;
	chord_chart?: File;
	audio_file?: File;
	sheet_music?: File[];
	ccli_number?: string;
	copyright_info?: string;
	notes?: string;
	lyrics_analysis?: LyricsAnalysis;
}

export interface SongUsage {
	id: string;
	church_id: string;
	song_id: string;
	service_id: string;
	used_date: string;
	worship_leader: string;
	key_used?: string;
	service_type?: string;
	created: string;
	updated: string;
}

export type SongUsageStatus = 'available' | 'caution' | 'recent';

export interface SongWithUsageStatus extends Song {
	usageStatus: SongUsageStatus;
	lastUsedDate?: Date | null;
	daysSinceLastUsed?: number;
}

export interface SongFilterOptions {
	search?: string;
	category?: string;
	labels?: string[];
	key?: string;
	tags?: string[];
	minTempo?: number;
	maxTempo?: number;
	createdBy?: string;
	sort?: string;
}

export interface SongStats {
	totalSongs: number;
	availableSongs: number;
	recentlyUsed: number;
	mostUsedKey?: string;
	averageTempo?: number;
}
