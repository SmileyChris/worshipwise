<script lang="ts">
	import { onMount } from 'svelte';
	import type { Skill, UserSkill } from '$lib/types/permissions';
	import type { ServiceTeamSkills } from '$lib/types/service';
	import type { User } from '$lib/types/auth';
	import { createSkillsAPI, type SkillsAPI } from '$lib/api/skills';
	import { pb } from '$lib/api/client';
	import { getAuthStore } from '$lib/context/stores.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { Users, Music } from 'lucide-svelte';

	interface Props {
		teamSkills?: ServiceTeamSkills;
		worshipLeader?: string;
		onchange?: (teamSkills: ServiceTeamSkills) => void;
	}

	let { teamSkills = {}, worshipLeader, onchange }: Props = $props();

	const auth = getAuthStore();
	let skillsAPI: SkillsAPI;

	// State
	let skills = $state<Skill[]>([]);
	let usersBySkill = $state<Record<string, UserSkill[]>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Local copy of team assignments
	let localTeamSkills = $state<ServiceTeamSkills>({ ...teamSkills });

	// Initialize API
	$effect(() => {
		if (auth.currentChurch) {
			skillsAPI = createSkillsAPI(auth.getAuthContext(), pb);
		}
	});

	// Load skills and users
	async function loadSkillsAndUsers() {
		if (!skillsAPI) return;

		try {
			loading = true;
			error = null;

			// Load all skills
			skills = await skillsAPI.getSkills();

			// Load users for each skill
			const usersMap: Record<string, UserSkill[]> = {};
			for (const skill of skills) {
				const users = await skillsAPI.getUsersBySkill(skill.id);
				usersMap[skill.id] = users;
			}
			usersBySkill = usersMap;

			// Initialize local team skills with existing data
			localTeamSkills = { ...teamSkills };
		} catch (err) {
			console.error('Failed to load skills and users:', err);
			error = err instanceof Error ? err.message : 'Failed to load team data';
		} finally {
			loading = false;
		}
	}

	// Update parent when selection changes
	function handleSkillAssignment(skillId: string, userId: string) {
		if (userId) {
			localTeamSkills = { ...localTeamSkills, [skillId]: userId };
		} else {
			// Remove the assignment if no user selected
			const { [skillId]: _, ...rest } = localTeamSkills;
			localTeamSkills = rest;
		}
		onchange?.(localTeamSkills);
	}

	// Get skill icon
	function getSkillIcon(skill: Skill): string {
		const iconMap: Record<string, string> = {
			'leader': '👑',
			'guitarist': '🎸',
			'bassist': '🎸',
			'drummer': '🥁',
			'pianist': '🎹',
			'keyboard': '🎹',
			'vocalist': '🎤',
			'sound-tech': '🎛️',
			'media-slides': '📺',
			'lighting': '💡'
		};
		return iconMap[skill.slug] || '🎵';
	}

	// Check if user is already assigned to another skill
	function isUserAssignedElsewhere(userId: string, currentSkillId: string): boolean {
		return Object.entries(localTeamSkills).some(
			([skillId, assignedUserId]) => skillId !== currentSkillId && assignedUserId === userId
		);
	}

	// Get user display name
	function getUserName(userSkill: UserSkill): string {
		return userSkill.expand?.user_id?.name || userSkill.expand?.user_id?.email || 'Unknown';
	}

	onMount(() => {
		loadSkillsAndUsers();
	});

	// Update local state when props change
	$effect(() => {
		localTeamSkills = { ...teamSkills };
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between mb-2">
		<h3 class="text-sm font-medium text-gray-700 flex items-center">
			<Users class="h-4 w-4 mr-2" />
			Team Assignments
		</h3>
		{#if loading}
			<span class="text-xs text-gray-500">Loading...</span>
		{/if}
	</div>

	{#if error}
		<div class="p-3 bg-red-50 border border-red-200 rounded-md">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if loading}
		<div class="space-y-2">
			{#each Array(3) as _}
				<div class="h-10 bg-gray-100 rounded animate-pulse"></div>
			{/each}
		</div>
	{:else if skills.length === 0}
		<div class="text-center py-6 text-gray-500">
			<Music class="h-8 w-8 mx-auto mb-2 text-gray-400" />
			<p class="text-sm">No skills defined yet.</p>
			<a href="/admin/skills" class="text-sm text-blue-600 hover:text-blue-500 mt-1">
				Manage Skills →
			</a>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each skills as skill (skill.id)}
				{@const availableUsers = usersBySkill[skill.id] || []}
				{@const isLeaderSkill = skill.slug === 'leader'}
				{@const currentAssignment = localTeamSkills[skill.id]}
				
				<div class="flex items-center space-x-3">
					<span class="text-lg" title={skill.name}>{getSkillIcon(skill)}</span>
					<div class="flex-1">
						<label for={`skill-${skill.id}`} class="block text-sm font-medium text-gray-700">
							{skill.name}
							{#if skill.is_builtin}
								<Badge variant="secondary" size="sm">Required</Badge>
							{/if}
						</label>
						{#if isLeaderSkill && worshipLeader}
							<!-- Leader skill is pre-assigned to worship leader -->
							<p class="text-sm text-gray-600 mt-1">
								{#await pb.collection('users').getOne(worshipLeader)}
									Worship Leader
								{:then leader}
									{leader.name || leader.email}
								{/await}
							</p>
						{:else}
							<select
								id={`skill-${skill.id}`}
								value={currentAssignment || ''}
								onchange={(e) => handleSkillAssignment(skill.id, e.currentTarget.value)}
								class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
								disabled={isLeaderSkill && !!worshipLeader}
							>
								<option value="">Unassigned</option>
								{#each availableUsers as userSkill}
									{@const isAssigned = isUserAssignedElsewhere(userSkill.user_id, skill.id)}
									<option 
										value={userSkill.user_id} 
										disabled={isAssigned}
									>
										{getUserName(userSkill)}
										{#if isAssigned}
											(Already assigned)
										{/if}
									</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-4 text-xs text-gray-500">
			<p>Team members can only be assigned to one position per service.</p>
			{#if Object.keys(localTeamSkills).length === 0}
				<p class="mt-1">No team members assigned yet.</p>
			{/if}
		</div>
	{/if}
</div>