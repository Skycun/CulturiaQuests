import { defineStore } from 'pinia'
import type { Guild } from '~/types/guild'

export const useGuildStore = defineStore('guild', () => {
  // State
  const guild = ref<Guild | null>(null)

  // Actions
  function setGuild(data: Guild) {
    guild.value = data
  }

  function getGuild(): Guild | null {
    return guild.value
  }

  /**
   * Fetches the guild data for the current authenticated user
   */
  async function fetchGuild() {
    const client = useStrapiClient()
    
    try {
      // Using the custom endpoint /guilds/me
      const response = await client<any>('/guilds/me', {
        method: 'GET',
      })
      
      // Strapi custom controllers usually return { data: ... } or just the object depending on serialization
      // Using standard Strapi response structure handling
      const guildData = response.data || response

      if (guildData) {
        setGuild(guildData)
      }
    } catch (error) {
      console.error('Failed to fetch guild:', error)
    }
  }

  return {
    guild,
    setGuild,
    getGuild,
    fetchGuild,
  }
}, {
  persist: true,
})
