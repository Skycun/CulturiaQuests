import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Museum } from '~/types/museum'
import { get, set } from 'idb-keyval'
import { extractTags } from '~/utils/strapiHelpers'

const DB_KEY = 'museums-data'
const DB_VERSION_KEY = 'museums-version'
const CURRENT_DATA_VERSION = '2.0'

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
    tags: extractTags(raw),
    runs: raw.runs || raw.attributes?.runs,
    attributes: raw.attributes
  }
}

export const useMuseumStore = defineStore('museum', () => {
  const museums = ref<Museum[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  const hasMuseums = computed(() => museums.value.length > 0)

  async function init() {
    if (isInitialized.value) return
    const storedVersion = await get(DB_VERSION_KEY)
    const storedData = await get(DB_KEY)

    if (storedVersion === CURRENT_DATA_VERSION && storedData) {
      museums.value = storedData
      isInitialized.value = true
    } else {
      await fetchAll()
    }
  }

  async function fetchAll() {
    const config = useRuntimeConfig()
    loading.value = true
    const allMuseums: any[] = []
    let page = 1
    let hasMore = true

    try {
      while (hasMore) {
        const response: any = await $fetch(`${config.public.strapi.url}/api/museums`, {
          query: {
            'pagination[page]': page,
            'pagination[pageSize]': 100,
            populate: 'tags'
          }
        })
        const data = response.data || []
        allMuseums.push(...data)
        
        if (response.meta?.pagination && page < response.meta.pagination.pageCount) {
          page++
        } else {
          hasMore = false
        }
      }

      museums.value = allMuseums.map(normalizeMuseum)
      await set(DB_KEY, museums.value)
      await set(DB_VERSION_KEY, CURRENT_DATA_VERSION)
      isInitialized.value = true
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return { museums, loading, error, isInitialized, init, fetchAll, hasMuseums }
})
