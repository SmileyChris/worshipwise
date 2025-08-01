<script lang="ts">
	import { getSongsStore, getQuickstartStore } from '$lib/context/stores.svelte';
	import WelcomeCard from '$lib/components/quickstart/WelcomeCard.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { Music, Clock, TrendingUp, Users } from 'lucide-svelte';

	const songs = getSongsStore();
	const quickstart = getQuickstartStore();

	// Load recent songs for dashboard
	$effect(() => {
		songs.loadSongs();
	});

	// Mock data for demonstration (will be replaced with real analytics in later sprints)
	const mockStats = {
		totalSongs: songs.songs.length,
		recentSongs: 3,
		upcomingServices: 2,
		teamMembers: 5
	};
</script>

<svelte:head>
	<title>Dashboard - WorshipWise</title>
</svelte:head>

<!-- Welcome card for new users -->
<WelcomeCard />

<!-- Dashboard content -->
<div class="space-y-6">
	<!-- Stats overview -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<Music class="h-8 w-8 text-blue-600" />
				</div>
				<div class="ml-4">
					<div class="font-title text-2xl font-bold text-gray-900">{mockStats.totalSongs}</div>
					<div class="text-sm text-gray-500">Total Songs</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<Clock class="h-8 w-8 text-green-600" />
				</div>
				<div class="ml-4">
					<div class="font-title text-2xl font-bold text-gray-900">{mockStats.recentSongs}</div>
					<div class="text-sm text-gray-500">Added This Week</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<TrendingUp class="h-8 w-8 text-purple-600" />
				</div>
				<div class="ml-4">
					<div class="font-title text-2xl font-bold text-gray-900">
						{mockStats.upcomingServices}
					</div>
					<div class="text-sm text-gray-500">Upcoming Services</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<Users class="h-8 w-8 text-orange-600" />
				</div>
				<div class="ml-4">
					<div class="font-title text-2xl font-bold text-gray-900">{mockStats.teamMembers}</div>
					<div class="text-sm text-gray-500">Team Members</div>
				</div>
			</div>
		</Card>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Recent songs -->
		<Card>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="font-title text-lg font-medium text-gray-900">Recent Songs</h3>
				<a href="/songs" class="text-primary hover:text-primary/90 text-sm">View All</a>
			</div>

			{#if songs.songs.length > 0}
				<div class="space-y-3">
					{#each songs.songs.slice(0, 5) as song (song.id)}
						<div class="flex items-center justify-between rounded-lg bg-gray-50 p-3">
							<div>
								<div class="font-medium text-gray-900">{song.title}</div>
								{#if song.artist}
									<div class="text-sm text-gray-500">{song.artist}</div>
								{/if}
							</div>
							{#if song.key_signature}
								<span
									class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
								>
									{song.key_signature}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<EmptyState
					title="No songs added yet"
					action={{
						label: "Add Your First Song",
						onclick: () => window.location.href = '/songs'
					}}
					class="py-6"
				>
					{#snippet icon()}
						<Music class="h-12 w-12 text-gray-300" />
					{/snippet}
				</EmptyState>
			{/if}
		</Card>

		<!-- Quick actions -->
		<Card>
			<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Quick Actions</h3>
			<div class="space-y-3">
				<a
					href="/songs"
					class="bg-primary hover:bg-primary/90 flex w-full items-center rounded-md px-4 py-3 text-white"
				>
					<Music class="mr-2 h-4 w-4" />
					Manage Songs
				</a>

				<a
					href="/services"
					class="flex w-full items-center rounded-md border border-gray-300 px-4 py-3 hover:bg-gray-50"
				>
					<Clock class="mr-2 h-4 w-4" />
					Plan Services
				</a>

				{#if !quickstart.isSetupComplete}
					<Button
						onclick={() => (quickstart.showSetupWizard = true)}
						variant="outline"
						size="md"
						fullWidth
						align="left"
					>
						<TrendingUp class="mr-2 h-4 w-4" />
						Setup Wizard
					</Button>
				{:else}
					<!-- Debug: Setup Complete Indicator -->
					<div
						class="flex w-full items-center rounded-md border border-green-200 bg-green-50 px-4 py-3"
					>
						<svg
							class="mr-2 h-4 w-4 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
						<span class="text-sm text-green-800">Setup Complete!</span>
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<!-- Getting started tips -->
	{#if songs.songs.length < 5}
		<Card>
			<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Getting Started Tips</h3>
			<div class="space-y-3 text-sm text-gray-600">
				<div class="flex items-start">
					<div
						class="bg-primary/10 mt-0.5 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-primary text-xs font-semibold">1</span>
					</div>
					<div>
						<strong>Add your songs:</strong> Start by adding your church's most commonly used worship
						songs with details like key, tempo, and tags.
					</div>
				</div>

				<div class="flex items-start">
					<div
						class="bg-primary/10 mt-0.5 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-primary text-xs font-semibold">2</span>
					</div>
					<div>
						<strong>Upload files:</strong> Attach chord charts, sheet music, and audio files to make
						planning easier.
					</div>
				</div>

				<div class="flex items-start">
					<div
						class="bg-primary/10 mt-0.5 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
					>
						<span class="text-primary text-xs font-semibold">3</span>
					</div>
					<div>
						<strong>Plan services:</strong> Create services for worship and track which songs you've
						used recently.
					</div>
				</div>
			</div>
		</Card>
	{/if}
</div>
