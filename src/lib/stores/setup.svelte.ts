import { ChurchesAPI } from '$lib/api/churches';

class SetupStore {
	// Setup state
	setupRequired = $state<boolean | null>(null); // null = checking, true = required, false = not required
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	/**
	 * Check if initial setup is required
	 */
	async checkSetupRequired(): Promise<boolean> {
		this.loading = true;
		this.error = null;

		try {
			const hasChurches = await ChurchesAPI.hasChurches();
			this.setupRequired = !hasChurches;
			return !hasChurches;
		} catch (error: any) {
			console.error('Failed to check setup status:', error);
			this.error = error.message || 'Failed to check setup status';
			this.setupRequired = false; // Assume setup not required on error
			return false;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Mark setup as completed
	 */
	markSetupCompleted(): void {
		this.setupRequired = false;
	}

	/**
	 * Clear error state
	 */
	clearError(): void {
		this.error = null;
	}
}

export const setupStore = new SetupStore();
