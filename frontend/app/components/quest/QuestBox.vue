<template>
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
        <QuestButton class="scale-90 origin-bottom-right" :quest="quest" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Quest } from '~/types/quest'
import QuestButton from './QuestButton.vue'

// Définition des props
const props = defineProps<{
  quest: Quest
}>()

// Helpers pour l'affichage (encapsulés dans le composant)
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
</script>
