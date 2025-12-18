import { defineStore } from 'pinia'
import type { Friendship } from '~/types/friendship'

export const useFriendshipStore = defineStore('friendship', () => {
  // State
  const friendships = ref<Friendship[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasFriendships = computed(() => friendships.value.length > 0)
  const friendshipCount = computed(() => friendships.value.length)

  const getFriendshipByNpc = computed(() => {
    return (npcId: number) => {
      return friendships.value.find(f => {
        const npc = f.npc || f.attributes?.npc
        const npcIdToCheck = npc?.id || npc?.data?.id
        return npcIdToCheck === npcId
      }) || null
    }
  })

  const totalQuestsUnlocked = computed(() => {
    return friendships.value.reduce((sum, f) => {
      const unlocked = f.quests_entry_unlocked ?? f.attributes?.quests_entry_unlocked ?? 0
      return sum + unlocked
    }, 0)
  })

  const totalExpeditionsUnlocked = computed(() => {
    return friendships.value.reduce((sum, f) => {
      const unlocked = f.expedition_entry_unlocked ?? f.attributes?.expedition_entry_unlocked ?? 0
      return sum + unlocked
    }, 0)
  })

  // Actions
  function setFriendships(data: Friendship[]) {
    friendships.value = data
  }

  function clearFriendships() {
    friendships.value = []
    error.value = null
  }

  function addFriendship(friendship: Friendship) {
    friendships.value.push(friendship)
  }

  function updateFriendship(friendshipId: number, updates: Partial<Friendship>) {
    const index = friendships.value.findIndex(f => f.id === friendshipId)
    if (index !== -1) {
      friendships.value[index] = { ...friendships.value[index], ...updates }
    }
  }

  async function fetchFriendships() {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const response = await client<any>('/friendships', {
        method: 'GET',
        params: {
          populate: ['npc'],
        },
      })

      const data = response.data || response
      setFriendships(Array.isArray(data) ? data : [])
    } catch (e: any) {
      console.error('Failed to fetch friendships:', e)
      error.value = e?.message || 'Failed to fetch friendships'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    friendships,
    loading,
    error,
    // Getters
    hasFriendships,
    friendshipCount,
    getFriendshipByNpc,
    totalQuestsUnlocked,
    totalExpeditionsUnlocked,
    // Actions
    setFriendships,
    clearFriendships,
    addFriendship,
    updateFriendship,
    fetchFriendships,
  }
}, {
  persist: {
    pick: ['friendships'],
  },
})
