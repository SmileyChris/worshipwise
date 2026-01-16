<script lang="ts">
	import { getAuthStore, getServicesStore } from '$lib/context/stores.svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import ServiceCard from '$lib/components/services/ServiceCard.svelte';
	import TeamSelector from '$lib/components/services/TeamSelector.svelte';

	import type { ServiceTeamSkills } from '$lib/types/service';
	import { onMount } from 'svelte';
	import { Calendar, Layers, CheckCircle, Clock } from 'lucide-svelte';

	const auth = getAuthStore();
	const servicesStore = getServicesStore();

	let showCreateModal = $state(false);
	// Form state for creating services
	let createForm = $state({
		title: '',
		service_date: '',
		service_type: 'Sunday Morning' as const,
		theme: '',
		notes: '',
		worship_leader: auth.user?.id || '',
		team_skills: {} as ServiceTeamSkills,
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

	onMount(async () => {
		await servicesStore.loadServices();
		updateDefaultServiceDate();
	});

	function findNextAvailableSunday(): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const services = servicesStore.services;
		const existingDates = new Set(services.map((s) => s.service_date).filter(Boolean));

		let nextSunday = new Date(today);
		const todayDayOfWeek = today.getDay();
		const daysUntilSunday = todayDayOfWeek === 0 ? 0 : 7 - todayDayOfWeek;
		nextSunday.setDate(today.getDate() + daysUntilSunday);

		let attempts = 0;
		const maxAttempts = 52;

		while (attempts < maxAttempts) {
			const year = nextSunday.getFullYear();
			const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
			const day = String(nextSunday.getDate()).padStart(2, '0');
			const dateString = `${year}-${month}-${day}`;

			if (!existingDates.has(dateString)) {
				return dateString;
			}
			nextSunday.setDate(nextSunday.getDate() + 7);
			attempts++;
		}
		return today.toISOString().split('T')[0];
	}

	function updateDefaultServiceDate() {
		if (createForm.service_date === '') {
			createForm.service_date = findNextAvailableSunday();
		}
	}

	$effect(() => {
		if (servicesStore.services.length >= 0) {
			updateDefaultServiceDate();
		}
	});

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
				...createForm,
				status: 'draft'
			});
			resetCreateForm();
			showCreateModal = false;
			goto(`/services/${newService.id}`);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Failed to create service';
		} finally {
			loading = false;
		}
	}

	function openBuilder(serviceId: string) {
		goto(`/services/${serviceId}`);
	}

	function getDateDescription(dateString: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		const today = new Date();
		const diffTime = date.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return '(Today)';
		if (diffDays === 1) return '(Tomorrow)';
		if (diffDays > 0 && diffDays <= 7) return `(In ${diffDays} days)`;
		return '';
	}

	function resetCreateForm() {
		createForm = {
			title: '',
			service_date: findNextAvailableSunday(),
			service_type: 'Sunday Morning',
			theme: '',
			notes: '',
			worship_leader: auth.user?.id || '',
			team_skills: {},
			estimated_duration: 3600
		};
	}

	function openCreateModal() {
		resetCreateForm();
		showCreateModal = true;
	}

	let statusFilter = $state<'all' | 'draft' | 'planned' | 'completed'>('all');

	let filteredServices = $derived(
		statusFilter === 'all'
			? servicesStore.services
			: servicesStore.services.filter((s) => s.status === statusFilter)
	);

	let servicesByMonth = $derived.by(() => {
		const groups: { label: string; services: typeof filteredServices }[] = [];
		let currentGroup: { label: string; services: typeof filteredServices } | null = null;

		// Sort services by date descending first
		const sorted = [...filteredServices].sort(
			(a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
		);

		sorted.forEach((service) => {
			const date = new Date(service.service_date);
			const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

			if (!currentGroup || currentGroup.label !== monthLabel) {
				currentGroup = { label: monthLabel, services: [] };
				groups.push(currentGroup);
			}
			currentGroup.services.push(service);
		});

		return groups;
	});
</script>

<svelte:head>
	<title>Services - WorshipWise</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2 class="font-title text-3xl font-bold text-gray-900">Services</h2>
			<p class="mt-1 text-gray-500">Plan and manage your worship services</p>
		</div>

		<div class="mt-4 flex items-center gap-4 md:mt-0 md:ml-4">
			{#if auth.canManageServices}
				<Button variant="primary" onclick={openCreateModal} class="shadow-primary/20 shadow-lg">
					Plan New Service
				</Button>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-800 italic">
			{error}
		</div>
	{/if}

	<!-- Quick stats -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<!-- Total / All -->
		<button
			class="group w-full cursor-pointer text-left focus:outline-none"
			onclick={() => (statusFilter = 'all')}
		>
			<Card
				class="border-transparent bg-white shadow-sm transition-all duration-300 {statusFilter ===
				'all'
					? 'shadow-md ring-1 ring-gray-400'
					: 'group-hover:shadow-lg group-hover:shadow-gray-200/60'}"
			>
				<div class="flex items-center gap-4">
					<div class="rounded-xl bg-gray-100 p-2.5">
						<Calendar class="h-5 w-5 text-gray-600" />
					</div>
					<div>
						<div class="text-2xl leading-none font-bold text-gray-900">{stats.total}</div>
						<div class="mt-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
							Total
						</div>
					</div>
				</div>
			</Card>
		</button>

		<!-- Drafts -->
		<button
			class="group w-full cursor-pointer text-left focus:outline-none"
			onclick={() => (statusFilter = 'draft')}
		>
			<Card
				class="border-transparent bg-white shadow-sm transition-all duration-300 {statusFilter ===
				'draft'
					? 'shadow-md ring-1 ring-blue-400'
					: 'group-hover:shadow-lg group-hover:shadow-blue-200/60'}"
			>
				<div class="flex items-center gap-4">
					<div class="rounded-xl bg-blue-50 p-2.5">
						<Layers class="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<div class="text-2xl leading-none font-bold text-gray-900">{stats.draft}</div>
						<div class="mt-1 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
							Drafts
						</div>
					</div>
				</div>
			</Card>
		</button>

		<!-- Planned -->
		<button
			class="group w-full cursor-pointer text-left focus:outline-none"
			onclick={() => (statusFilter = 'planned')}
		>
			<Card
				class="border-transparent bg-white shadow-sm transition-all duration-300 {statusFilter ===
				'planned'
					? 'shadow-md ring-1 ring-green-400'
					: 'group-hover:shadow-lg group-hover:shadow-green-200/60'}"
			>
				<div class="flex items-center gap-4">
					<div class="rounded-xl bg-green-50 p-2.5">
						<Clock class="h-5 w-5 text-green-600" />
					</div>
					<div>
						<div class="text-2xl leading-none font-bold text-gray-900">{stats.planned}</div>
						<div class="mt-1 text-[10px] font-bold tracking-wider text-green-400 uppercase">
							Planned
						</div>
					</div>
				</div>
			</Card>
		</button>

		<!-- Completed -->
		<button
			class="group w-full cursor-pointer text-left focus:outline-none"
			onclick={() => (statusFilter = 'completed')}
		>
			<Card
				class="border-transparent bg-white shadow-sm transition-all duration-300 {statusFilter ===
				'completed'
					? 'shadow-md ring-1 ring-purple-400'
					: 'group-hover:shadow-lg group-hover:shadow-purple-200/60'}"
			>
				<div class="flex items-center gap-4">
					<div class="rounded-xl bg-purple-50 p-2.5">
						<CheckCircle class="h-5 w-5 text-purple-600" />
					</div>
					<div>
						<div class="text-2xl leading-none font-bold text-gray-900">{stats.completed}</div>
						<div class="mt-1 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
							Done
						</div>
					</div>
				</div>
			</Card>
		</button>
	</div>

	<!-- Services list -->
	{#if servicesStore.loading}
		<div class="flex h-64 items-center justify-center">
			<LoadingSpinner message="Loading services..." />
		</div>
	{:else if filteredServices.length === 0}
		<Card>
			<EmptyState
				title="No services found"
				message={servicesStore.services.length > 0
					? `No ${statusFilter === 'all' ? '' : statusFilter} services found.`
					: auth.canManageServices
						? 'Start your first worship plan today.'
						: 'Contact your leader to get assigned to a service.'}
				action={auth.canManageServices && servicesStore.services.length === 0
					? {
							label: 'Plan First Service',
							onclick: openCreateModal
						}
					: undefined}
			>
				{#snippet icon()}
					<div class="text-6xl">
						{statusFilter === 'completed'
							? '✅'
							: statusFilter === 'planned'
								? '📅'
								: statusFilter === 'draft'
									? '📝'
									: '📋'}
					</div>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<div class="space-y-8">
			{#each servicesByMonth as group (group.label)}
				<div>
					<h3
						class="sticky top-0 z-10 mb-4 border-b border-gray-100 bg-gray-50/95 py-2 text-lg font-semibold text-gray-900 backdrop-blur"
					>
						{group.label}
					</h3>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each group.services as service (service.id)}
							<ServiceCard {service} onclick={() => openBuilder(service.id)} />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create service modal -->
<Modal open={showCreateModal} title="Create New Service" onclose={() => (showCreateModal = false)}>
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

		<!-- Team assignments -->
		<div class="border-t pt-4">
			<TeamSelector
				teamSkills={createForm.team_skills}
				worshipLeader={createForm.worship_leader}
				onchange={(skills) => (createForm.team_skills = skills)}
			/>
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
</Modal>
