import type { Item } from './item'

/**
 * Represents an item received as loot from a chest
 * Contains flattened item data from Strapi response
 */
export interface LootItem extends Pick<Item, 'documentId'> {
  name: string
  level: number
  index_damage: number
  icon?: {
    data?: { url: string }
    url?: string
  }
  rarity?: {
    data?: {
      name?: string
      attributes?: { name?: string }
    }
    name?: string
    attributes?: { name?: string }
  }
}

/**
 * Represents the complete loot received from opening a chest
 */
export interface ChestLoot {
  items: LootItem[]
  gold: number
  exp: number
}

/**
 * Rarity levels for items with their corresponding CSS classes
 */
export type RarityLevel = 'légendaire' | 'épique' | 'epique' | 'rare' | 'peu commun' | 'uncommon' | 'commun' | 'common'

/**
 * Get the rarity name from a loot item
 */
export function getRarityName(item: LootItem): string {
  const rarity = item.rarity?.data || item.rarity
  return rarity?.name || rarity?.attributes?.name || 'Commun'
}

/**
 * Get Tailwind CSS classes based on item rarity
 */
export function getRarityClasses(item: LootItem): string {
  const rarityName = getRarityName(item).toLowerCase()

  switch (rarityName) {
    case 'légendaire':
      return 'bg-gradient-to-r from-amber-900/80 to-amber-800/60 border-amber-400'
    case 'épique':
    case 'epique':
      return 'bg-gradient-to-r from-purple-900/80 to-purple-800/60 border-purple-400'
    case 'rare':
      return 'bg-gradient-to-r from-blue-900/80 to-blue-800/60 border-blue-400'
    case 'peu commun':
    case 'uncommon':
      return 'bg-gradient-to-r from-green-900/80 to-green-800/60 border-green-400'
    case 'commun':
    case 'common':
    default:
      return 'bg-gradient-to-r from-stone-800/80 to-stone-700/60 border-stone-400'
  }
}
