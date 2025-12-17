import type { Friendship } from './friendship'
import type { Quest } from './quest'
import type { Dialog } from './dialog'
import type { Run } from './run'

export interface NpcAttributes {
  firstname: string
  lastname: string
  pronouns: 'he' | 'she' | 'they'
  quests_entry_available: number
  expedition_entry_available: number
  friendships?: { data: Friendship[] }
  quests?: { data: Quest[] }
  dialogs?: { data: Dialog[] }
  runs?: { data: Run[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Npc {
  id: number
  documentId: string
  attributes?: NpcAttributes
  // Flattened
  firstname?: string
  lastname?: string
  pronouns?: 'he' | 'she' | 'they'
  quests_entry_available?: number
  expedition_entry_available?: number
}
