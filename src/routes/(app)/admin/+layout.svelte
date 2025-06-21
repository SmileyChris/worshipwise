<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let { children } = $props();

	// Redirect if not admin
	$effect(() => {
		if (browser && auth.isValid && !auth.isAdmin) {
			goto('/dashboard');
		}
	});
</script>

{#if auth.isAdmin}
	<div class="admin-layout">
		<!-- Admin page header -->
		<div class="mb-6 border-b border-gray-200 pb-4">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold font-title text-gray-900">Admin Dashboard</h1>
					<p class="mt-1 text-sm text-gray-500">
						Manage users, permissions, and system settings
					</p>
				</div>
				<div class="flex items-center space-x-2">
					<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
						Admin Access
					</span>
				</div>
			</div>
		</div>

		<!-- Admin navigation tabs -->
		<div class="mb-6">
			<nav class="flex space-x-8" aria-label="Admin navigation">
				<a
					href="/admin"
					class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {$page.url.pathname === '/admin' 
						? 'border-primary text-primary' 
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
				>
					Dashboard
				</a>
				<a
					href="/admin/users"
					class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm {$page.url.pathname.startsWith('/admin/users')
						? 'border-primary text-primary' 
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
				>
					User Management
				</a>
			</nav>
		</div>

		<!-- Page content -->
		{@render children()}
	</div>
{:else if auth.isValid}
	<!-- Not admin - show access denied -->
	<div class="text-center py-12">
		<div class="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
			<span class="text-red-600">⚠️</span>
		</div>
		<h2 class="mt-4 text-lg font-medium text-gray-900">Access Denied</h2>
		<p class="mt-2 text-sm text-gray-500">
			You don't have permission to access the admin dashboard.
		</p>
		<div class="mt-6">
			<a
				href="/dashboard"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
			>
				Return to Dashboard
			</a>
		</div>
	</div>
{:else}
	<!-- Loading -->
	<div class="flex justify-center py-12">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
	</div>
{/if}