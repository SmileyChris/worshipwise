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
	<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
		<div class="text-center">
			<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
				<Music class="h-6 w-6 text-blue-600" />
			</div>
			
			<h3 class="text-lg font-medium text-gray-900 mb-2">
				Welcome to WorshipWise! 🎵
			</h3>
			
			<p class="text-gray-600 mb-6 max-w-2xl mx-auto">
				Your worship song management system is ready to go. Start by adding your first songs 
				or import our sample data to explore the features.
			</p>
			
			<!-- Feature highlights -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div class="text-center p-4 bg-gray-50 rounded-lg">
					<Music class="h-8 w-8 text-blue-600 mx-auto mb-2" />
					<h4 class="font-medium text-gray-900">Song Management</h4>
					<p class="text-sm text-gray-600">Store songs with keys, tempo, files, and lyrics</p>
				</div>
				
				<div class="text-center p-4 bg-gray-50 rounded-lg">
					<Users class="h-8 w-8 text-green-600 mx-auto mb-2" />
					<h4 class="font-medium text-gray-900">Team Collaboration</h4>
					<p class="text-sm text-gray-600">Work together on setlists and song planning</p>
				</div>
				
				<div class="text-center p-4 bg-gray-50 rounded-lg">
					<BarChart3 class="h-8 w-8 text-purple-600 mx-auto mb-2" />
					<h4 class="font-medium text-gray-900">Usage Tracking</h4>
					<p class="text-sm text-gray-600">Prevent repetition with smart analytics</p>
				</div>
			</div>
			
			<!-- Action buttons -->
			<div class="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
				<Button onclick={handleImportSampleData} variant="primary">
					<Music class="w-4 h-4 mr-2" />
					Import Sample Songs
				</Button>
				
				<Button href="/songs" variant="outline">
					Add Your First Song
				</Button>
				
				<Button onclick={handleOpenWizard} variant="outline">
					<Settings class="w-4 h-4 mr-2" />
					Setup Wizard
				</Button>
			</div>
		</div>
	</div>
{/if}