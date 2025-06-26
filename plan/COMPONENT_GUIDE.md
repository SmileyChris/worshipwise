# Component Development Guide

**Status**: ✅ **ACTIVE** - 22+ components implemented with these patterns

## Component Structure

```svelte
<script lang="ts">
	// 1. Type imports
	import type { Props } from './types';

	// 2. Component/Store imports
	import Button from '$lib/components/ui/Button.svelte';
	import { songStore } from '$lib/stores/songs.svelte';

	// 3. Props with defaults
	let { data, onUpdate = () => {}, class: className = '' }: Props = $props();

	// 4. State
	let isLoading = $state(false);

	// 5. Derived values
	let isValid = $derived(data.title.length > 0);

	// 6. Effects (sparingly)
	$effect(() => {
		console.log('Data changed:', data);
	});

	// 7. Event handlers
	function handleSubmit() {
		isLoading = true;
		// Handle logic
	}
</script>

<div class="component-wrapper {className}">
	<!-- Component content -->
</div>
```

## Svelte 5 Runes Patterns

### State Management

```svelte
<script lang="ts">
	// Simple state
	let count = $state(0);

	// Object state
	let user = $state({ name: '', email: '' });

	// Derived filtering
	let filteredSongs = $derived(songs.filter((song) => song.title.includes(searchTerm)));

	// Props with bindable
	let { value = $bindable() }: { value: string } = $props();
</script>
```

## Component Types

**UI Components** (`ui/`): Button, Modal, Input - generic, reusable  
**Feature Components** (`songs/`, `services/`): Domain-specific functionality  
**Layout Components** (`layout/`): Navigation, page structure  
**Form Components** (`forms/`): Input handling, validation

## Testing Components

```typescript
import { render, screen } from '@testing-library/svelte';
import SongCard from './SongCard.svelte';

test('renders song information', () => {
	render(SongCard, { song: mockSong });
	expect(screen.getByText('Amazing Grace')).toBeInTheDocument();
});

test('calls onEdit when clicked', async () => {
	const onEdit = vi.fn();
	render(SongCard, { song: mockSong, onEdit });

	const editButton = screen.getByText('Edit');
	await editButton.click();

	expect(onEdit).toHaveBeenCalledWith(mockSong);
});
```

## Accessibility

```svelte
<button aria-haspopup="true" aria-expanded={isExpanded} aria-controls={menuId}> Options </button>

{#if isExpanded}
	<div id={menuId} role="menu" aria-labelledby={buttonId}>
		<button role="menuitem">Edit</button>
	</div>
{/if}
```

## Performance

**Lazy Loading:**

```svelte
<script lang="ts">
	let HeavyComponent: any = null;

	onMount(async () => {
		if (shouldLoad) {
			HeavyComponent = (await import('./HeavyComponent.svelte')).default;
		}
	});
</script>

{#if HeavyComponent}
	<svelte:component this={HeavyComponent} />
{/if}
```

## Best Practices

- Declare runes once at component init, outside loops/conditionals
- Keep `$derived()` pure and side-effect-free
- Use `$effect()` sparingly as escape hatch only
- Test through method calls, not reactive values
- Follow consistent import order: types → components → stores → utils
- Use TypeScript interfaces for all props
- Implement comprehensive test coverage
