<template>
  <!-- Marqueur position utilisateur (Toujours visible) -->
  <LMarker :lat-lng="[userLat, userLng]">
    <LIcon
      icon-url="/assets/map/userpoint.svg"
      :icon-size="[20, 20]"
      :icon-anchor="[10, 10]"
    />
  </LMarker>

  <!-- Marqueurs Musées et POIs (Visibles seulement si zoom >= 9) -->
  <template v-if="isVisible">
    <LMarker
      v-for="museum in museums"
      :key="`museum-${museum.id}`"
      :lat-lng="[museum.lat, museum.lng]"
      @click="$emit('select-museum', museum)"
    >
      <LIcon
        :icon-url="`/assets/map/museum/${museum.tags[0] || 'Art'}.png`"
        :icon-size="[32, 24]"
        :icon-anchor="[16, 12]"
      />
    </LMarker>

    <LMarker
      v-for="poi in pois"
      :key="`poi-${poi.id}`"
      :lat-lng="[poi.lat, poi.lng]"
      @click="$emit('select-poi', poi)"
    >
      <LIcon
        :icon-url="getChestIcon(poi)"
        :icon-size="[32, 24]"
        :icon-anchor="[16, 12]"
      />
    </LMarker>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'
import { useVisitStore } from '~/stores/visit'

const visitStore = useVisitStore()

/**
 * Get the appropriate chest icon based on chest availability
 */
function getChestIcon(poi: Poi): string {
  const poiId = poi.id || poi.documentId
  const isAvailable = visitStore.isChestAvailable(poiId)

  return isAvailable
    ? '/assets/map/chest.png'
    : '/assets/map/chest-opened.png'
}

/**
 * Composant d'affichage des marqueurs sur la carte.
 * Affiche le marqueur de l'utilisateur, les marqueurs des musées avec icônes dynamiques,
 * et les marqueurs des POIs (coffres).
 */
const props = defineProps<{
  /** Liste des musées à afficher (données normalisées) */
  museums: Museum[]
  /** Liste des POIs à afficher (données normalisées) */
  pois: Poi[]
  /** Latitude de la position utilisateur */
  userLat: number
  /** Longitude de la position utilisateur */
  userLng: number
  /** Niveau de zoom actuel */
  zoom: number
}>()

const isVisible = computed(() => props.zoom >= 10)

defineEmits<{
  /** Émis quand un musée est sélectionné */
  'select-museum': [museum: Museum]
  /** Émis quand un POI est sélectionné */
  'select-poi': [poi: Poi]
}>()
</script>
