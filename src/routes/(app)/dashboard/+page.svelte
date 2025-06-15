<script lang="ts">
	import { songsStore } from '$lib/stores/songs.svelte';
	import { quickstartStore } from '$lib/stores/quickstart.svelte';
	import WelcomeCard from '$lib/components/quickstart/WelcomeCard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	const songs = songsStore;
	const quickstart = quickstartStore;

	// Load recent songs for dashboard
	$effect(() => {
		songs.loadSongs();
	});

	// Mock data for demonstration (will be replaced with real analytics in later sprints)
	const mockStats = {
		totalSongs: songs.songs.length,
		recentSongs: 3,
		upcomingSetlists: 2,
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
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0 text-3xl">
					🎵
				</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-gray-900">{mockStats.totalSongs}</div>
					<div class="text-sm text-gray-500">Total Songs</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0 text-3xl">
					🕒
				</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-gray-900">{mockStats.recentSongs}</div>
					<div class="text-sm text-gray-500">Added This Week</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0 text-3xl">
					📈
				</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-gray-900">{mockStats.upcomingSetlists}</div>
					<div class="text-sm text-gray-500">Upcoming Services</div>
				</div>
			</div>
		</Card>

		<Card>
			<div class="flex items-center">
				<div class="flex-shrink-0 text-3xl">
					👥
				</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-gray-900">{mockStats.teamMembers}</div>
					<div class="text-sm text-gray-500">Team Members</div>
				</div>
			</div>
		</Card>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Recent songs -->
		<Card>
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-medium text-gray-900">Recent Songs</h3>
				<a href="/songs" class="text-sm text-blue-600 hover:text-blue-800">View All</a>
			</div>
			
			{#if songs.songs.length > 0}
				<div class="space-y-3">
					{#each songs.songs.slice(0, 5) as song}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
							<div>
								<div class="font-medium text-gray-900">{song.title}</div>
								{#if song.artist}
									<div class="text-sm text-gray-500">{song.artist}</div>
								{/if}
							</div>
							{#if song.key_signature}
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
									{song.key_signature}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-6 text-gray-500">
					<div class="text-4xl mb-4">🎵</div>
					<p>No songs added yet</p>
					<a href="/songs" class="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
						Add Your First Song
					</a>
				</div>
			{/if}
		</Card>

		<!-- Quick actions -->
		<Card>
			<h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
			<div class="space-y-3">
				<a href="/songs" class="flex items-center w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
					<span class="mr-2">🎵</span>
					Manage Songs
				</a>
				
				<a href="/setlists" class="flex items-center w-full px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
					<span class="mr-2">📋</span>
					Plan Setlists
				</a>
				
				<button 
					onclick={() => quickstart.showSetupWizard = true} 
					class="flex items-center w-full px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
				>
					<span class="mr-2">⚙️</span>
					Setup Wizard
				</button>
			</div>
		</Card>
	</div>

	<!-- Getting started tips -->
	{#if songs.songs.length < 5}
		<Card>
			<h3 class="text-lg font-medium text-gray-900 mb-4">Getting Started Tips</h3>
			<div class="space-y-3 text-sm text-gray-600">
				<div class="flex items-start">
					<div class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<span class="text-blue-600 font-semibold text-xs">1</span>
					</div>
					<div>
						<strong>Add your songs:</strong> Start by adding your church's most commonly used worship songs with details like key, tempo, and tags.
					</div>
				</div>
				
				<div class="flex items-start">
					<div class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<span class="text-blue-600 font-semibold text-xs">2</span>
					</div>
					<div>
						<strong>Upload files:</strong> Attach chord charts, sheet music, and audio files to make planning easier.
					</div>
				</div>
				
				<div class="flex items-start">
					<div class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
						<span class="text-blue-600 font-semibold text-xs">3</span>
					</div>
					<div>
						<strong>Plan setlists:</strong> Create setlists for services and track which songs you've used recently.
					</div>
				</div>
			</div>
		</Card>
	{/if}
</div>