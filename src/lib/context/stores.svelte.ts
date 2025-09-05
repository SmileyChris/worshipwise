import { getContext, setContext } from 'svelte';
import { createAuthStore, type AuthStore } from '$lib/stores/auth.svelte';
import { pb } from '$lib/api/client';
import { createSetupStore, type SetupStore } from '$lib/stores/setup.svelte';
import { createSongsStore, type SongsStore } from '$lib/stores/songs.svelte';
import { createServicesStore, type ServicesStore } from '$lib/stores/services.svelte';
import { createAnalyticsStore, type AnalyticsStore } from '$lib/stores/analytics.svelte';
import {
	createRecommendationsStore,
	type RecommendationsStore
} from '$lib/stores/recommendations.svelte';
import { createQuickstartStore, type QuickstartStore } from '$lib/stores/quickstart.svelte';

// Context keys
const AUTH_STORE_KEY = Symbol('auth-store');
const SETUP_STORE_KEY = Symbol('setup-store');
const SONGS_STORE_KEY = Symbol('songs-store');
const SERVICES_STORE_KEY = Symbol('services-store');
const ANALYTICS_STORE_KEY = Symbol('analytics-store');
const RECOMMENDATIONS_STORE_KEY = Symbol('recommendations-store');
const QUICKSTART_STORE_KEY = Symbol('quickstart-store');

// Store context interface
export interface StoreContext {
	auth: AuthStore;
	setup: SetupStore;
	songs: SongsStore;
	services: ServicesStore;
	analytics: AnalyticsStore;
	recommendations: RecommendationsStore;
	quickstart: QuickstartStore;
}

/**
 * Initialize and set all stores in context
 * This should be called at the root layout level
 */
export function initializeStores(): StoreContext {
	// Create auth store first (required for other stores)
	const auth = createAuthStore();

	// Create setup store (independent)
	const setup = createSetupStore();

	// Create quickstart store (independent)
	const quickstart = createQuickstartStore();

    // Create auth-dependent stores with live auth (runes)
    const songs = createSongsStore(auth);
    const services = createServicesStore(auth);

	// Independent stores
    const analytics = createAnalyticsStore();
    const recommendations = createRecommendationsStore(auth.getAuthContext(), pb);

	// Set all contexts
	setContext(AUTH_STORE_KEY, auth);
	setContext(SETUP_STORE_KEY, setup);
	setContext(SONGS_STORE_KEY, songs);
	setContext(SERVICES_STORE_KEY, services);
	setContext(ANALYTICS_STORE_KEY, analytics);
	setContext(RECOMMENDATIONS_STORE_KEY, recommendations);
	setContext(QUICKSTART_STORE_KEY, quickstart);

	const storeContext: StoreContext = {
		auth,
		setup,
		songs,
		services,
		analytics,
		recommendations,
		quickstart
	};

	return storeContext;
}

/**
 * Get auth store from context
 */
export function getAuthStore(): AuthStore {
	const store = getContext<AuthStore>(AUTH_STORE_KEY);
	if (!store) {
		throw new Error(
			'Auth store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get setup store from context
 */
export function getSetupStore(): SetupStore {
	const store = getContext<SetupStore>(SETUP_STORE_KEY);
	if (!store) {
		throw new Error(
			'Setup store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get songs store from context
 */
export function getSongsStore(): SongsStore {
	const store = getContext<SongsStore>(SONGS_STORE_KEY);
	if (!store) {
		throw new Error(
			'Songs store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get services store from context
 */
export function getServicesStore(): ServicesStore {
	const store = getContext<ServicesStore>(SERVICES_STORE_KEY);
	if (!store) {
		throw new Error(
			'Services store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get analytics store from context
 */
export function getAnalyticsStore(): AnalyticsStore {
	const store = getContext<AnalyticsStore>(ANALYTICS_STORE_KEY);
	if (!store) {
		throw new Error(
			'Analytics store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get recommendations store from context
 */
export function getRecommendationsStore(): RecommendationsStore {
	const store = getContext<RecommendationsStore>(RECOMMENDATIONS_STORE_KEY);
	if (!store) {
		throw new Error(
			'Recommendations store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get quickstart store from context
 */
export function getQuickstartStore(): QuickstartStore {
	const store = getContext<QuickstartStore>(QUICKSTART_STORE_KEY);
	if (!store) {
		throw new Error(
			'Quickstart store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get all stores from context as an object
 */
export function getAllStores(): StoreContext {
	return {
		auth: getAuthStore(),
		setup: getSetupStore(),
		songs: getSongsStore(),
		services: getServicesStore(),
		analytics: getAnalyticsStore(),
		recommendations: getRecommendationsStore(),
		quickstart: getQuickstartStore()
	};
}
