<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import AuthForm from '$lib/components/auth/AuthForm.svelte';
  import type { LoginCredentials } from '$lib/types/auth';
  
  // Redirect if already logged in
  onMount(() => {
    if (auth.isValid) {
      goto('/songs');
    }
  });
  
  async function handleLogin(data: LoginCredentials) {
    try {
      await auth.login(data);
      // Navigation is handled in the auth store
    } catch (error) {
      // Error is handled in the auth store and displayed in the form
      console.error('Login failed:', error);
    }
  }
</script>

<svelte:head>
  <title>Sign In - WorshipWise</title>
  <meta name="description" content="Sign in to your WorshipWise account" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <AuthForm
      mode="login"
      loading={auth.loading}
      error={auth.error}
      onSubmit={handleLogin}
    />
  </div>
</div>