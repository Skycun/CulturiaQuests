<template>
  <div class="flex flex-col gap-4">
    <!-- Card POI -->
    <div class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        src="/assets/map/chest.png"
        :alt="poi.name"
        class="w-full h-36 object-contain"
      />
      <div class="flex flex-col justify-between">
        <div>
          <h2 class="text-xl font-power mb-1 text-right">{{ poi.name }}</h2>
          <p class="text-sm font-onest text-gray-600 text-right mb-2">
            📍 Distance : {{ formattedDistance }}
          </p>
        </div>
        <p class="font-onest text-right text-xs">Réinitialisation dans 15:45:56</p>
      </div>
    </div>

    <!-- Message collecté -->
    <div class="bg-white p-4 rounded-2xl">
      <p class="text-center font-pixel text-2xl">Objet collecté</p>
    </div>

    <!-- Boutons CTA -->
    <div v-if="isTooFar" class="w-full">
      <FormPixelButton
        color="red"
        variant="outline"
        class="w-full mt-4"
        disabled
      >
        Vous êtes trop loin
      </FormPixelButton>
    </div>
    <div v-else>
      <FormPixelButton
        color="indigo"
        variant="filled"
        class="w-full mt-4"
      >
        Ouvrir le coffre
      </FormPixelButton>
    </div>
    <div class="h-9 w-full"></div>
  </div>
</template>

<script setup lang="ts">
import type { Poi } from '~/types/poi'

/**
 * Composant d'affichage du drawer pour un POI (Point d'Intérêt) sélectionné.
 * Affiche les informations du coffre et son état.
 */
const props = defineProps<{
  /** Le POI sélectionné */
  poi: Poi
  /** Distance en km entre l'utilisateur et le POI */
  distanceToUser: number
}>()

const { isTooFar, formattedDistance } = useDrawerLogic(toRef(props, 'distanceToUser'))
</script>
