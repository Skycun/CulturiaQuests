import type { Npc } from './npc'
import type { Guild } from './guild'

export interface FriendshipAttributes {
  quests_entry_unlocked: number
  expedition_entry_unlocked: number
  npc?: { data: Npc }
  guild?: { data: Guild }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Friendship {
  id: number
  documentId: string
  attributes?: FriendshipAttributes
  // Flattened
  quests_entry_unlocked?: number
  expedition_entry_unlocked?: number
  npc?: Npc | { data: Npc }
}

/**
 * Format normalisé d'une Friendship
 * Ce format unifié élimine les variations Strapi v4/v5
 */
export interface NormalizedFriendship {
  id: number
  documentId: string
  quests_entry_unlocked: number
  expedition_entry_unlocked: number
  npcId: number | null
  npcDocumentId: string | null  // Plus stable que npcId
  npc?: Npc
  createdAt?: string
  updatedAt?: string
}
