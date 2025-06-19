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
	<div class="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
		<div class="flex items-start">
			<div class="flex-shrink-0">
				<AlertCircle class="h-5 w-5 text-yellow-400" />
			</div>
			<div class="ml-3 flex-1">
				<h3 class="text-sm font-medium text-yellow-800">System Setup Required</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>Your WorshipWise system needs some initial setup to get started.</p>
				</div>
				<div class="mt-3 flex space-x-2">
					<Button onclick={handleOpenSetupWizard} size="sm" variant="primary">
						<Settings class="mr-2 h-4 w-4" />
						Run Setup Wizard
					</Button>
					<Button onclick={handleRefreshStatus} size="sm" variant="secondary">
						<RefreshCw class="mr-2 h-4 w-4" />
						Refresh Status
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Debug info in development -->
{#if import.meta.env.DEV}
	<details class="mb-4">
		<summary class="cursor-pointer text-xs text-gray-500">System Status Debug</summary>
		<pre class="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(
				store.systemStatus,
				null,
				2
			)}</pre>
	</details>
{/if}
