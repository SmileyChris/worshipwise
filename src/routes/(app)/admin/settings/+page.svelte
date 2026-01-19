<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getAuthStore, getChurchSettingsStore } from '$lib/context/stores.svelte';
	import { env } from '$env/dynamic/public';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Settings, Key, AlertCircle, Check, X, Link, Download } from 'lucide-svelte';

	const auth = getAuthStore();
	const settingsStore = getChurchSettingsStore();

	// Local form state
	let mistralApiKey = $state('');
	let showApiKey = $state(false);
	let elvantoApiKey = $state('');
	let showElvantoKey = $state(false);

	// Cleanup function
	let unsubscribe: (() => void) | null = null;

	// Check if there's a global API key
	const hasGlobalKey = !!env.PUBLIC_MISTRAL_API_KEY;

	onMount(async () => {
		await settingsStore.loadSettings();

		// Initialize local form state from store
		if (settingsStore.church) {
			mistralApiKey = settingsStore.church.mistral_api_key || '';
		}

		unsubscribe = await settingsStore.subscribeToUpdates();
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	async function handleSave() {
		const updateData: any = {
			mistral_api_key: mistralApiKey.trim() || null
		};

		// Only update Elvanto key if user entered something
		if (elvantoApiKey.trim()) {
			updateData.elvanto_api_key = elvantoApiKey.trim();
		}

		await settingsStore.updateSettings(updateData);

		// Clear Elvanto input after save (it's write-only)
		elvantoApiKey = '';
	}

	async function testApiKey() {
		if (!mistralApiKey.trim()) return;
		await settingsStore.testMistralApiKey(mistralApiKey.trim());
	}

	function clearApiKey() {
		mistralApiKey = '';
		settingsStore.clearApiKeyValidation();
	}

	async function handleImport() {
		await settingsStore.importFromElvanto();
	}
</script>

<svelte:head>
	<title>Church Settings - WorshipWise</title>
</svelte:head>

{#if !auth.isAdmin}
	<!-- Not admin - show access denied -->
	<div class="py-12 text-center">
		<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
			<span class="text-red-600">&#9888;&#65039;</span>
		</div>
		<h2 class="mt-4 text-lg font-medium text-gray-900">Access Denied</h2>
		<p class="mt-2 text-sm text-gray-500">Only church administrators can access settings.</p>
		<div class="mt-6">
			<Button href="/dashboard" variant="primary">Return to Dashboard</Button>
		</div>
	</div>
{:else}
	<div class="space-y-6">
		<!-- Loading State -->
		{#if settingsStore.loading}
			<Card class="py-12 text-center">
				<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p class="mt-2 text-gray-600">Loading settings...</p>
			</Card>
		{/if}

		<!-- Error Display -->
		{#if settingsStore.error && !settingsStore.loading}
			<Card class="border-red-200 bg-red-50">
				<div class="flex items-start">
					<AlertCircle class="mr-2 h-5 w-5 flex-shrink-0 text-red-400" />
					<p class="text-red-800">{settingsStore.error}</p>
				</div>
			</Card>
		{/if}

		<!-- Success Display -->
		{#if settingsStore.success}
			<Card class="border-green-200 bg-green-50">
				<div class="flex items-start">
					<Check class="mr-2 h-5 w-5 flex-shrink-0 text-green-400" />
					<p class="text-green-800">{settingsStore.success}</p>
				</div>
			</Card>
		{/if}

		<!-- Settings Form -->
		{#if settingsStore.church && !settingsStore.loading}
			<Card class="space-y-6">
				<!-- AI Settings Section -->
				<div>
					<div class="mb-4 flex items-center gap-2">
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
											A global Mistral API key is configured. You can override it with a
											church-specific key below.
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
									<span class="font-normal text-gray-500">(Optional - overrides global key)</span>
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
										disabled={settingsStore.saving || settingsStore.testingApiKey}
									/>

									{#if mistralApiKey}
										<button
											type="button"
											onclick={() => (showApiKey = !showApiKey)}
											class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
									<Button variant="outline" onclick={testApiKey} disabled={settingsStore.testingApiKey || settingsStore.saving}>
										{#if settingsStore.testingApiKey}
											Testing...
										{:else}
											Test Key
										{/if}
									</Button>

									<Button variant="ghost" onclick={clearApiKey} disabled={settingsStore.saving || settingsStore.testingApiKey}>
										Clear
									</Button>
								{/if}
							</div>

							{#if settingsStore.apiKeyValid !== null}
								<div class="mt-2">
									{#if settingsStore.apiKeyValid}
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
								Get your API key from <a
									href="https://console.mistral.ai/"
									target="__blank"
									class="text-blue-600 hover:underline">Mistral AI Console</a
								>
							</p>
						</div>

						<!-- Features Enabled by API Key -->
						<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<h3 class="mb-2 text-sm font-medium text-gray-900">
								Features enabled with Mistral API:
							</h3>
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

				<div class="border-t pt-6">
					<div class="mb-4 flex items-center gap-2">
						<Link class="h-5 w-5 text-gray-500" />
						<h2 class="text-lg font-semibold">Integrations</h2>
					</div>

					<div class="space-y-4">
						<!-- Elvanto API Key Input -->
						<div>
							<div class="mb-2 flex items-center justify-between">
								<label for="elvanto-key" class="block text-sm font-medium text-gray-700">
									Elvanto API Key
								</label>
								{#if settingsStore.hasElvantoKey}
									<Badge variant="success" class="text-xs">
										<Check class="mr-1 h-3 w-3" />
										Key Configured
									</Badge>
								{/if}
							</div>

							<div class="relative">
								<input
									id="elvanto-key"
									type={showElvantoKey ? 'text' : 'password'}
									bind:value={elvantoApiKey}
									placeholder={settingsStore.hasElvantoKey ? 'Enter new key to update...' : 'Enter your Elvanto API Key'}
									class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
									disabled={settingsStore.saving}
								/>

								{#if elvantoApiKey}
									<button
										type="button"
										onclick={() => (showElvantoKey = !showElvantoKey)}
										class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{#if showElvantoKey}
											<X class="h-4 w-4" />
										{:else}
											<Key class="h-4 w-4" />
										{/if}
									</button>
								{/if}
							</div>
							<p class="mt-2 text-sm text-gray-500">
								Used to import services and songs from Elvanto.
								{#if settingsStore.hasElvantoKey}
									(Leave empty to keep existing key)
								{/if}
							</p>
						</div>

						{#if settingsStore.hasElvantoKey}
							<div class="mt-4 border-t border-gray-200 pt-4">
								<div class="flex items-center justify-between">
									<div>
										<h4 class="text-sm font-medium text-gray-900">Import Data</h4>
										<p class="text-sm text-gray-500">Import services and songs from Elvanto (last 2 years)</p>
									</div>
									<Button variant="outline" onclick={handleImport} disabled={settingsStore.importing || settingsStore.saving}>
										{#if settingsStore.importing}
											Importing...
										{:else}
											<div class="flex items-center">
												<Download class="mr-2 h-4 w-4" />
												Import Now
											</div>
										{/if}
									</Button>
								</div>
								{#if settingsStore.importResult}
									<div class="mt-2 text-sm text-green-600">
										Imported {settingsStore.importResult.importedServices} services, {settingsStore.importResult.importedSongs} songs, and {settingsStore.importResult.importedLeaders} leaders.
									</div>
								{/if}
								{#if settingsStore.church?.last_elvanto_sync}
									 <p class="mt-2 text-xs text-gray-400">
										Last sync: {new Date(settingsStore.church.last_elvanto_sync).toLocaleString()}
									 </p>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Save Button -->
				<div class="flex justify-end border-t pt-4">
					<Button variant="primary" onclick={handleSave} disabled={settingsStore.saving || settingsStore.testingApiKey}>
						{#if settingsStore.saving}
							Saving...
						{:else}
							Save Settings
						{/if}
					</Button>
				</div>
			</Card>
		{/if}
	</div>
{/if}
