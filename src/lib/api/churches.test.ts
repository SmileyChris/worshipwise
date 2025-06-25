import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InitialChurchSetup, InviteUserData } from '$lib/types/church';
import { mockPb } from '$tests/helpers/pb-mock';
import { ChurchesAPI } from './churches';

describe('Churches API - Simple Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPb.reset();
		mockPb.authStore.model = { id: 'user1' };
	});

	describe('hasChurches', () => {
		it('should return true when churches exist', async () => {
			mockPb
				.collection('setup_status')
				.getFirstListItem.mockResolvedValue({ setup_required: false });

			const result = await ChurchesAPI.hasChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('setup_status');
			expect(result).toBe(true);
		});

		it('should return false when no churches exist', async () => {
			const notFoundError: any = new Error('Not found');
			notFoundError.status = 404;
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(notFoundError);
			mockPb.collection('churches').getFullList.mockRejectedValue(notFoundError);

			const result = await ChurchesAPI.hasChurches();

			expect(result).toBe(false);
		});
	});

	describe('initialSetup', () => {
		it('should create admin user and church', async () => {
			const setupData: InitialChurchSetup = {
				churchName: 'Test Church',
				timezone: 'America/New_York',
				adminName: 'Admin',
				adminEmail: 'admin@test.com',
				password: 'password123',
				confirmPassword: 'password123'
			};

			const createdUser = { id: 'user-1', email: 'admin@test.com', name: 'Admin' };
			const createdChurch = { id: 'church-1', name: 'Test Church', timezone: 'America/New_York' };
			const createdMembership = {
				id: 'membership-1',
				role: 'admin',
				user_id: 'user-1',
				church_id: 'church-1'
			};

			// Mock responses for different collections
			mockPb.collection('users').create.mockResolvedValueOnce(createdUser); // User creation
			mockPb.collection('churches').create.mockResolvedValueOnce(createdChurch); // Church creation
			mockPb.collection('church_memberships').create.mockResolvedValueOnce(createdMembership); // Membership creation

			mockPb
				.collection('users')
				.authWithPassword.mockResolvedValue({ record: createdUser, token: 'test-token' });
			mockPb.collection('setup_status').update.mockResolvedValue(createdUser);

			const notFoundError: any = new Error('Not found');
			notFoundError.status = 404;
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(notFoundError);

			const result = await ChurchesAPI.initialSetup(setupData);

			expect(result).toHaveProperty('user');
			expect(result).toHaveProperty('church');
		});
	});

	describe('getUserChurches', () => {
		it('should fetch user churches', async () => {
			const church = { id: 'church-1', name: 'Test Church' };
			const membershipWithExpand = {
				id: 'membership-1',
				church_id: 'church-1',
				user_id: 'user1',
				expand: { church_id: church }
			};

			mockPb.collection('church_memberships').getFullList.mockResolvedValue([membershipWithExpand]);

			const result = await ChurchesAPI.getUserChurches();

			expect(mockPb.collection).toHaveBeenCalledWith('church_memberships');
			expect(result).toEqual([church]);
		});
	});

	describe('updateChurch', () => {
		it('should update church data', async () => {
			const updatedChurch = { id: 'church1', name: 'Updated Church' };

			mockPb.collection('churches').update.mockResolvedValue(updatedChurch);

			const result = await ChurchesAPI.updateChurch('church1', { name: 'Updated Church' });

			expect(mockPb.collection).toHaveBeenCalledWith('churches');
			expect(result).toEqual(updatedChurch);
		});
	});

	describe('getChurchMembers', () => {
		it('should fetch church members', async () => {
			const members = [
				{ id: 'membership-1', church_id: 'church1', role: 'admin' },
				{ id: 'membership-2', church_id: 'church1', role: 'leader' },
				{ id: 'membership-3', church_id: 'church1', role: 'musician' }
			];

			mockPb.collection('church_memberships').getFullList.mockResolvedValue(members);

			const result = await ChurchesAPI.getChurchMembers('church1');

			expect(result).toEqual(members);
			expect(result).toHaveLength(3);
		});
	});

	describe('Invitation System', () => {
		describe('inviteUser', () => {
			it('should create church invitation', async () => {
				const inviteData: InviteUserData = {
					email: 'newuser@test.com',
					role: 'musician',
					permissions: ['songs:view', 'services:view']
				};

				const createdInvite = {
					id: 'invite-1',
					church_id: 'church1',
					email: inviteData.email,
					role: inviteData.role,
					permissions: inviteData.permissions,
					token: 'test-token',
					expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
				};

				mockPb.collection('church_invitations').create.mockResolvedValue(createdInvite);

				await ChurchesAPI.inviteUser('church1', inviteData);

				expect(mockPb.collection).toHaveBeenCalledWith('church_invitations');
				expect(mockPb.collection('church_invitations').create).toHaveBeenCalledWith(
					expect.objectContaining({
						church_id: 'church1',
						email: inviteData.email,
						role: inviteData.role,
						permissions: inviteData.permissions,
						invited_by: 'user1',
						is_active: true
					})
				);
			});
		});

		describe('getPendingInvites', () => {
			it('should return pending invitations for current user', async () => {
				mockPb.authStore.model = { id: 'user1', email: 'user@test.com' };
				
				const pendingInvites = [
					{
						id: 'invite-1',
						email: 'user@test.com',
						church_id: 'church1',
						role: 'musician',
						expand: {
							church_id: { id: 'church1', name: 'Test Church' },
							invited_by: { id: 'admin1', name: 'Admin User' }
						}
					}
				];

				mockPb.collection('church_invitations').getFullList.mockResolvedValue(pendingInvites);

				const result = await ChurchesAPI.getPendingInvites();

				expect(mockPb.collection).toHaveBeenCalledWith('church_invitations');
				expect(mockPb.collection('church_invitations').getFullList).toHaveBeenCalledWith({
					filter: `email = "user@test.com" && is_active = true && expires_at > @now`,
					expand: 'church_id,invited_by',
					sort: '-created'
				});
				expect(result).toEqual(pendingInvites);
			});

			it('should return empty array if no user email', async () => {
				mockPb.authStore.model = { id: 'user1' }; // No email

				const result = await ChurchesAPI.getPendingInvites();

				expect(result).toEqual([]);
				expect(mockPb.collection).not.toHaveBeenCalled();
			});
		});

		describe('getInvitationByToken', () => {
			it('should fetch invitation by token', async () => {
				const invitation = {
					id: 'invite-1',
					token: 'test-token',
					church_id: 'church1',
					expand: {
						church_id: { id: 'church1', name: 'Test Church' },
						invited_by: { id: 'admin1', name: 'Admin' }
					}
				};

				mockPb.collection('church_invitations').getFirstListItem.mockResolvedValue(invitation);

				const result = await ChurchesAPI.getInvitationByToken('test-token');

				expect(mockPb.collection('church_invitations').getFirstListItem).toHaveBeenCalledWith(
					`token = "test-token" && is_active = true && expires_at > @now`,
					{ expand: 'church_id,invited_by' }
				);
				expect(result).toEqual(invitation);
			});
		});

		describe('acceptInvitation', () => {
			it('should accept invitation and create membership', async () => {
				const invitation = {
					id: 'invite-1',
					church_id: 'church1',
					role: 'musician',
					permissions: ['songs:view'],
					invited_by: 'admin1',
					created: new Date().toISOString(),
					expand: { church_id: { id: 'church1', name: 'Test Church' } }
				};

				mockPb.collection('church_invitations').getFirstListItem.mockResolvedValue(invitation);
				mockPb.collection('church_memberships').getFullList.mockResolvedValue([]); // No existing membership
				mockPb.collection('church_memberships').create.mockResolvedValue({ id: 'membership-1' });
				mockPb.collection('church_invitations').update.mockResolvedValue({});

				const result = await ChurchesAPI.acceptInvitation('test-token');

				expect(mockPb.collection('church_memberships').create).toHaveBeenCalledWith({
					church_id: 'church1',
					user_id: 'user1',
					role: 'musician',
					permissions: ['songs:view'],
					status: 'active',
					invited_by: 'admin1',
					invited_date: invitation.created,
					joined_date: expect.any(String),
					is_active: true
				});

				expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith(
					'invite-1',
					{
						used_at: expect.any(String),
						used_by: 'user1',
						is_active: false
					}
				);

				expect(result).toEqual(invitation.expand.church_id);
			});

			it('should throw error if user already has membership', async () => {
				const invitation = {
					id: 'invite-1',
					church_id: 'church1',
					expand: { church_id: { id: 'church1' } }
				};

				mockPb.collection('church_invitations').getFirstListItem.mockResolvedValue(invitation);
				mockPb.collection('church_memberships').getFullList.mockResolvedValue([
					{ id: 'existing-membership' }
				]); // Existing membership

				await expect(ChurchesAPI.acceptInvitation('test-token')).rejects.toThrow(
					'You are already a member of this church'
				);
			});
		});

		describe('declineInvitation', () => {
			it('should decline invitation', async () => {
				const invitation = { id: 'invite-1', email: 'user@test.com' };

				mockPb.collection('church_invitations').getFirstListItem.mockResolvedValue(invitation);
				mockPb.collection('church_invitations').update.mockResolvedValue({});

				await ChurchesAPI.declineInvitation('test-token');

				expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith(
					'invite-1',
					{
						is_active: false,
						declined_at: expect.any(String),
						declined_by: 'user1'
					}
				);
			});
		});

		describe('getSentInvitations', () => {
			it('should fetch sent invitations for a church', async () => {
				const sentInvites = [
					{ id: 'invite-1', email: 'user1@test.com', status: 'pending' },
					{ id: 'invite-2', email: 'user2@test.com', status: 'accepted' }
				];

				mockPb.collection('church_invitations').getFullList.mockResolvedValue(sentInvites);

				const result = await ChurchesAPI.getSentInvitations('church1');

				expect(mockPb.collection('church_invitations').getFullList).toHaveBeenCalledWith({
					filter: `church_id = "church1"`,
					expand: 'invited_by,used_by',
					sort: '-created'
				});
				expect(result).toEqual(sentInvites);
			});
		});

		describe('cancelInvitation', () => {
			it('should cancel invitation', async () => {
				mockPb.collection('church_invitations').update.mockResolvedValue({});

				await ChurchesAPI.cancelInvitation('invite-1');

				expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith(
					'invite-1',
					{
						is_active: false,
						cancelled_at: expect.any(String),
						cancelled_by: 'user1'
					}
				);
			});
		});

		describe('resendInvitation', () => {
			it('should cancel old invitation and create new one', async () => {
				const originalInvite = {
					id: 'invite-1',
					church_id: 'church1',
					email: 'user@test.com',
					role: 'musician',
					permissions: ['songs:view']
				};

				mockPb.collection('church_invitations').getOne.mockResolvedValue(originalInvite);
				mockPb.collection('church_invitations').update.mockResolvedValue({});
				mockPb.collection('church_invitations').create.mockResolvedValue({});

				await ChurchesAPI.resendInvitation('invite-1');

				// Should cancel the old invitation
				expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith(
					'invite-1',
					expect.objectContaining({
						is_active: false,
						cancelled_at: expect.any(String)
					})
				);

				// Should create new invitation
				expect(mockPb.collection('church_invitations').create).toHaveBeenCalledWith({
					church_id: 'church1',
					email: 'user@test.com',
					role: 'musician',
					permissions: ['songs:view'],
					invited_by: 'user1',
					token: expect.any(String),
					expires_at: expect.any(String),
					is_active: true,
					resent_from: 'invite-1'
				});
			});
		});
	});
});
