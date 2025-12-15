import { z } from 'zod';

// ============================================
// Input Schemas (JSON file validation)
// ============================================

export const TextTypeEnum = z.enum([
  'quest_description',
  'expedition_appear',
  'expedition_fail',
  'quest_complete',
  'journal_entries',
]);

export type TextType = z.infer<typeof TextTypeEnum>;

export const NpcEntrySchema = z.object({
  npc_name: z.string().min(1, 'NPC name is required'),
  type: TextTypeEnum,
  entries: z.array(z.string()).min(1, 'At least one entry is required'),
});

export type NpcEntryInput = z.infer<typeof NpcEntrySchema>;

export const NpcEntriesArraySchema = z.array(NpcEntrySchema);

export const NpcCreateInputSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  pronouns: z.string().min(1),
  quests_entry_available: z.number().default(0),
  expedition_entry_available: z.number().default(0),
});

export type NpcCreateInput = z.infer<typeof NpcCreateInputSchema>;

export const NpcCreateInputArraySchema = z.array(NpcCreateInputSchema);

// ============================================
// Strapi API Types
// ============================================

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export type StrapiEntity<T> = T & {
  id: number;
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
};

export interface NpcAttributes {
  firstname: string;
  lastname: string;
  pronouns: string;
  quests_entry_available: number;
  expedition_entry_available: number;
}

export interface DialogAttributes {
  text_type: TextType;
  dialogues: string[];
  npc?: StrapiEntity<NpcAttributes> | null;
}

// ============================================
// Strapi API Payloads
// ============================================

export interface DialogCreatePayload {
  data: {
    text_type: TextType;
    dialogues: string[];
    npc: {
      connect: number[];
    };
    publishedAt: string;
  };
}

export interface NpcCreatePayload {
  data: {
    firstname: string;
    lastname: string;
    pronouns: string;
    quests_entry_available: number;
    expedition_entry_available: number;
    publishedAt: string;
  };
}

// ============================================
// Script Types
// ============================================

export interface PopulationResult {
  created: number;
  skipped: number;
  errors: Array<{ item: string; error: string }>;
}

export interface CLIOptions {
  type: string;
  input: string;
  dryRun: boolean;
  verbose: boolean;
}

export interface StrapiClientConfig {
  baseUrl: string;
  apiToken: string;
  timeout?: number;
}
