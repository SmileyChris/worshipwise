<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStore, getSkillsStore } from '$lib/context/stores.svelte';
	import type { Skill } from '$lib/types/permissions';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { Plus, Edit2, Trash2, Music, Users } from 'lucide-svelte';

	const auth = getAuthStore();
	const skillsStore = getSkillsStore();

	// Reactive state from store
	let skills = $derived(skillsStore.skills);
	let loading = $derived(skillsStore.loading);
	let error = $derived(skillsStore.error);

	// Local UI state
	let showCreateModal = $state(false);
	let editingSkill = $state<Skill | null>(null);
	let deletingSkill = $state<Skill | null>(null);

	// Form state
	let formData = $state({
		name: '',
		slug: ''
	});

	// Common skill suggestions
	const skillSuggestions = [
		{ name: 'Guitarist', slug: 'guitarist', icon: '🎸' },
		{ name: 'Bassist', slug: 'bassist', icon: '🎸' },
		{ name: 'Drummer', slug: 'drummer', icon: '🥁' },
		{ name: 'Pianist', slug: 'pianist', icon: '🎹' },
		{ name: 'Keyboard', slug: 'keyboard', icon: '🎹' },
		{ name: 'Vocalist', slug: 'vocalist', icon: '🎤' },
		{ name: 'Sound Tech', slug: 'sound-tech', icon: '🎛️' },
		{ name: 'Media/Slides', slug: 'media-slides', icon: '📺' },
		{ name: 'Lighting', slug: 'lighting', icon: '💡' }
	];

	function startCreateSkill() {
		formData = {
			name: '',
			slug: ''
		};
		showCreateModal = true;
	}

	function startEditSkill(skill: Skill) {
		formData = {
			name: skill.name,
			slug: skill.slug
		};
		editingSkill = skill;
	}

	function useSuggestion(suggestion: (typeof skillSuggestions)[0]) {
		formData.name = suggestion.name;
		formData.slug = suggestion.slug;
	}

	async function handleCreateSkill() {
		if (!formData.name || !formData.slug) return;

		try {
			await skillsStore.createSkill({
				name: formData.name,
				slug: formData.slug
			});
			showCreateModal = false;
		} catch (err) {
			console.error('Failed to create skill:', err);
		}
	}

	async function handleUpdateSkill() {
		if (!editingSkill) return;

		try {
			await skillsStore.updateSkill(editingSkill.id, {
				name: formData.name
			});
			editingSkill = null;
		} catch (err) {
			console.error('Failed to update skill:', err);
		}
	}

	async function handleDeleteSkill() {
		if (!deletingSkill) return;

		try {
			await skillsStore.deleteSkill(deletingSkill.id);
			deletingSkill = null;
		} catch (err) {
			console.error('Failed to delete skill:', err);
		}
	}

	// Generate slug from name
	function generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	// Update slug when name changes (only for new skills)
	$effect(() => {
		if (showCreateModal && formData.name && !editingSkill) {
			formData.slug = generateSlug(formData.name);
		}
	});

	// Count users with skill
	async function getUserCount(skillId: string): Promise<number> {
		try {
			const users = await skillsStore.getUsersBySkill(skillId);
			return users.length;
		} catch {
			return 0;
		}
	}

	// Get icon for skill
	function getSkillIcon(skill: Skill): string {
		if (skill.slug === 'leader') return '👑';
		const suggestion = skillSuggestions.find((s) => s.slug === skill.slug);
		return suggestion?.icon || '🎵';
	}

	onMount(() => {
		if (auth.currentChurch) {
			skillsStore.loadSkills();

			// Set up real-time updates
			const unsubscribePromise = skillsStore.subscribeToUpdates();

			return () => {
				unsubscribePromise.then((unsubscribe) => {
					if (unsubscribe) unsubscribe();
				});
			};
		}
	});
</script>

<svelte:head>
	<title>Skill Management - WorshipWise</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-gray-900">Skill Management</h1>
			<p class="mt-1 text-sm text-gray-500">
				Define worship team positions and skills for service planning
			</p>
		</div>
		<Button onclick={startCreateSkill} disabled={loading}>
			<Plus class="mr-2 h-4 w-4" />
			Add Skill
		</Button>
	</div>

	<!-- Error Message -->
	{#if error}
		<Card>
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-red-800">{error}</p>
			</div>
		</Card>
	{/if}

	<!-- Skills List -->
	{#if loading && skills.length === 0}
		<Card>
			<div class="p-8 text-center">
				<div class="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-b-2"></div>
				<p class="mt-2 text-sm text-gray-500">Loading skills...</p>
			</div>
		</Card>
	{:else if skills.length === 0}
		<Card>
			<div class="p-8 text-center">
				<Music class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900">No skills yet</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by adding worship team skills.</p>
				<div class="mt-6">
					<Button onclick={startCreateSkill}>
						<Plus class="mr-2 h-4 w-4" />
						Add Skill
					</Button>
				</div>
			</div>
		</Card>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each skills as skill (skill.id)}
				{@const userCount = getUserCount(skill.id)}
				<Card>
					<div class="p-4">
						<div class="flex items-start justify-between">
							<div class="flex items-center">
								<span class="mr-3 text-2xl">{getSkillIcon(skill)}</span>
								<div>
									<h3 class="text-base font-medium text-gray-900">{skill.name}</h3>
									<p class="text-xs text-gray-500">{skill.slug}</p>
								</div>
							</div>
							{#if skill.is_builtin}
								<Badge variant="secondary" size="sm">Built-in</Badge>
							{/if}
						</div>

						<div class="mt-4 flex items-center justify-between">
							<div class="flex items-center text-sm text-gray-500">
								<Users class="mr-1 h-4 w-4" />
								{#await userCount}
									<span class="inline-block h-4 w-8 animate-pulse rounded bg-gray-200"></span>
								{:then count}
									{count}
								{/await}
							</div>
							<div class="flex items-center gap-1">
								{#if skill.slug !== 'leader' || !skill.is_builtin}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => startEditSkill(skill)}
										disabled={loading}
									>
										<Edit2 class="h-4 w-4" />
									</Button>
								{/if}
								{#if !skill.is_builtin}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => (deletingSkill = skill)}
										disabled={loading}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- Suggestions Section -->
	{#if skills.length > 0}
		<Card>
			<div class="p-6">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Quick Add Common Skills</h3>
				<div class="flex flex-wrap gap-2">
					{#each skillSuggestions as suggestion}
						{@const exists = skills.some((s) => s.slug === suggestion.slug)}
						<Button
							variant={exists ? 'outline' : 'secondary'}
							size="sm"
							disabled={exists || loading}
							onclick={() => {
								if (!exists) {
									useSuggestion(suggestion);
									handleCreateSkill();
								}
							}}
						>
							<span class="mr-1">{suggestion.icon}</span>
							{suggestion.name}
							{#if exists}
								<span class="ml-1 text-xs">✓</span>
							{/if}
						</Button>
					{/each}
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Create Skill Modal -->
<Modal open={showCreateModal} title="Add New Skill" onclose={() => (showCreateModal = false)}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleCreateSkill();
		}}
	>
		<div class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700">Name</label>
				<Input
					id="name"
					name="name"
					bind:value={formData.name}
					placeholder="e.g., Lead Guitarist"
					required
				/>
			</div>

			<div>
				<label for="slug" class="block text-sm font-medium text-gray-700">Slug</label>
				<Input
					id="slug"
					name="slug"
					bind:value={formData.slug}
					placeholder="e.g., lead-guitarist"
					required
				/>
				<p class="mt-1 text-xs text-gray-500">
					Lowercase letters, numbers, and hyphens only. This cannot be changed later.
				</p>
			</div>

			<!-- Suggestions -->
			<div>
				<p class="mb-2 text-sm text-gray-600">Common skills:</p>
				<div class="flex flex-wrap gap-2">
					{#each skillSuggestions.slice(0, 6) as suggestion}
						{@const exists = skills.some((s) => s.slug === suggestion.slug)}
						<button
							type="button"
							disabled={exists}
							onclick={() => useSuggestion(suggestion)}
							class="inline-flex items-center rounded-md px-2 py-1 text-xs {exists
								? 'cursor-not-allowed bg-gray-100 text-gray-400'
								: 'bg-blue-50 text-blue-700 hover:bg-blue-100'}"
						>
							{suggestion.icon}
							{suggestion.name}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="mt-6 flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={() => (showCreateModal = false)}>
				Cancel
			</Button>
			<Button type="submit" disabled={loading || !formData.name || !formData.slug}>
				Add Skill
			</Button>
		</div>
	</form>
</Modal>

<!-- Edit Skill Modal -->
{#if editingSkill}
	<Modal open={!!editingSkill} title="Edit Skill" onclose={() => (editingSkill = null)}>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleUpdateSkill();
			}}
		>
			<div class="space-y-4">
				<div>
					<label for="edit-name" class="block text-sm font-medium text-gray-700">Name</label>
					<Input id="edit-name" name="edit-name" bind:value={formData.name} required />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700">Slug</label>
					<p class="mt-1 text-sm text-gray-500">{editingSkill.slug} (cannot be changed)</p>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<Button type="button" variant="outline" onclick={() => (editingSkill = null)}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading || !formData.name}>Update Skill</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingSkill}
	<Modal open={!!deletingSkill} title="Delete Skill" onclose={() => (deletingSkill = null)}>
		<p class="text-sm text-gray-600">
			Are you sure you want to delete the skill "{deletingSkill.name}"? This action cannot be
			undone.
		</p>
		{#await getUserCount(deletingSkill.id) then count}
			{#if count > 0}
				<p class="mt-2 text-sm text-red-600">
					Warning: This skill is currently assigned to {count} team {count === 1
						? 'member'
						: 'members'}. You must remove this skill from all members before deleting it.
				</p>
			{/if}
		{/await}

		<div class="mt-6 flex justify-end gap-3">
			<Button variant="outline" onclick={() => (deletingSkill = null)}>Cancel</Button>
			<Button variant="danger" onclick={handleDeleteSkill} disabled={loading}>Delete Skill</Button>
		</div>
	</Modal>
{/if}
