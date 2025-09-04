<script lang="ts">
  import { getSongsStore, getQuickstartStore } from '$lib/context/stores.svelte';
  import DashboardSimple from '$lib/components/dashboard/DashboardSimple.svelte';
  import DashboardStandard from '$lib/components/dashboard/DashboardStandard.svelte';

  const songs = getSongsStore();
  const quickstart = getQuickstartStore();

  // Load recent songs for dashboard
  $effect(() => {
    songs.loadSongs();
  });

  // First-run criteria: no songs or setup incomplete
  let isFirstRun = $derived(songs.songs.length === 0 || !quickstart.isSetupComplete);
</script>

<svelte:head>
	<title>Dashboard - WorshipWise</title>
</svelte:head>

<!-- Dashboard content -->
{#if isFirstRun}
  <DashboardSimple />
{:else}
  <DashboardStandard />
{/if}
