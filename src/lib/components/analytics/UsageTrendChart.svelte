<script lang="ts">
	import Chart from './Chart.svelte';
	import type { UsageTrend } from '$lib/api/analytics';

	interface Props {
		data: UsageTrend[];
		interval: 'week' | 'month';
		class?: string;
	}

	let { data, interval, class: className = '' }: Props = $props();

	let chartConfig = $derived.by(() => {
		// Prepare chart data
		const labels = data.map((trend) => {
			const date = new Date(trend.date);
			if (interval === 'month') {
				return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
			} else {
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			}
		});

		const usageCounts = data.map((trend) => trend.usageCount);
		const serviceCounts = data.map((trend) => trend.serviceCount);

		return {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Song Uses',
						data: usageCounts,
						borderColor: 'rgb(59, 130, 246)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						borderWidth: 2,
						fill: true,
						tension: 0.4
					},
					{
						label: 'Services',
						data: serviceCounts,
						borderColor: 'rgb(16, 185, 129)',
						backgroundColor: 'rgba(16, 185, 129, 0.1)',
						borderWidth: 2,
						fill: false,
						tension: 0.4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: `Usage Trends (${interval === 'week' ? 'Weekly' : 'Monthly'})`
					},
					legend: {
						position: 'top'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							stepSize: 1
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
