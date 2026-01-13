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
		Legend,
		type ChartConfiguration
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
			chartInstance = new Chart(canvasElement, config as unknown as ChartConfiguration);
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
			chartInstance.data = (config as unknown as ChartConfiguration).data;
			chartInstance.options = (config as unknown as ChartConfiguration).options || {};
			chartInstance.update();
		}
	});
</script>

<div class="relative w-full h-full {className}">
	<canvas bind:this={canvasElement}></canvas>
</div>
