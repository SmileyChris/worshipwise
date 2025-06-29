export type NotificationType =
	| 'song_added'
	| 'song_retired'
	| 'song_suggested'
	| 'service_reminder';

export interface Notification {
	id: string;
	church_id: string;
	user_id: string;
	type: NotificationType;
	title: string;
	message: string;
	data?: Record<string, any>;
	is_read?: boolean;
	created: string;
	updated: string;

	// Expanded relations
	expand?: {
		church_id?: {
			id: string;
			name: string;
		};
	};
}

export interface CreateNotificationData {
	type: NotificationType;
	title: string;
	message: string;
	data?: Record<string, any>;
}

export interface TeamShareLink {
	id: string;
	church_id: string;
	token: string;
	expires_at: string;
	created_by: string;
	access_type: 'ratings' | 'suggestions' | 'both';
	created: string;
	updated: string;

	// Expanded relations
	expand?: {
		church_id?: {
			id: string;
			name: string;
		};
		created_by?: {
			id: string;
			name: string;
			email: string;
		};
	};
}

export interface CreateTeamShareLinkData {
	access_type: 'ratings' | 'suggestions' | 'both';
	expires_in_days?: number; // Default 30
}
