import type { 
	ServiceComment, 
	CreateServiceCommentData, 
	UpdateServiceCommentData 
} from '$lib/types/service';
import type { AuthContext } from '$lib/types/auth';
import type PocketBase from 'pocketbase';

export interface ServiceCommentsAPI {
	getCommentsForService(serviceId: string): Promise<ServiceComment[]>;
	createComment(data: CreateServiceCommentData): Promise<ServiceComment>;
	updateComment(commentId: string, data: UpdateServiceCommentData): Promise<ServiceComment>;
	deleteComment(commentId: string): Promise<void>;
	subscribeToComments(serviceId: string, callback: (data: any) => void): Promise<() => void>;
}

export function createServiceCommentsAPI(
	authContext: AuthContext,
	pb: PocketBase
): ServiceCommentsAPI {
	return {
		async getCommentsForService(serviceId: string): Promise<ServiceComment[]> {
			try {
				const comments = await pb.collection('service_comments').getFullList<ServiceComment>({
					filter: `service_id = "${serviceId}"`,
					sort: 'created',
					expand: 'user_id,parent_id,mentions'
				});
				return comments;
			} catch (error) {
				console.error('Failed to fetch service comments:', error);
				throw error;
			}
		},

		async createComment(data: CreateServiceCommentData): Promise<ServiceComment> {
			try {
				// Add current user as the comment author
				const commentData = {
					...data,
					user_id: authContext.user?.id
				};
				
				const comment = await pb.collection('service_comments').create<ServiceComment>(
					commentData,
					{ expand: 'user_id,mentions' }
				);
				return comment;
			} catch (error) {
				console.error('Failed to create comment:', error);
				throw error;
			}
		},

		async updateComment(commentId: string, data: UpdateServiceCommentData): Promise<ServiceComment> {
			try {
				// Add edited timestamp
				const updateData = {
					...data,
					edited: true,
					edited_at: new Date().toISOString()
				};
				
				const comment = await pb.collection('service_comments').update<ServiceComment>(
					commentId,
					updateData,
					{ expand: 'user_id,mentions' }
				);
				return comment;
			} catch (error) {
				console.error('Failed to update comment:', error);
				throw error;
			}
		},

		async deleteComment(commentId: string): Promise<void> {
			try {
				await pb.collection('service_comments').delete(commentId);
			} catch (error) {
				console.error('Failed to delete comment:', error);
				throw error;
			}
		},

		async subscribeToComments(serviceId: string, callback: (data: any) => void): Promise<() => void> {
			try {
				// Subscribe to all comments for this service
				const unsubscribe = await pb.collection('service_comments').subscribe(
					`service_id = "${serviceId}"`,
					callback,
					{ expand: 'user_id,mentions' }
				);
				
				return unsubscribe;
			} catch (error) {
				console.error('Failed to subscribe to comments:', error);
				throw error;
			}
		}
	};
}