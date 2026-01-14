<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Music, Clock, User, ChevronRight } from 'lucide-svelte';
	import type { Service } from '$lib/types/service';

	interface Props {
		service: Service;
		onclick?: () => void;
	}

	let { service, onclick }: Props = $props();

	function getDay(dateString: string): string {
		const date = new Date(dateString);
		return date.getDate().toString();
	}

	function getMonth(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
	}

	function getYear(dateString: string): string {
		const date = new Date(dateString);
		return date.getFullYear().toString();
	}

	let statusInfo = $derived.by(() => {
		const status = service.status || 'draft';
		switch (status) {
			case 'completed':
				return { label: 'Done', color: 'purple' as const };
			case 'planned':
				return { label: 'Planned', color: 'green' as const };
			case 'in_progress':
				return { label: 'In Progress', color: 'yellow' as const };
			case 'draft':
				return { label: 'Draft', color: 'blue' as const };
			default:
				return { label: status, color: 'gray' as const };
		}
	});
</script>

<Card
	class="group transition-all hover:shadow-xl hover:border-primary/30 cursor-pointer overflow-hidden"
	{onclick}
	padding={false}
>
	<div class="flex flex-col h-full">
		<div class="p-5 flex gap-5 flex-1">
			<!-- Date Column -->
			<div class="flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 bg-white border border-gray-100 rounded-2xl shadow-sm group-hover:border-primary/20 transition-colors overflow-hidden">
				<div class="w-full bg-primary text-white text-[10px] font-bold py-1 text-center uppercase tracking-widest">
					{getMonth(service.service_date)}
				</div>
				<div class="flex-1 flex flex-col items-center justify-center pt-1">
					<span class="text-3xl font-black text-gray-900 leading-none">{getDay(service.service_date)}</span>
					<span class="text-[10px] text-gray-400 font-medium">{getYear(service.service_date)}</span>
				</div>
			</div>

			<!-- Info Column -->
			<div class="flex-1 min-w-0 flex flex-col justify-center">
				<div class="flex items-start justify-between gap-2 mb-1">
					<h3 class="text-lg font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
						{service.title}
					</h3>
					<Badge color={statusInfo.color} size="sm" class="flex-shrink-0">
						{statusInfo.label}
					</Badge>
				</div>
				
				<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
					{#if service.service_type}
						<span class="flex items-center gap-1">
							<Clock class="h-3.5 w-3.5" />
							{service.service_type}
						</span>
					{/if}
					{#if service.expand?.worship_leader}
						<span class="flex items-center gap-1">
							<User class="h-3.5 w-3.5" />
							{service.expand.worship_leader.name}
						</span>
					{/if}
				</div>

				{#if service.theme}
					<p class="mt-2 text-sm text-gray-600 italic line-clamp-1">
						"{service.theme}"
					</p>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
					<Music class="h-3.5 w-3.5 text-primary" />
					<span>
						{#if service.expand?.service_songs_via_service_id && service.expand.service_songs_via_service_id.length > 0}
							See Songs
						{:else}
							Plan Songs
						{/if}
					</span>
				</div>
				
				{#if service.estimated_duration}
					<div class="text-xs text-gray-400">
						{Math.floor(service.estimated_duration / 60)}m
					</div>
				{/if}
			</div>
			
			<ChevronRight class="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
		</div>
	</div>
</Card>
