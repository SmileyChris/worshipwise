import { render } from '@testing-library/svelte';
import type { ComponentProps, SvelteComponent } from 'svelte';
import { mockAuthContext, mockUser, mockChurch, mockMembership } from './mock-builders';
import ContextProvider from './ContextProvider.svelte';

/**
 * Renders a Svelte component with all necessary stores in context
 */
export function renderWithContext<T extends SvelteComponent>(
	Component: new (...args: any[]) => T,
	options: {
		props?: ComponentProps<T>;
		authUser?: any;
		currentChurch?: any;
		memberships?: any[];
		pendingInvites?: any[];
		churches?: any[];
		storeOverrides?: Record<string, any>;
	} = {}
) {
	const {
		props = {},
		authUser,
		currentChurch,
		memberships = [],
		pendingInvites = [],
		churches = [],
		storeOverrides = {}
	} = options;

	// Create default auth context
	const defaultUser = authUser || mockUser({ id: 'user1', email: 'test@example.com' });
	const defaultChurch = currentChurch || mockChurch({ id: 'church1', name: 'Test Church' });
	const defaultMembership = mockMembership({
		user_id: defaultUser.id,
		church_id: defaultChurch.id,
		role: 'admin'
	});

	const authContext = mockAuthContext({
		user: defaultUser,
		church: defaultChurch,
		membership: defaultMembership
	});

	return render(ContextProvider, {
		Component,
		componentProps: props,
		authUser: defaultUser,
		currentChurch: defaultChurch,
		memberships: memberships.length > 0 ? memberships : [defaultMembership],
		pendingInvites,
		availableChurches: churches.length > 0 ? churches : [defaultChurch],
		storeOverrides
	});
}

/**
 * Simplified render for components that just need basic auth context
 */
export function renderWithBasicAuth<T extends SvelteComponent>(
	Component: new (...args: any[]) => T,
	props: ComponentProps<T> = {} as ComponentProps<T>
) {
	return renderWithContext(Component, { props });
}