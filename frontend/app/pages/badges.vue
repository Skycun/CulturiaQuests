<template>
<div class="min-h-screen bg-black text-white font-sans flex flex-col">

    <div class="sticky top-0 mt-[env(safe-area-inset-top)] z-20 bg-black/80 backdrop-blur-md p-4 border-b border-gray-800">
      <div class="flex items-center gap-4 mb-4">
        <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="font-power text-2xl text-white">Collection de Badges</h1>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
            v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border shrink-0"
            :class="activeTab === tab.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'"
        >
            {{ tab.label }} <span v-if="getCategoryCount(tab.id)" class="ml-1 opacity-60">({{ getCategoryCount(tab.id) }})</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="zonesLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-gray-400 text-sm">Chargement des zones...</p>
      </div>
    </div>

    <template v-else>
      <!-- Grille de badges -->
      <div class="p-4 pb-28 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <div
            v-for="badge in filteredBadges"
            :key="badge.id"
            @click="handleBadgeClick(badge)"
            class="relative rounded-xl p-1 transition-all duration-200"
            :class="getBadgeClasses(badge)"
        >
          <div class="w-full aspect-square rounded-lg overflow-hidden bg-gray-900 relative">
            <img
                :src="badge.image"
                class="w-full h-full object-contain p-2 transition-all"
                :class="badge.tier === 'none' ? 'badge-shadow' : ''"
            />

            <div v-if="badgeStore.isEquipped(badge.id)" class="absolute top-1 right-1 bg-green-500 text-black rounded-full p-0.5 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all bg-white"
              :style="{ width: `${Math.min(badge.completion, 100)}%` }"
            ></div>
          </div>

          <p class="text-[10px] text-center mt-0.5 truncate font-bold text-white">
              {{ badge.name }}
          </p>
          <p class="text-[9px] text-center truncate text-white/60">
              {{ Math.round(badge.completion) }}%
          </p>
        </div>
      </div>

      <!-- Vide -->
      <div v-if="filteredBadges.length === 0" class="flex-1 flex items-center justify-center p-8">
        <div class="text-center">
          <p class="text-gray-500 text-sm">
            <template v-if="activeTab === 'region'">Explorez la carte pour débloquer des badges de régions !</template>
            <template v-else>Aucun badge dans cette catégorie pour le moment.</template>
          </p>
        </div>
      </div>
    </template>

    <transition name="fade">
        <div v-if="showMaxAlert" class="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 font-bold text-sm">
            Maximum 4 badges équipés !
        </div>
    </transition>

</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBadgeStore } from '~/stores/badge'
import { useZoneStore } from '~/stores/zone'
import type { ZoneBadge } from '~/stores/badge'

const router = useRouter()
const badgeStore = useBadgeStore()
const zoneStore = useZoneStore()

const activeTab = ref('comcom')
const showMaxAlert = ref(false)
const zonesLoading = ref(false)

const tabs = [
    { id: 'comcom', label: 'Com-Com' },
    { id: 'departement', label: 'Département' },
    { id: 'region', label: 'Région' },
    { id: 'special', label: 'Spécial' },
]

definePageMeta({
  layout: 'blank',
})

onMounted(async () => {
  if (!zoneStore.isInitialized) {
    zonesLoading.value = true
    await zoneStore.init()
    zonesLoading.value = false
  }
})

const filteredBadges = computed(() => {
    return badgeStore.badgesByCategory(activeTab.value)
})

function getCategoryCount(tabId: string): number {
  return badgeStore.badgesByCategory(tabId).length
}


const getBadgeClasses = (badge: ZoneBadge) => {
    if (badge.tier === 'none') return 'cursor-not-allowed'

    if (badgeStore.isEquipped(badge.id)) {
        return 'ring-2 ring-green-500 bg-green-500/10 scale-105 cursor-pointer'
    }

    return 'hover:bg-gray-800 cursor-pointer'
}

const handleBadgeClick = (badge: ZoneBadge) => {
    if (badge.tier === 'none') return

    if (!badgeStore.isEquipped(badge.id) && badgeStore.equippedCount >= 4) {
        triggerAlert()
        return
    }

    badgeStore.toggleEquip(badge.id)
}

const triggerAlert = () => {
    showMaxAlert.value = true
    setTimeout(() => showMaxAlert.value = false, 2000)
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.font-power { font-family: 'Montserrat', sans-serif; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.badge-shadow {
  filter: brightness(0) opacity(0.5);
}

</style>
