import { defineStore } from 'pinia'
import { calculateDistance } from '~/utils/geolocation'

interface DiscoveredPoint {
  lat: number
  lng: number
}

export const useFogStore = defineStore('fog', {
  state: () => ({
    discoveredPoints: [] as DiscoveredPoint[],
    // Réglages visuels (persistant pour que l'utilisateur garde ses préférences)
    cloudIntensity: 50, // Valeur par défaut pour le flou/slider
  }),

  actions: {
    /**
     * Ajoute une position découverte si elle est assez loin de la dernière.
     * @param lat Latitude de l'utilisateur
     * @param lng Longitude de l'utilisateur
     */
    addPosition(lat: number, lng: number) {
      // Si aucun point, on ajoute le premier
      if (this.discoveredPoints.length === 0) {
        this.discoveredPoints.push({ lat, lng })
        return
      }

      // On vérifie la distance avec le DERNIER point ajouté
      // (Optimisation simple pour éviter de parcourir tout le tableau)
      const lastPoint = this.discoveredPoints[this.discoveredPoints.length - 1]
      const dist = calculateDistance(lat, lng, lastPoint.lat, lastPoint.lng)

      // Seuil d'enregistrement : 20 mètres (0.02 km)
      if (dist >= 0.02) {
        this.discoveredPoints.push({ lat, lng })
      }
    },

    setCloudIntensity(value: number) {
      this.cloudIntensity = value
    },

    /**
     * Vide le brouillard (pour le debug ou reset)
     */
    resetFog() {
      this.discoveredPoints = []
    }
  },

  persist: true
})
