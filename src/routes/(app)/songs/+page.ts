import type { PageLoad } from './$types'
import { createAuthStore } from '$lib/stores/auth.svelte'
import { createSongsAPI } from '$lib/api/songs'
import { pb } from '$lib/api/client'

export const ssr = false

export const load: PageLoad = async () => {
  // Initialize client-side auth store and ensure church context is ready
  const auth = createAuthStore()

  try {
    // If already authenticated, make sure membership context is available
    if (auth.isValid && auth.user) {
      await auth.loadProfile()
      await auth.loadUserChurches()
      await auth.loadPermissions()

      const songsApi = createSongsAPI(auth.getAuthContext(), pb)
      // Fetch active songs with expanded category to support categories view
      const songs = await songsApi.getSongs({ showRetired: false })

      return {
        preloadedSongs: songs
      }
    }
  } catch (err) {
    console.error('Songs page load error:', err)
  }

  // Fallback when unauthenticated or on error
  return {
    preloadedSongs: []
  }
}

