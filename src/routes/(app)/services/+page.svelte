<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { servicesStore } from '$lib/stores/services.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ServiceBuilder from '$lib/components/services/ServiceBuilder.svelte';
	import { onMount } from 'svelte';

	let showCreateModal = $state(false);
	let showBuilder = $state(false);
	let selectedServiceId = $state<string | null>(null);

	// Form state for creating services
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

	// Load services on mount and set default date
	onMount(async () => {
		await servicesStore.loadServices();
		updateDefaultServiceDate();
	});

	// Calculate next available Sunday
	function findNextAvailableSunday(): string {
		// Use local date to avoid timezone issues
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Start of day

		const services = servicesStore.services;

		// Get existing service dates (convert to date strings for comparison)
		const existingDates = new Set(services.map((s) => s.service_date).filter(Boolean));

		// Start from next Sunday (or today if it's Sunday)
		let nextSunday = new Date(today);
		const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

		// Calculate days until next Sunday
		const daysUntilSunday = todayDayOfWeek === 0 ? 0 : 7 - todayDayOfWeek;
		nextSunday.setDate(today.getDate() + daysUntilSunday);

		// Keep checking Sundays until we find one without a service
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

	// Update the default service date when services change
	function updateDefaultServiceDate() {
		if (createForm.service_date === '') {
			createForm.service_date = findNextAvailableSunday();
		}
	}

	// Update default date when services change
	$effect(() => {
		if (servicesStore.services.length >= 0) {
			// Trigger when services are loaded
			updateDefaultServiceDate();
		}
	});

	// Stats from store
	let stats = $derived.by(() => {
		const services = servicesStore.services;
		return {
			total: services.length,
			draft: services.filter((s) => s.status === 'draft').length,
			planned: services.filter((s) => s.status === 'planned').length,
			completed: services.filter((s) => s.status === 'completed').length
		};
	});

	async function handleCreateService() {
		if (!createForm.title || !createForm.service_date || !createForm.worship_leader) {
			error = 'Please fill in all required fields';
			return;
		}

		loading = true;
		error = null;

		try {
			const newService = await servicesStore.createService({
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

			// Open builder for the new service
			selectedServiceId = newService.id;
			showBuilder = true;
		} catch (err: any) {
			error = err.message || 'Failed to create service';
		} finally {
			loading = false;
		}
	}

	function openBuilder(serviceId: string) {
		selectedServiceId = serviceId;
		showBuilder = true;
	}

	function closeBuilder() {
		showBuilder = false;
		selectedServiceId = null;
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
	<title>Services - WorshipWise</title>
</svelte:head>

{#if showBuilder && selectedServiceId}
	<ServiceBuilder serviceId={selectedServiceId} onClose={closeBuilder} />
{:else}
	<div class="space-y-6">
		<!-- Page header -->
		<div class="md:flex md:items-center md:justify-between">
			<div class="min-w-0 flex-1">
				<h2 class="font-title text-2xl font-bold text-gray-900 sm:text-3xl">Services</h2>
				<p class="mt-1 text-sm text-gray-500">Plan and manage your worship services</p>
			</div>

			{#if auth.canManageServices}
				<div class="mt-4 flex md:mt-0 md:ml-4">
					<Button variant="primary" onclick={openCreateModal}>Create New Service</Button>
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
					<div class="font-title text-2xl font-bold text-gray-900">{stats.total}</div>
					<div class="text-sm text-gray-500">Total Services</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="font-title text-primary text-2xl font-bold">{stats.draft}</div>
					<div class="text-sm text-gray-500">Draft</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="font-title text-2xl font-bold text-green-600">{stats.planned}</div>
					<div class="text-sm text-gray-500">Planned</div>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="font-title text-2xl font-bold text-purple-600">{stats.completed}</div>
					<div class="text-sm text-gray-500">Completed</div>
				</div>
			</Card>
		</div>

		<!-- Services list -->
		{#if servicesStore.loading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-gray-500">Loading services...</div>
			</div>
		{:else if servicesStore.services.length === 0}
			<!-- Welcome message -->
			<Card>
				<div class="py-8 text-center">
					<div class="mb-4 text-6xl">📋</div>
					<h3 class="font-title mb-2 text-lg font-medium text-gray-900">
						Plan Your Worship Services
					</h3>
					<p class="mb-6 text-gray-500">
						Create services, track song usage, and collaborate with your team.
					</p>
					{#if auth.canManageServices}
						<Button variant="primary" onclick={openCreateModal}>Create Your First Service</Button>
					{:else}
						<p class="text-sm text-gray-400">
							View services assigned to you by your worship leader.
						</p>
					{/if}
				</div>
			</Card>
		{:else}
			<!-- Services grid -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each servicesStore.services as service (service.id)}
					<Card class="transition-shadow hover:shadow-lg">
						<div class="p-6">
							<div class="flex items-start justify-between">
								<div class="min-w-0 flex-1">
									<h3 class="truncate text-lg font-medium text-gray-900">
										{service.title}
									</h3>
									<p class="mt-1 text-sm text-gray-600">
										{formatDate(service.service_date)}
										{#if service.service_type}
											• {service.service_type}
										{/if}
									</p>
									{#if service.theme}
										<p class="mt-1 text-sm text-gray-500">Theme: {service.theme}</p>
									{/if}
								</div>
								<Badge variant={getStatusVariant(service.status || 'draft')}>
									{service.status || 'draft'}
								</Badge>
							</div>

							{#if service.notes}
								<p class="mt-3 line-clamp-2 text-sm text-gray-600">
									{service.notes}
								</p>
							{/if}

							<div class="mt-4 flex items-center justify-between">
								<div class="text-sm text-gray-500">
									{#if service.estimated_duration}
										{Math.floor(service.estimated_duration / 60)}:{(service.estimated_duration % 60)
											.toString()
											.padStart(2, '0')} estimated
									{/if}
								</div>
								<div class="flex gap-2">
									<Button variant="primary" size="sm" onclick={() => openBuilder(service.id)}>
										Edit
									</Button>
									{#if service.status === 'draft'}
										<Button
											variant="ghost"
											size="sm"
											onclick={async () => {
												await servicesStore.updateService(service.id, { status: 'planned' });
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

<!-- Create service modal -->
<Modal open={showCreateModal} title="Create New Service" onclose={() => (showCreateModal = false)}>
	{#snippet children()}
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleCreateService();
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
					class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
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
					class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
				/>
				{#if createForm.service_date}
					<p class="mt-1 text-xs text-gray-500">Next available Sunday selected automatically</p>
				{/if}
			</div>

			<div>
				<label for="service_type" class="block text-sm font-medium text-gray-700">
					Service Type
				</label>
				<select
					id="service_type"
					bind:value={createForm.service_type}
					class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
				>
					{#each serviceTypes as type (type)}
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
					class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
				/>
			</div>

			<div>
				<label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
				<textarea
					id="notes"
					bind:value={createForm.notes}
					rows="3"
					class="focus:border-primary focus:ring-primary block w-full rounded-md border-gray-300 shadow-sm"
					placeholder="Special instructions or notes..."
				></textarea>
			</div>

			{#if error}
				<div class="text-sm text-red-600">{error}</div>
			{/if}

			<div class="flex justify-end gap-3 pt-4">
				<Button variant="ghost" onclick={() => (showCreateModal = false)}>Cancel</Button>
				<Button type="submit" variant="primary" disabled={loading}>
					{loading ? 'Creating...' : 'Create Service'}
				</Button>
			</div>
		</form>
	{/snippet}
</Modal>
