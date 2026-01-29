<template>
  <div class="flex flex-col gap-4">
    <!-- Card Musée -->
    <div class="bg-white p-4 rounded-2xl grid grid-cols-2 gap-2">
      <img
        :src="`/assets/map/museum/${firstTag}.png`"
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
            v-for="tag in museumTagsDisplay"
            :key="tag"
            variant="outline"
            :category="tag"
          />
        </div>
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
          <MapSynergyBadge
            v-for="synergy in activeSynergies"
            :key="synergy.tag"
            :tag="synergy.tag"
            :icon="synergy.icon"
            :count="synergy.bonus"
          />
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
import { useGuildStore } from '~/stores/guild'
import { useInventoryStore } from '~/stores/inventory'
import { useDamageCalculator } from '~/composables/useDamageCalculator'

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

// Get inventory store for items
const inventoryStore = useInventoryStore()

// Get damage calculator
const { calculateItemPower } = useDamageCalculator()

const { isTooFar, formattedDistance, getCharacterIcon } = useDrawerLogic(toRef(props, 'distanceToUser'), debugMode)

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
 * Helper pour extraire les tags d'un item en gérant les différentes structures Strapi
 */
const getItemTags = (item: any): string[] => {
  const tags = item.tags || item.attributes?.tags
  if (!tags) return []

  const tagData = tags.data || tags
  if (!Array.isArray(tagData)) return []

  return tagData.map((tag: any) => {
    const name = tag.name || tag.attributes?.name
    return name?.toLowerCase() || ''
  }).filter((name: string) => name !== '')
}

/**
 * Helper pour extraire les tags du musée (pour l'affichage)
 */
const museumTagsDisplay = computed(() => {
  const tags = props.museum.tags || props.museum.attributes?.tags
  if (!tags) return []

  const tagData = tags.data || tags
  if (!Array.isArray(tagData)) return []

  return tagData.map((tag: any) => {
    return tag.name || tag.attributes?.name || tag
  }).filter((name: string) => name)
})

/**
 * Premier tag du musée pour l'image
 */
const firstTag = computed(() => {
  return museumTagsDisplay.value[0] || 'Art'
})

/**
 * Helper pour extraire les tags du musée en lowercase (pour la comparaison)
 */
const museumTags = computed(() => {
  return museumTagsDisplay.value.map((tag: string) => tag.toLowerCase())
})

/**
 * Récupère tous les items équipés par les personnages de la guilde
 */
const guildItems = computed(() => {
  const allItems = inventoryStore.items
  const characterIds = props.guildCharacters.map(c => c.id)

  return allItems.filter(item => {
    const charId = item.character?.id || item.attributes?.character?.data?.id
    return charId && characterIds.includes(charId)
  })
})

/**
 * Calcule le DPS brut total de tous les items de la guilde
 */
const rawTotalDPS = computed(() => {
  return guildItems.value.reduce((total, item) => {
    return total + calculateItemPower(item)
  }, 0)
})

/**
 * Compte le nombre d'items dont les tags correspondent aux tags du musée
 */
const matchingItemsCount = computed(() => {
  if (museumTags.value.length === 0) return 0

  let count = 0
  for (const item of guildItems.value) {
    const itemTags = getItemTags(item)
    // Pour chaque item, vérifier si au moins un de ses tags correspond à un tag du musée
    const hasMatch = itemTags.some(itemTag => museumTags.value.includes(itemTag))
    if (hasMatch) count++
  }

  return count
})

/**
 * Tableau des bonus de synergie selon le nombre d'items correspondants
 */
const SYNERGY_BONUS = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.75, 2.0,
  2.25, 2.5, 2.75, 3.0, 3.5, 4.0,
  4.5, 5.0, 5.5, 6.0, 7.0, 8.0,
  9.0, 10.0, 11.0, 12.0, 13.5, 15.0
]

/**
 * Multiplicateur global basé sur le nombre d'items correspondants
 */
const globalMultiplier = computed(() => {
  const index = Math.min(matchingItemsCount.value, SYNERGY_BONUS.length - 1)
  return SYNERGY_BONUS[index]
})

/**
 * Calcule le DPS total avec le multiplicateur de synergie
 */
const totalDPS = computed(() => {
  return Math.floor(rawTotalDPS.value * globalMultiplier.value)
})

/**
 * Détecte les synergies actives basées sur les tags des items
 */
const activeSynergies = computed(() => {
  if (museumTags.value.length === 0) return []

  // Compter les items par tag du musée
  const tagCounts: Record<string, number> = {}

  for (const museumTag of museumTags.value) {
    tagCounts[museumTag] = 0
  }

  for (const item of guildItems.value) {
    const itemTags = getItemTags(item)
    for (const itemTag of itemTags) {
      if (tagCounts[itemTag] !== undefined) {
        tagCounts[itemTag]++
      }
    }
  }

  // Créer les synergies pour chaque tag avec au moins 1 item
  const synergies: Array<{ tag: string; icon: string; bonus: number }> = []

  for (const [tag, count] of Object.entries(tagCounts)) {
    if (count > 0) {
      // Trouver le tag original avec la bonne casse
      const originalTag = museumTagsDisplay.value.find((t: string) => t.toLowerCase() === tag) || tag
      const icon = tagIcons[originalTag] || '🏷️'

      synergies.push({
        tag: originalTag,
        icon,
        bonus: count // Affiche le nombre d'items pour ce tag
      })
    }
  }

  return synergies
})

/**
 * Calcule le bonus musée en pourcentage
 */
const museumBonus = computed(() => {
  if (globalMultiplier.value <= 1) return 0
  return Math.round((globalMultiplier.value - 1) * 100)
})
</script>
