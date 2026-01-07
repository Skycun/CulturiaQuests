import { defineStore } from 'pinia'
import type { Museum } from '~/types/museum'
import { filterByDistance } from '~/utils/geolocation'

export const useMuseumStore = defineStore('museum', () => {
  // State
  const museums = ref<Museum[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasMuseums = computed(() => museums.value.length > 0)
  const museumCount = computed(() => museums.value.length)

  const getMuseumById = computed(() => {
    return (documentId: string) => museums.value.find(m => m.documentId === documentId)
  })

  // Actions - Setters
  function setMuseums(data: Museum[]) {
    museums.value = data
  }

  function clearMuseums() {
    museums.value = []
    error.value = null
  }

  // Actions - API Calls
  /**
   * Fetch all museums from the API
   */
  async function fetchAll() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/museums', {
        method: 'GET',
      })

      const data = response.data || response
      setMuseums(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch museums:', e)
      error.value = e?.message || 'Failed to fetch museums'
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch museums within a specific radius from a center point.
   * This method first fetches all museums if not already loaded, then filters them client-side.
   *
   * @param radius - Search radius in kilometers
   * @param lat - Center point latitude in degrees
   * @param lng - Center point longitude in degrees
   * @returns Array of museums within the specified radius
   */
  async function fetchNearby(radius: number, lat: number, lng: number): Promise<Museum[]> {
    // Fetch all museums if store is empty
    if (!hasMuseums.value) {
      await fetchAll()
    }

    // Filter by distance client-side
    return filterByDistance(museums.value, lat, lng, radius)
  }

  return {
    // State
    museums,
    loading,
    error,
    // Getters
    hasMuseums,
    museumCount,
    getMuseumById,
    // Actions
    setMuseums,
    clearMuseums,
    fetchAll,
    fetchNearby,
  }
}, {
  persist: {
    pick: ['museums'],
  },
})
