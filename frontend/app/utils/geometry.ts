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
