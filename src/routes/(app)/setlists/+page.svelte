<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
</script>

<svelte:head>
	<title>Setlists - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="md:flex md:items-center md:justify-between">
		<div class="min-w-0 flex-1">
			<h2
				class="text-2xl leading-7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
			>
				Setlists
			</h2>
			<p class="mt-1 text-sm text-gray-500">Plan and manage your worship service setlists</p>
		</div>

		{#if auth.canManageSetlists}
			<div class="mt-4 flex md:mt-0 md:ml-4">
				<Button variant="primary">Create New Setlist</Button>
			</div>
		{/if}
	</div>

	<!-- Welcome message -->
	<Card>
		<div class="py-8 text-center">
			<div class="mb-4 text-6xl">📋</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900">Plan Your Worship Services</h3>
			<p class="mb-6 text-gray-500">
				Create setlists, track song usage, and collaborate with your team.
			</p>
			{#if auth.canManageSetlists}
				<Button variant="primary">Create Your First Setlist</Button>
			{:else}
				<p class="text-sm text-gray-400">View setlists assigned to you by your worship leader.</p>
			{/if}
		</div>
	</Card>

	<!-- Quick stats -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-gray-900">0</div>
				<div class="text-sm text-gray-500">Total Setlists</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-blue-600">0</div>
				<div class="text-sm text-gray-500">Draft</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-green-600">0</div>
				<div class="text-sm text-gray-500">Planned</div>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<div class="text-2xl font-bold text-purple-600">0</div>
				<div class="text-sm text-gray-500">Completed</div>
			</div>
		</Card>
	</div>
</div>
