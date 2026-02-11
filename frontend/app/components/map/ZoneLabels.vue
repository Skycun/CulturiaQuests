<script setup lang="ts">
import { onMounted, onUnmounted, watch, toRaw, computed } from 'vue'
import L from 'leaflet'
import type { GeoZone } from '~/stores/zone'
import { useProgressionStore } from '~/stores/progression'

const props = defineProps<{
  zones: GeoZone[]
  zoom: number
  map: any // Instance Leaflet
}>()

const progressionStore = useProgressionStore()
let labelsLayer: L.LayerGroup | null = null

// Logique de filtrage (similaire à l'ancien template)
const visibleZones = computed(() => {
  if (props.zoom > 12) return [] // Trop zoomé, on masque
  return props.zones
})

/**
 * Vérifie si on doit masquer le label (cas spécifique : Région complétée)
 */
function shouldHideLabel(zone: GeoZone): boolean {
  if (props.zoom < 8) {
    const id = zone.documentId || zone.id
    return progressionStore.isRegionCompleted(id)
  }
  return false
}

/**
 * Calcule un centre approximatif ou utilise le pré-calculé
 */
function getCenter(zone: GeoZone): [number, number] | null {
  // 1. Essai rapide: propriétés pré-calculées
  if (zone.centerLat && zone.centerLng) {
    return [zone.centerLat, zone.centerLng]
  }

  // 2. Fallback: Calcul (rare si tout est bien chargé)
  try {
    const geo = toRaw(zone.geometry)
    if (!geo) return null
    
    let coords: any[] = []
    if (geo.type === 'Polygon') {
      coords = geo.coordinates[0]
    } else if (geo.type === 'MultiPolygon') {
      coords = geo.coordinates[0][0]
    }

    if (!coords || coords.length === 0) return null

    let sumLat = 0
    let sumLng = 0
    const len = coords.length
    for (let i = 0; i < len; i++) {
      sumLng += coords[i][0]
      sumLat += coords[i][1]
    }
    return [sumLat / len, sumLng / len]
  } catch (e) {
    return null
  }
}

const renderLabels = () => {
  const rawMap = toRaw(props.map)
  if (!rawMap) return

  // 1. Nettoyage
  if (labelsLayer) {
    try {
      rawMap.removeLayer(labelsLayer)
      labelsLayer.clearLayers()
    } catch (e) {
      // Ignore
    }
    labelsLayer = null
  }

  // 2. Création Groupe
  labelsLayer = L.layerGroup().addTo(rawMap)

  // 3. Création des Labels
  const zonesToRender = visibleZones.value
  
  // DEBUG
  console.log(`🏷️ ZoneLabels rendering: ${zonesToRender.length} labels. Zoom: ${props.zoom}`)

  zonesToRender.forEach(zone => {
    if (shouldHideLabel(zone)) return

    const center = getCenter(zone)
    if (!center) return

    // Création HTML Icon
    const myIcon = L.divIcon({
      className: 'zone-label-icon',
      // Test Debug: Texte rouge gras sans font custom
      html: `<div class="text-center font-bold text-red-600 text-lg whitespace-nowrap overflow-visible pointer-events-none" style="text-shadow: 1px 1px 2px white;">${zone.name}</div>`,
      iconSize: [100, 20],
      iconAnchor: [50, 10]
    })

    const marker = L.marker(center, {
      icon: myIcon,
      interactive: false,
      zIndexOffset: 1000
    })

    labelsLayer!.addLayer(marker)
  })
}

// Watchers
watch(() => [props.zones, props.zoom, props.map], () => {
   // Reset si changement de map
   if (props.map && labelsLayer && labelsLayer._map !== toRaw(props.map)) {
      labelsLayer = null
   }
   renderLabels()
})

onMounted(() => {
  renderLabels()
})

onUnmounted(() => {
  if (labelsLayer && props.map) {
    const rawMap = toRaw(props.map)
    try {
      rawMap.removeLayer(labelsLayer)
    } catch (e) {
      // Safe cleanup
    }
  }
})
</script>

<template>
  <div style="display: none;"></div>
</template>

<style>
/* Styles globaux pour les icônes */
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
