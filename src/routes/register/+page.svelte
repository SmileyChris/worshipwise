<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import AuthForm from '$lib/components/auth/AuthForm.svelte';
	import type { RegisterData } from '$lib/types/auth';

	// Redirect if already logged in
	onMount(() => {
		if (auth.isValid) {
			goto('/dashboard');
		}
	});

	async function handleRegister(data: RegisterData) {
		try {
			await auth.register(data);
			// Navigation is handled in the auth store
		} catch (error) {
			// Error is handled in the auth store and displayed in the form
			console.error('Registration failed:', error);
		}
	}
</script>

<svelte:head>
	<title>Create Account - WorshipWise</title>
	<meta name="description" content="Create your WorshipWise account" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<AuthForm mode="register" loading={auth.loading} error={auth.error} onSubmit={handleRegister} />
	</div>
</div>
