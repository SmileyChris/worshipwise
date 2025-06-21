<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import CategoryBadge from '$lib/components/ui/CategoryBadge.svelte';
	import LabelBadge from '$lib/components/ui/LabelBadge.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let song = $derived(data.song);
	let usageHistory = $derived(data.usageHistory);

	// Format duration from seconds to minutes:seconds
	let formattedDuration = $derived.by(() => {
		if (!song.duration_seconds) return null;
		const minutes = Math.floor(song.duration_seconds / 60);
		const seconds = song.duration_seconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Usage status info
	let usageStatusInfo = $derived.by(() => {
		if (!song.usageStatus) return null;

		const status = song.usageStatus;
		const daysSince = song.daysSinceLastUsed;

		switch (status) {
			case 'recent':
				return {
					status: 'red',
					colors: 'bg-red-100 text-red-800',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Recently Used'
				};
			case 'caution':
				return {
					status: 'yellow',
					colors: 'bg-yellow-100 text-yellow-800',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Use with Caution'
				};
			case 'available':
			default:
				return {
					status: 'green',
					colors: 'bg-green-100 text-green-800',
					text:
						daysSince !== undefined && daysSince < Infinity
							? `Used ${daysSince} days ago`
							: 'Available'
				};
		}
	});

	// Get file URLs
	function getFileUrl(filename: string): string {
		// Use relative URL since we're on the same origin
		return `/api/files/songs/${song.id}/${filename}`;
	}

	// Format date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Usage stats
	let usageStats = $derived.by(() => {
		const totalUses = usageHistory.length;
		const uniqueServices = new Set(usageHistory.map((u) => u.setlist_id)).size;
		const uniqueLeaders = new Set(usageHistory.map((u) => u.worship_leader)).size;

		// Recent usage (last 6 months)
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const recentUses = usageHistory.filter((u) => new Date(u.used_date) > sixMonthsAgo).length;

		return {
			totalUses,
			uniqueServices,
			uniqueLeaders,
			recentUses
		};
	});
</script>

<svelte:head>
	<title>{song.title} - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header with Back Button -->
	<div class="flex items-center gap-4">
		<Button
			variant="ghost"
			href="/songs"
			class="flex items-center gap-2 text-gray-600 hover:text-gray-900"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Songs
		</Button>
	</div>

	<!-- Song Header -->
	<div class="md:flex md:items-start md:justify-between">
		<div class="min-w-0 flex-1">
			<h1 class="font-title text-3xl font-bold text-gray-900 sm:text-4xl">
				{song.title}
			</h1>
			{#if song.artist}
				<p class="mt-2 text-xl text-gray-600">by {song.artist}</p>
			{/if}

			<!-- Status Badge -->
			{#if usageStatusInfo}
				<div class="mt-3">
					<Badge class={usageStatusInfo.colors}>
						{usageStatusInfo.text}
					</Badge>
				</div>
			{/if}
		</div>

		<div class="mt-4 flex flex-col gap-2 md:mt-0 md:ml-6">
			{#if auth.canManageSongs}
				<Button variant="primary" href="/songs?edit={song.id}">Edit Song</Button>
			{/if}
			<Button variant="secondary">Add to Service</Button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main Content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Song Details -->
			<Card>
				<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Song Details</h2>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#if song.key_signature}
						<div>
							<dt class="text-sm font-medium text-gray-500">Key</dt>
							<dd class="text-sm font-medium text-gray-900">{song.key_signature}</dd>
						</div>
					{/if}

					{#if song.tempo}
						<div>
							<dt class="text-sm font-medium text-gray-500">Tempo</dt>
							<dd class="text-sm text-gray-900">{song.tempo} BPM</dd>
						</div>
					{/if}

					{#if formattedDuration}
						<div>
							<dt class="text-sm font-medium text-gray-500">Duration</dt>
							<dd class="text-sm text-gray-900">{formattedDuration}</dd>
						</div>
					{/if}

					{#if song.ccli_number}
						<div>
							<dt class="text-sm font-medium text-gray-500">CCLI #</dt>
							<dd class="text-sm text-gray-900">{song.ccli_number}</dd>
						</div>
					{/if}
				</div>

				<!-- Category and Labels -->
				<div class="mt-4 space-y-3">
					{#if song.expand?.category}
						<div>
							<dt class="mb-1 text-sm font-medium text-gray-500">Category</dt>
							<CategoryBadge category={song.expand.category} />
						</div>
					{/if}

					{#if song.expand?.labels && song.expand.labels.length > 0}
						<div>
							<dt class="mb-1 text-sm font-medium text-gray-500">Labels</dt>
							<div class="flex flex-wrap gap-1">
								{#each song.expand.labels as label (label.id)}
									<LabelBadge {label} />
								{/each}
							</div>
						</div>
					{/if}

					{#if song.tags && song.tags.length > 0}
						<div>
							<dt class="mb-1 text-sm font-medium text-gray-500">Tags</dt>
							<div class="flex flex-wrap gap-1">
								{#each song.tags as tag (tag)}
									<Badge>{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Lyrics -->
			{#if song.lyrics}
				<Card>
					<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Lyrics</h2>
					<div class="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
						{song.lyrics}
					</div>
				</Card>
			{/if}

			<!-- Files -->
			{#if song.chord_chart || song.audio_file || (song.sheet_music && song.sheet_music.length > 0)}
				<Card>
					<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Files</h2>
					<div class="space-y-3">
						{#if song.chord_chart}
							<div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
								<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
									<svg
										class="text-primary h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">Chord Chart</p>
									<p class="text-xs text-gray-500">{song.chord_chart}</p>
								</div>
								<Button
									size="sm"
									variant="ghost"
									href={getFileUrl(song.chord_chart)}
									target="_blank"
								>
									View
								</Button>
							</div>
						{/if}

						{#if song.audio_file}
							<div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
									<svg
										class="h-4 w-4 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">Audio File</p>
									<p class="text-xs text-gray-500">{song.audio_file}</p>
								</div>
								<Button
									size="sm"
									variant="ghost"
									href={getFileUrl(song.audio_file)}
									target="_blank"
								>
									Play
								</Button>
							</div>
						{/if}

						{#if song.sheet_music && song.sheet_music.length > 0}
							{#each song.sheet_music as sheetMusic (sheetMusic)}
								<div class="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
										<svg
											class="h-4 w-4 text-purple-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
											/>
										</svg>
									</div>
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-900">Sheet Music</p>
										<p class="text-xs text-gray-500">{sheetMusic}</p>
									</div>
									<Button size="sm" variant="ghost" href={getFileUrl(sheetMusic)} target="_blank">
										View
									</Button>
								</div>
							{/each}
						{/if}
					</div>
				</Card>
			{/if}

			<!-- Additional Info -->
			{#if song.copyright_info || song.notes}
				<Card>
					<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">
						Additional Information
					</h2>

					{#if song.copyright_info}
						<div class="mb-4">
							<dt class="mb-1 text-sm font-medium text-gray-500">Copyright</dt>
							<dd class="text-sm text-gray-700">{song.copyright_info}</dd>
						</div>
					{/if}

					{#if song.notes}
						<div>
							<dt class="mb-1 text-sm font-medium text-gray-500">Notes</dt>
							<dd class="text-sm whitespace-pre-wrap text-gray-700">{song.notes}</dd>
						</div>
					{/if}
				</Card>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Usage Statistics -->
			<Card>
				<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Usage Statistics</h2>
				<div class="space-y-4">
					<div class="text-center">
						<div class="text-primary font-title text-2xl font-bold">{usageStats.totalUses}</div>
						<div class="text-sm text-gray-500">Total Uses</div>
					</div>

					<div class="grid grid-cols-2 gap-4 text-center">
						<div>
							<div class="text-lg font-semibold text-gray-900">{usageStats.recentUses}</div>
							<div class="text-xs text-gray-500">Last 6 Months</div>
						</div>
						<div>
							<div class="text-lg font-semibold text-gray-900">{usageStats.uniqueServices}</div>
							<div class="text-xs text-gray-500">Services</div>
						</div>
					</div>
				</div>
			</Card>

			<!-- Recent Usage History -->
			{#if usageHistory.length > 0}
				<Card>
					<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Recent Usage</h2>
					<div class="space-y-3">
						{#each usageHistory.slice(0, 5) as usage (usage.id)}
							<div class="flex items-start justify-between text-sm">
								<div>
									<div class="font-medium text-gray-900">
										{formatDate(usage.used_date)}
									</div>
									{#if usage.service_type}
										<div class="text-xs text-gray-500">{usage.service_type}</div>
									{/if}
								</div>
								{#if usage.key_used && usage.key_used !== song.key_signature}
									<Badge class="bg-primary/10 text-primary text-xs">
										Key: {usage.key_used}
									</Badge>
								{/if}
							</div>
						{/each}

						{#if usageHistory.length > 5}
							<div class="pt-2 text-center">
								<button class="text-primary hover:text-primary/80 text-sm font-medium">
									View All ({usageHistory.length} total)
								</button>
							</div>
						{/if}
					</div>
				</Card>
			{:else}
				<Card>
					<h2 class="font-title mb-4 text-lg font-semibold text-gray-900">Usage History</h2>
					<div class="py-6 text-center text-gray-500">
						<div class="mb-2 text-3xl">📊</div>
						<p class="text-sm">No usage history yet</p>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</div>
