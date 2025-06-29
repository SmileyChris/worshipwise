<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- Public layout without authentication -->
<div class="min-h-screen bg-gray-50">
	<!-- Simple header -->
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-baseline space-x-2">
					<svg class="text-primary size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<use href="/logo.svg#svg1" width="24" height="24" />
					</svg>
					<span class="font-title text-xl font-bold text-gray-900">WorshipWise</span>
				</div>
				<p class="text-sm text-gray-500">Team Share</p>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>
