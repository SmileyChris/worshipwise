<script lang="ts">
	import { onMount } from 'svelte';
	import { recommendationsStore } from '$lib/stores/recommendations.svelte';
	import { servicesStore } from '$lib/stores/services.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { BarChart3, AlertCircle, CheckCircle, Zap, Clock, Heart } from 'lucide-svelte';

	let selectedServiceId = $state<string>('');

	onMount(async () => {
		// Load services for selection
		await servicesStore.loadServices();
	});

	async function analyzeBalance() {
		if (selectedServiceId) {
			await recommendationsStore.analyzeServiceBalance(selectedServiceId);
		}
	}

	function getBalancePercentage(current: number, total: number): number {
		return total > 0 ? Math.round((current / total) * 100) : 0;
	}

	function getBalanceColor(current: number, ideal: number, total: number): string {
		const currentPercent = getBalancePercentage(current, total);
		const idealPercent = getBalancePercentage(ideal, total);
		const diff = Math.abs(currentPercent - idealPercent);

		if (diff <= 10) return 'text-green-600';
		if (diff <= 20) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getTempoIcon(tempo: 'fast' | 'medium' | 'slow') {
		switch (tempo) {
			case 'fast':
				return Zap;
			case 'medium':
				return Clock;
			case 'slow':
				return Heart;
		}
	}

	function getTempoLabel(tempo: 'fast' | 'medium' | 'slow'): string {
		switch (tempo) {
			case 'fast':
				return 'Fast (120+ BPM)';
			case 'medium':
				return 'Medium (80-120 BPM)';
			case 'slow':
				return 'Slow (<80 BPM)';
		}
	}
</script>

<div class="space-y-6">
	<!-- Setlist Selection -->
	<Card>
		<h3 class="font-title mb-4 text-lg font-semibold">Analyze Service Balance</h3>
		<div class="space-y-4">
			<div>
				<label for="balance-service-select" class="mb-2 block text-sm font-medium text-gray-700">
					Select a service to analyze
				</label>
				<div class="flex gap-3">
					<select
						id="balance-service-select"
						bind:value={selectedServiceId}
						class="flex-1 rounded-md border-gray-300"
					>
						<option value="">-- Choose a service --</option>
						{#each servicesStore.services as service}
							<option value={service.id}>
								{service.title || `Service ${new Date(service.service_date).toLocaleDateString()}`}
								{#if service.theme}
									- {service.theme}
								{/if}
							</option>
						{/each}
					</select>
					<Button onclick={analyzeBalance} disabled={!selectedServiceId}>
						<BarChart3 class="mr-2 h-4 w-4" />
						Analyze
					</Button>
				</div>
			</div>

			{#if !selectedServiceId}
				<p class="text-sm text-gray-600">
					Select a service to analyze the tempo balance and get recommendations for improvement.
				</p>
			{/if}
		</div>
	</Card>

	<!-- Loading State -->
	{#if recommendationsStore.loading}
		<div class="py-8 text-center">
			<div class="border-primary mx-auto h-6 w-6 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-sm text-gray-600">Analyzing service balance...</p>
		</div>
	{/if}

	<!-- Balance Analysis Results -->
	{#if !recommendationsStore.loading && recommendationsStore.serviceBalanceAnalysis}
		{@const analysis = recommendationsStore.serviceBalanceAnalysis}
		{@const total =
			analysis.currentBalance.fast + analysis.currentBalance.medium + analysis.currentBalance.slow}
		{@const idealTotal =
			analysis.idealBalance.fast + analysis.idealBalance.medium + analysis.idealBalance.slow}

		<div class="space-y-6">
			<!-- Current vs Ideal Balance -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Current Balance -->
				<Card>
					<h3 class="font-title mb-4 text-lg font-semibold">Current Balance</h3>
					<div class="space-y-4">
						{#each [{ key: 'fast', label: 'Fast', value: analysis.currentBalance.fast, icon: Zap, color: 'text-orange-600' }, { key: 'medium', label: 'Medium', value: analysis.currentBalance.medium, icon: Clock, color: 'text-primary' }, { key: 'slow', label: 'Slow', value: analysis.currentBalance.slow, icon: Heart, color: 'text-purple-600' }] as tempo}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									{#if tempo.icon === Zap}
										<Zap class={`h-4 w-4 ${tempo.color}`} />
									{:else if tempo.icon === Clock}
										<Clock class={`h-4 w-4 ${tempo.color}`} />
									{:else}
										<Heart class={`h-4 w-4 ${tempo.color}`} />
									{/if}
									<span class="font-medium"
										>{getTempoLabel(tempo.key as 'fast' | 'medium' | 'slow')}</span
									>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-gray-600">{tempo.value} songs</span>
									<Badge
										variant="default"
										class={getBalanceColor(
											tempo.value,
											analysis.idealBalance[tempo.key as keyof typeof analysis.idealBalance],
											total
										)}
									>
										{getBalancePercentage(tempo.value, total)}%
									</Badge>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class={`h-2 rounded-full ${
										tempo.key === 'fast'
											? 'bg-orange-600'
											: tempo.key === 'medium'
												? 'bg-primary'
												: 'bg-purple-600'
									}`}
									style={`width: ${getBalancePercentage(tempo.value, total)}%`}
								></div>
							</div>
						{/each}

						<div class="border-t pt-2">
							<div class="flex items-center justify-between">
								<span class="font-medium">Total Songs</span>
								<Badge>{total}</Badge>
							</div>
						</div>
					</div>
				</Card>

				<!-- Ideal Balance -->
				<Card>
					<h3 class="font-title mb-4 text-lg font-semibold">Recommended Balance</h3>
					<div class="space-y-4">
						{#each [{ key: 'fast', label: 'Fast', value: analysis.idealBalance.fast, icon: Zap, color: 'text-orange-600', percent: 30 }, { key: 'medium', label: 'Medium', value: analysis.idealBalance.medium, icon: Clock, color: 'text-primary', percent: 40 }, { key: 'slow', label: 'Slow', value: analysis.idealBalance.slow, icon: Heart, color: 'text-purple-600', percent: 30 }] as tempo}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									{#if tempo.icon === Zap}
										<Zap class={`h-4 w-4 ${tempo.color}`} />
									{:else if tempo.icon === Clock}
										<Clock class={`h-4 w-4 ${tempo.color}`} />
									{:else}
										<Heart class={`h-4 w-4 ${tempo.color}`} />
									{/if}
									<span class="font-medium"
										>{getTempoLabel(tempo.key as 'fast' | 'medium' | 'slow')}</span
									>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-gray-600">{tempo.value} songs</span>
									<Badge variant="success">{tempo.percent}%</Badge>
								</div>
							</div>

							<!-- Progress Bar -->
							<div class="h-2 w-full rounded-full bg-gray-200">
								<div
									class={`h-2 rounded-full ${
										tempo.key === 'fast'
											? 'bg-orange-600'
											: tempo.key === 'medium'
												? 'bg-primary'
												: 'bg-purple-600'
									}`}
									style={`width: ${tempo.percent}%`}
								></div>
							</div>
						{/each}

						<div class="border-t pt-2 text-sm text-gray-600">
							<p>
								Ideal balance creates natural worship flow with smooth transitions and varied energy
								levels.
							</p>
						</div>
					</div>
				</Card>
			</div>

			<!-- Recommendations -->
			{#if analysis.recommendations.length > 0}
				<Card class="border-yellow-200 bg-yellow-50">
					<div class="flex items-start gap-3">
						<AlertCircle class="mt-0.5 h-5 w-5 text-yellow-600" />
						<div>
							<h3 class="font-title mb-3 text-lg font-semibold text-yellow-900">
								Balance Recommendations
							</h3>
							<ul class="space-y-2">
								{#each analysis.recommendations as recommendation}
									<li class="text-sm text-yellow-800">• {recommendation}</li>
								{/each}
							</ul>
						</div>
					</div>
				</Card>
			{:else}
				<Card class="border-green-200 bg-green-50">
					<div class="flex items-center gap-3">
						<CheckCircle class="h-5 w-5 text-green-600" />
						<div>
							<h3 class="font-title font-semibold text-green-900">Perfect Balance!</h3>
							<p class="text-sm text-green-700">
								This service has an excellent tempo balance for worship flow.
							</p>
						</div>
					</div>
				</Card>
			{/if}

			<!-- Balance Tips -->
			<Card>
				<h3 class="font-title mb-4 text-lg font-semibold">Service Balance Guidelines</h3>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div>
						<div class="mb-2 flex items-center gap-2">
							<Zap class="h-4 w-4 text-orange-600" />
							<h4 class="font-medium">Fast Songs (30%)</h4>
						</div>
						<p class="text-sm text-gray-600">
							High-energy songs for engagement and celebration. Great for opening and sending.
						</p>
						<div class="mt-2 text-xs text-gray-500">
							Examples: Celebration songs, praise anthems
						</div>
					</div>

					<div>
						<div class="mb-2 flex items-center gap-2">
							<Clock class="text-primary h-4 w-4" />
							<h4 class="font-medium">Medium Songs (40%)</h4>
						</div>
						<p class="text-sm text-gray-600">
							Transitional songs that build momentum or provide steady worship flow.
						</p>
						<div class="mt-2 text-xs text-gray-500">Examples: Modern worship, hymns with drive</div>
					</div>

					<div>
						<div class="mb-2 flex items-center gap-2">
							<Heart class="h-4 w-4 text-purple-600" />
							<h4 class="font-medium">Slow Songs (30%)</h4>
						</div>
						<p class="text-sm text-gray-600">
							Intimate worship songs for reflection, prayer, and personal response.
						</p>
						<div class="mt-2 text-xs text-gray-500">Examples: Ballads, contemplative hymns</div>
					</div>
				</div>
			</Card>
		</div>
	{/if}

	<!-- No Analysis State -->
	{#if !selectedServiceId && !recommendationsStore.loading}
		<Card>
			<div class="py-8 text-center">
				<BarChart3 class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<h3 class="mb-2 text-lg font-medium text-gray-900">Service Balance Analysis</h3>
				<p class="mx-auto max-w-md text-gray-600">
					Select a service above to analyze the tempo balance and get recommendations for creating
					better worship flow.
				</p>
			</div>
		</Card>
	{/if}
</div>
