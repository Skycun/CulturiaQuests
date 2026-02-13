import { defineStore } from 'pinia'
import { ref } from 'vue'
import { calculateDistance } from '~/utils/geolocation'
import { isPointInGeoJSON } from '~/utils/geometry'

export const useFogStore = defineStore('fog', () => {
  // State
  const discoveredPoints = ref<{ lat: number; lng: number }[]>([])

  // Grille de couverture par comcom (pour auto-complétion à 50%)
  // comcomDocId → liste de cell hashes visitées
  const visitedGridCells = ref<Record<string, string[]>>({})
  // comcomDocId → nombre total de cellules dans la comcom
  const totalGridCells = ref<Record<string, number>>({})

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
    return `${Math.floor(lat / 0.0018)}:${Math.floor(lng / 0.0027)}`
  }

  /**
   * Ajoute une cellule de grille visitée pour une comcom.
   * Retourne true si c'est une nouvelle cellule (pas déjà visitée).
   */
  function addGridCell(comcomDocId: string, lat: number, lng: number): boolean {
    const hash = hashToGrid(lat, lng)

    if (!visitedGridCells.value[comcomDocId]) {
      visitedGridCells.value[comcomDocId] = []
    }

    const cells = visitedGridCells.value[comcomDocId]
    if (cells.includes(hash)) return false

    cells.push(hash)
    return true
  }

  /**
   * Retourne le ratio de couverture d'une comcom (0 à 1).
   */
  function getCoverageRatio(comcomDocId: string): number {
    const visited = visitedGridCells.value[comcomDocId]?.length || 0
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
  }

  /**
   * Supprime les points qui sont à l'intérieur des zones fournies.
   * Utile pour nettoyer le stockage quand une zone est complétée.
   */
  function removePointsInZones(zones: any[]) {
    if (!zones || zones.length === 0) return

    const initialCount = discoveredPoints.value.length

    discoveredPoints.value = discoveredPoints.value.filter(pt => {
      for (const zone of zones) {
        if (isPointInGeoJSON([pt.lat, pt.lng], zone.geometry)) {
          return false
        }
      }
      return true
    })

    const deleted = initialCount - discoveredPoints.value.length
    if (deleted > 0) {
      console.log(`🧹 Fog Cleanup: ${deleted} points supprimés (Zone complétée)`)
    }
  }

  return {
    discoveredPoints,
    visitedGridCells,
    totalGridCells,
    addPosition,
    clearFog,
    hashToGrid,
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