<template>
  <div class="h-[100vh] w-full relative">
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
      <div v-if="selectedItem" class="flex flex-col gap-4">

        <div v-if="isMuseum(selectedItem)" class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
          <img
            :src="selectedItem.attributes?.coverImage?.url || '/assets/musee.png'"
            :alt="getName(selectedItem)"
            class="w-full h-48 object-contain"
          />
          <div class="flex flex-col justify-between">
            <h2 class="text-xl font-power mb-2 text-right gap-4">{{ getName(selectedItem) }}</h2>
            <div class="flex flex-row-reverse gap-2 flex-">
              <TagCategory variant="outline" category="histoire" />
              <TagCategory variant="outline" category="art" />
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl">
          <p class="text-center font-pixel text-3xl">DPS: 1578</p>
          <p class="font-onest text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p class="font-onest text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>

          
        <div class="bg-white rounded-2xl text-xs font-mono">
          <p>
            Type: 
            <span :class="isMuseum(selectedItem) ? 'text-blue-600' : 'text-orange-600'" class="font-bold">
              {{ isMuseum(selectedItem) ? 'Museum' : 'Point of Interest' }}
            </span>
          </p>
            <p>ID: {{ selectedItem.id }}</p>
            <p>Lat: {{ getLat(selectedItem)?.toFixed(6) }}</p>
            <p>Lng: {{ getLng(selectedItem)?.toFixed(6) }}</p>
        </div>
        <FormPixelButton v-if="isMuseum(selectedItem)" color="indigo" variant="filled" class="w-full mt-4">
          Démarer l'expédition
        </FormPixelButton>
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

  // Animation de la carte
  if (map.value?.leafletObject) {
    const lMap = map.value.leafletObject
    const lat = getLat(item)
    const lng = getLng(item)

    if (lat !== undefined && lng !== undefined) {
      const targetZoom = 16
      const targetLatLng = [lat, lng] as [number, number]
      
      // Calcul du décalage pour centrer "haut" (pour laisser la place au drawer)
      // On veut que le point soit à ~25% du haut de l'écran
      const mapHeight = lMap.getSize().y
      const offsetY = mapHeight * 0.25 // Le point sera décalé de 25% vers le haut par rapport au centre
      
      // On projette le latlng en pixels au niveau de zoom cible
      const point = lMap.project(targetLatLng, targetZoom)
      
      // On ajoute le décalage (on descend le centre de la carte pour que le point remonte)
      const targetPoint = point.add([0, offsetY])
      
      // On reconvertit en latlng
      const newCenter = lMap.unproject(targetPoint, targetZoom)
      
      lMap.flyTo(newCenter, targetZoom, {
        animate: true,
        duration: 0.8
      })
    }
  }
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

function isMuseum(item: LocationItem): item is Museum {
  return 'radius' in item || (!!item.attributes && 'radius' in item.attributes)
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
