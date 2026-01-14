<script lang="ts">
	import Chart from './Chart.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { UsageTrend } from '$lib/api/analytics';

	interface Props {
		songUsage: UsageTrend[];
		averageUsage: UsageTrend[];
		songTitle: string;
		interval?: 'week' | 'month';
		class?: string;
	}

	let { songUsage, averageUsage, songTitle, interval = 'month', class: className = '' }: Props = $props();

	// Calculate overall comparison status
	let comparisonStatus = $derived.by(() => {
		if (songUsage.length === 0 || averageUsage.length === 0) {
			return {
				status: 'no-data',
				colors: 'bg-gray-100 text-gray-800',
				text: 'No usage data available'
			};
		}

		// Calculate totals
		const songTotal = songUsage.reduce((sum, t) => sum + t.usageCount, 0);
		const avgTotal = averageUsage.reduce((sum, t) => sum + t.usageCount, 0);

		if (avgTotal === 0) {
			return {
				status: 'no-data',
				colors: 'bg-gray-100 text-gray-800',
				text: 'No usage data available'
			};
		}

		const ratio = songTotal / avgTotal;

		// Use the same thresholds as the song availability status
		if (ratio >= 1.5) {
			return {
				status: 'overused',
				colors: 'bg-red-100 text-red-800',
				text: '⚠️ Used more than average',
				description: 'This song is being used significantly more than others. Consider rotating it out for variety.'
			};
		} else if (ratio < 0.5) {
			return {
				status: 'underused',
				colors: 'bg-yellow-100 text-yellow-800',
				text: 'Used less than average',
				description: 'This song could be added to more services for better rotation.'
			};
		} else {
			return {
				status: 'optimal',
				colors: 'bg-green-100 text-green-800',
				text: '✓ Usage is well balanced',
				description: 'This song is being used at a healthy frequency.'
			};
		}
	});

	let chartConfig = $derived.by(() => {
		// Create a combined set of all dates to ensure proper alignment
		const allDates = new Set([
			...songUsage.map((t) => t.date),
			...averageUsage.map((t) => t.date)
		]);
		const sortedDates = Array.from(allDates).sort();

		// Prepare labels
		const labels = sortedDates.map((dateStr) => {
			const date = new Date(dateStr);
			if (interval === 'month') {
				return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
			} else {
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			}
		});

		// Create data maps for quick lookup
		const songMap = new Map(songUsage.map((t) => [t.date, t.usageCount]));
		const avgMap = new Map(averageUsage.map((t) => [t.date, t.usageCount]));

		// Fill in data arrays, using 0 for missing dates
		const songData = sortedDates.map((date) => songMap.get(date) || 0);
		const avgData = sortedDates.map((date) => avgMap.get(date) || 0);

		return {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: songTitle,
						data: songData,
						borderColor: 'rgb(59, 130, 246)', // Blue
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						borderWidth: 3,
						fill: true,
						tension: 0.4,
						pointRadius: 4,
						pointHoverRadius: 6
					},
					{
						label: 'Church Average',
						data: avgData,
						borderColor: 'rgb(156, 163, 175)', // Gray
						backgroundColor: 'rgba(156, 163, 175, 0.05)',
						borderWidth: 2,
						borderDash: [5, 5],
						fill: false,
						tension: 0.4,
						pointRadius: 3,
						pointHoverRadius: 5
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: false
					},
					legend: {
						position: 'top',
						labels: {
							usePointStyle: true,
							padding: 15,
							font: {
								size: 12
							}
						}
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						padding: 12,
						titleColor: '#fff',
						bodyColor: '#fff',
						callbacks: {
							label: function (context: any) {
								const label = context.dataset.label || '';
								const value = context.parsed.y;
								if (context.datasetIndex === 1) {
									return `${label}: ${value.toFixed(1)} uses/song`;
								}
								return `${label}: ${value} ${value === 1 ? 'use' : 'uses'}`;
							}
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							stepSize: 1,
							font: {
								size: 11
							}
						},
						grid: {
							color: 'rgba(0, 0, 0, 0.05)'
						},
						title: {
							display: true,
							text: 'Number of Uses',
							font: {
								size: 12
							}
						}
					},
					x: {
						grid: {
							display: false
						},
						ticks: {
							font: {
								size: 11
							}
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

<div class={`space-y-3 ${className}`}>
	<!-- Status Badge -->
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-700">Usage vs Church Average (Last 6 Months)</h3>
		<Badge class={comparisonStatus.colors}>
			{comparisonStatus.text}
		</Badge>
	</div>

	<!-- Chart -->
	<div class="h-64">
		<Chart config={chartConfig} />
	</div>

	<!-- Description -->
	{#if comparisonStatus.description}
		<p class="text-xs text-gray-500 italic">
			{comparisonStatus.description}
		</p>
	{/if}
</div>
