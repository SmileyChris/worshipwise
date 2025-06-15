export interface Song {
	id: string;
	title: string;
	artist?: string;
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
		song_usage_via_song?: SongUsage[];
	};
}

export interface CreateSongData {
	title: string;
	artist?: string;
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
}

export interface UpdateSongData {
	title?: string;
	artist?: string;
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
}

export interface SongUsage {
	id: string;
	song: string;
	setlist: string;
	usage_date: string;
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
