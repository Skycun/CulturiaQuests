<template>
  <!-- Marqueur position utilisateur (Géré par Vue car unique et très dynamique) -->
  <LMarker :lat-lng="[userLat, userLng]">
    <LIcon
      icon-url="/assets/map/userpoint.svg"
      :icon-size="[20, 20]"
      :icon-anchor="[10, 10]"
    />
  </LMarker>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, toRaw, computed } from 'vue'
import L from 'leaflet'
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'
import { useVisitStore } from '~/stores/visit'
import { calculateDistance } from '~/utils/geolocation'

const visitStore = useVisitStore()

const props = defineProps<{
  museums: Museum[]
  pois: Poi[]
  userLat: number
  userLng: number
  zoom: number
  map: any // Instance Leaflet
}>()

const emit = defineEmits<{
  'select-museum': [museum: Museum]
  'select-poi': [poi: Poi]
}>()

// LayerGroup natif pour les performances
let markersLayer: L.LayerGroup | null = null

// --- ICONS CACHE ---
const iconCache = new Map<string, L.Icon>()

function getIcon(url: string, size: [number, number], anchor: [number, number]): L.Icon {
  if (!iconCache.has(url)) {
    iconCache.set(url, L.icon({
      iconUrl: url,
      iconSize: size,
      iconAnchor: anchor,
      popupAnchor: [0, -size[1]]
    }))
  }
  return iconCache.get(url)!
}

function getChestIconUrl(poi: Poi): string {
  const poiId = poi.id || poi.documentId
  return visitStore.isChestAvailable(poiId)
    ? '/assets/map/chest.png'
    : '/assets/map/chest-opened.png'
}

// --- RENDERING ---

const renderMarkers = () => {
  // Utiliser l'objet brut pour éviter les erreurs de Proxy Vue
  const rawMap = toRaw(props.map)
  if (!rawMap) return

  // 1. Nettoyage radical
  if (markersLayer) {
    try {
      rawMap.removeLayer(markersLayer)
    } catch (e) {
      // Map déjà détruite ou layer déjà parti
    }
    markersLayer = null
  }

  // Seuil de zoom (Optimisation) - POIs visibles à partir de 11
  if (props.zoom < 11) return

  // 2. Création d'un nouveau groupe frais
  markersLayer = L.layerGroup().addTo(rawMap)

  // 3. Peuplage (Filtre Distance 10km)
  const RADIUS_KM = 10

  props.museums.forEach(m => {
    if (!m.lat || !m.lng) return
    
    // Distance check
    if (calculateDistance(props.userLat, props.userLng, m.lat, m.lng) > RADIUS_KM) return

    const iconUrl = `/assets/map/museum/${m.tags?.[0]?.name || 'Art'}.png`
    const marker = L.marker([m.lat, m.lng], {
      icon: getIcon(iconUrl, [32, 24], [16, 12])
    })
    marker.on('click', () => emit('select-museum', m))
    markersLayer!.addLayer(marker)
  })

  props.pois.forEach(p => {
    if (!p.lat || !p.lng) return

    // Distance check
    if (calculateDistance(props.userLat, props.userLng, p.lat, p.lng) > RADIUS_KM) return

    const iconUrl = getChestIconUrl(p)
    const marker = L.marker([p.lat, p.lng], {
      icon: getIcon(iconUrl, [32, 24], [16, 12])
    })
    marker.on('click', () => emit('select-poi', p))
    markersLayer!.addLayer(marker)
  })
}

// --- LIFECYCLE ---

onMounted(() => {
  if (props.map) {
    const rawMap = toRaw(props.map)
    markersLayer = L.layerGroup().addTo(rawMap)
    renderMarkers()
  }
})

onUnmounted(() => {
  if (markersLayer && props.map) {
    const rawMap = toRaw(props.map)
    try {
      rawMap.removeLayer(markersLayer)
    } catch (e) {
      // Ignore
    }
  }
})

// Réactivité Optimisée
// On ne redessine que si les données changent ou si on franchit le seuil de zoom 11
const isZoomVisible = computed(() => props.zoom >= 11)

watch(() => [props.museums, props.pois, isZoomVisible.value, props.userLat, props.userLng], renderMarkers)

// Watch spécifique pour l'état des coffres
watch(() => visitStore.visits.length, renderMarkers)
</script>
