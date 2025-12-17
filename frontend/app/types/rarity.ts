import type { Item } from './item'

export interface RarityAttributes {
  name: string
  items?: { data: Item[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Rarity {
  id: number
  documentId: string
  attributes?: RarityAttributes
  // Flattened
  name?: string
}
