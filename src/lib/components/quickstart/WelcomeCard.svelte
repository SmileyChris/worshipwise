<script lang="ts">
	import { quickstartStore } from '$lib/stores/quickstart.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Music, Users, BarChart3, Settings } from 'lucide-svelte';

	const store = quickstartStore;

	function handleOpenWizard() {
		store.showSetupWizard = true;
	}

	function handleImportSampleData() {
		store.executeStep('sample-data');
	}
</script>

{#if !store.systemStatus.songsExist && store.systemStatus.usersExist}
	<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
				<Music class="h-6 w-6 text-blue-600" />
			</div>

			<h3 class="mb-2 text-lg font-medium font-title text-gray-900">Welcome to WorshipWise! 🎵</h3>

			<p class="mx-auto mb-6 max-w-2xl text-gray-600">
				Your worship team's complete song management solution. Organize your repertoire, 
				prevent song repetition, and collaborate seamlessly on service planning.
			</p>

			<!-- Feature highlights -->
			<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<div class="rounded-lg bg-gray-50 p-4 text-center">
					<Music class="mx-auto mb-2 h-8 w-8 text-blue-600" />
					<h4 class="font-medium font-title text-gray-900">Smart Song Library</h4>
					<p class="text-sm text-gray-600">Organize songs with keys, lyrics, chord charts, and audio files</p>
				</div>

				<div class="rounded-lg bg-gray-50 p-4 text-center">
					<Users class="mx-auto mb-2 h-8 w-8 text-green-600" />
					<h4 class="font-medium font-title text-gray-900">Team Setlists</h4>
					<p class="text-sm text-gray-600">Build worship sets together with real-time collaboration</p>
				</div>

				<div class="rounded-lg bg-gray-50 p-4 text-center">
					<BarChart3 class="mx-auto mb-2 h-8 w-8 text-purple-600" />
					<h4 class="font-medium font-title text-gray-900">Repetition Prevention</h4>
					<p class="text-sm text-gray-600">Track usage and get alerts to keep services fresh</p>
				</div>
			</div>

			<!-- Action buttons -->
			<div class="flex flex-col justify-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
				<Button onclick={handleImportSampleData} variant="primary">
					<Music class="mr-2 h-4 w-4" />
					Import Sample Songs
				</Button>

				<a
					href="/songs"
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
				>
					Add Your First Song
				</a>

				<Button onclick={handleOpenWizard} variant="secondary">
					<Settings class="mr-2 h-4 w-4" />
					Setup Wizard
				</Button>
			</div>
		</div>
	</div>
{/if}
