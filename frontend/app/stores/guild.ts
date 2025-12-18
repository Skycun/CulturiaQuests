import { defineStore } from 'pinia'
import type { Guild } from '~/types/guild'

export const useGuildStore = defineStore('guild', () => {
  // State
  const guild = ref<Guild | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasGuild = computed(() => guild.value !== null)

  // Actions
  function setGuild(data: Guild) {
    guild.value = data
  }

  function clearGuild() {
    guild.value = null
    error.value = null
  }

  /**
   * Fetches the guild data for the current authenticated user
   */
  async function fetchGuild() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/guilds/me', {
        method: 'GET',
      })

      const guildData = response.data || response

      if (guildData) {
        setGuild(guildData)
      }
    } catch (e: any) {
      console.error('Failed to fetch guild:', e)
      error.value = e?.message || 'Failed to fetch guild'
    } finally {
      loading.value = false
    }
  }

  return {
    guild,
    loading,
    error,
    hasGuild,
    setGuild,
    clearGuild,
    fetchGuild,
  }
}, {
  persist: {
    pick: ['guild'],
  },
})
