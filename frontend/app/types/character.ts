import type { Guild } from './guild'
import type { Item } from './item'

export interface CharacterAttributes {
  firstname: string
  lastname: string
  job: 'hero' | 'mage' | 'archer' | 'soldier'
  guild?: { data: Guild }
  items?: { data: Item[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Character {
  id: number
  documentId: string
  attributes?: CharacterAttributes
  // Flattened
  firstname?: string
  lastname?: string
  job?: 'hero' | 'mage' | 'archer' | 'soldier'
}
