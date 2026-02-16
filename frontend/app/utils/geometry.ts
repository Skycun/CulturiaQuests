/**
 * Calcule l'aire d'un anneau de coordonnées GeoJSON via la formule du Shoelace.
 * Coordonnées attendues : [[lng, lat], [lng, lat], ...] (format GeoJSON).
 * Retourne l'aire en degrés² (valeur absolue).
 */
export function computeRingArea(coords: [number, number][]): number {
  const n = coords.length
  if (n < 3) return 0

  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coords[i][0] * coords[j][1]
    area -= coords[j][0] * coords[i][1]
  }
  return Math.abs(area) / 2
}

/**
 * Calcule l'aire totale d'une géométrie GeoJSON (Polygon ou MultiPolygon).
 * Retourne l'aire en degrés² (anneau extérieur uniquement, sans soustraire les trous).
 */
export function computeGeoJSONArea(geometry: any): number {
  if (!geometry) return 0

  if (geometry.type === 'Polygon') {
    return computeRingArea(geometry.coordinates[0])
  } else if (geometry.type === 'MultiPolygon') {
    let total = 0
    for (const poly of geometry.coordinates) {
      total += computeRingArea(poly[0])
    }
    return total
  }

  return 0
}

/**
 * Vérifie si un point [lat, lng] est à l'intérieur d'un polygone GeoJSON.
 * Algorithme Ray-Casting.
 */
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  // point: [lat, lng], vs: [[lng, lat], [lng, lat], ...] (GeoJSON Coords)
  const x = point[1] // Lng
  const y = point[0] // Lat

  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1]
    const xj = vs[j][0], yj = vs[j][1]

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }

  return inside
}

/**
 * Vérifie si un point est dans une géométrie GeoJSON complexe (Polygon ou MultiPolygon).
 */
export function isPointInGeoJSON(point: [number, number], geometry: any): boolean {
  if (!geometry) return false

  if (geometry.type === 'Polygon') {
    // On check seulement l'anneau extérieur (index 0) pour la performance
    // (Ignorer les trous pour le nettoyage est acceptable)
    return isPointInPolygon(point, geometry.coordinates[0])
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (isPointInPolygon(point, poly[0])) return true
    }
  }

  return false
}
