<template>
  <div class="h-screen bg-gradient-to-b from-[#040050] to-black flex flex-col text-white">
    <!-- Dialogue overlay RPG -->
    <DialogueDialogue
      :lines="dialogLines"
      :npc-firstname="npcFirstname"
      text-type="expedition_appear"
      :target-threshold="targetThreshold"
      :visible="showDialogue"
      @complete="onDialogueComplete"
    />

    <!-- Contenu affiché après le dialogue -->
    <template v-if="!showDialogue">
      <!-- Header avec infos NPC -->
      <div class="pt-12 px-6 text-center">
        <div class="w-24 h-24 mx-auto mb-4 bg-indigo-900/50 rounded-full flex items-center justify-center border-2 border-indigo-400">
          <img
            :src="`/assets/npc/${npcFirstname}/${npcFirstname}.png`"
            :alt="npcName"
            class="w-full h-full object-cover rounded-full"
          >
        </div>
        <h1 class="font-pixel text-2xl text-indigo-300">{{ npcName }}</h1>
      </div>

      <!-- Info quête si présente -->
      <div class="flex-1 px-6 py-8 flex items-center justify-center">
        <div v-if="hasQuest" class="max-w-md w-full bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">⚔️</span>
            <span class="font-pixel text-yellow-300">Quête disponible</span>
          </div>
          <p class="font-onest text-xs text-yellow-200/80">
            Atteignez le palier {{ targetThreshold }} pour débloquer une récompense spéciale !
          </p>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRunStore } from '~/stores/run'

definePageMeta({ layout: 'blank' })

const router = useRouter()
const runStore = useRunStore()

const showDialogue = ref(true)

// Récupérer les données depuis le store (déjà rempli par map.vue)
const activeRun = computed(() => runStore.activeRun)
const dialogLines = computed(() => {
  if (runStore.lastNpcDialog.length > 0) {
    return runStore.lastNpcDialog
  }
  return [
    "Bienvenue, aventurier...",
    "Je sens en vous une grande détermination.",
    "Prouvez votre valeur dans cette expédition !"
  ]
})

const npcInfo = computed(() => runStore.lastNpcInfo)

const npcName = computed(() => {
  const info = npcInfo.value
  if (info) return info.nickname || `${info.firstname} ${info.lastname}` || 'Inconnu'
  return 'Aventurier Mystérieux'
})

const npcFirstname = computed(() => npcInfo.value?.firstname || 'Inconnu')

const hasQuest = computed(() => !!activeRun.value?.target_threshold)
const targetThreshold = computed(() => activeRun.value?.target_threshold || 10)

// Vérifier qu'on a bien un run actif, sinon rediriger
onMounted(async () => {
  if (!activeRun.value) {
    const run = await runStore.fetchActiveRun()
    if (!run) {
      router.push('/map')
    }
  }
})

function onDialogueComplete() {
  showDialogue.value = false
}

function continueToExpedition() {
  router.push('/expedition')
}
</script>
