export interface SystemStatus {
	pocketbaseRunning: boolean;
	adminExists: boolean;
	usersExist: boolean;
	songsExist: boolean;
	categoriesExist: boolean;
	collectionsExist: boolean;
	needsSetup: boolean;
}

export interface SetupStep {
	id: string;
	title: string;
	description: string;
	status: 'pending' | 'in_progress' | 'completed' | 'error';
	optional?: boolean;
	action?: () => Promise<void>;
}

export interface QuickstartData {
	sampleSongs: SampleSong[];
	sampleSetlists: SampleSetlist[];
}

export interface SampleSong {
	title: string;
	artist: string;
	key_signature?: string;
	tempo?: number;
	genre?: string;
	tags?: string[];
	lyrics?: string;
}

export interface SampleSetlist {
	title: string;
	theme?: string;
	date: string;
	songs: string[]; // song titles to match against sample songs
}
