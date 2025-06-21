<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { pb } from '$lib/api/client';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		Church,
		Users,
		Globe,
		Clock,
		MapPin,
		Settings,
		LogOut,
		Trash2,
		UserPlus,
		Crown
	} from 'lucide-svelte';
	import type { Church as ChurchType } from '$lib/types/church';

	let loading = $state<boolean>(false);
	let error = $state<string | null>(null);
	let churchDetails = $state<Record<string, any>>({});

	onMount(() => {
		loadChurchDetails();
	});

	async function loadChurchDetails() {
		loading = true;
		error = null;

		try {
			// Load detailed information for each church
			const details: Record<string, any> = {};

			for (const church of auth.availableChurches) {
				// Get member count and admin info for each church
				const profiles = await pb.collection('profiles').getList(1, 50, {
					filter: `church_id = "${church.id}"`,
					expand: 'user_id'
				});

				const admins = profiles.items.filter((p) => p.role === 'admin');
				const members = profiles.items.length;

				details[church.id] = {
					memberCount: members,
					adminCount: admins.length,
					admins: admins,
					isCurrentUserAdmin: admins.some((a) => a.user_id === auth.user?.id),
					isOnlyAdmin: admins.length === 1 && admins[0].user_id === auth.user?.id
				};
			}

			churchDetails = details;
		} catch (err: any) {
			console.error('Failed to load church details:', err);
			error = err.message || 'Failed to load church details';
		} finally {
			loading = false;
		}
	}

	async function handleLeaveChurch(churchId: string) {
		try {
			await auth.leaveChurch(churchId);
			await loadChurchDetails(); // Refresh details
		} catch (err: any) {
			error = err.message || 'Failed to leave church';
		}
	}

	async function handleDeleteChurch(churchId: string) {
		if (
			!confirm(
				'Are you sure you want to delete this church? This action cannot be undone and will remove all data associated with this church.'
			)
		) {
			return;
		}

		try {
			await auth.deleteChurch(churchId);
			await loadChurchDetails(); // Refresh details
		} catch (err: any) {
			error = err.message || 'Failed to delete church';
		}
	}

	function canLeaveChurch(churchId: string): boolean {
		const details = churchDetails[churchId];
		if (!details) return false;

		// Can't leave if it's the only church
		if (auth.availableChurches.length === 1) return false;

		// Can't leave if user is the only admin
		return !details.isOnlyAdmin;
	}

	function canDeleteChurch(churchId: string): boolean {
		const details = churchDetails[churchId];
		return details?.isCurrentUserAdmin || false;
	}

	function getTimezoneDisplayName(timezone: string): string {
		try {
			return (
				new Intl.DateTimeFormat('en', {
					timeZone: timezone,
					timeZoneName: 'long'
				})
					.formatToParts(new Date())
					.find((part) => part.type === 'timeZoneName')?.value || timezone
			);
		} catch {
			return timezone;
		}
	}
</script>

<svelte:head>
	<title>Church Management - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="font-title text-3xl font-bold text-gray-900">Church Management</h1>
			<p class="text-gray-600">Manage your church affiliations and settings</p>
		</div>

		<Button href="/admin/churches/invite">
			<UserPlus class="mr-2 h-4 w-4" />
			Invite to Church
		</Button>
	</div>

	<!-- Error Display -->
	{#if error}
		<Card class="border-red-200 bg-red-50">
			<p class="text-red-800">{error}</p>
		</Card>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="py-12 text-center">
			<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
			<p class="mt-2 text-gray-600">Loading church details...</p>
		</div>
	{/if}

	<!-- Churches List -->
	{#if !loading && auth.availableChurches.length > 0}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each auth.availableChurches as church}
				{@const details = churchDetails[church.id]}
				{@const isCurrentChurch = church.id === auth.currentChurch?.id}

				<Card
					class={`relative ${isCurrentChurch ? 'ring-primary ring-opacity-20 bg-primary/5 ring-2' : ''}`}
				>
					<!-- Current church indicator -->
					{#if isCurrentChurch}
						<div class="absolute top-4 right-4">
							<Badge variant="success" class="flex items-center gap-1">
								<Crown class="h-3 w-3" />
								Current
							</Badge>
						</div>
					{/if}

					<div class="space-y-4">
						<!-- Church Header -->
						<div class="flex items-start space-x-3">
							<div class="bg-primary/10 rounded-lg p-2">
								<Church class="text-primary h-6 w-6" />
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="font-title truncate text-lg font-semibold text-gray-900">
									{church.name || 'Unnamed Church'}
								</h3>
								{#if church.city || church.country}
									<div class="mt-1 flex items-center text-sm text-gray-500">
										<MapPin class="mr-1 h-3 w-3" />
										{church.city || ''}{church.city && church.country ? ', ' : ''}{church.country ||
											''}
									</div>
								{/if}
							</div>
						</div>

						<!-- Church Details -->
						<div class="grid grid-cols-2 gap-4 text-sm">
							{#if details}
								<div class="flex items-center space-x-2">
									<Users class="h-4 w-4 text-gray-400" />
									<span class="text-gray-600">{details.memberCount} members</span>
								</div>
								<div class="flex items-center space-x-2">
									<Settings class="h-4 w-4 text-gray-400" />
									<span class="text-gray-600"
										>{details.adminCount} admin{details.adminCount !== 1 ? 's' : ''}</span
									>
								</div>
							{/if}

							{#if church.timezone}
								<div class="col-span-2 flex items-center space-x-2">
									<Clock class="h-4 w-4 text-gray-400" />
									<span class="truncate text-gray-600"
										>{getTimezoneDisplayName(church.timezone)}</span
									>
								</div>
							{/if}

							{#if church.hemisphere}
								<div class="col-span-2 flex items-center space-x-2">
									<Globe class="h-4 w-4 text-gray-400" />
									<span class="text-gray-600"
										>{church.hemisphere === 'northern' ? '🌍 Northern' : '🌏 Southern'} Hemisphere</span
									>
								</div>
							{/if}
						</div>

						<!-- User's Role -->
						{#if details}
							<div class="flex items-center justify-between border-t border-gray-200 pt-3">
								<div class="flex items-center space-x-2">
									<span class="text-sm text-gray-600">Your role:</span>
									<Badge variant={details.isCurrentUserAdmin ? 'success' : 'default'}>
										{auth.profile?.role || 'member'}
									</Badge>
									{#if details.isOnlyAdmin}
										<Badge variant="warning" class="text-xs">Only Admin</Badge>
									{/if}
								</div>

								<!-- Actions -->
								<div class="flex space-x-2">
									{#if !isCurrentChurch}
										<Button
											size="sm"
											variant="secondary"
											onclick={() => auth.switchChurch(church.id)}
										>
											Switch To
										</Button>
									{/if}

									{#if canLeaveChurch(church.id)}
										<Button
											size="sm"
											variant="danger"
											onclick={() => handleLeaveChurch(church.id)}
											title="Leave this church"
										>
											<LogOut class="h-3 w-3" />
										</Button>
									{/if}

									{#if canDeleteChurch(church.id)}
										<Button
											size="sm"
											variant="danger"
											onclick={() => handleDeleteChurch(church.id)}
											title="Delete this church permanently"
										>
											<Trash2 class="h-3 w-3" />
										</Button>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Warnings -->
						{#if details?.isOnlyAdmin && auth.availableChurches.length === 1}
							<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3">
								<p class="text-sm text-yellow-800">
									⚠️ You are the only administrator of your only church. You cannot leave or delete
									this church without first adding another administrator or creating/joining another
									church.
								</p>
							</div>
						{:else if details?.isOnlyAdmin}
							<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3">
								<p class="text-sm text-yellow-800">
									⚠️ You are the only administrator of this church. Add another administrator before
									leaving or deleting.
								</p>
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- No Churches State -->
	{#if !loading && auth.availableChurches.length === 0}
		<Card class="py-12 text-center">
			<Church class="mx-auto mb-4 h-12 w-12 text-gray-400" />
			<h3 class="mb-2 text-lg font-medium text-gray-900">No Churches Found</h3>
			<p class="mb-4 text-gray-600">
				It looks like you're not affiliated with any churches. This shouldn't normally happen.
			</p>
			<Button href="/setup">Set Up Church</Button>
		</Card>
	{/if}

	<!-- Help Text -->
	<Card class="border-blue-200 bg-blue-50">
		<div class="flex">
			<div class="flex-shrink-0">
				<Church class="h-5 w-5 text-blue-400" />
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Church Management Tips</h3>
				<div class="mt-2 text-sm text-blue-700">
					<ul class="list-inside list-disc space-y-1">
						<li>Switch between churches using the dropdown in the top navigation</li>
						<li>You can belong to multiple churches and switch contexts as needed</li>
						<li>Only church administrators can delete churches</li>
						<li>You cannot leave a church if you're the only administrator</li>
						<li>
							All church data is isolated - switching churches shows different songs and services
						</li>
					</ul>
				</div>
			</div>
		</div>
	</Card>
</div>
