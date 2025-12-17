import { defineStore } from 'pinia'
import type { Guild, GuildAttributes } from '~/types/guild'

// Interface pour le state du store
interface GuildState {
  currentGuild: Guild | null
  guilds: Guild[]
  loading: boolean
  error: string | null
}

// Payloads pour les opérations CRUD
export interface CreateGuildPayload {
  name: string
  gold?: number
  exp?: string
  scrap?: number
}

export interface UpdateGuildPayload {
  name?: string
  gold?: number
  exp?: string
  scrap?: number
}

export const useGuildStore = defineStore('guild', {
  state: (): GuildState => ({
    currentGuild: null,
    guilds: [],
    loading: false,
    error: null,
  }),

  getters: {
    // Vérifie si une guilde est chargée
    hasGuild: (state): boolean => state.currentGuild !== null,

    // Récupère l'or de la guilde
    guildGold: (state): number => {
      if (!state.currentGuild) return 0
      return state.currentGuild.gold ?? state.currentGuild.attributes?.gold ?? 0
    },

    // Récupère l'expérience de la guilde (BigInt)
    guildExp: (state): bigint => {
      if (!state.currentGuild) return BigInt(0)
      const exp = state.currentGuild.exp ?? state.currentGuild.attributes?.exp ?? '0'
      return BigInt(exp)
    },

    // Récupère le scrap de la guilde
    guildScrap: (state): number => {
      if (!state.currentGuild) return 0
      return state.currentGuild.scrap ?? state.currentGuild.attributes?.scrap ?? 0
    },

    // Récupère le nom de la guilde
    guildName: (state): string => {
      if (!state.currentGuild) return ''
      return state.currentGuild.name ?? state.currentGuild.attributes?.name ?? ''
    },

    // Récupère le documentId de la guilde
    guildDocumentId: (state): string | null => {
      return state.currentGuild?.documentId ?? null
    },
  },

  actions: {
    /**
     * Récupère la guilde de l'utilisateur connecté
     */
    async fetchCurrentGuild() {
      const client = useStrapiClient()
      const user = useStrapiUser()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild[] }>('/guilds', {
          method: 'GET',
          params: {
            populate: '*',
            'filters[user][id][$eq]': user.value?.id,
          },
        })

        if (response.data && response.data.length > 0) {
          this.currentGuild = response.data[0]
        }

        return this.currentGuild
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Erreur lors du chargement de la guilde'
        console.error('Erreur fetchCurrentGuild:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère une guilde par son ID
     */
    async fetchGuildById(id: number) {
      const client = useStrapiClient()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild }>(`/guilds/${id}`, {
          method: 'GET',
          params: { populate: '*' },
        })

        this.currentGuild = response.data
        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Guilde non trouvée'
        console.error('Erreur fetchGuildById:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère une guilde par son documentId
     */
    async fetchGuildByDocumentId(documentId: string) {
      const client = useStrapiClient()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild }>(`/guilds/${documentId}`, {
          method: 'GET',
          params: { populate: '*' },
        })

        this.currentGuild = response.data
        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Guilde non trouvée'
        console.error('Erreur fetchGuildByDocumentId:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Récupère toutes les guildes
     */
    async fetchAllGuilds() {
      const client = useStrapiClient()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild[] }>('/guilds', {
          method: 'GET',
          params: { populate: '*' },
        })

        this.guilds = response.data ?? []
        return this.guilds
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Erreur lors du chargement des guildes'
        console.error('Erreur fetchAllGuilds:', error)
        return []
      } finally {
        this.loading = false
      }
    },

    /**
     * Crée une nouvelle guilde
     */
    async createGuild(payload: CreateGuildPayload) {
      const client = useStrapiClient()
      const user = useStrapiUser()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild }>('/guilds', {
          method: 'POST',
          body: {
            data: {
              ...payload,
              user: user.value?.id,
            },
          },
        })

        this.currentGuild = response.data
        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Erreur lors de la création de la guilde'
        console.error('Erreur createGuild:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Met à jour une guilde par son documentId
     */
    async updateGuild(documentId: string, payload: UpdateGuildPayload) {
      const client = useStrapiClient()

      this.loading = true
      this.error = null

      try {
        const response = await client<{ data: Guild }>(`/guilds/${documentId}`, {
          method: 'PUT',
          body: { data: payload },
        })

        // Met à jour le state local si c'est la guilde courante
        if (this.currentGuild?.documentId === documentId) {
          this.currentGuild = response.data
        }

        return response.data
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
        console.error('Erreur updateGuild:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    /**
     * Supprime une guilde par son documentId
     */
    async deleteGuild(documentId: string) {
      const client = useStrapiClient()

      this.loading = true
      this.error = null

      try {
        await client(`/guilds/${documentId}`, {
          method: 'DELETE',
        })

        // Nettoie le state si c'est la guilde courante
        if (this.currentGuild?.documentId === documentId) {
          this.currentGuild = null
        }

        // Retire de la liste des guildes
        this.guilds = this.guilds.filter((g) => g.documentId !== documentId)

        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Erreur lors de la suppression'
        console.error('Erreur deleteGuild:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    /**
     * Ajoute de l'or à la guilde courante
     */
    async addGold(amount: number) {
      if (!this.currentGuild?.documentId) {
        this.error = 'Aucune guilde sélectionnée'
        return null
      }

      const currentGold = this.guildGold
      const newGold = Math.max(0, currentGold + amount)

      return this.updateGuild(this.currentGuild.documentId, { gold: newGold })
    },

    /**
     * Ajoute du scrap à la guilde courante
     */
    async addScrap(amount: number) {
      if (!this.currentGuild?.documentId) {
        this.error = 'Aucune guilde sélectionnée'
        return null
      }

      const currentScrap = this.guildScrap
      const newScrap = Math.max(0, currentScrap + amount)

      return this.updateGuild(this.currentGuild.documentId, { scrap: newScrap })
    },

    /**
     * Ajoute de l'expérience à la guilde courante
     */
    async addExp(amount: bigint | number) {
      if (!this.currentGuild?.documentId) {
        this.error = 'Aucune guilde sélectionnée'
        return null
      }

      const currentExp = this.guildExp
      const newExp = (currentExp + BigInt(amount)).toString()

      return this.updateGuild(this.currentGuild.documentId, { exp: newExp })
    },

    /**
     * Dépense de l'or de la guilde courante
     */
    async spendGold(amount: number): Promise<boolean> {
      if (!this.currentGuild?.documentId) {
        this.error = 'Aucune guilde sélectionnée'
        return false
      }

      const currentGold = this.guildGold
      if (currentGold < amount) {
        this.error = 'Or insuffisant'
        return false
      }

      const result = await this.updateGuild(this.currentGuild.documentId, {
        gold: currentGold - amount,
      })

      return result !== null
    },

    /**
     * Dépense du scrap de la guilde courante
     */
    async spendScrap(amount: number): Promise<boolean> {
      if (!this.currentGuild?.documentId) {
        this.error = 'Aucune guilde sélectionnée'
        return false
      }

      const currentScrap = this.guildScrap
      if (currentScrap < amount) {
        this.error = 'Scrap insuffisant'
        return false
      }

      const result = await this.updateGuild(this.currentGuild.documentId, {
        scrap: currentScrap - amount,
      })

      return result !== null
    },

    /**
     * Réinitialise le state de la guilde
     */
    clearGuild() {
      this.currentGuild = null
      this.error = null
    },

    /**
     * Réinitialise complètement le store
     */
    $reset() {
      this.currentGuild = null
      this.guilds = []
      this.loading = false
      this.error = null
    },
  },
})
