<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
		loading?: boolean;
		danger?: boolean;
	}

	let {
		open,
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		onconfirm,
		oncancel,
		loading = false,
		danger = false
	}: Props = $props();

	function handleConfirm() {
		onconfirm();
	}

	function handleCancel() {
		oncancel();
	}
</script>

<Modal {open} onclose={handleCancel} size="sm">
	<div class="space-y-4">
		<!-- Icon and title -->
		<div class="flex items-center">
			<div class="flex-shrink-0">
				<div
					class="h-10 w-10 rounded-full {danger
						? 'bg-red-100'
						: 'bg-yellow-100'} flex items-center justify-center"
				>
					<span class="text-xl {danger ? 'text-red-600' : 'text-yellow-600'}">
						{danger ? '⚠️' : '❓'}
					</span>
				</div>
			</div>
			<div class="ml-4">
				<h3 class="text-lg font-medium text-gray-900">{title}</h3>
			</div>
		</div>

		<!-- Message -->
		<div class="text-sm text-gray-600">
			{message}
		</div>

		<!-- Actions -->
		<div class="flex justify-end space-x-3 pt-4">
			<Button onclick={handleCancel} variant="outline" disabled={loading}>
				{cancelLabel}
			</Button>
			<Button onclick={handleConfirm} variant={danger ? 'danger' : 'primary'} disabled={loading}>
				{loading ? 'Processing...' : confirmLabel}
			</Button>
		</div>
	</div>
</Modal>
