<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Economie</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Sources de revenus, distribution des items et niveaux</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.economyData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
          <div class="h-5 bg-gray-800 rounded w-48 mb-4" />
          <div class="grid grid-cols-2 gap-3">
            <div v-for="j in 4" :key="j" class="h-16 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <Icon name="bx-error-circle" class="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchEconomy()">
        Reessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.economyData" class="space-y-8">
      <!-- Gold Sources -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Sources d'or</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <DashboardStatBlock
            label="Expeditions"
            :value="formatNumber(goldSources.expeditions)"
            color="text-amber-400"
          />
          <DashboardStatBlock
            label="Coffres"
            :value="formatNumber(goldSources.chests)"
            color="text-amber-400"
          />
          <DashboardStatBlock
            label="Quetes"
            :value="formatNumber(goldSources.quests)"
            color="text-amber-400"
          />
          <DashboardStatBlock
            label="Quiz"
            :value="formatNumber(goldSources.quiz)"
            color="text-amber-400"
          />
        </div>
        <!-- Horizontal proportion bar -->
        <div v-if="totalGold > 0" class="w-full h-4 rounded-full overflow-hidden flex bg-gray-800">
          <div
            class="h-full bg-amber-500 transition-all"
            :style="{ width: goldPercent('expeditions') + '%' }"
            :title="`Expeditions: ${goldPercent('expeditions').toFixed(1)}%`"
          />
          <div
            class="h-full bg-amber-400 transition-all"
            :style="{ width: goldPercent('chests') + '%' }"
            :title="`Coffres: ${goldPercent('chests').toFixed(1)}%`"
          />
          <div
            class="h-full bg-amber-300 transition-all"
            :style="{ width: goldPercent('quests') + '%' }"
            :title="`Quetes: ${goldPercent('quests').toFixed(1)}%`"
          />
          <div
            class="h-full bg-yellow-300 transition-all"
            :style="{ width: goldPercent('quiz') + '%' }"
            :title="`Quiz: ${goldPercent('quiz').toFixed(1)}%`"
          />
        </div>
        <div v-if="totalGold > 0" class="flex items-center gap-4 mt-2 text-xs font-onest text-gray-500">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500" /> Expeditions</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-400" /> Coffres</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-300" /> Quetes</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-yellow-300" /> Quiz</span>
        </div>
      </div>

      <!-- XP Sources -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Sources d'XP</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <DashboardStatBlock
            label="Expeditions"
            :value="formatNumber(xpSources.expeditions)"
            color="text-blue-400"
          />
          <DashboardStatBlock
            label="Coffres"
            :value="formatNumber(xpSources.chests)"
            color="text-blue-400"
          />
          <DashboardStatBlock
            label="Quetes"
            :value="formatNumber(xpSources.quests)"
            color="text-blue-400"
          />
          <DashboardStatBlock
            label="Quiz"
            :value="formatNumber(xpSources.quiz)"
            color="text-blue-400"
          />
        </div>
        <!-- Horizontal proportion bar -->
        <div v-if="totalXp > 0" class="w-full h-4 rounded-full overflow-hidden flex bg-gray-800">
          <div
            class="h-full bg-blue-500 transition-all"
            :style="{ width: xpPercent('expeditions') + '%' }"
            :title="`Expeditions: ${xpPercent('expeditions').toFixed(1)}%`"
          />
          <div
            class="h-full bg-blue-400 transition-all"
            :style="{ width: xpPercent('chests') + '%' }"
            :title="`Coffres: ${xpPercent('chests').toFixed(1)}%`"
          />
          <div
            class="h-full bg-blue-300 transition-all"
            :style="{ width: xpPercent('quests') + '%' }"
            :title="`Quetes: ${xpPercent('quests').toFixed(1)}%`"
          />
          <div
            class="h-full bg-cyan-300 transition-all"
            :style="{ width: xpPercent('quiz') + '%' }"
            :title="`Quiz: ${xpPercent('quiz').toFixed(1)}%`"
          />
        </div>
        <div v-if="totalXp > 0" class="flex items-center gap-4 mt-2 text-xs font-onest text-gray-500">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-blue-500" /> Expeditions</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-blue-400" /> Coffres</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-blue-300" /> Quetes</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-cyan-300" /> Quiz</span>
        </div>
      </div>

      <!-- Item Economy -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Economie des items</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <DashboardStatBlock
            label="Total items"
            :value="itemEconomy.totalItems ?? 0"
            color="text-white"
          />
          <DashboardStatBlock
            label="Items actifs"
            :value="itemEconomy.activeCount ?? 0"
            color="text-emerald-400"
          />
          <DashboardStatBlock
            label="Items scrapped"
            :value="itemEconomy.scrappedCount ?? 0"
            color="text-red-400"
          />
          <DashboardStatBlock
            label="Armes"
            :value="itemSlots.weapon ?? 0"
            color="text-amber-400"
          />
          <DashboardStatBlock
            label="Casques"
            :value="itemSlots.helmet ?? 0"
            color="text-blue-400"
          />
          <DashboardStatBlock
            label="Charmes"
            :value="itemSlots.charm ?? 0"
            color="text-purple-400"
          />
        </div>
      </div>

      <!-- Level Distribution -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Distribution des niveaux</h2>
        <div v-if="levelBrackets.length > 0" class="space-y-3">
          <div v-for="bracket in levelBrackets" :key="bracket.label" class="flex items-center gap-4">
            <span class="text-sm text-gray-400 font-onest w-16 text-right shrink-0">{{ bracket.label }}</span>
            <div class="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden relative">
              <div
                class="h-full bg-amber-400/80 rounded-full transition-all flex items-center"
                :style="{ width: bracket.percent + '%' }"
              >
                <span
                  v-if="bracket.percent > 10"
                  class="text-xs font-bold text-gray-950 ml-2"
                >
                  {{ bracket.count }}
                </span>
              </div>
              <span
                v-if="bracket.percent <= 10"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
              >
                {{ bracket.count }}
              </span>
            </div>
            <span class="text-xs text-gray-500 font-onest w-12 text-right">{{ bracket.percent.toFixed(0) }}%</span>
          </div>
        </div>
        <div v-else class="py-8 text-center">
          <p class="text-gray-500 font-onest">Aucune donnee de niveau disponible</p>
        </div>
      </div>

      <!-- Scrap in Circulation -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Scrap en circulation</h2>
        <DashboardStatBlock
          label="Scrap total"
          :value="formatNumber(adminStore.economyData?.scrapInCirculation ?? 0)"
          color="text-amber-400"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['admin'],
})

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.fetchEconomy()
})

// Gold sources
const goldSources = computed(() => {
  const g = adminStore.economyData?.goldSources
  return {
    expeditions: g?.expeditions ?? 0,
    chests: g?.chests ?? 0,
    quests: g?.quests ?? 0,
    quiz: g?.quiz ?? 0,
  }
})

const totalGold = computed(() => {
  const g = goldSources.value
  return g.expeditions + g.chests + g.quests + g.quiz
})

function goldPercent(source: string): number {
  if (totalGold.value === 0) return 0
  return ((goldSources.value as any)[source] / totalGold.value) * 100
}

// XP sources
const xpSources = computed(() => {
  const x = adminStore.economyData?.xpSources
  return {
    expeditions: x?.expeditions ?? 0,
    chests: x?.chests ?? 0,
    quests: x?.quests ?? 0,
    quiz: x?.quiz ?? 0,
  }
})

const totalXp = computed(() => {
  const x = xpSources.value
  return x.expeditions + x.chests + x.quests + x.quiz
})

function xpPercent(source: string): number {
  if (totalXp.value === 0) return 0
  return ((xpSources.value as any)[source] / totalXp.value) * 100
}

// Item economy
const itemEconomy = computed(() => adminStore.economyData?.itemEconomy ?? {})
const itemSlots = computed(() => adminStore.economyData?.itemEconomy?.bySlot ?? {})

// Level distribution
const levelBrackets = computed(() => {
  const dist = adminStore.economyData?.levelDistribution
  if (!dist) return []

  const brackets = [
    { label: '1-5', count: dist['1-5'] ?? 0 },
    { label: '6-10', count: dist['6-10'] ?? 0 },
    { label: '11-20', count: dist['11-20'] ?? 0 },
    { label: '21-50', count: dist['21-50'] ?? 0 },
    { label: '51+', count: dist['51+'] ?? 0 },
  ]

  const total = brackets.reduce((sum, b) => sum + b.count, 0)
  return brackets.map((b) => ({
    ...b,
    percent: total > 0 ? (b.count / total) * 100 : 0,
  }))
})

// Helpers
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}
</script>
