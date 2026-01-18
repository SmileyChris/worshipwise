import { pb } from '$lib/api/client';
import { createAnalyticsStore, type AnalyticsStore } from '$lib/stores/analytics.svelte';
import { createAuthStore, type AuthStore } from '$lib/stores/auth.svelte';
import { createQuickstartStore, type QuickstartStore } from '$lib/stores/quickstart.svelte';
import {
	createRecommendationsStore,
	type RecommendationsStore
} from '$lib/stores/recommendations.svelte';
import { createRolesStore, type RolesStore } from '$lib/stores/roles.svelte';
import { createServicesStore, type ServicesStore } from '$lib/stores/services.svelte';
import { createSetupStore, type SetupStore } from '$lib/stores/setup.svelte';
import { createSkillsStore, type SkillsStore } from '$lib/stores/skills.svelte';
import { createSongsStore, type SongsStore } from '$lib/stores/songs.svelte';
import { getContext, setContext } from 'svelte';

// Context keys
const AUTH_STORE_KEY = Symbol('auth-store');
const SETUP_STORE_KEY = Symbol('setup-store');
const SONGS_STORE_KEY = Symbol('songs-store');
const SERVICES_STORE_KEY = Symbol('services-store');
const ANALYTICS_STORE_KEY = Symbol('analytics-store');
const RECOMMENDATIONS_STORE_KEY = Symbol('recommendations-store');
const QUICKSTART_STORE_KEY = Symbol('quickstart-store');
const ROLES_STORE_KEY = Symbol('roles-store');
const SKILLS_STORE_KEY = Symbol('skills-store');

// Store context interface
export interface StoreContext {
	auth: AuthStore;
	setup: SetupStore;
	songs: SongsStore;
	services: ServicesStore;
	analytics: AnalyticsStore;
	recommendations: RecommendationsStore;
	quickstart: QuickstartStore;
	roles: RolesStore;
	skills: SkillsStore;
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

	// Create auth-dependent stores with auth store instance
	const songs = createSongsStore(auth);
	const services = createServicesStore(auth);
	const roles = createRolesStore(auth);
	const skills = createSkillsStore(auth);

	// Independent stores
	const analytics = createAnalyticsStore(auth);
	const recommendations = createRecommendationsStore(auth.getAuthContext(), pb);

	// Set all contexts
	setContext(AUTH_STORE_KEY, auth);
	setContext(SETUP_STORE_KEY, setup);
	setContext(SONGS_STORE_KEY, songs);
	setContext(SERVICES_STORE_KEY, services);
	setContext(ANALYTICS_STORE_KEY, analytics);
	setContext(RECOMMENDATIONS_STORE_KEY, recommendations);
	setContext(QUICKSTART_STORE_KEY, quickstart);
	setContext(ROLES_STORE_KEY, roles);
	setContext(SKILLS_STORE_KEY, skills);

	const storeContext: StoreContext = {
		auth,
		setup,
		songs,
		services,
		analytics,
		recommendations,
		quickstart,
		roles,
		skills
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
 * Get roles store from context
 */
export function getRolesStore(): RolesStore {
	const store = getContext<RolesStore>(ROLES_STORE_KEY);
	if (!store) {
		throw new Error(
			'Roles store not found in context. Make sure initializeStores() was called in a parent component.'
		);
	}
	return store;
}

/**
 * Get skills store from context
 */
export function getSkillsStore(): SkillsStore {
	const store = getContext<SkillsStore>(SKILLS_STORE_KEY);
	if (!store) {
		throw new Error(
			'Skills store not found in context. Make sure initializeStores() was called in a parent component.'
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
		quickstart: getQuickstartStore(),
		roles: getRolesStore(),
		skills: getSkillsStore()
	};
}
