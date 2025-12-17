import type { Guild } from './guild'
import type { Poi } from './poi'
import type { Item } from './item'

export interface VisitAttributes {
  open_count: number
  last_opened_at?: string
  total_gold_earned: number
  total_exp_earned: number
  guild?: { data: Guild }
  poi?: { data: Poi }
  items?: { data: Item[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Visit {
  id: number
  documentId: string
  attributes?: VisitAttributes
  // Flattened
  open_count?: number
  last_opened_at?: string
  total_gold_earned?: number
  total_exp_earned?: number
}
