<script lang="ts">
	import { quickstartStore } from '$lib/stores/quickstart.svelte.js';
	import Button from '$lib/components/ui/Button.svelte';
	import { AlertCircle, CheckCircle, RefreshCw, Settings } from 'lucide-svelte';

	const store = quickstartStore;

	async function handleRefreshStatus() {
		await store.checkSystemStatus();
	}

	function handleOpenSetupWizard() {
		store.showSetupWizard = true;
	}
</script>

{#if store.systemStatus.needsSetup}
	<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
		<div class="flex items-start">
			<div class="flex-shrink-0">
				<AlertCircle class="h-5 w-5 text-yellow-400" />
			</div>
			<div class="ml-3 flex-1">
				<h3 class="text-sm font-medium text-yellow-800">
					System Setup Required
				</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>Your WorshipWise system needs some initial setup to get started.</p>
				</div>
				<div class="mt-3 flex space-x-2">
					<Button onclick={handleOpenSetupWizard} size="sm" variant="primary">
						<Settings class="w-4 h-4 mr-2" />
						Run Setup Wizard
					</Button>
					<Button onclick={handleRefreshStatus} size="sm" variant="secondary">
						<RefreshCw class="w-4 h-4 mr-2" />
						Refresh Status
					</Button>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<CheckCircle class="h-5 w-5 text-green-400" />
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-green-800">
					System Ready
				</h3>
				<p class="mt-1 text-sm text-green-700">
					WorshipWise is fully set up and ready to use.
				</p>
			</div>
			<div class="ml-auto">
				<Button onclick={handleRefreshStatus} size="sm" variant="secondary">
					<RefreshCw class="w-4 h-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Debug info in development -->
{#if import.meta.env.DEV}
	<details class="mb-4">
		<summary class="text-xs text-gray-500 cursor-pointer">System Status Debug</summary>
		<pre class="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">{JSON.stringify(store.systemStatus, null, 2)}</pre>
	</details>
{/if}