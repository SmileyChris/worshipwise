// Service related types for WorshipWise
import type { User } from './auth';
import type { Song } from './song';

export interface Service {
	id: string;
	church_id: string;
	title: string;
	service_date: string;
	service_type?: string;
	theme?: string;
	notes?: string;
	worship_leader: string;
	team_members?: string[] | Record<string, unknown>;
	team_skills?: ServiceTeamSkills; // Skill-based team assignments
	is_completed?: boolean;
	is_archived?: boolean;
	// Optional advanced fields (may not exist in all environments)
	status?: 'draft' | 'planned' | 'in_progress' | 'completed' | 'archived';
	estimated_duration?: number;
	actual_duration?: number;
	is_template?: boolean;
	
	// Approval workflow fields
	approval_status?: 'not_required' | 'pending_approval' | 'approved' | 'rejected' | 'changes_requested';
	approval_requested_at?: string;
	approval_requested_by?: string;
	approved_by?: string;
	approval_date?: string;
	approval_notes?: string;
	
	created: string;
	updated: string;

	// Expanded fields
	expand?: {
		worship_leader?: User;
		approval_requested_by?: User;
		approved_by?: User;
	};
}

// Skill-based team assignments
export interface ServiceTeamSkills {
	[skillId: string]: string; // skillId -> userId mapping
}

export interface ServiceSong {
	id: string;
	service_id: string;
	song_id: string;
	order_position: number;
	transposed_key?: string;
	special_notes?: string;
	// Optional advanced fields (may not exist in all environments)
	section_type?: string;
	tempo_override?: number;
	duration_override?: number;
	transition_notes?: string;
	created: string;
	updated: string;

	// Expanded fields
	expand?: {
		song_id?: Song;
		service_id?: Service;
	};
}

// Create/Update DTOs
export interface CreateServiceData {
	title: string;
	service_date: string;
	service_type?: Service['service_type'];
	theme?: string;
	notes?: string;
	worship_leader: string;
	team_members?: string[] | Record<string, unknown>;
	team_skills?: ServiceTeamSkills;
	estimated_duration?: number;
	is_template?: boolean;
	status?: Service['status'];
}

export interface UpdateServiceData {
	title?: string;
	service_date?: string;
	service_type?: Service['service_type'];
	theme?: string;
	notes?: string;
	worship_leader?: string;
	team_members?: string[] | Record<string, unknown>;
	team_skills?: ServiceTeamSkills;
	status?: Service['status'];
	estimated_duration?: number;
	actual_duration?: number;
	is_template?: boolean;
}

export interface CreateServiceSongData {
	service_id: string;
	song_id: string;
	order_position?: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?: ServiceSong['section_type'];
	duration_override?: number;
}

export interface AddSongToServiceData {
	song_id: string;
	order_position?: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?: ServiceSong['section_type'];
	duration_override?: number;
}

export interface UpdateServiceSongData {
	order_position?: number;
	transposed_key?: string;
	tempo_override?: number;
	transition_notes?: string;
	section_type?: ServiceSong['section_type'];
	duration_override?: number;
}

// Filter options
export interface ServiceFilterOptions {
	search?: string;
	status?: Service['status'];
	serviceType?: Service['service_type'];
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

// Service analytics
export interface ServiceAnalytics {
	totalServices: number;
	completedServices: number;
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
		serviceCount: number;
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
	sectionType?: ServiceSong['section_type'];
}

// Service builder state
export interface ServiceBuilderState {
	service: Service | null;
	songs: ServiceSong[];
	isLoading: boolean;
	isDirty: boolean;
	error: string | null;
	draggedSong: DraggedSong | null;
	selectedSongs: string[];
}

// Real-time collaboration
export interface ServiceCollaborationEvent {
	type: 'song_added' | 'song_removed' | 'song_updated' | 'song_reordered' | 'service_updated';
	userId: string;
	userName?: string;
	timestamp: string;
	data: Record<string, unknown>;
}

export interface CollaboratorPresence {
	userId: string;
	userName: string;
	lastSeen: string;
	currentSection?: string;
	isEditing?: boolean;
}

// Service Comments
export interface ServiceComment {
	id: string;
	service_id: string;
	user_id: string;
	comment: string;
	parent_id?: string;
	mentions?: string[];
	edited?: boolean;
	edited_at?: string;
	created: string;
	updated: string;
	
	// Expanded fields
	expand?: {
		user_id?: User;
		parent_id?: ServiceComment;
		mentions?: User[];
	};
}

export interface CreateServiceCommentData {
	service_id: string;
	comment: string;
	parent_id?: string;
	mentions?: string[];
}

export interface UpdateServiceCommentData {
	comment: string;
	edited?: boolean;
	edited_at?: string;
}
