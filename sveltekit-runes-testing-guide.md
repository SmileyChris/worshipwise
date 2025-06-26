# 🧪 Testing SvelteKit Components with Runes – 2025 Edition

An opinionated, modern guide to **testing Svelte components and stores** that use **runes** (Svelte 5.x) with **Vitest 4.x** and **SvelteKit 2.22+**.

---

## 🧱 1. Minimal Tooling Stack

| Purpose               | Library                                                   | Why it matters                                  |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| **Test runner**       | **Vitest 4**                                              | Supports browser mode + native Vite integration |
| **Component testing** | **@testing-library/svelte**                               | Declarative and DOM-realistic                   |
| **Runic control**     | **`flushSync`, `tick`, `mount`, `unmount` from `svelte`** | Ensure runic reactivity executes predictably    |

---

## 🛠 2. Vitest Config

```ts
// vitest.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom', // or 'browser'
		browser: { enabled: true, name: 'chromium' },
		includeSource: ['src/**/*.{ts,js,svelte}']
	}
});
```

> Enable `browser.mode` to test `$app/*`, `onMount`, and real DOM APIs.

---

## 📂 3. File Naming for Runes

| Usage                | File Type                             |
| -------------------- | ------------------------------------- |
| Code that uses runes | `.svelte.js` / `.svelte.ts`           |
| Tests that use runes | `.svelte.test.js` / `.svelte.test.ts` |

> ⚠ Only `.svelte.*` files are parsed for runes.

---

## 🎯 4. Canonical Rune Test Patterns

### `$state`

```ts
// counter.svelte.js
export function useCounter(init = 0) {
	let count = $state(init);
	return { get: () => count, inc: () => ++count };
}

// counter.svelte.test.js
import { test, expect } from 'vitest';
import { useCounter } from './counter.svelte.js';

test('increments', () => {
	const c = useCounter(1);
	expect(c.get()).toBe(1);
	c.inc();
	expect(c.get()).toBe(2);
});
```

---

### `$derived`

```ts
// math.svelte.js
export function double(n) {
	let base = $state(n);
	const d = $derived(base * 2);
	return { base: () => base, set: (v) => (base = v), double: () => d };
}

// math.svelte.test.js
import { flushSync } from 'svelte';
import { test, expect } from 'vitest';
import { double } from './math.svelte.js';

test('derived value updates', () => {
	const d = double(2);
	expect(d.double()).toBe(4);
	d.set(3);
	flushSync();
	expect(d.double()).toBe(6);
});
```

---

### `$effect`

```ts
// logger.svelte.js
export function makeLogger(getVal) {
	let out = $state([]);
	$effect(() => {
		out.push(getVal());
	});
	return { log: () => out };
}

// logger.svelte.test.js
import { $effect, flushSync } from 'svelte';
import { test, afterEach, expect } from 'vitest';
import { makeLogger } from './logger.svelte.js';

let dispose;
afterEach(() => dispose?.());

test('logs each change', () => {
	dispose = $effect.root(() => {
		let n = $state(0);
		const l = makeLogger(() => n);
		flushSync();
		expect(l.log()).toEqual([0]);

		n = 1;
		flushSync();
		expect(l.log()).toEqual([0, 1]);
	});
});
```

> Always clean up `$effect.root()` with `dispose()` in `afterEach`.

---

## 🧪 5. Testing Components with DOM & Runes

```svelte
<!-- Counter.svelte -->
<script>
	let count = $state(0);
</script>

<button on:click={() => count++}>{count}</button>
```

```ts
// Counter.spec.ts
import Counter from './Counter.svelte';
import { render, fireEvent } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { test, expect } from 'vitest';

test('click increments label', async () => {
	const { getByRole } = render(Counter);
	const btn = getByRole('button');

	await fireEvent.click(btn);
	flushSync();
	expect(btn.textContent).toBe('1');
});
```

> `flushSync()` ensures reactivity flushes before asserting the DOM.

---

## 🌐 6. Handling Global Rune State

```ts
// tests/setup.ts
import { afterEach } from 'vitest';

afterEach(() => {
	vi.resetModules(); // avoid stale rune state
});
```

---

## 🧰 7. Troubleshooting

| Symptom                  | Likely Cause                | Solution                          |
| ------------------------ | --------------------------- | --------------------------------- |
| `ReferenceError: window` | Not using browser mode      | Set `test.browser.enabled = true` |
| `$effect` throws         | Used outside root context   | Wrap in `$effect.root()`          |
| DOM assertion fails      | Rune state hasn't flushed   | Call `flushSync()`                |
| `onMount` not firing     | Missing `'browser'` resolve | Add resolve condition in plugin   |

---

## 🧪 8. CI Sketch (GitHub Actions)

```yaml
- name: Install deps
  run: npm ci

- name: Run Vitest browser tests
  run: npx vitest run --browser
  env:
    VITEST_POOL: 4
```

---

## ✅ Summary

- Use `.svelte.js` and `.svelte.test.js` for runes.
- Always use `flushSync()` before assertions involving `$derived` or `$effect`.
- Wrap manual `$effect` in `$effect.root()` and dispose in `afterEach`.
- Enable browser mode in Vitest for real DOM + `$app/*`.
- Reset module state between tests to avoid state bleed.

---

Happy Testing! 🧪✨
