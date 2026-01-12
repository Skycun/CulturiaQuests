import { defineStore } from 'pinia'
import type { Museum } from '~/types/museum'
import { filterByDistance } from '~/utils/geolocation'
import { extractTags } from '~/utils/strapiHelpers'

/**
 * Normalise un objet Museum brut Strapi en structure flat.
 * Extrait les données depuis attributes ou directement selon la structure v4/v5.
 *
 * @param raw - Museum brut retourné par l'API Strapi
 * @returns Museum normalisé avec accès direct aux propriétés
 */
function normalizeMuseum(raw: any): Museum {
  return {
    id: raw.id,
    documentId: raw.documentId,
    name: raw.name || raw.attributes?.name || 'Unnamed',
    lat: raw.lat ?? raw.attributes?.lat,
    lng: raw.lng ?? raw.attributes?.lng,
    geohash: raw.geohash || raw.attributes?.geohash,
    radius: raw.radius ?? raw.attributes?.radius,
    location: raw.location || raw.attributes?.location,
    tags: extractTags(raw), // Extrait les tags depuis structure v4/v5
    runs: raw.runs || raw.attributes?.runs,
    // Garder attributes originaux pour compatibilité
    attributes: raw.attributes
  }
}

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
      console.log('🔄 Fetching museums with tags...')

      const response = await client<any>('/museums', {
        method: 'GET',
        query: {
          populate: 'tags'
        }
      })

      console.log('📦 Full API response:', response)

      const data = response.data || response

      // DEBUG: Log first museum to see structure
      if (Array.isArray(data) && data.length > 0) {
        console.log('🏛️ First museum structure (raw):', JSON.stringify(data[0], null, 2))
      }

      // Normaliser les données à la source
      const normalizedMuseums = Array.isArray(data) ? data.map(normalizeMuseum) : []

      // DEBUG: Log first normalized museum
      if (normalizedMuseums.length > 0) {
        console.log('✅ First museum structure (normalized):', JSON.stringify(normalizedMuseums[0], null, 2))
      }

      setMuseums(normalizedMuseums)
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
    // Always fetch fresh data to ensure we have tags populated
    await fetchAll()

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
