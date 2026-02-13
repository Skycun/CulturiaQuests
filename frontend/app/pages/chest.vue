<template>
  <div class="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-stone-950 flex flex-col items-center justify-center p-4">
    <!-- Loading -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <p class="text-white font-pixel text-xl">Chargement...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center">
      <p class="text-red-400 font-pixel text-xl mb-4">{{ error }}</p>
      <FormPixelButton color="indigo" @click="goBack">
        Revenir à la carte
      </FormPixelButton>
    </div>

    <!-- Closed chest with "Suivant" button -->
    <div v-else-if="!chestOpened" class="w-full max-w-md flex flex-col items-center flex-1 justify-center">
      <div ref="chestContainer" class="mb-8">
        <img
          ref="chestImage"
          src="/assets/map/chest.png"
          alt="Coffre"
          class="w-64 h-64 mx-auto drop-shadow-2xl"
        />
      </div>
      <div class="w-full px-4 mt-auto pb-8">
        <FormPixelButton
          color="indigo"
          variant="filled"
          class="w-full"
          @click="openChest"
        >
          Suivant
        </FormPixelButton>
      </div>
    </div>

    <!-- Loot display -->
    <ChestLootDisplay
      v-else-if="loot"
      :loot="loot"
      @back="goBack"
    />
  </div>
</template>

<script setup lang="ts">
import type { ChestLoot } from '~/types/loot'
import { useVisitStore } from '~/stores/visit'
import { useGuildStore } from '~/stores/guild'
import { usePOIStore } from '~/stores/poi'
import { useChestAnimation } from '~/composables/useChestAnimation'
import { useZoneCompletion } from '~/composables/useZoneCompletion'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const router = useRouter()
const visitStore = useVisitStore()
const guildStore = useGuildStore()
const poiStore = usePOIStore()
const { animateChestBounce, animateFadeOut } = useChestAnimation()
const zoneCompletion = useZoneCompletion()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const loot = ref<ChestLoot | null>(null)
const chestOpened = ref(false)

// Template refs
const chestContainer = ref<HTMLElement>()
const chestImage = ref<HTMLImageElement>()

// Route params
const poiId = computed(() => route.query.poiId as string)
const userLat = computed(() => parseFloat(route.query.lat as string))
const userLng = computed(() => parseFloat(route.query.lng as string))

function goBack() {
  router.push('/map')
}

async function openChest() {
  try {
    // 1. Animate chest bounce
    if (chestImage.value) {
      await animateChestBounce(chestImage.value)
    }

    // 2. Call API to open chest
    loot.value = await visitStore.openChest(
      poiId.value,
      userLat.value,
      userLng.value
    )

    // 3. Refresh guild stats
    await guildStore.refetchStats()

    // 3b. Vérifier auto-complétion de la comcom (chemin visites)
    const poi = poiStore.pois.find(p => (p.documentId || p.id) === poiId.value)
    if (poi?.lat !== undefined && poi?.lng !== undefined) {
      zoneCompletion.checkVisitCoverage(poi.lat, poi.lng)
    }

    // 4. Update chest image
    if (chestImage.value) {
      chestImage.value.src = '/assets/map/chest-opened.png'
    }

    // 5. Fade out closed chest
    if (chestContainer.value) {
      await animateFadeOut(chestContainer.value)
    }

    // 6. Show loot display
    chestOpened.value = true

  } catch (e) {
    console.error('Failed to open chest:', e)
    error.value = e instanceof Error ? e.message : 'Impossible d\'ouvrir le coffre'
  }
}

onMounted(() => {
  // Validate route params
  if (!poiId.value || isNaN(userLat.value) || isNaN(userLng.value)) {
    error.value = 'Paramètres invalides'
    loading.value = false
    return
  }

  loading.value = false
})
</script>
