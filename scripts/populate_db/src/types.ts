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

export const PronounEnum = z.enum(['he', 'she', 'they']);
export type PronounType = z.infer<typeof PronounEnum>;

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
  pronouns: PronounEnum,
  quests_entry_available: z.number().default(0),
  expedition_entry_available: z.number().default(0),
});

export type NpcCreateInput = z.infer<typeof NpcCreateInputSchema>;

export const NpcCreateInputArraySchema = z.array(NpcCreateInputSchema);

export const PoiInputSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  type: z.string(),
  categories: z.array(z.string()).optional().nullable(),
  rating: z.number().optional().nullable(),
  accessType: z.string().optional().nullable(),
  radiusMeters: z.number().optional().nullable(),
  openingHours: z.array(z.string()).optional().nullable(),
});

export type PoiInput = z.infer<typeof PoiInputSchema>;
export const PoiInputArraySchema = z.array(PoiInputSchema);

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
  pronouns: PronounType;
  quests_entry_available: number;
  expedition_entry_available: number;
}

export interface DialogAttributes {
  text_type: TextType;
  dialogues: string[];
  npc?: StrapiEntity<NpcAttributes> | null;
}

export interface LocationInput {
  lat: number;
  lng: number;
}

export interface TagAttributes {
  name: string;
}

export interface MuseumAttributes {
  name: string;
  lat: number;
  lng: number;
  geohash?: string;
  radius?: number;
  location?: LocationInput | GeoJsonPoint;
  tags?: {
    data: StrapiEntity<TagAttributes>[];
  };
}

export interface PoiAttributes {
  name: string;
  lat: number;
  lng: number;
  geohash?: string;
  location?: LocationInput | GeoJsonPoint;
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
    pronouns: PronounType;
    quests_entry_available: number;
    expedition_entry_available: number;
    publishedAt: string;
  };
}

export interface MuseumCreatePayload {
  data: {
    name: string;
    lat: number;
    lng: number;
    location: LocationInput;
    radius?: number;
    tags?: {
      connect: number[];
    };
    publishedAt: string;
  };
}

export interface TagCreatePayload {
  data: {
    name: string;
    publishedAt: string;
  };
}

export interface PoiCreatePayload {
  data: {
    name: string;
    lat: number;
    lng: number;
    location: LocationInput;
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
