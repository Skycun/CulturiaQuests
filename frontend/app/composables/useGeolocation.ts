import { calculateDistance } from '~/utils/geolocation'

/**
 * Options de configuration pour le tracking de géolocalisation
 */
interface GeolocationOptions {
  /** Latitude par défaut si la géolocalisation est refusée (default: 49.1167 - Saint-Lô) */
  defaultLat?: number
  /** Longitude par défaut si la géolocalisation est refusée (default: -1.0833 - Saint-Lô) */
  defaultLng?: number
  /** Seuil de distance en km pour déclencher un reload des données (default: 5) */
  reloadThresholdKm?: number
}

/**
 * Callbacks optionnels pour les événements de géolocalisation
 */
interface GeolocationCallbacks {
  /** Appelé quand la première position est obtenue */
  onFirstPosition?: (lat: number, lng: number) => void
  /** Appelé à chaque mise à jour de position */
  onPositionUpdate?: (lat: number, lng: number) => void
  /** Appelé quand le seuil de distance est dépassé */
  onDistanceThresholdReached?: (distance: number) => void
}

/**
 * Composable pour gérer la géolocalisation en temps réel.
 * Gère le tracking continu, le throttling des reloads, et l'état de la permission.
 *
 * @param options - Options de configuration
 * @returns État et actions pour la géolocalisation
 *
 * @example
 * const geolocation = useGeolocation({
 *   defaultLat: 49.1167,
 *   defaultLng: -1.0833,
 *   reloadThresholdKm: 5
 * })
 *
 * geolocation.registerCallbacks({
 *   onFirstPosition: (lat, lng) => {
 *     console.log('First position:', lat, lng)
 *     fetchNearbyData()
 *   },
 *   onDistanceThresholdReached: (distance) => {
 *     console.log(`Moved ${distance}km, reloading...`)
 *     fetchNearbyData()
 *   }
 * })
 *
 * geolocation.startTracking()
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const {
    defaultLat = 49.1167,  // Saint-Lô
    defaultLng = -1.0833,
    reloadThresholdKm = 5
  } = options

  // State
  const userLat = ref<number>(defaultLat)
  const userLng = ref<number>(defaultLng)
  const geolocLoading = ref<boolean>(false)
  const geolocError = ref<string | null>(null)
  const watchId = ref<number | null>(null)
  const isFirstPosition = ref<boolean>(true)
  const lastFetchLat = ref<number | null>(null)
  const lastFetchLng = ref<number | null>(null)
  const isTracking = ref<boolean>(false)

  // Callbacks externes (pour refresh des POIs par exemple)
  const onPositionUpdate = ref<((lat: number, lng: number) => void) | null>(null)
  const onFirstPosition = ref<((lat: number, lng: number) => void) | null>(null)
  const onDistanceThresholdReached = ref<((distance: number) => void) | null>(null)

  /**
   * Démarre le tracking de position en temps réel.
   * Utilise navigator.geolocation.watchPosition() pour un suivi continu.
   */
  function startTracking() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using default position')
      return
    }

    geolocLoading.value = true
    geolocError.value = null

    const { showGeoNotification } = useNotifications()

    watchId.value = navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => {
        const newLat = position.coords.latitude
        const newLng = position.coords.longitude

        if (isFirstPosition.value) {
          // Première position obtenue
          console.log('📍 First position obtained:', newLat, newLng)
          userLat.value = newLat
          userLng.value = newLng
          geolocLoading.value = false
          isFirstPosition.value = false
          lastFetchLat.value = newLat
          lastFetchLng.value = newLng

          // Callback externe
          if (onFirstPosition.value) {
            onFirstPosition.value(newLat, newLng)
          }
        } else {
          // Mises à jour suivantes
          userLat.value = newLat
          userLng.value = newLng

          // Callback position update
          if (onPositionUpdate.value) {
            onPositionUpdate.value(newLat, newLng)
          }

          // Vérifier si besoin de reload (threshold dépassé)
          if (lastFetchLat.value !== null && lastFetchLng.value !== null) {
            const distance = calculateDistance(
              lastFetchLat.value,
              lastFetchLng.value,
              newLat,
              newLng
            )

            if (distance > reloadThresholdKm) {
              console.log(`🚶 User moved ${distance.toFixed(2)}km (threshold: ${reloadThresholdKm}km)`)
              lastFetchLat.value = newLat
              lastFetchLng.value = newLng

              // Callback threshold
              if (onDistanceThresholdReached.value) {
                onDistanceThresholdReached.value(distance)
              }
            }
          }
        }
      },
      (error: GeolocationPositionError) => {
        console.warn('Geolocation tracking failed:', error.message)
        geolocError.value = error.message
        geolocLoading.value = false
      },
      {
        enableHighAccuracy: false,  // Plus rapide, utilise WiFi/réseau au lieu de GPS
        timeout: 5000,              // Timeout de 5 secondes par tentative
        maximumAge: 10000           // Accepte une position de moins de 10 secondes
      }
    )

    isTracking.value = true
    showGeoNotification()
  }

  /**
   * Arrête le tracking de position.
   * Nettoie le watchPosition et réinitialise l'état.
   */
  function stopTracking() {
    if (watchId.value !== null) {
      navigator.geolocation.clearWatch(watchId.value)
      watchId.value = null
      isTracking.value = false
      const { hideGeoNotification } = useNotifications()
      hideGeoNotification()
      console.log('📍 Location tracking stopped')
    }
  }

  /**
   * Enregistre les callbacks pour les événements de géolocalisation.
   *
   * @param callbacks - Objet contenant les callbacks à enregistrer
   */
  function registerCallbacks(callbacks: GeolocationCallbacks) {
    if (callbacks.onPositionUpdate) {
      onPositionUpdate.value = callbacks.onPositionUpdate
    }
    if (callbacks.onFirstPosition) {
      onFirstPosition.value = callbacks.onFirstPosition
    }
    if (callbacks.onDistanceThresholdReached) {
      onDistanceThresholdReached.value = callbacks.onDistanceThresholdReached
    }
  }

  // Cleanup au unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    // State (readonly pour external usage)
    userLat: readonly(userLat),
    userLng: readonly(userLng),
    geolocLoading: readonly(geolocLoading),
    geolocError: readonly(geolocError),
    isFirstPosition: readonly(isFirstPosition),
    isTracking: readonly(isTracking),

    // Actions
    startTracking,
    stopTracking,
    registerCallbacks
  }
}
