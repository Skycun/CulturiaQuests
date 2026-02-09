import { defineStore } from 'pinia'

interface PlayerSummary {
  id: number
  username: string
  email: string
  blocked: boolean
  createdAt: string
  role: { id: number; name: string; type: string }
  guild: {
    id: number
    documentId: string
    name: string
    gold: number
    exp: number | string
    scrap: number
    debug_mode: boolean
    level: number
    characterCount: number
    itemCount: number
  } | null
}

interface PlayerDetail extends PlayerSummary {
  characters: Array<{
    id: number
    documentId: string
    firstname: string
    lastname: string
    icon?: { url: string }
  }>
  stats: Record<string, any> | null
  recentActivity: {
    runs: any[]
    visits: any[]
    quizAttempts: any[]
  }
}

interface ActivityPeriod {
  last24h: number
  last7d: number
  last30d: number
}

interface DashboardOverview {
  totals: {
    users: number
    guilds: number
    characters: number
    items: number
    runs: number
    visits: number
    quests: number
    quizAttempts: number
  }
  recent: {
    newUsers7d: number
    newGuilds7d: number
  }
  activity: {
    expeditions: ActivityPeriod
    chestOpened: ActivityPeriod
    quizAttempts: ActivityPeriod
  }
  economy: {
    totalGoldInCirculation: number
    totalExpInCirculation: number
    itemsByRarity: Record<string, number>
  }
}

interface Pagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const overview = ref<DashboardOverview | null>(null)
  const players = ref<PlayerSummary[]>([])
  const playerDetail = ref<PlayerDetail | null>(null)
  const pagination = ref<Pagination>({ page: 1, pageSize: 25, pageCount: 0, total: 0 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchOverview() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<DashboardOverview>('/admin-dashboard/overview', {
        method: 'GET',
      })
      overview.value = response
    } catch (e: any) {
      console.error('Failed to fetch dashboard overview:', e)
      error.value = e?.message || 'Failed to fetch dashboard overview'
    } finally {
      loading.value = false
    }
  }

  async function fetchPlayers(params: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortOrder?: string
  } = {}) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<{ data: PlayerSummary[]; pagination: Pagination }>(
        '/admin-dashboard/players',
        {
          method: 'GET',
          params: {
            page: params.page || 1,
            pageSize: params.pageSize || 25,
            search: params.search || '',
            sortBy: params.sortBy || 'createdAt',
            sortOrder: params.sortOrder || 'desc',
          },
        }
      )
      players.value = response.data
      pagination.value = response.pagination
    } catch (e: any) {
      console.error('Failed to fetch players:', e)
      error.value = e?.message || 'Failed to fetch players'
    } finally {
      loading.value = false
    }
  }

  async function fetchPlayerDetail(userId: number) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<PlayerDetail>(`/admin-dashboard/players/${userId}`, {
        method: 'GET',
      })
      playerDetail.value = response
    } catch (e: any) {
      console.error('Failed to fetch player detail:', e)
      error.value = e?.message || 'Failed to fetch player detail'
    } finally {
      loading.value = false
    }
  }

  async function toggleBlockPlayer(userId: number) {
    const client = useStrapiClient()

    try {
      const response = await client<{ id: number; username: string; blocked: boolean }>(
        `/admin-dashboard/players/${userId}/toggle-block`,
        { method: 'PUT' }
      )

      // Update in the players list
      const idx = players.value.findIndex((p) => p.id === userId)
      if (idx !== -1) {
        players.value[idx].blocked = response.blocked
      }

      // Update in detail view
      if (playerDetail.value?.id === userId) {
        playerDetail.value.blocked = response.blocked
      }

      return response
    } catch (e: any) {
      console.error('Failed to toggle block:', e)
      error.value = e?.message || 'Failed to toggle block status'
      throw e
    }
  }

  async function changePlayerRole(userId: number, role: string) {
    const client = useStrapiClient()

    try {
      const response = await client<{ id: number; username: string; role: { id: number; name: string; type: string } }>(
        `/admin-dashboard/players/${userId}/role`,
        {
          method: 'PUT',
          body: { role },
        }
      )

      // Update in the players list
      const idx = players.value.findIndex((p) => p.id === userId)
      if (idx !== -1) {
        players.value[idx].role = response.role
      }

      // Update in detail view
      if (playerDetail.value?.id === userId) {
        playerDetail.value.role = response.role
      }

      return response
    } catch (e: any) {
      console.error('Failed to change role:', e)
      error.value = e?.message || 'Failed to change role'
      throw e
    }
  }

  function clearAdmin() {
    overview.value = null
    players.value = []
    playerDetail.value = null
    pagination.value = { page: 1, pageSize: 25, pageCount: 0, total: 0 }
    error.value = null
  }

  return {
    // State
    overview,
    players,
    playerDetail,
    pagination,
    loading,
    error,
    // Actions
    fetchOverview,
    fetchPlayers,
    fetchPlayerDetail,
    toggleBlockPlayer,
    changePlayerRole,
    clearAdmin,
  }
})
