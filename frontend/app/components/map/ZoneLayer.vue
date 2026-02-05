<template>
  <LGeoJson
    v-for="zone in zones"
    :key="`zone-${zone.id}`"
    :geojson="zone.geometry"
    :options="getOptions()"
    :options-style="getStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GeoZone } from '~/stores/zone'

const props = defineProps<{
  zones: GeoZone[]
}>()

const getStyle = () => {
  return {
    color: '#ffffff', // Blanc comme demandé
    weight: 3,        // Gras
    opacity: 0.8,
    fill: false,      // Pas de fond
    className: 'zone-border' // Pour custom CSS éventuel
  }
}

function getOptions() {
  return {
    interactive: false // Non cliquable
  }
}
</script>

<style>
/* 
  Si on veut ajouter une ombre portée (drop-shadow) sur le SVG directement,
  on peut cibler la classe .zone-border path 
*/
.zone-border path {
  filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
