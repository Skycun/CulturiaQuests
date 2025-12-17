import type { Item } from './item'
import type { Museum } from './museum'

export interface TagAttributes {
  name: string
  items?: { data: Item[] }
  museums?: { data: Museum[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Tag {
  id: number
  documentId: string
  attributes?: TagAttributes
  // Flattened
  name?: string
}
