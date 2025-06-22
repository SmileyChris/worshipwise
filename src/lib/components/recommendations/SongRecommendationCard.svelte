<script lang="ts">
	import type { SongRecommendation } from '$lib/api/recommendations';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Music, Calendar, TrendingUp, Star } from 'lucide-svelte';

	let { recommendation }: { recommendation: SongRecommendation } = $props();


	function getScoreColor(score: number) {
		if (score >= 0.8) return 'text-green-600';
		if (score >= 0.6) return 'text-yellow-600';
		return 'text-gray-600';
	}
</script>

<Card class="transition-shadow hover:shadow-md">
	<div class="space-y-3">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<h4 class="font-title font-semibold text-gray-900">{recommendation.title}</h4>
				{#if recommendation.artist}
					<p class="text-sm text-gray-600">by {recommendation.artist}</p>
				{/if}
			</div>

			<div class="ml-3 flex items-center gap-2">
				<Badge variant="default" class="text-xs">
					{#if recommendation.type === 'rotation'}
						<TrendingUp class="mr-1 h-3 w-3" />
					{:else if recommendation.type === 'seasonal'}
						<Calendar class="mr-1 h-3 w-3" />
					{:else if recommendation.type === 'popularity'}
						<Star class="mr-1 h-3 w-3" />
					{:else}
						<Music class="mr-1 h-3 w-3" />
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
				<Badge variant="default" class="text-xs">{recommendation.keySignature}</Badge>
			</div>
		{/if}

		<!-- Reason -->
		<p class="rounded-md bg-gray-50 p-2 text-sm text-gray-600">
			{recommendation.reason}
		</p>

		<!-- Metadata -->
		{#if recommendation.metadata}
			<div class="space-y-1 text-xs text-gray-500">
				{#if recommendation.metadata.daysSinceLastUse}
					<div>Last used {recommendation.metadata.daysSinceLastUse} days ago</div>
				{/if}

				{#if recommendation.metadata.totalUsages}
					<div>Used {recommendation.metadata.totalUsages} times total</div>
				{/if}

				{#if recommendation.metadata.isNew}
					<div class="font-medium text-green-600">🆕 New song</div>
				{/if}

				{#if recommendation.metadata.season}
					<div>Perfect for {recommendation.metadata.season} season</div>
				{/if}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex gap-2 border-t pt-2">
			<Button size="sm" variant="secondary" class="text-xs">View Song</Button>
			<Button size="sm" variant="primary" class="text-xs">Add to Service</Button>
		</div>
	</div>
</Card>
