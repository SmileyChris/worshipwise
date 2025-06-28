<script lang="ts">
	import type { SongSuggestion } from '$lib/types/song';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		suggestion: SongSuggestion;
		onApprove?: (suggestion: SongSuggestion) => void;
		onReject?: (suggestion: SongSuggestion) => void;
		onDelete?: (suggestion: SongSuggestion) => void;
	}

	let { suggestion, onApprove, onReject, onDelete }: Props = $props();

	const auth = getAuthStore();

	// Check permissions
	let canModerate = $derived(auth.canManageSongs);
	let canDelete = $derived(
		suggestion.suggested_by === auth.user?.id || auth.canManageChurch
	);

	// Status badge variant
	let statusVariant = $derived.by(() => {
		switch (suggestion.status) {
			case 'approved':
				return 'success';
			case 'rejected':
				return 'danger';
			default:
				return 'secondary';
		}
	});

	// Format time
	// Simple time ago function
	let timeAgo = $derived.by(() => {
		const date = new Date(suggestion.created);
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
		
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
		if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
		if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
		return date.toLocaleDateString();
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<!-- Header -->
	<div class="mb-3 flex items-start justify-between">
		<div class="flex-1">
			{#if suggestion.expand?.song_id}
				<h3 class="font-semibold text-gray-900">
					{suggestion.expand.song_id.title}
					{#if suggestion.expand.song_id.artist}
						<span class="text-sm font-normal text-gray-500">
							by {suggestion.expand.song_id.artist}
						</span>
					{/if}
				</h3>
			{:else}
				<h3 class="font-semibold text-gray-900">Song Suggestion</h3>
			{/if}

			<div class="mt-1 flex items-center gap-3 text-sm text-gray-500">
				{#if suggestion.expand?.suggested_by}
					<span>Suggested by {suggestion.expand.suggested_by.name}</span>
				{/if}
				<span>{timeAgo}</span>
			</div>
		</div>

		<Badge variant={statusVariant} size="sm">
			{suggestion.status}
		</Badge>
	</div>

	<!-- Notes -->
	{#if suggestion.notes}
		<div class="mb-3">
			<p class="text-sm text-gray-700 whitespace-pre-wrap">{suggestion.notes}</p>
		</div>
	{/if}

	<!-- Actions -->
	{#if suggestion.status === 'pending'}
		<div class="flex items-center gap-2">
			{#if canModerate}
				<Button
					variant="success"
					size="sm"
					onclick={() => onApprove?.(suggestion)}
				>
					Approve
				</Button>
				<Button
					variant="danger"
					size="sm"
					onclick={() => onReject?.(suggestion)}
				>
					Reject
				</Button>
			{/if}

			{#if canDelete}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => onDelete?.(suggestion)}
					class="ml-auto text-red-600 hover:text-red-700"
				>
					Delete
				</Button>
			{/if}
		</div>
	{:else if canDelete}
		<div class="flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => onDelete?.(suggestion)}
				class="text-red-600 hover:text-red-700"
			>
				Delete
			</Button>
		</div>
	{/if}
</div>

<style>
	.whitespace-pre-wrap {
		white-space: pre-wrap;
	}
</style>