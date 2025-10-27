import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { MockPocketBase } from '../../helpers/pb-mock';
import { createMockUser, createMockAuthContext } from '../../helpers/test-utils';
import { mockUser, mockChurch, mockMembership } from '../../helpers/mock-builders';
import { createChurchesAPI, type ChurchesAPI } from '$lib/api/churches';
import type { InitialChurchSetup } from '$lib/types/church';

describe('Churches API', () => {
	let churchesApi: ChurchesAPI;
	let mockPb: MockPocketBase;

	// Create mock instance once and reuse
	beforeAll(() => {
		mockPb = new MockPocketBase();
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockPb.reset();
		vi.clearAllMocks();

		// Create API instance with mock pb instance
		churchesApi = createChurchesAPI(mockPb);
	});

	describe('hasChurches', () => {
		it('should return true when churches exist via setup_status', async () => {
			mockPb.collection('setup_status').mockGetFirstListItem({ setup_required: false });

			const result = await churchesApi.hasChurches();

			expect(result).toBe(true);
			expect(mockPb.collection('setup_status').getFirstListItem).toHaveBeenCalledWith('', expect.any(Object));
		});

		it('should fallback to checking churches collection when setup_status fails', async () => {
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(new Error('Not found'));
			mockPb.collection('churches').getList.mockResolvedValue({ 
				page: 1,
				perPage: 1,
				totalItems: 1,
				totalPages: 1,
				items: []
			});

			const result = await churchesApi.hasChurches();

			expect(result).toBe(true);
			expect(mockPb.collection('churches').getList).toHaveBeenCalledWith(1, 1);
		});

		it('should return false when no churches exist', async () => {
			mockPb.collection('setup_status').getFirstListItem.mockRejectedValue(new Error('Not found'));
			mockPb.collection('churches').getList.mockRejectedValue(new Error('Not authorized'));

			const result = await churchesApi.hasChurches();

			expect(result).toBe(false);
		});
	});

	describe('initialSetup', () => {
		it('should create first church and admin user', async () => {
			const setupData: InitialChurchSetup = {
				churchName: 'Test Church',
				adminEmail: 'admin@test.com',
				adminName: 'Admin User',
				password: 'password123',
				confirmPassword: 'password123',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				country: 'Test Country',
				timezone: 'America/New_York'
			};

			const mockCreatedUser = mockUser({
				id: 'user_1',
				email: setupData.adminEmail,
				name: setupData.adminName
			});

			const mockCreatedChurch = mockChurch({
				id: 'church_1',
				name: setupData.churchName,
				slug: 'test-church',
				owner_user_id: mockCreatedUser.id
			});

			// Mock user creation
			mockPb.collection('users').mockCreate(mockCreatedUser);
			
			// Mock authentication
			mockPb.collection('users').authWithPassword.mockResolvedValue({
				token: 'test-token',
				record: mockCreatedUser
			});

			// Mock slug availability check
			mockPb.collection('churches').getFirstListItem.mockRejectedValue(new Error('Not found'));

			// Mock church creation
			mockPb.collection('churches').mockCreate(mockCreatedChurch);

			// Mock membership creation
			mockPb.collection('church_memberships').mockCreate({});

			const result = await churchesApi.initialSetup(setupData);

			expect(result.user).toEqual(mockCreatedUser);
			expect(result.church).toEqual(mockCreatedChurch);
			expect(mockPb.collection('users').create).toHaveBeenCalledWith(expect.objectContaining({
				email: setupData.adminEmail,
				password: setupData.password,
				name: setupData.adminName
			}));
			expect(mockPb.collection('churches').create).toHaveBeenCalled();
			expect(mockPb.collection('church_memberships').create).toHaveBeenCalled();
		});

		it('should generate unique slug if original is taken', async () => {
			const setupData: InitialChurchSetup = {
				churchName: 'Test Church',
				adminEmail: 'admin@test.com',
				adminName: 'Admin User',
				password: 'password123',
				confirmPassword: 'password123',
				address: '123 Test St',
				city: 'Test City',
				state: 'TS',
				country: 'Test Country',
				timezone: 'America/New_York'
			};

			const mockCreatedUser = mockUser({ id: 'user_1' });
			mockPb.collection('users').mockCreate(mockCreatedUser);
			mockPb.collection('users').authWithPassword.mockResolvedValue({
				token: 'test-token',
				record: mockCreatedUser
			});

			// First slug check returns existing church, second check fails (slug available)
			mockPb.collection('churches').getFirstListItem
				.mockResolvedValueOnce(mockChurch({ slug: 'test-church' }))
				.mockRejectedValueOnce(new Error('Not found'));

			mockPb.collection('churches').mockCreate(mockChurch({ slug: 'test-church-1' }));
			mockPb.collection('church_memberships').mockCreate({});

			await churchesApi.initialSetup(setupData);

			// Should have checked for 'test-church' and 'test-church-1'
			expect(mockPb.collection('churches').getFirstListItem).toHaveBeenCalledTimes(2);
			expect(mockPb.collection('churches').create).toHaveBeenCalledWith(
				expect.objectContaining({ slug: 'test-church-1' })
			);
		});
	});

	describe('getUserChurches', () => {
		it('should return user churches', async () => {
			const mockChurches = [
				mockChurch({ id: 'church_1' }),
				mockChurch({ id: 'church_2' })
			];

			const mockMemberships = [
				mockMembership({ church_id: 'church_1', expand: { church_id: mockChurches[0] } }),
				mockMembership({ church_id: 'church_2', expand: { church_id: mockChurches[1] } })
			];

			mockPb.authStore.model = mockUser({ id: 'user_1' });
			mockPb.collection('church_memberships').mockGetFullList(mockMemberships);

			const result = await churchesApi.getUserChurches();

			expect(result).toEqual(mockChurches);
			expect(mockPb.collection('church_memberships').getFullList).toHaveBeenCalledWith({
				filter: `user_id = "user_1" && is_active = true`,
				expand: 'church_id'
			});
		});
	});

	describe('createChurch', () => {
		it('should create a new church with admin membership and derived hemisphere', async () => {
			const churchData = {
				name: 'New Church',
				slug: 'new-church',
				address: '456 New St',
				city: 'New City',
				state: 'NC',
				country: 'Test Country',
				timezone: 'America/Los_Angeles'
			};

			const mockCreatedChurch = mockChurch({ ...churchData, id: 'church_new' });
			mockPb.authStore.model = mockUser({ id: 'user_1' });
			mockPb.collection('churches').mockCreate(mockCreatedChurch);
			mockPb.collection('church_memberships').mockCreate({});

			const result = await churchesApi.createChurch(churchData);

			expect(result).toEqual(mockCreatedChurch);
		expect(mockPb.collection('churches').create).toHaveBeenCalledWith(expect.objectContaining({
				...churchData,
				owner_user_id: 'user_1',
				hemisphere: expect.any(String),
				subscription_type: 'free',
				subscription_status: 'active',
				settings: expect.objectContaining({ time_zone: churchData.timezone })
			}));
		expect(mockPb.collection('church_memberships').create).toHaveBeenCalledWith(expect.objectContaining({
				church_id: 'church_new',
				user_id: 'user_1',
				role: 'admin'
			}));
		});

		it('should generate a unique slug when taken', async () => {
			const churchData = {
				name: 'New Church',
				slug: 'new-church',
				address: '456 New St',
				city: 'New City',
				state: 'NC',
				country: 'Test Country',
				timezone: 'America/Los_Angeles'
			};

			const mockCreatedChurch = mockChurch({ ...churchData, id: 'church_new_1' });
			mockPb.authStore.model = mockUser({ id: 'user_1' });
			// First check returns existing church for 'new-church', second check fails => available for 'new-church-1'
			mockPb.collection('churches').getFirstListItem
				.mockResolvedValueOnce(mockChurch({ slug: 'new-church' }))
				.mockRejectedValueOnce(new Error('Not found'));

			mockPb.collection('churches').mockCreate(mockCreatedChurch);
			mockPb.collection('church_memberships').mockCreate({});

			const result = await churchesApi.createChurch(churchData as any);

			expect(result).toEqual(mockCreatedChurch);
			expect(mockPb.collection('churches').create).toHaveBeenCalledWith(
				expect.objectContaining({ slug: 'new-church-1' })
			);
		});
	});

	describe('updateChurch', () => {
		it('should update church details', async () => {
			const updateData = { name: 'Updated Church Name' };
			const mockUpdatedChurch = mockChurch({ ...updateData, id: 'church_1' });

			mockPb.collection('churches').mockUpdate(mockUpdatedChurch);

			const result = await churchesApi.updateChurch('church_1', updateData);

			expect(result).toEqual(mockUpdatedChurch);
			expect(mockPb.collection('churches').update).toHaveBeenCalledWith('church_1', updateData);
		});
	});

	describe('getChurchMembers', () => {
		it('should return church members with expanded user data', async () => {
			const mockMembers = [
				mockMembership({ expand: { user_id: mockUser({ name: 'Admin' }) } }),
				mockMembership({ expand: { user_id: mockUser({ name: 'Member' }) } })
			];

			mockPb.collection('church_memberships').mockGetFullList(mockMembers);

			const result = await churchesApi.getChurchMembers('church_1');

			expect(result).toEqual(mockMembers);
			expect(mockPb.collection('church_memberships').getFullList).toHaveBeenCalledWith({
				filter: `church_id = "church_1" && is_active = true`,
				expand: 'user_id',
				sort: 'role,created'
			});
		});
	});

	describe('inviteUser', () => {
		it('should create church invitation', async () => {
			const inviteData = {
				email: 'newuser@test.com',
				role: 'musician' as const,
				permissions: ['services:view']
			};

			mockPb.authStore.model = mockUser({ id: 'user_1' });
			mockPb.collection('church_invitations').mockCreate({});

			await churchesApi.inviteUser('church_1', inviteData);

			expect(mockPb.collection('church_invitations').create).toHaveBeenCalledWith(expect.objectContaining({
				church_id: 'church_1',
				email: inviteData.email,
				role: inviteData.role,
				permissions: inviteData.permissions,
				invited_by: 'user_1',
				is_active: true
			}));
		});
	});

	describe('acceptInvitation', () => {
		it('should accept invitation and create membership', async () => {
			const mockInvitation = {
				id: 'invite_1',
				church_id: 'church_1',
				role: 'member',
				permissions: ['services:view'],
				expand: { church_id: mockChurch({ id: 'church_1' }) }
			};

			mockPb.authStore.model = mockUser({ id: 'user_2' });
			mockPb.collection('church_invitations').mockGetFirstListItem(mockInvitation);
			mockPb.collection('church_memberships').mockGetFullList([]); // No existing membership
			mockPb.collection('church_memberships').mockCreate({});
			mockPb.collection('church_invitations').mockUpdate({});

			const result = await churchesApi.acceptInvitation('test-token');

			expect(result).toEqual(mockInvitation.expand.church_id);
			expect(mockPb.collection('church_memberships').create).toHaveBeenCalledWith(expect.objectContaining({
				church_id: 'church_1',
				user_id: 'user_2',
				role: 'member',
				is_active: true
			}));
			expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith('invite_1', expect.objectContaining({
				is_active: false,
				used_by: 'user_2'
			}));
		});

		it('should throw error if user already has membership', async () => {
			const mockInvitation = {
				id: 'invite_1',
				church_id: 'church_1',
				role: 'member',
				permissions: []
			};

			mockPb.authStore.model = mockUser({ id: 'user_2' });
			mockPb.collection('church_invitations').mockGetFirstListItem(mockInvitation);
			mockPb.collection('church_memberships').mockGetFullList([mockMembership()]); // Existing membership

			await expect(churchesApi.acceptInvitation('test-token')).rejects.toThrow('You are already a member of this church');
		});
	});

	describe('getChurchBySlug', () => {
		it('should return church by slug', async () => {
			const mockFoundChurch = mockChurch({ slug: 'test-church' });
			mockPb.collection('churches').mockGetFirstListItem(mockFoundChurch);

			const result = await churchesApi.getChurchBySlug('test-church');

			expect(result).toEqual(mockFoundChurch);
			expect(mockPb.collection('churches').getFirstListItem).toHaveBeenCalledWith(`slug = "test-church"`);
		});

		it('should return null when church not found', async () => {
			mockPb.collection('churches').getFirstListItem.mockRejectedValue(new Error('Not found'));

			const result = await churchesApi.getChurchBySlug('non-existent');

			expect(result).toBeNull();
		});
	});

	describe('isSlugAvailable', () => {
		it('should return true when slug is available', async () => {
			mockPb.collection('churches').getFirstListItem.mockRejectedValue(new Error('Not found'));

			const result = await churchesApi.isSlugAvailable('new-slug');

			expect(result).toBe(true);
			expect(mockPb.collection('churches').getFirstListItem).toHaveBeenCalledWith(`slug = "new-slug"`);
		});

		it('should return false when slug is taken', async () => {
			mockPb.collection('churches').mockGetFirstListItem(mockChurch({ slug: 'existing-slug' }));

			const result = await churchesApi.isSlugAvailable('existing-slug');

			expect(result).toBe(false);
		});

		it('should exclude church ID when checking availability', async () => {
			mockPb.collection('churches').getFirstListItem.mockRejectedValue(new Error('Not found'));

			const result = await churchesApi.isSlugAvailable('test-slug', 'church_1');

			expect(result).toBe(true);
			expect(mockPb.collection('churches').getFirstListItem).toHaveBeenCalledWith(`slug = "test-slug" && id != "church_1"`);
		});
	});

	describe('getChurchStats', () => {
		it('should return church statistics', async () => {
			mockPb.collection('church_memberships').getList.mockResolvedValue({ 
				page: 1,
				perPage: 1,
				totalItems: 10,
				totalPages: 10,
				items: []
			});
			mockPb.collection('songs').getList.mockResolvedValue({ 
				page: 1,
				perPage: 1,
				totalItems: 50,
				totalPages: 50,
				items: []
			});
			mockPb.collection('services').getList.mockResolvedValue({ 
				page: 1,
				perPage: 1,
				totalItems: 25,
				totalPages: 25,
				items: []
			});

			const result = await churchesApi.getChurchStats('church_1');

			expect(result).toEqual({
				memberCount: 10,
				songCount: 50,
				serviceCount: 25,
				storageUsedMb: 0
			});

			expect(mockPb.collection('church_memberships').getList).toHaveBeenCalledWith(1, 1, {
				filter: `church_id = "church_1" && is_active = true`
			});
			expect(mockPb.collection('songs').getList).toHaveBeenCalledWith(1, 1, {
				filter: `church_id = "church_1" && is_active = true`
			});
			expect(mockPb.collection('services').getList).toHaveBeenCalledWith(1, 1, {
				filter: `church_id = "church_1"`
			});
		});
	});

	describe('removeMember', () => {
		it('should soft delete member by setting inactive', async () => {
			mockPb.collection('church_memberships').mockUpdate({});

			await churchesApi.removeMember('membership_1');

			expect(mockPb.collection('church_memberships').update).toHaveBeenCalledWith('membership_1', {
				is_active: false,
				status: 'suspended'
			});
		});
	});

	describe('declineInvitation', () => {
		it('should mark invitation as declined', async () => {
			const mockInvitation = {
				id: 'invite_1',
				email: 'test@example.com'
			};

			mockPb.authStore.model = mockUser({ id: 'user_1' });
			mockPb.collection('church_invitations').mockGetFirstListItem(mockInvitation);
			mockPb.collection('church_invitations').mockUpdate({});

			await churchesApi.declineInvitation('test-token');

			expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith('invite_1', expect.objectContaining({
				is_active: false,
				declined_by: 'user_1'
			}));
		});
	});

	describe('resendInvitation', () => {
		it('should cancel old invitation and create new one', async () => {
			const originalInvite = {
				id: 'invite_1',
				church_id: 'church_1',
				email: 'test@example.com',
				role: 'member',
				permissions: []
			};

			mockPb.authStore.model = mockUser({ id: 'user_1' });
			mockPb.collection('church_invitations').mockGetOne(originalInvite);
			mockPb.collection('church_invitations').mockUpdate({});
			mockPb.collection('church_invitations').mockCreate({});

			await churchesApi.resendInvitation('invite_1');

			// Should cancel old invitation
			expect(mockPb.collection('church_invitations').update).toHaveBeenCalledWith('invite_1', expect.objectContaining({
				is_active: false,
				cancelled_by: 'user_1'
			}));

			// Should create new invitation
			expect(mockPb.collection('church_invitations').create).toHaveBeenCalledWith(expect.objectContaining({
				church_id: 'church_1',
				email: 'test@example.com',
				role: 'member',
				is_active: true,
				resent_from: 'invite_1'
			}));
		});
	});
});
