<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { pb } from '$lib/api/client';
	import { isValidMistralAPIKey } from '$lib/api/mistral';
	// Import available environment variables - fallback if not defined
	let PUBLIC_MISTRAL_API_KEY: string | undefined;
	try {
		PUBLIC_MISTRAL_API_KEY = import.meta.env.PUBLIC_MISTRAL_API_KEY;
	} catch {
		PUBLIC_MISTRAL_API_KEY = undefined;
	}
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Settings, Key, AlertCircle, Check, X } from 'lucide-svelte';
	import type { Church } from '$lib/types/church';

	const auth = getAuthStore();

	let church = $state<Church & { mistral_api_key?: string } | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	
	// Form state
	let mistralApiKey = $state('');
	let showApiKey = $state(false);
	let testingApiKey = $state(false);
	let apiKeyValid = $state<boolean | null>(null);
	
	// Check if there's a global API key
	const hasGlobalKey = !!PUBLIC_MISTRAL_API_KEY;

	onMount(() => {
		loadChurch();
	});

	async function loadChurch() {
		loading = true;
		error = null;

		try {
			const churchId = $page.params.id;
			
			// Verify user has admin access to this church
			const membership = auth.churchMemberships.find(m => m.church_id === churchId);
			if (!membership || membership.role !== 'admin') {
				error = 'You do not have permission to access these settings';
				loading = false;
				return;
			}

			// Load church data
			const churchData = await pb.collection('churches').getOne<Church & { mistral_api_key?: string }>(churchId);
			church = churchData;
			mistralApiKey = churchData.mistral_api_key || '';
		} catch (err) {
			console.error('Failed to load church:', err);
			error = err instanceof Error ? err.message : 'Failed to load church settings';
		} finally {
			loading = false;
		}
	}

	async function handleSave() {
		if (!church) return;
		
		saving = true;
		error = null;
		success = null;

		try {
			// Update church with new API key
			await pb.collection('churches').update(church.id, {
				mistral_api_key: mistralApiKey.trim() || null
			});

			success = 'Settings saved successfully';
			
			// Reload to get updated data
			await loadChurch();
		} catch (err) {
			console.error('Failed to save settings:', err);
			error = err instanceof Error ? err.message : 'Failed to save settings';
		} finally {
			saving = false;
		}
	}

	async function testApiKey() {
		if (!mistralApiKey.trim()) return;
		
		testingApiKey = true;
		apiKeyValid = null;
		error = null;

		try {
			// Basic validation
			if (!isValidMistralAPIKey(mistralApiKey)) {
				apiKeyValid = false;
				error = 'Invalid API key format';
				return;
			}

			// Test the API key
			const { createMistralClient } = await import('$lib/api/mistral');
			const client = createMistralClient(mistralApiKey.trim());
			const result = await client.testConnection();
			
			apiKeyValid = result.success;
			if (!result.success) {
				error = result.error || 'API key validation failed';
			}
		} catch (err) {
			apiKeyValid = false;
			error = err instanceof Error ? err.message : 'Failed to test API key';
		} finally {
			testingApiKey = false;
		}
	}

	function clearApiKey() {
		mistralApiKey = '';
		apiKeyValid = null;
	}
</script>

<svelte:head>
	<title>Church Settings - WorshipWise</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-title text-3xl font-bold text-gray-900">Church Settings</h1>
			<p class="text-gray-600">Configure settings for {church?.name || 'your church'}</p>
		</div>
		
		<Button variant="ghost" href="/admin/churches">
			Back to Churches
		</Button>
	</div>

	<!-- Loading State -->
	{#if loading}
		<Card class="py-12 text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-gray-600">Loading settings...</p>
		</Card>
	{/if}

	<!-- Error Display -->
	{#if error && !loading}
		<Card class="border-red-200 bg-red-50">
			<div class="flex items-start">
				<AlertCircle class="mr-2 h-5 w-5 flex-shrink-0 text-red-400" />
				<p class="text-red-800">{error}</p>
			</div>
		</Card>
	{/if}

	<!-- Success Display -->
	{#if success}
		<Card class="border-green-200 bg-green-50">
			<div class="flex items-start">
				<Check class="mr-2 h-5 w-5 flex-shrink-0 text-green-400" />
				<p class="text-green-800">{success}</p>
			</div>
		</Card>
	{/if}

	<!-- Settings Form -->
	{#if church && !loading}
		<Card class="space-y-6">
			<!-- AI Settings Section -->
			<div>
				<div class="flex items-center gap-2 mb-4">
					<Settings class="h-5 w-5 text-gray-500" />
					<h2 class="text-lg font-semibold">AI Features</h2>
				</div>

				<div class="space-y-4">
					<!-- Global Key Status -->
					{#if hasGlobalKey}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
							<div class="flex items-start">
								<Key class="mr-2 h-5 w-5 flex-shrink-0 text-blue-400" />
								<div>
									<p class="text-sm font-medium text-blue-800">Global API Key Active</p>
									<p class="mt-1 text-sm text-blue-700">
										A global Mistral API key is configured. You can override it with a church-specific key below.
									</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- API Key Input -->
					<div>
						<label for="mistral-key" class="mb-2 block text-sm font-medium text-gray-700">
							Mistral API Key
							{#if hasGlobalKey}
								<span class="text-gray-500 font-normal">(Optional - overrides global key)</span>
							{/if}
						</label>
						
						<div class="flex gap-2">
							<div class="relative flex-1">
								<input
									id="mistral-key"
									type={showApiKey ? 'text' : 'password'}
									bind:value={mistralApiKey}
									placeholder={hasGlobalKey ? 'Using global key...' : 'sk-...'}
									class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									disabled={saving || testingApiKey}
								/>
								
								{#if mistralApiKey}
									<button
										type="button"
										onclick={() => showApiKey = !showApiKey}
										class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{#if showApiKey}
											<X class="h-4 w-4" />
										{:else}
											<Key class="h-4 w-4" />
										{/if}
									</button>
								{/if}
							</div>

							{#if mistralApiKey}
								<Button
									variant="outline"
									onclick={testApiKey}
									disabled={testingApiKey || saving}
								>
									{#if testingApiKey}
										Testing...
									{:else}
										Test Key
									{/if}
								</Button>

								<Button
									variant="ghost"
									onclick={clearApiKey}
									disabled={saving || testingApiKey}
								>
									Clear
								</Button>
							{/if}
						</div>

						{#if apiKeyValid !== null}
							<div class="mt-2">
								{#if apiKeyValid}
									<Badge variant="success" class="text-xs">
										<Check class="mr-1 h-3 w-3" />
										Valid API Key
									</Badge>
								{:else}
									<Badge variant="danger" class="text-xs">
										<X class="mr-1 h-3 w-3" />
										Invalid API Key
									</Badge>
								{/if}
							</div>
						{/if}

						<p class="mt-2 text-sm text-gray-500">
							Get your API key from <a href="https://console.mistral.ai/" target="_blank" class="text-blue-600 hover:underline">Mistral AI Console</a>
						</p>
					</div>

					<!-- Features Enabled by API Key -->
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<h3 class="mb-2 text-sm font-medium text-gray-900">Features enabled with Mistral API:</h3>
						<ul class="space-y-1 text-sm text-gray-600">
							<li class="flex items-center">
								<Check class="mr-2 h-4 w-4 text-green-500" />
								AI-powered lyrics analysis for worship insights
							</li>
							<li class="flex items-center">
								<Check class="mr-2 h-4 w-4 text-green-500" />
								Automatic label suggestions based on song themes
							</li>
							<li class="flex items-center">
								<Check class="mr-2 h-4 w-4 text-green-500" />
								Seasonal and service placement recommendations
							</li>
							<li class="flex items-center">
								<Check class="mr-2 h-4 w-4 text-green-500" />
								Biblical reference extraction from lyrics
							</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="flex justify-end border-t pt-4">
				<Button
					variant="primary"
					onclick={handleSave}
					disabled={saving || testingApiKey}
				>
					{#if saving}
						Saving...
					{:else}
						Save Settings
					{/if}
				</Button>
			</div>
		</Card>
	{/if}
</div>