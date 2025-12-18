import type { Guild } from './guild'
import type { Item } from './item'
import type { StrapiMedia } from './strapi'

export interface CharacterAttributes {
  firstname: string
  lastname: string
  job: 'hero' | 'mage' | 'archer' | 'soldier'
  icon?: { data: StrapiMedia | null }
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
  icon?: StrapiMedia | null
}
