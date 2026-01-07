import { defineStore } from 'pinia'
import type { Poi } from '~/types/poi'
import { filterByDistance } from '~/utils/geolocation'

export const usePOIStore = defineStore('poi', () => {
  // State
  const pois = ref<Poi[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasPOIs = computed(() => pois.value.length > 0)
  const poiCount = computed(() => pois.value.length)

  const getPOIById = computed(() => {
    return (documentId: string) => pois.value.find(p => p.documentId === documentId)
  })

  // Actions - Setters
  function setPOIs(data: Poi[]) {
    pois.value = data
  }

  function clearPOIs() {
    pois.value = []
    error.value = null
  }

  // Actions - API Calls
  /**
   * Fetch all POIs from the API
   */
  async function fetchAll() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/pois', {
        method: 'GET',
      })

      const data = response.data || response
      setPOIs(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch POIs:', e)
      error.value = e?.message || 'Failed to fetch POIs'
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch POIs within a specific radius from a center point.
   * This method first fetches all POIs if not already loaded, then filters them client-side.
   *
   * @param radius - Search radius in kilometers
   * @param lat - Center point latitude in degrees
   * @param lng - Center point longitude in degrees
   * @returns Array of POIs within the specified radius
   */
  async function fetchNearby(radius: number, lat: number, lng: number): Promise<Poi[]> {
    // Fetch all POIs if store is empty
    if (!hasPOIs.value) {
      await fetchAll()
    }

    // Filter by distance client-side
    return filterByDistance(pois.value, lat, lng, radius)
  }

  return {
    // State
    pois,
    loading,
    error,
    // Getters
    hasPOIs,
    poiCount,
    getPOIById,
    // Actions
    setPOIs,
    clearPOIs,
    fetchAll,
    fetchNearby,
  }
}, {
  persist: {
    pick: ['pois'],
  },
})
