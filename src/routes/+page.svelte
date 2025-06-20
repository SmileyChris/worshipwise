<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

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
			<h1 class="mb-6 text-4xl font-bold font-title text-gray-900 md:text-6xl">
				Welcome to <span class="text-blue-600">WorshipWise</span>
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
					<h3 class="mb-2 text-lg font-semibold font-title text-gray-900">Smart Song Library</h3>
					<p class="text-gray-600">
						Organize your worship songs with metadata, files, and usage tracking.
					</p>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="mb-4 text-4xl">📋</div>
					<h3 class="mb-2 text-lg font-semibold font-title text-gray-900">Service Planning</h3>
					<p class="text-gray-600">
						Create and collaborate on services with real-time updates and team sharing.
					</p>
				</div>
			</Card>

			<Card>
				<div class="text-center">
					<div class="mb-4 text-4xl">📊</div>
					<h3 class="mb-2 text-lg font-semibold font-title text-gray-900">Usage Analytics</h3>
					<p class="text-gray-600">
						Track song frequency and prevent repetition with intelligent recommendations.
					</p>
				</div>
			</Card>
		</div>

		<!-- Call to action -->
		<div class="mt-20 text-center">
			<Card class="mx-auto max-w-2xl">
				<h2 class="mb-4 text-2xl font-bold font-title text-gray-900">
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
