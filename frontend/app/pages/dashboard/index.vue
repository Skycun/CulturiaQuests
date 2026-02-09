<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Vue d'ensemble</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Statistiques globales de CulturiaQuests</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.overview" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-gray-900 rounded-xl p-6 animate-pulse">
          <div class="h-4 bg-gray-800 rounded w-24 mb-3" />
          <div class="h-8 bg-gray-800 rounded w-16" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <Icon name="bx-error-circle" class="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchOverview()">
        Réessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.overview" class="space-y-8">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          v-for="kpi in mainKpis"
          :key="kpi.label"
          :icon="kpi.icon"
          :label="kpi.label"
          :value="kpi.value"
          :sub="kpi.sub"
          :color="kpi.color"
        />
      </div>

      <!-- Activity & Economy Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Activity by period -->
        <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 class="text-lg font-power text-white mb-4">Activite recente</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm font-onest">
              <thead>
                <tr class="text-gray-500 border-b border-gray-800">
                  <th class="text-left py-2 pr-4">Metrique</th>
                  <th class="text-right py-2 px-4">24h</th>
                  <th class="text-right py-2 px-4">7j</th>
                  <th class="text-right py-2 pl-4">30j</th>
                </tr>
              </thead>
              <tbody class="text-gray-300">
                <tr v-for="row in activityRows" :key="row.label" class="border-b border-gray-800/50">
                  <td class="py-3 pr-4 flex items-center gap-2">
                    <Icon :name="row.icon" class="w-4 h-4 text-gray-500" />
                    {{ row.label }}
                  </td>
                  <td class="text-right py-3 px-4 font-medium">{{ row.last24h }}</td>
                  <td class="text-right py-3 px-4 font-medium">{{ row.last7d }}</td>
                  <td class="text-right py-3 pl-4 font-medium">{{ row.last30d }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Economy -->
        <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 class="text-lg font-power text-white mb-4">Economie</h2>
          <div class="space-y-4">
            <!-- Gold & XP -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-800/50 rounded-lg p-4">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Or en circulation</p>
                <p class="text-2xl font-bold text-amber-400">{{ formatNumber(adminStore.overview.economy.totalGoldInCirculation) }}</p>
              </div>
              <div class="bg-gray-800/50 rounded-lg p-4">
                <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">XP totale</p>
                <p class="text-2xl font-bold text-blue-400">{{ formatNumber(adminStore.overview.economy.totalExpInCirculation) }}</p>
              </div>
            </div>

            <!-- Item rarity distribution -->
            <div>
              <p class="text-sm text-gray-400 mb-3">Repartition des items par rarete</p>
              <div class="space-y-2">
                <div
                  v-for="(count, rarity) in adminStore.overview.economy.itemsByRarity"
                  :key="rarity"
                  class="flex items-center gap-3"
                >
                  <span
                    class="text-xs font-medium w-24 capitalize"
                    :class="rarityColor(String(rarity))"
                  >
                    {{ rarity }}
                  </span>
                  <div class="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="rarityBarColor(String(rarity))"
                      :style="{ width: rarityPercent(count as number) + '%' }"
                    />
                  </div>
                  <span class="text-sm text-gray-400 w-12 text-right">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Secondary KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="kpi in secondaryKpis"
          :key="kpi.label"
          class="bg-gray-900 border border-gray-800 rounded-xl p-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon :name="kpi.icon" class="w-4 h-4 text-gray-500" />
            <span class="text-xs text-gray-500 font-onest">{{ kpi.label }}</span>
          </div>
          <p class="text-xl font-bold text-white">{{ kpi.value }}</p>
        </div>
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
  adminStore.fetchOverview()
})

// KPI data
const mainKpis = computed(() => {
  const t = adminStore.overview?.totals
  const r = adminStore.overview?.recent
  if (!t || !r) return []
  return [
    {
      icon: 'bxs-user',
      label: 'Utilisateurs',
      value: t.users,
      sub: `+${r.newUsers7d} cette semaine`,
      color: 'blue',
    },
    {
      icon: 'bxs-castle',
      label: 'Guildes',
      value: t.guilds,
      sub: `+${r.newGuilds7d} cette semaine`,
      color: 'amber',
    },
    {
      icon: 'bxs-sword',
      label: 'Personnages',
      value: t.characters,
      sub: null,
      color: 'emerald',
    },
    {
      icon: 'bx-package',
      label: 'Items',
      value: t.items,
      sub: null,
      color: 'purple',
    },
  ]
})

const activityRows = computed(() => {
  const a = adminStore.overview?.activity
  if (!a) return []
  return [
    {
      icon: 'game-icons:medieval-barracks',
      label: 'Expeditions',
      ...a.expeditions,
    },
    {
      icon: 'game-icons:open-chest',
      label: 'Coffres ouverts',
      ...a.chestOpened,
    },
    {
      icon: 'bxs-brain',
      label: 'Quiz joues',
      ...a.quizAttempts,
    },
  ]
})

const secondaryKpis = computed(() => {
  const t = adminStore.overview?.totals
  if (!t) return []
  return [
    { icon: 'game-icons:medieval-barracks', label: 'Expeditions totales', value: t.runs },
    { icon: 'game-icons:open-chest', label: 'Visites totales', value: t.visits },
    { icon: 'game-icons:scroll-quill', label: 'Quetes totales', value: t.quests },
    { icon: 'bxs-brain', label: 'Quiz joues', value: t.quizAttempts },
  ]
})

// Helpers
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function rarityColor(rarity: string): string {
  const map: Record<string, string> = {
    basic: 'text-gray-400',
    common: 'text-green-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-amber-400',
  }
  return map[rarity.toLowerCase()] || 'text-gray-400'
}

function rarityBarColor(rarity: string): string {
  const map: Record<string, string> = {
    basic: 'bg-gray-500',
    common: 'bg-green-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-amber-500',
  }
  return map[rarity.toLowerCase()] || 'bg-gray-500'
}

function rarityPercent(count: number): number {
  const total = Object.values(adminStore.overview?.economy.itemsByRarity || {}).reduce(
    (sum: number, c) => sum + (c as number),
    0
  )
  if (!total) return 0
  return Math.max(2, (count / total) * 100)
}
</script>
