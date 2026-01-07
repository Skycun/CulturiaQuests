<template>
  <div class="h-[600px] w-full relative">
    <!-- Geolocation request component -->
    <GeolocationRequest
      @allow="handleGeolocationAllow"
      @deny="handleGeolocationDeny"
    />

    <!-- Loading state -->
    <div v-if="geolocLoading" class="absolute top-4 left-4 z-[1000] bg-white p-3 rounded shadow">
      Getting your location...
    </div>

    <ClientOnly>
      <LMap
        ref="map"
        :zoom="13"
        :center="[userLat, userLng]"
        :use-global-leaflet="false"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />

        <!-- Marqueur position utilisateur -->
        <LMarker :lat-lng="[userLat, userLng]" />

        <!-- Marqueurs Musées -->
        <LMarker
          v-for="museum in validMuseums"
          :key="`museum-${museum.id}`"
          :lat-lng="[getLat(museum)!, getLng(museum)!]"
          @click="selectItem(museum)"
        >
          <LIcon
            icon-url="/assets/musee.png"
            :icon-size="[54, 46]"
            :icon-anchor="[27, 46]"
          />
        </LMarker>

        <!-- Marqueurs POIs -->
        <LMarker
          v-for="poi in validPOIs"
          :key="`poi-${poi.id}`"
          :lat-lng="[getLat(poi)!, getLng(poi)!]"
          @click="selectItem(poi)"
        >
          <LIcon
            icon-url="/assets/poi.png"
            :icon-size="[64, 46]"
            :icon-anchor="[32, 46]"
          />
        </LMarker>
      </LMap>
    </ClientOnly>

    <!-- Drawer Information -->
    <BottomDrawer v-model="isDrawerOpen">
      <div v-if="selectedItem">
        <h2 class="text-xl font-bold mb-2">{{ getName(selectedItem) }}</h2>
        <div class="text-gray-600">
          <p>Type: {{ 'rarity' in selectedItem ? 'Item/POI' : 'Museum' }}</p>
          <p class="text-sm mt-2">Lat: {{ getLat(selectedItem)?.toFixed(4) }}</p>
          <p class="text-sm">Lng: {{ getLng(selectedItem)?.toFixed(4) }}</p>
        </div>
      </div>
    </BottomDrawer>
  </div>
</template>

<script setup lang="ts">
import { useMuseumStore } from '~/stores/museum'
import { usePOIStore } from '~/stores/poi'
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'

// Type pour les éléments avec coordonnées (Museum ou POI)
type LocationItem = Museum | Poi

// Stores
const museumStore = useMuseumStore()
const poiStore = usePOIStore()

// Geolocation
const userLat = ref<number>(49.1167)  // Saint-Lô par défaut
const userLng = ref<number>(-1.0833)
const geolocLoading = ref<boolean>(false)
const geolocError = ref<string | null>(null)

// Nearby results
const nearbyMuseums = ref<Museum[]>([])
const nearbyPOIs = ref<Poi[]>([])

// Drawer Logic
const selectedItem = ref<LocationItem | null>(null)
const isDrawerOpen = ref(false)

function selectItem(item: LocationItem) {
  selectedItem.value = item
  isDrawerOpen.value = true
}

// Map reference (null car initialisé par Leaflet après le mount)
const map = ref<any>(null)

// Computed: filtrer pour ne garder que les éléments avec coordonnées valides
const validMuseums = computed<Museum[]>(() =>
  nearbyMuseums.value.filter((m): m is Museum => getLat(m) !== undefined && getLng(m) !== undefined)
)

const validPOIs = computed<Poi[]>(() =>
  nearbyPOIs.value.filter((p): p is Poi => getLat(p) !== undefined && getLng(p) !== undefined)
)

// Helpers pour extraction de données (support Strapi v4/v5)
function getLat(item: LocationItem): number | undefined {
  return item.lat ?? item.attributes?.lat
}

function getLng(item: LocationItem): number | undefined {
  return item.lng ?? item.attributes?.lng
}

function getName(item: LocationItem): string {
  return item.name || item.attributes?.name || 'Unnamed'
}

// Handlers pour le composant GeolocationRequest
function handleGeolocationAllow(): void {
  getUserLocation()
}

function handleGeolocationDeny(): void {
  console.log('User declined geolocation, using Saint-Lô default')
  fetchNearbyLocations()
}

// Géolocalisation
function getUserLocation(): void {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported, using Saint-Lô default')
    fetchNearbyLocations()
    return
  }

  geolocLoading.value = true
  geolocError.value = null

  navigator.geolocation.getCurrentPosition(
    (position: GeolocationPosition) => {
      userLat.value = position.coords.latitude
      userLng.value = position.coords.longitude
      geolocLoading.value = false
      fetchNearbyLocations()
    },
    (error: GeolocationPositionError) => {
      console.warn('Geolocation failed, using Saint-Lô default:', error.message)
      geolocError.value = error.message
      geolocLoading.value = false
      // Continuer avec Saint-Lô par défaut
      fetchNearbyLocations()
    }
  )
}

// Récupération des données
async function fetchNearbyLocations(): Promise<void> {
  const radius: number = 10 // 10 km

  // Fetch museums et POIs en parallèle
  const [museums, pois] = await Promise.all([
    museumStore.fetchNearby(radius, userLat.value, userLng.value),
    poiStore.fetchNearby(radius, userLat.value, userLng.value)
  ])

  nearbyMuseums.value = museums
  nearbyPOIs.value = pois

  console.log(`Found ${museums.length} museums and ${pois.length} POIs within ${radius}km`)
}

// Lifecycle - ne pas demander automatiquement la géolocalisation

// Layout de test
definePageMeta({
  layout: 'test',
})
</script>
