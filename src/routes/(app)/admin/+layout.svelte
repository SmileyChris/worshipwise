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
					<h1 class="font-title text-2xl font-bold text-gray-900">Admin Dashboard</h1>
					<p class="mt-1 text-sm text-gray-500">Manage users, permissions, and system settings</p>
				</div>
				<div class="flex items-center space-x-2">
					<span
						class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
					>
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
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap {$page.url.pathname ===
					'/admin'
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					Dashboard
				</a>
				<a
					href="/admin/members"
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap {$page.url.pathname.startsWith(
						'/admin/members'
					)
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					Member Management
				</a>
				<a
					href="/admin/settings"
					class="border-b-2 px-1 py-2 text-sm font-medium whitespace-nowrap {$page.url.pathname.startsWith(
						'/admin/settings'
					)
						? 'border-primary text-primary'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
				>
					Church Settings
				</a>
			</nav>
		</div>

		<!-- Page content -->
		{@render children()}
	</div>
{:else if auth.isValid}
	<!-- Not admin - show access denied -->
	<div class="py-12 text-center">
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
			<span class="text-red-600">⚠️</span>
		</div>
		<h2 class="mt-4 text-lg font-medium text-gray-900">Access Denied</h2>
		<p class="mt-2 text-sm text-gray-500">
			You don't have permission to access the admin dashboard.
		</p>
		<div class="mt-6">
			<a
				href="/dashboard"
				class="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
			>
				Return to Dashboard
			</a>
		</div>
	</div>
{:else}
	<!-- Loading -->
	<div class="flex justify-center py-12">
		<div class="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
	</div>
{/if}
