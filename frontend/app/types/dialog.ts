import type { Npc } from './npc'

export interface DialogAttributes {
  text_type: 'quest_description' | 'expedition_appear' | 'expedition_fail' | 'quest_complete' | 'journal_entries'
  dialogues: any // JSON
  npc?: { data: Npc }
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Dialog {
  id: number
  documentId: string
  attributes?: DialogAttributes
  // Flattened
  text_type?: 'quest_description' | 'expedition_appear' | 'expedition_fail' | 'quest_complete' | 'journal_entries'
  dialogues?: any
}
