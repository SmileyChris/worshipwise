<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { Music, Calendar, TrendingUp, Users, PlusCircle, Search } from 'lucide-svelte';
	import {
		getSongsStore,
		getServicesStore,
		getAnalyticsStore,
		getAuthStore
	} from '$lib/context/stores.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import UsageTrendChart from '$lib/components/analytics/UsageTrendChart.svelte';
	import ServiceCard from '$lib/components/services/ServiceCard.svelte';

	const songsStore = getSongsStore();
	const servicesStore = getServicesStore();
	const analyticsStore = getAnalyticsStore();
	const auth = getAuthStore();

	onMount(async () => {
		// Load all data needed for dashboard
		await Promise.all([
			songsStore.loadSongs(),
			servicesStore.loadUpcomingServices(3),
			analyticsStore.loadOverview(),
			analyticsStore.loadUsageTrends()
		]);
	});

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}
</script>

<div class="space-y-8">
	<!-- Welcome Header -->
	<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
		<div>
			<h2 class="font-title text-3xl font-bold text-gray-900">Welcome, {auth.displayName}! 👋</h2>
			<p class="text-gray-500">Here's what's happening at {auth.currentChurch?.name}.</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" size="sm" onclick={() => goto('/songs')}>
				<Search class="mr-2 h-4 w-4" />
				Find Songs
			</Button>
			<Button variant="primary" size="sm" onclick={() => goto('/services?new=1')}>
				<PlusCircle class="mr-2 h-4 w-4" />
				Plan Service
			</Button>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-blue-600">Total Songs</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">
						{analyticsStore.overview?.totalSongs || songsStore.totalItems}
					</h4>
				</div>
				<div class="rounded-xl bg-blue-100 p-3">
					<Music class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</Card>

		<Card class="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-amber-600">Upcoming Services</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">
						{servicesStore.upcomingServices.length}
					</h4>
				</div>
				<div class="rounded-xl bg-amber-100 p-3">
					<Calendar class="h-6 w-6 text-amber-600" />
				</div>
			</div>
		</Card>

		<Card class="border-green-100 bg-gradient-to-br from-green-50 to-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-green-600">Songs Sung</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">
						{analyticsStore.overview?.totalUsages || 0}
					</h4>
				</div>
				<div class="rounded-xl bg-green-100 p-3">
					<TrendingUp class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</Card>

		<Card class="border-purple-100 bg-gradient-to-br from-purple-50 to-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-purple-600">Worship Leaders</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">
						{analyticsStore.overview?.activeWorshipLeaders || 1}
					</h4>
				</div>
				<div class="rounded-xl bg-purple-100 p-3">
					<Users class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</Card>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left: Upcoming and Trends -->
		<div class="space-y-8 lg:col-span-2">
			<!-- Upcoming Services -->
			<section>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-title flex items-center gap-2 text-xl font-bold text-gray-900">
						<Calendar class="text-primary h-5 w-5" />
						Upcoming Services
					</h3>
					<a href="/services" class="text-primary text-sm font-medium hover:underline"
						>View All Services</a
					>
				</div>

				{#if servicesStore.upcomingServices.length > 0}
					<div class="grid grid-cols-1 gap-4">
						{#each servicesStore.upcomingServices as service}
							<ServiceCard {service} onclick={() => goto(`/services/${service.id}`)} />
						{/each}
					</div>
				{:else}
					<Card>
						<EmptyState
							title="No upcoming services"
							message="Start planning your next worship service."
							action={{
								label: 'Plan a Service',
								onclick: () => goto('/services?new=1')
							}}
						/>
					</Card>
				{/if}
			</section>

			<!-- Usage Trend Chart -->
			<section>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-title flex items-center gap-2 text-xl font-bold text-gray-900">
						<TrendingUp class="text-primary h-5 w-5" />
						Song Usage Trend
					</h3>
				</div>
				<Card>
					<div class="h-64">
						{#if analyticsStore.usageTrends.length > 0}
							<UsageTrendChart data={analyticsStore.usageTrends} interval="week" />
						{:else}
							<div class="flex h-full flex-col items-center justify-center text-gray-400">
								<TrendingUp class="mb-2 h-8 w-8 opacity-50" />
								<p class="font-medium">No usage trends yet</p>
								<p class="mt-1 text-xs">Complete services to track song usage over time</p>
							</div>
						{/if}
					</div>
				</Card>
			</section>
		</div>

		<!-- Right: Recent Songs and Quick Actions -->
		<div class="space-y-8">
			<!-- Recent Songs -->
			<section>
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-title flex items-center gap-2 text-xl font-bold text-gray-900">
						<Music class="text-primary h-5 w-5" />
						Recent Songs
					</h3>
				</div>
				<Card padding={false} class="overflow-hidden">
					<div class="divide-y divide-gray-100">
						{#each songsStore.songs.slice(0, 6) as song}
							<a
								href="/songs/{song.id}"
								class="group block flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
							>
								<div class="min-w-0">
									<p
										class="group-hover:text-primary truncate font-bold text-gray-900 transition-colors"
									>
										{song.title}
									</p>
									<p class="truncate text-xs text-gray-500">{song.artist || 'Unknown Artist'}</p>
								</div>
								{#if song.key_signature}
									<span
										class="text-primary bg-primary/5 border-primary/10 rounded-lg border px-2 py-1 text-xs font-bold"
									>
										{song.key_signature}
									</span>
								{/if}
							</a>
						{/each}

						{#if songsStore.songs.length === 0}
							<div class="p-8 text-center text-gray-500">No songs added yet.</div>
						{/if}
					</div>
					<div class="border-t border-gray-100 bg-gray-50 p-3 text-center">
						<a
							href="/songs"
							class="text-primary text-xs font-bold tracking-widest uppercase hover:underline"
							>View Library</a
						>
					</div>
				</Card>
			</section>

			<!-- Quick Actions -->
			<section>
				<h3 class="font-title mb-4 text-lg font-bold text-gray-900">Quick Actions</h3>
				<div class="grid grid-cols-2 gap-3">
					<button
						onclick={() => goto('/songs?new=1')}
						class="hover:border-primary hover:bg-primary/5 group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 transition-all"
					>
						<div
							class="group-hover:bg-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:text-white"
						>
							<Music class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">Add Song</span>
					</button>
					<button
						onclick={() => goto('/services?new=1')}
						class="hover:border-primary hover:bg-primary/5 group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 transition-all"
					>
						<div
							class="group-hover:bg-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 transition-colors group-hover:text-white"
						>
							<PlusCircle class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">New Service</span>
					</button>
					<button
						onclick={() => goto('/analytics')}
						class="hover:border-primary hover:bg-primary/5 group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 transition-all"
					>
						<div
							class="group-hover:bg-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 transition-colors group-hover:text-white"
						>
							<TrendingUp class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">Analytics</span>
					</button>
					<button
						onclick={() => goto('/profile')}
						class="hover:border-primary hover:bg-primary/5 group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 transition-all"
					>
						<div
							class="group-hover:bg-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 transition-colors group-hover:text-white"
						>
							<Users class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">My Profile</span>
					</button>
				</div>
			</section>
		</div>
	</div>
</div>
