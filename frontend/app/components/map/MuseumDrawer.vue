<template>
  <div class="flex flex-col gap-4">
    <!-- Card Musée -->
    <div class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        :src="`/assets/map/museum/${museum.tags[0] || 'Art'}.png`"
        :alt="museum.name"
        class="w-full h-36 object-contain"
      />
      <div class="flex flex-col justify-between">
        <div>
          <h2 class="text-xl font-power mb-1 text-right">{{ museum.name }}</h2>
          <p class="text-sm font-onest text-gray-600 text-right mb-2">
            📍 Distance : {{ formattedDistance }}
          </p>
        </div>
        <div class="flex flex-row-reverse gap-2 flex-wrap">
          <TagCategory
            v-for="tag in museum.tags"
            :key="tag"
            variant="outline"
            :category="tag"
          />
        </div>
      </div>
    </div>

    <!-- Personnages guilde -->
    <div class="flex flex-row justify-evenly">
      <div v-for="char in guildCharacters" :key="char.id" class="bg-white rounded-2xl h-20 w-20">
        <img
          :src="getCharacterIcon(char)"
          class="object-contain"
          alt="Character icon h-20 w-20"
        />
      </div>
    </div>

    <!-- DPS Info -->
    <div class="bg-white p-4 rounded-2xl">
      <p class="text-center font-pixel text-3xl">DPS: 1578</p>
      <p class="font-onest text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>

    <!-- Boutons CTA -->
    <div v-if="isTooFar" class="w-full">
      <FormPixelButton
        color="red"
        variant="outline"
        class="w-full mt-4"
        disabled
      >
        Vous êtes trop loin
      </FormPixelButton>
    </div>
    <div v-else>
      <FormPixelButton
        color="indigo"
        variant="filled"
        class="w-full mt-4"
        @click="$emit('start-expedition')"
      >
        Démarrer l'expédition
      </FormPixelButton>
    </div>
    <div class="h-9 w-full"></div>
  </div>
</template>

<script setup lang="ts">
import type { Museum } from '~/types/museum'
import type { Character } from '~/types/character'

/**
 * Composant d'affichage du drawer pour un musée sélectionné.
 * Affiche les informations du musée, les personnages de la guilde et le bouton d'expédition.
 */
const props = defineProps<{
  /** Le musée sélectionné */
  museum: Museum
  /** Liste des personnages de la guilde */
  guildCharacters: Character[]
  /** Distance en km entre l'utilisateur et le musée */
  distanceToUser: number
}>()

defineEmits<{
  /** Émis quand l'utilisateur clique sur "Démarrer l'expédition" */
  'start-expedition': []
}>()

const { isTooFar, formattedDistance, getCharacterIcon } = useDrawerLogic(toRef(props, 'distanceToUser'))
</script>
