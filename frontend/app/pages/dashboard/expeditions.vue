<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Expeditions & Quetes</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Statistiques des expeditions, quetes et PNJs</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.expeditionsData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-gray-900 rounded-xl p-6 animate-pulse">
          <div class="h-4 bg-gray-800 rounded w-24 mb-3" />
          <div class="h-8 bg-gray-800 rounded w-16" />
        </div>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
        <div class="h-5 bg-gray-800 rounded w-48 mb-4" />
        <div class="space-y-3">
          <div v-for="j in 5" :key="j" class="h-10 bg-gray-800 rounded" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <Icon name="bx-error-circle" class="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchExpeditions()">
        Reessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.expeditionsData" class="space-y-8">
      <!-- Quest KPI Cards -->
      <div>
        <h2 class="text-lg font-power text-white mb-4">Quetes</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardKpiCard
            icon="game-icons:scroll-quill"
            label="Total quetes"
            :value="questStats.total ?? 0"
            color="blue"
          />
          <DashboardKpiCard
            icon="bx-check-circle"
            label="Completees"
            :value="questStats.completed ?? 0"
            :sub="completionRateSub"
            color="emerald"
          />
          <DashboardKpiCard
            icon="bx-loader-circle"
            label="Partielles"
            :value="questStats.partial ?? 0"
            color="amber"
          />
          <DashboardKpiCard
            icon="bx-time"
            label="En attente"
            :value="questStats.pending ?? 0"
            color="purple"
          />
        </div>
      </div>

      <!-- Museum Stats Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Statistiques par musee</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="museumStats.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">Nom</th>
                <th class="py-3 px-4 text-right">Expeditions</th>
                <th class="py-3 px-4 text-right">Completees</th>
                <th class="py-3 px-4 text-right">Or gagne</th>
                <th class="py-3 px-4 text-right">Etage max</th>
                <th class="py-3 px-4 text-right">DPS moy.</th>
                <th class="py-3 px-4 text-right">Duree moy.</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="museum in museumStats"
                :key="museum.id"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-white font-medium max-w-[200px] truncate">{{ museum.name }}</td>
                <td class="py-3 px-4 text-right text-amber-400 font-medium">{{ museum.totalRuns ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-emerald-400">{{ museum.completed ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-amber-300">{{ museum.goldEarned ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ museum.maxFloor ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ formatDps(museum.avgDps) }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ formatDuration(museum.avgDuration) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="game-icons:medieval-barracks" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune expedition enregistree</p>
          </div>
        </div>
      </div>

      <!-- NPC Quest Ranking Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Classement PNJ par quetes</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="npcQuestRanking.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">PNJ</th>
                <th class="py-3 px-4 text-right">Quetes</th>
                <th class="py-3 px-4 text-right">Completees</th>
                <th class="py-3 px-4 text-right">Taux</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="npc in npcQuestRanking"
                :key="npc.id"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-white font-medium">{{ npc.name }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ npc.questCount ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-emerald-400">{{ npc.completedCount ?? 0 }}</td>
                <td class="py-3 px-4 text-right">
                  <span
                    class="font-medium"
                    :class="getCompletionColor(npc.completionRate ?? 0)"
                  >
                    {{ (npc.completionRate ?? 0).toFixed(1) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bxs-user-voice" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune donnee de quete PNJ disponible</p>
          </div>
        </div>
      </div>

      <!-- NPC Expedition Ranking Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Classement PNJ par expeditions</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="npcExpeditionRanking.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">Nom</th>
                <th class="py-3 px-4">Surnom</th>
                <th class="py-3 px-4 text-right">Expeditions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="npc in npcExpeditionRanking"
                :key="npc.id"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-white font-medium">{{ npc.name }}</td>
                <td class="py-3 px-4 text-gray-400">{{ npc.nickname || '-' }}</td>
                <td class="py-3 px-4 text-right text-amber-400 font-medium">{{ npc.expeditionCount ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bxs-user-voice" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune donnee d'expedition PNJ disponible</p>
          </div>
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
  adminStore.fetchExpeditions()
})

// Quest stats
const questStats = computed(() => adminStore.expeditionsData?.questStats ?? {})

const completionRateSub = computed(() => {
  const s = questStats.value
  if (!s.total || s.total === 0) return null
  const rate = ((s.completed ?? 0) / s.total * 100).toFixed(1)
  return `${rate}% de completion`
})

// Museum stats
const museumStats = computed(() => adminStore.expeditionsData?.museumStats ?? [])

// NPC rankings
const npcQuestRanking = computed(() => adminStore.expeditionsData?.npcQuestRanking ?? [])
const npcExpeditionRanking = computed(() => adminStore.expeditionsData?.npcExpeditionRanking ?? [])

// Helpers
function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '-'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function formatDps(dps: number | null | undefined): string {
  if (dps == null) return '-'
  return dps.toFixed(1)
}

function getCompletionColor(rate: number): string {
  if (rate >= 75) return 'text-emerald-400'
  if (rate >= 50) return 'text-amber-400'
  if (rate >= 25) return 'text-orange-400'
  return 'text-red-400'
}
</script>
