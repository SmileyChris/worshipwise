<script lang="ts">
	import { setContext } from 'svelte';
	import { initializeStores } from '$lib/context/stores.svelte';

	interface Props {
		Component: any;
		componentProps?: any;
		authUser?: any;
		currentChurch?: any;
		memberships?: any[];
		pendingInvites?: any[];
		availableChurches?: any[];
		storeOverrides?: Record<string, any>;
	}

	let {
		Component,
		componentProps = {},
		authUser,
		currentChurch,
		memberships = [],
		pendingInvites = [],
		availableChurches = [],
		storeOverrides = {}
	}: Props = $props();

	// Initialize stores using the standard function
	const stores = initializeStores();

	// Initialize auth store with test data
	if (authUser) {
		stores.auth.user = authUser;
	}
	if (currentChurch) {
		stores.auth.currentChurch = currentChurch;
	}
	if (memberships.length > 0) {
		stores.auth.churchMemberships = memberships;
	}
	if (pendingInvites.length > 0) {
		stores.auth.pendingInvites = pendingInvites;
	}
	if (availableChurches.length > 0) {
		stores.auth.availableChurches = availableChurches;
	}

	// Apply any store overrides
	Object.keys(storeOverrides).forEach((key) => {
		const store = stores[key as keyof typeof stores];
		if (store) {
			Object.assign(store, storeOverrides[key]);
		}
	});
</script>

<Component {...componentProps} />