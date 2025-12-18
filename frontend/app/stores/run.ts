import { defineStore } from 'pinia'
import type { Run } from '~/types/run'

export const useRunStore = defineStore('run', () => {
  // State
  const runs = ref<Run[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  return {
    // State
    runs,
    loading,
    error,
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
  }
}, {
  persist: {
    pick: ['runs'],
  },
})
