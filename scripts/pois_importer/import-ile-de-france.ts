/**
 * import-ile-de-france.ts
 * Script simplifié pour importer les POIs de l'Île-de-France
 * Sélectionne automatiquement tous les départements d'Île-de-France
 *
 * Usage: npx tsx import-ile-de-france.ts
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import axios, { AxiosInstance } from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import inquirer from 'inquirer';
import * as fs from 'fs';

// ===== CONFIG =====
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const SEARCH_TYPES = [
  'tourist_attraction', 'museum', 'park', 'church',
];

const CULTURAL_TYPES = [
  'art_gallery', 'auditorium', 'performing_arts_theater',
  'monument', 'museum', 'sculpture',
  'church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship',
  'tourist_attraction', 'park', 'cemetery',
];

const GAME_CATEGORIES = ['Art', 'Nature', 'Science', 'Histoire', 'Savoir-faire', 'Société'];

// Codes des départements d'Île-de-France
const IDF_DEPT_CODES = ['75', '77', '78', '91', '92', '93', '94', '95'];

// ===== INTERFACES =====
interface BBox { minLat: number; maxLat: number; minLng: number; maxLng: number }

interface EpciEntry {
  code: string;
  nom: string;
  communes: number;
  bbox: BBox;
}

interface DepartmentEntry {
  code: string;
  nom: string;
  region: string;
  epci: EpciEntry[];
}

interface ComcomsData {
  generated: string;
  departments: DepartmentEntry[];
}

interface SearchPoint { lat: number; lng: number }

interface PlaceDetails {
  openingHours: string[] | null;
  baseRadiusMeters: number | null;
}

interface AIResult {
  categories: string[];
  reasoning: string;
  isPubliclyAccessible: boolean;
  accessType: 'payant' | 'gratuit' | 'inconnu';
  radiusMeters: number;
}

interface POIOutput {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  type: 'museum' | 'poi';
  categories: string[];
  accessType: 'payant' | 'gratuit' | 'inconnu';
  radiusMeters: number;
  rating: number | null;
  epci: string;
  department: string;
  region: string;
}

// ===== GRILLE DE RECHERCHE =====
const GRID_THRESHOLDS = [
  { maxAreaKm2: 150,     gridSize: 1, radiusM: 8000 },
  { maxAreaKm2: 500,     gridSize: 2, radiusM: 5000 },
  { maxAreaKm2: 1500,    gridSize: 3, radiusM: 5000 },
  { maxAreaKm2: Infinity, gridSize: 4, radiusM: 5000 },
];

function computeAreaKm2(bbox: BBox): number {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const latKm  = (bbox.maxLat - bbox.minLat) * 111;
  const lngKm  = (bbox.maxLng - bbox.minLng) * 111 * Math.cos((midLat * Math.PI) / 180);
  return latKm * lngKm;
}

function generateSearchPoints(bbox: BBox): { points: SearchPoint[]; radiusM: number } {
  const area   = computeAreaKm2(bbox);
  const config = GRID_THRESHOLDS.find(t => area <= t.maxAreaKm2)!;

  const latStep = (bbox.maxLat - bbox.minLat) / config.gridSize;
  const lngStep = (bbox.maxLng - bbox.minLng) / config.gridSize;

  const points: SearchPoint[] = [];
  for (let row = 0; row < config.gridSize; row++) {
    for (let col = 0; col < config.gridSize; col++) {
      points.push({
        lat: bbox.minLat + latStep * (row + 0.5),
        lng: bbox.minLng + lngStep * (col + 0.5),
      });
    }
  }

  return { points, radiusM: config.radiusM };
}

// ===== STRAPI CLIENT =====
class StrapiClient {
  private client: AxiosInstance;
  private tagCache = new Map<string, number>();

  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  }

  private async findOne(collection: string, params: Record<string, string>) {
    try {
      const res = await this.client.get(`/api/${collection}`, { params });
      return res.data.data[0] || null;
    } catch { return null; }
  }

  private async create(collection: string, data: Record<string, unknown>) {
    const res = await this.client.post(`/api/${collection}`, { data });
    return res.data.data;
  }

  private async getOrCreateTag(tagName: string): Promise<number | null> {
    if (this.tagCache.has(tagName)) return this.tagCache.get(tagName)!;

    const existing = await this.findOne('tags', { 'filters[name][$eq]': tagName });
    if (existing) { this.tagCache.set(tagName, existing.id); return existing.id; }

    try {
      const created = await this.create('tags', { name: tagName, publishedAt: new Date().toISOString() });
      this.tagCache.set(tagName, created.id);
      return created.id;
    } catch (e) {
      console.error(`  ⚠️ Tag "${tagName}":`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  async importPOI(poi: POIOutput): Promise<boolean> {
    const collection = poi.type === 'museum' ? 'museums' : 'pois';

    const existing = await this.findOne(collection, { 'filters[name][$eq]': poi.name });
    if (existing) {
      console.log(`⚠️  ${poi.name} existe déjà (ID: ${existing.id}). Skip.`);
      return false;
    }

    const tagIds: number[] = [];
    for (const cat of poi.categories) {
      const id = await this.getOrCreateTag(cat);
      if (id) tagIds.push(id);
    }

    const payload: Record<string, unknown> = {
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

// ===== GOOGLE MAPS =====
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
    params: { place_id: placeId, fields: 'opening_hours,geometry', key: GOOGLE_MAPS_API_KEY },
  });

  const result = res.data.result;
  const openingHours: string[] | null = result?.opening_hours?.weekday_text || null;
  const viewport = result?.geometry?.viewport || null;

  let baseRadiusMeters: number | null = null;
  if (viewport) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(viewport.southwest.lat - viewport.northeast.lat);
    const dLng = toRad(viewport.southwest.lng - viewport.northeast.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(viewport.northeast.lat)) *
        Math.cos(toRad(viewport.southwest.lat)) *
        Math.sin(dLng / 2) ** 2;
    baseRadiusMeters = Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 2);
  }

  return { openingHours, baseRadiusMeters };
}

async function scanEpci(epci: EpciEntry, deptNom: string, regionNom: string): Promise<Record<string, unknown>[]> {
  const { points, radiusM } = generateSearchPoints(epci.bbox);
  const seen = new Map<string, Record<string, unknown>>();

  for (const pt of points) {
    for (const type of SEARCH_TYPES) {
      try {
        const res = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
          params: { location: `${pt.lat},${pt.lng}`, radius: radiusM, type, key: GOOGLE_MAPS_API_KEY },
        });

        if (res.data.status !== 'OK' && res.data.status !== 'ZERO_RESULTS') {
          console.error(`  ⚠️ Google API Error [${res.data.status}]: ${res.data.error_message || 'No message'}`);
        }

        if (res.data.results) {
          for (const p of res.data.results as Record<string, unknown>[]) {
            const id = p.place_id as string;
            if (!seen.has(id)) {
              seen.set(id, { ...p, _sourceEpci: epci.nom, _sourceDept: deptNom, _sourceRegion: regionNom });
            }
          }
        }
      } catch (e: any) {
        console.error(`  ⚠️ Network/Request Error: ${e.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }

  return [...seen.values()].filter(p =>
    (p.types as string[])?.some(t => CULTURAL_TYPES.includes(t))
  );
}

// ===== GEMINI =====
async function categorizeWithGemini(place: Record<string, unknown>, details: PlaceDetails): Promise<AIResult> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const prompt = `
Analyse ce lieu pour un jeu RPG culturel géolocalisé en France.

Lieu: "${place.name}" (${(place.types as string[])?.join(', ') || 'N/A'})
Adresse: ${place.vicinity || 'N/A'}
Département: ${place._sourceDept}
EPCI source: ${place._sourceEpci}
Horaires: ${details.openingHours ? details.openingHours.join(' | ') : 'Non spécifiés'}
Rayon viewport: ${details.baseRadiusMeters || 'N/A'} m

Tâches:
1. Catégories: Choisis 1-2 parmi [${GAME_CATEGORIES.join(', ')}].
   - Art: musées d'art, galeries, théâtres
   - Nature: jardins, parcs remarquables, aquariums
   - Science: musées scientifiques, planétariums
   - Histoire: monuments, châteaux, sites historiques, mémoriaux
   - Savoir-faire: musées artisanat, industrie
   - Société: lieux de culte historiques, bibliothèques, centres culturels

2. Accessible: Est-ce un lieu culturel visitable par le public? (true/false)
   - Parcs: true SEULEMENT si intérêt historique/monumental
   - Cimetières militaires: true (patrimoine mémoriel)
   - Boutiques/Restos: false sauf historique majeur

3. Accès: "gratuit" | "payant" | "inconnu"

4. Rayon: Rayon d'interaction en mètres.
   - Base: utilise le viewport si disponible
   - Petit lieu local: 50-200m
   - Musée/monument moyen: 200-1000m
   - Grand site: 1000-5000m

Réponds UNIQUEMENT avec du JSON valide:
{
  "categories": ["string"],
  "reasoning": "courte explication en français",
  "isPubliclyAccessible": boolean,
  "accessType": "gratuit"|"payant"|"inconnu",
  "radiusMeters": number
}`;

  let attempts = 0;
  let delay = 1000;

  while (attempts < 5) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e: unknown) {
      attempts++;
      const msg = e instanceof Error ? e.message : '';
      if ((msg.includes('503') || msg.includes('429')) && attempts < 5) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      break;
    }
  }

  return { categories: [], reasoning: 'Erreur IA', isPubliclyAccessible: false, accessType: 'inconnu', radiusMeters: 50 };
}

// ===== DASHBOARD =====
interface DashboardState {
  epciList: { nom: string; dept: string; status: 'pending' | 'scanning' | 'done'; placesFound: number }[];
  analysisTotal: number;
  analysisAccepted: number;
  analysisRejected: number;
  analysisProcessing: number;
  recentLogs: string[];
}

function renderDashboard(state: DashboardState) {
  process.stdout.write('\x1B[2J\x1B[0f');

  console.log('🗺️  CulturiaQuests — Import Île-de-France\n');

  const done     = state.epciList.filter(e => e.status === 'done').length;
  const scanning = state.epciList.filter(e => e.status === 'scanning').length;
  const totalPl  = state.epciList.reduce((s, e) => s + e.placesFound, 0);

  console.log(`📍 EPCIs: ${done}/${state.epciList.length} | 🔍 En cours: ${scanning} | Lieux bruts: ${totalPl}`);

  if (state.analysisTotal > 0) {
    const pending  = state.analysisTotal - state.analysisAccepted - state.analysisRejected - state.analysisProcessing;
    const done2    = state.analysisTotal - pending;
    const pct      = Math.round((done2 / state.analysisTotal) * 100);
    const filled   = Math.floor(pct / 5);
    const bar      = `[${'='.repeat(filled)}${' '.repeat(20 - filled)}] ${pct}%`;
    console.log(`🤖 Analyse: ✅ ${state.analysisAccepted} | ❌ ${state.analysisRejected} | 🔄 ${state.analysisProcessing} | ${bar}`);
  }

  console.log(''.padEnd(70, '-'));

  let grid = '   ';
  state.epciList.forEach((e, i) => {
    let sym = '\x1b[90m○\x1b[0m';
    if (e.status === 'scanning') sym = '\x1b[34m●\x1b[0m';
    if (e.status === 'done')     sym = e.placesFound > 0 ? '\x1b[32m●\x1b[0m' : '\x1b[33m○\x1b[0m';
    grid += sym + ' ';
    if ((i + 1) % 30 === 0) grid += '\n   ';
  });
  console.log(grid + '\n');

  console.log('--- Activité récente ---');
  state.recentLogs.slice(-8).forEach(l => console.log(`  ${l}`));
}

// ===== MAIN =====
async function main() {
  console.log('🗺️  CulturiaQuests — Import Île-de-France\n');

  if (!GOOGLE_MAPS_API_KEY || !GEMINI_API_KEY) {
    console.error('❌ Clés API manquantes dans .env');
    console.log('   Requis : GOOGLE_MAPS_API_KEY, GEMINI_API_KEY');
    process.exit(1);
  }

  console.log(`🔑 Google Maps API Key: ${GOOGLE_MAPS_API_KEY.substring(0, 4)}...${GOOGLE_MAPS_API_KEY.substring(GOOGLE_MAPS_API_KEY.length - 4)}`);
  console.log(`🔑 Gemini API Key:      ${GEMINI_API_KEY.substring(0, 4)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}`);

  const dataPath = path.join(__dirname, 'comcoms-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ comcoms-data.json introuvable.');
    console.log('   Lancez d\'abord :  npx tsx generate-comcoms-data.ts');
    process.exit(1);
  }

  const comcomsData: ComcomsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Filtrer uniquement les départements d'Île-de-France
  const idfDepartments = comcomsData.departments.filter(d => IDF_DEPT_CODES.includes(d.code));

  if (idfDepartments.length === 0) {
    console.error('❌ Aucun département d\'Île-de-France trouvé dans comcoms-data.json');
    process.exit(1);
  }

  console.log(`📂 Départements d'Île-de-France trouvés : ${idfDepartments.length}`);
  idfDepartments.forEach(d => {
    console.log(`   [${d.code}] ${d.nom} — ${d.epci.length} EPCI`);
  });

  // Collecter tous les EPCIs (Dédupliqués par code pour éviter les scans multiples du Grand Paris)
  const epciMap = new Map<string, { epci: EpciEntry; dept: DepartmentEntry }>();
  for (const dept of idfDepartments) {
    for (const epci of dept.epci) {
      if (!epciMap.has(epci.code)) {
        epciMap.set(epci.code, { epci, dept });
      }
    }
  }
  const selectedEpcis = [...epciMap.values()];

  const totalPoints = selectedEpcis.reduce(
    (sum, { epci }) => sum + generateSearchPoints(epci.bbox).points.length, 0
  );

  console.log('\n📋 Résumé (Après déduplication) :');
  console.log(`   Départements :  ${idfDepartments.length}`);
  console.log(`   EPCIs uniques : ${selectedEpcis.length}`);
  console.log(`   Points search : ${totalPoints}`);
  console.log(`   Requêtes API est.: ${totalPoints * SEARCH_TYPES.length} (Google Maps)\n`);

  const { go } = await inquirer.prompt([{
    type: 'confirm',
    name: 'go',
    message: 'Démarrer le scan Google Maps ?',
    default: true,
  }]);
  if (!go) process.exit(0);

  // ===== PHASE 1 — SCAN =====
  const state: DashboardState = {
    epciList: selectedEpcis.map(({ epci, dept }) => ({
      nom: epci.nom, dept: dept.nom, status: 'pending' as const, placesFound: 0,
    })),
    analysisTotal: 0, analysisAccepted: 0, analysisRejected: 0, analysisProcessing: 0,
    recentLogs: ['🚀 Démarrage du scan...'],
  };

  const globalSeen = new Set<string>();
  const allPlaces: Record<string, unknown>[] = [];

  renderDashboard(state);

  for (let i = 0; i < selectedEpcis.length; i++) {
    const { epci, dept } = selectedEpcis[i];

    state.epciList[i].status = 'scanning';
    state.recentLogs.push(`🔍 ${epci.nom} (${dept.nom})…`);
    renderDashboard(state);

    try {
      const places = await scanEpci(epci, dept.nom, dept.region);

      let newCount = 0;
      for (const p of places) {
        const id = p.place_id as string;
        if (!globalSeen.has(id)) {
          globalSeen.add(id);
          allPlaces.push(p);
          newCount++;
        }
      }

      state.epciList[i].placesFound = newCount;
      state.epciList[i].status = 'done';
      state.recentLogs.push(`  ✅ ${epci.nom} → ${newCount} nouveaux lieux`);
    } catch {
      state.epciList[i].status = 'done';
      state.recentLogs.push(`  ⚠️ ${epci.nom} — erreur réseau`);
    }

    renderDashboard(state);
  }

  process.stdout.write('\x1B[2J\x1B[0f');
  console.log(`\n📊 Phase 1 terminée : ${allPlaces.length} lieux uniques trouvés\n`);

  if (allPlaces.length === 0) {
    console.log('Aucun lieu culturel trouvé. Fin.');
    process.exit(0);
  }

  // ===== PHASE 2 — ANALYSE =====
  const { doAnalysis } = await inquirer.prompt([{
    type: 'confirm',
    name: 'doAnalysis',
    message: `Analyser ces ${allPlaces.length} lieux avec Gemini ?`,
    default: true,
  }]);

  if (!doAnalysis) {
    const exportDir = path.join(__dirname, 'exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const rawFile = path.join(exportDir, `idf-raw-${Date.now()}.json`);
    fs.writeFileSync(rawFile, JSON.stringify(allPlaces, null, 2));
    console.log(`💾 Données brutes sauvegardées : ${rawFile}`);
    process.exit(0);
  }

  state.analysisTotal = allPlaces.length;
  const validPOIs: POIOutput[] = [];

  renderDashboard(state);

  const BATCH_SIZE = 10;
  for (let i = 0; i < allPlaces.length; i += BATCH_SIZE) {
    const batch = allPlaces.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (place) => {
      state.analysisProcessing++;
      renderDashboard(state);

      try {
        const details  = await fetchPlaceDetails(place.place_id as string);
        const analysis = await categorizeWithGemini(place, details);

        state.analysisProcessing--;

        if (analysis.isPubliclyAccessible) {
          state.analysisAccepted++;

          const isMuseum = (place.types as string[])?.some(t =>
            ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t)
          );

          validPOIs.push({
            name:        place.name as string,
            description: analysis.reasoning,
            latitude:    (place.geometry as { location: { lat: number } }).location.lat,
            longitude:   (place.geometry as { location: { lng: number } }).location.lng,
            type:        isMuseum ? 'museum' : 'poi',
            categories:  analysis.categories,
            accessType:  analysis.accessType,
            radiusMeters: analysis.radiusMeters,
            rating:      (place.rating as number) || null,
            epci:        place._sourceEpci as string,
            department:  place._sourceDept as string,
            region:      place._sourceRegion as string,
          });

          state.recentLogs.push(`  ✅ ${(place.name as string).substring(0, 36)}… (${analysis.categories[0] || '-'})`);
        } else {
          state.analysisRejected++;
          state.recentLogs.push(`  ❌ ${(place.name as string).substring(0, 36)}…`);
        }
      } catch {
        state.analysisProcessing--;
        state.analysisRejected++;
        state.recentLogs.push(`  ⚠️ Erreur : ${((place.name as string) || '?').substring(0, 30)}…`);
      }

      renderDashboard(state);
    }));

    await new Promise(r => setTimeout(r, 500));
  }

  // ===== PHASE 3 — EXPORT =====
  process.stdout.write('\x1B[2J\x1B[0f');
  console.log('✅ Analyse terminée!\n');

  const exportDir = path.join(__dirname, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(exportDir, `idf-${timestamp}.json`);
  fs.writeFileSync(exportFile, JSON.stringify(validPOIs, null, 2));

  console.log(`💾 ${validPOIs.length} lieux exportés → ${path.basename(exportFile)}\n`);

  if (validPOIs.length === 0) {
    console.log('Aucun lieu validé par l\'IA.');
    process.exit(0);
  }

  // Résumés
  console.log('=== PAR DÉPARTEMENT ===');
  const byDept: Record<string, number> = {};
  validPOIs.forEach(p => { byDept[p.department] = (byDept[p.department] || 0) + 1; });
  Object.entries(byDept).sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => console.log(`   ${dept}: ${count}`));

  console.log('\n=== PAR CATÉGORIE ===');
  const byCat: Record<string, number> = {};
  validPOIs.forEach(p => p.categories.forEach(c => { byCat[c] = (byCat[c] || 0) + 1; }));
  Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`   ${cat}: ${count}`));

  console.log('\n=== PAR TYPE ===');
  console.log(`   Museums : ${validPOIs.filter(p => p.type === 'museum').length}`);
  console.log(`   POIs    : ${validPOIs.filter(p => p.type === 'poi').length}`);

  // Import Strapi
  if (STRAPI_API_TOKEN) {
    const { doImport } = await inquirer.prompt([{
      type: 'confirm',
      name: 'doImport',
      message: `Importer ces ${validPOIs.length} lieux dans Strapi ?`,
      default: false,
    }]);

    if (doImport) {
      console.log('\n🚀 Import vers Strapi…');
      const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);
      let imported = 0;

      for (const poi of validPOIs) {
        process.stdout.write(`   ${poi.name.substring(0, 42).padEnd(42)} `);
        try {
          if (await strapi.importPOI(poi)) { console.log('✅'); imported++; }
        } catch { console.log('❌'); }
      }
      console.log(`\n✨ ${imported}/${validPOIs.length} importés dans Strapi.`);
    }
  }

  console.log('\n👋 Terminé!');
}

main().catch(console.error);
