import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'

type LocationItem = Museum | Poi

/**
 * Composable pour gérer les interactions avec la carte Leaflet.
 * Fournit des méthodes pour animer la carte (flyTo, centrage, etc.).
 *
 * @returns Fonctions d'interaction avec la carte
 *
 * @example
 * const mapInteraction = useMapInteraction()
 * const mapRef = ref(null)
 *
 * // Animer vers un item (museum ou POI)
 * mapInteraction.flyToItem(mapRef.value, selectedMuseum)
 *
 * // Animer vers des coordonnées
 * mapInteraction.flyToCoords(mapRef.value, 49.1167, -1.0833, 13)
 */
export function useMapInteraction() {

  /**
   * Anime la carte vers un élément (Museum ou POI) avec un offset pour le drawer.
   * Le point sera positionné à ~25% du haut de l'écran pour laisser la place au drawer.
   *
   * @param map - Référence au composant LMap
   * @param item - L'item à centrer (Museum ou POI, données déjà normalisées)
   */
  function flyToItem(map: any, item: LocationItem) {
    if (!map?.leafletObject) {
      console.warn('Map reference not available')
      return
    }

    const lMap = map.leafletObject
    const { lat, lng } = item // Données déjà normalisées par le store

    if (!lat || !lng) {
      console.warn('Item does not have valid coordinates')
      return
    }

    const targetZoom = 16
    const targetLatLng = [lat, lng] as [number, number]

    // Calcul du décalage pour laisser la place au drawer
    // Le point sera à ~25% du haut de l'écran
    const mapHeight = lMap.getSize().y
    const offsetY = mapHeight * 0.25

    // Projection et décalage
    const point = lMap.project(targetLatLng, targetZoom)
    const targetPoint = point.add([0, offsetY])
    const newCenter = lMap.unproject(targetPoint, targetZoom)

    lMap.flyTo(newCenter, targetZoom, {
      animate: true,
      duration: 0.8
    })
  }

  /**
   * Anime la carte vers des coordonnées spécifiques avec un zoom.
   *
   * @param map - Référence au composant LMap
   * @param lat - Latitude de destination
   * @param lng - Longitude de destination
   * @param zoom - Niveau de zoom (default: 13)
   * @param duration - Durée de l'animation en secondes (default: 1.5)
   */
  function flyToCoords(
    map: any,
    lat: number,
    lng: number,
    zoom: number = 13,
    duration: number = 1.5
  ) {
    if (!map?.leafletObject) {
      console.warn('Map reference not available')
      return
    }

    map.leafletObject.flyTo([lat, lng], zoom, {
      animate: true,
      duration
    })
  }

  return {
    flyToItem,
    flyToCoords
  }
}
