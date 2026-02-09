<template>
  <div class="p-8">
    <!-- Back button -->
    <button
      class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 font-onest text-sm"
      @click="router.push('/dashboard/players')"
    >
      <Icon name="bx-arrow-back" class="w-4 h-4" />
      Retour a la liste
    </button>

    <!-- Loading -->
    <div v-if="adminStore.loading && !adminStore.playerDetail" class="space-y-6 animate-pulse">
      <div class="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div class="h-6 bg-gray-800 rounded w-48 mb-4" />
        <div class="h-4 bg-gray-800 rounded w-64" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="adminStore.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <p class="text-red-300 font-onest">{{ adminStore.error }}</p>
    </div>

    <!-- Player Detail -->
    <div v-else-if="player" class="space-y-6">
      <!-- Player Header -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full bg-amber-400/10 flex items-center justify-center">
              <Icon name="bxs-user" class="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 class="text-2xl font-power text-white">{{ player.username }}</h1>
              <p class="text-gray-400 text-sm font-onest">{{ player.email }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span
                  class="inline-block px-2.5 py-1 rounded text-xs font-medium"
                  :class="player.role?.type === 'admin'
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'bg-gray-700 text-gray-400'"
                >
                  {{ player.role?.name || 'Authenticated' }}
                </span>
                <span
                  class="inline-block px-2.5 py-1 rounded text-xs font-medium"
                  :class="player.blocked
                    ? 'bg-red-400/10 text-red-400'
                    : 'bg-emerald-400/10 text-emerald-400'"
                >
                  {{ player.blocked ? 'Bloque' : 'Actif' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-2">
            <button
              v-if="!isSelf"
              class="px-4 py-2 rounded-lg text-sm font-onest transition-colors border"
              :class="player.blocked
                ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10'
                : 'border-red-500/30 text-red-400 hover:bg-red-400/10'"
              @click="handleToggleBlock"
            >
              {{ player.blocked ? 'Debloquer' : 'Bloquer' }}
            </button>
            <button
              v-if="!isSelf"
              class="px-4 py-2 rounded-lg text-sm font-onest transition-colors border"
              :class="player.role?.type === 'admin'
                ? 'border-gray-600 text-gray-400 hover:bg-gray-800'
                : 'border-amber-500/30 text-amber-400 hover:bg-amber-400/10'"
              @click="handleToggleAdmin"
            >
              {{ player.role?.type === 'admin' ? 'Retirer admin' : 'Promouvoir admin' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Guild info -->
      <div v-if="player.guild" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Guilde : {{ player.guild.name }}</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBlock label="Niveau" :value="player.guild.level" color="text-white" />
          <StatBlock label="Or" :value="player.guild.gold" color="text-amber-400" />
          <StatBlock label="XP" :value="formatNumber(Number(player.guild.exp))" color="text-blue-400" />
          <StatBlock label="Scrap" :value="player.guild.scrap" color="text-gray-300" />
          <StatBlock label="Debug" :value="player.guild.debug_mode ? 'Oui' : 'Non'" :color="player.guild.debug_mode ? 'text-yellow-400' : 'text-gray-500'" />
        </div>
      </div>

      <div v-else class="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
        <p class="text-gray-500 font-onest">Ce joueur n'a pas encore de guilde</p>
      </div>

      <!-- Characters -->
      <div v-if="player.characters?.length" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">
          Personnages ({{ player.characters.length }})
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="char in player.characters"
            :key="char.id"
            class="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3"
          >
            <img
              v-if="char.icon?.url"
              :src="apiUrl + char.icon.url"
              :alt="char.firstname"
              class="w-10 h-10 rounded-lg pixelated object-cover bg-gray-700"
            />
            <div v-else class="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
              <Icon name="bxs-user" class="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p class="text-white text-sm font-medium">{{ char.firstname }} {{ char.lastname }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div v-if="player.stats" class="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-power text-white mb-4">Statistiques</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock label="Expeditions" :value="player.stats.totalExpeditions" />
          <StatBlock label="Etage max" :value="player.stats.maxFloor" />
          <StatBlock label="Coffres ouverts" :value="player.stats.totalPoiVisits" />
          <StatBlock label="POI visites" :value="player.stats.totalDistinctPois" />
          <StatBlock label="Items collectes" :value="player.stats.totalItemsCollected" />
          <StatBlock label="Items recycles" :value="player.stats.totalItemsScrapped" />
          <StatBlock label="Or total" :value="formatNumber(player.stats.totalGold)" color="text-amber-400" />
          <StatBlock label="Jours actif" :value="player.stats.accountDays" />
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="player.recentActivity" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Recent Runs -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-sm font-power text-white mb-3">Dernieres expeditions</h3>
          <div v-if="player.recentActivity.runs.length" class="space-y-2">
            <div
              v-for="run in player.recentActivity.runs"
              :key="run.id"
              class="bg-gray-800/50 rounded-lg p-3 text-xs font-onest"
            >
              <p class="text-gray-300">{{ run.museum?.name || 'Musee inconnu' }}</p>
              <div class="flex gap-3 mt-1 text-gray-500">
                <span>+{{ run.gold_earned || 0 }} or</span>
                <span>Etage {{ run.threshold_reached || 0 }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-gray-600 text-xs font-onest">Aucune expedition</p>
        </div>

        <!-- Recent Visits -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-sm font-power text-white mb-3">Dernieres visites</h3>
          <div v-if="player.recentActivity.visits.length" class="space-y-2">
            <div
              v-for="visit in player.recentActivity.visits"
              :key="visit.id"
              class="bg-gray-800/50 rounded-lg p-3 text-xs font-onest"
            >
              <p class="text-gray-300">{{ visit.poi?.name || 'POI inconnu' }}</p>
              <div class="flex gap-3 mt-1 text-gray-500">
                <span>{{ visit.open_count }}x ouvert</span>
                <span>+{{ visit.total_gold_earned || 0 }} or</span>
              </div>
            </div>
          </div>
          <p v-else class="text-gray-600 text-xs font-onest">Aucune visite</p>
        </div>

        <!-- Recent Quiz -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 class="text-sm font-power text-white mb-3">Derniers quiz</h3>
          <div v-if="player.recentActivity.quizAttempts.length" class="space-y-2">
            <div
              v-for="attempt in player.recentActivity.quizAttempts"
              :key="attempt.id"
              class="bg-gray-800/50 rounded-lg p-3 text-xs font-onest"
            >
              <div class="flex justify-between">
                <span class="text-gray-300">Score : {{ attempt.score }}/2500</span>
                <span class="text-gray-500">{{ attempt.time_spent_seconds }}s</span>
              </div>
              <p class="text-gray-500 mt-1">
                {{ attempt.completed_at ? formatDate(attempt.completed_at) : '' }}
              </p>
            </div>
          </div>
          <p v-else class="text-gray-600 text-xs font-onest">Aucun quiz</p>
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

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const currentUser = useStrapiUser()
const config = useRuntimeConfig()

const apiUrl = computed(() => config.public.strapi.url)

const player = computed(() => adminStore.playerDetail)
const isSelf = computed(() => player.value?.id === (currentUser.value as any)?.id)

const playerId = Number(route.params.id)

onMounted(() => {
  if (playerId) {
    adminStore.fetchPlayerDetail(playerId)
  }
})

async function handleToggleBlock() {
  if (!player.value || isSelf.value) return
  await adminStore.toggleBlockPlayer(player.value.id)
  adminStore.fetchPlayerDetail(playerId)
}

async function handleToggleAdmin() {
  if (!player.value || isSelf.value) return
  const newRole = player.value.role?.type === 'admin' ? 'authenticated' : 'admin'
  await adminStore.changePlayerRole(player.value.id, newRole)
  adminStore.fetchPlayerDetail(playerId)
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
