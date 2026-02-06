import { defineStore } from 'pinia'
import { ref } from 'vue'
import { calculateDistance } from '~/utils/geolocation'
import { isPointInGeoJSON } from '~/utils/geometry'

export const useFogStore = defineStore('fog', () => {
  // State
  const discoveredPoints = ref<{ lat: number; lng: number }[]>([])
  
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
   * Supprime les points qui sont à l'intérieur des zones fournies.
   * Utile pour nettoyer le stockage quand une zone est complétée.
   */
  function removePointsInZones(zones: any[]) {
    if (!zones || zones.length === 0) return

    const initialCount = discoveredPoints.value.length
    
    // On garde uniquement les points qui NE SONT PAS dans une des zones fournies
    discoveredPoints.value = discoveredPoints.value.filter(pt => {
      // Si le point est dans UNE des zones, on le supprime (return false)
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
    addPosition,
    clearFog,
    removePointsInZones
  }
}, {
  persist: {
    pick: ['discoveredPoints']
  }
})