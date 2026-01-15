<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
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

	function getDayName(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
	}



	let statusInfo = $derived.by(() => {
		const status = service.status || 'draft';
		switch (status) {
			case 'completed':
				return { label: 'Done', headerBg: 'bg-purple-600', headerText: 'text-white' };
			case 'planned':
				return { label: 'Planned', headerBg: 'bg-green-600', headerText: 'text-white' };
			case 'in_progress':
				return { label: 'In Progress', headerBg: 'bg-yellow-400', headerText: 'text-yellow-950' };
			case 'draft':
				return { label: 'Draft', headerBg: 'bg-primary', headerText: 'text-white' };
			default:
				return { label: status, headerBg: 'bg-gray-500', headerText: 'text-white' };
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
			<div class="flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 bg-white border border-gray-100 rounded-2xl shadow-sm group-hover:border-primary/20 transition-colors overflow-hidden" title={statusInfo.label}>
				<div class="w-full {statusInfo.headerBg} {statusInfo.headerText} text-[10px] font-bold py-1 text-center uppercase tracking-widest">
					{getDayName(service.service_date)}
				</div>
				<div class="flex-1 flex flex-col items-center justify-center pt-1">
					<span class="text-3xl font-black text-gray-900 leading-none">{getDay(service.service_date)}</span>
				</div>
			</div>

			<!-- Info Column -->
			<div class="flex-1 min-w-0 flex flex-col justify-center">
				<div class="flex items-start justify-between gap-2 mb-1">
					<h3 class="text-lg font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
						{service.title}
					</h3>
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
		<div class="relative px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
			{#if service.estimated_duration}
				<div class="absolute left-5 text-xs text-gray-400">
					{Math.floor(service.estimated_duration / 60)}m
				</div>
			{/if}

			<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/80 group-hover:text-primary transition-colors">
				<span>
					{#if service.expand?.service_songs_via_service_id && service.expand.service_songs_via_service_id.length > 0}
						See Songs
					{:else}
						Plan Songs
					{/if}
				</span>
				<ChevronRight class="h-3.5 w-3.5" />
			</div>
		</div>
	</div>
</Card>
