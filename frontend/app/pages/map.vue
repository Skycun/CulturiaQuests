<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    <main class="h-[100vh] w-full relative pt-14 pb-16">
      <!-- Geolocation request -->
      <GeolocationRequest
        @allow="handleGeolocationAllow"
        @deny="handleGeolocationDeny"
      />

      <!-- Loading state -->
      <MapLoadingState :loading="geolocLoading">
        Localisation en cours...
      </MapLoadingState>

      <!-- Carte Leaflet -->
      <ClientOnly>
        <LMap
          ref="mapRef"
          :zoom="13"
          :center="[userLat, userLng]"
          :use-global-leaflet="false"
          class="h-full w-full"
        >
          <LTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
            layer-type="base"
            name="OpenStreetMap"
          />

          <!-- Marqueurs extraits -->
          <MapMarkers
            :museums="validMuseums"
            :pois="validPOIs"
            :user-lat="userLat"
            :user-lng="userLng"
            @select-museum="selectItem"
            @select-poi="selectItem"
          />
        </LMap>
      </ClientOnly>

      <!-- Drawer Information -->
      <BottomDrawer v-model="isDrawerOpen">
        <MapDrawerContent
          :selected-item="selectedItem"
          :guild-characters="guildCharacters"
          @start-expedition="handleStartExpedition"
        />
      </BottomDrawer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useMuseumStore } from '~/stores/museum'
import { usePOIStore } from '~/stores/poi'
import { useGuildStore } from '~/stores/guild'
import { useGeolocation } from '~/composables/useGeolocation'
import { useMapInteraction } from '~/composables/useMapInteraction'
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'

type LocationItem = Museum | Poi

definePageMeta({
  layout: 'default',
})

// Stores
const museumStore = useMuseumStore()
const poiStore = usePOIStore()
const guildStore = useGuildStore()

// Composables
const geolocation = useGeolocation({
  defaultLat: 49.1167,  // Saint-Lô
  defaultLng: -1.0833,
  reloadThresholdKm: 5
})

const mapInteraction = useMapInteraction()

// Refs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRef = ref<any>(null) // Type any car Leaflet map non typé
const nearbyMuseums = ref<Museum[]>([])
const nearbyPOIs = ref<Poi[]>([])
const selectedItem = ref<LocationItem | null>(null)
const isDrawerOpen = ref(false)

// Computed - Guild characters
const guildCharacters = computed(() => {
  const guild = guildStore.guild
  if (!guild) return []

  // Support structure Strapi v4/v5
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const charactersData = guild.attributes?.characters || (guild as any).characters
  if (!charactersData) return []

  const chars = charactersData.data || charactersData
  return Array.isArray(chars) ? chars : []
})

// Computed - Valid markers (filtrer les coordonnées invalides)
const validMuseums = computed<Museum[]>(() =>
  nearbyMuseums.value.filter((m) => m.lat !== undefined && m.lng !== undefined)
)

const validPOIs = computed<Poi[]>(() =>
  nearbyPOIs.value.filter((p) => p.lat !== undefined && p.lng !== undefined)
)

// Destructure geolocation state
const { userLat, userLng, geolocLoading } = geolocation

// Handlers
function handleGeolocationAllow(): void {
  fetchNearbyLocations()
  geolocation.startTracking()
}

function handleGeolocationDeny(): void {
  console.log('User declined geolocation, using Saint-Lô default')
  fetchNearbyLocations()
}

function selectItem(item: LocationItem) {
  selectedItem.value = item
  isDrawerOpen.value = true
  mapInteraction.flyToItem(mapRef.value, item)
}

function handleStartExpedition() {
  console.log('Starting expedition for:', selectedItem.value)
  // TODO: Navigate to expedition page
  // navigateTo(`/expedition/${selectedItem.value?.documentId}`)
}

// Fetch nearby locations
async function fetchNearbyLocations(): Promise<void> {
  const radius = 10 // 10 km

  const [museums, pois] = await Promise.all([
    museumStore.fetchNearby(radius, userLat.value, userLng.value),
    poiStore.fetchNearby(radius, userLat.value, userLng.value)
  ])

  nearbyMuseums.value = museums
  nearbyPOIs.value = pois

  console.log(`Found ${museums.length} museums and ${pois.length} POIs within ${radius}km`)
}

// Register geolocation callbacks
geolocation.registerCallbacks({
  onFirstPosition: (lat, lng) => {
    console.log('First position obtained:', lat, lng)
    fetchNearbyLocations()
    mapInteraction.flyToCoords(mapRef.value, lat, lng, 13, 1.5)
  },
  onDistanceThresholdReached: (distance) => {
    console.log(`User moved ${distance.toFixed(2)}km, reloading locations...`)
    fetchNearbyLocations()
  }
})

// Lifecycle
onMounted(() => {
  guildStore.fetchAll()
})
</script>
