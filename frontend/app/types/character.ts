import type { Guild } from './guild'
import type { Item } from './item'
import type { StrapiMedia } from './strapi'

export interface CharacterAttributes {
  firstname: string
  lastname: string
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
  icon?: StrapiMedia | null
}

// Type for form data when creating/editing characters
export interface CharacterFormData {
  firstname: string
  lastname: string
  iconId?: number | null
}
