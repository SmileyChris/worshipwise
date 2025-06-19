<script lang="ts">
	import type { SongRecommendation } from '$lib/api/recommendations';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Music, Calendar, TrendingUp, Star } from 'lucide-svelte';

	let { recommendation }: { recommendation: SongRecommendation } = $props();

	function getTypeIcon(type: string) {
		switch (type) {
			case 'rotation': return TrendingUp;
			case 'seasonal': return Calendar;
			case 'popularity': return Star;
			default: return Music;
		}
	}

	function getTypeColor(type: string) {
		switch (type) {
			case 'rotation': return 'blue';
			case 'seasonal': return 'green';
			case 'popularity': return 'yellow';
			case 'flow': return 'purple';
			case 'key_compatibility': return 'indigo';
			default: return 'gray';
		}
	}

	function getScoreColor(score: number) {
		if (score >= 0.8) return 'text-green-600';
		if (score >= 0.6) return 'text-yellow-600';
		return 'text-gray-600';
	}
</script>

<Card class="hover:shadow-md transition-shadow">
	<div class="space-y-3">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<h4 class="font-semibold text-gray-900">{recommendation.title}</h4>
				{#if recommendation.artist}
					<p class="text-sm text-gray-600">by {recommendation.artist}</p>
				{/if}
			</div>
			
			<div class="flex items-center gap-2 ml-3">
				<Badge variant="secondary" class="text-xs">
					{#if recommendation.type === 'rotation'}
						<TrendingUp class="h-3 w-3 mr-1" />
					{:else if recommendation.type === 'seasonal'}
						<Calendar class="h-3 w-3 mr-1" />
					{:else if recommendation.type === 'popularity'}
						<Star class="h-3 w-3 mr-1" />
					{:else}
						<Music class="h-3 w-3 mr-1" />
					{/if}
					{recommendation.type}
				</Badge>
				
				<span class={`text-sm font-medium ${getScoreColor(recommendation.score)}`}>
					{Math.round(recommendation.score * 100)}%
				</span>
			</div>
		</div>

		<!-- Key Signature -->
		{#if recommendation.keySignature}
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-500">Key:</span>
				<Badge variant="outline" class="text-xs">{recommendation.keySignature}</Badge>
			</div>
		{/if}

		<!-- Reason -->
		<p class="text-sm text-gray-600 bg-gray-50 rounded-md p-2">
			{recommendation.reason}
		</p>

		<!-- Metadata -->
		{#if recommendation.metadata}
			<div class="text-xs text-gray-500 space-y-1">
				{#if recommendation.metadata.daysSinceLastUse}
					<div>Last used {recommendation.metadata.daysSinceLastUse} days ago</div>
				{/if}
				
				{#if recommendation.metadata.totalUsages}
					<div>Used {recommendation.metadata.totalUsages} times total</div>
				{/if}
				
				{#if recommendation.metadata.isNew}
					<div class="text-green-600 font-medium">🆕 New song</div>
				{/if}
				
				{#if recommendation.metadata.season}
					<div>Perfect for {recommendation.metadata.season} season</div>
				{/if}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex gap-2 pt-2 border-t">
			<Button size="sm" variant="secondary" class="text-xs">
				View Song
			</Button>
			<Button size="sm" variant="primary" class="text-xs">
				Add to Setlist
			</Button>
		</div>
	</div>
</Card>