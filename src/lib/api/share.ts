import type PocketBase from 'pocketbase';
import type { AuthContext } from '$lib/types/auth';
import type { TeamShareLink, CreateTeamShareLinkData } from '$lib/types/notification';

export class ShareAPI {
	private collection = 'team_share_links';

	constructor(
		private authContext: AuthContext,
		private pb: PocketBase
	) {}

	/**
	 * Generate a random token
	 */
	private generateToken(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let token = '';
		for (let i = 0; i < 32; i++) {
			token += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return token;
	}

	/**
	 * Create a new share link
	 */
	async createShareLink(data: CreateTeamShareLinkData): Promise<TeamShareLink> {
		try {
			if (!this.authContext.currentChurch?.id || !this.authContext.user?.id) {
				throw new Error('No church or user context');
			}

			// Calculate expiration date
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + (data.expires_in_days || 30));

			const createData = {
				church_id: this.authContext.currentChurch.id,
				token: this.generateToken(),
				expires_at: expiresAt.toISOString(),
				created_by: this.authContext.user.id,
				access_type: data.access_type
			};

			const record = await this.pb.collection(this.collection).create(createData);
			return record as unknown as TeamShareLink;
		} catch (error) {
			console.error('Failed to create share link:', error);
			throw error;
		}
	}

	/**
	 * Get all active share links for the current church
	 */
	async getShareLinks(): Promise<TeamShareLink[]> {
		try {
			if (!this.authContext.currentChurch?.id) {
				throw new Error('No church selected');
			}

			const now = new Date().toISOString();
			const records = await this.pb.collection(this.collection).getFullList({
				filter: `church_id = "${this.authContext.currentChurch.id}" && expires_at > "${now}"`,
				sort: '-created',
				expand: 'created_by'
			});

			return records as unknown as TeamShareLink[];
		} catch (error) {
			console.error('Failed to fetch share links:', error);
			throw error;
		}
	}

	/**
	 * Get share link by token (for public access)
	 */
	async getShareLinkByToken(token: string): Promise<TeamShareLink | null> {
		try {
			const now = new Date().toISOString();
			const record = await this.pb
				.collection(this.collection)
				.getFirstListItem(`token = "${token}" && expires_at > "${now}"`, { expand: 'church_id' });

			return record as unknown as TeamShareLink;
		} catch (error: any) {
			if (error?.status === 404) {
				return null;
			}
			console.error('Failed to fetch share link by token:', error);
			throw error;
		}
	}

	/**
	 * Delete a share link
	 */
	async deleteShareLink(id: string): Promise<void> {
		try {
			await this.pb.collection(this.collection).delete(id);
		} catch (error) {
			console.error('Failed to delete share link:', error);
			throw error;
		}
	}

	/**
	 * Build full share URL
	 */
	buildShareUrl(token: string): string {
		// In production, this would use the actual domain
		const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
		return `${baseUrl}/share/${token}`;
	}
}

// Factory function for creating ShareAPI instances
export function createShareAPI(authContext: AuthContext, pb: PocketBase): ShareAPI {
	return new ShareAPI(authContext, pb);
}
