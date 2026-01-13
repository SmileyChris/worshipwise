<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ServiceBuilder from '$lib/components/services/ServiceBuilder.svelte';

	let serviceId = $derived($page.params.id);

	function handleClose() {
		goto('/services');
	}
</script>

<svelte:head>
	<title>Service Details - WorshipWise</title>
</svelte:head>

<div class="h-[calc(100vh-4rem)]">
	<ServiceBuilder {serviceId} onClose={handleClose} />
</div>
