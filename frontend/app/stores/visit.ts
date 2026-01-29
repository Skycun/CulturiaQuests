import { defineStore } from 'pinia'
import type { Visit } from '~/types/visit'

export const useVisitStore = defineStore('visit', () => {
  // State
  const visits = ref<Visit[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasVisits = computed(() => visits.value.length > 0)
  const visitCount = computed(() => visits.value.length)

  const totalGoldEarned = computed(() => {
    return visits.value.reduce((sum, v) => {
      const gold = v.total_gold_earned ?? v.attributes?.total_gold_earned ?? 0
      return sum + gold
    }, 0)
  })

  const totalExpEarned = computed(() => {
    return visits.value.reduce((sum, v) => {
      const exp = v.total_exp_earned ?? v.attributes?.total_exp_earned ?? 0
      return sum + exp
    }, 0)
  })

  // Actions
  function setVisits(data: Visit[]) {
    visits.value = data
  }

  function clearVisits() {
    visits.value = []
    error.value = null
  }

  function addVisit(visit: Visit) {
    visits.value.push(visit)
  }

  function updateVisit(visitId: number, updates: Partial<Visit>) {
    const index = visits.value.findIndex(v => v.id === visitId)
    if (index !== -1) {
      visits.value[index] = { ...visits.value[index], ...updates }
    }
  }

  async function fetchVisits() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/visits', {
        method: 'GET',
        params: {
          populate: ['poi', 'items'],
        },
      })

      const data = response.data || response
      setVisits(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch visits:', e)
      error.value = e?.message || 'Failed to fetch visits'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    visits,
    loading,
    error,
    // Getters
    hasVisits,
    visitCount,
    totalGoldEarned,
    totalExpEarned,
    // Actions
    setVisits,
    clearVisits,
    addVisit,
    updateVisit,
    fetchVisits,
  }
})
// Persistance supprimée - les visits sont rechargés via guildStore.fetchAll()
// L'historique des visites s'accumule, ce qui causait l'erreur 431
// Le serveur est la source de vérité pour l'historique des visites
