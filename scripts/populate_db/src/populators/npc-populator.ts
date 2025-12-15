import { StrapiClient } from '../strapi-client.js';
import type {
  NpcCreateInput,
  NpcAttributes,
  NpcCreatePayload,
  PopulationResult,
} from '../types.js';

export class NpcPopulator {
  private client: StrapiClient;
  private dryRun: boolean;
  private verbose: boolean;

  constructor(client: StrapiClient, dryRun = false, verbose = false) {
    this.client = client;
    this.dryRun = dryRun;
    this.verbose = verbose;
  }

  async populate(entries: NpcCreateInput[]): Promise<PopulationResult> {
    const result: PopulationResult = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (const entry of entries) {
      const uniqueKey = `${entry.firstname} ${entry.lastname}`;

      try {
        // 1. Check if exists
        const exists = await this.npcExists(entry.firstname, entry.lastname);
        if (exists) {
          this.logVerbose(`SKIP: ${uniqueKey} (already exists)`);
          result.skipped++;
          continue;
        }

        // 2. Transform and create
        const payload = this.transformToPayload(entry);

        if (this.dryRun) {
          this.log(`DRY-RUN: Would create NPC ${uniqueKey}`);
        } else {
          await this.client.create<NpcAttributes, NpcCreatePayload>('npcs', payload);
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

  private async npcExists(firstname: string, lastname: string): Promise<boolean> {
    const response = await this.client.find<NpcAttributes>('npcs', {
      'filters[firstname][$eq]': firstname,
      'filters[lastname][$eq]': lastname,
    });

    return response.data.length > 0;
  }

  private transformToPayload(entry: NpcCreateInput): NpcCreatePayload {
    return {
      data: {
        firstname: entry.firstname,
        lastname: entry.lastname,
        pronouns: entry.pronouns,
        quests_entry_available: entry.quests_entry_available,
        expedition_entry_available: entry.expedition_entry_available,
        publishedAt: new Date().toISOString(),
      },
    };
  }

  private log(message: string): void {
    console.log(`[NpcPopulator] ${message}`);
  }

  private logVerbose(message: string): void {
    if (this.verbose) {
      console.log(`[NpcPopulator] ${message}`);
    }
  }
}
