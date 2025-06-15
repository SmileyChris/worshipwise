<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  
  // Redirect authenticated users to songs page
  onMount(() => {
    if (auth.isValid) {
      goto('/songs');
    }
  });
</script>

<svelte:head>
  <title>WorshipWise - Smart Worship Song Tracking</title>
  <meta name="description" content="Smart worship song tracking and planning for churches" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- Hero section -->
    <div class="text-center">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
        Welcome to <span class="text-blue-600">WorshipWise</span>
      </h1>
      <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
        Smart worship song tracking and planning for churches. 
        Prevent repetition, collaborate with your team, and make every service meaningful.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" size="lg">
          <a href="/login" class="text-white">Get Started</a>
        </Button>
        <Button variant="secondary" size="lg">
          <a href="/register" class="text-gray-900">Create Account</a>
        </Button>
      </div>
    </div>
    
    <!-- Features section -->
    <div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card>
        <div class="text-center">
          <div class="text-4xl mb-4">🎵</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Smart Song Library</h3>
          <p class="text-gray-600">
            Organize your worship songs with metadata, files, and usage tracking.
          </p>
        </div>
      </Card>
      
      <Card>
        <div class="text-center">
          <div class="text-4xl mb-4">📋</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Setlist Planning</h3>
          <p class="text-gray-600">
            Create and collaborate on setlists with real-time updates and team sharing.
          </p>
        </div>
      </Card>
      
      <Card>
        <div class="text-center">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Usage Analytics</h3>
          <p class="text-gray-600">
            Track song frequency and prevent repetition with intelligent recommendations.
          </p>
        </div>
      </Card>
    </div>
    
    <!-- Call to action -->
    <div class="mt-20 text-center">
      <Card class="max-w-2xl mx-auto">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          Ready to Transform Your Worship Planning?
        </h2>
        <p class="text-gray-600 mb-6">
          Join churches already using WorshipWise to streamline their worship planning and create more meaningful services.
        </p>
        <Button variant="primary" size="lg">
          <a href="/register" class="text-white">Start Free Today</a>
        </Button>
      </Card>
    </div>
  </div>
</div>
