<template>
  <div class="flex flex-col gap-4">
    <!-- Card POI -->
    <div class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        :src="chestIcon"
        :alt="poi.name"
        class="w-full h-36 object-contain"
      />
      <div class="flex flex-col justify-between">
        <div>
          <h2 class="text-lg font-power mb-1 text-right">{{ poi.name }}</h2>
          <p class="text-base font-pixel text-gray-600 text-right mb-2">
            📍 Distance : {{ formattedDistance }}
          </p>
        </div>
        <p class="font-pixel text-right text-lg" :class="statusClass">
          {{ statusText }}
        </p>
      </div>
    </div>

    <!-- Boutons -->
    <div v-if="isTooFar || !isAvailable" class="w-full">
      <FormPixelButton
        color="red"
        variant="outline"
        class="w-full mt-4"
        disabled
      >
        {{ buttonText }}
      </FormPixelButton>
    </div>
    <div v-else>
      <FormPixelButton
        color="indigo"
        variant="filled"
        class="w-full mt-4"
        @click="handleOpenChest"
      >
        Ouvrir le coffre
      </FormPixelButton>
    </div>
    <div class="h-9 w-full" />
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
  /** Latitude de l'utilisateur */
  userLat: number
  /** Longitude de l'utilisateur */
  userLng: number
}>()

const { isTooFar, formattedDistance } = useDrawerLogic(toRef(props, 'distanceToUser'))
const { isAvailable, chestIcon, statusText } =
  useChestState(toRef(props, 'poi'))

const statusClass = computed(() =>
  isAvailable.value ? 'text-green-600' : 'text-orange-600'
)

const buttonText = computed(() => {
  if (isTooFar.value) return 'Vous êtes trop loin'
  if (!isAvailable.value) return 'Coffre indisponible'
  return 'Ouvrir le coffre'
})

async function handleOpenChest() {
  await navigateTo({
    path: '/chest',
    query: {
      poiId: props.poi.documentId || props.poi.id,
      lat: props.userLat,
      lng: props.userLng
    }
  })
}
</script>
