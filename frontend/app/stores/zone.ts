import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, set } from 'idb-keyval'

// Interfaces génériques
export interface GeoZone {
  id: number
  documentId: string
  name: string
  code: string
  geometry: any // GeoJSON
  centerLat?: number
  centerLng?: number
}

export interface Region extends GeoZone {
  departments?: Department[]
}

export interface Department extends GeoZone {
  region?: Region
  comcoms?: Comcom[]
}

export interface Comcom extends GeoZone {
  department?: Department
}

const DB_VERSION_KEY = 'zones-version'
const CURRENT_DATA_VERSION = '2.0' // Bumped version for new architecture

export const useZoneStore = defineStore('zone', () => {
  // 3 États distincts
  const regions = ref<Region[]>([])
  const departments = ref<Department[]>([])
  const comcoms = ref<Comcom[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  /**
   * Initialise le store : Charge les 3 collections en parallèle
   */
  async function init() {
    if (isInitialized.value) return
    
    loading.value = true
    error.value = null

    try {
      // Vérification version globale
      const storedVersion = await get(DB_VERSION_KEY)
      const isOutdated = storedVersion !== CURRENT_DATA_VERSION

      // Chargement parallèle
      await Promise.all([
        loadCollection('regions', regions, isOutdated),
        loadCollection('departments', departments, isOutdated),
        loadCollection('comcoms', comcoms, isOutdated)
      ])

      if (isOutdated) {
        await set(DB_VERSION_KEY, CURRENT_DATA_VERSION)
      }
      
      isInitialized.value = true
      console.log(`✅ Zones initialisées — Régions: ${regions.value.length}, Départements: ${departments.value.length}, Comcoms: ${comcoms.value.length}`)
      if (regions.value.length === 0) console.warn('⚠️ Aucune région chargée — les contours régions ne s\'afficheront pas')
      if (departments.value.length === 0) console.warn('⚠️ Aucun département chargé — les contours départements ne s\'afficheront pas')

    } catch (e: any) {
      console.error('Erreur init zones:', e)
      error.value = "Erreur lors du chargement de la carte."
    } finally {
      loading.value = false
    }
  }

  /**
   * Charge une collection (Cache ou API)
   */
  async function loadCollection<T>(collectionName: string, stateRef: any, forceUpdate: boolean) {
    const dbKey = `${collectionName}-data`
    
    // 1. Essai Cache
    if (!forceUpdate) {
      const storedData = await get(dbKey)
      if (storedData && Array.isArray(storedData) && storedData.length > 0) {
        console.log(`📦 ${collectionName} chargées depuis IndexedDB`)
        stateRef.value = storedData
        return
      }
    }

    // 2. Fallback API
    console.log(`🌍 Téléchargement ${collectionName} depuis l'API...`)
    const data = await fetchFullCollection(collectionName)
    stateRef.value = data
    
    // 3. Sauvegarde Cache
    await set(dbKey, data)
  }

  /**
   * Crawler générique pour télécharger toute une collection (Paginé)
   */
  async function fetchFullCollection(endpoint: string): Promise<any[]> {
    const config = useRuntimeConfig()
    const pageSize = 100
    let page = 1
    let hasMore = true
    const allItems: any[] = []

    while (hasMore) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await $fetch(`${config.public.strapi.url}/api/${endpoint}`, {
        query: {
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
          'fields[0]': 'name',
          'fields[1]': 'code',
          'fields[2]': 'geometry',
          'fields[3]': 'documentId' // Important pour Strapi v5
        }
      })

      const dataBatch = response.data || []
      const meta = response.meta

      if (dataBatch.length > 0) {
        allItems.push(...dataBatch)
      }

      if (meta && meta.pagination && page < meta.pagination.pageCount) {
        page++
      } else if (!meta || dataBatch.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    }
    
    // Nettoyage / Aplatissement Strapi v5
    // Strapi v5 retourne souvent les attributs directement à la racine de l'objet data (plus de .attributes)
    // Mais vérifions : si c'est v5, c'est direct. Si c'est v4, c'est dans .attributes.
    // Le code précédent utilisait .attributes, assumons que le client Strapi ou le fetch brut retourne le JSON brut.
    // Avec $fetch sur /api/..., Strapi retourne { data: [{ id, documentId, name... }] } en v5 par défaut
    
    return allItems.map((item: any) => {
      // Calcul du centroïde pour filtrage BBOX
      let centerLat: number | undefined
      let centerLng: number | undefined

      try {
        if (item.geometry) {
          let coords: any[] = []
          if (item.geometry.type === 'Polygon') {
            coords = item.geometry.coordinates[0]
          } else if (item.geometry.type === 'MultiPolygon') {
            coords = item.geometry.coordinates[0][0]
          }

          if (coords && coords.length > 0) {
            let sumLat = 0
            let sumLng = 0
            const len = coords.length
            for (let i = 0; i < len; i++) {
              sumLng += coords[i][0]
              sumLat += coords[i][1]
            }
            centerLat = sumLat / len
            centerLng = sumLng / len
          }
        }
      } catch (e) {
        // Silent error
      }

      return {
        id: item.id,
        documentId: item.documentId,
        name: item.name,
        code: item.code,
        geometry: item.geometry,
        centerLat,
        centerLng
      }
    })
  }

  /**
   * Retourne les zones à afficher selon le niveau de zoom
   */
  function getZonesForZoom(zoom: number): GeoZone[] {
    if (zoom >= 11) {
      return comcoms.value
    } else if (zoom >= 8) {
      return departments.value
    } else {
      return regions.value
    }
  }

  return {
    regions,
    departments,
    comcoms,
    loading,
    error,
    isInitialized,
    init,
    getZonesForZoom
  }
})