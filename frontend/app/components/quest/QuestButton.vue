<template>
  <button
    :class="[
      buttonColor,
      'text-white text-sm font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm active:transform active:scale-95'
    ]"
  >
  {{ buttonLabel }}
  </button>
</template>

<script setup lang="ts">
import type { Quest } from '~/types/quest'

const props = defineProps<{
  quest?: Quest
}>()

const isCompleted = computed(() => {
  if (!props.quest) return false
  const q = props.quest
  // Gestion de la structure (nested vs flattened)
  const attrs = q.attributes || q

  const hasDateEnd = !!attrs.date_end
  const poiA = attrs.is_poi_a_completed
  const poiB = attrs.is_poi_b_completed

  return hasDateEnd && poiA && poiB
})

const buttonLabel = computed(() => isCompleted.value ? 'Complété' : 'En cours')

const buttonColor = computed(() => {
  return isCompleted.value 
    ? 'bg-[#59B846] hover:bg-[#469e36]' 
    : 'bg-indigo-600 hover:bg-indigo-700'
})
</script>
