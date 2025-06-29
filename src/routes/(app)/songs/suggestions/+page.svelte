<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { createSuggestionsAPI } from '$lib/api/suggestions';
	import type { SongSuggestion } from '$lib/types/song';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SongSuggestionCard from '$lib/components/songs/SongSuggestionCard.svelte';
	import SuggestSongModal from '$lib/components/songs/SuggestSongModal.svelte';

	const auth = getAuthStore();
	const authContext = auth.getAuthContext();
	const suggestionsAPI = createSuggestionsAPI(authContext, authContext.pb);

	// State
	let suggestions = $state<SongSuggestion[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let statusFilter = $state<'all' | 'pending' | 'approved' | 'rejected'>('all');
	let showSuggestModal = $state(false);

	// Filter options
	const filterOptions = [
		{ value: 'all', label: 'All Suggestions' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' }
	];

	// Filtered suggestions
	let filteredSuggestions = $derived.by(() => {
		if (statusFilter === 'all') return suggestions;
		return suggestions.filter((s) => s.status === statusFilter);
	});

	// Stats
	let stats = $derived.by(() => {
		return {
			total: suggestions.length,
			pending: suggestions.filter((s) => s.status === 'pending').length,
			approved: suggestions.filter((s) => s.status === 'approved').length,
			rejected: suggestions.filter((s) => s.status === 'rejected').length
		};
	});

	// Load suggestions
	async function loadSuggestions() {
		loading = true;
		error = null;

		try {
			suggestions = await suggestionsAPI.getSuggestions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load suggestions';
		} finally {
			loading = false;
		}
	}

	// Handle suggestion actions
	async function handleApprove(suggestion: SongSuggestion) {
		try {
			await suggestionsAPI.updateSuggestionStatus(suggestion.id, 'approved');
			await loadSuggestions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to approve suggestion';
		}
	}

	async function handleReject(suggestion: SongSuggestion) {
		try {
			await suggestionsAPI.updateSuggestionStatus(suggestion.id, 'rejected');
			await loadSuggestions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reject suggestion';
		}
	}

	async function handleDelete(suggestion: SongSuggestion) {
		if (!confirm('Are you sure you want to delete this suggestion?')) return;

		try {
			await suggestionsAPI.deleteSuggestion(suggestion.id);
			await loadSuggestions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete suggestion';
		}
	}

	async function handleSuggestSuccess() {
		await loadSuggestions();
	}

	onMount(() => {
		loadSuggestions();

		// Subscribe to real-time updates
		const unsubscribePromise = suggestionsAPI.subscribe(() => {
			loadSuggestions();
		});

		return () => {
			unsubscribePromise.then((unsubscribe) => {
				if (unsubscribe) unsubscribe();
			});
		};
	});
</script>

<svelte:head>
	<title>Song Suggestions - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2
				class="font-title text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Song Suggestions
			</h2>
			<p class="mt-1 text-sm text-gray-500">Review and manage song suggestions from your team</p>
		</div>

		<div class="mt-4 flex md:mt-0 md:ml-4">
			<Button variant="primary" onclick={() => (showSuggestModal = true)}>Suggest a Song</Button>
		</div>
	</div>

	<!-- Stats cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
		<Card>
			<div class="text-center">
				<div class="font-title text-2xl font-bold text-gray-900">{stats.total}</div>
				<div class="text-sm text-gray-500">Total</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="font-title text-2xl font-bold text-yellow-600">{stats.pending}</div>
				<div class="text-sm text-gray-500">Pending</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="font-title text-2xl font-bold text-green-600">{stats.approved}</div>
				<div class="text-sm text-gray-500">Approved</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="font-title text-2xl font-bold text-red-600">{stats.rejected}</div>
				<div class="text-sm text-gray-500">Rejected</div>
			</div>
		</Card>
	</div>

	<!-- Filter -->
	<Card padding={false} class="p-4">
		<div class="flex items-center justify-between">
			<label for="status-filter" class="text-sm font-medium text-gray-700">
				Filter by status:
			</label>
			<Select id="status-filter" bind:value={statusFilter} options={filterOptions} class="w-48" />
		</div>
	</Card>

	<!-- Error display -->
	{#if error}
		<div class="rounded-md bg-red-50 p-4">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	<!-- Suggestions list -->
	{#if loading}
		<div class="py-8 text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-sm text-gray-500">Loading suggestions...</p>
		</div>
	{:else if filteredSuggestions.length === 0}
		<Card class="py-12 text-center">
			<p class="text-gray-500">
				{#if statusFilter === 'all'}
					No suggestions yet. Be the first to suggest a song!
				{:else}
					No {statusFilter} suggestions.
				{/if}
			</p>
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{#each filteredSuggestions as suggestion (suggestion.id)}
				<SongSuggestionCard
					{suggestion}
					onApprove={handleApprove}
					onReject={handleReject}
					onDelete={handleDelete}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Suggest Song Modal -->
<SuggestSongModal
	bind:open={showSuggestModal}
	onsuccess={handleSuggestSuccess}
	onclose={() => (showSuggestModal = false)}
/>
