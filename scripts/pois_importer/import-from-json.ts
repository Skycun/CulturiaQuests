import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// ===== STRAPI CLIENT (Reused) =====
class StrapiClient {
  private client: AxiosInstance;
  private tagCache: Map<string, number> = new Map();

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

  async importPOI(poi: any) {
    const collection = poi.type === 'museum' ? 'museums' : 'pois';
    
    // 1. Check existence
    const existing = await this.findOne(collection, { 'filters[name][$eq]': poi.name });
    if (existing) {
      console.log(`⚠️  ${poi.name} existe déjà (ID: ${existing.id}). Skip.`);
      return false;
    }

    // 2. Resolve tags
    const tagIds: number[] = [];
    if (poi.categories?.length) {
      for (const cat of poi.categories) {
        const id = await this.getOrCreateTag(cat);
        if (id) tagIds.push(id);
      }
    }

    // 3. Payload
    const payload: any = {
      name: poi.name,
      lat: poi.latitude,
      lng: poi.longitude,
      location: { lat: poi.latitude, lng: poi.longitude },
    };

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

  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) {
    console.error(`❌ Le dossier ${exportDir} n'existe pas.`);
    console.log("Lancez d'abord le script de scan (interactive-import.ts) !");
    process.exit(1);
  }

  // 1. List files
  const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('Aucun fichier JSON trouvé dans exports/.');
    process.exit(0);
  }

  // 2. Select File
  const { selectedFile } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFile',
      message: 'Quel fichier voulez-vous importer ?',
      choices: files
    }
  ]);

  const filePath = path.join(exportDir, selectedFile);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  let pois = [];
  try {
    pois = JSON.parse(rawData);
  } catch (e) {
    console.error('❌ JSON invalide.');
    process.exit(1);
  }

  console.log(`\n📄 Chargé: ${selectedFile} (${pois.length} lieux)`);

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
    } catch (e) {
      console.log(`❌ Erreur: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n✨ Terminé ! ${successCount}/${poisToImport.length} lieux importés.`);
}

main().catch(console.error);
