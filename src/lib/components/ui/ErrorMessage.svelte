<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import Button from './Button.svelte';

	interface Props {
		message: string;
		title?: string;
		class?: string;
		retryButton?: boolean;
		onRetry?: () => void;
	}

	let {
		message,
		title = 'Error',
		class: className = '',
		retryButton = false,
		onRetry
	}: Props = $props();
</script>

<div class="rounded-lg border border-red-200 bg-red-50 p-4 {className}" role="alert">
	<div class="flex items-start gap-3">
		<AlertTriangle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
		<div class="flex-1">
			<h3 class="font-medium text-red-800">{title}</h3>
			<p class="mt-1 text-sm text-red-700">{message}</p>
			{#if retryButton && onRetry}
				<Button variant="secondary" size="sm" onclick={onRetry} class="mt-3">
					Try Again
				</Button>
			{/if}
		</div>
	</div>
</div>
