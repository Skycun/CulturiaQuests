import { defineStore } from 'pinia'
import type { Run } from '~/types/run'

export const useRunStore = defineStore('run', () => {
  // State
  const runs = ref<Run[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // État pour l'interaction NPC (après start-expedition avec questRolled=true)
  const lastQuestRolled = ref(false)
  const lastNpcDialog = ref<string[]>([])

  // Getters
  const hasRuns = computed(() => runs.value.length > 0)
  const runCount = computed(() => runs.value.length)

  const activeRun = computed(() => {
    return runs.value.find(r => {
      const dateEnd = r.date_end ?? r.attributes?.date_end
      return !dateEnd
    }) || null
  })

  const completedRuns = computed(() => {
    return runs.value.filter(r => {
      const dateEnd = r.date_end ?? r.attributes?.date_end
      return !!dateEnd
    })
  })

  const totalGoldEarned = computed(() => {
    return runs.value.reduce((sum, r) => {
      const gold = r.gold_earned ?? r.attributes?.gold_earned ?? 0
      return sum + gold
    }, 0)
  })

  const totalExpEarned = computed(() => {
    return runs.value.reduce((sum, r) => {
      const exp = r.xp_earned ?? r.attributes?.xp_earned ?? 0
      return sum + exp
    }, 0)
  })

  // Actions
  function setRuns(data: Run[]) {
    runs.value = data
  }

  function clearRuns() {
    runs.value = []
    error.value = null
  }

  function addRun(run: Run) {
    runs.value.push(run)
  }

  function updateRun(runId: number, updates: Partial<Run>) {
    const index = runs.value.findIndex(r => r.id === runId)
    if (index !== -1) {
      runs.value[index] = { ...runs.value[index], ...updates }
    }
  }

  async function fetchRuns() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/runs', {
        method: 'GET',
        params: {
          populate: ['museum', 'npc', 'items'],
        },
      })

      const data = response.data || response
      setRuns(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch runs:', e)
      error.value = e?.message || 'Failed to fetch runs'
    } finally {
      loading.value = false
    }
  }

  async function startExpedition(museumDocumentId: string, userLat: number, userLng: number) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/runs/start-expedition', {
        method: 'POST',
        body: { museumDocumentId, userLat, userLng },
      })

      const { run, questRolled, dialog } = response
      if (run) {
        addRun(run)
      }
      // Stocker pour la page npc-interaction
      lastQuestRolled.value = questRolled || false
      lastNpcDialog.value = dialog || []
      return { run, questRolled, dialog }
    } catch (e: any) {
      console.error('Failed to start expedition:', e)
      error.value = e?.error?.message || e?.message || 'Failed to start expedition'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function endExpedition(runDocumentId: string) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/runs/end-expedition', {
        method: 'POST',
        body: { runDocumentId },
      })

      const { run, rewards, questSuccess } = response
      
      if (run) {
        const index = runs.value.findIndex(r => r.documentId === run.documentId || r.id === run.id)
        if (index !== -1) {
          runs.value[index] = run
        } else {
          runs.value.push(run)
        }
      }
      return { run, rewards, questSuccess }
    } catch (e: any) {
      console.error('Failed to end expedition:', e)
      error.value = e?.error?.message || e?.message || 'Failed to end expedition'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveRun() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/runs/active', { method: 'GET' })
      const run = response.data || response || response.run // Handle potential nesting
      
      if (run) {
         const index = runs.value.findIndex(r => r.documentId === run.documentId || r.id === run.id)
         if (index !== -1) {
            runs.value[index] = run
         } else {
            runs.value.push(run)
         }
         return run
      }
      return null
    } catch (e: any) {
      console.error('Failed to fetch active run:', e)
      // Don't set global error for this silent check
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    runs,
    loading,
    error,
    lastQuestRolled,
    lastNpcDialog,
    // Getters
    hasRuns,
    runCount,
    activeRun,
    completedRuns,
    totalGoldEarned,
    totalExpEarned,
    // Actions
    setRuns,
    clearRuns,
    addRun,
    updateRun,
    fetchRuns,
    startExpedition,
    endExpedition,
    fetchActiveRun,
  }

})
// Persistance supprimée - les runs sont rechargés via guildStore.fetchAll()
// L'historique des runs s'accumule indéfiniment, ce qui causait l'erreur 431
// Le serveur est la source de vérité pour l'historique des sessions