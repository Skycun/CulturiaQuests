import { defineStore } from 'pinia'
import type { Friendship, NormalizedFriendship } from '~/types/friendship'
import type { Npc } from '~/types/npc'

/**
 * Normalise une friendship reçue de l'API Strapi
 * Gère les formats v4 et v5, avec ou sans relations peuplées
 */
function normalizeFriendship(raw: any): NormalizedFriendship {
  // Extraire les données principales (gère v4 avec attributes et v5 sans)
  const data = raw.attributes || raw

  // Extraire l'ID et le documentId du NPC de toutes les structures possibles
  let npcId: number | null = null
  let npcDocumentId: string | null = null
  let npcData: Npc | null = null

  const npcField = data.npc

  if (typeof npcField === 'number') {
    // Cas 1: npc est juste un ID (relation non peuplée)
    npcId = npcField
  } else if (npcField?.data) {
    // Cas 2: npc: { data: { id: 5, attributes: {...} } } (Strapi v4 avec populate)
    const npcRaw = npcField.data
    npcId = npcRaw.id
    npcDocumentId = npcRaw.documentId
    npcData = {
      id: npcRaw.id,
      documentId: npcRaw.documentId,
      ...(npcRaw.attributes || npcRaw)
    } as Npc
  } else if (npcField?.id) {
    // Cas 3: npc: { id: 5, firstname: "Alice", ... } (Strapi v5 avec populate)
    npcId = npcField.id
    npcDocumentId = npcField.documentId
    npcData = npcField as Npc
  }

  // Retourner un format unique et prévisible
  return {
    id: raw.id,
    documentId: raw.documentId || data.documentId,
    quests_entry_unlocked: data.quests_entry_unlocked || 0,
    expedition_entry_unlocked: data.expedition_entry_unlocked || 0,
    npcId,
    npcDocumentId,
    npc: npcData || undefined,
    createdAt: data.createdAt || raw.createdAt,
    updatedAt: data.updatedAt || raw.updatedAt,
  }
}

export const useFriendshipStore = defineStore('friendship', () => {
  // State
  const friendships = ref<NormalizedFriendship[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasFriendships = computed(() => friendships.value.length > 0)
  const friendshipCount = computed(() => friendships.value.length)

  /**
   * Trouve une friendship par l'ID numérique du NPC
   * ⚠️ Préférez getFriendshipByNpcDocumentId pour plus de stabilité
   */
  const getFriendshipByNpc = computed(() => {
    return (npcId: number) => {
      return friendships.value.find(f => f.npcId === npcId) || null
    }
  })

  /**
   * Trouve une friendship par le documentId du NPC
   * Plus stable que l'ID numérique entre environnements
   */
  const getFriendshipByNpcDocumentId = computed(() => {
    return (npcDocumentId: string) => {
      return friendships.value.find(f => f.npcDocumentId === npcDocumentId) || null
    }
  })

  /**
   * Total des quêtes débloquées sur toutes les friendships
   */
  const totalQuestsUnlocked = computed(() => {
    return friendships.value.reduce((sum, f) => sum + f.quests_entry_unlocked, 0)
  })

  /**
   * Total des expéditions débloquées sur toutes les friendships
   */
  const totalExpeditionsUnlocked = computed(() => {
    return friendships.value.reduce((sum, f) => sum + f.expedition_entry_unlocked, 0)
  })

  // Actions
  /**
   * Définit les friendships (normalise les données à l'entrée)
   */
  function setFriendships(data: any[]) {
    friendships.value = data.map(normalizeFriendship)
  }

  /**
   * Efface toutes les friendships
   */
  function clearFriendships() {
    friendships.value = []
    error.value = null
  }

  /**
   * Ajoute une friendship (normalise les données)
   */
  function addFriendship(friendship: any) {
    friendships.value.push(normalizeFriendship(friendship))
  }

  /**
   * Met à jour une friendship existante
   */
  function updateFriendship(friendshipId: number, updates: Partial<NormalizedFriendship>) {
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
    getFriendshipByNpcDocumentId,
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
