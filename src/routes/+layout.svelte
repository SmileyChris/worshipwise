<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { setupStore } from '$lib/stores/setup.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	// Public routes that don't require authentication
	const publicRoutes = ['/login', '/register', '/', '/reset-password', '/reset-password/confirm', '/setup'];

	let isReady = $state(false);
	let currentPath = $state('');

	// Subscribe to page changes
	$effect(() => {
		if (browser) {
			page.subscribe((p) => {
				currentPath = p.url.pathname;
			});
		}
	});

	// Handle setup and authentication check
	$effect(() => {
		if (browser) {
			const isPublicRoute = publicRoutes.includes(currentPath);

			// Check setup requirements first
			if (setupStore.setupRequired === null && !isPublicRoute && currentPath !== '/setup') {
				// Need to check setup status
				setupStore.checkSetupRequired().then((setupRequired) => {
					if (setupRequired) {
						goto('/setup');
					} else if (!auth.isValid && !isPublicRoute) {
						goto('/login');
					} else {
						isReady = true;
					}
				});
			} else if (setupStore.setupRequired === true && currentPath !== '/setup') {
				// Setup is required, redirect to setup
				goto('/setup');
			} else if (setupStore.setupRequired === false) {
				// Setup not required, handle normal auth flow
				if (auth.isValid || isPublicRoute) {
					isReady = true;
				} else if (currentPath && !isPublicRoute) {
					// Redirect to login for protected routes
					goto('/login');
				} else {
					isReady = true;
				}
			} else {
				// Public route or setup page
				isReady = true;
			}
		} else {
			// SSR: assume ready for static generation
			isReady = true;
		}
	});

	// Auto-refresh auth token periodically
	onMount(() => {
		if (auth.isValid) {
			// Refresh auth token every 30 minutes
			const interval = setInterval(
				() => {
					auth.refreshAuth();
				},
				30 * 60 * 1000
			);

			return () => clearInterval(interval);
		}
	});
</script>

<svelte:head>
	<title>WorshipWise</title>
	<meta name="description" content="Smart worship song tracking and planning" />
</svelte:head>

{#if isReady}
	{@render children()}
{:else}
	<!-- Loading state -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
			<p class="mt-2 text-sm text-gray-500">Loading...</p>
		</div>
	</div>
{/if}
