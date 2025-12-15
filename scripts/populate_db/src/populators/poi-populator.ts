import { StrapiClient } from '../strapi-client.js';
import type {
  PoiInput,
  MuseumAttributes,
  PoiAttributes,
  TagAttributes,
  MuseumCreatePayload,
  PoiCreatePayload,
  TagCreatePayload,
  PopulationResult,
  LocationInput,
} from '../types.js';

export class PoiPopulator {
  private client: StrapiClient;
  private dryRun: boolean;
  private verbose: boolean;
  private tagCache: Map<string, number> = new Map();

  constructor(client: StrapiClient, dryRun = false, verbose = false) {
    this.client = client;
    this.dryRun = dryRun;
    this.verbose = verbose;
  }

  async populate(entries: PoiInput[]): Promise<PopulationResult> {
    const result: PopulationResult = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Prefetch existing tags to populate cache
    await this.prefetchTags();

    for (const entry of entries) {
      const isMuseum = entry.type === 'museum';
      const collectionName = isMuseum ? 'museums' : 'pois';
      const uniqueKey = `${collectionName}:${entry.name}`;

      try {
        // 1. Check if exists
        const existingId = await this.getExistingId(collectionName, entry.name);
        if (existingId) {
          this.logVerbose(`SKIP: ${uniqueKey} (already exists)`);
          result.skipped++;
          continue;
        }

        // 2. Prepare data (Tags)
        let tagIds: number[] = [];
        if (isMuseum && entry.categories && entry.categories.length > 0) {
            tagIds = await this.resolveTags(entry.categories);
        }

        // 3. Transform and create
        const payload = this.transformToPayload(entry, tagIds);

        if (this.dryRun) {
          this.log(`DRY-RUN: Would create ${collectionName} "${entry.name}"`);
        } else {
          if (isMuseum) {
             await this.client.create<MuseumAttributes, MuseumCreatePayload>('museums', payload as MuseumCreatePayload);
          } else {
             await this.client.create<PoiAttributes, PoiCreatePayload>('pois', payload as PoiCreatePayload);
          }
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

  private async prefetchTags(): Promise<void> {
      try {
          const response = await this.client.find<TagAttributes>('tags', {
              'pagination[pageSize]': 100
          });
          for (const tag of response.data) {
              this.tagCache.set(tag.name, tag.id);
          }
      } catch (e) {
          this.logVerbose('Warning: Failed to prefetch tags or tags content type does not exist.');
      }
  }

  private async resolveTags(categories: string[]): Promise<number[]> {
      const tagIds: number[] = [];
      
      for (const category of categories) {
          if (!category) continue;
          
          // Check cache
          if (this.tagCache.has(category)) {
              tagIds.push(this.tagCache.get(category)!);
              continue;
          }

          // Create new tag if not in cache (and thus not in DB, assuming prefetch worked)
          try {
             if (this.dryRun) {
                 this.logVerbose(`DRY-RUN: Would create tag "${category}"`);
                 continue;
             }

             const payload: TagCreatePayload = {
                 data: {
                     name: category,
                     publishedAt: new Date().toISOString(),
                 }
             };

             const newTag = await this.client.create<TagAttributes, TagCreatePayload>('tags', payload);
             this.tagCache.set(category, newTag.data.id);
             tagIds.push(newTag.data.id);
             this.logVerbose(`Created new tag: ${category}`);

          } catch (error) {
              this.log(`Error creating tag "${category}": ${error}`);
          }
      }
      return tagIds;
  }

  private async getExistingId(collectionName: string, name: string): Promise<number | null> {
    const response = await this.client.find<{ name: string }>(collectionName, {
      'filters[name][$eq]': name,
    });

    if (response.data.length > 0) {
        return response.data[0].id;
    }
    return null;
  }

  private transformToPayload(entry: PoiInput, tagIds: number[]): MuseumCreatePayload | PoiCreatePayload {
    const location: LocationInput = {
      lat: entry.latitude,
      lng: entry.longitude,
    };

    const baseData = {
        name: entry.name,
        lat: entry.latitude,
        lng: entry.longitude,
        location: location,
        publishedAt: new Date().toISOString(),
    };

    if (entry.type === 'museum') {
        return {
            data: {
                ...baseData,
                radius: entry.radiusMeters || undefined,
                tags: tagIds.length > 0 ? { connect: tagIds } : undefined,
            }
        };
    } else {
        return {
            data: baseData
        };
    }
  }

  private log(message: string): void {
    console.log(`[PoiPopulator] ${message}`);
  }

  private logVerbose(message: string): void {
    if (this.verbose) {
      console.log(`[PoiPopulator] ${message}`);
    }
  }
}

