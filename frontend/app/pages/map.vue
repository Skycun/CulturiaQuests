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
          @ready="onMapReady"
          @moveend="onMapMove"
        >
          <LTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
            layer-type="base"
            name="OpenStreetMap"
          />

          <!-- Zones et Labels gérés manuellement dans le script via updateMapLayers -->

          <!-- Marqueurs extraits (Optimisé JS pur) -->
          <MapMarkers
            v-if="isMapReady"
            :map="mapRef.leafletObject"
            :museums="validMuseums"
            :pois="validPOIs"
            :user-lat="userLat"
            :user-lng="userLng"
            :zoom="currentZoom"
            @select-museum="selectItem"
            @select-poi="selectItem"
          />
          
          <!-- Brouillard de guerre -->
          <FogLayer v-if="isMapReady" :map="mapRef.leafletObject" />
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
import { ref, computed, onMounted, onUnmounted, watch, toRaw } from 'vue'
import type * as Leaflet from 'leaflet' // Type only import for SSR safety
import { useMuseumStore } from '~/stores/museum'
import { usePOIStore } from '~/stores/poi'
import { useGuildStore } from '~/stores/guild'
import { useRunStore } from '~/stores/run'
import { useFogStore } from '~/stores/fog'
import { useZoneStore, type GeoZone } from '~/stores/zone'
import { useProgressionStore } from '~/stores/progression'
import { useGeolocation } from '~/composables/useGeolocation'
import { useMapInteraction } from '~/composables/useMapInteraction'
import { calculateDistance } from '~/utils/geolocation'
import MapMarkers from '~/components/map/MapMarkers.vue'
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
const progressionStore = useProgressionStore()

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapBounds = ref<any>(null) // Limites visibles de la carte
const isMapReady = ref(false) // Flag de sécurité pour l'initialisation
const selectedItem = ref<LocationItem | null>(null)
const isDrawerOpen = ref(false)

// Leaflet Library (Loaded dynamically)
let L: typeof Leaflet

// Renderer Canvas persistant (évite le bug SVG removeLayer/_renderer)
let zoneRenderer: Leaflet.Canvas | null = null
let currentZoneLayer: Leaflet.GeoJSON | null = null
let currentLabelMarkers: Leaflet.Marker[] = []

// --- LOGIQUE RENDU ZONES (Fusionnée) ---

const ZONE_STYLE = {
  color: '#ffffff',
  weight: 3,
  opacity: 0.8,
  fill: false,
  lineCap: 'round' as const,
  lineJoin: 'round' as const
} as const

const getZoneCenter = (zone: GeoZone): [number, number] | null => {
  if (zone.centerLat && zone.centerLng) return [zone.centerLat, zone.centerLng]
  try {
    const geo = toRaw(zone.geometry)
    if (!geo) return null
    let coords: any[] = []
    if (geo.type === 'Polygon') coords = geo.coordinates[0]
    else if (geo.type === 'MultiPolygon') coords = geo.coordinates[0][0]
    if (!coords || coords.length === 0) return null
    let sumLat = 0, sumLng = 0
    const len = coords.length
    for (let i = 0; i < len; i++) {
      sumLng += coords[i][0]
      sumLat += coords[i][1]
    }
    return [sumLat / len, sumLng / len]
  } catch (e) { return null }
}

const shouldHideZoneLabel = (zone: GeoZone): boolean => {
  if (currentZoom.value < 8) {
    const id = zone.documentId || zone.id
    return progressionStore.isRegionCompleted(id)
  }
  return false
}

const renderZones = () => {
  const map = mapRef.value?.leafletObject
  if (!map || !isMapReady.value || !L) return

  // Suppression complète : layer + renderer Canvas (évite les tracés fantômes)
  if (currentZoneLayer) {
    try { currentZoneLayer.remove() } catch (_) { /* ignore */ }
    currentZoneLayer = null
  }
  if (zoneRenderer) {
    // Retrait DOM direct (évite le _redraw post-mortem de Leaflet qui crash sur _ctx)
    try {
      const c = (zoneRenderer as any)._container
      if (c?.parentNode) c.parentNode.removeChild(c)
    } catch (_) { /* ignore */ }
    zoneRenderer = null
  }

  const zones = visibleZones.value.filter(z => z.geometry)
  if (zones.length === 0) return

  const geoJsonData = {
    type: "FeatureCollection",
    features: zones.map(z => ({
      type: "Feature",
      geometry: toRaw(z.geometry),
      properties: { id: z.id, name: z.name, code: z.code }
    }))
  }

  try {
    zoneRenderer = L.canvas()
    currentZoneLayer = L.geoJSON(geoJsonData as any, {
      style: () => ZONE_STYLE,
      interactive: false,
      renderer: zoneRenderer
    }).addTo(map)
  } catch (e) {
    console.error("GeoJSON render error", e)
  }
}

const renderLabels = () => {
  const map = mapRef.value?.leafletObject
  if (!map || !isMapReady.value || !L) return

  // Suppression propre des markers précédents (divIcon = pas de SVG, .remove() fonctionne)
  currentLabelMarkers.forEach(m => { try { m.remove() } catch (_) { /* ignore */ } })
  currentLabelMarkers = []

  const zones = visibleZones.value

  zones.forEach(zone => {
    if (shouldHideZoneLabel(zone)) return
    const center = getZoneCenter(zone)
    if (!center) return

    const html = `<div class="text-center font-pixel text-white text-shadow-outline text-xs whitespace-nowrap overflow-visible pointer-events-none">${zone.name}</div>`

    const icon = L.divIcon({
      className: 'zone-label-icon',
      html: html,
      iconSize: [100, 20],
      iconAnchor: [50, 10]
    })

    const marker = L.marker(center, {
      icon: icon,
      interactive: false,
      zIndexOffset: 1000
    }).addTo(map)
    currentLabelMarkers.push(marker)
  })
}

const updateMapLayers = () => {
  renderZones()
  renderLabels()
}

// --- FIN LOGIQUE RENDU FUSIONNÉE ---

// Computed - Zones visibles selon le zoom ET la zone visible (BBOX)
const visibleZones = computed(() => {
  const zones = zoneStore.getZonesForZoom(currentZoom.value)
  
  // Optimisation BBOX : On n'affiche que ce qui est à l'écran pour les Comcoms (Zoom >= 11)
  if (currentZoom.value >= 11 && mapBounds.value) {
    // On ajoute une marge (pad) virtuelle de 10% pour que les zones ne "popent" pas
    const bounds = mapBounds.value
    // console.log('📍 BBOX Filtering active. Bounds:', bounds.toBBoxString())
    
    return zones.filter(z => {
      // Si pas de centre, on affiche dans le doute
      if (!z.centerLat || !z.centerLng) return true
      
      // Leaflet bounds.contains([lat, lng])
      return bounds.contains([z.centerLat, z.centerLng])
    })
  }
  
  // Si pas de bounds (chargement) ou zoom faible, on affiche tout (ou par distance sécu)
  return zones
})

// Watchers Globaux (Placé ici pour éviter TDZ sur visibleZones)
watch([visibleZones, isMapReady], () => {
  updateMapLayers()
}, { deep: false })

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

// Computed - Valid markers (filtrer les coordonnées invalides ET distance)
// On utilise directement le store qui contient TOUS les items chargés
// Affiche uniquement si le zoom permet de voir les Comcoms (>= 11)
const validMuseums = computed<Museum[]>(() => {
  if (currentZoom.value < 11) return []
  const RADIUS_KM = 20
  return museumStore.museums.filter((m) => {
    if (m.lat === undefined || m.lng === undefined) return false
    return calculateDistance(userLat.value, userLng.value, m.lat, m.lng) <= RADIUS_KM
  })
})

const validPOIs = computed<Poi[]>(() => {
  if (currentZoom.value < 11) return []
  const RADIUS_KM = 20
  return poiStore.pois.filter((p) => {
    if (p.lat === undefined || p.lng === undefined) return false
    return calculateDistance(userLat.value, userLng.value, p.lat, p.lng) <= RADIUS_KM
  })
})

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

// Mise à jour des limites visibles (BBOX)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onMapMove(e?: any) {
  // e.target est la map si l'event vient de leaflet
  const map = mapRef.value?.leafletObject || e?.target
  if (map && map.getBounds) {
    // On élargit un peu la zone (pad 0.2 = +20%) pour précharger ce qui arrive
    mapBounds.value = map.getBounds().pad(0.2) 
  }
}

// Initialisation des bounds au chargement
function onMapReady() {
  onMapMove()
  // On laisse un petit tick pour être sûr que l'objet Leaflet est bien attaché
  setTimeout(() => {
    const map = mapRef.value?.leafletObject
    if (map) {
      map.invalidateSize() // Force le redessin si la taille était mal détectée
    }
    isMapReady.value = true
    updateMapLayers() // Premier rendu manuel
    console.log('✅ Map is ready and layers activated')
  }, 100)
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

  try {
    const result = await runStore.startExpedition(museumId, userLat.value, userLng.value)

    if (result.questRolled) {
      navigateTo('/npc-interaction')
    } else {
      navigateTo('/expedition')
    }
  } catch (e: any) {
    console.error('Failed to start expedition:', e)
  }
}

// Fetch ALL locations (Global load)
async function fetchAllLocations(): Promise<void> {
  // init() gère automatiquement le cache IndexedDB et le fetch paginé si besoin
  await Promise.all([
    museumStore.init(),
    poiStore.init()
  ])
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
})

// Lifecycle
onMounted(async () => {
  // IMPORT DYNAMIQUE POUR ÉVITER SSR ERROR
  const leafletModule = await import('leaflet')
  L = leafletModule.default || leafletModule

  await guildStore.fetchAll()
  await fetchAllLocations() // Chargement global au démarrage
  
  // Optimisation Fog: Nettoyage des points dans les régions complétées
  // Note: zoneStore est initialisé dans app.vue via zoneStore.init(), pas par fetchAllLocations
  if (zoneStore.regions.length > 0) {
    const completedRegions = zoneStore.regions.filter(r => 
      progressionStore.isRegionCompleted(r.documentId || r.id.toString())
    )
    if (completedRegions.length > 0) {
      fogStore.removePointsInZones(completedRegions)
    }
  }
})

onUnmounted(() => {
  geolocation.stopTracking()
  // Nettoyage des layers
  if (currentZoneLayer) try { currentZoneLayer.remove() } catch (_) { /* ignore */ }
  currentLabelMarkers.forEach(m => { try { m.remove() } catch (_) { /* ignore */ } })
})
</script>

<style>
.zone-label-icon {
  background: transparent;
  border: none;
}

.text-shadow-outline {
  text-shadow: 
    -1px -1px 0 #000,  
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000;
}
</style>