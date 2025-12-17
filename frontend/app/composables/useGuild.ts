import { storeToRefs } from 'pinia'
import type { CreateGuildPayload, UpdateGuildPayload } from '~/stores/guild'

/**
 * Composable pour gérer facilement la guilde dans les composants
 * Encapsule le store Pinia avec une API simplifiée
 */
export const useGuild = () => {
  const store = useGuildStore()
  const { currentGuild, guilds, loading, error } = storeToRefs(store)

  /**
   * Initialise la guilde de l'utilisateur connecté
   * Ne recharge pas si déjà présente
   */
  const initGuild = async (force = false) => {
    if (!store.hasGuild || force) {
      await store.fetchCurrentGuild()
    }
    return store.currentGuild
  }

  /**
   * Vérifie si l'utilisateur peut dépenser un montant d'or
   */
  const canSpendGold = (amount: number): boolean => {
    return store.guildGold >= amount
  }

  /**
   * Vérifie si l'utilisateur peut dépenser un montant de scrap
   */
  const canSpendScrap = (amount: number): boolean => {
    return store.guildScrap >= amount
  }

  /**
   * Formate l'expérience pour l'affichage
   */
  const formatExp = (exp?: bigint): string => {
    const value = exp ?? store.guildExp
    return value.toLocaleString()
  }

  /**
   * Formate l'or pour l'affichage
   */
  const formatGold = (gold?: number): string => {
    const value = gold ?? store.guildGold
    return value.toLocaleString()
  }

  /**
   * Formate le scrap pour l'affichage
   */
  const formatScrap = (scrap?: number): string => {
    const value = scrap ?? store.guildScrap
    return value.toLocaleString()
  }

  return {
    // State (refs réactives)
    guild: currentGuild,
    guilds,
    loading,
    error,

    // Getters (computed)
    hasGuild: computed(() => store.hasGuild),
    gold: computed(() => store.guildGold),
    exp: computed(() => store.guildExp),
    scrap: computed(() => store.guildScrap),
    name: computed(() => store.guildName),
    documentId: computed(() => store.guildDocumentId),

    // Actions du store
    initGuild,
    fetchGuild: store.fetchGuildByDocumentId,
    fetchGuildById: store.fetchGuildById,
    fetchAllGuilds: store.fetchAllGuilds,
    createGuild: (payload: CreateGuildPayload) => store.createGuild(payload),
    updateGuild: (documentId: string, payload: UpdateGuildPayload) =>
      store.updateGuild(documentId, payload),
    deleteGuild: store.deleteGuild,

    // Actions de ressources
    addGold: store.addGold,
    addScrap: store.addScrap,
    addExp: store.addExp,
    spendGold: store.spendGold,
    spendScrap: store.spendScrap,

    // Utilitaires
    canSpendGold,
    canSpendScrap,
    formatExp,
    formatGold,
    formatScrap,
    clearGuild: store.clearGuild,
    resetStore: store.$reset,
  }
}
