import type { Guild } from './guild'
import type { Npc } from './npc'
import type { Poi } from './poi'

export interface QuestAttributes {
  is_poi_a_completed: boolean
  is_poi_b_completed: boolean
  date_start: string
  date_end?: string
  gold_earned: number
  xp_earned: number
  guild?: { data: Guild }
  npc?: { data: Npc }
  poi_a?: { data: Poi }
  poi_b?: { data: Poi }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Quest {
  id: number
  documentId: string
  attributes?: QuestAttributes
  // Flattened
  is_poi_a_completed?: boolean
  is_poi_b_completed?: boolean
  date_start?: string
  date_end?: string
  gold_earned?: number
  xp_earned?: number
}
