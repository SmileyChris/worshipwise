// Setlist related types for WorshipWise

export interface Setlist {
	id: string;
	title: string;
	service_date: string;
	service_type?:
		| 'Sunday Morning'
		| 'Sunday Evening'
		| 'Wednesday Night'
		| 'Special Event'
		| 'Youth Service'
		| 'Prayer Meeting'
		| 'Conference'
		| 'Outreach';
	theme?: string;
	notes?: string;
	worship_leader: string;
	team_members?: string[];
	status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'archived';
	estimated_duration?: number;
	actual_duration?: number;
	created_by: string;
	is_template?: boolean;
	created: string;
	updated: string;

	// Expanded fields
	expand?: {
		worship_leader?: User;
		team_members?: User[];
		created_by?: User;
	};
}

export interface SetlistSong {
	id: string;
	setlist_id: string;
	song_id: string;
	order_position: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?:
		| 'Opening'
		| 'Call to Worship'
		| 'Praise & Worship'
		| 'Intercession'
		| 'Offering'
		| 'Communion'
		| 'Response'
		| 'Closing'
		| 'Special Music';
	duration_override?: number;
	added_by: string;
	created: string;
	updated: string;

	// Expanded fields
	expand?: {
		song_id?: import('./song').Song;
		added_by?: User;
	};
}

export interface SongUsage {
	id: string;
	song_id: string;
	setlist_id: string;
	used_date: string;
	used_key?: string;
	position_in_setlist?: number;
	worship_leader: string;
	service_type?: string;
	created: string;
	updated: string;

	// Expanded fields
	expand?: {
		song_id?: import('./song').Song;
		setlist_id?: Setlist;
		worship_leader?: User;
	};
}

// User type reference (should be imported from auth.ts)
interface User {
	id: string;
	name: string;
	email: string;
	role: 'musician' | 'leader' | 'admin';
}

// Create/Update DTOs
export interface CreateSetlistData {
	title: string;
	service_date: string;
	service_type?: Setlist['service_type'];
	theme?: string;
	notes?: string;
	worship_leader: string;
	team_members?: string[];
	estimated_duration?: number;
	is_template?: boolean;
	status?: Setlist['status'];
}

export interface UpdateSetlistData {
	title?: string;
	service_date?: string;
	service_type?: Setlist['service_type'];
	theme?: string;
	notes?: string;
	worship_leader?: string;
	team_members?: string[];
	status?: Setlist['status'];
	estimated_duration?: number;
	actual_duration?: number;
	is_template?: boolean;
}

export interface CreateSetlistSongData {
	setlist_id: string;
	song_id: string;
	order_position?: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?: SetlistSong['section_type'];
	duration_override?: number;
}

export interface UpdateSetlistSongData {
	order_position?: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?: SetlistSong['section_type'];
	duration_override?: number;
}

// Filter options
export interface SetlistFilterOptions {
	search?: string;
	status?: Setlist['status'];
	serviceType?: Setlist['service_type'];
	worshipLeader?: string;
	dateFrom?: string;
	dateTo?: string;
	templatesOnly?: boolean;
	excludeTemplates?: boolean;
	sort?: string;
}

// Song availability indicators
export interface SongAvailability {
	songId: string;
	status: 'available' | 'caution' | 'recent';
	lastUsed?: string;
	daysSinceLastUse?: number;
	usageCount?: number;
	message?: string;
}

// Setlist analytics
export interface SetlistAnalytics {
	totalSetlists: number;
	completedSetlists: number;
	averageDuration: number;
	mostUsedSongs: Array<{
		songId: string;
		title: string;
		usageCount: number;
	}>;
	serviceTypeBreakdown: Record<string, number>;
	worshipLeaderStats: Array<{
		leaderId: string;
		name: string;
		setlistCount: number;
	}>;
}

// Drag and drop interfaces
export interface DraggedSong {
	id: string;
	title: string;
	artist?: string;
	key_signature?: string;
	tempo?: number;
	duration_seconds?: number;
}

export interface DropZoneData {
	position: number;
	sectionType?: SetlistSong['section_type'];
}

// Setlist builder state
export interface SetlistBuilderState {
	setlist: Setlist | null;
	songs: SetlistSong[];
	isLoading: boolean;
	isDirty: boolean;
	error: string | null;
	draggedSong: DraggedSong | null;
	selectedSongs: string[];
}

// Real-time collaboration
export interface SetlistCollaborationEvent {
	type: 'song_added' | 'song_removed' | 'song_updated' | 'song_reordered' | 'setlist_updated';
	userId: string;
	userName?: string;
	timestamp: string;
	data: any;
}

export interface CollaboratorPresence {
	userId: string;
	userName: string;
	lastSeen: string;
	currentSection?: string;
	isEditing?: boolean;
}
