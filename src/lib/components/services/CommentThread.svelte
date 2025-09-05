<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import type { ServiceComment, CreateServiceCommentData } from '$lib/types/service';
	import { createServiceCommentsAPI } from '$lib/api/service-comments';
	import Button from '$lib/components/ui/Button.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';

	interface Props {
		serviceId: string;
		onClose?: () => void;
	}

	let { serviceId, onClose }: Props = $props();

	const auth = getAuthStore();
	const commentsApi = $derived.by(() => {
		const ctx = auth.getAuthContext();
		return createServiceCommentsAPI(ctx, ctx.pb);
	});

	// State
	let comments = $state<ServiceComment[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newComment = $state('');
	let editingComment = $state<string | null>(null);
	let editText = $state('');
	let replyingTo = $state<string | null>(null);
	let replyText = $state('');
	let submitting = $state(false);

	// Real-time subscription
	let unsubscribe: (() => void) | null = null;

	// Group comments by thread
	let commentThreads = $derived(() => {
		const rootComments = comments.filter(c => !c.parent_id);
		const childMap = new Map<string, ServiceComment[]>();
		
		comments.filter(c => c.parent_id).forEach(comment => {
			const siblings = childMap.get(comment.parent_id!) || [];
			siblings.push(comment);
			childMap.set(comment.parent_id!, siblings);
		});

		return rootComments.map(root => ({
			root,
			replies: childMap.get(root.id) || []
		}));
	});

	// Load comments
	async function loadComments() {
		try {
			loading = true;
			error = null;
			comments = await commentsApi.getCommentsForService(serviceId);
		} catch (err) {
			error = 'Failed to load comments';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// Submit new comment
	async function submitComment() {
		if (!newComment.trim() || submitting) return;

		try {
			submitting = true;
			await commentsApi.createComment({
				service_id: serviceId,
				comment: newComment.trim()
			});
			newComment = '';
		} catch (err) {
			error = 'Failed to post comment';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Submit reply
	async function submitReply() {
		if (!replyText.trim() || !replyingTo || submitting) return;

		try {
			submitting = true;
			await commentsApi.createComment({
				service_id: serviceId,
				comment: replyText.trim(),
				parent_id: replyingTo
			});
			replyText = '';
			replyingTo = null;
		} catch (err) {
			error = 'Failed to post reply';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Start editing
	function startEdit(commentId: string, text: string) {
		editingComment = commentId;
		editText = text;
		replyingTo = null;
	}

	// Save edit
	async function saveEdit() {
		if (!editingComment || !editText.trim() || submitting) return;

		try {
			submitting = true;
			await commentsApi.updateComment(editingComment, {
				comment: editText.trim()
			});
			editingComment = null;
			editText = '';
		} catch (err) {
			error = 'Failed to update comment';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Delete comment
	async function deleteComment(commentId: string) {
		if (!confirm('Are you sure you want to delete this comment?')) return;

		try {
			await commentsApi.deleteComment(commentId);
		} catch (err) {
			error = 'Failed to delete comment';
			console.error(err);
		}
	}

	// Format relative time
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString();
	}

	// Handle real-time updates
	function handleRealtimeUpdate(event: any) {
		if (event.action === 'create') {
			comments = [...comments, event.record];
		} else if (event.action === 'update') {
			comments = comments.map(c => c.id === event.record.id ? event.record : c);
		} else if (event.action === 'delete') {
			comments = comments.filter(c => c.id !== event.record.id);
		}
	}

	onMount(async () => {
		await loadComments();
		
		// Subscribe to real-time updates
		try {
			unsubscribe = await commentsApi.subscribeToComments(serviceId, handleRealtimeUpdate);
		} catch (err) {
			console.error('Failed to subscribe to comments:', err);
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});
</script>

<div class="flex h-full flex-col bg-white">
	<!-- Header -->
	<div class="border-b border-gray-200 px-4 py-3">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">Comments</h3>
			{#if onClose}
				<button
					onclick={onClose}
					class="text-gray-400 hover:text-gray-500"
					aria-label="Close comments"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<!-- Comments list -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<div class="text-gray-500">Loading comments...</div>
			</div>
		{:else if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-800">
				{error}
			</div>
		{:else if commentThreads.length === 0}
			<div class="text-center text-gray-500 py-8">
				No comments yet. Be the first to comment!
			</div>
		{:else}
			<div class="space-y-4">
				{#each commentThreads as thread}
					<!-- Root comment -->
					<div class="rounded-lg border border-gray-200 p-4">
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0">
								<div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
									{thread.root.expand?.user_id?.name?.[0]?.toUpperCase() || '?'}
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-medium text-gray-900">
										{thread.root.expand?.user_id?.name || 'Unknown User'}
									</span>
									<span class="text-sm text-gray-500">
										{formatTime(thread.root.created)}
									</span>
									{#if thread.root.edited}
										<span class="text-xs text-gray-400">(edited)</span>
									{/if}
								</div>
								
								{#if editingComment === thread.root.id}
									<!-- Edit mode -->
									<div class="mt-2 space-y-2">
										<TextArea
											bind:value={editText}
											rows={3}
											class="w-full"
											placeholder="Edit your comment..."
										/>
										<div class="flex gap-2">
											<Button
												variant="primary"
												size="sm"
												onclick={saveEdit}
												disabled={submitting}
											>
												Save
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onclick={() => {
													editingComment = null;
													editText = '';
												}}
											>
												Cancel
											</Button>
										</div>
									</div>
								{:else}
									<!-- Display mode -->
									<p class="text-gray-700 whitespace-pre-wrap">{thread.root.comment}</p>
									
									<!-- Actions -->
									<div class="mt-2 flex items-center gap-4">
										<button
											class="text-sm text-gray-500 hover:text-gray-700"
											onclick={() => {
												replyingTo = thread.root.id;
												editingComment = null;
											}}
										>
											Reply
										</button>
										{#if thread.root.user_id === auth.user?.id}
											<button
												class="text-sm text-gray-500 hover:text-gray-700"
												onclick={() => startEdit(thread.root.id, thread.root.comment)}
											>
												Edit
											</button>
											<button
												class="text-sm text-red-500 hover:text-red-700"
												onclick={() => deleteComment(thread.root.id)}
											>
												Delete
											</button>
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<!-- Replies -->
						{#if thread.replies.length > 0}
							<div class="mt-4 ml-11 space-y-3">
								{#each thread.replies as reply}
									<div class="border-l-2 border-gray-200 pl-4">
										<div class="flex items-center gap-2 mb-1">
											<span class="font-medium text-gray-900 text-sm">
												{reply.expand?.user_id?.name || 'Unknown User'}
											</span>
											<span class="text-xs text-gray-500">
												{formatTime(reply.created)}
											</span>
											{#if reply.edited}
												<span class="text-xs text-gray-400">(edited)</span>
											{/if}
										</div>
										
										{#if editingComment === reply.id}
											<!-- Edit mode -->
											<div class="mt-2 space-y-2">
												<TextArea
													bind:value={editText}
													rows={2}
													class="w-full"
													placeholder="Edit your reply..."
												/>
												<div class="flex gap-2">
													<Button
														variant="primary"
														size="sm"
														onclick={saveEdit}
														disabled={submitting}
													>
														Save
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onclick={() => {
															editingComment = null;
															editText = '';
														}}
													>
														Cancel
													</Button>
												</div>
											</div>
										{:else}
											<!-- Display mode -->
											<p class="text-sm text-gray-700 whitespace-pre-wrap">{reply.comment}</p>
											
											<!-- Actions -->
											{#if reply.user_id === auth.user?.id}
												<div class="mt-1 flex items-center gap-3">
													<button
														class="text-xs text-gray-500 hover:text-gray-700"
														onclick={() => startEdit(reply.id, reply.comment)}
													>
														Edit
													</button>
													<button
														class="text-xs text-red-500 hover:text-red-700"
														onclick={() => deleteComment(reply.id)}
													>
														Delete
													</button>
												</div>
											{/if}
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<!-- Reply form -->
						{#if replyingTo === thread.root.id}
							<div class="mt-4 ml-11">
								<TextArea
									bind:value={replyText}
									rows={2}
									class="w-full"
									placeholder="Write a reply..."
									onkeydown={(e) => {
										if (e.key === 'Enter' && e.ctrlKey) {
											submitReply();
										}
									}}
								/>
								<div class="mt-2 flex gap-2">
									<Button
										variant="primary"
										size="sm"
										onclick={submitReply}
										disabled={submitting || !replyText.trim()}
									>
										Reply
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => {
											replyingTo = null;
											replyText = '';
										}}
									>
										Cancel
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- New comment form -->
	<div class="border-t border-gray-200 p-4">
		<TextArea
			bind:value={newComment}
			rows={3}
			class="w-full"
			placeholder="Write a comment..."
			disabled={submitting}
			onkeydown={(e) => {
				if (e.key === 'Enter' && e.ctrlKey) {
					submitComment();
				}
			}}
		/>
		<div class="mt-2 flex justify-between items-center">
			<span class="text-xs text-gray-500">
				Ctrl+Enter to submit
			</span>
			<Button
				variant="primary"
				onclick={submitComment}
				disabled={submitting || !newComment.trim()}
			>
				Post Comment
			</Button>
		</div>
	</div>
</div>
