import { useZoneStore, type Comcom } from '~/stores/zone'
import { useFogStore } from '~/stores/fog'
import { useProgressionStore } from '~/stores/progression'
import { useGuildStore } from '~/stores/guild'
import { useMuseumStore } from '~/stores/museum'
import { usePOIStore } from '~/stores/poi'
import { useVisitStore } from '~/stores/visit'
import { isPointInGeoJSON } from '~/utils/geometry'

const COMPLETION_THRESHOLD = 0.5 // 50%

// Grille ~200m × 200m (en degrés)
const GRID_LAT_STEP = 0.0018
const GRID_LNG_STEP = 0.0027

export function useZoneCompletion() {
  const zoneStore = useZoneStore()
  const fogStore = useFogStore()
  const progressionStore = useProgressionStore()
  const guildStore = useGuildStore()
  const museumStore = useMuseumStore()
  const poiStore = usePOIStore()
  const visitStore = useVisitStore()

  // Lock pour éviter les appels API concurrents
  const pendingCompletions = new Set<string>()

  /**
   * Trouve la comcom dans laquelle se situe un point GPS.
   * Optimisé : check d'abord par distance au centroïde avant le ray-casting.
   */
  function findComcomForPoint(lat: number, lng: number): Comcom | null {
    const comcoms = zoneStore.comcoms
    if (!comcoms || comcoms.length === 0) return null

    // Pré-filtre par distance au centroïde (~5km de rayon)
    const candidates = comcoms.filter(c => {
      if (!c.centerLat || !c.centerLng) return false
      const dLat = Math.abs(c.centerLat - lat)
      const dLng = Math.abs(c.centerLng - lng)
      return dLat < 0.1 && dLng < 0.15 // ~11km lat, ~11km lng
    })

    for (const comcom of candidates) {
      if (isPointInGeoJSON([lat, lng], comcom.geometry)) {
        return comcom
      }
    }
    return null
  }

  /**
   * Calcule le nombre total de cellules de grille dans une comcom.
   * Fait une seule fois par comcom, puis stocké dans le fog store.
   */
  function computeTotalGridCells(comcom: Comcom): number {
    const docId = comcom.documentId || comcom.id.toString()
    if (fogStore.hasTotalGridCells(docId)) {
      return fogStore.totalGridCells[docId]
    }

    const geometry = comcom.geometry
    if (!geometry) return 0

    // Calculer la bounding box
    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity

    const extractBounds = (coords: any[]) => {
      for (const coord of coords) {
        const lng = coord[0]
        const lat = coord[1]
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
      }
    }

    if (geometry.type === 'Polygon') {
      extractBounds(geometry.coordinates[0])
    } else if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        extractBounds(poly[0])
      }
    }

    if (minLat === Infinity) return 0

    // Générer les points de grille et compter ceux dans le polygone
    let count = 0
    for (let lat = minLat; lat <= maxLat; lat += GRID_LAT_STEP) {
      for (let lng = minLng; lng <= maxLng; lng += GRID_LNG_STEP) {
        if (isPointInGeoJSON([lat, lng], geometry)) {
          count++
        }
      }
    }

    // Minimum 1 cellule pour éviter division par zéro
    count = Math.max(count, 1)
    fogStore.setTotalGridCells(docId, count)
    return count
  }

  /**
   * Appelle l'API pour marquer une comcom comme complétée.
   * Puis refresh les progressions côté frontend.
   */
  async function completeComcom(comcomDocId: string) {
    if (pendingCompletions.has(comcomDocId)) return
    pendingCompletions.add(comcomDocId)

    try {
      const client = useStrapiClient()
      const guildDocId = guildStore.guild?.documentId
      if (!guildDocId) return

      await client<any>('/progressions', {
        method: 'POST',
        body: {
          data: {
            is_completed: true,
            comcom: comcomDocId,
            guild: guildDocId
          }
        }
      })

      // Refresh les progressions pour mettre à jour le FogLayer
      await guildStore.fetchAll()

      // Nettoyer les points GPS et les données de grille de la comcom
      const comcom = zoneStore.comcoms.find(
        c => (c.documentId || c.id.toString()) === comcomDocId
      )
      if (comcom) {
        fogStore.removePointsInZones([comcom])
      }
      fogStore.clearGridForComcom(comcomDocId)

    } catch (e: any) {
      console.error('Failed to complete comcom:', e)
    } finally {
      pendingCompletions.delete(comcomDocId)
    }
  }

  /**
   * CHEMIN A — Vérifie la couverture du brouillard pour un point GPS.
   * Appelé à chaque addPosition.
   */
  function checkFogCoverage(lat: number, lng: number) {
    if (!zoneStore.isInitialized) return

    const comcom = findComcomForPoint(lat, lng)
    if (!comcom) return

    const docId = comcom.documentId || comcom.id.toString()

    // Déjà complétée ?
    if (progressionStore.isComcomCompleted(docId)) return

    // Ajouter la cellule de grille
    const isNew = fogStore.addGridCell(docId, lat, lng)
    if (!isNew) return // Cellule déjà visitée, rien à faire

    // Calculer le total de cellules (lazy, une seule fois)
    computeTotalGridCells(comcom)

    // Vérifier le seuil
    const ratio = fogStore.getCoverageRatio(docId)
    if (ratio >= COMPLETION_THRESHOLD) {
      completeComcom(docId)
    }
  }

  /**
   * CHEMIN B — Vérifie la couverture des visites POI/musées pour un point GPS.
   * Appelé après chaque openChest.
   */
  function checkVisitCoverage(poiLat: number, poiLng: number) {
    if (!zoneStore.isInitialized) return

    const comcom = findComcomForPoint(poiLat, poiLng)
    if (!comcom) return

    const docId = comcom.documentId || comcom.id.toString()

    // Déjà complétée ?
    if (progressionStore.isComcomCompleted(docId)) return

    // Trouver tous les POI et musées dans cette comcom
    const poisInComcom = poiStore.pois.filter(p =>
      p.lat !== undefined && p.lng !== undefined &&
      isPointInGeoJSON([p.lat, p.lng], comcom.geometry)
    )
    const museumsInComcom = museumStore.museums.filter(m =>
      m.lat !== undefined && m.lng !== undefined &&
      isPointInGeoJSON([m.lat, m.lng], comcom.geometry)
    )

    const totalLocations = poisInComcom.length + museumsInComcom.length
    if (totalLocations === 0) return

    // Compter les POI visités (au moins 1 visite)
    let visitedCount = 0
    for (const poi of poisInComcom) {
      const poiId = poi.documentId || poi.id
      if (visitStore.getVisitForPOI.value(poiId)) {
        visitedCount++
      }
    }

    // Pour les musées, on check via le run store (une visite = un run complété)
    // Simplifié : on ne compte que les POI pour le chemin B
    // Les musées sont déjà des POI dans le système de visites

    const ratio = visitedCount / totalLocations
    if (ratio >= COMPLETION_THRESHOLD) {
      completeComcom(docId)
    }
  }

  return {
    checkFogCoverage,
    checkVisitCoverage
  }
}
