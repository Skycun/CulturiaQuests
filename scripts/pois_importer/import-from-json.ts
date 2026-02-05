import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root first
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Then load local .env (overrides root if variables exist)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// ===== STRAPI CLIENT (Reused) =====
class StrapiClient {
  private client: AxiosInstance;
  private tagCache: Map<string, number> = new Map();
  private zoneCache: Map<string, number> = new Map(); // Cache "collection:name" -> id

  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async findOne(collection: string, params: any) {
    try {
      const res = await this.client.get(`/api/${collection}`, { params });
      return res.data.data[0] || null;
    } catch (e) {
      return null;
    }
  }

  async create(collection: string, data: any) {
    const res = await this.client.post(`/api/${collection}`, { data });
    return res.data.data;
  }

  async getOrCreateTag(tagName: string): Promise<number | null> {
    if (this.tagCache.has(tagName)) return this.tagCache.get(tagName)!;

    const existing = await this.findOne('tags', { 'filters[name][$eq]': tagName });
    if (existing) {
      this.tagCache.set(tagName, existing.id);
      return existing.id;
    }

    try {
      const newTag = await this.create('tags', { name: tagName, publishedAt: new Date() });
      this.tagCache.set(tagName, newTag.id);
      return newTag.id;
    } catch (e) {
      console.error(`Error creating tag ${tagName}:`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  async findZoneId(collection: string, name: string): Promise<number | null> {
    if (!name) return null;
    const cacheKey = `${collection}:${name}`;
    if (this.zoneCache.has(cacheKey)) return this.zoneCache.get(cacheKey)!;

    // Strapi filter by name
    const existing = await this.findOne(collection, { 'filters[name][$eq]': name });
    if (existing) {
      this.zoneCache.set(cacheKey, existing.id);
      return existing.id;
    }
    // Try by code if name fails (fallback logic if needed, but here we assume name match)
    return null;
  }

  async importPOI(poi: any) {
    const collection = poi.type === 'museum' ? 'museums' : 'pois';
    
    // 1. Check existence (Name + Location)
    // On récupère tous les lieux portant ce nom pour vérifier leur position
    let duplicate = null;
    try {
      const res = await this.client.get(`/api/${collection}`, { 
        params: { 
          'filters[name][$eq]': poi.name,
          'fields[0]': 'lat',
          'fields[1]': 'lng',
          'fields[2]': 'name'
        } 
      });
      const candidates = res.data.data;

      // On cherche un candidat qui est au même endroit (à ~10m près soit 0.0001 degré)
      let distLog = 0;
      duplicate = candidates.find((c: any) => {
        const dLat = Math.abs((c.lat || 0) - poi.latitude);
        const dLng = Math.abs((c.lng || 0) - poi.longitude);
        const match = dLat < 0.0001 && dLng < 0.0001;
        if (match) distLog = Math.round((dLat + dLng) * 111000); // approx meters
        return match;
      });
      
      if (duplicate) {
        console.log(`⚠️  ${poi.name} ignoré : Doublon géographique trouvé (dist ~${distLog}m, ID: ${duplicate.id})`);
        return false;
      }
    } catch (e) {
      // Ignore find error
    }

    if (duplicate) return false; // Safety check

    // 2. Resolve tags
    const tagIds: number[] = [];
    if (poi.categories?.length) {
      for (const cat of poi.categories) {
        const id = await this.getOrCreateTag(cat);
        if (id) tagIds.push(id);
      }
    }

    // 3. Resolve Zones (Region, Dept, Comcom)
    const regionId = await this.findZoneId('regions', poi.region);
    const deptId = await this.findZoneId('departments', poi.department);
    const comcomId = await this.findZoneId('comcoms', poi.epci); // JSON uses 'epci' key

    // 4. Payload
    const payload: any = {
      name: poi.name,
      lat: poi.latitude,
      lng: poi.longitude,
    };

    if (regionId) payload.region = regionId;
    if (deptId) payload.department = deptId;
    if (comcomId) payload.comcom = comcomId;

    if (poi.type === 'museum') {
      payload.radius = poi.radiusMeters;
      if (tagIds.length) payload.tags = { connect: tagIds };
    }

    await this.create(collection, payload);
    return true;
  }
}

// ===== MAIN =====
async function main() {
  console.log('📂 Importateur de sauvegardes JSON vers Strapi\n');

  if (!STRAPI_API_TOKEN) {
    console.error('❌ Erreur: STRAPI_API_TOKEN manquant dans .env');
    process.exit(1);
  }

  // 1. List files (Current Dir + exports/)
  const exportDir = path.join(__dirname, 'exports');
  let files: { name: string; path: string }[] = [];

  // Scan current directory
  try {
    const currentDirFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.json') && !['package.json', 'package-lock.json', 'tsconfig.json'].includes(f))
      .map(f => ({ name: f, path: path.join(__dirname, f) }));
    files = [...files, ...currentDirFiles];
  } catch (e) {
    // ignore
  }

  // Scan exports directory
  if (fs.existsSync(exportDir)) {
    const exportFiles = fs.readdirSync(exportDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: `exports/${f}`, path: path.join(exportDir, f) }));
    files = [...files, ...exportFiles];
  }

  if (files.length === 0) {
    console.log('Aucun fichier JSON importable trouvé (dans . ou ./exports).');
    process.exit(0);
  }

  // 2. Select File
  const { selectedFileObj } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFileObj',
      message: 'Quel fichier voulez-vous importer ?',
      choices: files.map(f => ({ name: f.name, value: f }))
    }
  ]);

  const rawData = fs.readFileSync(selectedFileObj.path, 'utf-8');
  let pois = [];
  try {
    pois = JSON.parse(rawData);
    if (!Array.isArray(pois)) {
      throw new Error('Le fichier doit contenir un tableau d\'objets JSON.');
    }
  } catch (e) {
    console.error(`❌ JSON invalide: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  console.log(`\n📄 Chargé: ${selectedFileObj.name} (${pois.length} lieux)`);

  // 3. Select Mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Que voulez-vous faire ?',
      choices: [
        { name: 'Tout importer', value: 'all' },
        { name: 'Sélectionner manuellement', value: 'select' }
      ]
    }
  ]);

  let poisToImport = pois;

  if (mode === 'select') {
    const { selection } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selection',
        message: 'Cochez les lieux à importer (Espace pour cocher)',
        choices: pois.map((p: any) => ({
          name: `${p.name} (${p.type})`,
          value: p,
          checked: true
        })),
        pageSize: 20
      }
    ]);
    poisToImport = selection;
  }

  if (poisToImport.length === 0) {
    console.log('Aucun lieu sélectionné.');
    process.exit(0);
  }

  // 4. Import
  console.log(`\n🚀 Démarrage de l'import de ${poisToImport.length} lieux...`);
  const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);

  let successCount = 0;
  for (const poi of poisToImport) {
    process.stdout.write(`   Import ${poi.name}... `);
    try {
      const success = await strapi.importPOI(poi);
      if (success) {
        console.log('✅');
        successCount++;
      } else {
        // Log handled in importPOI
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message;
      console.log(`❌ Erreur: ${errorMsg}`);
      if (e.response?.data?.error?.details) {
        console.log('      Détails:', JSON.stringify(e.response.data.error.details));
      }
    }
  }

  console.log(`\n✨ Terminé ! ${successCount}/${poisToImport.length} lieux importés.`);
}

main().catch(console.error);
