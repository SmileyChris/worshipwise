<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		ArcElement,
		Title,
		Tooltip,
		Legend
	} from 'chart.js';

	// Register Chart.js components
	Chart.register(
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		ArcElement,
		Title,
		Tooltip,
		Legend
	);

	interface Props {
		config: Record<string, unknown>;
		class?: string;
	}

	let { config, class: className = '' }: Props = $props();

	let canvasElement: HTMLCanvasElement;
	let chartInstance: Chart | null = null;

	onMount(() => {
		if (canvasElement) {
			// Create chart instance
			chartInstance = new Chart(canvasElement, config);
		}
	});

	onDestroy(() => {
		// Clean up chart instance
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});

	// Update chart when config changes
	$effect(() => {
		if (chartInstance && config) {
			// Update chart data and options
			chartInstance.data = config.data;
			chartInstance.options = config.options || {};
			chartInstance.update();
		}
	});
</script>

<div class="relative {className}">
	<canvas bind:this={canvasElement}></canvas>
</div>
