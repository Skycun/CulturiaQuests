/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the great circle distance between two points using the Haversine formula.
 * This provides accurate distance calculations for points on a sphere.
 *
 * @param lat1 - Latitude of first point in degrees
 * @param lng1 - Longitude of first point in degrees
 * @param lat2 - Latitude of second point in degrees
 * @param lng2 - Longitude of second point in degrees
 * @returns Distance in kilometers, rounded to 2 decimal places
 *
 * @example
 * // Distance between Paris and Lyon
 * const distance = calculateDistance(48.8566, 2.3522, 45.7640, 4.8357)
 * console.log(distance) // ~392.22 km
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = EARTH_RADIUS_KM * c

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100
}

/**
 * Filter a list of locations by distance from a center point.
 * Supports both flattened and nested Strapi v4/v5 attribute structures.
 *
 * @param locations - Array of objects with lat/lng properties
 * @param centerLat - Center point latitude in degrees
 * @param centerLng - Center point longitude in degrees
 * @param radiusKm - Radius in kilometers
 * @returns Filtered array of locations within the specified radius
 *
 * @example
 * const pois = [
 *   { name: 'Louvre', lat: 48.8606, lng: 2.3376 },
 *   { name: 'Lyon', lat: 45.7640, lng: 4.8357 }
 * ]
 * const nearby = filterByDistance(pois, 48.8566, 2.3522, 50)
 * // Returns only Louvre (within 50km of Paris center)
 */
export function filterByDistance<
  T extends {
    lat?: number
    lng?: number
    attributes?: { lat?: number; lng?: number }
  }
>(
  locations: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number
): T[] {
  return locations.filter((location) => {
    // Handle both flattened and nested attributes structure (Strapi v4/v5)
    const lat = location.lat ?? location.attributes?.lat
    const lng = location.lng ?? location.attributes?.lng

    // Skip locations with missing coordinates
    if (lat === undefined || lng === undefined) {
      return false
    }

    const distance = calculateDistance(centerLat, centerLng, lat, lng)
    return distance <= radiusKm
  })
}
