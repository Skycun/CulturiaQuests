<template>
  <div v-if="selectedItem" class="flex flex-col gap-4">

    <!-- Card Musée -->
    <div v-if="isMuseum" class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        :src="`/assets/map/museum/${selectedItem.tags[0] || 'Art'}.png`"
        :alt="selectedItem.name"
        class="w-full h-36 object-contain"
      />
      <div class="flex flex-col justify-between">
        <h2 class="text-xl font-power mb-2 text-right gap-4">{{ selectedItem.name }}</h2>
        <div class="flex flex-row-reverse gap-2 flex-wrap">
          <TagCategory
            v-for="tag in selectedItem.tags"
            :key="tag"
            variant="outline"
            :category="tag"
          />
        </div>
      </div>
    </div>

    <!-- Card POI -->
    <div v-else class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        src="/assets/map/chest-opened.png"
        :alt="selectedItem.name"
        class="w-full h-36 object-contain"
      />
      <div class="flex flex-col justify-between">
        <h2 class="text-xl font-power mb-2 text-right gap-4">{{ selectedItem.name }}</h2>
        <p class="font-onest text-right text-xs">Réinitialisation dans 15:45:56</p>
      </div>
    </div>

    <!-- Personnages guilde (museums uniquement) -->
    <div v-if="isMuseum" class="flex flex-row justify-evenly">
      <div v-for="char in guildCharacters" :key="char.id" class="bg-white rounded-2xl h-20 w-20">
        <img
          :src="getCharacterIcon(char)"
          class="object-contain"
          alt="Character icon h-20 w-20"
        />
      </div>
    </div>

    <!-- DPS Info (museums uniquement) -->
    <div v-if="isMuseum" class="bg-white p-4 rounded-2xl">
      <p class="text-center font-pixel text-3xl">DPS: 1578</p>
      <p class="font-onest text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>

    <!-- Message collected (POIs uniquement) -->
    <div v-else class="bg-white p-4 rounded-2xl">
      <p class="text-center font-pixel text-2xl">Objet collecté</p>
    </div>

    <!-- Boutons CTA -->
    <FormPixelButton
      v-if="isMuseum"
      color="indigo"
      variant="filled"
      class="w-full mt-4"
      @click="$emit('start-expedition')"
    >
      Démarrer l'expédition
    </FormPixelButton>
    <FormPixelButton v-else color="red" variant="outline" class="w-full mt-4" disabled>
      Ce coffre à déjà été ouvert
    </FormPixelButton>
    <div class="h-9 w-full"></div>
  </div>
</template>

<script setup lang="ts">
import type { Museum } from '~/types/museum'
import type { Poi } from '~/types/poi'
import type { Character } from '~/types/character'

/**
 * Composant d'affichage du contenu du drawer pour un élément sélectionné.
 * Affiche différentes cards selon le type (Museum ou POI).
 */
const props = defineProps<{
  /** L'élément sélectionné (Museum ou POI, null si aucun) */
  selectedItem: Museum | Poi | null
  /** Liste des personnages de la guilde (pour museums) */
  guildCharacters: Character[]
}>()

defineEmits<{
  /** Émis quand l'utilisateur clique sur "Démarrer l'expédition" */
  'start-expedition': []
}>()

const config = useRuntimeConfig()

/**
 * Détermine si l'élément sélectionné est un musée.
 * Type guard basé sur la présence de la propriété 'radius'.
 */
const isMuseum = computed(() => {
  if (!props.selectedItem) return false
  return 'radius' in props.selectedItem
})

/**
 * Construit l'URL de l'icône d'un personnage.
 * Gère les URLs relatives et absolues Strapi.
 *
 * @param char - Personnage dont on veut l'icône
 * @returns URL complète de l'icône
 */
function getCharacterIcon(char: Character): string {
  const icon = char.icon?.data || char.icon
  if (!icon?.url) return '/assets/helmet1.png' // Fallback
  if (icon.url.startsWith('http')) return icon.url
  return `${config.public.strapi.url}${icon.url}`
}
</script>
