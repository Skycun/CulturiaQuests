<script setup lang="ts">
/**
 * Page de simulation des drops d'items
 * Simule la logique de generation cote frontend pour tester l'equilibrage
 * NE CREE PAS d'items en base de donnees
 */

// --- CONSTANTES (meme que backend) ---

const DROP_RATES = {
  common: 60,
  rare: 30,
  epic: 9,
  legendary: 1
}

const DAMAGE_RANGES = {
  common: { min: 5, max: 15 },
  rare: { min: 10, max: 20 },
  epic: { min: 15, max: 25 },
  legendary: { min: 15, max: 25 }
}

const TAGS = ['history', 'art', 'science', 'nature', 'society', 'make']

const NAME_PREFIXES = {
  weapon: {
    history: ['Lame', 'Epee', 'Glaive', 'Dague'],
    art: ['Pinceau', 'Plume', 'Burin', 'Ciseau'],
    science: ['Proto-Lame', 'Tech-Epee', 'Quantum', 'Laser'],
    nature: ['Racine', 'Epine', 'Griffe', 'Croc'],
    society: ['Sceptre', 'Marteau', 'Faucille', 'Balance'],
    make: ['Forge', 'Outil', 'Enclume', 'Maillet']
  },
  helmet: {
    history: ['Heaume', 'Couronne', 'Diademe', 'Tiare'],
    art: ['Masque', 'Beret', 'Chapeau', 'Coiffe'],
    science: ['Casque-Tech', 'Neuro', 'Cyber', 'Proto'],
    nature: ['Corne', 'Bois', 'Feuillage', 'Ecorce'],
    society: ['Coiffe', 'Bonnet', 'Capuche', 'Voile'],
    make: ['Casquette', 'Bandeau', 'Serre-tete', 'Calotte']
  },
  charm: {
    history: ['Relique', 'Vestige', 'Fragment', 'Medaillon'],
    art: ['Bijou', 'Ornement', 'Parure', 'Pendentif'],
    science: ['Module', 'Capteur', 'Nano', 'Puce'],
    nature: ['Amulette', 'Talisman', 'Graine', 'Cristal'],
    society: ['Insigne', 'Embleme', 'Sceau', 'Blason'],
    make: ['Porte-bonheur', 'Breloque', 'Charme', 'Fetiche']
  }
} as const

const NAME_SUFFIXES = {
  history: ['du Passe', 'Ancestral', 'Antique', 'des Ages', 'Millenaire'],
  art: ['du Createur', 'Mystique', 'Sublime', 'Esthetique', 'Inspire'],
  science: ['Experimental', 'Avance', 'Prototype', 'Ameliore', 'Optimise'],
  nature: ['Sauvage', 'Primordial', 'Sylvestre', 'Naturel', 'Organique'],
  society: ['Social', 'Communal', 'Civique', 'Urbain', 'Populaire'],
  make: ['Artisanal', 'Manufacture', 'de Maitre', 'Expert', 'Ouvre']
} as const

// --- TYPES ---

interface SimulatedItem {
  id: string
  name: string
  level: number
  index_damage: number
  rarity: string
  slot: string
  tags: string[]
  image: string
}

// --- STATE ---

const testMaxFloor = ref(5)
const simulatedItems = ref<SimulatedItem[]>([])
const stats = ref({
  common: 0,
  rare: 0,
  epic: 0,
  legendary: 0
})
const totalSimulated = computed(() =>
  stats.value.common + stats.value.rare + stats.value.epic + stats.value.legendary
)

// --- FONCTIONS DE SIMULATION ---

function rollRarity(): string {
  const roll = Math.random() * 100
  if (roll < DROP_RATES.common) return 'common'
  if (roll < DROP_RATES.common + DROP_RATES.rare) return 'rare'
  if (roll < DROP_RATES.common + DROP_RATES.rare + DROP_RATES.epic) return 'epic'
  return 'legendary'
}

function calculateItemLevel(maxFloor: number): number {
  const variation = Math.floor(Math.random() * 11) - 5
  return Math.max(1, maxFloor + variation)
}

function calculateIndexDamage(rarityName: string): number {
  const range = DAMAGE_RANGES[rarityName as keyof typeof DAMAGE_RANGES] || DAMAGE_RANGES.common
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
}

function selectRandomSlot(): 'weapon' | 'helmet' | 'charm' {
  const slots: ('weapon' | 'helmet' | 'charm')[] = ['weapon', 'helmet', 'charm']
  return slots[Math.floor(Math.random() * slots.length)]
}

function selectRandomTags(rarityName: string): string[] {
  const tagCount = rarityName === 'legendary' ? 2 : 1
  const shuffled = [...TAGS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, tagCount)
}

function generateItemName(slot: string, tags: string[], rarityName: string): string {
  if (tags.length === 0) {
    const defaultNames = { weapon: 'Arme Mysterieuse', helmet: 'Casque Inconnu', charm: 'Amulette Etrange' }
    return defaultNames[slot as keyof typeof defaultNames] || 'Objet Mysterieux'
  }

  const primaryTag = tags[0] as keyof typeof NAME_SUFFIXES
  const prefixes = NAME_PREFIXES[slot as keyof typeof NAME_PREFIXES]?.[primaryTag]
  const suffixes = NAME_SUFFIXES[primaryTag]

  if (!prefixes || !suffixes) {
    return `${slot.charAt(0).toUpperCase() + slot.slice(1)} ${primaryTag}`
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  if (rarityName === 'legendary' && tags.length > 1) {
    const secondTag = tags[1] as keyof typeof NAME_SUFFIXES
    const secondSuffixes = NAME_SUFFIXES[secondTag]
    if (secondSuffixes) {
      const secondSuffix = secondSuffixes[Math.floor(Math.random() * secondSuffixes.length)]
      return `${prefix} ${suffix} et ${secondSuffix}`
    }
  }

  return `${prefix} ${suffix}`
}

function getPlaceholderImage(slot: string): string {
  const images = {
    weapon: '/placeholder-weapon.png',
    helmet: '/placeholder-helmet.png',
    charm: '/placeholder-charm.png'
  }
  return images[slot as keyof typeof images] || '/placeholder-item.png'
}

function simulateItem(): SimulatedItem {
  const rarity = rollRarity()
  const level = calculateItemLevel(testMaxFloor.value)
  const indexDamage = calculateIndexDamage(rarity)
  const slot = selectRandomSlot()
  const tags = selectRandomTags(rarity)
  const name = generateItemName(slot, tags, rarity)

  // Update stats
  stats.value[rarity as keyof typeof stats.value]++

  return {
    id: crypto.randomUUID(),
    name,
    level,
    index_damage: indexDamage,
    rarity,
    slot,
    tags,
    image: getPlaceholderImage(slot)
  }
}

function simulate(count: number) {
  for (let i = 0; i < count; i++) {
    const item = simulateItem()
    simulatedItems.value.unshift(item)
  }
  // Garder seulement les 100 derniers items pour l'affichage
  if (simulatedItems.value.length > 100) {
    simulatedItems.value = simulatedItems.value.slice(0, 100)
  }
}

function resetStats() {
  simulatedItems.value = []
  stats.value = { common: 0, rare: 0, epic: 0, legendary: 0 }
}

function getPercentage(rarity: string): string {
  if (totalSimulated.value === 0) return '0.0'
  return ((stats.value[rarity as keyof typeof stats.value] / totalSimulated.value) * 100).toFixed(1)
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'bg-green-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500'
  }
  return colors[rarity] || 'bg-gray-500'
}

// Layout de test
definePageMeta({
  layout: 'test'
})
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Drop Simulation Dashboard</h1>

    <!-- Info -->
    <div class="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg text-yellow-800">
      Cette page simule les drops localement. Aucun item n'est cree en base de donnees.
    </div>

    <!-- Max Floor Input -->
    <div class="mb-4 p-4 bg-gray-100 rounded-lg">
      <label class="block text-gray-600 mb-2">Test MaxFloor (palier du joueur)</label>
      <input
        v-model.number="testMaxFloor"
        type="number"
        min="1"
        max="100"
        class="w-32 px-3 py-2 border rounded text-black"
      />
      <span class="ml-2 text-gray-500">Items generes: Level {{ Math.max(1, testMaxFloor - 5) }} - {{ testMaxFloor + 5 }}</span>
    </div>

    <!-- Actions -->
    <div class="flex gap-4 mb-6 flex-wrap">
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="simulate(1)"
      >
        Simuler 1
      </button>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="simulate(10)"
      >
        Simuler 10
      </button>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="simulate(100)"
      >
        Simuler 100
      </button>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        @click="simulate(1000)"
      >
        Simuler 1000
      </button>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        @click="resetStats"
      >
        Reset
      </button>
    </div>

    <!-- Statistics -->
    <div class="mb-6 p-4 bg-gray-100 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">
        Statistiques ({{ totalSimulated }} simulations)
      </h2>

      <div class="space-y-3">
        <div v-for="rarity in ['common', 'rare', 'epic', 'legendary']" :key="rarity" class="flex items-center gap-4">
          <span class="w-24 capitalize font-medium">{{ rarity }}</span>
          <span class="w-16 text-right">{{ stats[rarity as keyof typeof stats] }}</span>
          <span class="w-16 text-right text-gray-500">({{ getPercentage(rarity) }}%)</span>
          <div class="flex-1 bg-gray-300 rounded-full h-4 overflow-hidden">
            <div
              :class="[getRarityColor(rarity), 'h-full transition-all duration-300']"
              :style="{ width: getPercentage(rarity) + '%' }"
            />
          </div>
        </div>
      </div>

      <!-- Expected rates -->
      <div class="mt-4 pt-4 border-t border-gray-300">
        <h3 class="font-medium mb-2">Taux attendus:</h3>
        <div class="flex gap-4 text-sm text-gray-600">
          <span>Common: 60%</span>
          <span>Rare: 30%</span>
          <span>Epic: 9%</span>
          <span>Legendary: 1%</span>
        </div>
      </div>

      <!-- Deviation -->
      <div v-if="totalSimulated >= 100" class="mt-4 pt-4 border-t border-gray-300">
        <h3 class="font-medium mb-2">Ecart vs attendu:</h3>
        <div class="flex gap-4 text-sm">
          <span :class="Math.abs(parseFloat(getPercentage('common')) - 60) > 5 ? 'text-red-500' : 'text-green-500'">
            Common: {{ (parseFloat(getPercentage('common')) - 60).toFixed(1) }}%
          </span>
          <span :class="Math.abs(parseFloat(getPercentage('rare')) - 30) > 5 ? 'text-red-500' : 'text-green-500'">
            Rare: {{ (parseFloat(getPercentage('rare')) - 30).toFixed(1) }}%
          </span>
          <span :class="Math.abs(parseFloat(getPercentage('epic')) - 9) > 3 ? 'text-red-500' : 'text-green-500'">
            Epic: {{ (parseFloat(getPercentage('epic')) - 9).toFixed(1) }}%
          </span>
          <span :class="Math.abs(parseFloat(getPercentage('legendary')) - 1) > 1 ? 'text-red-500' : 'text-green-500'">
            Legendary: {{ (parseFloat(getPercentage('legendary')) - 1).toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Items Grid -->
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-4">
        Items simules ({{ Math.min(simulatedItems.length, 100) }} derniers)
      </h2>

      <div v-if="simulatedItems.length === 0" class="text-gray-500 p-4 bg-gray-100 rounded-lg">
        Aucun item simule. Cliquez sur un bouton ci-dessus pour commencer.
      </div>

      <div v-else class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        <div
          v-for="item in simulatedItems.slice(0, 50)"
          :key="item.id"
          class="relative"
          :title="`${item.name}\nLevel: ${item.level}\nDamage: ${item.index_damage}\nSlot: ${item.slot}\nTags: ${item.tags.join(', ')}`"
        >
          <items
            :level="item.level"
            :index_damage="item.index_damage"
            :rarity="item.rarity"
            :image="item.image"
            :types="item.tags"
            :category="item.slot"
          />
        </div>
      </div>
    </div>

    <!-- Last Generated Details -->
    <div v-if="simulatedItems.length > 0" class="p-4 bg-gray-100 rounded-lg">
      <h3 class="font-semibold mb-2">Dernier item genere:</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="text-gray-500">Nom:</span> {{ simulatedItems[0].name }}</div>
        <div><span class="text-gray-500">Rarete:</span> <span :class="getRarityColor(simulatedItems[0].rarity)" class="px-2 py-0.5 rounded text-white text-xs">{{ simulatedItems[0].rarity }}</span></div>
        <div><span class="text-gray-500">Level:</span> {{ simulatedItems[0].level }}</div>
        <div><span class="text-gray-500">Index Damage:</span> {{ simulatedItems[0].index_damage }}</div>
        <div><span class="text-gray-500">Slot:</span> {{ simulatedItems[0].slot }}</div>
        <div><span class="text-gray-500">Tags:</span> {{ simulatedItems[0].tags.join(', ') }}</div>
      </div>
    </div>
  </div>
</template>
