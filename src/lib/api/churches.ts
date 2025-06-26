import type PocketBase from 'pocketbase';
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

export interface ChurchesAPI {
	hasChurches(): Promise<boolean>;
	initialSetup(setupData: InitialChurchSetup): Promise<{ church: Church; user: User }>;
	getUserChurches(): Promise<Church[]>;
	createChurch(data: CreateChurchData): Promise<Church>;
	updateChurch(id: string, data: UpdateChurchData): Promise<Church>;
	getChurchMembers(churchId: string): Promise<ChurchMembership[]>;
	inviteUser(churchId: string, data: InviteUserData): Promise<void>;
	getPendingInvites(): Promise<any[]>;
	getInvitationByToken(token: string): Promise<any>;
	acceptInvitation(token: string): Promise<Church>;
	declineInvitation(token: string): Promise<void>;
	getSentInvitations(churchId: string): Promise<any[]>;
	cancelInvitation(invitationId: string): Promise<void>;
	resendInvitation(invitationId: string): Promise<void>;
	removeMember(membershipId: string): Promise<void>;
	updateMember(membershipId: string, data: Partial<ChurchMembership>): Promise<ChurchMembership>;
	getChurchBySlug(slug: string): Promise<Church | null>;
	isSlugAvailable(slug: string, excludeId?: string): Promise<boolean>;
	getChurchStats(churchId: string): Promise<{
		memberCount: number;
		songCount: number;
		serviceCount: number;
		storageUsedMb: number;
	}>;
}

export function createChurchesAPI(pb: PocketBase): ChurchesAPI {
	// Define helper functions at the top level
	const isSlugAvailable = async (slug: string, excludeId?: string): Promise<boolean> => {
		try {
			const filter = excludeId ? `slug = "${slug}" && id != "${excludeId}"` : `slug = "${slug}"`;

			const existing = await pb.collection('churches').getFirstListItem(filter);
			return !existing;
		} catch {
			// No church found with this slug, so it's available
			return true;
		}
	};

	const cancelInvitation = async (invitationId: string): Promise<void> => {
		await pb.collection('church_invitations').update(invitationId, {
			is_active: false,
			cancelled_at: new Date().toISOString(),
			cancelled_by: pb.authStore.model?.id
		});
	};

	return {
		/**
		 * Check if any churches exist in the system
		 * Uses anonymous view to avoid authentication requirements
		 */
		async hasChurches(): Promise<boolean> {
			try {
				const result = await pb.collection('setup_status').getFirstListItem('', {
					requestKey: null // Disable caching for setup status
				});
				return result.setup_required === false;
			} catch {
				// If view fails, fallback to checking churches directly (requires auth)
				try {
					const churches = await pb.collection('churches').getList(1, 1);
					return churches.totalItems > 0;
				} catch {
					return false;
				}
			}
		},

		/**
		 * Initial setup: Create first church and admin user
		 */
		async initialSetup(setupData: InitialChurchSetup): Promise<{
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
				while (!(await isSlugAvailable(slug))) {
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

				// User's current church is determined by their active membership, not a field on the user
				return { church: church as unknown as Church, user: user as unknown as User };
			} catch (error) {
				console.error('Initial setup failed:', error);
				throw error;
			}
		},

		/**
		 * Get current user's churches
		 */
		async getUserChurches(): Promise<Church[]> {
			const memberships = await pb.collection('church_memberships').getFullList({
				filter: `user_id = "${pb.authStore.model?.id}" && is_active = true`,
				expand: 'church_id'
			});

			return memberships.map((m) => m.expand?.church_id).filter(Boolean) as Church[];
		},

		/**
		 * Create new church
		 */
		async createChurch(data: CreateChurchData): Promise<Church> {
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
		},

		/**
		 * Update church
		 */
		async updateChurch(id: string, data: UpdateChurchData): Promise<Church> {
			return await pb.collection('churches').update(id, data);
		},

		/**
		 * Get church members
		 */
		async getChurchMembers(churchId: string): Promise<ChurchMembership[]> {
			return await pb.collection('church_memberships').getFullList({
				filter: `church_id = "${churchId}" && is_active = true`,
				expand: 'user_id',
				sort: 'role,created'
			});
		},

		/**
		 * Invite user to church
		 */
		async inviteUser(churchId: string, data: InviteUserData): Promise<void> {
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
		},

		/**
		 * Get pending invitations for current user
		 */
		async getPendingInvites(): Promise<any[]> {
			if (!pb.authStore.model?.email) return [];
			
			return await pb.collection('church_invitations').getFullList({
				filter: `email = "${pb.authStore.model.email}" && is_active = true && expires_at > @now`,
				expand: 'church_id,invited_by',
				sort: '-created'
			});
		},

		/**
		 * Get invitation by token
		 */
		async getInvitationByToken(token: string): Promise<any> {
			return await pb
				.collection('church_invitations')
				.getFirstListItem(`token = "${token}" && is_active = true && expires_at > @now`, {
					expand: 'church_id,invited_by'
				});
		},

		/**
		 * Accept church invitation
		 */
		async acceptInvitation(token: string): Promise<Church> {
			const invitation = await pb
				.collection('church_invitations')
				.getFirstListItem(`token = "${token}" && is_active = true && expires_at > @now`, {
					expand: 'church_id'
				});

			// Check if user already has membership in this church
			const existingMembership = await pb.collection('church_memberships').getFullList({
				filter: `church_id = "${invitation.church_id}" && user_id = "${pb.authStore.model?.id}"`
			});

			if (existingMembership.length > 0) {
				throw new Error('You are already a member of this church');
			}

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
		},

		/**
		 * Decline church invitation
		 */
		async declineInvitation(token: string): Promise<void> {
			const invitation = await pb
				.collection('church_invitations')
				.getFirstListItem(`token = "${token}" && is_active = true && expires_at > @now`);

			// Mark invitation as declined
			await pb.collection('church_invitations').update(invitation.id, {
				is_active: false,
				declined_at: new Date().toISOString(),
				declined_by: pb.authStore.model?.id || invitation.email
			});
		},

		/**
		 * Get sent invitations for a church (admin only)
		 */
		async getSentInvitations(churchId: string): Promise<any[]> {
			return await pb.collection('church_invitations').getFullList({
				filter: `church_id = "${churchId}"`,
				expand: 'invited_by,used_by',
				sort: '-created'
			});
		},

		/**
		 * Cancel invitation (admin only)
		 */
		async cancelInvitation(invitationId: string): Promise<void> {
			return await cancelInvitation(invitationId);
		},

		/**
		 * Resend invitation (creates new invitation with same details)
		 */
		async resendInvitation(invitationId: string): Promise<void> {
			const originalInvite = await pb.collection('church_invitations').getOne(invitationId);
			
			// Cancel the old invitation
			await cancelInvitation(invitationId);
			
			// Create a new invitation with fresh token and expiry
			const token = crypto.randomUUID();
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

			await pb.collection('church_invitations').create({
				church_id: originalInvite.church_id,
				email: originalInvite.email,
				role: originalInvite.role,
				permissions: originalInvite.permissions,
				invited_by: pb.authStore.model?.id,
				token: token,
				expires_at: expiresAt.toISOString(),
				is_active: true,
				resent_from: invitationId
			});
		},

		/**
		 * Remove user from church
		 */
		async removeMember(membershipId: string): Promise<void> {
			await pb.collection('church_memberships').update(membershipId, {
				is_active: false,
				status: 'suspended'
			});
		},

		/**
		 * Update member role/permissions
		 */
		async updateMember(
			membershipId: string,
			data: Partial<ChurchMembership>
		): Promise<ChurchMembership> {
			return await pb.collection('church_memberships').update(membershipId, data);
		},

		/**
		 * Get church by slug
		 */
		async getChurchBySlug(slug: string): Promise<Church | null> {
			try {
				return await pb.collection('churches').getFirstListItem(`slug = "${slug}"`);
			} catch {
				return null;
			}
		},

		/**
		 * Check if slug is available
		 */
		isSlugAvailable,

		/**
		 * Get church statistics
		 */
		async getChurchStats(churchId: string): Promise<{
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
	};
}
