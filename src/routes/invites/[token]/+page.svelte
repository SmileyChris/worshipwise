<script lang="ts">
	import { goto } from '$app/navigation';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import { ChurchesAPI } from '$lib/api/churches';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Building, Calendar, Mail, UserPlus, CheckCircle, XCircle, AlertCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	const auth = getAuthStore();

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let declined = $state(false);

	// Auto-decline if action parameter is set
	$effect(() => {
		if (data.action === 'decline' && !loading && !declined && !success) {
			handleDecline();
		}
	});

	// Calculate expiration details
	let expirationInfo = $derived(() => {
		const expiresAt = new Date(data.invitation.expires_at);
		const now = new Date();
		const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		const isExpired = daysRemaining <= 0;
		
		return { daysRemaining, isExpired, expiresAt };
	});

	// Role descriptions
	const roleInfo = {
		musician: {
			title: 'Musician',
			color: 'blue' as const,
			permissions: [
				'View and access song library',
				'See upcoming services and setlists',
				'Access chord charts and resources'
			]
		},
		leader: {
			title: 'Worship Leader',
			color: 'yellow' as const,
			permissions: [
				'Create and manage worship services',
				'Add and edit songs in the library',
				'Build setlists and manage teams',
				'View analytics and insights'
			]
		},
		admin: {
			title: 'Administrator',
			color: 'red' as const,
			permissions: [
				'Full access to all church features',
				'Manage users and permissions',
				'Configure church settings',
				'Access all administrative tools'
			]
		}
	};

	async function handleAccept() {
		if (!auth.isValid) {
			// Redirect to login/signup with return URL
			const returnUrl = encodeURIComponent(window.location.pathname);
			goto(`/login?return=${returnUrl}&invite=true`);
			return;
		}

		loading = true;
		error = null;

		try {
			await auth.acceptInvitation(data.token);
			success = true;
			
			// Redirect to dashboard after short delay
			setTimeout(() => {
				goto('/dashboard');
			}, 2000);
		} catch (err) {
			console.error('Failed to accept invitation:', err);
			error = err instanceof Error ? err.message : 'Failed to accept invitation';
		} finally {
			loading = false;
		}
	}

	async function handleDecline() {
		loading = true;
		error = null;

		try {
			await ChurchesAPI.declineInvitation(data.token);
			declined = true;
		} catch (err) {
			console.error('Failed to decline invitation:', err);
			error = err instanceof Error ? err.message : 'Failed to decline invitation';
		} finally {
			loading = false;
		}
	}

	function getRoleData(role: string) {
		return roleInfo[role as keyof typeof roleInfo] || roleInfo.musician;
	}

	let roleData = $derived(getRoleData(data.invitation.role));
	let church = $derived(data.invitation.expand?.church_id);
	let invitedBy = $derived(data.invitation.expand?.invited_by);
</script>

<svelte:head>
	<title>Church Invitation - WorshipWise</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12">
	<div class="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
		{#if success}
			<!-- Success state -->
			<Card class="text-center">
				<div class="p-8">
					<div class="mb-4 flex justify-center">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<CheckCircle class="h-8 w-8 text-green-600" />
						</div>
					</div>
					<h2 class="mb-2 text-2xl font-semibold text-gray-900">Invitation Accepted!</h2>
					<p class="text-gray-600">
						You've successfully joined <strong>{church?.name}</strong> as a {roleData.title}.
					</p>
					<p class="mt-2 text-sm text-gray-500">Redirecting to your dashboard...</p>
				</div>
			</Card>
		{:else if declined}
			<!-- Declined state -->
			<Card class="text-center">
				<div class="p-8">
					<div class="mb-4 flex justify-center">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
							<XCircle class="h-8 w-8 text-gray-600" />
						</div>
					</div>
					<h2 class="mb-2 text-2xl font-semibold text-gray-900">Invitation Declined</h2>
					<p class="text-gray-600">
						You've declined the invitation to join <strong>{church?.name}</strong>.
					</p>
					<div class="mt-6">
						<Button href="/dashboard" variant="outline">
							Go to Dashboard
						</Button>
					</div>
				</div>
			</Card>
		{:else if expirationInfo().isExpired}
			<!-- Expired state -->
			<Card class="text-center">
				<div class="p-8">
					<div class="mb-4 flex justify-center">
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
							<AlertCircle class="h-8 w-8 text-yellow-600" />
						</div>
					</div>
					<h2 class="mb-2 text-2xl font-semibold text-gray-900">Invitation Expired</h2>
					<p class="text-gray-600">
						This invitation to join <strong>{church?.name}</strong> has expired.
					</p>
					<p class="mt-2 text-sm text-gray-500">
						Please contact {invitedBy?.name || 'the church administrator'} for a new invitation.
					</p>
					<div class="mt-6">
						<Button href="/dashboard" variant="outline">
							Go to Dashboard
						</Button>
					</div>
				</div>
			</Card>
		{:else}
			<!-- Active invitation -->
			<div class="space-y-6">
				<!-- Header -->
				<div class="text-center">
					<h1 class="text-3xl font-bold text-gray-900">You're Invited!</h1>
					<p class="mt-2 text-lg text-gray-600">
						{invitedBy?.name || 'Someone'} has invited you to join their church on WorshipWise
					</p>
				</div>

				{#if error}
					<Card class="border-red-200 bg-red-50">
						<div class="flex items-center p-4 text-sm text-red-700">
							<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
							{error}
						</div>
					</Card>
				{/if}

				<!-- Church details -->
				<Card>
					<div class="p-6">
						<div class="mb-4 flex items-start justify-between">
							<div class="flex items-start space-x-4">
								<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
									<Building class="h-6 w-6 text-blue-600" />
								</div>
								<div>
									<h2 class="text-xl font-semibold text-gray-900">{church?.name}</h2>
									{#if church?.city}
										<p class="text-sm text-gray-500">
											{church.city}{church.state ? `, ${church.state}` : ''}
										</p>
									{/if}
								</div>
							</div>
							<Badge color={roleData.color}>
								{roleData.title}
							</Badge>
						</div>

						{#if church?.description}
							<div class="mb-4 rounded-lg bg-gray-50 p-4">
								<p class="text-sm text-gray-700">{church.description}</p>
							</div>
						{/if}

						<div class="space-y-4">
							<div>
								<h3 class="mb-2 flex items-center text-sm font-medium text-gray-900">
									<UserPlus class="mr-2 h-4 w-4 text-gray-400" />
									Invited by
								</h3>
								<p class="text-sm text-gray-600">
									{invitedBy?.name || invitedBy?.email || 'Church Administrator'}
								</p>
							</div>

							<div>
								<h3 class="mb-2 flex items-center text-sm font-medium text-gray-900">
									<Mail class="mr-2 h-4 w-4 text-gray-400" />
									As a {roleData.title}, you'll be able to:
								</h3>
								<ul class="space-y-1 text-sm text-gray-600">
									{#each roleData.permissions as permission}
										<li class="flex items-start">
											<span class="mr-2 mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400"></span>
											{permission}
										</li>
									{/each}
								</ul>
							</div>

							<div>
								<h3 class="mb-2 flex items-center text-sm font-medium text-gray-900">
									<Calendar class="mr-2 h-4 w-4 text-gray-400" />
									Invitation expires
								</h3>
								<p class="text-sm text-gray-600">
									In {expirationInfo().daysRemaining} days ({expirationInfo().expiresAt.toLocaleDateString()})
								</p>
							</div>
						</div>
					</div>
				</Card>

				<!-- Actions -->
				<Card>
					<div class="p-6">
						{#if !auth.isValid}
							<div class="mb-4 rounded-lg bg-blue-50 p-4">
								<p class="text-sm text-blue-800">
									You'll need to sign in or create an account to accept this invitation.
								</p>
							</div>
						{/if}

						<div class="flex flex-col gap-3 sm:flex-row">
							<Button
								onclick={handleAccept}
								disabled={loading}
								class="flex-1"
								size="lg"
							>
								{#if loading}
									Accepting...
								{:else if !auth.isValid}
									Sign In & Accept Invitation
								{:else}
									Accept Invitation
								{/if}
							</Button>
							<Button
								onclick={handleDecline}
								variant="outline"
								disabled={loading}
								class="flex-1"
								size="lg"
							>
								{loading ? 'Declining...' : 'Decline'}
							</Button>
						</div>

						<p class="mt-4 text-center text-xs text-gray-500">
							By accepting this invitation, you agree to join {church?.name} on WorshipWise
							and grant them permission to manage your access to their church resources.
						</p>
					</div>
				</Card>
			</div>
		{/if}
	</div>
</div>