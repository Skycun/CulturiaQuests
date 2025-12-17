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
}
