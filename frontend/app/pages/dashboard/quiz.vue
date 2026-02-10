<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Quiz</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Analytique des quiz, scores et sessions</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.quizData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="bg-gray-900 rounded-xl p-6 animate-pulse">
          <div class="h-4 bg-gray-800 rounded w-24 mb-3" />
          <div class="h-8 bg-gray-800 rounded w-16" />
        </div>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
        <div class="h-5 bg-gray-800 rounded w-48 mb-4" />
        <div class="space-y-3">
          <div v-for="j in 5" :key="j" class="h-8 bg-gray-800 rounded" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <Icon name="bx-error-circle" class="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchQuiz()">
        Reessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.quizData" class="space-y-8">
      <!-- Top KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          icon="bxs-brain"
          label="Tentatives totales"
          :value="adminStore.quizData.totalAttempts ?? 0"
          color="blue"
        />
        <DashboardKpiCard
          icon="bx-trophy"
          label="Score moyen"
          :value="formatScore(adminStore.quizData.avgScore)"
          sub="/ 2500"
          color="amber"
        />
        <DashboardKpiCard
          icon="bx-list-check"
          label="Questions QCM"
          :value="adminStore.quizData.questionTypes?.qcm ?? 0"
          color="emerald"
        />
        <DashboardKpiCard
          icon="bx-time-five"
          label="Questions Timeline"
          :value="adminStore.quizData.questionTypes?.timeline ?? 0"
          color="purple"
        />
      </div>

      <!-- Score Distribution -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Distribution des scores</h2>
        <div v-if="scoreRanges.length > 0" class="space-y-3">
          <div v-for="range in scoreRanges" :key="range.label" class="flex items-center gap-4">
            <span class="text-sm text-gray-400 font-onest w-24 text-right shrink-0">{{ range.label }}</span>
            <div class="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden relative">
              <div
                class="h-full rounded-full transition-all flex items-center"
                :class="range.barColor"
                :style="{ width: range.percent + '%' }"
              >
                <span
                  v-if="range.percent > 12"
                  class="text-xs font-bold text-gray-950 ml-2"
                >
                  {{ range.count }}
                </span>
              </div>
              <span
                v-if="range.percent <= 12"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
              >
                {{ range.count }}
              </span>
            </div>
            <span class="text-xs text-gray-500 font-onest w-12 text-right">{{ range.percent.toFixed(0) }}%</span>
          </div>
        </div>
        <div v-else class="py-8 text-center">
          <p class="text-gray-500 font-onest">Aucune donnee de score disponible</p>
        </div>
      </div>

      <!-- Questions by Tag -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Questions par tag</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="questionsByTag.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">Tag</th>
                <th class="py-3 px-4 text-right">Questions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tag in questionsByTag"
                :key="tag.name"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4">
                  <span
                    class="inline-block px-2.5 py-1 rounded text-xs font-medium"
                    :class="tagColor(tag.name)"
                  >
                    {{ tag.name }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right text-gray-300 font-medium">{{ tag.count }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bx-tag" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucun tag de question disponible</p>
          </div>
        </div>
      </div>

      <!-- Session History Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Historique des sessions</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="sessionHistory.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">Date</th>
                <th class="py-3 px-4 text-center">Statut</th>
                <th class="py-3 px-4 text-right">Participants</th>
                <th class="py-3 px-4 text-right">Score moy.</th>
                <th class="py-3 px-4 text-right">Temps moy.</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="session in sessionHistory"
                :key="session.id"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-gray-300">{{ formatDate(session.date) }}</td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="inline-block px-2.5 py-0.5 rounded text-xs font-medium"
                    :class="statusColor(session.status)"
                  >
                    {{ statusLabel(session.status) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right text-gray-300">{{ session.participants ?? 0 }}</td>
                <td class="py-3 px-4 text-right text-amber-400 font-medium">{{ formatScore(session.avgScore) }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ formatDuration(session.avgTime) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bx-calendar" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune session enregistree</p>
          </div>
        </div>
      </div>

      <!-- Global Leaderboard Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Classement global</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="leaderboard.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4 text-center w-16">Rang</th>
                <th class="py-3 px-4">Guilde</th>
                <th class="py-3 px-4 text-right">Score</th>
                <th class="py-3 px-4 text-right">Date</th>
                <th class="py-3 px-4 text-right">Temps</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(entry, idx) in leaderboard"
                :key="entry.id ?? idx"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-center">
                  <span
                    class="font-bold"
                    :class="rankColor(idx + 1)"
                  >
                    #{{ idx + 1 }}
                  </span>
                </td>
                <td class="py-3 px-4 text-white font-medium">{{ entry.guildName }}</td>
                <td class="py-3 px-4 text-right text-amber-400 font-bold">{{ entry.score }}</td>
                <td class="py-3 px-4 text-right text-gray-400 text-xs">{{ formatDate(entry.date) }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ formatDuration(entry.timeSpent) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bx-trophy" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucun resultat au classement</p>
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
  adminStore.fetchQuiz()
})

// Score distribution
const scoreRanges = computed(() => {
  const dist = adminStore.quizData?.scoreDistribution
  if (!dist) return []

  const ranges = [
    { label: '0 - 500', key: '0-500', barColor: 'bg-red-400' },
    { label: '501 - 1000', key: '501-1000', barColor: 'bg-orange-400' },
    { label: '1001 - 1500', key: '1001-1500', barColor: 'bg-amber-400' },
    { label: '1501 - 2000', key: '1501-2000', barColor: 'bg-emerald-400' },
    { label: '2001 - 2500', key: '2001-2500', barColor: 'bg-blue-400' },
  ]

  const total = ranges.reduce((sum, r) => sum + (dist[r.key] ?? 0), 0)
  return ranges.map((r) => ({
    ...r,
    count: dist[r.key] ?? 0,
    percent: total > 0 ? ((dist[r.key] ?? 0) / total) * 100 : 0,
  }))
})

// Questions by tag
const questionsByTag = computed(() => adminStore.quizData?.questionsByTag ?? [])

// Session history
const sessionHistory = computed(() => adminStore.quizData?.sessionHistory ?? [])

// Leaderboard
const leaderboard = computed(() => adminStore.quizData?.leaderboard ?? [])

// Helpers
function formatScore(score: number | null | undefined): string {
  if (score == null) return '-'
  return Math.round(score).toLocaleString('fr-FR')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '-'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-emerald-400/10 text-emerald-400',
    failed: 'bg-red-400/10 text-red-400',
    pending: 'bg-yellow-400/10 text-yellow-400',
    generating: 'bg-blue-400/10 text-blue-400',
  }
  return map[status] || 'bg-gray-700 text-gray-400'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Termine',
    failed: 'Echoue',
    pending: 'En attente',
    generating: 'Generation',
  }
  return map[status] || status
}

function tagColor(tag: string): string {
  const map: Record<string, string> = {
    'Histoire': 'bg-amber-400/10 text-amber-400',
    'Art': 'bg-purple-400/10 text-purple-400',
    'Sciences': 'bg-blue-400/10 text-blue-400',
    'Nature': 'bg-emerald-400/10 text-emerald-400',
    'Societe': 'bg-red-400/10 text-red-400',
    'Savoir Faire': 'bg-cyan-400/10 text-cyan-400',
  }
  return map[tag] || 'bg-gray-700 text-gray-400'
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-500'
}
</script>
