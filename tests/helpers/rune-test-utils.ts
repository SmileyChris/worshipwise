import { flushSync } from 'svelte';

/**
 * Test utility for testing Svelte 5 runes following official best practices
 * Wraps test logic in $effect.root() for proper reactive context
 */
export function testWithRunes<T>(testFn: () => T): T {
	let result: T;
	let cleanup: (() => void) | undefined;

	try {
		cleanup = $effect.root(() => {
			result = testFn();

			// Return cleanup function if provided by test
			return typeof result === 'function' ? result : undefined;
		});

		// Flush any pending effects synchronously
		flushSync();

		return result!;
	} finally {
		// Clean up the effect root
		cleanup?.();
	}
}

/**
 * Test reactive state changes with proper flushSync timing
 * Follows official Svelte 5 testing patterns
 */
export function testStateChanges<T>(setup: () => T, test: (state: T) => void): void {
	testWithRunes(() => {
		const state = setup();

		// Flush initial setup
		flushSync();

		// Run test logic
		test(state);

		// Flush any changes made during test
		flushSync();
	});
}

/**
 * Note: For $derived testing, use testWithRunes() directly and declare
 * $derived at the top level of the test function, as Svelte 5 requires
 * $derived to be used as a variable declaration initializer only.
 */

/**
 * Test effects with proper lifecycle management
 */
export function testEffect(setup: () => void, test: () => void): void {
	testWithRunes(() => {
		setup();

		// Effects normally run after a microtask,
		// use flushSync to execute all pending effects synchronously
		flushSync();

		test();
	});
}

/**
 * Enhanced component testing with proper mount/unmount and reactive context
 */
export function testComponentWithRunes<T extends Record<string, any>>(
	Component: any,
	options: {
		props?: T;
		target?: Element;
		test: (component: any) => void;
	}
): void {
	const { props = {} as T, target = document.body, test } = options;

	testWithRunes(() => {
		// Import mount/unmount from svelte for proper lifecycle
		const { mount, unmount } = require('svelte');

		const component = mount(Component, {
			target,
			props
		});

		try {
			// Flush to ensure component is fully mounted
			flushSync();

			// Run test logic
			test(component);

			// Flush any changes made during test
			flushSync();
		} finally {
			// Clean up component
			unmount(component);
		}
	});
}
