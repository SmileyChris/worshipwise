<script lang="ts">
  import type { PageData } from './$types'
  import { getAuthStore } from '$lib/context/stores.svelte'
  import { createSongsAPI } from '$lib/api/songs'
  import { createLabelsAPI } from '$lib/api/labels'
  import { pb } from '$lib/api/client'
  import type { Label } from '$lib/types/song'

  let { data }: { data: PageData } = $props()

  const auth = getAuthStore()

  // Make prompt generation reactive to the loaded data
  let songs = $derived(data.songs || [])
  let existingLabels = $derived((data.labels || []) as Label[])
  
  let promptText = $state('')
  let pastedResult = $state('')
  let parsedResult: Record<string, string[]> | null = $state(null)
  let parseError = $state('')
  let copyButtonText = $state('Copy to Clipboard')
  
  let processing = $state(false)
  let progressMessage = $state('')
  let successMessage = $state('')

  // Effect to update promptText when songs are loaded
  $effect(() => {
    if (songs.length > 0) {
      const songList = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist
      }))
      
      const labelList = existingLabels.map(l => l.name).join(', ')
      
      promptText = `I have a list of songs I need categorized into themes/groups. 
Please analyze the following songs and group them by common worship themes (e.g., "Praise", "Thanksgiving", "Communion", "Warfare", "Surrender", "Christmas", etc.).

I already have these existing categories (labels): ${labelList}.
Please prioritize using these existing labels if they fit. 
If a theme is very similar to an existing label, please use the existing label name exactly.
You can also create new specific themes if needed.
If you see multiple existing labels that effectively mean the same thing, you can use a single common name for them (which I can then use to merge them).

Return the result as a JSON object where keys are the specific theme names and values are arrays of song IDs belonging to that theme.
A song can belong to multiple themes.

Here is the list of songs in JSON format:
${JSON.stringify(songList, null, 2)}

Please return ONLY the valid JSON object.`
    }
  })

  function copyPrompt() {
    navigator.clipboard.writeText(promptText)
    copyButtonText = 'Copied!'
    setTimeout(() => {
      copyButtonText = 'Copy to Clipboard'
    }, 2000)
  }

  function parseInput() {
    parseError = ''
    parsedResult = null
    successMessage = ''

    if (!pastedResult) {
      return
    }

    try {
      // Find JSON usage in the text if they pasted extra text
      // This regex looks for the first { and the last }
      const cleanJsonMatch = pastedResult.match(/{[\s\S]*}/);
      const cleanJson = cleanJsonMatch ? cleanJsonMatch[0] : pastedResult;
      
      parsedResult = JSON.parse(cleanJson)
    } catch (e) {
      parseError = 'Invalid JSON: ' + (e as Error).message
    }
  }
  
  function getSongTitle(id: string) {
    const s = songs.find(s => s.id === id)
    return s ? `${s.title} (${s.artist || 'Unknown'})` : id
  }

  async function handleConfirm() {
    if (!parsedResult || !auth.user || !auth.currentChurch) return
    
    processing = true
    progressMessage = 'Initializing...'
    
    try {
      const songsApi = createSongsAPI(auth.getAuthContext(), pb)
      const labelsApi = createLabelsAPI(pb)
      
      // 1. Fetch existing labels
      progressMessage = 'Checking existing labels...'
      const existingLabels = await labelsApi.getLabels(auth.currentChurch.id)
      const labelMap = new Map<string, string>() // Name -> ID
      
      for (const label of existingLabels) {
        labelMap.set(label.name.toLowerCase(), label.id)
      }
      
      // 2. Create missing labels
      const themes = Object.keys(parsedResult)
      for (const theme of themes) {
        if (!labelMap.has(theme.toLowerCase())) {
          progressMessage = `Creating label: ${theme}...`
          const newLabel = await labelsApi.createLabel(
            { name: theme },
            auth.user.id,
            auth.currentChurch.id
          )
          labelMap.set(theme.toLowerCase(), newLabel.id)
        }
      }
      
      // 3. Prepare song updates
      progressMessage = 'Preparing song updates...'
      // Map: SongID -> Set of Label IDs to add
      const updates = new Map<string, Set<string>>()
      
      for (const [theme, songIds] of Object.entries(parsedResult)) {
        const labelId = labelMap.get(theme.toLowerCase())
        if (!labelId) continue // Should not happen
        
        for (const songId of songIds) {
           if (!updates.has(songId)) {
             updates.set(songId, new Set())
           }
           updates.get(songId)?.add(labelId)
        }
      }
      
      // 4. Apply updates
      let processedCount = 0
      const totalCount = updates.size
      
      for (const [songId, newLabelIds] of updates.entries()) {
        processedCount++
        progressMessage = `Updating song ${processedCount}/${totalCount}...`
        
        // Find current song to get existing labels
        const songIndex = songs.findIndex(s => s.id === songId)
        if (songIndex === -1) continue
        
        const existingLabelIds = songs[songIndex].labels || []
        
        // Merge labels
        const finalLabels = new Set([...existingLabelIds, ...newLabelIds])
        
        // Update if changed
        if (finalLabels.size > existingLabelIds.length) {
            await songsApi.updateSong(songId, {
                labels: Array.from(finalLabels)
            })
        }
      }
      
      progressMessage = ''
      successMessage = `Successfully processed ${themes.length} groups and updated ${processedCount} songs!`
      parsedResult = null // Clear preview
      
    } catch (err) {
      console.error('Error applying categories:', err)
      parseError = 'Error applying changes: ' + (err as Error).message
    } finally {
      processing = false
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Song Categorization AI Assistant</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">Use this tool to generate a prompt for an AI model to categorize your songs into themes (Labels).</p>
  </div>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Step 1: Get Prompt -->
    <div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Step 1: Copy Prompt</h2>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Copy this prompt and paste it into an AI (like ChatGPT, Claude, or Gemini).
        It contains {songs.length} songs.
      </p>
      
      <div class="relative flex-1">
        <textarea 
          readonly 
          class="h-96 w-full resize-none rounded-md border border-gray-300 bg-gray-50 p-4 font-mono text-xs text-gray-800 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          value={promptText}
        ></textarea>
        <button 
          onclick={copyPrompt}
          class="absolute top-2 right-2 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          {copyButtonText}
        </button>
      </div>
    </div>

    <!-- Step 2: Paste Result -->
    <div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Step 2: Paste & Parse Result</h2>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Paste the JSON response from the AI below to verify the categorization.
      </p>

      <textarea 
        bind:value={pastedResult}
        placeholder="Paste JSON here..."
        class="h-64 w-full resize-none rounded-md border border-gray-300 bg-white p-4 font-mono text-xs text-gray-800 focus:border-purple-500 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
      ></textarea>

      <div class="mt-4 flex items-center justify-between">
        <button 
          onclick={parseInput}
          class="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          disabled={processing}
        >
          Parse Response
        </button>
        {#if parseError}
          <span class="text-sm text-red-600">{parseError}</span>
        {/if}
      </div>
      
      {#if successMessage}
        <div class="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {successMessage}
        </div>
      {/if}

      {#if parsedResult && !successMessage}
        <div class="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
             <div class="flex items-center justify-between mb-4">
                 <h3 class="font-bold text-gray-900 dark:text-white">Preview Categories</h3>
                 <button
                    onclick={handleConfirm}
                    disabled={processing}
                    class="rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                 >
                    {processing ? 'Processing...' : 'Confirm & Create Labels'}
                 </button>
             </div>
             
             {#if processing}
                 <div class="mb-4 text-sm text-purple-600 font-medium animate-pulse">
                    {progressMessage}
                 </div>
             {/if}

          <div class="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900 overflow-y-auto max-h-96">
            <div class="space-y-4">
              {#each Object.entries(parsedResult) as [theme, songIds]}
                <div class="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  <div class="flex items-center justify-between mb-2">
                      <span class="font-bold text-purple-600 dark:text-purple-400">{theme}</span>
                      <span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{(songIds as any[]).length} songs</span>
                  </div>
                  <div class="pl-2 border-l-2 border-gray-100 dark:border-gray-700">
                      {#each (songIds as string[]).slice(0, 5) as id}
                          <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{getSongTitle(id)}</div>
                      {/each}
                       {#if (songIds as any[]).length > 5}
                          <div class="text-xs text-gray-400 italic mt-1">+ {(songIds as any[]).length - 5} more...</div>
                      {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
