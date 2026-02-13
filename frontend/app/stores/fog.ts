import { defineStore } from 'pinia'
import { ref } from 'vue'
import { calculateDistance } from '~/utils/geolocation'
import { isPointInGeoJSON } from '~/utils/geometry'

// Grille ~200m × 200m (en degrés) — source unique de vérité
export const GRID_LAT_STEP = 0.0018
export const GRID_LNG_STEP = 0.0027

export const useFogStore = defineStore('fog', () => {
  // State
  const discoveredPoints = ref<{ lat: number; lng: number }[]>([])

  // Grille de couverture par comcom (pour auto-complétion à 50%)
  // comcomDocId → liste de cell hashes visitées (persisté)
  const visitedGridCells = ref<Record<string, string[]>>({})
  // comcomDocId → nombre total de cellules dans la comcom (persisté)
  const totalGridCells = ref<Record<string, number>>({})

  // Cache runtime pour lookup O(1) — reconstruit lazily depuis visitedGridCells
  const gridSetsCache = new Map<string, Set<string>>()

  function getGridSet(comcomDocId: string): Set<string> {
    if (!gridSetsCache.has(comcomDocId)) {
      const arr = visitedGridCells.value[comcomDocId] || []
      gridSetsCache.set(comcomDocId, new Set(arr))
    }
    return gridSetsCache.get(comcomDocId)!
  }

  // Actions
  function addPosition(lat: number, lng: number) {
    const lastPoint = discoveredPoints.value[discoveredPoints.value.length - 1]

    if (lastPoint) {
      const dist = calculateDistance(lastPoint.lat, lastPoint.lng, lat, lng)
      if (dist < 0.02) return // 20 mètres minimum
    }

    discoveredPoints.value.push({ lat, lng })
  }

  function clearFog() {
    discoveredPoints.value = []
  }

  /**
   * Hash un point GPS en cellule de grille (~200m × 200m)
   */
  function hashToGrid(lat: number, lng: number): string {
    return `${Math.floor(lat / GRID_LAT_STEP)}:${Math.floor(lng / GRID_LNG_STEP)}`
  }

  /**
   * Ajoute une cellule de grille visitée pour une comcom.
   * Retourne true si c'est une nouvelle cellule (pas déjà visitée).
   */
  function addGridCell(comcomDocId: string, lat: number, lng: number): boolean {
    const hash = hashToGrid(lat, lng)
    const set = getGridSet(comcomDocId)

    if (set.has(hash)) return false

    // Sync : ajouter au Set (runtime) ET à l'array (persisté)
    set.add(hash)
    if (!visitedGridCells.value[comcomDocId]) {
      visitedGridCells.value[comcomDocId] = []
    }
    visitedGridCells.value[comcomDocId].push(hash)
    return true
  }

  /**
   * Retourne le ratio de couverture d'une comcom (0 à 1).
   */
  function getCoverageRatio(comcomDocId: string): number {
    const visited = getGridSet(comcomDocId).size
    const total = totalGridCells.value[comcomDocId]
    if (!total || total === 0) return 0
    return visited / total
  }

  /**
   * Stocke le nombre total de cellules d'une comcom (calculé une seule fois).
   */
  function setTotalGridCells(comcomDocId: string, count: number) {
    totalGridCells.value[comcomDocId] = count
  }

  /**
   * Vérifie si le total de cellules a déjà été calculé pour une comcom.
   */
  function hasTotalGridCells(comcomDocId: string): boolean {
    return comcomDocId in totalGridCells.value
  }

  /**
   * Nettoie les données de grille pour une comcom complétée.
   */
  function clearGridForComcom(comcomDocId: string) {
    delete visitedGridCells.value[comcomDocId]
    delete totalGridCells.value[comcomDocId]
    gridSetsCache.delete(comcomDocId)
  }

  /**
   * Supprime les points qui sont à l'intérieur des zones fournies.
   * Utile pour nettoyer le stockage quand une zone est complétée.
   */
  function removePointsInZones(zones: any[]) {
    if (!zones || zones.length === 0) return

    discoveredPoints.value = discoveredPoints.value.filter(pt => {
      for (const zone of zones) {
        if (isPointInGeoJSON([pt.lat, pt.lng], zone.geometry)) {
          return false
        }
      }
      return true
    })
  }

  return {
    discoveredPoints,
    visitedGridCells,
    totalGridCells,
    addPosition,
    clearFog,
    addGridCell,
    getCoverageRatio,
    setTotalGridCells,
    hasTotalGridCells,
    clearGridForComcom,
    removePointsInZones
  }
}, {
  persist: {
    pick: ['discoveredPoints', 'visitedGridCells', 'totalGridCells']
  }
})
