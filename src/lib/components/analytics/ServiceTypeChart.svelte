<script lang="ts">
	import Chart from './Chart.svelte';
	import type { ServiceTypeStats } from '$lib/api/analytics';
	import type { ChartConfiguration } from 'chart.js';

	interface Props {
		data: ServiceTypeStats[];
		class?: string;
	}

	let { data, class: className = '' }: Props = $props();

	let chartConfig = $derived.by(() => {
		const labels = data.map((item) => item.serviceType);
		const counts = data.map((item) => item.count);
		const avgSongs = data.map((item) => item.avgSongs);

		return {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: 'Number of Services',
						data: counts,
						backgroundColor: 'rgba(59, 130, 246, 0.8)',
						borderColor: 'rgb(59, 130, 246)',
						borderWidth: 1,
						yAxisID: 'y'
					},
					{
						label: 'Avg Songs per Service',
						data: avgSongs,
						type: 'line',
						borderColor: 'rgb(239, 68, 68)',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						borderWidth: 2,
						fill: false,
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: 'Service Type Analysis'
					},
					legend: {
						position: 'top'
					}
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						beginAtZero: true,
						title: {
							display: true,
							text: 'Number of Services'
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						beginAtZero: true,
						title: {
							display: true,
							text: 'Average Songs'
						},
						grid: {
							drawOnChartArea: false
						}
					},
					x: {
						grid: {
							display: false
						}
					}
				},
				interaction: {
					intersect: false,
					mode: 'index'
				}
			}
		};
	});
</script>

<Chart config={chartConfig} class={className} />
