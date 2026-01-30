<template>
  <div class="h-screen bg-gradient-to-b from-[#040050] to-black flex flex-col text-white">
    <!-- Header avec infos NPC -->
    <div class="pt-12 px-6 text-center">
      <div class="w-24 h-24 mx-auto mb-4 bg-indigo-900/50 rounded-full flex items-center justify-center border-2 border-indigo-400">
        <!-- Placeholder avatar NPC -->
        <span class="text-5xl">🧙</span>
      </div>
      <h1 class="font-pixel text-2xl text-indigo-300">{{ npcName }}</h1>
      <p class="font-onest text-sm text-gray-400 mt-1">Un aventurier mystérieux</p>
    </div>

    <!-- Zone de dialogue -->
    <div class="flex-1 px-6 py-8 overflow-y-auto">
      <div class="max-w-md mx-auto space-y-4">
        <div
          v-for="(line, index) in dialogLines"
          :key="index"
          class="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 dialog-bubble"
          :style="{ animationDelay: `${index * 0.3}s` }"
        >
          <p class="font-onest text-sm leading-relaxed">{{ line }}</p>
        </div>

        <!-- Info quête si présente -->
        <div v-if="hasQuest" class="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4 mt-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">⚔️</span>
            <span class="font-pixel text-yellow-300">Quête disponible</span>
          </div>
          <p class="font-onest text-xs text-yellow-200/80">
            Atteignez le palier {{ targetThreshold }} pour débloquer une récompense spéciale !
          </p>
        </div>
      </div>
    </div>

    <!-- Bouton action -->
    <div class="p-6 bg-gradient-to-t from-black to-transparent">
      <FormPixelButton
        color="indigo"
        variant="filled"
        class="w-full"
        @click="continueToExpedition"
      >
        Commencer l'expédition
      </FormPixelButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRunStore } from '~/stores/run'

definePageMeta({ layout: 'blank' })

const router = useRouter()
const runStore = useRunStore()

// Récupérer les données depuis le store (déjà rempli par map.vue)
const activeRun = computed(() => runStore.activeRun)
const dialogLines = computed(() => {
  // Utiliser les dialogues stockés, ou des placeholders
  if (runStore.lastNpcDialog.length > 0) {
    return runStore.lastNpcDialog
  }
  return [
    "Bienvenue, aventurier...",
    "Je sens en vous une grande détermination.",
    "Prouvez votre valeur dans cette expédition !"
  ]
})

const npcName = computed(() => {
  const npc = activeRun.value?.npc
  if (npc) {
    const data = npc.data?.attributes || npc.attributes || npc
    return data.nickname || `${data.firstname} ${data.lastname}` || 'Inconnu'
  }
  return 'Aventurier Mystérieux'
})

const hasQuest = computed(() => !!activeRun.value?.target_threshold)
const targetThreshold = computed(() => activeRun.value?.target_threshold || 10)

// Vérifier qu'on a bien un run actif, sinon rediriger
onMounted(async () => {
  if (!activeRun.value) {
    // Essayer de récupérer le run actif
    const run = await runStore.fetchActiveRun()
    if (!run) {
      router.push('/map')
    }
  }
})

function continueToExpedition() {
  router.push('/expedition')
}
</script>

<style scoped>
.dialog-bubble {
  opacity: 0;
  animation: fadeInUp 0.5s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
