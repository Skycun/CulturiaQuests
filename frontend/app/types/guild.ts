import type { Character } from './character'
import type { Item } from './item'
import type { Visit } from './visit'
import type { Run } from './run'
import type { Friendship } from './friendship'
import type { Quest } from './quest'

export interface GuildAttributes {
  name: string
  gold: number
  exp: number | string // Strapi BigInteger can be string in JSON
  scrap: number
  characters?: { data: Character[] }
  items?: { data: Item[] }
  visits?: { data: Visit[] }
  runs?: { data: Run[] }
  friendships?: { data: Friendship[] }
  quests?: { data: Quest[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Guild {
  id: number
  documentId: string
  attributes?: GuildAttributes // Depends on Strapi version/normalization
  // Flattened properties for convenience if Strapi client normalizes
  name?: string
  gold?: number
  exp?: number | string
  scrap?: number
}