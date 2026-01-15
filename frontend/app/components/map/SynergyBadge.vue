<template>
  <div
    :class="[
      'flex items-center gap-1 px-3 py-1.5 rounded-full border-2 transition-colors',
      computedClasses
    ]"
  >
    <span class="font-onest text-xs font-semibold">{{ displayLabel }}</span>
    <span class="font-pixel text-xs font-bold">×{{ count }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Nom du tag (Histoire, Art, Sciences, etc.) */
  tag: string
  /** Icône du tag */
  icon: string
  /** Nombre d'items correspondants */
  count: number
}>()

/**
 * Mapping des tags français vers les catégories (identique à TagCategory)
 */
const tagToCategory: Record<string, string> = {
  'histoire': 'history',
  'art': 'art',
  'sciences': 'science',
  'science': 'science',
  'nature': 'nature',
  'société': 'society',
  'savoir faire': 'make',
  'savoir-faire': 'make'
}

/**
 * Labels français par catégorie (identique à TagCategory)
 */
const categoryLabels: Record<string, string> = {
  'history': 'Histoire',
  'art': 'Art',
  'society': 'Société',
  'nature': 'Nature',
  'science': 'Science',
  'make': 'Savoir-Faire'
}

/**
 * Styles par catégorie - même palette que TagCategory en variant filled
 */
const categoryStyles: Record<string, string> = {
  'history': 'bg-orange-500 border-orange-500 text-white',
  'art': 'bg-sky-500 border-sky-500 text-white',
  'society': 'bg-red-600 border-red-600 text-white',
  'nature': 'bg-green-600 border-green-600 text-white',
  'science': 'bg-purple-600 border-purple-600 text-white',
  'make': 'bg-amber-700 border-amber-700 text-white'
}

/**
 * Style par défaut si la catégorie n'est pas reconnue
 */
const defaultStyle = 'bg-gray-500 border-gray-500 text-white'

/**
 * Calcule le label traduit en français
 */
const displayLabel = computed(() => {
  const tagKey = props.tag.toLowerCase().trim()
  const category = tagToCategory[tagKey]

  if (category && categoryLabels[category]) {
    return categoryLabels[category]
  }

  // Fallback: retourne le tag original
  return props.tag
})

/**
 * Calcule les classes CSS en fonction du tag
 */
const computedClasses = computed(() => {
  const tagKey = props.tag.toLowerCase().trim()
  const category = tagToCategory[tagKey]

  if (category && categoryStyles[category]) {
    return categoryStyles[category]
  }

  return defaultStyle
})
</script>
