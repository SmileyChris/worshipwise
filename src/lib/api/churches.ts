import { pb } from './client';
import type {
	Church,
	ChurchMembership,
	CreateChurchData,
	UpdateChurchData,
	InviteUserData,
	InitialChurchSetup
} from '$lib/types/church';
import type { User } from '$lib/types/auth';
import {
	getDefaultPermissions,
	getDefaultChurchSettings,
	getTimezoneAwareDefaults,
	detectHemisphereFromTimezone
} from '$lib/types/church';

export class ChurchesAPI {
	/**
	 * Check if any churches exist in the system
	 */
	static async hasChurches(): Promise<boolean> {
		try {
			const churches = await pb.collection('churches').getList(1, 1);
			return churches.totalItems > 0;
		} catch {
			return false;
		}
	}

	/**
	 * Initial setup: Create first church and admin user
	 */
	static async initialSetup(setupData: InitialChurchSetup): Promise<{
		church: Church;
		user: User;
	}> {
		try {
			// Create the admin user first
			const user = await pb.collection('users').create({
				email: setupData.adminEmail,
				password: setupData.password,
				passwordConfirm: setupData.confirmPassword,
				name: setupData.adminName,
				emailVisibility: true
			});

			// Authenticate the user immediately after creation
			await pb.collection('users').authWithPassword(setupData.adminEmail, setupData.password);

			// Generate unique slug from church name
			const baseSlug = setupData.churchName
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-')
				.trim();

			let slug = baseSlug;
			let counter = 1;
			while (!(await this.isSlugAvailable(slug))) {
				slug = `${baseSlug}-${counter}`;
				counter++;
			}

			// Detect hemisphere from timezone
			const hemisphere = detectHemisphereFromTimezone(setupData.timezone);

			// Create church with timezone-aware defaults
			const defaultSettings = getDefaultChurchSettings();
			const timezoneDefaults = getTimezoneAwareDefaults(setupData.timezone);

			const church = await pb.collection('churches').create({
				name: setupData.churchName,
				slug: slug,
				address: setupData.address,
				city: setupData.city,
				state: setupData.state,
				country: setupData.country,
				timezone: setupData.timezone,
				hemisphere: hemisphere,
				subscription_type: 'free',
				subscription_status: 'active',
				max_users: 25, // More generous for initial setup
				max_songs: 500,
				max_storage_mb: 1024,
				owner_user_id: user.id,
				billing_email: setupData.adminEmail,
				settings: {
					...defaultSettings,
					...timezoneDefaults
				},
				is_active: true
			});

			// Create admin membership for the initial user
			await pb.collection('church_memberships').create({
				church_id: church.id,
				user_id: user.id,
				role: 'admin',
				permissions: getDefaultPermissions('admin'),
				status: 'active',
				joined_date: new Date().toISOString(),
				is_active: true
			});

			// Update user with current church
			await pb.collection('users').update(user.id, {
				current_church_id: church.id
			});

			return { church: church as unknown as Church, user: user as unknown as User };
		} catch (error) {
			console.error('Initial setup failed:', error);
			throw error;
		}
	}

	/**
	 * Get current user's churches
	 */
	static async getUserChurches(): Promise<Church[]> {
		const memberships = await pb.collection('church_memberships').getFullList({
			filter: `user_id = "${pb.authStore.model?.id}" && is_active = true`,
			expand: 'church_id'
		});

		return memberships.map((m) => m.expand?.church_id).filter(Boolean) as Church[];
	}

	/**
	 * Create new church
	 */
	static async createChurch(data: CreateChurchData): Promise<Church> {
		const church = await pb.collection('churches').create({
			...data,
			subscription_type: 'free',
			subscription_status: 'active',
			max_users: 10,
			max_songs: 100,
			max_storage_mb: 500,
			owner_user_id: pb.authStore.model?.id,
			settings: {
				default_service_types: ['Sunday Morning', 'Sunday Evening'],
				time_zone: 'Pacific/Auckland',
				week_start: 'sunday',
				repetition_window_days: 30,
				allow_member_song_creation: true,
				auto_approve_members: false,
				...data.settings
			},
			is_active: true
		});

		// Create owner membership
		await pb.collection('church_memberships').create({
			church_id: church.id,
			user_id: pb.authStore.model?.id,
			role: 'owner',
			permissions: [
				'songs:create',
				'songs:edit',
				'songs:delete',
				'services:create',
				'services:edit',
				'services:delete',
				'users:invite',
				'users:manage',
				'users:remove',
				'church:settings',
				'church:billing'
			],
			status: 'active',
			joined_date: new Date().toISOString(),
			is_active: true
		});

		return church as unknown as Church;
	}

	/**
	 * Update church
	 */
	static async updateChurch(id: string, data: UpdateChurchData): Promise<Church> {
		return await pb.collection('churches').update(id, data);
	}

	/**
	 * Get church members
	 */
	static async getChurchMembers(churchId: string): Promise<ChurchMembership[]> {
		return await pb.collection('church_memberships').getFullList({
			filter: `church_id = "${churchId}" && is_active = true`,
			expand: 'user_id',
			sort: 'role,created'
		});
	}

	/**
	 * Invite user to church
	 */
	static async inviteUser(churchId: string, data: InviteUserData): Promise<void> {
		// Create invitation record
		const token = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

		await pb.collection('church_invitations').create({
			church_id: churchId,
			email: data.email,
			role: data.role,
			permissions: data.permissions || [],
			invited_by: pb.authStore.model?.id,
			token: token,
			expires_at: expiresAt.toISOString(),
			is_active: true
		});

		// TODO: Send invitation email
		console.log(`Invitation created for ${data.email} with token: ${token}`);
	}

	/**
	 * Accept church invitation
	 */
	static async acceptInvitation(token: string): Promise<Church> {
		const invitation = await pb
			.collection('church_invitations')
			.getFirstListItem(`token = "${token}" && is_active = true && expires_at > @now`, {
				expand: 'church_id'
			});

		// Create membership
		await pb.collection('church_memberships').create({
			church_id: invitation.church_id,
			user_id: pb.authStore.model?.id,
			role: invitation.role,
			permissions: invitation.permissions,
			status: 'active',
			invited_by: invitation.invited_by,
			invited_date: invitation.created,
			joined_date: new Date().toISOString(),
			is_active: true
		});

		// Mark invitation as used
		await pb.collection('church_invitations').update(invitation.id, {
			used_at: new Date().toISOString(),
			used_by: pb.authStore.model?.id,
			is_active: false
		});

		return invitation.expand?.church_id as Church;
	}

	/**
	 * Remove user from church
	 */
	static async removeMember(membershipId: string): Promise<void> {
		await pb.collection('church_memberships').update(membershipId, {
			is_active: false,
			status: 'suspended'
		});
	}

	/**
	 * Update member role/permissions
	 */
	static async updateMember(
		membershipId: string,
		data: Partial<ChurchMembership>
	): Promise<ChurchMembership> {
		return await pb.collection('church_memberships').update(membershipId, data);
	}

	/**
	 * Get church by slug
	 */
	static async getChurchBySlug(slug: string): Promise<Church | null> {
		try {
			return await pb.collection('churches').getFirstListItem(`slug = "${slug}"`);
		} catch {
			return null;
		}
	}

	/**
	 * Check if slug is available
	 */
	static async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
		try {
			const filter = excludeId ? `slug = "${slug}" && id != "${excludeId}"` : `slug = "${slug}"`;

			const existing = await pb.collection('churches').getFirstListItem(filter);
			return !existing;
		} catch {
			// No church found with this slug, so it's available
			return true;
		}
	}

	/**
	 * Get church statistics
	 */
	static async getChurchStats(churchId: string): Promise<{
		memberCount: number;
		songCount: number;
		serviceCount: number;
		storageUsedMb: number;
	}> {
		const [members, songs, services] = await Promise.all([
			pb.collection('church_memberships').getList(1, 1, {
				filter: `church_id = "${churchId}" && is_active = true`
			}),
			pb.collection('songs').getList(1, 1, {
				filter: `church_id = "${churchId}" && is_active = true`
			}),
			pb.collection('services').getList(1, 1, {
				filter: `church_id = "${churchId}"`
			})
		]);

		return {
			memberCount: members.totalItems,
			songCount: songs.totalItems,
			serviceCount: services.totalItems,
			storageUsedMb: 0 // TODO: Calculate actual storage usage
		};
	}
}
