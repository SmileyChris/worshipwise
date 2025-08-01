import { pb } from '$lib/api/client';
import type { Church, ChurchRole } from '$lib/types/church';
import { getDefaultPermissions, getDefaultChurchSettings } from '$lib/types/church';

/**
 * Migration utility to transform a single-tenant WorshipWise installation
 * into a multi-tenant church-aware system
 */
export class ChurchMigration {
	/**
	 * Main migration function - transforms existing installation to support churches
	 */
	static async migrateToChurches(): Promise<void> {
		try {
			console.log('🔄 Starting church migration...');

			// 1. Check if migration already completed
			const existingChurches = await pb.collection('churches').getList(1, 1);
			if (existingChurches.totalItems > 0) {
				console.log('✅ Churches already exist, skipping migration');
				return;
			}

			// 2. Get all existing users
			const users = await pb.collection('users').getFullList();
			if (users.length === 0) {
				console.log('⚠️ No users found, skipping migration');
				return;
			}

			// 3. Create default church
			const defaultChurch = await this.createDefaultChurch(users);
			console.log(`✅ Created default church: ${defaultChurch.name}`);

			// 4. Create memberships for all users
			await this.createMembershipsForUsers(users, defaultChurch.id);
			console.log(`✅ Created ${users.length} church memberships`);

			// 5. Update all existing collections with church_id
			await this.updateCollectionsWithChurchId(defaultChurch.id);

			// 6. NOTE: Users don't have current_church_id - it's determined by their active membership
			// await this.updateUsersWithCurrentChurch(users, defaultChurch.id);

			// 7. Clean up legacy fields (optional)
			await this.cleanupLegacyFields();

			console.log('🎉 Church migration completed successfully!');
		} catch (error) {
			console.error('❌ Migration failed:', error);
			throw error;
		}
	}

	/**
	 * Create the default church from existing user data
	 */
	private static async createDefaultChurch(users: Record<string, unknown>[]): Promise<Church> {
		// Find the best candidate for church owner (admin first, then any user)
		const adminUser = users.find((u) => u.role === 'admin') || users[0];

		// Determine church name from user data
		const churchName = this.determineChurchName(users);

		const churchData = {
			name: churchName,
			slug: this.generateSlug(churchName),
			description: `Migrated from single-tenant WorshipWise installation`,
			subscription_type: 'free' as const,
			subscription_status: 'active' as const,
			max_users: 50,
			max_songs: 1000,
			max_storage_mb: 2048,
			settings: getDefaultChurchSettings(),
			owner_user_id: (adminUser as { id: string }).id,
			billing_email: (adminUser as { email: string }).email,
			is_active: true
		};

		return await pb.collection('churches').create(churchData);
	}

	/**
	 * Create church memberships for all existing users
	 */
	private static async createMembershipsForUsers(
		users: Record<string, unknown>[],
		churchId: string
	): Promise<void> {
		const membershipPromises = users.map((user) => {
			// Map old user roles to church roles
			const role = this.mapUserRoleToChurchRole((user as { role: string }).role);

			const membershipData = {
				church_id: churchId,
				user_id: (user as { id: string }).id,
				role: role,
				permissions: getDefaultPermissions(role),
				status: 'active' as const,
				preferred_keys: (user as { preferred_keys?: unknown }).preferred_keys || [],
				notification_preferences: (user as { notification_preferences?: unknown })
					.notification_preferences || {
					email_service_reminders: true,
					email_new_songs: false,
					email_member_activity: false
				},
				joined_date: (user as { created: string }).created,
				is_active: true
			};

			return pb.collection('church_memberships').create(membershipData);
		});

		await Promise.all(membershipPromises);
	}

	/**
	 * Update all existing collections to include church_id
	 */
	private static async updateCollectionsWithChurchId(churchId: string): Promise<void> {
		const collections = [
			{ name: 'songs', defaultVisibility: 'church' },
			{ name: 'services', defaultVisibility: null }, // services collection
			{ name: 'categories', defaultVisibility: 'church' },
			{ name: 'labels', defaultVisibility: 'church' }
		];

		for (const collection of collections) {
			try {
				await this.updateCollectionRecords(collection.name, churchId, collection.defaultVisibility);
			} catch (error) {
				console.warn(`⚠️ Failed to update ${collection.name}:`, error);
			}
		}
	}

	/**
	 * Update records in a specific collection with church_id
	 */
	private static async updateCollectionRecords(
		collectionName: string,
		churchId: string,
		defaultVisibility: string | null
	): Promise<void> {
		const records = await pb.collection(collectionName).getFullList();

		const updatePromises = records.map((record) => {
			const updateData: Record<string, unknown> = {
				church_id: churchId
			};

			// Add visibility field for collections that support it
			if (defaultVisibility) {
				updateData.visibility = defaultVisibility;
			}

			return pb.collection(collectionName).update(record.id, updateData);
		});

		await Promise.all(updatePromises);
		console.log(`✅ Updated ${records.length} records in ${collectionName} collection`);
	}

	/**
	 * Update users with current_church_id
	 * NOTE: This method is deprecated - users don't have current_church_id
	 * The current church is determined by their active membership
	 */
	// private static async updateUsersWithCurrentChurch(
	// 	users: Record<string, unknown>[],
	// 	churchId: string
	// ): Promise<void> {
	// 	const updatePromises = users.map((user) =>
	// 		pb.collection('users').update((user as { id: string }).id, {
	// 			current_church_id: churchId
	// 		})
	// 	);

	// 	await Promise.all(updatePromises);
	// 	console.log(`✅ Updated ${users.length} users with current church`);
	// }

	/**
	 * Clean up legacy fields that are no longer needed
	 */
	private static async cleanupLegacyFields(): Promise<void> {
		// Note: This would require PocketBase admin API access
		// For now, we'll just log what should be cleaned up
		console.log('📝 Legacy field cleanup recommended:');
		console.log('  - Remove role field from users collection');
		console.log('  - Remove church_name field from users collection');
		console.log('  - Consider removing profiles collection if migrated to church_memberships');
	}

	/**
	 * Determine the best church name from existing user data
	 */
	private static determineChurchName(users: Record<string, unknown>[]): string {
		// Try to find a consistent church name from users
		const churchNames = users
			.map((u) => (u as { church_name?: string }).church_name)
			.filter(Boolean)
			.filter((name, index, arr) => arr.indexOf(name) === index); // unique

		if (churchNames.length === 1) {
			return churchNames[0] as string;
		}

		// If multiple or no church names, use a generic name
		const adminUser = users.find((u) => (u as { role: string }).role === 'admin');
		const adminChurchName = (adminUser as { church_name?: string })?.church_name;
		if (adminChurchName) {
			return adminChurchName;
		}

		return 'My Church';
	}

	/**
	 * Generate URL-friendly slug from church name
	 */
	private static generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.trim();
	}

	/**
	 * Map legacy user roles to church roles
	 */
	private static mapUserRoleToChurchRole(userRole: string): ChurchRole {
		switch (userRole) {
			case 'admin':
				return 'admin';
			case 'leader':
				return 'leader';
			case 'musician':
				return 'musician';
			default:
				return 'member';
		}
	}

	/**
	 * Check if church migration is needed
	 */
	static async isMigrationNeeded(): Promise<boolean> {
		try {
			const churches = await pb.collection('churches').getList(1, 1);
			return churches.totalItems === 0;
		} catch {
			// If churches collection doesn't exist, migration is definitely needed
			return true;
		}
	}

	/**
	 * Validate migration results
	 */
	static async validateMigration(): Promise<{ success: boolean; issues: string[] }> {
		const issues: string[] = [];

		try {
			// Check that churches exist
			const churches = await pb.collection('churches').getList(1, 1);
			if (churches.totalItems === 0) {
				issues.push('No churches found');
			}

			// Check that memberships exist
			const memberships = await pb.collection('church_memberships').getList(1, 1);
			if (memberships.totalItems === 0) {
				issues.push('No church memberships found');
			}

			// Check that existing data has church_id
			const songs = await pb.collection('songs').getList(1, 5);
			if (songs.items.some((song) => !song.church_id)) {
				issues.push('Some songs missing church_id');
			}

			const services = await pb.collection('services').getList(1, 5);
			if (services.items.some((service) => !service.church_id)) {
				issues.push('Some services missing church_id');
			}
		} catch (error: unknown) {
			issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return {
			success: issues.length === 0,
			issues
		};
	}
}

/**
 * Convenience function for manual migration trigger
 */
export async function runChurchMigration(): Promise<void> {
	return ChurchMigration.migrateToChurches();
}

/**
 * Check if the current installation needs church migration
 */
export async function checkMigrationStatus(): Promise<{
	needsMigration: boolean;
	hasUsers: boolean;
	hasChurches: boolean;
}> {
	try {
		const [users, churches] = await Promise.all([
			pb.collection('users').getList(1, 1),
			pb.collection('churches').getList(1, 1)
		]);

		return {
			needsMigration: users.totalItems > 0 && churches.totalItems === 0,
			hasUsers: users.totalItems > 0,
			hasChurches: churches.totalItems > 0
		};
	} catch (error) {
		console.warn('Failed to check migration status:', error);
		return {
			needsMigration: true,
			hasUsers: false,
			hasChurches: false
		};
	}
}
