<template>
  <div class="min-h-screen bg-gradient-to-b from-purple-900 to-indigo-900 flex items-center justify-center p-4">
    <!-- Loading -->
    <div v-if="loading" class="text-center">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
      <p class="text-white font-pixel text-xl">Ouverture du coffre...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center">
      <p class="text-red-400 font-pixel text-xl mb-4">{{ error }}</p>
      <FormPixelButton color="indigo" @click="goBack">
        Retour à la carte
      </FormPixelButton>
    </div>

    <!-- Chest animation & loot -->
    <div v-else-if="loot" class="w-full max-w-md">
      <!-- Chest animation -->
      <div ref="chestContainer" class="mb-8">
        <img
          ref="chestImage"
          src="/assets/map/chest.png"
          alt="Coffre"
          class="w-64 h-64 mx-auto"
        />
      </div>

      <!-- Loot display -->
      <div v-if="showLoot" class="space-y-4">
        <h2 class="text-3xl font-power text-white text-center mb-6">
          Récompenses obtenues !
        </h2>

        <!-- Items -->
        <div
          v-for="item in loot.items"
          :key="item.documentId"
          ref="itemElements"
          class="bg-white/10 backdrop-blur-sm rounded-xl p-4 opacity-0"
        >
          <div class="flex items-center gap-4">
            <img
              :src="getItemIcon(item)"
              :alt="item.name"
              class="w-16 h-16 object-contain"
            />
            <div class="flex-1">
              <p class="text-white font-power text-lg">{{ item.name }}</p>
              <p class="text-gray-300 font-onest text-sm">
                {{ getRarityName(item) }} • Niveau {{ item.level }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-yellow-400 font-power text-xl">
                +{{ item.index_damage }}
              </p>
            </div>
          </div>
        </div>

        <!-- Gold -->
        <div
          ref="goldElement"
          class="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between opacity-0"
        >
          <div class="flex items-center gap-3">
            <img src="/assets/coin.png" alt="Gold" class="w-12 h-12" />
            <span class="text-white font-power text-xl">Gold</span>
          </div>
          <span class="text-yellow-400 font-power text-2xl">+{{ loot.gold }}</span>
        </div>

        <!-- XP -->
        <div
          ref="expElement"
          class="bg-blue-500/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between opacity-0"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <span class="text-white font-bold text-xl">XP</span>
            </div>
            <span class="text-white font-power text-xl">Expérience</span>
          </div>
          <span class="text-blue-400 font-power text-2xl">+{{ loot.exp }}</span>
        </div>

        <!-- Return button -->
        <div class="pt-6">
          <FormPixelButton
            color="indigo"
            variant="filled"
            class="w-full"
            @click="goBack"
          >
            Retour à la carte
          </FormPixelButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import anime from 'animejs'
import { useVisitStore } from '~/stores/visit'
import { useGuildStore } from '~/stores/guild'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const visitStore = useVisitStore()
const guildStore = useGuildStore()
const config = useRuntimeConfig()

const loading = ref(true)
const error = ref<string | null>(null)
const loot = ref<any>(null)
const showLoot = ref(false)

const chestContainer = ref<HTMLElement>()
const chestImage = ref<HTMLImageElement>()
const itemElements = ref<HTMLElement[]>([])
const goldElement = ref<HTMLElement>()
const expElement = ref<HTMLElement>()

const poiId = computed(() => route.query.poiId as string)
const userLat = computed(() => parseFloat(route.query.lat as string))
const userLng = computed(() => parseFloat(route.query.lng as string))

function getItemIcon(item: any): string {
  const icon = item.icon?.data || item.icon
  if (!icon?.url) return '/assets/helmet1.png'
  if (icon.url.startsWith('http')) return icon.url
  return `${config.public.strapi.url}${icon.url}`
}

function getRarityName(item: any): string {
  const rarity = item.rarity?.data || item.rarity
  return rarity?.name || rarity?.attributes?.name || 'Commun'
}

function goBack() {
  router.push('/map')
}

async function openChestAnimation() {
  try {
    // 1. Bounce animation
    await anime({
      targets: chestImage.value,
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, -10, 0],
      duration: 800,
      easing: 'easeInOutQuad'
    }).finished

    // 2. Call API
    loot.value = await visitStore.openChest(
      poiId.value,
      userLat.value,
      userLng.value
    )

    // 3. Refresh guild
    await guildStore.refetchStats()

    // 4. Change image
    if (chestImage.value) {
      chestImage.value.src = '/assets/map/chest-opened.png'
    }

    // 5. Fade out chest
    await anime({
      targets: chestContainer.value,
      opacity: [1, 0],
      duration: 500,
      easing: 'easeInQuad'
    }).finished

    // 6. Show loot
    showLoot.value = true
    await nextTick()

    // 7. Animate items
    const timeline = anime.timeline({ easing: 'easeOutExpo' })

    itemElements.value.forEach((el, index) => {
      timeline.add({
        targets: el,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: index * 200
      })
    })

    timeline.add({
      targets: goldElement.value,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600
    }, '-=400')

    timeline.add({
      targets: expElement.value,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600
    }, '-=400')

  } catch (e: any) {
    console.error('Failed to open chest:', e)
    error.value = e?.message || 'Impossible d\'ouvrir le coffre'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!poiId.value || isNaN(userLat.value) || isNaN(userLng.value)) {
    error.value = 'Paramètres invalides'
    loading.value = false
    return
  }

  openChestAnimation()
})
</script>
