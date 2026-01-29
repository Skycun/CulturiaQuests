import { defineStore } from 'pinia'
import type { Npc } from '~/types/npc'
import type { StrapiListResponse, StrapiSingleResponse } from '~/types/strapi'
import { useFriendshipStore } from './friendship'

export const useNpcStore = defineStore('npc', () => {
  // State
  const npcs = ref<Npc[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const storiesSortMethod = ref<'alpha' | 'entries'>('alpha')

  // Getters
  const hasNpcs = computed(() => npcs.value.length > 0)
  const npcCount = computed(() => npcs.value.length)

  const getNpcById = computed(() => {
    return (id: number) => npcs.value.find(n => n.id === id)
  })

  const getNpcByDocumentId = computed(() => {
    return (documentId: string) => npcs.value.find(n => n.documentId === documentId)
  })

  /**
   * Vérifie si un NPC a été découvert par le joueur
   * Un NPC est découvert si le joueur a une friendship avec ce NPC
   * et que le total des entries unlocked est > 0
   */
  const isNpcDiscovered = computed(() => {
    return (npcId: number) => {
      // Trouver le NPC pour obtenir son documentId
      const npc = getNpcById.value(npcId)
      if (!npc) {
        return false
      }

      const friendshipStore = useFriendshipStore()
      // Utiliser documentId pour matcher (plus stable que l'ID numérique)
      const friendship = friendshipStore.getFriendshipByNpcDocumentId(npc.documentId)

      if (!friendship) {
        return false
      }

      // Les friendships sont normalisées, accès direct aux propriétés
      const totalUnlocked = friendship.quests_entry_unlocked + friendship.expedition_entry_unlocked

      return totalUnlocked > 0
    }
  })

  /**
   * Retourne la liste des NPCs découverts par le joueur
   */
  const discoveredNpcs = computed(() => {
    return npcs.value.filter(npc => isNpcDiscovered.value(npc.id))
  })

  /**
   * Retourne la liste des NPCs non découverts par le joueur
   */
  const undiscoveredNpcs = computed(() => {
    return npcs.value.filter(npc => !isNpcDiscovered.value(npc.id))
  })

  /**
   * Compte le nombre de NPCs découverts
   */
  const discoveredCount = computed(() => discoveredNpcs.value.length)

  /**
   * Compte le nombre de NPCs non découverts
   */
  const undiscoveredCount = computed(() => undiscoveredNpcs.value.length)

  /**
   * Obtient les informations de friendship pour un NPC spécifique
   * Utilise documentId pour matcher (plus stable que l'ID numérique)
   */
  const getNpcFriendshipInfo = computed(() => {
    return (npcId: number) => {
      // Trouver le NPC pour obtenir son documentId
      const npc = getNpcById.value(npcId)
      if (!npc) {
        return {
          discovered: false,
          questsUnlocked: 0,
          expeditionsUnlocked: 0,
          totalUnlocked: 0,
        }
      }

      const friendshipStore = useFriendshipStore()
      // Utiliser documentId pour matcher
      const friendship = friendshipStore.getFriendshipByNpcDocumentId(npc.documentId)

      if (!friendship) {
        return {
          discovered: false,
          questsUnlocked: 0,
          expeditionsUnlocked: 0,
          totalUnlocked: 0,
        }
      }

      // Les friendships sont normalisées, accès direct aux propriétés
      const totalUnlocked = friendship.quests_entry_unlocked + friendship.expedition_entry_unlocked

      return {
        discovered: totalUnlocked > 0,
        questsUnlocked: friendship.quests_entry_unlocked,
        expeditionsUnlocked: friendship.expedition_entry_unlocked,
        totalUnlocked,
        friendship,
      }
    }
  })

  /**
   * Retourne la liste complète des journaux formatés et triés pour l'affichage
   */
  const sortedJournals = computed(() => {
    if (!hasNpcs.value) return []

    const journals = npcs.value.map((npcObj) => {
      // Gestion Strapi v4/v5 (attributes ou direct)
      const npc = npcObj
      const npcId = npcObj.id

      // Récupérer les infos de friendship via le helper existant
      const friendshipInfo = getNpcFriendshipInfo.value(npcId)

      // Calcul du niveau max
      const maxEntries = (npc.quests_entry_available || 0)
                          + (npc.expedition_entry_available || 0)
      const finalMax = maxEntries > 0 ? maxEntries : 4

      // Formatage du nom et de l'image
      const firstName = npc.firstname || 'Inconnu'
      const lastName = npc.lastname || ''
      const realName = `${firstName} ${lastName}`.trim()
      
      // Logique d'image (internalisée ici)
      const safeName = firstName.trim()
      const realImage = (firstName === 'Inconnu' || !firstName) 
        ? '/assets/default-avatar.png' 
        : `/assets/npc/${safeName}/${safeName}.png`

      return {
        id: npcId,
        friendshipId: friendshipInfo.friendship?.id,
        name: friendshipInfo.discovered ? realName : '???',
        level: friendshipInfo.totalUnlocked,
        maxLevel: finalMax,
        image: realImage,
        isUnknown: !friendshipInfo.discovered,
      }
    })

    // Séparation Découverts / Inconnus
    const unlocked = journals.filter(j => !j.isUnknown)
    const locked = journals.filter(j => j.isUnknown)

    // Application du tri
    if (storiesSortMethod.value === 'alpha') {
      unlocked.sort((a, b) => a.name.localeCompare(b.name))
    }
    else {
      unlocked.sort((a, b) => b.level - a.level)
    }

    // Les inconnus sont toujours à la fin
    return [...unlocked, ...locked]
  })

  // Actions
  function setNpcs(data: Npc[]) {
    npcs.value = data
  }

  function clearNpcs() {
    npcs.value = []
    error.value = null
  }

  function toggleSortMethod() {
    storiesSortMethod.value = storiesSortMethod.value === 'alpha' ? 'entries' : 'alpha'
  }

  /**
   * Fetch tous les NPCs avec leurs relations optionnelles
   * @param withRelations - Inclure les relations (friendships, quests, dialogs, runs)
   */
  async function fetchNpcs(withRelations: boolean = false) {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const populateConfig: Record<string, unknown> = {}

      if (withRelations) {
        populateConfig.friendships = { populate: ['guild'] }
        populateConfig.quests = true
        populateConfig.dialogs = true
        populateConfig.runs = true
      }

      const response = await client<StrapiListResponse<Npc>>('/npcs', {
        method: 'GET',
        params: Object.keys(populateConfig).length > 0 ? {
          populate: populateConfig,
        } : {},
      })

      const data = response.data || response
      setNpcs(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      console.error('Failed to fetch NPCs:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch NPCs'
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch un NPC spécifique par son documentId
   * @param documentId - L'identifiant du document NPC
   * @param withRelations - Inclure les relations
   */
  async function fetchNpcByDocumentId(documentId: string, withRelations: boolean = false): Promise<Npc | null> {
    const client = useStrapiClient()
    loading.value = true
    error.value = null

    try {
      const populateConfig: Record<string, unknown> = {}

      if (withRelations) {
        populateConfig.friendships = { populate: ['guild'] }
        populateConfig.quests = true
        populateConfig.dialogs = true
        populateConfig.runs = true
      }

      const response = await client<StrapiSingleResponse<Npc>>(`/npcs/${documentId}`, {
        method: 'GET',
        params: Object.keys(populateConfig).length > 0 ? {
          populate: populateConfig,
        } : {},
      })

      const data = response.data || response
      return data
    } catch (e: unknown) {
      console.error(`Failed to fetch NPC ${documentId}:`, e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch NPC'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    npcs,
    loading,
    error,
    storiesSortMethod,
    // Getters
    hasNpcs,
    npcCount,
    getNpcById,
    getNpcByDocumentId,
    isNpcDiscovered,
    discoveredNpcs,
    undiscoveredNpcs,
    discoveredCount,
    undiscoveredCount,
    getNpcFriendshipInfo,
    sortedJournals,
    // Actions
    setNpcs,
    clearNpcs,
    toggleSortMethod,
    fetchNpcs,
    fetchNpcByDocumentId,
  }
}, {
  persist: {
    // Seule la préférence de tri est persistée (~10 bytes)
    // La liste des NPCs n'est plus persistée car elle est rechargée via API
    // et causait l'erreur 431 avec ses données volumineuses
    pick: ['storiesSortMethod'],
  },
})
