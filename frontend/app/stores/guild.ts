import { defineStore } from 'pinia'
import type { Guild } from '~/types/guild'
import { useCharacterStore } from './character'
import { useInventoryStore } from './inventory'
import { useQuestStore } from './quest'
import { useVisitStore } from './visit'
import { useRunStore } from './run'
import { useFriendshipStore } from './friendship'

export const useGuildStore = defineStore('guild', () => {
  // State
  const guild = ref<Guild | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasGuild = computed(() => guild.value !== null)

  const gold = computed(() => guild.value?.gold ?? guild.value?.attributes?.gold ?? 0)
  const exp = computed(() => guild.value?.exp ?? guild.value?.attributes?.exp ?? 0)
  const scrap = computed(() => guild.value?.scrap ?? guild.value?.attributes?.scrap ?? 0)
  const name = computed(() => guild.value?.name ?? guild.value?.attributes?.name ?? '')

  /**
   * Calcule le niveau de la guilde à partir de l'XP
   * Formule : XP_total = 75 × Niveau²
   * Donc : Niveau = √(XP_total / 75) + 1
   * Le niveau minimum est 1 (avec 0 XP)
   */
  const level = computed(() => {
    const currentExp = exp.value
    return Math.floor(Math.sqrt(currentExp / 75)) + 1
  })

  // Actions
  function setGuild(data: Guild) {
    guild.value = data
  }

  function clearGuild() {
    guild.value = null
    error.value = null
  }

  /**
   * Clears all stores (for logout)
   */
  function clearAll() {
    clearGuild()
    useCharacterStore().clearCharacters()
    useInventoryStore().clearItems()
    useQuestStore().clearQuests()
    useVisitStore().clearVisits()
    useRunStore().clearRuns()
    useFriendshipStore().clearFriendships()
  }

  /**
   * Fetches the guild data for the current authenticated user (basic info only)
   */
  async function fetchGuild() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/guilds', {
        method: 'GET',
      })

      // The controller filters by user, so we get an array with 0 or 1 guild
      const guilds = response.data || response
      const guildData = Array.isArray(guilds) ? guilds[0] : guilds

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

  /**
   * Fetches the guild with all related data and hydrates all stores
   */
  async function fetchAll() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/guilds', {
        method: 'GET',
        params: {
          populate: {
            characters: {
              populate: {
                icon: { fields: ['url'] },
              },
            },
            items: {
              populate: {
                rarity: true,
                tags: true,
                character: true,
                icon: { fields: ['url'] },
              },
            },
            quests: {
              populate: ['npc', 'poi_a', 'poi_b'],
            },
            visits: {
              populate: ['poi', 'items'],
            },
            runs: {
              populate: ['museum', 'npc', 'items'],
            },
            friendships: {
              populate: ['npc'],
            },
          },
        },
      })

      // The controller filters by user, so we get an array with 0 or 1 guild
      const guilds = response.data || response
      const guildData = Array.isArray(guilds) ? guilds[0] : guilds

      if (guildData) {
        // Set guild basic info
        setGuild(guildData)

        // Hydrate other stores with related data
        const characters = guildData.characters?.data || guildData.characters || []
        const items = guildData.items?.data || guildData.items || []
        const quests = guildData.quests?.data || guildData.quests || []
        const visits = guildData.visits?.data || guildData.visits || []
        const runs = guildData.runs?.data || guildData.runs || []
        const friendships = guildData.friendships?.data || guildData.friendships || []

        useCharacterStore().setCharacters(Array.isArray(characters) ? characters : [])
        useInventoryStore().setItems(Array.isArray(items) ? items : [])
        useQuestStore().setQuests(Array.isArray(quests) ? quests : [])
        useVisitStore().setVisits(Array.isArray(visits) ? visits : [])
        useRunStore().setRuns(Array.isArray(runs) ? runs : [])
        useFriendshipStore().setFriendships(Array.isArray(friendships) ? friendships : [])
      }
    } catch (e: any) {
      console.error('Failed to fetch all guild data:', e)
      error.value = e?.message || 'Failed to fetch guild data'
    } finally {
      loading.value = false
    }
  }

  /**
   * Refetch only the guild stats (gold, exp, scrap)
   */
  async function refetchStats() {
    const client = useStrapiClient()

    try {
      const response = await client<any>('/guilds', {
        method: 'GET',
        params: {
          fields: ['name', 'gold', 'exp', 'scrap'],
        },
      })

      const guilds = response.data || response
      const guildData = Array.isArray(guilds) ? guilds[0] : guilds

      if (guildData && guild.value) {
        guild.value = {
          ...guild.value,
          gold: guildData.gold ?? guildData.attributes?.gold,
          exp: guildData.exp ?? guildData.attributes?.exp,
          scrap: guildData.scrap ?? guildData.attributes?.scrap,
        }
      }
    } catch (e: any) {
      console.error('Failed to refetch guild stats:', e)
    }
  }

  async function createGuildSetup(payload: { guildName: string; characterName: string; iconId: number }) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null
    
    try {
      const response = await client<any>('/guilds/setup', {
        method: 'POST',
        body: payload
      })
      
      const data = response.data || response
      setGuild(data)
      // Hydrate characters if returned populated
      if (data.characters) {
          useCharacterStore().setCharacters(data.characters.data || data.characters || [])
      }
      return data
    } catch (e: any) {
      console.error('Failed to setup guild:', e)
      error.value = e?.message || 'Failed to setup guild'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    guild,
    loading,
    error,
    // Getters
    hasGuild,
    gold,
    exp,
    scrap,
    name,
    level,
    // Actions
    setGuild,
    clearGuild,
    clearAll,
    fetchGuild,
    fetchAll,
    refetchStats,
    createGuildSetup,
  }
}, {
  persist: {
    pick: ['guild'],
  },
})
