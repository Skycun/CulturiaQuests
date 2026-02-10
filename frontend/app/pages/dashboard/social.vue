<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-power text-white tracking-wide">Social</h1>
      <p class="text-gray-400 mt-1 font-onest text-sm">Amities entre joueurs et progression PNJ</p>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.loading && !adminStore.socialData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-gray-900 rounded-xl p-6 animate-pulse">
          <div class="h-4 bg-gray-800 rounded w-24 mb-3" />
          <div class="h-8 bg-gray-800 rounded w-16" />
        </div>
      </div>
      <div v-for="i in 2" :key="'table-' + i" class="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
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
      <button class="mt-3 text-sm text-red-400 hover:text-red-300 underline" @click="adminStore.fetchSocial()">
        Reessayer
      </button>
    </div>

    <!-- Data -->
    <div v-else-if="adminStore.socialData" class="space-y-8">
      <!-- Friendship KPIs -->
      <div>
        <h2 class="text-lg font-power text-white mb-4">Amities entre joueurs</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <DashboardKpiCard
            icon="bxs-group"
            label="Total demandes"
            :value="friendshipStats.total ?? 0"
            color="blue"
          />
          <DashboardKpiCard
            icon="bx-check-circle"
            label="Acceptees"
            :value="friendshipStats.accepted ?? 0"
            color="emerald"
          />
          <DashboardKpiCard
            icon="bx-time"
            label="En attente"
            :value="friendshipStats.pending ?? 0"
            color="amber"
          />
          <DashboardKpiCard
            icon="bx-x-circle"
            label="Refusees"
            :value="friendshipStats.rejected ?? 0"
            color="red"
          />
          <DashboardKpiCard
            icon="bx-trending-up"
            label="Taux d'acceptation"
            :value="acceptanceRate"
            color="purple"
          />
        </div>
      </div>

      <!-- Most Connected Players Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Joueurs les plus connectes</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="mostConnected.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4 text-center w-16">Rang</th>
                <th class="py-3 px-4">Guilde</th>
                <th class="py-3 px-4 text-right">Amis</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(player, idx) in mostConnected"
                :key="player.id ?? idx"
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
                <td class="py-3 px-4 text-white font-medium">{{ player.guildName }}</td>
                <td class="py-3 px-4 text-right text-amber-400 font-bold">{{ player.friendCount }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bxs-group" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune donnee d'amitie disponible</p>
          </div>
        </div>
      </div>

      <!-- NPC Friendship Progress Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div class="p-6 border-b border-gray-800">
          <h2 class="text-lg font-power text-white">Progression d'amitie PNJ</h2>
        </div>
        <div class="overflow-x-auto">
          <table v-if="npcFriendshipProgress.length > 0" class="w-full text-sm font-onest">
            <thead>
              <tr class="text-gray-500 border-b border-gray-800 text-left">
                <th class="py-3 px-4">PNJ</th>
                <th class="py-3 px-4">Surnom</th>
                <th class="py-3 px-4 text-right">Joueurs lies</th>
                <th class="py-3 px-4">Progression quetes</th>
                <th class="py-3 px-4">Progression expeditions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="npc in npcFriendshipProgress"
                :key="npc.id"
                class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td class="py-3 px-4 text-white font-medium">{{ npc.name }}</td>
                <td class="py-3 px-4 text-gray-400">{{ npc.nickname || '-' }}</td>
                <td class="py-3 px-4 text-right text-gray-300">{{ npc.playersWithFriendship ?? 0 }}</td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        class="h-full bg-emerald-400 rounded-full transition-all"
                        :style="{ width: Math.min(npc.avgQuestProgress ?? 0, 100) + '%' }"
                      />
                    </div>
                    <span class="text-xs text-gray-400 w-10 text-right shrink-0">
                      {{ (npc.avgQuestProgress ?? 0).toFixed(0) }}%
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        class="h-full bg-amber-400 rounded-full transition-all"
                        :style="{ width: Math.min(npc.avgExpeditionProgress ?? 0, 100) + '%' }"
                      />
                    </div>
                    <span class="text-xs text-gray-400 w-10 text-right shrink-0">
                      {{ (npc.avgExpeditionProgress ?? 0).toFixed(0) }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="py-12 text-center">
            <Icon name="bxs-user-voice" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p class="text-gray-500 font-onest">Aucune donnee de progression PNJ disponible</p>
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
  adminStore.fetchSocial()
})

// Friendship stats
const friendshipStats = computed(() => adminStore.socialData?.friendshipStats ?? {})

const acceptanceRate = computed(() => {
  const s = friendshipStats.value
  const total = s.total ?? 0
  const accepted = s.accepted ?? 0
  if (total === 0) return '0%'
  return ((accepted / total) * 100).toFixed(1) + '%'
})

// Most connected players
const mostConnected = computed(() => adminStore.socialData?.mostConnected ?? [])

// NPC friendship progress
const npcFriendshipProgress = computed(() => adminStore.socialData?.npcFriendshipProgress ?? [])

// Helpers
function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-500'
}
</script>
