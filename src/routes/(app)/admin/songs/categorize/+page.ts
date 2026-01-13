import type { PageLoad } from './$types'
import { createAuthStore } from '$lib/stores/auth.svelte'
import { createSongsAPI } from '$lib/api/songs'
import { pb } from '$lib/api/client'
import { createLabelsAPI } from '$lib/api/labels'

export const load: PageLoad = async () => {
  const auth = createAuthStore()

  try {
    if (auth.isValid && auth.user) {
      await auth.loadProfile()
      await auth.loadUserChurches()
      
      const authContext = auth.getAuthContext()
      const songsApi = createSongsAPI(authContext, pb)
      const labelsApi = createLabelsAPI(pb)

      const [songs, labels] = await Promise.all([
        songsApi.getSongs({ showRetired: false }),
        authContext.currentChurch ? labelsApi.getLabels(authContext.currentChurch.id) : []
      ])

      return {
        songs,
        labels
      }
    }
  } catch (err) {
    console.error('Categorize songs page load error:', err)
  }

  return {
    songs: [],
    labels: []
  }
}
