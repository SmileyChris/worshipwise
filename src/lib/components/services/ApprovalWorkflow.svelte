<script lang="ts">
	import type { Service, UpdateServiceData } from '$lib/types/service';
	import { getAuthStore, getServicesStore } from '$lib/context/stores.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import TextArea from '$lib/components/ui/TextArea.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		service: Service;
		onUpdate?: () => void;
	}

	let { service, onUpdate }: Props = $props();

	const auth = getAuthStore();
	const servicesStore = getServicesStore();

	// State
	let showApprovalModal = $state(false);
	let approvalNotes = $state('');
	let approvalAction = $state<'approve' | 'reject' | 'request_changes' | null>(null);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	// Check if user can approve services
	let canApprove = $derived(auth.canManageServices);
	let isRequester = $derived(service.approval_requested_by === auth.user?.id);
	let needsApproval = $derived(
		service.approval_status === 'pending_approval' ||
		service.approval_status === 'changes_requested'
	);

	// Get approval status variant
	function getApprovalVariant(status?: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
		switch (status) {
			case 'not_required':
				return 'default';
			case 'pending_approval':
				return 'warning';
			case 'approved':
				return 'success';
			case 'rejected':
				return 'danger';
			case 'changes_requested':
				return 'warning';
			default:
				return 'default';
		}
	}

	// Request approval
	async function requestApproval() {
		if (submitting) return;

		try {
			submitting = true;
			error = null;

			const updateData: UpdateServiceData = {
				approval_status: 'pending_approval',
				approval_requested_at: new Date().toISOString(),
				approval_requested_by: auth.user?.id
			};

			await servicesStore.updateService(service.id, updateData);
			onUpdate?.();
		} catch (err) {
			error = 'Failed to request approval';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Cancel approval request
	async function cancelApprovalRequest() {
		if (submitting || !isRequester) return;

		try {
			submitting = true;
			error = null;

			const updateData: UpdateServiceData = {
				approval_status: 'not_required',
				approval_requested_at: undefined,
				approval_requested_by: undefined,
				approval_notes: undefined
			};

			await servicesStore.updateService(service.id, updateData);
			onUpdate?.();
		} catch (err) {
			error = 'Failed to cancel approval request';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Submit approval decision
	async function submitApprovalDecision() {
		if (!approvalAction || submitting) return;

		try {
			submitting = true;
			error = null;

			let newStatus: Service['approval_status'];
			switch (approvalAction) {
				case 'approve':
					newStatus = 'approved';
					break;
				case 'reject':
					newStatus = 'rejected';
					break;
				case 'request_changes':
					newStatus = 'changes_requested';
					break;
			}

			const updateData: UpdateServiceData = {
				approval_status: newStatus,
				approved_by: auth.user?.id,
				approval_date: new Date().toISOString(),
				approval_notes: approvalNotes.trim() || undefined
			};

			await servicesStore.updateService(service.id, updateData);
			showApprovalModal = false;
			approvalNotes = '';
			approvalAction = null;
			onUpdate?.();
		} catch (err) {
			error = 'Failed to submit approval decision';
			console.error(err);
		} finally {
			submitting = false;
		}
	}

	// Open approval modal
	function openApprovalModal(action: 'approve' | 'reject' | 'request_changes') {
		approvalAction = action;
		approvalNotes = '';
		showApprovalModal = true;
	}

	// Format date
	function formatDate(dateString?: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Mark service as completed
	async function markAsCompleted() {
		if (submitting) return;

		try {
			submitting = true;
			error = null;

			await servicesStore.completeService(service.id);
			onUpdate?.();
		} catch (err) {
			error = 'Failed to mark service as completed';
			console.error(err);
		} finally {
			submitting = false;
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="font-medium text-gray-900">Approval Status</h3>
		<Badge variant={getApprovalVariant(service.approval_status)}>
			{service.approval_status?.replace(/_/g, ' ') || 'Not Required'}
		</Badge>
	</div>

	{#if error}
		<div class="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
			{error}
		</div>
	{/if}

	<!-- Approval details -->
	{#if service.approval_status && service.approval_status !== 'not_required'}
		<div class="space-y-2 text-sm text-gray-600 mb-4">
			{#if service.approval_requested_at}
				<div>
					<span class="font-medium">Requested:</span>
					{' '}{formatDate(service.approval_requested_at)}
					{#if service.expand?.approval_requested_by}
						{' '}by {service.expand.approval_requested_by.name}
					{/if}
				</div>
			{/if}

			{#if service.approval_date && service.expand?.approved_by}
				<div>
					<span class="font-medium">
						{service.approval_status === 'approved' ? 'Approved' : 
						 service.approval_status === 'rejected' ? 'Rejected' : 
						 'Reviewed'}:
					</span>
					{' '}{formatDate(service.approval_date)}
					{' '}by {service.expand.approved_by.name}
				</div>
			{/if}

			{#if service.approval_notes}
				<div>
					<span class="font-medium">Notes:</span>
					<p class="mt-1 text-gray-700">{service.approval_notes}</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex flex-wrap gap-2">
		{#if service.approval_status === 'not_required' || !service.approval_status}
			{#if service.status === 'planned' || service.status === 'draft'}
				<Button
					variant="primary"
					size="sm"
					onclick={requestApproval}
					disabled={submitting}
				>
					Request Approval
				</Button>
			{/if}
			{#if service.status !== 'completed'}
				<Button
					variant="success"
					size="sm"
					onclick={markAsCompleted}
					disabled={submitting}
				>
					Mark as Completed
				</Button>
			{:else}
				<div class="text-sm text-purple-600">
					✓ Service completed
				</div>
			{/if}
		{:else if service.approval_status === 'pending_approval'}
			{#if canApprove && !isRequester}
				<Button
					variant="success"
					size="sm"
					onclick={() => openApprovalModal('approve')}
					disabled={submitting}
				>
					Approve
				</Button>
				<Button
					variant="danger"
					size="sm"
					onclick={() => openApprovalModal('reject')}
					disabled={submitting}
				>
					Reject
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => openApprovalModal('request_changes')}
					disabled={submitting}
				>
					Request Changes
				</Button>
			{/if}
			{#if isRequester}
				<Button
					variant="ghost"
					size="sm"
					onclick={cancelApprovalRequest}
					disabled={submitting}
				>
					Cancel Request
				</Button>
			{/if}
		{:else if service.approval_status === 'changes_requested'}
			{#if isRequester}
				<Button
					variant="primary"
					size="sm"
					onclick={requestApproval}
					disabled={submitting}
				>
					Re-submit for Approval
				</Button>
			{/if}
			{#if canApprove && !isRequester}
				<Button
					variant="success"
					size="sm"
					onclick={() => openApprovalModal('approve')}
					disabled={submitting}
				>
					Approve
				</Button>
				<Button
					variant="danger"
					size="sm"
					onclick={() => openApprovalModal('reject')}
					disabled={submitting}
				>
					Reject
				</Button>
			{/if}
		{:else if service.approval_status === 'approved'}
			<div class="text-sm text-green-600">
				✓ This service has been approved
			</div>
			{#if service.status !== 'completed'}
				<Button
					variant="success"
					size="sm"
					onclick={markAsCompleted}
					disabled={submitting}
				>
					Mark as Completed
				</Button>
			{:else}
				<div class="text-sm text-purple-600">
					✓ Service completed
				</div>
			{/if}
		{:else if service.approval_status === 'rejected'}
			<div class="text-sm text-red-600">
				✗ This service was rejected
			</div>
			{#if isRequester}
				<Button
					variant="primary"
					size="sm"
					onclick={requestApproval}
					disabled={submitting}
				>
					Re-submit for Approval
				</Button>
			{/if}
		{/if}
	</div>
</div>

<!-- Approval modal -->
<Modal 
	open={showApprovalModal} 
	title={
		approvalAction === 'approve' ? 'Approve Service' :
		approvalAction === 'reject' ? 'Reject Service' :
		'Request Changes'
	}
	onclose={() => (showApprovalModal = false)}
>
	<div class="space-y-4">
		<p class="text-sm text-gray-600">
			{#if approvalAction === 'approve'}
				Are you sure you want to approve this service?
			{:else if approvalAction === 'reject'}
				Are you sure you want to reject this service?
			{:else}
				What changes need to be made to this service?
			{/if}
		</p>

		<div>
			<label for="approval-notes" class="block text-sm font-medium text-gray-700 mb-1">
				{approvalAction === 'request_changes' ? 'Required Changes' : 'Notes (optional)'}
			</label>
			<TextArea
				id="approval-notes"
				value={approvalNotes}
				oninput={(e) => approvalNotes = (e.target as HTMLTextAreaElement).value}
				rows={4}
				placeholder={
					approvalAction === 'request_changes'
						? 'Describe what changes are needed...'
						: 'Add any notes about this decision...'
				}
				required={approvalAction === 'request_changes'}
			/>
		</div>

		<div class="flex justify-end gap-3">
			<Button
				variant="ghost"
				onclick={() => (showApprovalModal = false)}
				disabled={submitting}
			>
				Cancel
			</Button>
			<Button
				variant={
					approvalAction === 'approve' ? 'success' :
					approvalAction === 'reject' ? 'danger' :
					'outline'
				}
				onclick={submitApprovalDecision}
				disabled={submitting || (approvalAction === 'request_changes' && !approvalNotes.trim())}
			>
				{#if submitting}
					Submitting...
				{:else if approvalAction === 'approve'}
					Approve Service
				{:else if approvalAction === 'reject'}
					Reject Service
				{:else}
					Request Changes
				{/if}
			</Button>
		</div>
	</div>
</Modal>