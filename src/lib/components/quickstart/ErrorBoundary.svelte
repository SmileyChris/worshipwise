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
			await new Promise(resolve => setTimeout(resolve, 1000));
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
	<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
		<div class="max-w-md w-full">
			<Card>
				<div class="text-center">
					<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
						<AlertTriangle class="h-6 w-6 text-red-600" />
					</div>
					
					<h3 class="text-lg font-medium text-gray-900 mb-2">
						Connection Error
					</h3>
					
					<p class="text-gray-600 mb-6">
						Unable to connect to WorshipWise. This usually means PocketBase isn't running.
					</p>
					
					<div class="space-y-3">
						<Button onclick={handleRetry} disabled={isRetrying} variant="primary" class="w-full">
							<RefreshCw class="w-4 h-4 mr-2 {isRetrying ? 'animate-spin' : ''}" />
							{isRetrying ? 'Retrying...' : 'Try Again'}
						</Button>
						
						<Button onclick={toggleTroubleshooting} variant="outline" class="w-full">
							<Terminal class="w-4 h-4 mr-2" />
							Troubleshooting Help
						</Button>
					</div>
				</div>
				
				{#if showTroubleshooting}
					<div class="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
						<h4 class="font-medium text-gray-900 mb-3">Troubleshooting Steps:</h4>
						<ol class="space-y-2 text-gray-600">
							<li class="flex items-start">
								<span class="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
									<span class="text-blue-600 font-semibold text-xs">1</span>
								</span>
								Start PocketBase server:
								<code class="ml-1 px-1 bg-gray-200 rounded text-xs">./scripts/start-dev.sh</code>
							</li>
							<li class="flex items-start">
								<span class="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
									<span class="text-blue-600 font-semibold text-xs">2</span>
								</span>
								Check if PocketBase is running on 
								<a href="http://localhost:8090" target="_blank" class="text-blue-600 underline">
									localhost:8090
								</a>
							</li>
							<li class="flex items-start">
								<span class="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
									<span class="text-blue-600 font-semibold text-xs">3</span>
								</span>
								If first time setup, 
								<button onclick={handleOpenAdmin} class="text-blue-600 underline">
									open admin panel
								</button>
								to create admin account
							</li>
							<li class="flex items-start">
								<span class="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
									<span class="text-blue-600 font-semibold text-xs">4</span>
								</span>
								Restart your browser if the issue persists
							</li>
						</ol>
						
						<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
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