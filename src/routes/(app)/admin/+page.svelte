<script lang="ts">
	import { onMount } from 'svelte';
	import { getAdminStats, type AdminStats } from '$lib/api/admin';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let stats = $state<AdminStats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadStats() {
		try {
			loading = true;
			error = null;
			stats = await getAdminStats();
		} catch (err: unknown) {
			console.error('Failed to load admin stats:', err);
			error = err instanceof Error ? err.message : 'Failed to load statistics';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadStats();
	});
</script>

<div class="space-y-6">
	<!-- Overview Stats -->
	{#if loading}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as item, i (i)}
				<Card>
					<div class="animate-pulse">
						<div class="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
						<div class="h-8 w-3/4 rounded bg-gray-200"></div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if error}
		<Card>
			<div class="py-6 text-center">
				<div class="mb-2 text-red-600">⚠️</div>
				<p class="mb-4 text-sm text-gray-500">{error}</p>
				<Button onclick={loadStats} variant="outline" size="sm">Retry</Button>
			</div>
		</Card>
	{:else if stats}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Users -->
			<Card>
				<div class="p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
								<span class="text-primary">👥</span>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Total Users</p>
							<p class="font-title text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- Active Users -->
			<Card>
				<div class="p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
								<span class="text-green-600">✅</span>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Active Users</p>
							<p class="font-title text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- Inactive Users -->
			<Card>
				<div class="p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
								<span class="text-gray-600">⏸️</span>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Inactive Users</p>
							<p class="font-title text-2xl font-semibold text-gray-900">{stats.inactiveUsers}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- New Users (30 days) -->
			<Card>
				<div class="p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
								<span class="text-purple-600">🆕</span>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">New (30 days)</p>
							<p class="font-title text-2xl font-semibold text-gray-900">{stats.recentlyCreated}</p>
						</div>
					</div>
				</div>
			</Card>
		</div>

		<!-- Role Distribution -->
		<Card>
			<div class="p-6">
				<h3 class="font-title mb-4 text-lg font-medium text-gray-900">User Roles</h3>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="rounded-lg bg-red-50 p-4">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<span class="text-2xl">⚙️</span>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-red-900">Administrators</p>
								<p class="font-title text-2xl font-semibold text-red-700">
									{stats.usersByRole.admin}
								</p>
							</div>
						</div>
					</div>

					<div class="rounded-lg bg-yellow-50 p-4">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<span class="text-2xl">👨‍💼</span>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-yellow-900">Leaders</p>
								<p class="font-title text-2xl font-semibold text-yellow-700">
									{stats.usersByRole.leader}
								</p>
							</div>
						</div>
					</div>

					<div class="bg-primary/5 rounded-lg p-4">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<span class="text-2xl">🎵</span>
							</div>
							<div class="ml-3">
								<p class="text-primary/90 text-sm font-medium"></p>
								<p class="font-title text-primary/80 text-2xl font-semibold">
									{stats.usersByRole.musician}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Card>

		<!-- Quick Actions -->
		<Card>
			<div class="p-6">
				<h3 class="font-title mb-4 text-lg font-medium text-gray-900">Quick Actions</h3>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Button href="/admin/users" variant="outline" class="justify-start">
						<span class="mr-2">👥</span>
						Manage Users
					</Button>

					<Button onclick={() => loadStats()} variant="outline" class="justify-start">
						<span class="mr-2">🔄</span>
						Refresh Stats
					</Button>

					<Button href="/analytics" variant="outline" class="justify-start">
						<span class="mr-2">📊</span>
						View Analytics
					</Button>
				</div>
			</div>
		</Card>
	{/if}
</div>
