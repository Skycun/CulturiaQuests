<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex flex-col bg-black/70 backdrop-blur-sm overflow-hidden"
        @click="advance"
      >
        <!-- Container scrollable centré sur la dernière ligne -->
        <div ref="scrollContainer" class="flex-1 overflow-y-auto flex flex-col">
          <!-- Spacer haut pour centrer la première ligne -->
          <div class="flex-1 min-h-[40vh]" />

          <!-- Toutes les lignes visibles -->
          <div class="px-3 space-y-4 w-full">
            <DialogueLigneDialogue
              v-for="(line, index) in visibleLines"
              :key="index"
              :text="line"
              :npc-image="npcImage"
              :class="index < currentIndex ? 'opacity-40' : ''"
              class="transition-opacity duration-300"
            />
          </div>

          <!-- Spacer bas pour centrer la dernière ligne -->
          <div class="flex-1 min-h-[40vh]" />
        </div>

        <!-- Indicateur fixe en bas -->
        <div class="p-4 text-center">
          <p v-if="currentIndex < resolvedLines.length - 1" class="text-white/40 text-xs font-onest animate-pulse">
            Appuyez pour continuer...
          </p>
          <p v-else class="text-white/40 text-xs font-onest animate-pulse">
            Appuyez pour fermer
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const EMOTION_MAP: Record<string, string> = {
  quest_description: 'Quest.png',
  expedition_fail: 'Echec.png',
  quest_complete: 'Succes.png'
}

const props = withDefaults(defineProps<{
  lines: string[]
  npcFirstname: string
  textType: string
  targetThreshold?: number | null
  visible?: boolean
}>(), {
  targetThreshold: null,
  visible: true
})

const emit = defineEmits<{
  complete: []
}>()

const user = useStrapiUser()
const playerName = computed(() => (user.value as any)?.username || 'Aventurier')

const npcImage = computed(() => {
  const name = props.npcFirstname
  const file = EMOTION_MAP[props.textType] || `${name}.png`
  return `/assets/npc/${name}/${file}`
})

const resolvedLines = computed(() => {
  return props.lines.map(line => {
    let resolved = line.replace(/\[PlayerName\]/g, playerName.value)
    if (props.targetThreshold != null) {
      resolved = resolved.replace(/\[DungeonThreshold\]/g, String(props.targetThreshold))
    }
    return resolved
  })
})

const currentIndex = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)

const visibleLines = computed(() => resolvedLines.value.slice(0, currentIndex.value + 1))

// Reset l'index quand le dialogue s'ouvre
watch(() => props.visible, (val) => {
  if (val) currentIndex.value = 0
})

// Scroll vers la dernière ligne pour la garder centrée
watch(currentIndex, () => {
  nextTick(() => {
    if (!scrollContainer.value) return
    const lines = scrollContainer.value.querySelectorAll('.dialogue-bubble')
    const lastLine = lines[lines.length - 1]
    if (lastLine) {
      lastLine.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
})

function advance() {
  if (currentIndex.value < resolvedLines.value.length - 1) {
    currentIndex.value++
  } else {
    emit('complete')
  }
}
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
