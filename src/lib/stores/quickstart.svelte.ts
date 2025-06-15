import { SystemAPI } from '$lib/api/system.js';
import { importSampleData } from '$lib/data/sample-data.js';
import { SongsAPI } from '$lib/api/songs.js';
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
			title: 'Check PocketBase Connection',
			description: 'Verify that PocketBase server is running and accessible',
			status: 'pending'
		},
		{
			id: 'admin-setup',
			title: 'Admin Account Setup',
			description: 'Create PocketBase admin account for system management',
			status: 'pending'
		},
		{
			id: 'collections-check',
			title: 'Database Collections',
			description: 'Ensure required database collections are created',
			status: 'pending'
		},
		{
			id: 'user-account',
			title: 'Create Worship Leader Account',
			description: 'Set up your first worship leader account',
			status: 'pending'
		},
		{
			id: 'sample-data',
			title: 'Import Sample Data',
			description: 'Add demo songs and setlists to explore features',
			status: 'pending',
			optional: true
		}
	]);

	isLoading = $state(false);
	showSetupWizard = $state(false);
	currentStepIndex = $state(0);

	currentStep = $derived(this.setupSteps[this.currentStepIndex]);

	completedSteps = $derived(this.setupSteps.filter(step => step.status === 'completed'));

	isSetupComplete = $derived.by(() => {
		const requiredSteps = this.setupSteps.filter(step => !step.optional);
		return requiredSteps.every(step => step.status === 'completed');
	});

	async checkSystemStatus() {
		this.isLoading = true;
		
		try {
			this.systemStatus = await SystemAPI.getSystemStatus();
			
			// Update setup steps based on system status
			this.updateStepStatus('health-check', 
				this.systemStatus.pocketbaseRunning ? 'completed' : 'error'
			);
			
			this.updateStepStatus('admin-setup',
				this.systemStatus.adminExists ? 'completed' : 'pending'
			);
			
			this.updateStepStatus('collections-check',
				this.systemStatus.collectionsExist ? 'completed' : 'pending'
			);
			
			this.updateStepStatus('user-account',
				this.systemStatus.usersExist ? 'completed' : 'pending'
			);
			
			this.updateStepStatus('sample-data',
				this.systemStatus.songsExist ? 'completed' : 'pending'
			);

			// Show setup wizard if needed
			this.showSetupWizard = this.systemStatus.needsSetup;
			
			// Set current step to first incomplete step
			this.currentStepIndex = this.setupSteps.findIndex(
				step => step.status === 'pending' || step.status === 'error'
			);
			
			if (this.currentStepIndex === -1) {
				this.currentStepIndex = 0;
			}
			
		} catch (error) {
			console.error('Failed to check system status:', error);
		} finally {
			this.isLoading = false;
		}
	}

	updateStepStatus(stepId: string, status: SetupStep['status']) {
		const step = this.setupSteps.find(s => s.id === stepId);
		if (step) {
			step.status = status;
		}
	}

	async executeStep(stepId: string) {
		const step = this.setupSteps.find(s => s.id === stepId);
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
		// Re-check system status to see if collections were created
		await this.checkSystemStatus();
		
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

		await importSampleData(SongsAPI, currentUser);
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
		this.setupSteps.forEach(step => {
			step.status = 'pending';
		});
		this.currentStepIndex = 0;
		this.showSetupWizard = false;
	}
}

export const quickstartStore = new QuickstartStore();