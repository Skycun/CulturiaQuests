import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Interface defining the shape of our statistics
export interface GuildStatistics {
  totalExpeditions: number
  totalTime: number // in milliseconds
  maxFloor: number
  totalDamage: number
  totalPoiVisits: number
  totalDistinctPois: number
  mostVisitedPoiName: string | null
  totalItemsCollected: number
  totalItemsScrapped: number
  totalScrapAccumulated: number
  totalExp: number
  totalGold: number
  accountDays: number
}

export const useStatisticsStore = defineStore('statistics', () => {
  // --- State ---
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Initialize individual refs for each stat to allow fine-grained reactivity
  const totalExpeditions = ref(0)
  const totalTime = ref(0)
  const maxFloor = ref(0)
  const totalDamage = ref(0)
  const totalPoiVisits = ref(0)
  const totalDistinctPois = ref(0)
  const mostVisitedPoiName = ref<string | null>(null)
  const totalItemsCollected = ref(0)
  const totalItemsScrapped = ref(0)
  const totalScrapAccumulated = ref(0)
  const totalExp = ref(0)
  const totalGold = ref(0)
  const accountDays = ref(0)

  // --- Getters (Computed) ---
  // Formatted getters for display purposes
  const formattedTotalTime = computed(() => {
    const ms = totalTime.value
    const seconds = Math.floor(ms / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  })

  const formattedTotalDamage = computed(() => {
    const val = totalDamage.value
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
    return Math.floor(val).toString()
  })

  const formattedTotalExp = computed(() => {
    const val = totalExp.value
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k'
    return Math.floor(val).toString()
  })

  // --- Actions ---

  /**
   * Fetches aggregated statistics from the backend.
   * This replaces the previous heavy client-side calculation.
   */
  async function fetchStatistics() {
    isLoading.value = true
    error.value = null
    const client = useStrapiClient()

    try {
      const response = await client<GuildStatistics>('/statistics/summary', {
        method: 'GET'
      })

      const data = response || {}

      totalExpeditions.value = data.totalExpeditions || 0
      totalTime.value = data.totalTime || 0
      maxFloor.value = data.maxFloor || 0
      totalDamage.value = data.totalDamage || 0
      totalPoiVisits.value = data.totalPoiVisits || 0
      totalDistinctPois.value = data.totalDistinctPois || 0
      mostVisitedPoiName.value = data.mostVisitedPoiName || null
      totalItemsCollected.value = data.totalItemsCollected || 0
      totalItemsScrapped.value = data.totalItemsScrapped || 0
      totalScrapAccumulated.value = data.totalScrapAccumulated || 0
      totalExp.value = data.totalExp || 0
      totalGold.value = data.totalGold || 0
      accountDays.value = data.accountDays || 0

    } catch (e: any) {
      console.error('Error fetching statistics:', e)
      error.value = e.message || 'Error fetching statistics'
    } finally {
      isLoading.value = false
    }
  }

  function clearStatistics() {
    totalExpeditions.value = 0
    totalTime.value = 0
    maxFloor.value = 0
    totalDamage.value = 0
    totalPoiVisits.value = 0
    totalDistinctPois.value = 0
    mostVisitedPoiName.value = null
    totalItemsCollected.value = 0
    totalItemsScrapped.value = 0
    totalScrapAccumulated.value = 0
    totalExp.value = 0
    totalGold.value = 0
    accountDays.value = 0
    error.value = null
  }

  return {
    // State
    isLoading,
    error,
    totalExpeditions,
    totalTime,
    maxFloor,
    totalDamage,
    totalPoiVisits,
    totalDistinctPois,
    mostVisitedPoiName,
    totalItemsCollected,
    totalItemsScrapped,
    totalScrapAccumulated,
    totalExp,
    totalGold,
    accountDays,

    // Getters
    formattedTotalTime,
    formattedTotalDamage,
    formattedTotalExp,

    // Actions
    fetchStatistics,
    clearStatistics
  }
})

