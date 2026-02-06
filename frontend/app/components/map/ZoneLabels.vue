<script setup lang="ts">
import { computed } from 'vue'
import type { GeoZone } from '~/stores/zone'
import { useProgressionStore } from '~/stores/progression'

const props = defineProps<{
  zones: GeoZone[]
  zoom: number
}>()

const progressionStore = useProgressionStore()

// Logique d'affichage des labels selon le zoom
const visibleZones = computed(() => {
  if (props.zoom > 12) return []
  return props.zones
})

/**
 * Vérifie si on doit masquer le label (cas spécifique : Région complétée)
 */
function shouldHideLabel(zone: GeoZone): boolean {
  // Uniquement pour les régions (Zoom < 6 correspond aux régions selon zone.ts)
  if (props.zoom < 6) {
    const id = zone.documentId || zone.id
    return progressionStore.isRegionCompleted(id)
  }
  return false
}

/**
 * Vérifie si les coordonnées sont valides pour éviter les erreurs Leaflet
 */
function isValidCoords(coords: [number, number] | null): boolean {
  if (!coords) return false
  return !isNaN(coords[0]) && !isNaN(coords[1]) && coords[0] !== 0 && coords[1] !== 0
}

/**
 * Calcule un centre approximatif pour placer le label.
 */
function getCenter(zone: GeoZone): [number, number] | null {
  try {
    const geo = zone.geometry
    if (!geo) return null
    
    let coords: any[] = []

    if (geo.type === 'Polygon') {
      coords = geo.coordinates[0]
    } else if (geo.type === 'MultiPolygon') {
      // Simplification: on prend le premier anneau du premier polygone
      coords = geo.coordinates[0][0]
    }

    if (!coords || coords.length === 0) return null

    // Moyenne des latitudes et longitudes
    let sumLat = 0
    let sumLng = 0
    const len = coords.length

    for (let i = 0; i < len; i++) {
      sumLng += coords[i][0]
      sumLat += coords[i][1]
    }

    const result: [number, number] = [sumLat / len, sumLng / len]
    return result
  } catch (e) {
    return null
  }
}
</script>

<template>
  <!-- On utilise des marqueurs invisibles qui contiennent juste une DivIcon avec le texte -->
  <template v-for="zone in visibleZones" :key="`label-${zoom}-${visibleZones.length}-${zone.documentId || zone.id}`">
    <LMarker
      v-if="isValidCoords(getCenter(zone)) && !shouldHideLabel(zone)"
      :lat-lng="getCenter(zone)!"
      :options="{ interactive: false, zIndexOffset: 1000 }"
    >
      <LIcon
        :icon-size="[100, 20]" 
        :icon-anchor="[50, 10]"
        class-name="zone-label-icon"
      >
        <div class="text-center font-pixel text-white text-shadow-outline text-xs whitespace-nowrap overflow-visible pointer-events-none">
          {{ zone.name }}
        </div>
      </LIcon>
    </LMarker>
  </template>
</template>

<style>
/* Classe passée à LIcon pour supprimer les styles par défaut de Leaflet qui pourraient gêner */
.zone-label-icon {
  background: transparent;
  border: none;
}

/* Helper pour le contour noir du texte (lisibilité) */
.text-shadow-outline {
  text-shadow: 
    -1px -1px 0 #000,  
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000;
}
</style>
