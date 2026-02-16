import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Poi } from '~/types/poi'
import { get, set } from 'idb-keyval'

const DB_KEY = 'pois-data'
const DB_VERSION_KEY = 'pois-version'
const CURRENT_DATA_VERSION = '2.0'

function normalizePoi(raw: any): Poi {
  return {
    id: raw.id,
    documentId: raw.documentId,
    name: raw.name || raw.attributes?.name || 'Unnamed',
    lat: raw.lat ?? raw.attributes?.lat,
    lng: raw.lng ?? raw.attributes?.lng,
    geohash: raw.geohash || raw.attributes?.geohash,
    location: raw.location || raw.attributes?.location,
    visits: raw.visits || raw.attributes?.visits,
    quests_a: raw.quests_a || raw.attributes?.quests_a,
    quests_b: raw.quests_b || raw.attributes?.quests_b,
    attributes: raw.attributes
  }
}

export const usePOIStore = defineStore('poi', () => {
  const pois = ref<Poi[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  const hasPOIs = computed(() => pois.value.length > 0)

  async function init() {
    if (isInitialized.value) return
    const storedVersion = await get(DB_VERSION_KEY)
    const storedData = await get(DB_KEY)

    if (storedVersion === CURRENT_DATA_VERSION && storedData) {
      pois.value = storedData
      isInitialized.value = true
    } else {
      await fetchAll()
    }
  }

  async function fetchAll() {
    const config = useRuntimeConfig()
    loading.value = true
    const allPois: any[] = []
    let page = 1
    let hasMore = true

    try {
      while (hasMore) {
        const response: any = await $fetch(`${config.public.strapi.url}/api/pois`, {
          query: {
            'pagination[page]': page,
            'pagination[pageSize]': 100,
          }
        })
        const data = response.data || []
        allPois.push(...data)
        
        if (response.meta?.pagination && page < response.meta.pagination.pageCount) {
          page++
        } else {
          hasMore = false
        }
      }

      pois.value = allPois.map(normalizePoi)
      await set(DB_KEY, pois.value)
      await set(DB_VERSION_KEY, CURRENT_DATA_VERSION)
      isInitialized.value = true
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { pois, loading, error, isInitialized, init, fetchAll, hasPOIs }
})
