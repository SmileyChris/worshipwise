import { SystemAPI } from '$lib/api/system.js';
import { importSampleData } from '$lib/data/sample-data.js';
import { songsApi } from '$lib/api/songs.js';
import type { SystemStatus, SetupStep } from '$lib/types/quickstart.js';

class QuickstartStore {
	systemStatus = $state<SystemStatus>({
		pocketbaseRunning: false,
		adminExists: false,
		usersExist: false,
		songsExist: false,
		collectionsExist: false,
		needsSetup: true
	});

	setupSteps = $state<SetupStep[]>([
		{
			id: 'health-check',
			title: 'Connect to Server',
			description: 'Verify your WorshipWise server is running and ready',
			status: 'pending'
		},
		{
			id: 'admin-setup',
			title: 'System Administrator',
			description: 'Create admin access to manage your worship system',
			status: 'pending'
		},
		{
			id: 'collections-check',
			title: 'Initialize Database',
			description: 'Set up storage for songs, setlists, and user data',
			status: 'pending'
		},
		{
			id: 'user-account',
			title: 'Your Worship Account',
			description: 'Create your personal account to start managing songs',
			status: 'pending'
		},
		{
			id: 'sample-data',
			title: 'Demo Songs & Setlists',
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

	completedRequiredSteps = $derived(this.setupSteps.filter((step) => step.status === 'completed' && !step.optional));

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
			this.systemStatus = await SystemAPI.getSystemStatus();

			// Update setup steps based on system status
			this.updateStepStatus(
				'health-check',
				this.systemStatus.pocketbaseRunning ? 'completed' : 'error'
			);

			this.updateStepStatus('admin-setup', this.systemStatus.adminExists ? 'completed' : 'pending');

			this.updateStepStatus(
				'collections-check',
				this.systemStatus.collectionsExist ? 'completed' : 'pending'
			);

			this.updateStepStatus('user-account', this.systemStatus.usersExist ? 'completed' : 'pending');

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
				case 'health-check':
					await this.checkPocketBaseHealth();
					break;
				case 'admin-setup':
					await this.setupAdmin();
					break;
				case 'collections-check':
					await this.checkCollections();
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

	private async checkPocketBaseHealth() {
		const isHealthy = await SystemAPI.checkHealth();
		if (!isHealthy) {
			throw new Error('PocketBase server is not accessible');
		}
		this.updateStepStatus('health-check', 'completed');
	}

	private async setupAdmin() {
		// This step requires manual intervention - direct user to admin panel
		const adminUrl = SystemAPI.getAdminUrl();
		window.open(adminUrl, '_blank');

		// For now, we'll mark this as pending since it requires manual setup
		// In a future version, we could integrate admin creation via API
		this.updateStepStatus('admin-setup', 'pending');
	}

	private async checkCollections() {
		// Store current admin status before re-checking
		const wasAdminSetup = this.setupSteps.find(step => step.id === 'admin-setup')?.status === 'completed';
		
		// Re-check system status to see if collections were created
		await this.checkSystemStatus();

		// Preserve admin status if it was already marked as completed
		if (wasAdminSetup) {
			this.updateStepStatus('admin-setup', 'completed');
		}

		if (!this.systemStatus.collectionsExist) {
			throw new Error('Required collections not found. Please ensure PocketBase admin is set up.');
		}

		this.updateStepStatus('collections-check', 'completed');
	}

	private async importSampleData() {
		// This requires a logged-in user, so we'll check if auth is available
		const { auth } = await import('$lib/stores/auth.svelte.js');
		const currentUser = auth.user;

		if (!currentUser) {
			throw new Error('Must be logged in to import sample data');
		}

		await importSampleData(songsApi, currentUser);
		this.updateStepStatus('sample-data', 'completed');
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

	dismissSetupWizard() {
		this.showSetupWizard = false;
	}

	resetSetup() {
		this.setupSteps.forEach((step) => {
			step.status = 'pending';
		});
		this.currentStepIndex = 0;
		this.showSetupWizard = false;
	}
}

export const quickstartStore = new QuickstartStore();
