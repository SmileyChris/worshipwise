<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import Button from './Button.svelte';

	interface Props {
		open?: boolean;
		title?: string;
		subtitle?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		showCloseButton?: boolean;
		onclose?: () => void;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	}

	let {
		open = false,
		title = '',
		subtitle = '',
		size = 'md',
		showCloseButton = true,
		onclose,
		children,
		footer
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let sizeClasses = $derived.by(() => {
		switch (size) {
			case 'sm':
				return 'max-w-md';
			case 'lg':
				return 'max-w-2xl';
			case 'xl':
				return 'max-w-4xl';
			default:
				return 'max-w-lg';
		}
	});

	function handleClose() {
		onclose?.();
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		tabindex="-1"
	>
		<div class="bg-opacity-50 fixed inset-0 bg-black"></div>

		<!-- Modal -->
		<div
			class="relative rounded-lg bg-white shadow-xl {sizeClasses} flex max-h-[90vh] w-full flex-col"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			{#if title || showCloseButton}
				<div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-6">
					{#if title}
						<div>
							<h2 id="modal-title" class="font-title text-lg font-semibold text-gray-900">
								{title}
							</h2>
							{#if subtitle}
								<p class="mt-1 text-sm text-gray-600">{subtitle}</p>
							{/if}
						</div>
					{:else}
						<div></div>
					{/if}

					{#if showCloseButton}
						<Button
							variant="ghost"
							size="sm"
							onclick={handleClose}
							class="p-1 text-gray-400 hover:text-gray-600"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</Button>
					{/if}
				</div>
			{/if}

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if children}
					{@render children()}
				{/if}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 p-6">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
