import type { Guild } from './guild'
import type { Museum } from './museum'
import type { Npc } from './npc'
import type { Item } from './item'

export interface RunAttributes {
  dps: number
  date_start: string
  date_end?: string
  gold_earned: number
  xp_earned: number
  threshold_reached: number
  target_threshold?: number
  entry_unlocked?: boolean
  guild?: { data: Guild }
  museum?: { data: Museum }
  npc?: { data: Npc }
  items?: { data: Item[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Run {
  id: number
  documentId: string
  attributes?: RunAttributes
  // Flattened
  dps?: number
  date_start?: string
  date_end?: string
  gold_earned?: number
  xp_earned?: number
  threshold_reached?: number
  target_threshold?: number
  entry_unlocked?: boolean
}
