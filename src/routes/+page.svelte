<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	// Redirect authenticated users to dashboard
	onMount(() => {
		if (auth.isValid) {
			goto('/dashboard');
		}
	});
</script>

<svelte:head>
	<title>WorshipWise - Smart Worship Song Tracking</title>
	<meta name="description" content="Smart worship song tracking and planning for churches" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Hero section -->
		<div class="text-center">
			<h1 class="font-title mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
				Welcome to <span class="text-primary ml-4 inline-flex items-baseline gap-4">
					<svg class="size-14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<use href="/logo.svg#svg1" width="24" height="24" />
					</svg>
					WorshipWise</span
				>
			</h1>
			<p class="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
				Smart worship song tracking and planning for churches. Prevent repetition, collaborate with
				your team, and make every service meaningful.
			</p>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button variant="primary" size="lg">
					<a href="/login" class="text-white">Get Started</a>
				</Button>
				<Button variant="secondary" size="lg">
					<a href="/register" class="text-gray-900">Create Account</a>
				</Button>
			</div>
		</div>

		<!-- Features section -->
		<div class="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
			<Card>
				<div class="text-center">
					<div class="mb-4 text-4xl">🎵</div>
					<h3 class="font-title mb-2 text-lg font-semibold text-gray-900">Smart Song Library</h3>
					<p class="text-gray-600">
						Organize your worship songs with metadata, files, and usage tracking.
					</p>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="mb-4 text-4xl">📋</div>
					<h3 class="font-title mb-2 text-lg font-semibold text-gray-900">Service Planning</h3>
					<p class="text-gray-600">
						Create and collaborate on services with real-time updates and team sharing.
					</p>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="mb-4 text-4xl">📊</div>
					<h3 class="font-title mb-2 text-lg font-semibold text-gray-900">Usage Analytics</h3>
					<p class="text-gray-600">
						Track song frequency and prevent repetition with intelligent recommendations.
					</p>
				</div>
			</Card>
		</div>

		<!-- Call to action -->
		<div class="mt-20 text-center">
			<Card class="mx-auto max-w-2xl">
				<h2 class="font-title mb-4 text-2xl font-bold text-gray-900">
					Ready to Transform Your Worship Planning?
				</h2>
				<p class="mb-6 text-gray-600">
					Join churches already using WorshipWise to streamline their worship planning and create
					more meaningful services.
				</p>
				<Button variant="primary" size="lg">
					<a href="/register" class="text-white">Start Free Today</a>
				</Button>
			</Card>
		</div>
	</div>
</div>
