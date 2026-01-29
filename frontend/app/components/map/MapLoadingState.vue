<template>
  <div
    v-if="loading"
    class="absolute top-4 left-4 z-[1000] bg-white p-3 rounded shadow"
  >
    <slot>Getting your location...</slot>
  </div>
</template>

<script setup lang="ts">
/**
 * Composant d'affichage de l'état de chargement de la géolocalisation.
 * Affiche un indicateur en haut à gauche de la carte pendant le chargement.
 */
defineProps<{
  /** État de chargement */
  loading: boolean
}>()
</script>
