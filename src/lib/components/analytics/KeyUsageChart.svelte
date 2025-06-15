<script lang="ts">
	import Chart from './Chart.svelte';
	import type { KeyUsageStats } from '$lib/api/analytics';
	import type { ChartConfiguration, TooltipItem } from 'chart.js';

	interface Props {
		data: KeyUsageStats[];
		class?: string;
	}

	let { data, class: className = '' }: Props = $props();

	// Color palette for keys
	const colors = [
		'rgb(59, 130, 246)', // blue
		'rgb(16, 185, 129)', // green
		'rgb(245, 158, 11)', // yellow
		'rgb(239, 68, 68)', // red
		'rgb(139, 92, 246)', // purple
		'rgb(236, 72, 153)', // pink
		'rgb(14, 165, 233)', // light blue
		'rgb(34, 197, 94)', // light green
		'rgb(251, 191, 36)', // light yellow
		'rgb(248, 113, 113)', // light red
		'rgb(168, 85, 247)', // light purple
		'rgb(244, 114, 182)' // light pink
	];

	let chartConfig = $derived(() => {
		const labels = data.map((item) => item.key);
		const counts = data.map((item) => item.count);
		const backgroundColors = data.map((_, index) => colors[index % colors.length]);

		return {
			type: 'doughnut',
			data: {
				labels,
				datasets: [
					{
						data: counts,
						backgroundColor: backgroundColors,
						borderWidth: 2,
						borderColor: '#ffffff'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: 'Key Usage Distribution'
					},
					legend: {
						position: 'bottom',
						labels: {
							padding: 20,
							usePointStyle: true
						}
					},
					tooltip: {
						callbacks: {
							label: function (context: TooltipItem<'doughnut'>) {
								const label = context.label || '';
								const value = context.raw || 0;
								const percentage = data[context.dataIndex]?.percentage || 0;
								return `${label}: ${value} songs (${percentage}%)`;
							}
						}
					}
				},
				cutout: '50%'
			}
		};
	});
</script>

<Chart config={chartConfig} class={className} />
