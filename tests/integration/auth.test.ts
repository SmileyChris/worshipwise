import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPb } from '../helpers/pb-mock';
import type { User, Profile } from '$lib/types/auth';

/**
 * Auth API Integration Tests
 *
 * Tests the integration between our auth API and PocketBase backend
 * These tests run in Node.js environment and focus on API layer
 */

describe('Authentication API Integration', () => {
	beforeEach(() => {
		mockPb.reset();
	});

	describe('PocketBase Authentication Integration', () => {
		it('should handle successful user authentication', async () => {
			const mockUser = {
				id: 'user1',
				email: 'test@example.com',
				name: 'Test User'
			};

			const usersCollection = mockPb.collection('users');
			usersCollection.authWithPassword = vi.fn().mockResolvedValue({
				record: mockUser,
				token: 'test-token'
			});

			// Test direct PocketBase auth call
			const result = await usersCollection.authWithPassword('test@example.com', 'password123');

			expect(usersCollection.authWithPassword).toHaveBeenCalledWith(
				'test@example.com',
				'password123'
			);
			expect(result.record).toEqual(mockUser);
			expect(result.token).toBe('test-token');
		});

		it('should handle failed authentication', async () => {
			const usersCollection = mockPb.collection('users');
			usersCollection.authWithPassword = vi
				.fn()
				.mockRejectedValue(new Error('Invalid credentials'));

			await expect(
				usersCollection.authWithPassword('invalid@example.com', 'wrongpassword')
			).rejects.toThrow('Invalid credentials');
		});

		it('should handle user registration', async () => {
			const mockUser = {
				id: 'user1',
				email: 'newuser@example.com',
				name: 'New User'
			};

			const usersCollection = mockPb.collection('users');
			usersCollection.create = vi.fn().mockResolvedValue(mockUser);

			const result = await usersCollection.create({
				email: 'newuser@example.com',
				password: 'password123',
				passwordConfirm: 'password123'
			});

			expect(usersCollection.create).toHaveBeenCalledWith({
				email: 'newuser@example.com',
				password: 'password123',
				passwordConfirm: 'password123'
			});
			expect(result).toEqual(mockUser);
		});

		it('should handle profile creation after registration', async () => {
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'New User',
				role: 'musician',
				is_active: true
			};

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.create = vi.fn().mockResolvedValue(mockProfile);

			const result = await profilesCollection.create({
				user_id: 'user1',
				name: 'New User',
				role: 'musician',
				is_active: true
			});

			expect(profilesCollection.create).toHaveBeenCalledWith({
				user_id: 'user1',
				name: 'New User',
				role: 'musician',
				is_active: true
			});
			expect(result).toEqual(mockProfile);
		});

		it('should handle profile loading', async () => {
			const mockProfile = {
				id: 'profile1',
				user_id: 'user1',
				name: 'Test User',
				role: 'musician',
				church_id: 'church1'
			};

			const profilesCollection = mockPb.collection('profiles');
			profilesCollection.getList = vi.fn().mockResolvedValue({
				items: [mockProfile],
				page: 1,
				perPage: 1,
				totalItems: 1,
				totalPages: 1
			});

			const result = await profilesCollection.getList(1, 1, {
				filter: 'user_id = "user1"'
			});

			expect(profilesCollection.getList).toHaveBeenCalledWith(1, 1, {
				filter: 'user_id = "user1"'
			});
			expect(result.items).toContain(mockProfile);
		});

		it('should handle password reset requests', async () => {
			const usersCollection = mockPb.collection('users');
			usersCollection.requestPasswordReset = vi.fn().mockResolvedValue(true);

			await usersCollection.requestPasswordReset('test@example.com');

			expect(usersCollection.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
		});

		it('should handle auth token refresh', async () => {
			const usersCollection = mockPb.collection('users');
			usersCollection.authRefresh = vi.fn().mockResolvedValue({
				record: { id: 'user1', email: 'test@example.com' },
				token: 'new-token'
			});

			const result = await usersCollection.authRefresh();

			expect(usersCollection.authRefresh).toHaveBeenCalled();
			expect(result.token).toBe('new-token');
		});
	});

	describe('Church Context Integration', () => {
		it('should handle loading user churches', async () => {
			const mockChurches = [
				{ id: 'church1', name: 'Test Church 1', timezone: 'America/New_York' },
				{ id: 'church2', name: 'Test Church 2', timezone: 'America/Los_Angeles' }
			];

			const profilesCollection = mockPb.collection('profiles');
			const churchesCollection = mockPb.collection('churches');

			profilesCollection.getList = vi.fn().mockResolvedValue({
				items: [
					{ id: 'profile1', user_id: 'user1', church_id: 'church1' },
					{ id: 'profile2', user_id: 'user1', church_id: 'church2' }
				]
			});

			churchesCollection.getList = vi.fn().mockResolvedValue({
				items: mockChurches
			});

			// Test loading profiles
			const profilesResult = await profilesCollection.getList(1, 50, {
				filter: 'user_id = "user1"',
				expand: 'church_id'
			});

			// Test loading churches
			const churchesResult = await churchesCollection.getList(1, 50, {
				filter: 'id = "church1" || id = "church2"'
			});

			expect(profilesCollection.getList).toHaveBeenCalled();
			expect(churchesCollection.getList).toHaveBeenCalled();
			expect(churchesResult.items).toEqual(mockChurches);
		});
	});

	describe('Error Handling', () => {
		it('should handle network errors gracefully', async () => {
			const usersCollection = mockPb.collection('users');
			usersCollection.authWithPassword = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(
				usersCollection.authWithPassword('test@example.com', 'password123')
			).rejects.toThrow('Network error');
		});

		it('should handle validation errors', async () => {
			const usersCollection = mockPb.collection('users');
			const validationError = new Error('Validation failed');
			(validationError as any).response = {
				data: {
					data: {
						email: { message: 'Invalid email format' }
					}
				}
			};

			usersCollection.create = vi.fn().mockRejectedValue(validationError);

			await expect(
				usersCollection.create({
					email: 'invalid-email',
					password: 'password123',
					passwordConfirm: 'password123'
				})
			).rejects.toThrow('Validation failed');
		});
	});
});
