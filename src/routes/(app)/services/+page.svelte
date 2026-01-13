<script lang="ts">
	import { getAuthStore, getServicesStore } from '$lib/context/stores.svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import ServiceCard from '$lib/components/services/ServiceCard.svelte';
	import TeamSelector from '$lib/components/services/TeamSelector.svelte';
	import ServiceCalendar from '$lib/components/services/ServiceCalendar.svelte';
	import type { ServiceTeamSkills } from '$lib/types/service';
	import { onMount } from 'svelte';
	import { Calendar, Layers, CheckCircle, Clock } from 'lucide-svelte';

	const auth = getAuthStore();
	const servicesStore = getServicesStore();

	let showCreateModal = $state(false);
	let viewMode = $state<'grid' | 'calendar'>('grid');

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
			<div class="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
				<button
					class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all {viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (viewMode = 'grid')}
				>
					Grid
				</button>
				<button
					class="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all {viewMode === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}"
					onclick={() => (viewMode = 'calendar')}
				>
					Calendar
				</button>
			</div>

			{#if auth.canManageServices}
				<Button variant="primary" onclick={openCreateModal} class="shadow-lg shadow-primary/20">
					Plan New Service
				</Button>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="rounded-xl bg-red-50 p-4 text-red-800 border border-red-100 italic">
			{error}
		</div>
	{/if}

	<!-- Quick stats -->
	{#if viewMode === 'grid'}
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<Card class="bg-white border-transparent shadow-sm">
				<div class="flex items-center gap-4">
					<div class="bg-gray-100 p-2.5 rounded-xl">
						<Calendar class="h-5 w-5 text-gray-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900 leading-none">{stats.total}</div>
						<div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Total</div>
					</div>
				</div>
			</Card>

			<Card class="bg-white border-transparent shadow-sm">
				<div class="flex items-center gap-4">
					<div class="bg-blue-50 p-2.5 rounded-xl">
						<Layers class="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900 leading-none">{stats.draft}</div>
						<div class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">Drafts</div>
					</div>
				</div>
			</Card>

			<Card class="bg-white border-transparent shadow-sm">
				<div class="flex items-center gap-4">
					<div class="bg-green-50 p-2.5 rounded-xl">
						<Clock class="h-5 w-5 text-green-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900 leading-none">{stats.planned}</div>
						<div class="text-[10px] text-green-400 font-bold uppercase tracking-wider mt-1">Planned</div>
					</div>
				</div>
			</Card>

			<Card class="bg-white border-transparent shadow-sm">
				<div class="flex items-center gap-4">
					<div class="bg-purple-50 p-2.5 rounded-xl">
						<CheckCircle class="h-5 w-5 text-purple-600" />
					</div>
					<div>
						<div class="text-2xl font-bold text-gray-900 leading-none">{stats.completed}</div>
						<div class="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">Done</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}

	<!-- Services list -->
	{#if servicesStore.loading}
		<div class="flex h-64 items-center justify-center">
			<LoadingSpinner message="Loading services..." />
		</div>
	{:else if servicesStore.services.length === 0}
		<Card>
			<EmptyState
				title="No services found"
				message={auth.canManageServices 
					? "Start your first worship plan today."
					: "Contact your leader to get assigned to a service."}
				action={auth.canManageServices ? {
					label: "Plan First Service",
					onclick: openCreateModal
				} : undefined}
			>
				{#snippet icon()}
					<div class="text-6xl">📋</div>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		{#if viewMode === 'calendar'}
			<ServiceCalendar
				services={servicesStore.services}
				loading={servicesStore.loading}
				onServiceClick={(service) => openBuilder(service.id)}
				onDateClick={(date) => {
					createForm.service_date = date.toISOString().split('T')[0];
					openCreateModal();
				}}
			/>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each servicesStore.services as service (service.id)}
					<ServiceCard {service} onclick={() => openBuilder(service.id)} />
				{/each}
			</div>
		{/if}
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
