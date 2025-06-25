import { vi } from 'vitest';
import { MockRecordService, type MockRecord, MockPocketBase } from './pb-mock';

/**
 * Collection-specific mock services that implement realistic filtering behavior
 */

// Helper to parse PocketBase filter strings
function parseFilter(filter: string): Record<string, any> {
	const conditions: Record<string, any> = {};
	// Simple parser for common patterns
	const patterns = [
		/(\w+)\s*=\s*"([^"]+)"/g, // field = "value"
		/(\w+)\s*~\s*"([^"]+)"/g, // field ~ "value" (contains)
		/(\w+)\s*\?\~\s*"([^"]+)"/g, // field ?~ "value" (array contains)
		/(\w+)\s*!=\s*(\w+)/g, // field != value
		/(\w+)\s*>=?\s*(\d+)/g, // field >= number
		/(\w+)\s*<=?\s*(\d+)/g // field <= number
	];

	// Extract basic conditions (simplified)
	const match = filter.match(/(\w+)\s*=\s*"([^"]+)"/);
	if (match) {
		conditions[match[1]] = match[2];
	}

	return conditions;
}

// Church Memberships Mock Service
export class MockChurchMembershipsService extends MockRecordService {
	constructor(pb: MockPocketBase) {
		super('church_memberships', pb);
		this.setupDefaultBehavior();
	}

	private setupDefaultBehavior() {
		// Override getFullList to filter by church_id when present
		const originalGetFullList = this.getFullList;
		this.getFullList.mockImplementation(async (options?: any) => {
			if (options?.filter) {
				const conditions = parseFilter(options.filter);
				const allRecords = await originalGetFullList();

				// Filter by church_id
				if (conditions.church_id) {
					return allRecords.filter((r: any) => r.church_id === conditions.church_id);
				}

				// Filter by user_id
				if (conditions.user_id) {
					return allRecords.filter((r: any) => r.user_id === conditions.user_id);
				}
			}
			return originalGetFullList();
		});

		// Override getList to handle pagination and filtering
		const originalGetList = this.getList;
		this.getList.mockImplementation(async (page?: number, perPage?: number, options?: any) => {
			const result = await originalGetList(page, perPage, options);

			if (options?.filter) {
				const conditions = parseFilter(options.filter);
				let filtered = result.items;

				// Apply filters
				if (conditions.church_id) {
					filtered = filtered.filter((r: any) => r.church_id === conditions.church_id);
				}
				if (conditions.role) {
					filtered = filtered.filter((r: any) => r.role === conditions.role);
				}

				// Handle expand
				if (options.expand && filtered.length > 0) {
					filtered = filtered.map((item: any) => ({
						...item,
						expand: this.createExpandedRelations(item, options.expand)
					}));
				}

				return {
					...result,
					items: filtered,
					totalItems: filtered.length,
					totalPages: Math.ceil(filtered.length / (perPage || 30))
				};
			}

			return result;
		});
	}

	private createExpandedRelations(record: any, expand: string): any {
		const relations: any = {};
		const expandFields = expand.split(',').map((f) => f.trim());

		expandFields.forEach((field) => {
			if (field === 'user_id' && record.user_id) {
				relations.user_id = {
					id: record.user_id,
					email: `user-${record.user_id}@example.com`,
					name: `User ${record.user_id}`,
					verified: true
				};
			}
			if (field === 'church_id' && record.church_id) {
				relations.church_id = {
					id: record.church_id,
					name: `Church ${record.church_id}`,
					timezone: 'America/New_York'
				};
			}
		});

		return relations;
	}
}

// Songs Mock Service
export class MockSongsService extends MockRecordService {
	constructor(pb: MockPocketBase) {
		super('songs', pb);
		this.setupDefaultBehavior();
	}

	private setupDefaultBehavior() {
		// Override getFullList to filter by church_id and active status
		const originalGetFullList = this.getFullList;
		this.getFullList.mockImplementation(async (options?: any) => {
			const allRecords = await originalGetFullList();

			if (options?.filter) {
				const conditions = parseFilter(options.filter);
				let filtered = allRecords;

				// Always filter by church_id
				if (conditions.church_id) {
					filtered = filtered.filter((r: any) => r.church_id === conditions.church_id);
				}

				// Filter by active status
				if (conditions.is_active !== undefined) {
					filtered = filtered.filter((r: any) => r.is_active === (conditions.is_active === 'true'));
				}

				return filtered;
			}

			return allRecords;
		});
	}
}

// Services Mock Service
export class MockServicesService extends MockRecordService {
	constructor(pb: MockPocketBase) {
		super('services', pb);
		this.setupDefaultBehavior();
	}

	private setupDefaultBehavior() {
		// Handle service-specific queries
		const originalGetList = this.getList;
		this.getList.mockImplementation(async (page?: number, perPage?: number, options?: any) => {
			const result = await originalGetList(page, perPage, options);

			if (options?.filter) {
				const conditions = parseFilter(options.filter);
				let filtered = result.items;

				// Filter by church_id
				if (conditions.church_id) {
					filtered = filtered.filter((r: any) => r.church_id === conditions.church_id);
				}

				// Filter by status
				if (conditions.status) {
					filtered = filtered.filter((r: any) => r.status === conditions.status);
				}

				// Sort by service_date if specified
				if (options.sort?.includes('service_date')) {
					const desc = options.sort.startsWith('-');
					filtered.sort((a: any, b: any) => {
						const dateA = new Date(a.service_date).getTime();
						const dateB = new Date(b.service_date).getTime();
						return desc ? dateB - dateA : dateA - dateB;
					});
				}

				return {
					...result,
					items: filtered,
					totalItems: filtered.length,
					totalPages: Math.ceil(filtered.length / (perPage || 30))
				};
			}

			return result;
		});
	}
}

// Service Songs Mock Service with junction table behavior
export class MockServiceSongsService extends MockRecordService {
	constructor(pb: MockPocketBase) {
		super('service_songs', pb);
		this.setupDefaultBehavior();
	}

	private setupDefaultBehavior() {
		// Handle junction table queries
		const originalGetFullList = this.getFullList;
		this.getFullList.mockImplementation(async (options?: any) => {
			let records = await originalGetFullList();

			if (options?.filter) {
				const conditions = parseFilter(options.filter);

				// Filter by service_id
				if (conditions.service_id) {
					records = records.filter((r: any) => r.service_id === conditions.service_id);
				}

				// Sort by order_position
				if (options.sort?.includes('order_position')) {
					records.sort((a: any, b: any) => a.order_position - b.order_position);
				}

				// Handle expand for song details
				if (options.expand?.includes('song_id')) {
					records = records.map((record: any) => ({
						...record,
						expand: {
							song_id: {
								id: record.song_id,
								title: `Song ${record.song_id}`,
								artist: 'Test Artist',
								key_signature: 'C',
								tempo: 120,
								duration_seconds: 240
							}
						}
					}));
				}
			}

			return records;
		});
	}
}

// Factory to create collection-specific services
export function createMockCollectionService(
	collectionName: string,
	pb: MockPocketBase
): MockRecordService {
	switch (collectionName) {
		case 'church_memberships':
			return new MockChurchMembershipsService(pb);
		case 'songs':
			return new MockSongsService(pb);
		case 'services':
			return new MockServicesService(pb);
		case 'service_songs':
			return new MockServiceSongsService(pb);
		default:
			return new MockRecordService(collectionName, pb);
	}
}

// Enhanced MockPocketBase that uses collection-specific services
export class EnhancedMockPocketBase extends MockPocketBase {
	constructor() {
		super();

		// Override collection method to use specialized services
		this.collection.mockImplementation((name: string) => {
			if (!this.services.has(name)) {
				this.services.set(name, createMockCollectionService(name, this));
			}
			return this.services.get(name);
		});
	}
}

// Export enhanced mock instance
export const enhancedMockPb = new EnhancedMockPocketBase();
