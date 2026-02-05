<template>
  <div class="min-h-screen bg-gray-100 font-sans">
    <main class="h-[100vh] w-full relative">
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
          v-model:zoom="currentZoom"
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

          <!-- Zones (Com-coms) -->
          <ZoneLayer :zones="visibleZones" />
          <ZoneLabels :zones="visibleZones" :zoom="currentZoom" />

          <!-- Marqueurs extraits -->
          <MapMarkers
            :museums="validMuseums"
            :pois="validPOIs"
            :user-lat="userLat"
            :user-lng="userLng"
            @select-museum="selectItem"
            @select-poi="selectItem"
          />
          
          <!-- Brouillard de guerre -->
          <FogLayer v-if="mapRef?.leafletObject" :map="mapRef.leafletObject" />
        </LMap>
      </ClientOnly>

      <!-- Drawer Information -->
      <BottomDrawer v-model="isDrawerOpen">
        <MapDrawerContent
          :selected-item="selectedItem"
          :guild-characters="guildCharacters"
          :distance-to-user="distanceToSelectedItem"
          :user-lat="userLat"
          :user-lng="userLng"
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
import { useRunStore } from '~/stores/run'
import { useFogStore } from '~/stores/fog'
import { useZoneStore } from '~/stores/zone'
import { useGeolocation } from '~/composables/useGeolocation'
import { useMapInteraction } from '~/composables/useMapInteraction'
import { calculateDistance } from '~/utils/geolocation'
import MapMarkers from '~/components/map/MapMarkers.vue'
import ZoneLayer from '~/components/map/ZoneLayer.vue'
import ZoneLabels from '~/components/map/ZoneLabels.vue'
import FogLayer from '~/components/map/FogLayer.vue'
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
const runStore = useRunStore()
const fogStore = useFogStore()
const zoneStore = useZoneStore()

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
const currentZoom = ref(13)
const selectedItem = ref<LocationItem | null>(null)
const isDrawerOpen = ref(false)
const expeditionLoading = ref(false)
const expeditionError = ref<string | null>(null)

// Computed - Zones visibles selon le zoom
const visibleZones = computed(() => zoneStore.getZonesForZoom(currentZoom.value))

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
// On utilise directement le store qui contient TOUS les items chargés
const validMuseums = computed<Museum[]>(() =>
  museumStore.museums.filter((m) => m.lat !== undefined && m.lng !== undefined)
)

const validPOIs = computed<Poi[]>(() =>
  poiStore.pois.filter((p) => p.lat !== undefined && p.lng !== undefined)
)

// Computed - Distance to selected item
const distanceToSelectedItem = computed<number>(() => {
  if (!selectedItem.value) return 0

  const itemLat = selectedItem.value.lat
  const itemLng = selectedItem.value.lng

  if (itemLat === undefined || itemLng === undefined) return 0

  return calculateDistance(userLat.value, userLng.value, itemLat, itemLng)
})

// Destructure geolocation state
const { userLat, userLng, geolocLoading } = geolocation

// Handlers
function handleGeolocationAllow(): void {
  geolocation.startTracking()
}

function handleGeolocationDeny(): void {
  console.log('User declined geolocation')
}

function selectItem(item: LocationItem) {
  selectedItem.value = item
  isDrawerOpen.value = true
  mapInteraction.flyToItem(mapRef.value, item)
}

async function handleStartExpedition() {
  if (!selectedItem.value) return

  const museumId = selectedItem.value.documentId
  if (!museumId) {
    console.error("Museum has no documentId")
    return
  }

  expeditionLoading.value = true
  expeditionError.value = null

  try {
    const result = await runStore.startExpedition(museumId, userLat.value, userLng.value)

    if (result.questRolled) {
      // NPC tiré → page interaction NPC avec dialogues
      navigateTo('/npc-interaction')
    } else {
      // Pas de NPC → directement à l'expédition
      navigateTo('/expedition')
    }
  } catch (e: any) {
    console.error('Failed to start expedition:', e)
    expeditionError.value = e?.error?.message || e?.message || 'Erreur lors du lancement'
  } finally {
    expeditionLoading.value = false
  }
}

// Fetch ALL locations (Global load)
async function fetchAllLocations(): Promise<void> {
  // Charge tout en parallèle si le store est vide ou pour rafraîchir
  if (!museumStore.hasMuseums) museumStore.fetchAll()
  if (!poiStore.hasPOIs) poiStore.fetchAll()
}

// Register geolocation callbacks
geolocation.registerCallbacks({
  onFirstPosition: (lat, lng) => {
    console.log('First position obtained:', lat, lng)
    if (mapRef.value?.leafletObject) {
      mapInteraction.flyToCoords(mapRef.value, lat, lng, 13, 1.5)
    }
    // Enregistre la position initiale
    fogStore.addPosition(lat, lng)
  },
  onPositionUpdate: (lat, lng) => {
    // Enregistre le déplacement
    fogStore.addPosition(lat, lng)
  },
  // Plus de rechargement par distance nécessaire car on a tout chargé
})

// Lifecycle
onMounted(() => {
  guildStore.fetchAll()
  fetchAllLocations() // Chargement global au démarrage
})
</script>
