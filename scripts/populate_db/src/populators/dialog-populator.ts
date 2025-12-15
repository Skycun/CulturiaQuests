import { StrapiClient } from '../strapi-client.js';
import type {
  NpcEntryInput,
  NpcAttributes,
  DialogAttributes,
  DialogCreatePayload,
  PopulationResult,
  TextType,
} from '../types.js';

export class DialogPopulator {
  private client: StrapiClient;
  private dryRun: boolean;
  private verbose: boolean;
  private npcCache: Map<string, number> = new Map();

  constructor(client: StrapiClient, dryRun = false, verbose = false) {
    this.client = client;
    this.dryRun = dryRun;
    this.verbose = verbose;
  }

  /**
   * Populate dialogs from NPC entries data
   */
  async populate(entries: NpcEntryInput[]): Promise<PopulationResult> {
    const result: PopulationResult = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Prefetch all NPCs for performance
    await this.prefetchNpcs();

    for (const entry of entries) {
      const uniqueKey = `${entry.npc_name}:${entry.type}`;

      try {
        // 1. Resolve NPC ID
        const npcId = await this.resolveNpc(entry.npc_name);

        // 2. Check if dialog already exists (idempotency)
        const exists = await this.dialogExists(npcId, entry.type);
        if (exists) {
          this.log(`SKIP: ${uniqueKey} (already exists)`);
          result.skipped++;
          continue;
        }

        // 3. Transform and create
        const payload = this.transformToPayload(entry, npcId);

        if (this.dryRun) {
          this.log(`DRY-RUN: Would create dialog for ${uniqueKey}`);
          this.logVerbose(`  Payload: ${JSON.stringify(payload, null, 2)}`);
        } else {
          await this.client.create<DialogAttributes, DialogCreatePayload>('dialogs', payload);
          this.log(`CREATED: ${uniqueKey}`);
        }

        result.created++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`ERROR: ${uniqueKey} - ${errorMessage}`);
        result.errors.push({ item: uniqueKey, error: errorMessage });
      }
    }

    return result;
  }

  /**
   * Prefetch all NPCs into cache for better performance
   * Note: Strapi 5 returns flat objects, not nested in attributes
   */
  private async prefetchNpcs(): Promise<void> {
    this.logVerbose('Prefetching NPCs...');

    const response = await this.client.find<NpcAttributes>('npcs', {
      'pagination[pageSize]': 100,
    });

    for (const npc of response.data) {
      // Strapi 5: attributes are directly on the object
      const fullName = `${npc.firstname} ${npc.lastname}`;
      this.npcCache.set(fullName, npc.id);
    }

    this.logVerbose(`Cached ${this.npcCache.size} NPCs`);
  }

  /**
   * Resolve NPC name to ID
   */
  private async resolveNpc(fullName: string): Promise<number> {
    // Check cache first
    const cachedId = this.npcCache.get(fullName);
    if (cachedId !== undefined) {
      return cachedId;
    }

    // Parse name and query API
    const [firstname, ...lastnameParts] = fullName.split(' ');
    const lastname = lastnameParts.join(' ');

    const response = await this.client.find<NpcAttributes>('npcs', {
      'filters[firstname][$eq]': firstname,
      'filters[lastname][$eq]': lastname,
    });

    if (response.data.length === 0) {
      throw new Error(`NPC not found: "${fullName}"`);
    }

    // Strapi 5: attributes are directly on the object
    const npcData = response.data[0];
    const npcId = npcData.id;
    this.npcCache.set(fullName, npcId);

    return npcId;
  }

  /**
   * Check if a dialog with same NPC + text_type already exists
   */
  private async dialogExists(npcId: number, textType: TextType): Promise<boolean> {
    const response = await this.client.find<DialogAttributes>('dialogs', {
      'filters[npc][id][$eq]': npcId,
      'filters[text_type][$eq]': textType,
    });

    return response.data.length > 0;
  }

  /**
   * Transform input entry to Strapi API payload
   */
  private transformToPayload(entry: NpcEntryInput, npcId: number): DialogCreatePayload {
    return {
      data: {
        text_type: entry.type,
        dialogues: entry.entries,
        npc: {
          connect: [npcId],
        },
        publishedAt: new Date().toISOString(),
      },
    };
  }

  private log(message: string): void {
    console.log(`[DialogPopulator] ${message}`);
  }

  private logVerbose(message: string): void {
    if (this.verbose) {
      console.log(`[DialogPopulator] ${message}`);
    }
  }
}
