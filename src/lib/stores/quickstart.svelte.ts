import { categoriesApi } from '$lib/api/categories.js';
import { pb } from '$lib/api/client.js';
import { createSongsAPI } from '$lib/api/songs.js';
import { createSystemAPI } from '$lib/api/system.js';
import { createDefaultCategories, importSampleData } from '$lib/data/sample-data.js';
import type { SetupStep, SystemStatus } from '$lib/types/quickstart.js';

class QuickstartStore {
	systemStatus = $state<SystemStatus>({
		pocketbaseRunning: false,
		adminExists: false,
		usersExist: false,
		songsExist: false,
		categoriesExist: false,
		collectionsExist: false,
		needsSetup: true
	});

	setupSteps = $state<SetupStep[]>([
		{
			id: 'user-account',
			title: 'First Worship Account',
			description: 'Create your personal account to start managing songs',
			status: 'pending'
		},
		{
			id: 'default-categories',
			title: 'Song Categories',
			description: "Set up your church's song categories for organization",
			status: 'pending',
			optional: true
		},
		{
			id: 'sample-data',
			title: 'Demo Songs & Services',
			description: 'Add example content to explore WorshipWise features',
			status: 'pending',
			optional: true
		}
	]);

	isLoading = $state(false);
	showSetupWizard = $state(false);
	currentStepIndex = $state(0);

	currentStep = $derived(this.setupSteps[this.currentStepIndex]);

	completedSteps = $derived(this.setupSteps.filter((step) => step.status === 'completed'));

	completedRequiredSteps = $derived(
		this.setupSteps.filter((step) => step.status === 'completed' && !step.optional)
	);

	requiredSteps = $derived(this.setupSteps.filter((step) => !step.optional));

	isSetupComplete = $derived.by(() => {
		return this.requiredSteps.every((step) => step.status === 'completed');
	});

	hasActiveStep = $derived.by(() => {
		// Has active step if there are incomplete required steps or incomplete optional steps
		return this.setupSteps.some((step) => step.status === 'pending' || step.status === 'error');
	});

	async checkSystemStatus() {
		this.isLoading = true;

		try {
			const systemAPI = createSystemAPI(pb);
			this.systemStatus = await systemAPI.getSystemStatus();

			// Update setup steps based on system status
			this.updateStepStatus('user-account', this.systemStatus.usersExist ? 'completed' : 'pending');
			this.updateStepStatus(
				'default-categories',
				this.systemStatus.categoriesExist ? 'completed' : 'pending'
			);
			this.updateStepStatus('sample-data', this.systemStatus.songsExist ? 'completed' : 'pending');

			// Show setup wizard if needed
			this.showSetupWizard = this.systemStatus.needsSetup;

			// Set current step to first incomplete required step, or first step if all required are done
			const firstIncompleteRequiredIndex = this.setupSteps.findIndex(
				(step) => !step.optional && (step.status === 'pending' || step.status === 'error')
			);

			if (firstIncompleteRequiredIndex !== -1) {
				this.currentStepIndex = firstIncompleteRequiredIndex;
			} else {
				// All required steps completed, check if there's an incomplete optional step
				const firstIncompleteOptionalIndex = this.setupSteps.findIndex(
					(step) => step.optional && (step.status === 'pending' || step.status === 'error')
				);

				if (firstIncompleteOptionalIndex !== -1) {
					this.currentStepIndex = firstIncompleteOptionalIndex;
				} else {
					// Everything is done, default to last step
					this.currentStepIndex = this.setupSteps.length - 1;
				}
			}
		} catch (error) {
			console.error('Failed to check system status:', error);
		} finally {
			this.isLoading = false;
		}
	}

	updateStepStatus(stepId: string, status: SetupStep['status']) {
		const step = this.setupSteps.find((s) => s.id === stepId);
		if (step) {
			step.status = status;
		}
	}

	async executeStep(stepId: string) {
		const step = this.setupSteps.find((s) => s.id === stepId);
		if (!step) return;

		step.status = 'in_progress';

		try {
			switch (stepId) {
				case 'default-categories':
					await this.createDefaultCategories();
					break;
				case 'sample-data':
					await this.importSampleData();
					break;
				default:
					// For steps that require manual intervention (like user account creation)
					// we'll mark as completed when the user confirms
					step.status = 'completed';
			}
		} catch (error) {
			console.error(`Failed to execute step ${stepId}:`, error);
			step.status = 'error';
			throw error;
		}
	}

	private async importSampleData() {
		// This requires a logged-in user, so we'll check if auth is available
		const { createAuthStore } = await import('$lib/stores/auth.svelte.js');
		const auth = createAuthStore();
		const currentUser = auth.user;

		if (!currentUser) {
			throw new Error('Must be logged in to import sample data');
		}

		const authContext = auth.getAuthContext();
		const songsApi = createSongsAPI(authContext, authContext.pb);
		const categoriesAPI = categoriesApi;

		await importSampleData(songsApi, categoriesAPI);
		this.updateStepStatus('sample-data', 'completed');
	}

	private async createDefaultCategories() {
		// This requires a logged-in user (admin check removed for setup flow)
		const { createAuthStore } = await import('$lib/stores/auth.svelte.js');
		const auth = createAuthStore();
		const currentUser = auth.user;

		if (!currentUser) {
			throw new Error('Must be logged in to create categories');
		}

		const categoriesAPI = categoriesApi;

		await createDefaultCategories(categoriesAPI);
		this.updateStepStatus('default-categories', 'completed');
	}

	nextStep() {
		if (this.currentStepIndex < this.setupSteps.length - 1) {
			this.currentStepIndex++;
		}
	}

	prevStep() {
		if (this.currentStepIndex > 0) {
			this.currentStepIndex--;
		}
	}

	skipStep() {
		const currentStep = this.setupSteps[this.currentStepIndex];
		if (currentStep && currentStep.optional) {
			currentStep.status = 'completed';
			this.nextStep();
		}
	}

	async dismissSetupWizard() {
		this.showSetupWizard = false;

		// Reload data to show newly created songs and categories
		try {
			// Import the auth and songs stores and reload songs
			const { createAuthStore } = await import('$lib/stores/auth.svelte.js');
			const { createSongsStore } = await import('$lib/stores/songs.svelte.js');

			const auth = createAuthStore();
			const songsStore = createSongsStore(auth);

			await songsStore.loadSongs(true); // Reset to first page

			// Trigger a custom event that components can listen to for data refresh
			if (typeof window !== 'undefined') {
				window.dispatchEvent(
					new CustomEvent('worshipwise:data-refreshed', {
						detail: { source: 'setup-wizard-completion' }
					})
				);
			}

			console.log('Successfully reloaded songs and categories after setup completion');
		} catch (error) {
			console.error('Failed to reload data after setup:', error);

			// As a fallback, suggest a page refresh if data reload fails
			if (
				typeof window !== 'undefined' &&
				confirm('Setup completed! Would you like to refresh the page to see your new data?')
			) {
				window.location.reload();
			}
		}
	}

	resetSetup() {
		this.setupSteps.forEach((step) => {
			step.status = 'pending';
		});
		this.currentStepIndex = 0;
		this.showSetupWizard = false;
	}
}

// Export the class type for tests
export type { QuickstartStore };

// Factory function for creating new store instances
export function createQuickstartStore(): QuickstartStore {
	return new QuickstartStore();
}
