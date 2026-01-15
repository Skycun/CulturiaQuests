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

    <!-- Stats & Synergies -->
    <div class="bg-white p-4 rounded-2xl space-y-3">
      <!-- DPS Total -->
      <div class="text-center">
        <p class="font-pixel text-3xl text-indigo-600">{{ totalDPS }} DPS</p>
        <p class="font-onest text-xs text-gray-500">Dégâts par seconde de l'équipe</p>
      </div>

      <!-- Synergies actives -->
      <div v-if="activeSynergies.length > 0" class="border-t pt-3">
        <p class="font-pixel text-sm text-gray-700 mb-2">Synergies actives</p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="synergy in activeSynergies"
            :key="synergy.tag"
            class="flex items-center gap-1 bg-gradient-to-r from-indigo-50 to-purple-50 px-2 py-1 rounded-lg border border-indigo-200"
          >
            <span class="text-sm">{{ synergy.icon }}</span>
            <span class="font-onest text-xs font-medium text-indigo-700">{{ synergy.tag }}</span>
            <span class="font-pixel text-xs text-green-600">+{{ synergy.bonus }}%</span>
          </div>
        </div>
      </div>

      <!-- Bonus musée -->
      <div v-if="museumBonus > 0" class="border-t pt-3">
        <div class="flex justify-between items-center">
          <span class="font-onest text-sm text-gray-600">Bonus thématique</span>
          <span class="font-pixel text-sm text-green-600">+{{ museumBonus }}% DPS</span>
        </div>
        <p class="font-onest text-xs text-gray-400 mt-1">
          Vos personnages sont alignés avec le thème du musée
        </p>
      </div>
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

// Get debug mode from guild store
const guildStore = useGuildStore()
const debugMode = computed(() => guildStore.debugMode)

const { isTooFar, formattedDistance, getCharacterIcon } = useDrawerLogic(toRef(props, 'distanceToUser'), debugMode)

// === PLACEHOLDERS - À connecter avec les vraies données plus tard ===

/** Map des icônes par catégorie de tag */
const tagIcons: Record<string, string> = {
  'Histoire': '📜',
  'Art': '🎨',
  'Sciences': '🔬',
  'Nature': '🌿',
  'Société': '👥',
  'Savoir Faire': '🛠️',
}

/**
 * Calcule le DPS total de l'équipe (placeholder)
 * TODO: Calculer à partir des stats réelles des personnages
 */
const totalDPS = computed(() => {
  const baseDPS = props.guildCharacters.length * 500
  const synergyBonus = activeSynergies.value.reduce((acc, s) => acc + s.bonus, 0)
  return Math.round(baseDPS * (1 + (synergyBonus + museumBonus.value) / 100))
})

/**
 * Détecte les synergies actives basées sur les tags des personnages (placeholder)
 * TODO: Récupérer les vrais tags des personnages depuis leurs données
 */
const activeSynergies = computed(() => {
  // Placeholder: simule des synergies basées sur le nombre de personnages
  const synergies: Array<{ tag: string; icon: string; bonus: number }> = []

  // Exemple: si on a au moins 2 personnages, on active une synergie fictive
  if (props.guildCharacters.length >= 2) {
    synergies.push({ tag: 'Duo', icon: '🤝', bonus: 10 })
  }
  if (props.guildCharacters.length >= 3) {
    synergies.push({ tag: 'Trio', icon: '⚔️', bonus: 15 })
  }

  return synergies
})

/**
 * Calcule le bonus si les personnages matchent le thème du musée (placeholder)
 * TODO: Comparer les tags des personnages avec les tags du musée
 */
const museumBonus = computed(() => {
  // Placeholder: bonus fictif si le musée a des tags
  if (props.museum.tags && props.museum.tags.length > 0) {
    return 5 * props.museum.tags.length
  }
  return 0
})
</script>
