<script lang="ts">
	import { SystemAPI } from '$lib/api/system.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { AlertTriangle, RefreshCw, ExternalLink, Terminal } from 'lucide-svelte';

	let { error, children } = $props();

	let isRetrying = $state(false);
	let showTroubleshooting = $state(false);

	async function handleRetry() {
		isRetrying = true;
		try {
			// Give it a moment then try to reload
			await new Promise((resolve) => setTimeout(resolve, 1000));
			window.location.reload();
		} catch (err) {
			console.error('Retry failed:', err);
		} finally {
			isRetrying = false;
		}
	}

	function handleOpenAdmin() {
		const adminUrl = SystemAPI.getAdminUrl();
		window.open(adminUrl, '_blank');
	}

	function toggleTroubleshooting() {
		showTroubleshooting = !showTroubleshooting;
	}
</script>

{#if error}
	<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
		<div class="w-full max-w-md">
			<Card>
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
					>
						<AlertTriangle class="h-6 w-6 text-red-600" />
					</div>

					<h3 class="mb-2 text-lg font-medium text-gray-900">Connection Error</h3>

					<p class="mb-6 text-gray-600">
						Unable to connect to WorshipWise. This usually means PocketBase isn't running.
					</p>

					<div class="space-y-3">
						<Button onclick={handleRetry} disabled={isRetrying} variant="primary" class="w-full">
							<RefreshCw class="mr-2 h-4 w-4 {isRetrying ? 'animate-spin' : ''}" />
							{isRetrying ? 'Retrying...' : 'Try Again'}
						</Button>

						<Button onclick={toggleTroubleshooting} variant="secondary" class="w-full">
							<Terminal class="mr-2 h-4 w-4" />
							Troubleshooting Help
						</Button>
					</div>
				</div>

				{#if showTroubleshooting}
					<div class="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
						<h4 class="mb-3 font-medium text-gray-900">Troubleshooting Steps:</h4>
						<ol class="space-y-2 text-gray-600">
							<li class="flex items-start">
								<span
									class="mt-0.5 mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
								>
									<span class="text-xs font-semibold text-blue-600">1</span>
								</span>
								Start PocketBase server:
								<code class="ml-1 rounded bg-gray-200 px-1 text-xs">./scripts/start-dev.sh</code>
							</li>
							<li class="flex items-start">
								<span
									class="mt-0.5 mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
								>
									<span class="text-xs font-semibold text-blue-600">2</span>
								</span>
								Check if PocketBase is running on
								<a href="http://localhost:8090" target="_blank" class="text-blue-600 underline">
									localhost:8090
								</a>
							</li>
							<li class="flex items-start">
								<span
									class="mt-0.5 mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
								>
									<span class="text-xs font-semibold text-blue-600">3</span>
								</span>
								If first time setup,
								<button onclick={handleOpenAdmin} class="text-blue-600 underline">
									open admin panel
								</button>
								to create admin account
							</li>
							<li class="flex items-start">
								<span
									class="mt-0.5 mr-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
								>
									<span class="text-xs font-semibold text-blue-600">4</span>
								</span>
								Restart your browser if the issue persists
							</li>
						</ol>

						<div class="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3">
							<p class="text-xs text-yellow-800">
								<strong>Need help?</strong> Check the README.md file for detailed setup instructions.
							</p>
						</div>
					</div>
				{/if}
			</Card>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
