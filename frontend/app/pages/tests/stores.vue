<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'
import { useCharacterStore } from '~/stores/character'
import { useInventoryStore } from '~/stores/inventory'
import { useQuestStore } from '~/stores/quest'
import { useVisitStore } from '~/stores/visit'
import { useRunStore } from '~/stores/run'
import { useFriendshipStore } from '~/stores/friendship'

const guildStore = useGuildStore()
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()
const questStore = useQuestStore()
const visitStore = useVisitStore()
const runStore = useRunStore()
const friendshipStore = useFriendshipStore()

const user = useStrapiUser()

// Expanded sections state
const expandedSections = ref({
  guild: true,
  characters: true,
  inventory: true,
  quests: true,
  visits: false,
  runs: false,
  friendships: false,
})

// JSON view toggles
const showJsonView = ref({
  guild: false,
  characters: false,
  inventory: false,
  quests: false,
  visits: false,
  runs: false,
  friendships: false,
})

async function handleFetchAll() {
  await guildStore.fetchAll()
}

function handleClearAll() {
  guildStore.clearAll()
}

function toggleSection(section: keyof typeof expandedSections.value) {
  expandedSections.value[section] = !expandedSections.value[section]
}

function toggleJsonView(section: keyof typeof showJsonView.value) {
  showJsonView.value[section] = !showJsonView.value[section]
}

function getJobBadgeColor(job: string) {
  const colors: Record<string, string> = {
    hero: 'bg-yellow-500',
    mage: 'bg-purple-500',
    archer: 'bg-green-500',
    soldier: 'bg-red-500',
  }
  return colors[job] || 'bg-gray-500'
}

function getRarityColor(rarity: string) {
  const colors: Record<string, string> = {
    Common: 'text-gray-400',
    Rare: 'text-blue-400',
    Epic: 'text-purple-400',
    Legendary: 'text-yellow-400',
  }
  return colors[rarity] || 'text-gray-400'
}

// Layout de test
definePageMeta({
  layout: 'test',
})

</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Stores Debug Dashboard</h1>

    <!-- User Info -->
    <div class="mb-4 p-3 bg-gray-800 rounded-lg">
      <span class="text-gray-400">User: </span>
      <span v-if="user" class="text-green-400">{{ user.username || user.email }} (ID: {{ user.id }})</span>
      <span v-else class="text-red-400">Not authenticated</span>
    </div>

    <!-- Global Actions -->
    <div class="flex gap-4 mb-6">
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="guildStore.loading"
        @click="handleFetchAll"
      >
        {{ guildStore.loading ? 'Loading...' : 'Fetch All' }}
      </button>
      <button
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        @click="handleClearAll"
      >
        Clear All
      </button>
      <NuxtLink
        to="/tests/login"
        class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
      >
        Go to Login
      </NuxtLink>
    </div>

    <!-- Guild Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('guild')"
      >
        <h2 class="text-xl font-semibold">
          GUILD
          <span v-if="guildStore.hasGuild" class="text-green-400 text-sm ml-2">{{ guildStore.name }}</span>
          <span v-else class="text-red-400 text-sm ml-2">(No guild)</span>
        </h2>
        <div class="flex items-center gap-2">
          <span v-if="guildStore.loading" class="text-yellow-400 text-sm">Loading...</span>
          <span v-if="guildStore.error" class="text-red-400 text-sm">{{ guildStore.error }}</span>
          <span class="text-gray-400">{{ expandedSections.guild ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.guild" class="p-4 bg-gray-900">
        <div v-if="guildStore.hasGuild" class="space-y-2">
          <div class="grid grid-cols-4 gap-4">
            <div class="p-3 bg-gray-800 rounded">
              <div class="text-gray-400 text-sm">Gold</div>
              <div class="text-yellow-400 text-xl font-bold">{{ guildStore.gold }}</div>
            </div>
            <div class="p-3 bg-gray-800 rounded">
              <div class="text-gray-400 text-sm">Exp</div>
              <div class="text-blue-400 text-xl font-bold">{{ guildStore.exp }}</div>
            </div>
            <div class="p-3 bg-gray-800 rounded">
              <div class="text-gray-400 text-sm">Scrap</div>
              <div class="text-gray-300 text-xl font-bold">{{ guildStore.scrap }}</div>
            </div>
            <div class="p-3 bg-gray-800 rounded">
              <div class="text-gray-400 text-sm">ID</div>
              <div class="text-gray-300 text-xl font-bold">{{ guildStore.guild?.id }}</div>
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('guild')"
          >
            {{ showJsonView.guild ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.guild" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(guildStore.guild, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No guild data</div>
      </div>
    </div>

    <!-- Characters Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('characters')"
      >
        <h2 class="text-xl font-semibold">
          CHARACTERS
          <span class="text-gray-400 text-sm ml-2">({{ characterStore.characterCount }})</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="characterStore.fetchCharacters()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.characters ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.characters" class="p-4 bg-gray-900">
        <div v-if="characterStore.hasCharacters" class="space-y-2">
          <div
            v-for="char in characterStore.characters"
            :key="char.id"
            class="flex items-center gap-3 p-2 bg-gray-800 rounded"
          >
            <span
              :class="getJobBadgeColor(char.job || char.attributes?.job || '')"
              class="px-2 py-1 rounded text-xs text-white uppercase"
            >
              {{ char.job || char.attributes?.job }}
            </span>
            <span>{{ char.firstname || char.attributes?.firstname }} {{ char.lastname || char.attributes?.lastname }}</span>
            <span class="text-gray-500 text-sm ml-auto">ID: {{ char.id }}</span>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('characters')"
          >
            {{ showJsonView.characters ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.characters" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(characterStore.characters, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No characters</div>
      </div>
    </div>

    <!-- Inventory Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('inventory')"
      >
        <h2 class="text-xl font-semibold">
          INVENTORY
          <span class="text-gray-400 text-sm ml-2">({{ inventoryStore.itemCount }} items)</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="inventoryStore.fetchItems()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.inventory ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.inventory" class="p-4 bg-gray-900">
        <div v-if="inventoryStore.hasItems" class="space-y-2">
          <div
            v-for="item in inventoryStore.items"
            :key="item.id"
            class="flex items-center gap-3 p-2 bg-gray-800 rounded"
          >
            <span
              :class="getRarityColor(item.rarity?.name || item.attributes?.rarity?.data?.attributes?.name || '')"
              class="font-semibold"
            >
              [{{ item.rarity?.name || item.attributes?.rarity?.data?.attributes?.name || 'Unknown' }}]
            </span>
            <span>{{ item.name || item.attributes?.name }}</span>
            <span class="text-gray-500 text-sm">({{ item.slot || item.attributes?.slot }})</span>
            <span v-if="item.isScrapped || item.attributes?.isScrapped" class="text-red-400 text-sm">SCRAPPED</span>
            <span class="text-gray-500 text-sm ml-auto">Lvl {{ item.level || item.attributes?.level }}</span>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('inventory')"
          >
            {{ showJsonView.inventory ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.inventory" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(inventoryStore.items, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No items</div>
      </div>
    </div>

    <!-- Quests Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('quests')"
      >
        <h2 class="text-xl font-semibold">
          QUESTS
          <span class="text-green-400 text-sm ml-2">{{ questStore.activeQuestCount }} active</span>
          <span class="text-gray-400 text-sm"> / {{ questStore.completedQuestCount }} completed</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="questStore.fetchQuests()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.quests ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.quests" class="p-4 bg-gray-900">
        <div v-if="questStore.hasQuests" class="space-y-2">
          <div
            v-for="quest in questStore.quests"
            :key="quest.id"
            class="p-2 bg-gray-800 rounded"
          >
            <div class="flex items-center gap-2">
              <span
                :class="(quest.is_poi_a_completed && quest.is_poi_b_completed) ? 'text-green-400' : 'text-yellow-400'"
                class="text-sm"
              >
                {{ (quest.is_poi_a_completed && quest.is_poi_b_completed) ? '[COMPLETED]' : '[ACTIVE]' }}
              </span>
              <span>Quest #{{ quest.id }}</span>
            </div>
            <div class="text-sm text-gray-400 mt-1">
              POI A: {{ quest.is_poi_a_completed ?? quest.attributes?.is_poi_a_completed ? '✓' : '✗' }} |
              POI B: {{ quest.is_poi_b_completed ?? quest.attributes?.is_poi_b_completed ? '✓' : '✗' }} |
              Rewards: {{ quest.gold_earned || quest.attributes?.gold_earned || 0 }} gold, {{ quest.xp_earned || quest.attributes?.xp_earned || 0 }} xp
            </div>
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('quests')"
          >
            {{ showJsonView.quests ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.quests" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(questStore.quests, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No quests</div>
      </div>
    </div>

    <!-- Visits Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('visits')"
      >
        <h2 class="text-xl font-semibold">
          VISITS
          <span class="text-gray-400 text-sm ml-2">({{ visitStore.visitCount }})</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="visitStore.fetchVisits()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.visits ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.visits" class="p-4 bg-gray-900">
        <div v-if="visitStore.hasVisits" class="space-y-2">
          <div class="text-sm text-gray-400 mb-2">
            Total earned: {{ visitStore.totalGoldEarned }} gold, {{ visitStore.totalExpEarned }} exp
          </div>
          <div
            v-for="visit in visitStore.visits"
            :key="visit.id"
            class="p-2 bg-gray-800 rounded text-sm"
          >
            Visit #{{ visit.id }} - Opens: {{ visit.open_count || visit.attributes?.open_count || 0 }}
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('visits')"
          >
            {{ showJsonView.visits ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.visits" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(visitStore.visits, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No visits</div>
      </div>
    </div>

    <!-- Runs Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('runs')"
      >
        <h2 class="text-xl font-semibold">
          RUNS
          <span class="text-gray-400 text-sm ml-2">({{ runStore.runCount }})</span>
          <span v-if="runStore.activeRun" class="text-yellow-400 text-sm ml-2">[1 active]</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="runStore.fetchRuns()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.runs ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.runs" class="p-4 bg-gray-900">
        <div v-if="runStore.hasRuns" class="space-y-2">
          <div class="text-sm text-gray-400 mb-2">
            Total earned: {{ runStore.totalGoldEarned }} gold, {{ runStore.totalExpEarned }} exp
          </div>
          <div
            v-for="run in runStore.runs"
            :key="run.id"
            class="p-2 bg-gray-800 rounded text-sm"
          >
            <span :class="(run.date_end || run.attributes?.date_end) ? 'text-green-400' : 'text-yellow-400'">
              {{ (run.date_end || run.attributes?.date_end) ? '[DONE]' : '[ACTIVE]' }}
            </span>
            Run #{{ run.id }} - DPS: {{ run.dps || run.attributes?.dps || 0 }}
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('runs')"
          >
            {{ showJsonView.runs ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.runs" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(runStore.runs, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No runs</div>
      </div>
    </div>

    <!-- Friendships Section -->
    <div class="mb-4 border border-gray-700 rounded-lg overflow-hidden">
      <div
        class="flex justify-between items-center p-4 bg-gray-800 cursor-pointer"
        @click="toggleSection('friendships')"
      >
        <h2 class="text-xl font-semibold">
          FRIENDSHIPS
          <span class="text-gray-400 text-sm ml-2">({{ friendshipStore.friendshipCount }})</span>
        </h2>
        <div class="flex items-center gap-2">
          <button
            class="text-sm px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
            @click.stop="friendshipStore.fetchFriendships()"
          >
            Refetch
          </button>
          <span class="text-gray-400">{{ expandedSections.friendships ? '▼' : '▶' }}</span>
        </div>
      </div>
      <div v-if="expandedSections.friendships" class="p-4 bg-gray-900">
        <div v-if="friendshipStore.hasFriendships" class="space-y-2">
          <div class="text-sm text-gray-400 mb-2">
            Total unlocked: {{ friendshipStore.totalQuestsUnlocked }} quests, {{ friendshipStore.totalExpeditionsUnlocked }} expeditions
          </div>
          <div
            v-for="friendship in friendshipStore.friendships"
            :key="friendship.id"
            class="p-2 bg-gray-800 rounded text-sm"
          >
            Friendship #{{ friendship.id }} -
            Quests: {{ friendship.quests_entry_unlocked ?? friendship.attributes?.quests_entry_unlocked ?? 0 }} |
            Expeditions: {{ friendship.expedition_entry_unlocked ?? friendship.attributes?.expedition_entry_unlocked ?? 0 }}
          </div>
          <button
            class="text-sm text-blue-400 hover:underline"
            @click="toggleJsonView('friendships')"
          >
            {{ showJsonView.friendships ? 'Hide' : 'Show' }} Raw JSON
          </button>
          <pre v-if="showJsonView.friendships" class="mt-2 p-3 bg-gray-800 rounded text-xs overflow-auto max-h-64">{{ JSON.stringify(friendshipStore.friendships, null, 2) }}</pre>
        </div>
        <div v-else class="text-gray-500">No friendships</div>
      </div>
    </div>
  </div>
</template>
