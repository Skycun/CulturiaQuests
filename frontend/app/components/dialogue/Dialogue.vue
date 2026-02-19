<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div
        v-if="visible"
        class="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/70 backdrop-blur-sm"
        @click="advance"
      >
        <!-- Zone de dialogue en bas de l'écran -->
        <div class="p-6 pb-10" @click.stop="advance">
          <div class="max-w-lg mx-auto">
            <DialogueLigneDialogue
              :key="currentIndex"
              :text="currentLine"
              :npc-image="npcImage"
            />

            <!-- Indicateur "tap to continue" -->
            <p v-if="currentIndex < resolvedLines.length - 1" class="text-center text-white/40 text-xs mt-4 font-onest animate-pulse">
              Appuyez pour continuer...
            </p>
            <p v-else class="text-center text-white/40 text-xs mt-4 font-onest animate-pulse">
              Appuyez pour fermer
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
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

const currentLine = computed(() => resolvedLines.value[currentIndex.value] || '')

// Reset l'index quand le dialogue s'ouvre
watch(() => props.visible, (val) => {
  if (val) currentIndex.value = 0
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
