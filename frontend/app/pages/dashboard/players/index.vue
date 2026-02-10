<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-power text-white tracking-wide">Joueurs</h1>
        <p class="text-gray-400 mt-1 font-onest text-sm">
          {{ adminStore.pagination.total }} utilisateurs enregistres
        </p>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative">
          <Icon name="bx-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher par nom ou email..."
            class="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400/50 font-onest"
            @input="debouncedSearch"
          />
        </div>
        <select
          v-model="sortBy"
          class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 font-onest focus:outline-none focus:border-amber-400/50"
          @change="loadPlayers"
        >
          <option value="createdAt">Date d'inscription</option>
          <option value="username">Nom d'utilisateur</option>
          <option value="email">Email</option>
        </select>
        <button
          class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-400 hover:text-white transition-colors"
          @click="toggleSortOrder"
        >
          <Icon :name="sortOrder === 'asc' ? 'bx-sort-up' : 'bx-sort-down'" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="adminStore.loading && adminStore.players.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-gray-800 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-800 rounded w-32" />
            <div class="h-3 bg-gray-800 rounded w-48" />
          </div>
        </div>
      </div>
    </div>

    <!-- Player Table -->
    <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm font-onest">
          <thead>
            <tr class="text-gray-500 border-b border-gray-800 text-left">
              <th class="py-3 px-4">Joueur</th>
              <th class="py-3 px-4">Guilde</th>
              <th class="py-3 px-4 text-center">Niveau</th>
              <th class="py-3 px-4 text-right">Or</th>
              <th class="py-3 px-4 text-center">Persos</th>
              <th class="py-3 px-4 text-center">Items</th>
              <th class="py-3 px-4 text-center">Role</th>
              <th class="py-3 px-4 text-center">Statut</th>
              <th class="py-3 px-4 text-right">Inscription</th>
              <th class="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in adminStore.players"
              :key="player.id"
              class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
              @click="goToPlayer(player.id)"
            >
              <td class="py-3 px-4">
                <div>
                  <p class="text-white font-medium">{{ player.username }}</p>
                  <p class="text-gray-500 text-xs">{{ player.email }}</p>
                </div>
              </td>
              <td class="py-3 px-4">
                <span v-if="player.guild" class="text-amber-400">{{ player.guild.name }}</span>
                <span v-else class="text-gray-600 italic">Aucune</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span v-if="player.guild" class="text-white font-bold">{{ player.guild.level }}</span>
                <span v-else class="text-gray-600">-</span>
              </td>
              <td class="py-3 px-4 text-right">
                <span v-if="player.guild" class="text-amber-300">{{ player.guild.gold }}</span>
                <span v-else class="text-gray-600">-</span>
              </td>
              <td class="py-3 px-4 text-center text-gray-300">
                {{ player.guild?.characterCount ?? '-' }}
              </td>
              <td class="py-3 px-4 text-center text-gray-300">
                {{ player.guild?.itemCount ?? '-' }}
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="inline-block px-2 py-0.5 rounded text-xs font-medium"
                  :class="player.role?.type === 'admin'
                    ? 'bg-amber-400/10 text-amber-400'
                    : 'bg-gray-700 text-gray-400'"
                >
                  {{ player.role?.name || 'Authenticated' }}
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full"
                  :class="player.blocked ? 'bg-red-500' : 'bg-emerald-500'"
                  :title="player.blocked ? 'Bloque' : 'Actif'"
                />
              </td>
              <td class="py-3 px-4 text-right text-gray-400 text-xs">
                {{ formatDate(player.createdAt) }}
              </td>
              <td class="py-3 px-4 text-center" @click.stop>
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    :class="player.blocked ? 'text-emerald-400' : 'text-red-400'"
                    :title="player.blocked ? 'Debloquer' : 'Bloquer'"
                    @click="handleToggleBlock(player)"
                  >
                    <Icon :name="player.blocked ? 'bx-lock-open' : 'bx-block'" class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400"
                    title="Voir le detail"
                    @click="goToPlayer(player.id)"
                  >
                    <Icon name="bx-chevron-right" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div v-if="adminStore.players.length === 0 && !adminStore.loading" class="py-12 text-center">
        <Icon name="bxs-user-x" class="w-12 h-12 text-gray-700 mx-auto mb-3" />
        <p class="text-gray-500 font-onest">Aucun joueur trouve</p>
      </div>

      <!-- Pagination -->
      <div
        v-if="adminStore.pagination.pageCount > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-800"
      >
        <p class="text-sm text-gray-500 font-onest">
          Page {{ adminStore.pagination.page }} / {{ adminStore.pagination.pageCount }}
          ({{ adminStore.pagination.total }} resultats)
        </p>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 rounded-lg text-sm font-onest transition-colors"
            :class="adminStore.pagination.page <= 1
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
            :disabled="adminStore.pagination.page <= 1"
            @click="goToPage(adminStore.pagination.page - 1)"
          >
            Precedent
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-sm font-onest transition-colors"
            :class="adminStore.pagination.page >= adminStore.pagination.pageCount
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
            :disabled="adminStore.pagination.page >= adminStore.pagination.pageCount"
            @click="goToPage(adminStore.pagination.page + 1)"
          >
            Suivant
          </button>
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

const router = useRouter()
const adminStore = useAdminStore()

const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadPlayers()
  }, 400)
}

function loadPlayers(page = 1) {
  adminStore.fetchPlayers({
    page,
    search: searchQuery.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
  })
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  loadPlayers()
}

function goToPage(page: number) {
  loadPlayers(page)
}

function goToPlayer(id: number) {
  router.push(`/dashboard/players/${id}`)
}

async function handleToggleBlock(player: any) {
  if (player.role?.type === 'admin') return
  await adminStore.toggleBlockPlayer(player.id)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

onMounted(() => {
  loadPlayers()
})
</script>
