<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ChurchesAPI } from '$lib/api/churches';
	import { setupStore } from '$lib/stores/setup.svelte';
	import type { InitialChurchSetup } from '$lib/types/church';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { Clock } from 'lucide-svelte';

	let loading = $state<boolean>(false);
	let error = $state<string | null>(null);
	let step = $state<number>(1);

	// Element references
	let adminNameInput: Input;

	// Form data
	let setupData = $state<InitialChurchSetup>({
		churchName: '',
		adminName: '',
		adminEmail: '',
		password: '',
		confirmPassword: '',
		timezone: '',
		country: '',
		address: '',
		city: '',
		state: ''
	});

	// Timezone options (most common ones)
	const timezoneOptions = [
		{ value: 'Pacific/Auckland', label: 'Auckland, New Zealand (NZST)' },
		{ value: 'Australia/Sydney', label: 'Sydney, Australia (AEST)' },
		{ value: 'Australia/Melbourne', label: 'Melbourne, Australia (AEST)' },
		{ value: 'Australia/Brisbane', label: 'Brisbane, Australia (AEST)' },
		{ value: 'Australia/Perth', label: 'Perth, Australia (AWST)' },
		{ value: 'America/New_York', label: 'New York, USA (EST)' },
		{ value: 'America/Chicago', label: 'Chicago, USA (CST)' },
		{ value: 'America/Denver', label: 'Denver, USA (MST)' },
		{ value: 'America/Los_Angeles', label: 'Los Angeles, USA (PST)' },
		{ value: 'America/Toronto', label: 'Toronto, Canada (EST)' },
		{ value: 'America/Vancouver', label: 'Vancouver, Canada (PST)' },
		{ value: 'Europe/London', label: 'London, UK (GMT)' },
		{ value: 'Europe/Paris', label: 'Paris, France (CET)' },
		{ value: 'Europe/Berlin', label: 'Berlin, Germany (CET)' },
		{ value: 'Europe/Rome', label: 'Rome, Italy (CET)' },
		{ value: 'Asia/Tokyo', label: 'Tokyo, Japan (JST)' },
		{ value: 'Asia/Seoul', label: 'Seoul, South Korea (KST)' },
		{ value: 'Asia/Singapore', label: 'Singapore (SGT)' },
		{ value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
		{ value: 'Africa/Johannesburg', label: 'Johannesburg, South Africa (SAST)' },
		{ value: 'America/Sao_Paulo', label: 'São Paulo, Brazil (BRT)' },
		{ value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
	];

	onMount(() => {
		// Try to detect user's timezone
		try {
			const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const matchingOption = timezoneOptions.find((opt) => opt.value === userTimezone);
			if (matchingOption) {
				setupData.timezone = userTimezone;
			} else {
				setupData.timezone = 'UTC';
			}
		} catch {
			setupData.timezone = 'UTC';
		}
	});

	function validateStep1(): boolean {
		if (!setupData.churchName.trim()) {
			error = 'Church name is required';
			return false;
		}
		if (!setupData.timezone) {
			error = 'Please select your timezone';
			return false;
		}
		error = null;
		return true;
	}

	function validateStep2(): boolean {
		if (!setupData.adminName.trim()) {
			error = 'Admin name is required';
			return false;
		}
		if (!setupData.adminEmail.trim()) {
			error = 'Admin email is required';
			return false;
		}
		if (!setupData.password) {
			error = 'Password is required';
			return false;
		}
		if (setupData.password.length < 6) {
			error = 'Password must be at least 6 characters';
			return false;
		}
		if (setupData.password !== setupData.confirmPassword) {
			error = 'Passwords do not match';
			return false;
		}
		error = null;
		return true;
	}

	function nextStep() {
		if (step === 1 && validateStep1()) {
			step = 2;
			// Focus on admin name input after step transition
			setTimeout(() => {
				adminNameInput?.focus();
			}, 0);
		}
	}

	function prevStep() {
		if (step > 1) {
			step--;
			error = null;
		}
	}

	async function handleSetup() {
		if (!validateStep2()) return;

		loading = true;
		error = null;

		try {
			const result = await ChurchesAPI.initialSetup(setupData);
			console.log('Setup successful:', result);

			// Mark setup as completed in the store
			setupStore.markSetupCompleted();

			// Redirect to dashboard
			await goto('/dashboard');
		} catch (err: unknown) {
			console.error('Setup failed:', err);
			error = err instanceof Error ? err.message : 'Setup failed. Please try again.';
		} finally {
			loading = false;
		}
	}

	function getSelectedTimezoneLabel(): string {
		const option = timezoneOptions.find((opt) => opt.value === setupData.timezone);
		return option?.label || setupData.timezone;
	}

	// Check for hemisphere indicator
	const isNorthernHemisphere = $derived(
		!setupData.timezone.startsWith('Australia/') &&
			!setupData.timezone.startsWith('Pacific/Auckland') &&
			!setupData.timezone.startsWith('Pacific/Wellington') &&
			!setupData.timezone.startsWith('Africa/Johannesburg') &&
			!setupData.timezone.startsWith('America/Sao_Paulo') &&
			!setupData.timezone.startsWith('America/Argentina')
	);

	// Check if step 1 is valid for enabling next button
	const isStep1Valid = $derived(
		setupData.churchName.trim().length > 0 && setupData.timezone.length > 0
	);

	// Check if step 2 is valid for enabling submit button
	const isStep2Valid = $derived(
		setupData.adminName.trim().length > 0 &&
			setupData.adminEmail.trim().length > 0 &&
			setupData.password.length >= 6 &&
			setupData.password === setupData.confirmPassword
	);

	// Function to handle Enter key on step 2 fields
	function handleStep2Enter() {
		handleSetup(); // Always call handleSetup, let it handle validation
	}
</script>

<svelte:head>
	<title>Welcome to WorshipWise - Initial Setup</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
>
	<div class="w-full max-w-lg">
		<!-- Header -->
		<div class="mb-8 text-center">
			<div class="mb-4 flex items-center justify-center gap-3">
				<img src="/logo.svg" alt="WorshipWise" class="h-12 w-12" />
				<h1 class="font-title text-3xl font-bold text-gray-900">WorshipWise</h1>
			</div>
			<p class="text-gray-600">Welcome! Let's set up your church's worship management system.</p>
		</div>

		<!-- Progress indicator -->
		<div class="mb-8 flex items-center justify-center">
			<div class="flex items-center space-x-4">
				<div
					class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
						step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
					}`}
				>
					1
				</div>
				<div class={`h-1 w-16 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
				<div
					class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
						step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
					}`}
				>
					2
				</div>
			</div>
		</div>

		<Card class="p-8">
			{#if error}
				<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
					{error}
				</div>
			{/if}

			{#if step === 1}
				<!-- Step 1: Church Information -->
				<div class="space-y-6">
					<div class="mb-6 text-center">
						<h2 class="font-title text-xl font-semibold text-gray-900">Church Information</h2>
						<p class="mt-1 text-sm text-gray-600">Tell us about your church</p>
					</div>

					<div class="space-y-4">
						<Input
							label="Church Name"
							name="churchName"
							bind:value={setupData.churchName}
							placeholder="e.g., Grace Community Church"
							required
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									nextStep();
								}
							}}
						/>

						<div>
							<label for="timezone-select" class="mb-2 block text-sm font-medium text-gray-700">
								<Clock class="mr-1 inline h-4 w-4" />
								Timezone
							</label>
							<select
								id="timezone-select"
								bind:value={setupData.timezone}
								class="focus:ring-primary w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:outline-none"
								required
							>
								<option value="">Select your timezone...</option>
								{#each timezoneOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{#if setupData.timezone}
								<p class="mt-1 text-xs text-gray-500">
									🌍 {isNorthernHemisphere ? 'Northern' : 'Southern'} Hemisphere • Seasonal themes will
									be adjusted accordingly
								</p>
							{/if}
						</div>
					</div>

					<div class="flex justify-end">
						<Button onclick={nextStep} disabled={!isStep1Valid}>Next Step</Button>
					</div>
				</div>
			{:else if step === 2}
				<!-- Step 2: Admin Account -->
				<div class="space-y-6">
					<div class="mb-6 text-center">
						<h2 class="font-title text-xl font-semibold text-gray-900">Admin Account</h2>
						<p class="mt-1 text-sm text-gray-600">Create your administrator account</p>
					</div>

					<div class="space-y-4">
						<Input
							bind:this={adminNameInput}
							label="Full Name"
							name="adminName"
							bind:value={setupData.adminName}
							placeholder="John Smith"
							required
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleStep2Enter();
								}
							}}
						/>

						<Input
							label="Email Address"
							type="email"
							name="adminEmail"
							bind:value={setupData.adminEmail}
							placeholder="pastor@yourchurch.com"
							required
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleStep2Enter();
								}
							}}
						/>

						<Input
							label="Password"
							type="password"
							name="password"
							bind:value={setupData.password}
							placeholder="Choose a secure password"
							required
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleStep2Enter();
								}
							}}
						/>

						<Input
							label="Confirm Password"
							type="password"
							name="confirmPassword"
							bind:value={setupData.confirmPassword}
							placeholder="Confirm your password"
							required
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									handleStep2Enter();
								}
							}}
						/>
					</div>

					<!-- Summary -->
					<div class="rounded-lg bg-gray-50 p-4">
						<h3 class="mb-2 font-medium text-gray-900">Setup Summary</h3>
						<div class="space-y-1 text-sm text-gray-600">
							<p><strong>Church:</strong> {setupData.churchName}</p>
							<p><strong>Timezone:</strong> {getSelectedTimezoneLabel()}</p>
							<p><strong>Admin:</strong> {setupData.adminName} ({setupData.adminEmail})</p>
						</div>
					</div>

					<div class="flex justify-between">
						<Button variant="secondary" onclick={prevStep}>Back</Button>
						<Button onclick={handleSetup} {loading} disabled={loading}>
							{loading ? 'Setting up...' : 'Complete Setup'}
						</Button>
					</div>
				</div>
			{/if}
		</Card>

		<div class="mt-6 text-center text-sm text-gray-500">
			<p>Setting up WorshipWise for the first time</p>
		</div>
	</div>
</div>
