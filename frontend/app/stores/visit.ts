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

  const getVisitForPOI = computed(() => (poiId: number | string) => {
    return visits.value.find(v => {
      const visitPoiId = v.poi?.data?.id || v.poi?.id
      return visitPoiId === poiId
    })
  })

  /**
   * Check if a chest is available (not on cooldown)
   */
  const isChestAvailable = computed(() => (poiId: number | string) => {
    const visit = getVisitForPOI.value(poiId)
    if (!visit) return true // Never opened = available

    const lastOpened = visit.last_opened_at || visit.attributes?.last_opened_at
    if (!lastOpened) return true

    const lastOpenedTime = new Date(lastOpened).getTime()
    const now = Date.now()
    const cooldownMs = 24 * 60 * 60 * 1000 // 24h

    return (now - lastOpenedTime) >= cooldownMs
  })

  /**
   * Get time remaining until chest is available (in milliseconds)
   */
  const getTimeUntilAvailable = computed(() => (poiId: number | string) => {
    const visit = getVisitForPOI.value(poiId)
    if (!visit) return 0

    const lastOpened = visit.last_opened_at || visit.attributes?.last_opened_at
    if (!lastOpened) return 0

    const lastOpenedTime = new Date(lastOpened).getTime()
    const now = Date.now()
    const cooldownMs = 24 * 60 * 60 * 1000
    const elapsed = now - lastOpenedTime

    if (elapsed >= cooldownMs) return 0
    return cooldownMs - elapsed
  })

  /**
   * Format time remaining as "Xh Ym"
   */
  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Disponible'

    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

    return `${hours}h ${minutes}m`
  }

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

  /**
   * Open a chest at a POI
   */
  async function openChest(poiId: string, userLat: number, userLng: number) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/visits/open-chest', {
        method: 'POST',
        body: { poiId, userLat, userLng }
      })

      const data = response.data || response

      // Update or add the visit
      const visitIndex = visits.value.findIndex(v => {
        const vId = v.documentId || v.id
        const dataId = data.visit.documentId || data.visit.id
        return vId === dataId
      })

      if (visitIndex !== -1) {
        visits.value[visitIndex] = data.visit
      } else {
        visits.value.push(data.visit)
      }

      return data.loot
    } catch (e: any) {
      console.error('Failed to open chest:', e)
      error.value = e?.message || 'Failed to open chest'
      throw e
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
    getVisitForPOI,
    isChestAvailable,
    getTimeUntilAvailable,
    formatTimeRemaining,
    // Actions
    setVisits,
    clearVisits,
    addVisit,
    updateVisit,
    fetchVisits,
    openChest,
  }
}, {
  persist: {
    pick: ['visits'],
  },
})
