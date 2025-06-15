<script lang="ts">
	import { quickstartStore } from '$lib/stores/quickstart.svelte.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { Check, X, Clock, AlertCircle, ExternalLink } from 'lucide-svelte';

	let { open = $bindable(false) } = $props();

	const store = quickstartStore;
	
	// Modal state management
	let modalOpen = $state(false);
	
	// Sync with parent prop
	$effect(() => {
		modalOpen = open;
	});

	function getStepIcon(status: string) {
		switch (status) {
			case 'completed':
				return Check;
			case 'error':
				return X;
			case 'in_progress':
				return Clock;
			default:
				return AlertCircle;
		}
	}

	function getStepClass(status: string) {
		switch (status) {
			case 'completed':
				return 'text-green-600 bg-green-100';
			case 'error':
				return 'text-red-600 bg-red-100';
			case 'in_progress':
				return 'text-blue-600 bg-blue-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	async function handleExecuteStep() {
		const step = store.currentStep;
		if (!step) return;

		try {
			await store.executeStep(step.id);
			
			// Auto-advance for completed steps
			if (step.status === 'completed') {
				setTimeout(() => {
					store.nextStep();
				}, 1000);
			}
		} catch (error) {
			console.error('Step execution failed:', error);
			// Error is already handled in store
		}
	}

	function handleSkipStep() {
		store.skipStep();
	}

	function handleOpenAdmin() {
		const adminUrl = 'http://localhost:8090/_/';
		window.open(adminUrl, '_blank');
	}

	function handleClose() {
		store.dismissSetupWizard();
	}
</script>

<Modal open={modalOpen} size="lg" onclose={handleClose}>
	<div class="p-6">
		<div class="mb-6">
			<h2 class="text-2xl font-bold text-gray-900 mb-2">
				🎵 Welcome to WorshipWise
			</h2>
			<p class="text-gray-600">
				Let's get your worship song management system set up in just a few steps.
			</p>
		</div>

		<!-- Progress indicator -->
		<div class="mb-8">
			<div class="flex items-center justify-between mb-4">
				<span class="text-sm font-medium text-gray-700">Setup Progress</span>
				<span class="text-sm text-gray-500">
					{store.completedSteps.length} of {store.setupSteps.filter(s => !s.optional).length} complete
				</span>
			</div>
			
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div 
					class="bg-blue-600 h-2 rounded-full transition-all duration-300"
					style="width: {(store.completedSteps.length / store.setupSteps.filter(s => !s.optional).length) * 100}%"
				></div>
			</div>
		</div>

		<!-- Steps list -->
		<div class="space-y-4 mb-8">
			{#each store.setupSteps as step, index}
				{@const StepIcon = getStepIcon(step.status)}
				<div class="flex items-start space-x-3 p-3 rounded-lg border {index === store.currentStepIndex ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}">
					<div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {getStepClass(step.status)}">
						<StepIcon class="w-4 h-4" />
					</div>
					
					<div class="flex-1 min-w-0">
						<div class="flex items-center space-x-2">
							<h3 class="text-sm font-medium text-gray-900">
								{step.title}
							</h3>
							{#if step.optional}
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
									Optional
								</span>
							{/if}
						</div>
						<p class="text-sm text-gray-500 mt-1">
							{step.description}
						</p>
						
						{#if step.status === 'error'}
							<p class="text-sm text-red-600 mt-1">
								⚠️ This step requires attention
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Current step actions -->
		{#if store.currentStep}
			<div class="bg-gray-50 rounded-lg p-4 mb-6">
				<h4 class="font-medium text-gray-900 mb-2">
					Current Step: {store.currentStep.title}
				</h4>
				
				{#if store.currentStep.id === 'health-check'}
					<p class="text-sm text-gray-600 mb-3">
						Checking if PocketBase server is running on localhost:8090...
					</p>
					<Button onclick={handleExecuteStep} disabled={store.isLoading}>
						{store.isLoading ? 'Checking...' : 'Check Connection'}
					</Button>
					
				{:else if store.currentStep.id === 'admin-setup'}
					<p class="text-sm text-gray-600 mb-3">
						You need to create a PocketBase admin account. This will open the admin panel in a new tab.
					</p>
					<div class="flex space-x-2">
						<Button onclick={handleOpenAdmin} variant="primary">
							<ExternalLink class="w-4 h-4 mr-2" />
							Open Admin Panel
						</Button>
						<Button onclick={() => store.nextStep()} variant="secondary">
							I've Created Admin Account
						</Button>
					</div>
					
				{:else if store.currentStep.id === 'collections-check'}
					<p class="text-sm text-gray-600 mb-3">
						Checking if database collections have been created by the admin setup...
					</p>
					<Button onclick={handleExecuteStep} disabled={store.isLoading}>
						{store.isLoading ? 'Checking...' : 'Check Collections'}
					</Button>
					
				{:else if store.currentStep.id === 'user-account'}
					<p class="text-sm text-gray-600 mb-3">
						Now create your worship leader account. You can close this wizard and use the Register link.
					</p>
					<div class="flex space-x-2">
						<Button onclick={handleClose} variant="primary">
							Close & Register Account
						</Button>
						<Button onclick={() => store.nextStep()} variant="secondary">
							I Already Have an Account
						</Button>
					</div>
					
				{:else if store.currentStep.id === 'sample-data'}
					<p class="text-sm text-gray-600 mb-3">
						Import sample songs and setlists to explore WorshipWise features right away.
					</p>
					<div class="flex space-x-2">
						<Button onclick={handleExecuteStep} disabled={store.isLoading}>
							{store.isLoading ? 'Importing...' : 'Import Sample Data'}
						</Button>
						{#if store.currentStep.optional}
							<Button onclick={handleSkipStep} variant="secondary">
								Skip This Step
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Navigation -->
		<div class="flex justify-between">
			<Button 
				onclick={() => store.prevStep()} 
				variant="secondary"
				disabled={store.currentStepIndex === 0}
			>
				Previous
			</Button>
			
			<div class="flex space-x-2">
				{#if store.isSetupComplete}
					<Button onclick={handleClose} variant="primary">
						Complete Setup
					</Button>
				{:else}
					<Button onclick={handleClose} variant="secondary">
						Close Wizard
					</Button>
				{/if}
			</div>
		</div>
	</div>
</Modal>