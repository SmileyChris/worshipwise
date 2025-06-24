<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { ChurchesAPI } from '$lib/api/churches';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { Building, ArrowLeft, Globe, MapPin, Clock } from 'lucide-svelte';

	// Form state
	let formData = $state({
		name: '',
		city: '',
		state: '',
		country: '',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
	});

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Get common timezones for better UX
	const commonTimezones = [
		'America/New_York',
		'America/Chicago', 
		'America/Denver',
		'America/Los_Angeles',
		'America/Phoenix',
		'America/Anchorage',
		'Pacific/Honolulu',
		'America/Toronto',
		'America/Vancouver',
		'Europe/London',
		'Europe/Paris',
		'Europe/Berlin',
		'Australia/Sydney',
		'Australia/Melbourne',
		'Asia/Tokyo',
		'Asia/Shanghai'
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!formData.name.trim()) {
			error = 'Church name is required';
			return;
		}

		loading = true;
		error = null;

		try {
			const newChurch = await ChurchesAPI.createChurch({
				name: formData.name.trim(),
				city: formData.city.trim() || undefined,
				state: formData.state.trim() || undefined,
				country: formData.country.trim() || undefined,
				timezone: formData.timezone
			});

			// Switch to the new church
			await auth.switchChurch(newChurch.id);

			// Navigate to dashboard
			goto('/dashboard');
		} catch (err) {
			console.error('Failed to create church:', err);
			error = err instanceof Error ? err.message : 'Failed to create church';
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		goto('/dashboard');
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button
			onclick={handleCancel}
			variant="outline"
			size="sm"
			class="flex items-center space-x-2"
		>
			<ArrowLeft class="h-4 w-4" />
			<span>Back to Dashboard</span>
		</Button>
		<div class="flex-1">
			<h1 class="font-title text-2xl font-bold text-gray-900">Add New Church</h1>
			<p class="mt-1 text-sm text-gray-600">
				Create a new church organization to manage worship services and songs
			</p>
		</div>
	</div>

	<Card>
		<div class="p-6">
			<form onsubmit={handleSubmit} class="space-y-6">
				{#if error}
					<div class="rounded-md bg-red-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<span class="text-red-400">⚠️</span>
							</div>
							<div class="ml-3">
								<p class="text-sm text-red-800">{error}</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Church Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
						<Building class="inline h-4 w-4 mr-1" />
						Church Name *
					</label>
					<Input
						id="name"
						name="name" 
						bind:value={formData.name}
						placeholder="e.g., Grace Community Church"
						required
						class="w-full"
					/>
					<p class="mt-1 text-xs text-gray-500">
						The full name of your church as it should appear in the system
					</p>
				</div>

				<!-- Location Information -->
				<div class="border-t border-gray-200 pt-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">
						<MapPin class="inline h-4 w-4 mr-1" />
						Location Information
					</h3>
					<p class="text-sm text-gray-600 mb-4">
						Location details help with timezone-aware scheduling and seasonal song recommendations.
					</p>
					
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<label for="city" class="block text-sm font-medium text-gray-700 mb-2">
								City
							</label>
							<Input
								id="city"
								name="city"
								bind:value={formData.city}
								placeholder="e.g., Nashville"
								class="w-full"
							/>
						</div>

						<div>
							<label for="state" class="block text-sm font-medium text-gray-700 mb-2">
								State/Province
							</label>
							<Input
								id="state"
								name="state"
								bind:value={formData.state}
								placeholder="e.g., Tennessee"
								class="w-full"
							/>
						</div>

						<div>
							<label for="country" class="block text-sm font-medium text-gray-700 mb-2">
								Country
							</label>
							<Input
								id="country"
								name="country"
								bind:value={formData.country}
								placeholder="e.g., United States"
								class="w-full"
							/>
						</div>

						<div>
							<label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">
								<Clock class="inline h-4 w-4 mr-1" />
								Timezone *
							</label>
							<select
								id="timezone"
								name="timezone"
								bind:value={formData.timezone}
								required
								class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
							>
								{#each commonTimezones as tz}
									<option value={tz}>
										{tz.replace('_', ' ')}
									</option>
								{/each}
								<option value={formData.timezone}>
									{formData.timezone} (Auto-detected)
								</option>
							</select>
							<p class="mt-1 text-xs text-gray-500">
								Used for scheduling services and seasonal song recommendations
							</p>
						</div>
					</div>
				</div>

				<!-- Permissions Info -->
				<div class="rounded-md bg-blue-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<span class="text-blue-400">ℹ️</span>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">
								Church Administration
							</h3>
							<div class="mt-2 text-sm text-blue-700">
								<p>
									You will be automatically assigned as an administrator of this church, 
									giving you full permissions to manage members, services, and settings.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Form Actions -->
				<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
					<Button
						type="button"
						variant="secondary"
						onclick={handleCancel}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="primary"
						loading={loading}
						disabled={!formData.name.trim() || loading}
					>
						{loading ? 'Creating Church...' : 'Create Church'}
					</Button>
				</div>
			</form>
		</div>
	</Card>
</div>