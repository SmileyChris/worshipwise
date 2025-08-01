<script lang="ts">
	import { getQuickstartStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { Check, X, Clock, AlertCircle } from 'lucide-svelte';

	let { open = $bindable(false) } = $props();

	const store = getQuickstartStore();

	// Modal state management - derived from prop
	let modalOpen = $derived(open);

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
				return 'text-primary bg-primary/10';
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

	async function handleClose() {
		await store.dismissSetupWizard();
	}
</script>

<Modal
	open={modalOpen}
	size="lg"
	title="🎵 Welcome to WorshipWise"
	subtitle="Your complete worship song management solution."
	onclose={handleClose}
>
	<div class="mb-6">
		<p class="text-gray-600">
			Your WorshipWise system is ready! Let's create your worship account and set up your song
			library.
		</p>
	</div>

	<!-- Progress indicator -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700">Setup Progress</span>
			<span class="text-sm text-gray-500">
				{store.completedRequiredSteps.length} of {store.requiredSteps.length} required steps complete
			</span>
		</div>

		<div class="h-2 w-full rounded-full bg-gray-200">
			<div
				class="bg-primary h-2 rounded-full transition-all duration-300"
				style="width: {(store.completedRequiredSteps.length / store.requiredSteps.length) * 100}%"
			></div>
		</div>
	</div>

	<!-- Steps list -->
	<div class="mb-8 space-y-4">
		{#each store.setupSteps as step, index (index)}
			{@const StepIcon = getStepIcon(step.status)}
			<div
				class="flex items-start space-x-3 rounded-lg border p-3 {index === store.currentStepIndex
					? 'border-primary/20 bg-primary/5'
					: 'border-gray-200'}"
			>
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full {getStepClass(
						step.status
					)}"
				>
					<StepIcon class="h-4 w-4" />
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex items-center space-x-2">
						<h3 class="text-sm font-medium text-gray-900">
							{step.title}
						</h3>
						{#if step.optional}
							<span
								class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
							>
								Optional
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-gray-500">
						{step.description}
					</p>

					{#if step.status === 'error'}
						<p class="mt-1 text-sm text-red-600">⚠️ This step requires attention</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Current step actions -->
	{#if store.currentStep}
		<div class="mb-6 rounded-lg bg-gray-50 p-4">
			<h4 class="mb-2 font-medium text-gray-900">
				Current Step: {store.currentStep.title}
			</h4>

			{#if store.currentStep.id === 'user-account'}
				<p class="mb-3 text-sm text-gray-600">
					Create your first worship leader account to start managing songs and services. You'll use
					this account to log in daily.
				</p>
				<div class="flex space-x-2">
					<Button onclick={handleClose} variant="primary">Create My Account</Button>
					<Button onclick={() => store.nextStep()} variant="secondary">
						I Already Have an Account
					</Button>
				</div>
			{:else if store.currentStep.id === 'default-categories'}
				<p class="mb-3 text-sm text-gray-600">
					Create your church's song categories: Hymns and Te Reo, Contemporary, Seasonal, Christmas
					Songs, Possible New Songs, and Modern (archive list). This helps organize your worship
					songs for easy service planning.
				</p>
				<Button onclick={handleExecuteStep} disabled={store.isLoading}>
					{store.isLoading ? 'Creating Categories...' : 'Create Song Categories'}
				</Button>
			{:else if store.currentStep.id === 'sample-data'}
				<p class="mb-3 text-sm text-gray-600">
					Get started quickly with example songs and services. This shows you how WorshipWise works
					and you can delete the sample content later.
				</p>
				{#if store.hasActiveStep}
					<div class="flex space-x-2">
						<Button onclick={handleExecuteStep} disabled={store.isLoading}>
							{store.isLoading ? 'Adding Demo Content...' : 'Add Demo Content'}
						</Button>
						{#if store.currentStep.optional}
							<Button onclick={handleSkipStep} variant="secondary">Skip Demo Content</Button>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-green-600">✓ Step completed</p>
				{/if}
			{:else if !store.hasActiveStep}
				<p class="text-sm text-green-600">✓ Step completed</p>
			{/if}
		</div>
	{/if}

	<!-- Completion message -->
	{#if store.isSetupComplete}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
			<div class="flex items-center">
				<Check class="mr-3 h-5 w-5 text-green-600" />
				<div>
					<h4 class="font-medium text-green-900">Setup Complete! 🎉</h4>
					<p class="text-sm text-green-700">
						Your WorshipWise system is ready. You can now start managing songs and building
						services.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<div class="flex justify-between">
		<div class="flex space-x-2">
			<Button
				onclick={() => store.prevStep()}
				variant="secondary"
				disabled={store.currentStepIndex === 0}
			>
				Previous
			</Button>
			<Button
				onclick={() => store.nextStep()}
				variant="secondary"
				disabled={store.currentStepIndex >= store.setupSteps.length - 1}
			>
				Next
			</Button>
		</div>

		<div class="flex space-x-2">
			{#if store.isSetupComplete}
				<Button onclick={handleClose} variant="primary">🎉 Start Using WorshipWise</Button>
			{:else}
				<Button onclick={handleClose} variant="secondary">Close Wizard</Button>
			{/if}
		</div>
	</div>
</Modal>
