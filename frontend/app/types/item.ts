import type { Rarity } from './rarity'
import type { Guild } from './guild'
import type { Character } from './character'
import type { Tag } from './tag'
import type { Run } from './run'
import type { Visit } from './visit'

export interface ItemAttributes {
  name: string
  level: number
  index_damage: number
  slot: 'weapon' | 'helmet' | 'charm'
  isScrapped: boolean
  rarity?: { data: Rarity }
  guild?: { data: Guild }
  character?: { data: Character }
  tags?: { data: Tag[] }
  runs?: { data: Run[] }
  visits?: { data: Visit[] }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Item {
  id: number
  documentId: string
  attributes?: ItemAttributes
  // Flattened
  name?: string
  level?: number
  index_damage?: number
  slot?: 'weapon' | 'helmet' | 'charm'
  isScrapped?: boolean
}
