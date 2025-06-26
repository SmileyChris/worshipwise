<script lang="ts">
	import { createChurchesAPI } from '$lib/api/churches';
	import { pb } from '$lib/api/client';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Mail, UserPlus, AlertCircle, CheckCircle } from 'lucide-svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		onsuccess?: () => void;
	}

	let { open, onclose, onsuccess }: Props = $props();

	const auth = getAuthStore();
	const churchesAPI = createChurchesAPI(pb);

	// Form state
	let email = $state('');
	let role = $state<'musician' | 'leader' | 'admin'>('musician');
	let customMessage = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	// Form validation
	let emailError = $derived(() => {
		if (!email) return null;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) ? null : 'Please enter a valid email address';
	});

	let canSubmit = $derived(email && !emailError && !loading);

	// Role descriptions
	const roleDescriptions = {
		musician: 'Can view songs, services, and participate in worship teams',
		leader: 'Can manage songs, create services, and lead worship teams',
		admin: 'Full access to all church features and settings'
	};

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!canSubmit || !auth.currentChurch) return;

		loading = true;
		error = null;
		success = false;

		try {
			const permissions = getDefaultPermissions(role);
			
			await churchesAPI.inviteUser(auth.currentChurch.id, {
				email,
				role,
				permissions
			});

			success = true;
			
			// Show success for 2 seconds then close
			setTimeout(() => {
				resetForm();
				onclose();
				onsuccess?.();
			}, 2000);
		} catch (err) {
			console.error('Failed to send invitation:', err);
			error = err instanceof Error ? err.message : 'Failed to send invitation';
		} finally {
			loading = false;
		}
	}

	function handleButtonSubmit() {
		const event = new Event('submit');
		handleSubmit(event);
	}

	function getDefaultPermissions(role: 'musician' | 'leader' | 'admin'): string[] {
		switch (role) {
			case 'admin':
				return [
					'songs:create', 'songs:edit', 'songs:delete',
					'services:create', 'services:edit', 'services:delete',
					'users:invite', 'users:manage', 'users:remove',
					'church:settings', 'church:billing'
				];
			case 'leader':
				return [
					'songs:create', 'songs:edit',
					'services:create', 'services:edit', 'services:delete',
					'users:invite'
				];
			case 'musician':
				return ['songs:view', 'services:view'];
		}
	}

	function resetForm() {
		email = '';
		role = 'musician';
		customMessage = '';
		error = null;
		success = false;
	}

	function handleClose() {
		if (!loading) {
			resetForm();
			onclose();
		}
	}

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			resetForm();
		}
	});
</script>

<Modal {open} onclose={handleClose} title="Invite New Member" size="md">
	{#snippet children()}
		{#if success}
			<div class="flex flex-col items-center py-8 text-center">
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<CheckCircle class="h-8 w-8 text-green-600" />
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">Invitation Sent!</h3>
				<p class="text-sm text-gray-600">
					An invitation email has been sent to <strong>{email}</strong>
				</p>
				<p class="mt-1 text-xs text-gray-500">
					They have 7 days to accept the invitation.
				</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-4">
				{#if error}
					<div class="flex items-center rounded-md bg-red-50 p-3 text-sm text-red-700">
						<AlertCircle class="mr-2 h-4 w-4 flex-shrink-0" />
						{error}
					</div>
				{/if}

				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
						Email Address
					</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Mail class="h-4 w-4 text-gray-400" />
						</div>
						<Input
							type="email"
							id="email"
							name="email"
							bind:value={email}
							placeholder="worship.leader@example.com"
							required
							disabled={loading}
							class="pl-9"
							autocomplete="email"
						/>
					</div>
					{#if emailError}
						<p class="mt-1 text-xs text-red-600">{emailError}</p>
					{/if}
				</div>

				<div>
					<label for="role" class="mb-1 block text-sm font-medium text-gray-700">
						Role
					</label>
					<Select
						id="role"
						name="role"
						bind:value={role}
						disabled={loading}
					>
						<option value="musician">Musician</option>
						<option value="leader">Worship Leader</option>
						<option value="admin">Administrator</option>
					</Select>
					<p class="mt-1 text-xs text-gray-500">
						{roleDescriptions[role]}
					</p>
				</div>

				<div class="rounded-md bg-blue-50 p-3">
					<div class="flex">
						<div class="flex-shrink-0">
							<UserPlus class="h-5 w-5 text-blue-400" />
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">What happens next?</h3>
							<div class="mt-2 text-xs text-blue-700">
								<ul class="list-disc space-y-1 pl-5">
									<li>They'll receive an email invitation to join {auth.currentChurch?.name}</li>
									<li>If they don't have an account, they can create one</li>
									<li>The invitation expires after 7 days</li>
									<li>You'll be notified when they accept</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</form>
		{/if}
	{/snippet}

	{#snippet footer()}
		{#if !success}
			<Button onclick={handleClose} variant="outline" disabled={loading}>
				Cancel
			</Button>
			<Button onclick={handleButtonSubmit} disabled={!canSubmit} {loading}>
				{#if loading}
					Sending...
				{:else}
					Send Invitation
				{/if}
			</Button>
		{/if}
	{/snippet}
</Modal>