<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { createShareAPI } from '$lib/api/share';
	import type { TeamShareLink } from '$lib/types/notification';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const shareAPI = createShareAPI(authContext, authContext.pb);

	// State
	let shareLinks = $state<TeamShareLink[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let creating = $state(false);

	// New link form
	let accessType = $state<'ratings' | 'suggestions' | 'both'>('ratings');
	let expiresInDays = $state(30);

	const accessTypeOptions = [
		{ value: 'ratings', label: 'Ratings Only' },
		{ value: 'suggestions', label: 'Suggestions Only' },
		{ value: 'both', label: 'Ratings & Suggestions' }
	];

	const expiryOptions = [
		{ value: 7, label: '7 days' },
		{ value: 14, label: '14 days' },
		{ value: 30, label: '30 days' },
		{ value: 90, label: '90 days' }
	];

	// Load existing share links
	async function loadShareLinks() {
		loading = true;
		error = null;

		try {
			shareLinks = await shareAPI.getShareLinks();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load share links';
		} finally {
			loading = false;
		}
	}

	// Create new share link
	async function createShareLink() {
		creating = true;
		error = null;

		try {
			const newLink = await shareAPI.createShareLink({
				access_type: accessType,
				expires_in_days: expiresInDays
			});

			shareLinks = [newLink, ...shareLinks];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create share link';
		} finally {
			creating = false;
		}
	}

	// Delete share link
	async function deleteShareLink(link: TeamShareLink) {
		if (!confirm('Are you sure you want to delete this share link?')) return;

		try {
			await shareAPI.deleteShareLink(link.id);
			shareLinks = shareLinks.filter(l => l.id !== link.id);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete share link';
		}
	}

	// Copy link to clipboard
	async function copyLink(token: string) {
		const url = shareAPI.buildShareUrl(token);
		
		try {
			await navigator.clipboard.writeText(url);
			alert('Link copied to clipboard!');
		} catch (err) {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			alert('Link copied to clipboard!');
		}
	}

	onMount(() => {
		loadShareLinks();
	});
</script>

<Card>
	<div class="space-y-4">
		<h3 class="text-lg font-semibold text-gray-900">Team Share Links</h3>
		
		<!-- Create new link -->
		<div class="rounded-lg bg-gray-50 p-4">
			<h4 class="text-sm font-medium text-gray-700 mb-3">Create New Share Link</h4>
			
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div>
					<label for="access-type" class="block text-xs font-medium text-gray-600 mb-1">
						Access Type
					</label>
					<Select
						id="access-type"
						bind:value={accessType}
						options={accessTypeOptions}
						size="sm"
					/>
				</div>
				
				<div>
					<label for="expires-in" class="block text-xs font-medium text-gray-600 mb-1">
						Expires In
					</label>
					<Select
						id="expires-in"
						bind:value={expiresInDays}
						options={expiryOptions}
						size="sm"
					/>
				</div>
				
				<div class="flex items-end">
					<Button
						variant="primary"
						size="sm"
						onclick={createShareLink}
						disabled={creating}
						class="w-full"
					>
						{creating ? 'Creating...' : 'Create Link'}
					</Button>
				</div>
			</div>
		</div>

		{#if error}
			<div class="rounded-md bg-red-50 p-3">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		{/if}

		<!-- Existing links -->
		{#if loading}
			<div class="py-4 text-center">
				<div class="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-b-2"></div>
			</div>
		{:else if shareLinks.length === 0}
			<p class="text-sm text-gray-500 text-center py-4">
				No active share links. Create one to share with your team!
			</p>
		{:else}
			<div class="space-y-2">
				{#each shareLinks as link (link.id)}
					<div class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<Badge variant="secondary" size="sm">
									{link.access_type === 'both' ? 'All Access' : link.access_type}
								</Badge>
								<span class="text-xs text-gray-500">
									Expires {(() => {
										const date = new Date(link.expires_at);
										const now = new Date();
										const seconds = Math.floor((date.getTime() - now.getTime()) / 1000);
										
										if (seconds < 0) return 'expired';
										if (seconds < 60) return 'in a few seconds';
										if (seconds < 3600) return 'in ' + Math.floor(seconds / 60) + ' minutes';
										if (seconds < 86400) return 'in ' + Math.floor(seconds / 3600) + ' hours';
										if (seconds < 604800) return 'in ' + Math.floor(seconds / 86400) + ' days';
										return date.toLocaleDateString();
									})()}
								</span>
							</div>
							<p class="mt-1 text-xs text-gray-600 truncate">
								{shareAPI.buildShareUrl(link.token)}
							</p>
						</div>
						
						<div class="flex items-center gap-2 ml-4">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => copyLink(link.token)}
							>
								Copy
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => deleteShareLink(link)}
								class="text-red-600 hover:text-red-700"
							>
								Delete
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</Card>