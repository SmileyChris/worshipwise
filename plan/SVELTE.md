### Svelte Rune Best Practices (cheat-sheet)

General

* **Runes are compiler keywords** – use them only inside `.svelte` or `.svelte.js/ts` files; no import needed, can’t be reassigned or passed around. ([svelte.dev][1])
* Declare them once at component init, outside loops/conditionals, to keep the reactive graph stable.

`$state` – reactive local state

* Store plain values; update by simple assignment (`count++`) – no wrapper API. ([svelte.dev][2])
* Arrays/objects become deep proxies; for big immutable data prefer **`$state.raw()`** or replace the whole object to skip proxy cost. ([svelte.dev][2])
* Destructuring breaks reactivity – read properties directly or via `$derived`. ([svelte.dev][2])
* Works in class fields / constructors for reactive OO patterns. ([svelte.dev][2])

`$derived` – pure, computed state

* Expression **must be side-effect-free**; mutations are blocked. ([svelte.dev][3])
* Keep it short; switch to `$derived.by(()=> …)` for multi-line logic. ([svelte.dev][3])
* Lazy “push-pull”: recalculates only when read, so cache heavy work here. ([svelte.dev][3])
* OK to *temporarily* override for optimistic UI; reset ASAP. ([svelte.dev][3])

`$effect` – imperative side-effects

* Treat as an **escape hatch**: DOM APIs, network, third-party libs. ([svelte.dev][4])
* **Don’t set reactive state inside** – triggers loops; derive instead. ([svelte.dev][4])
* Return a cleanup function to tear down intervals/listeners. ([svelte.dev][4])
* Dependencies = values read **synchronously**; wrap non-deps with `untrack()`. ([svelte.dev][4])
* Runs after DOM paint, batched, never during SSR. ([svelte.dev][4])

`$props` – incoming props

* Call once, then destructure with defaults (`let {title=''} = $props();`) for clarity. ([svelte.dev][5])
* Treat props as read-only; reassign only for short-lived local edits. ([svelte.dev][5])

`$bindable` – two-way prop binding

* Mark only the prop that truly needs to flow up; overuse leads to spaghetti. ([svelte.dev][6])

Cross-module/global state

* Export **functions or getter objects** that read/write `$state`; exporting the value itself freezes it. ([mainmatter.com][7])
* For non-reactive APIs, pass `myState.snapshot()` (static copy) or `myState.raw()` (unproxied). ([svelte.dev][2])

Performance & safety quick hits

* Prefer replacing objects/arrays over deep mutation for cheaper updates. ([svelte.dev][2])
* Design `$derived` to return the *same* reference when unchanged to skip downstream updates. ([svelte.dev][3])
* Keep `$effect` count low; if you’re syncing state, you probably needed `$derived` or an event callback instead. ([svelte.dev][4])

[1]: https://svelte.dev/docs/svelte/what-are-runes "What are runes? • Docs • Svelte"
[2]: https://svelte.dev/docs/svelte/%24state "$state • Docs • Svelte"
[3]: https://svelte.dev/docs/svelte/%24derived "$derived • Docs • Svelte"
[4]: https://svelte.dev/docs/svelte/%24effect "$effect • Docs • Svelte"
[5]: https://svelte.dev/docs/svelte/%24props?utm_source=chatgpt.com "$props • Docs • Svelte"
[6]: https://svelte.dev/docs/svelte/%24bindable?utm_source=chatgpt.com "$bindable • Docs • Svelte"
[7]: https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/ "Runes and Global state: do's and don'ts | Mainmatter"
