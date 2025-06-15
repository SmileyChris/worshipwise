<script lang="ts">
  import { auth } from '$lib/stores/auth.svelte';
  import { page } from '$app/stores';
  import Button from '$lib/components/ui/Button.svelte';
  
  // Navigation items based on user role
  let navigationItems = $derived(() => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { name: 'Songs', href: '/songs', icon: '🎵' },
      { name: 'Setlists', href: '/setlists', icon: '📋' }
    ];
    
    // Add analytics for leaders and admins
    if (auth.canManageSetlists) {
      items.push({ name: 'Analytics', href: '/analytics', icon: '📊' });
    }
    
    // Add admin section for admins only
    if (auth.isAdmin) {
      items.push({ name: 'Admin', href: '/admin', icon: '⚙️' });
    }
    
    return items;
  });
  
  let currentPath = $state('');
  
  // Subscribe to page changes
  $effect(() => {
    page.subscribe(p => {
      currentPath = p.url.pathname;
    });
  });
  
  function isCurrentPage(href: string): boolean {
    return currentPath === href || currentPath.startsWith(href + '/');
  }
  
  async function handleLogout() {
    await auth.logout();
  }
</script>

<nav class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <!-- Logo and primary navigation -->
      <div class="flex">
        <div class="flex-shrink-0 flex items-center">
          <a href="/dashboard" class="text-xl font-bold text-blue-600">
            WorshipWise
          </a>
        </div>
        
        <!-- Navigation links -->
        <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
          {#each navigationItems as item}
            <a
              href={item.href}
              class="inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors {
                isCurrentPage(item.href)
                  ? 'border-b-2 border-blue-500 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }"
            >
              <span class="mr-2">{item.icon}</span>
              {item.name}
            </a>
          {/each}
        </div>
      </div>
      
      <!-- User menu -->
      <div class="flex items-center space-x-4">
        <!-- User info -->
        <div class="hidden sm:flex sm:items-center sm:space-x-2">
          <div class="text-sm">
            <p class="text-gray-900 font-medium">{auth.displayName}</p>
            <p class="text-gray-500 text-xs capitalize">{auth.user?.role}</p>
          </div>
        </div>
        
        <!-- User menu dropdown (simplified for now) -->
        <div class="relative">
          <Button
            variant="ghost"
            size="sm"
            onclick={handleLogout}
            class="text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Mobile navigation menu (simplified) -->
  <div class="sm:hidden">
    <div class="pt-2 pb-3 space-y-1">
      {#each navigationItems as item}
        <a
          href={item.href}
          class="block pl-3 pr-4 py-2 text-base font-medium transition-colors {
            isCurrentPage(item.href)
              ? 'bg-blue-50 border-r-4 border-blue-500 text-blue-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }"
        >
          <span class="mr-2">{item.icon}</span>
          {item.name}
        </a>
      {/each}
    </div>
    
    <!-- Mobile user section -->
    <div class="pt-4 pb-3 border-t border-gray-200">
      <div class="flex items-center px-4">
        <div class="flex-shrink-0">
          <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span class="text-sm font-medium text-blue-600">
              {auth.displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div class="ml-3">
          <div class="text-base font-medium text-gray-800">{auth.displayName}</div>
          <div class="text-sm text-gray-500 capitalize">{auth.user?.role}</div>
        </div>
      </div>
      <div class="mt-3 space-y-1">
        <button
          onclick={handleLogout}
          class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
</nav>