import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import type { ComponentProps, SvelteComponent, Component } from 'svelte';
import { mockAuthContext, mockUser, mockChurch, mockMembership } from './mock-builders';
import { testWithRunes } from './rune-test-utils';
import ContextProvider from './ContextProvider.svelte';

/**
 * Renders a Svelte component with all necessary stores in context
 */
export function renderWithContext<T extends Record<string, any>>(
	Component: Component<T>,
	options: {
		props?: T;
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

	const result = render(ContextProvider, {
		Component,
		componentProps: props,
		authUser: defaultUser,
		currentChurch: defaultChurch,
		memberships: memberships.length > 0 ? memberships : [defaultMembership],
		pendingInvites,
		availableChurches: churches.length > 0 ? churches : [defaultChurch],
		storeOverrides
	});

	// Flush to ensure component is fully rendered with reactive state
	flushSync();

	return result;
}

/**
 * Simplified render for components that just need basic auth context
 */
export function renderWithBasicAuth<T extends Record<string, any>>(
	Component: Component<T>,
	props: T = {} as T
) {
	return renderWithContext(Component, { props });
}

/**
 * Render component with context and proper rune testing patterns
 * Follows Svelte 5 best practices for reactive testing
 */
export function renderWithContextAndRunes<T extends Record<string, any>>(
	Component: Component<T>,
	options: Parameters<typeof renderWithContext>[1] = {},
	testFn: (rendered: ReturnType<typeof renderWithContext>) => void
) {
	return testWithRunes(() => {
		const rendered = renderWithContext(Component, options);
		
		// Ensure all reactive state is flushed
		flushSync();
		
		// Run test logic in reactive context
		testFn(rendered);
		
		return rendered;
	});
}