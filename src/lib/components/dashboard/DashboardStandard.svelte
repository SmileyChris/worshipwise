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
			<Button variant="outline" size="sm" onclick={() => (window.location.href = '/songs')}>
				<Search class="mr-2 h-4 w-4" />
				Find Songs
			</Button>
			<Button variant="primary" size="sm" onclick={() => (window.location.href = '/services')}>
				<PlusCircle class="mr-2 h-4 w-4" />
				Plan Service
			</Button>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="bg-gradient-to-br from-blue-50 to-white border-blue-100">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-blue-600">Total Songs</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">{analyticsStore.overview?.totalSongs || songsStore.totalItems}</h4>
				</div>
				<div class="bg-blue-100 p-3 rounded-xl">
					<Music class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</Card>

		<Card class="bg-gradient-to-br from-amber-50 to-white border-amber-100">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-amber-600">Upcoming Services</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">{servicesStore.upcomingServices.length}</h4>
				</div>
				<div class="bg-amber-100 p-3 rounded-xl">
					<Calendar class="h-6 w-6 text-amber-600" />
				</div>
			</div>
		</Card>

		<Card class="bg-gradient-to-br from-green-50 to-white border-green-100">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-green-600">Total Usages</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">{analyticsStore.overview?.totalUsages || 0}</h4>
				</div>
				<div class="bg-green-100 p-3 rounded-xl">
					<TrendingUp class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</Card>

		<Card class="bg-gradient-to-br from-purple-50 to-white border-purple-100">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-purple-600">Worship Leaders</p>
					<h4 class="font-title text-2xl font-bold text-gray-900">{analyticsStore.overview?.activeWorshipLeaders || 1}</h4>
				</div>
				<div class="bg-purple-100 p-3 rounded-xl">
					<Users class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</Card>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Left: Upcoming and Trends -->
		<div class="lg:col-span-2 space-y-8">
			<!-- Upcoming Services -->
			<section>
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-title text-xl font-bold text-gray-900 flex items-center gap-2">
						<Calendar class="h-5 w-5 text-primary" />
						Upcoming Services
					</h3>
					<a href="/services" class="text-primary hover:underline text-sm font-medium">View All Services</a>
				</div>

				{#if servicesStore.upcomingServices.length > 0}
					<div class="grid grid-cols-1 gap-4">
						{#each servicesStore.upcomingServices as service}
							<ServiceCard {service} onclick={() => (window.location.href = `/services/${service.id}`)} />
						{/each}
					</div>
				{:else}
					<Card>
						<EmptyState 
							title="No upcoming services" 
							message="Start planning your next worship service." 
							action={{ label: 'Plan a Service', onclick: () => (window.location.href = '/services') }}
						/>
					</Card>
				{/if}
			</section>

			<!-- Usage Trend Chart -->
			<section>
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-title text-xl font-bold text-gray-900 flex items-center gap-2">
						<TrendingUp class="h-5 w-5 text-primary" />
						Song Usage Trend
					</h3>
				</div>
				<Card>
					<div class="h-64">
						{#if analyticsStore.usageTrends.length > 0}
							<UsageTrendChart data={analyticsStore.usageTrends} interval="week" />
						{:else}
							<div class="h-full flex flex-col items-center justify-center text-gray-400">
								<TrendingUp class="h-8 w-8 mb-2 opacity-50" />
								<p class="font-medium">No usage trends yet</p>
								<p class="text-xs mt-1">Complete services to track song usage over time</p>
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
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-title text-xl font-bold text-gray-900 flex items-center gap-2">
						<Music class="h-5 w-5 text-primary" />
						Recent Songs
					</h3>
				</div>
				<Card padding={false} class="overflow-hidden">
					<div class="divide-y divide-gray-100">
						{#each songsStore.songs.slice(0, 6) as song}
							<button 
								class="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between group transition-colors" 
								onclick={() => (window.location.href = `/songs/${song.id}`)}
							>
								<div class="min-w-0">
									<p class="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{song.title}</p>
									<p class="text-xs text-gray-500 truncate">{song.artist || 'Unknown Artist'}</p>
								</div>
								{#if song.key_signature}
									<span class="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg">
										{song.key_signature}
									</span>
								{/if}
							</button>
						{/each}
						
						{#if songsStore.songs.length === 0}
							<div class="p-8 text-center text-gray-500">
								No songs added yet.
							</div>
						{/if}
					</div>
					<div class="p-3 bg-gray-50 border-t border-gray-100 text-center">
						<a href="/songs" class="text-xs text-primary font-bold uppercase tracking-widest hover:underline">View Library</a>
					</div>
				</Card>
			</section>

			<!-- Quick Actions -->
			<section>
				<h3 class="font-title text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
				<div class="grid grid-cols-2 gap-3">
					<button onclick={() => (window.location.href = '/songs?new=1')} class="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
						<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
							<Music class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">Add Song</span>
					</button>
					<button onclick={() => (window.location.href = '/services')} class="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
						<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
							<PlusCircle class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">New Service</span>
					</button>
					<button onclick={() => (window.location.href = '/analytics')} class="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
						<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
							<TrendingUp class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">Analytics</span>
					</button>
					<button onclick={() => (window.location.href = '/profile')} class="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
						<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
							<Users class="h-5 w-5" />
						</div>
						<span class="text-sm font-medium text-gray-700">My Profile</span>
					</button>
				</div>
			</section>
		</div>
	</div>
</div>
