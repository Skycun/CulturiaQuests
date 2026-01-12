<template>
  <div v-if="selectedItem">
    <!-- Délègue au composant Museum si c'est un musée -->
    <MapMuseumDrawer
      v-if="isMuseum"
      :museum="selectedItem"
      :guild-characters="guildCharacters"
      :distance-to-user="distanceToUser"
      @start-expedition="$emit('start-expedition')"
    />
    <!-- Délègue au composant POI sinon -->
    <MapPOIDrawer
      v-else
      :poi="selectedItem"
      :distance-to-user="distanceToUser"
    />
  </div>
</template>

<script setup lang="ts">
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'
import type { Character } from '~/types/character'

/**
 * Wrapper qui choisit entre MuseumDrawer et POIDrawer selon le type d'élément sélectionné.
 * Effectue le type guard et délègue l'affichage au composant approprié.
 */
const props = defineProps<{
  /** L'élément sélectionné (Museum ou POI, null si aucun) */
  selectedItem: Museum | Poi | null
  /** Liste des personnages de la guilde (pour museums) */
  guildCharacters: Character[]
  /** Distance en km entre l'utilisateur et l'élément sélectionné */
  distanceToUser: number
}>()

defineEmits<{
  /** Émis quand l'utilisateur clique sur "Démarrer l'expédition" */
  'start-expedition': []
}>()

/**
 * Type guard : détermine si l'élément sélectionné est un musée.
 * Basé sur la présence de la propriété 'radius' (Museum uniquement).
 */
const isMuseum = computed(() => {
  if (!props.selectedItem) return false
  return 'radius' in props.selectedItem
})
</script>
