<script lang="ts">
	import { type Service } from '$lib/types/service';
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		services: Service[];
		onServiceClick?: (service: Service) => void;
		onDateClick?: (date: Date) => void;
		loading?: boolean;
	}

	let { services = [], onServiceClick, onDateClick, loading = false }: Props = $props();

	// Calendar state
	let currentDate = $state(new Date());
	let currentMonth = $state(currentDate.getMonth());
	let currentYear = $state(currentDate.getFullYear());
	let calendarDays = $state<Date[]>([]);

	// View state
	let view = $state<'month' | 'week'>('month');

	// Service map for quick lookup
	let servicesByDate = $derived(
		(() => {
			const map = new Map<string, Service[]>();
			services.forEach((service) => {
				const dateKey = getDateKey(new Date(service.service_date));
				const existing = map.get(dateKey) || [];
				map.set(dateKey, [...existing, service]);
			});
			return map;
		})()
	);

	// Generate calendar days for current month
	function generateCalendarDays() {
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const startDate = new Date(firstDay);
		const endDate = new Date(lastDay);

		// Adjust to start on Sunday
		startDate.setDate(startDate.getDate() - startDate.getDay());
		// Adjust to end on Saturday
		endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

		const days: Date[] = [];
		const current = new Date(startDate);

		while (current <= endDate) {
			days.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}

		calendarDays = days;
	}

	// Get unique key for a date
	function getDateKey(date: Date): string {
		return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
	}

	// Check if date is today
	function isToday(date: Date): boolean {
		const today = new Date();
		return getDateKey(date) === getDateKey(today);
	}

	// Check if date is in current month
	function isCurrentMonth(date: Date): boolean {
		return date.getMonth() === currentMonth;
	}

	// Navigate months
	function previousMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
		generateCalendarDays();
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
		generateCalendarDays();
	}

	// Go to today
	function goToToday() {
		const today = new Date();
		currentMonth = today.getMonth();
		currentYear = today.getFullYear();
		generateCalendarDays();
	}

	// Format month/year display
	function formatMonthYear(): string {
		const monthNames = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December'
		];
		return `${monthNames[currentMonth]} ${currentYear}`;
	}

	// Get status variant for badge
	function getStatusVariant(status: string): 'default' | 'primary' | 'success' | 'warning' {
		switch (status) {
			case 'draft':
				return 'default';
			case 'planned':
				return 'primary';
			case 'completed':
				return 'success';
			default:
				return 'default';
		}
	}

	// Handle day click
	function handleDayClick(date: Date) {
		if (onDateClick && isCurrentMonth(date)) {
			onDateClick(date);
		}
	}

	onMount(() => {
		generateCalendarDays();
	});

	// Regenerate calendar when month/year changes
	$effect(() => {
		generateCalendarDays();
	});
</script>

<div class="w-full">
	<!-- Calendar Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h3 class="text-lg font-semibold text-gray-900">{formatMonthYear()}</h3>
			{#if loading}
				<span class="text-sm text-gray-500">Loading...</span>
			{/if}
		</div>
		
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={goToToday}>Today</Button>
			<div class="flex items-center">
				<Button
					variant="ghost"
					size="sm"
					onclick={previousMonth}
					aria-label="Previous month"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={nextMonth}
					aria-label="Next month"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</Button>
			</div>
		</div>
	</div>

	<!-- Calendar Grid -->
	<Card>
		<div class="p-4">
			<!-- Day headers -->
			<div class="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-500">
				<div>Sun</div>
				<div>Mon</div>
				<div>Tue</div>
				<div>Wed</div>
				<div>Thu</div>
				<div>Fri</div>
				<div>Sat</div>
			</div>

			<!-- Calendar days -->
			<div class="grid grid-cols-7 gap-px bg-gray-200">
				{#each calendarDays as day, index (getDateKey(day))}
					{@const dateKey = getDateKey(day)}
					{@const dayServices = servicesByDate.get(dateKey) || []}
					{@const isInMonth = isCurrentMonth(day)}
					{@const isCurrentDay = isToday(day)}
					
					<button
						class="min-h-[80px] bg-white p-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 {!isInMonth ? 'text-gray-400' : ''} {isCurrentDay ? 'bg-blue-50' : ''}"
						onclick={() => handleDayClick(day)}
						disabled={!isInMonth}
					>
						<div class="mb-1 text-sm font-medium {isCurrentDay ? 'text-primary' : ''}">
							{day.getDate()}
						</div>
						
						{#if dayServices.length > 0}
							<div class="space-y-1">
								{#each dayServices.slice(0, 2) as service}
									<div
										class="block w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-xs hover:bg-gray-100"
										onclick={(e) => {
											e.stopPropagation();
											onServiceClick?.(service);
										}}
										role="button"
										tabindex="0"
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.stopPropagation();
												e.preventDefault();
												onServiceClick?.(service);
											}
										}}
									>
										<Badge variant={getStatusVariant(service.status || 'draft')} size="sm">
											{service.title}
										</Badge>
									</div>
								{/each}
								
								{#if dayServices.length > 2}
									<div class="px-1 text-xs text-gray-500">
										+{dayServices.length - 2} more
									</div>
								{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</Card>

	<!-- Legend -->
	<div class="mt-4 flex items-center justify-center gap-4 text-sm">
		<div class="flex items-center gap-1">
			<Badge variant="default" size="sm">Draft</Badge>
		</div>
		<div class="flex items-center gap-1">
			<Badge variant="primary" size="sm">Planned</Badge>
		</div>
		<div class="flex items-center gap-1">
			<Badge variant="success" size="sm">Completed</Badge>
		</div>
	</div>
</div>