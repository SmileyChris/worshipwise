<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { setlistsStore } from '$lib/stores/setlists.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import SetlistBuilder from '$lib/components/setlists/SetlistBuilder.svelte';
	import type { CreateSetlistData } from '$lib/types/setlist';
	import { onMount } from 'svelte';

	let showCreateModal = $state(false);
	let showBuilder = $state(false);
	let selectedSetlistId = $state<string | null>(null);

	// Form state for creating setlists
	let createForm = $state({
		title: '',
		service_date: '',
		service_type: 'Sunday Morning' as const,
		theme: '',
		notes: '',
		worship_leader: auth.user?.id || '',
		estimated_duration: 3600 // 1 hour default
	});

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Service type options
	const serviceTypes = [
		'Sunday Morning',
		'Sunday Evening',
		'Wednesday Night',
		'Special Event',
		'Youth Service',
		'Prayer Meeting',
		'Conference',
		'Outreach'
	] as const;

	// Load setlists on mount and set default date
	onMount(async () => {
		await setlistsStore.loadSetlists();
		updateDefaultServiceDate();
	});

	// Calculate next available Sunday
	function findNextAvailableSunday(): string {
		// Use local date to avoid timezone issues
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Start of day
		
		const setlists = setlistsStore.setlists;
		
		// Get existing service dates (convert to date strings for comparison)
		const existingDates = new Set(
			setlists.map(s => s.service_date).filter(Boolean)
		);
		
		// Start from next Sunday (or today if it's Sunday)
		let nextSunday = new Date(today);
		const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
		
		// Calculate days until next Sunday
		const daysUntilSunday = todayDayOfWeek === 0 ? 0 : 7 - todayDayOfWeek;
		nextSunday.setDate(today.getDate() + daysUntilSunday);
		
		// Keep checking Sundays until we find one without a setlist
		let attempts = 0;
		const maxAttempts = 52; // Don't check more than a year ahead
		
		while (attempts < maxAttempts) {
			// Format as YYYY-MM-DD for comparison
			const year = nextSunday.getFullYear();
			const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
			const day = String(nextSunday.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;
			
			if (!existingDates.has(dateString)) {
				return dateString;
			}
			
			// Move to next Sunday
			nextSunday.setDate(nextSunday.getDate() + 7);
			attempts++;
		}
		
		// Fallback to next Sunday if all are taken (unlikely)
		const fallbackSunday = new Date(today);
		const fallbackDaysUntilSunday = todayDayOfWeek === 0 ? 7 : 7 - todayDayOfWeek;
		fallbackSunday.setDate(today.getDate() + fallbackDaysUntilSunday);
		
		const year = fallbackSunday.getFullYear();
		const month = String(fallbackSunday.getMonth() + 1).padStart(2, '0');
		const day = String(fallbackSunday.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Update the default service date when setlists change
	function updateDefaultServiceDate() {
		if (createForm.service_date === '') {
			createForm.service_date = findNextAvailableSunday();
		}
	}

	// Update default date when setlists change
	$effect(() => {
		if (setlistsStore.setlists.length >= 0) { // Trigger when setlists are loaded
			updateDefaultServiceDate();
		}
	});

	// Stats from store
	let stats = $derived.by(() => {
		const setlists = setlistsStore.setlists;
		return {
			total: setlists.length,
			draft: setlists.filter((s) => s.status === 'draft').length,
			planned: setlists.filter((s) => s.status === 'planned').length,
			completed: setlists.filter((s) => s.status === 'completed').length
		};
	});

	async function handleCreateSetlist() {
		if (!createForm.title || !createForm.service_date || !createForm.worship_leader) {
			error = 'Please fill in all required fields';
			return;
		}

		loading = true;
		error = null;

		try {
			const newSetlist = await setlistsStore.createSetlist({
				title: createForm.title,
				service_date: createForm.service_date,
				service_type: createForm.service_type,
				theme: createForm.theme || undefined,
				notes: createForm.notes || undefined,
				worship_leader: createForm.worship_leader,
				estimated_duration: createForm.estimated_duration,
				status: 'draft'
			});

			// Reset form with next available Sunday
			resetCreateForm();

			showCreateModal = false;

			// Open builder for the new setlist
			selectedSetlistId = newSetlist.id;
			showBuilder = true;
		} catch (err: any) {
			error = err.message || 'Failed to create setlist';
		} finally {
			loading = false;
		}
	}

	function openBuilder(setlistId: string) {
		selectedSetlistId = setlistId;
		showBuilder = true;
	}

	function closeBuilder() {
		showBuilder = false;
		selectedSetlistId = null;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString();
	}

	function getStatusVariant(
		status: string
	): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
		switch (status) {
			case 'draft':
				return 'default';
			case 'planned':
				return 'primary';
			case 'completed':
				return 'success';
			case 'in_progress':
				return 'warning';
			case 'archived':
				return 'default';
			default:
				return 'default';
		}
	}

	// Get friendly date description for form
	function getDateDescription(dateString: string): string {
		if (!dateString) return '';
		
		const date = new Date(dateString);
		const today = new Date();
		const diffTime = date.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return '(Today)';
		if (diffDays === 1) return '(Tomorrow)';
		if (diffDays > 0 && diffDays <= 7) return `(In ${diffDays} days)`;
		if (diffDays > 7 && diffDays <= 14) return '(Next week)';
		
		return '';
	}

	// Reset form to defaults with fresh next Sunday calculation
	function resetCreateForm() {
		createForm = {
			title: '',
			service_date: findNextAvailableSunday(),
			service_type: 'Sunday Morning',
			theme: '',
			notes: '',
			worship_leader: auth.user?.id || '',
			estimated_duration: 3600
		};
	}

	// Open create modal with fresh form
	function openCreateModal() {
		resetCreateForm();
		showCreateModal = true;
	}
</script>

<svelte:head>
	<title>Setlists - WorshipWise</title>
</svelte:head>

{#if showBuilder && selectedSetlistId}
	<SetlistBuilder setlistId={selectedSetlistId} onClose={closeBuilder} />
{:else}
	<div class="space-y-6">
		<!-- Page header -->
		<div class="md:flex md:items-center md:justify-between">
			<div class="min-w-0 flex-1">
				<h2 class="text-2xl font-bold font-title text-gray-900 sm:text-3xl">Setlists</h2>
				<p class="mt-1 text-sm text-gray-500">Plan and manage your worship service setlists</p>
			</div>

			{#if auth.canManageSetlists}
				<div class="mt-4 flex md:mt-0 md:ml-4">
					<Button variant="primary" onclick={openCreateModal}>
						Create New Setlist
					</Button>
				</div>
			{/if}
		</div>

		<!-- Error message -->
		{#if error}
			<div class="rounded-lg bg-red-50 p-4 text-red-800">
				{error}
			</div>
		{/if}

		<!-- Quick stats -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
			<Card>
				<div class="text-center">
					<div class="text-2xl font-bold font-title text-gray-900">{stats().total}</div>
					<div class="text-sm text-gray-500">Total Setlists</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="text-2xl font-bold font-title text-blue-600">{stats().draft}</div>
					<div class="text-sm text-gray-500">Draft</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="text-2xl font-bold font-title text-green-600">{stats().planned}</div>
					<div class="text-sm text-gray-500">Planned</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="text-2xl font-bold font-title text-purple-600">{stats().completed}</div>
					<div class="text-sm text-gray-500">Completed</div>
				</div>
			</Card>
		</div>

		<!-- Setlists list -->
		{#if setlistsStore.loading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-gray-500">Loading setlists...</div>
			</div>
		{:else if setlistsStore.setlists.length === 0}
			<!-- Welcome message -->
			<Card>
				<div class="py-8 text-center">
					<div class="mb-4 text-6xl">📋</div>
					<h3 class="mb-2 text-lg font-medium font-title text-gray-900">Plan Your Worship Services</h3>
					<p class="mb-6 text-gray-500">
						Create setlists, track song usage, and collaborate with your team.
					</p>
					{#if auth.canManageSetlists}
						<Button variant="primary" onclick={openCreateModal}>
							Create Your First Setlist
						</Button>
					{:else}
						<p class="text-sm text-gray-400">
							View setlists assigned to you by your worship leader.
						</p>
					{/if}
				</div>
			</Card>
		{:else}
			<!-- Setlists grid -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each setlistsStore.setlists as setlist}
					<Card class="transition-shadow hover:shadow-lg">
						<div class="p-6">
							<div class="flex items-start justify-between">
								<div class="min-w-0 flex-1">
									<h3 class="truncate text-lg font-medium text-gray-900">
										{setlist.title}
									</h3>
									<p class="mt-1 text-sm text-gray-600">
										{formatDate(setlist.service_date)}
										{#if setlist.service_type}
											• {setlist.service_type}
										{/if}
									</p>
									{#if setlist.theme}
										<p class="mt-1 text-sm text-gray-500">Theme: {setlist.theme}</p>
									{/if}
								</div>
								<Badge variant={getStatusVariant(setlist.status || 'draft')}>
									{setlist.status || 'draft'}
								</Badge>
							</div>

							{#if setlist.notes}
								<p class="mt-3 line-clamp-2 text-sm text-gray-600">
									{setlist.notes}
								</p>
							{/if}

							<div class="mt-4 flex items-center justify-between">
								<div class="text-sm text-gray-500">
									{#if setlist.estimated_duration}
										{Math.floor(setlist.estimated_duration / 60)}:{(setlist.estimated_duration % 60)
											.toString()
											.padStart(2, '0')} estimated
									{/if}
								</div>
								<div class="flex gap-2">
									<Button variant="primary" size="sm" onclick={() => openBuilder(setlist.id)}>
										Edit
									</Button>
									{#if setlist.status === 'draft'}
										<Button
											variant="ghost"
											size="sm"
											onclick={async () => {
												await setlistsStore.updateSetlist(setlist.id, { status: 'planned' });
											}}
										>
											Plan
										</Button>
									{/if}
								</div>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- Create setlist modal -->
<Modal open={showCreateModal} title="Create New Setlist" onclose={() => (showCreateModal = false)}>
	{#snippet children()}
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleCreateSetlist();
			}}
		>
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700">Title *</label>
				<input
					id="title"
					type="text"
					bind:value={createForm.title}
					placeholder="Sunday Morning Worship"
					required
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="service_date" class="block text-sm font-medium text-gray-700">
					Service Date * {getDateDescription(createForm.service_date)}
				</label>
				<input
					id="service_date"
					type="date"
					bind:value={createForm.service_date}
					required
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
				{#if createForm.service_date}
					<p class="mt-1 text-xs text-gray-500">
						Next available Sunday selected automatically
					</p>
				{/if}
			</div>

			<div>
				<label for="service_type" class="block text-sm font-medium text-gray-700">
					Service Type
				</label>
				<select
					id="service_type"
					bind:value={createForm.service_type}
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				>
					{#each serviceTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="theme" class="block text-sm font-medium text-gray-700">Theme</label>
				<input
					id="theme"
					type="text"
					bind:value={createForm.theme}
					placeholder="Grace and Mercy"
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
				<textarea
					id="notes"
					bind:value={createForm.notes}
					rows="3"
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					placeholder="Special instructions or notes..."
				></textarea>
			</div>

			{#if error}
				<div class="text-sm text-red-600">{error}</div>
			{/if}

			<div class="flex justify-end gap-3 pt-4">
				<Button variant="ghost" onclick={() => (showCreateModal = false)}>Cancel</Button>
				<Button type="submit" variant="primary" disabled={loading}>
					{loading ? 'Creating...' : 'Create Setlist'}
				</Button>
			</div>
		</form>
	{/snippet}
</Modal>
