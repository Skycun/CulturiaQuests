<template>
  <div>
    <div class="bg-white rounded-xl shadow-md border border-gray-100 flex overflow-hidden hover:shadow-lg transition-shadow duration-300 min-h-[100px]">
      <!-- Partie Gauche : Image (Buste) -->
      <div class="w-24 md:w-32 shrink-0 bg-gray-200 relative">
        <img
          :src="getNpcImage(getQuestNpc(quest))"
          :alt="getNpcName(getQuestNpc(quest))"
          class="w-full h-full object-cover object-top"
        />
      </div>

      <!-- Partie Droite : Contenu -->
      <div class="flex-1 p-3 flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start">
            <h2 class="font-pixel text-3xl">
              {{ getNpcName(getQuestNpc(quest)) }}
            </h2>
          </div>

          <p class="text-xs text-gray-600 leading-snug line-clamp-3 mt-1 font-onest">
            {{ getNpcName(getQuestNpc(quest)) }} sollicite votre aide pour une mission importante.
          </p>
        </div>

        <div class="flex justify-end">
          <QuestButton class="scale-90 origin-bottom-right" :quest="quest" @toggle="showDialogue = true" />
        </div>
      </div>
    </div>

    <!-- Dialogue overlay RPG -->
    <Dialogue
      v-if="dialogLines.length > 0"
      :lines="dialogLines"
      :npc-firstname="npcFirstname"
      :text-type="dialogTextType"
      :visible="showDialogue"
      @complete="showDialogue = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { Quest } from '~/types/quest'
import QuestButton from './QuestButton.vue'

const props = defineProps<{
  quest: Quest
}>()

const showDialogue = ref(false)

// Helpers pour l'affichage
const getNpcImage = (npcRaw: any) => {
  const npcData = npcRaw?.data?.attributes || npcRaw?.attributes || npcRaw?.data || npcRaw
  if (!npcData?.firstname) return '/assets/npc/placeholder.png'
  const name = npcData.firstname
  return `/assets/npc/${name}/${name}.png`
}

const getNpcName = (npcRaw: any) => {
  const npcData = npcRaw?.data?.attributes || npcRaw?.attributes || npcRaw?.data || npcRaw
  return npcData?.firstname || 'Inconnu'
}

const getQuestNpc = (quest: any) => {
  return quest.attributes?.npc || quest.npc
}

const getNpcData = (npcRaw: any) => {
  return npcRaw?.data?.attributes || npcRaw?.attributes || npcRaw?.data || npcRaw
}

const isCompleted = computed(() => {
  const attrs = props.quest.attributes || props.quest
  return !!attrs.date_end && attrs.is_poi_a_completed && attrs.is_poi_b_completed
})

const dialogTextType = computed(() => isCompleted.value ? 'quest_complete' : 'quest_description')

const npcFirstname = computed(() => {
  const npc = getQuestNpc(props.quest)
  const data = getNpcData(npc)
  return data?.firstname || 'Inconnu'
})

const dialogLines = computed(() => {
  const npc = getQuestNpc(props.quest)
  const data = getNpcData(npc)
  const dialogs = data?.dialogs?.data || data?.dialogs || []

  const targetType = dialogTextType.value
  const dialogObj = dialogs.find((d: any) => {
    const dData = d.attributes || d
    return dData.text_type === targetType
  })

  if (!dialogObj) return []
  const dData = dialogObj.attributes || dialogObj
  return Array.isArray(dData.dialogues) ? dData.dialogues : []
})
</script>
