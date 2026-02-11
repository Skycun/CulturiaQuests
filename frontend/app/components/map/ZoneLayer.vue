<template>
  <div style="display: none;"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, toRaw } from 'vue'
import L from 'leaflet'
import type { GeoZone } from '~/stores/zone'

const props = defineProps<{
  zones: GeoZone[]
  map: any // Instance Leaflet
}>()

// LayerGroup global pour gérer proprement le nettoyage
let mainLayerGroup: L.LayerGroup | null = null

const getStyle = () => {
  return {
    color: '#ffffff', // Blanc
    weight: 3,        // Gras
    opacity: 0.8,
    fill: false,      // Pas de fond
    className: 'zone-border'
  }
}

const renderZones = () => {
  const rawMap = toRaw(props.map)
  if (!rawMap) return

  // 1. Init / Reset complet du groupe
  // Au lieu de clearLayers() qui plante sur les nested GeoJSON, on détruit tout
  if (mainLayerGroup) {
    try {
      rawMap.removeLayer(mainLayerGroup)
    } catch (e) {
      // ignore
    }
    mainLayerGroup = null
  }
  
  mainLayerGroup = L.layerGroup().addTo(rawMap)

  // 2. (Supprimé car on vient de recréer)
  // mainLayerGroup.clearLayers()

  // 3. Filtrage sécurité
  const validZones = props.zones.filter(z => z.geometry)
  
  // DEBUG
  console.log(`🌍 ZoneLayer rendering: ${validZones.length} zones. Sample:`, validZones[0]?.name)

  if (validZones.length === 0) return

  // 4. Transformation et Ajout
  const geoJsonData = {
    type: "FeatureCollection",
    features: validZones.map(z => ({
      type: "Feature",
      geometry: toRaw(z.geometry),
      properties: {
        id: z.id,
        name: z.name,
        code: z.code
      }
    }))
  }

  try {
    const newLayer = L.geoJSON(geoJsonData as any, {
      style: getStyle,
      interactive: false
    })
    mainLayerGroup.addLayer(newLayer)
  } catch (e) {
    console.error("Leaflet GeoJSON error:", e)
  }
}

// Watch changes (Zones OU Instance de carte)
watch(() => [props.zones, props.map], () => {
  // Si la map a changé, il faut s'assurer que mainLayerGroup est recréé sur la nouvelle map
  if (props.map && mainLayerGroup && mainLayerGroup._map !== toRaw(props.map)) {
     mainLayerGroup = null // On force la recréation
  }
  renderZones()
}, { deep: false })

onMounted(() => {
  renderZones()
})

onUnmounted(() => {
  if (mainLayerGroup && props.map) {
    const rawMap = toRaw(props.map)
    try {
      rawMap.removeLayer(mainLayerGroup)
    } catch (e) {
      // Safe cleanup
    }
    mainLayerGroup = null
  }
})
</script>

<style>
.zone-border path {
  filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
