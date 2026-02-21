import axios, { AxiosInstance } from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement des variables d'environnement
const localEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  console.warn(`⚠️  Aucun fichier .env trouvé.`);
}

if (!process.env.STRAPI_API_TOKEN && !process.env.STRAPI_TOKEN) {
  const backendEnvPath = path.resolve(__dirname, '../../backend/.env');
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
}

// ===== CONFIGURATION =====
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
export const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN;

export const SEARCH_TYPES = [
  'tourist_attraction', 'museum', 'historical_place', 'park', 'church',
];

export const CULTURAL_TYPES = [
  'art_gallery', 'auditorium', 'performing_arts_theater',
  'historical_place', 'monument', 'museum', 'sculpture',
  'church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship',
  'tourist_attraction', 'park', 'cemetery',
];

export const GAME_CATEGORIES = ['Art', 'Nature', 'Science', 'Histoire', 'Savoir-faire', 'Société'];

// ===== INTERFACES =====
export interface CommuneEntry {
  code: string;
  nom: string;
  lat: number;
  lng: number;
  surface?: number;
}

export interface EpciEntry {
  code: string;
  nom: string;
  communesCount: number;
  communes: CommuneEntry[];
}

export interface DepartmentEntry {
  code: string;
  nom: string;
  region: string;
  epci: EpciEntry[];
}

export interface ComcomsData {
  generated: string;
  departments: DepartmentEntry[];
}

export interface PlaceDetails {
  openingHours: string[] | null;
  baseRadiusMeters: number | null;
}

export interface AIResult {
  categories: string[];
  reasoning: string;
  isPubliclyAccessible: boolean;
  accessType: 'payant' | 'gratuit' | 'inconnu';
  radiusMeters: number;
  _error?: boolean;
}

export interface POIOutput {
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

// ===== STATE MANAGEMENT =====

export interface ImportState {
  last_updated: string;
  departments: Record<string, {
    code: string;
    nom: string;
    status: 'partial' | 'done';
    epci: Record<string, {
      nom: string;
      status: 'done';
      last_scan: string;
      pois_found: number;
    }>;
  }>;
}

export function loadImportState(): ImportState {
  const statePath = path.join(__dirname, 'import-state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }
  return { last_updated: new Date().toISOString(), departments: {} };
}

export function saveImportState(state: ImportState) {
  const statePath = path.join(__dirname, 'import-state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function updateEpciState(dept: DepartmentEntry, epci: EpciEntry, poisCount: number) {
  const state = loadImportState();
  if (!state.departments[dept.code]) {
    state.departments[dept.code] = { code: dept.code, nom: dept.nom, status: 'partial', epci: {} };
  }
  state.departments[dept.code].epci[epci.code] = {
    nom: epci.nom, status: 'done', last_scan: new Date().toISOString(), pois_found: poisCount
  };
  const doneCount = Object.keys(state.departments[dept.code].epci).length;
  if (doneCount === dept.epci.length) state.departments[dept.code].status = 'done';
  state.last_updated = new Date().toISOString();
  saveImportState(state);
}

// ===== UTILITAIRES GÉOGRAPHIQUES =====

export function computeAreaKm2(communes: CommuneEntry[]): number {
  if (!communes || communes.length === 0) return 0;
  let totalHectares = 0;
  for (const c of communes) if (c.surface) totalHectares += c.surface;
  return Math.round(totalHectares / 100);
}

function calculateCommuneRadius(surfaceHectares?: number): number {
  if (!surfaceHectares) return 2000;
  const surfaceM2 = surfaceHectares * 10000;
  const radius = Math.sqrt(surfaceM2 / Math.PI);
  return Math.max(1500, Math.min(Math.round(radius), 6000));
}

// ===== CLIENT STRAPI =====

export class StrapiClient {
  private client: AxiosInstance;
  private tagCache = new Map<string, number>();
  private zoneCache = new Map<string, number>();

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
    } catch { return null; }
  }

  async findZoneId(collection: string, name: string): Promise<number | null> {
    if (!name) return null;
    const cacheKey = `${collection}:${name}`;
    if (this.zoneCache.has(cacheKey)) return this.zoneCache.get(cacheKey)!;
    const existing = await this.findOne(collection, { 'filters[name][$eq]': name });
    if (existing) { this.zoneCache.set(cacheKey, existing.id); return existing.id; }
    return null;
  }

  async importPOI(poi: POIOutput): Promise<boolean> {
    const collection = poi.type === 'museum' ? 'museums' : 'pois';
    let duplicate = null;
    try {
      // Chercher tous les POIs proches (~100m) par proximité géographique
      const latMin = poi.latitude - 0.001;
      const latMax = poi.latitude + 0.001;
      const lngMin = poi.longitude - 0.001;
      const lngMax = poi.longitude + 0.001;

      const res = await this.client.get(`/api/${collection}`, {
        params: {
          'filters[lat][$gte]': latMin,
          'filters[lat][$lte]': latMax,
          'filters[lng][$gte]': lngMin,
          'filters[lng][$lte]': lngMax,
          'fields[0]': 'lat', 'fields[1]': 'lng',
        }
      });
      duplicate = res.data.data.length > 0 ? res.data.data[0] : null;
    } catch { /* proceed */ }

    if (duplicate) return false;

    const tagIds: number[] = [];
    for (const cat of poi.categories) {
      const id = await this.getOrCreateTag(cat);
      if (id) tagIds.push(id);
    }

    const regionId = await this.findZoneId('regions', poi.region);
    const deptId = await this.findZoneId('departments', poi.department);
    const comcomId = await this.findZoneId('comcoms', poi.epci);

    const payload: Record<string, unknown> = {
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

// ===== GOOGLE MAPS SERVICES =====

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
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
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(viewport.northeast.lat)) * Math.cos(toRad(viewport.southwest.lat)) * Math.sin(dLng / 2) ** 2;
    baseRadiusMeters = Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 2);
  }
  return { openingHours, baseRadiusMeters };
}

export async function scanEpci(epci: EpciEntry, deptNom: string, regionNom: string): Promise<Record<string, unknown>[]> {
  const seen = new Map<string, Record<string, unknown>>();
  for (let ci = 0; ci < epci.communes.length; ci++) {
    const commune = epci.communes[ci];
    const radiusM = calculateCommuneRadius(commune.surface);
    // Log de progression par commune
    process.stdout.write(`  📍 [${ci + 1}/${epci.communes.length}] ${commune.nom} (r=${radiusM}m)…`);
    let communeNew = 0;
    for (const type of SEARCH_TYPES) {
      try {
        // Boucle de pagination (max 3 pages = 60 résultats par type/commune)
        let pageToken: string | undefined;
        let page = 0;
        do {
          const params: any = { location: `${commune.lat},${commune.lng}`, radius: radiusM, type, key: GOOGLE_MAPS_API_KEY };
          if (pageToken) params.pagetoken = pageToken;

          const res = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', { params });

          if (res.data.results) {
            for (const p of res.data.results as Record<string, unknown>[]) {
              const id = p.place_id as string;
              if (!seen.has(id)) {
                seen.set(id, { ...p, _sourceEpci: epci.nom, _sourceDept: deptNom, _sourceRegion: regionNom });
                communeNew++;
              }
            }
          }

          pageToken = res.data.next_page_token;
          page++;
          if (pageToken) await new Promise(r => setTimeout(r, 2000)); // Google exige ~2s avant d'utiliser le token
        } while (pageToken && page < 3);
      } catch (e: any) {
        console.warn(`  ⚠️ Google Maps erreur (${commune.nom}, type=${type}): ${e.message?.substring(0, 80)}`);
      }
      await new Promise(r => setTimeout(r, 200)); // délai entre types
    }
    console.log(` +${communeNew} (total: ${seen.size})`);
    await new Promise(r => setTimeout(r, 100)); // délai entre communes
  }
  return [...seen.values()].filter(p =>
    (p.types as string[])?.some(t => CULTURAL_TYPES.includes(t))
  );
}

// ===== GEMINI SERVICES =====

let _geminiModel: any = null;
function getGeminiModel() {
  if (!_geminiModel) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    _geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return _geminiModel;
}

/** Test rapide de la connectivité Gemini — à appeler avant de lancer l'analyse en masse */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent('Réponds uniquement "ok".');
    const text = result.response.text();
    console.log(`✅ Gemini connecté (réponse: "${text.trim().substring(0, 20)}")`);
    return true;
  } catch (e: any) {
    console.error(`❌ Gemini inaccessible: ${e.message}`);
    console.error(`   Vérifiez GEMINI_API_KEY et la connectivité réseau.`);
    return false;
  }
}

export async function categorizeWithGemini(place: Record<string, unknown>, details: PlaceDetails): Promise<AIResult> {
  const model = getGeminiModel();

  const prompt = `
Analyse ce lieu pour un jeu RPG culturel géolocalisé.

Lieu: "${place.name}" (${(place.types as string[])?.join(', ') || 'N/A'})
Adresse: ${place.vicinity || 'N/A'}
Département: ${place._sourceDept}
Horaires: ${details.openingHours ? details.openingHours.join(' | ') : 'Non spécifiés'}
Rayon viewport: ${details.baseRadiusMeters || 'N/A'} m

Tes missions :
1. Catégories: Choisis 1-2 parmi [${GAME_CATEGORIES.join(', ')}].
   - Art: musées d'art, galeries, street art
   - Nature: jardins, parcs remarquables, aquariums
   - Science: musées, observatoires
   - Histoire: monuments, châteaux, sites historiques, mémoriaux
   - Savoir-faire: musées artisanat, industrie
   - Société: lieux de culte historiques, bibliothèques, centres culturels

2. Accessible: Est-ce un lieu d'intérêt public qui mérite d'être visité ? (true/false)
   - OUI pour : Tout ce qui est culturel, historique, naturel ou touristique.
   - OUI même si : C'est une église, un petit parc, un point de vue ou si c'est frontalier.
   - NON pour : Écoles, Hôpitaux, Bureaux, Zones industrielles, Parkings, Hôtels/Restaurants sans intérêt historique majeur.

3. Accès: "gratuit" | "payant" | "inconnu"

4. Rayon: Rayon d'interaction en mètres.

Réponds UNIQUEMENT avec du JSON valide:
{
  "categories": ["string"],
  "reasoning": "courte explication du choix",
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
      
      // Nettoyage JSON renforcé
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const data = JSON.parse(jsonStr);

      if (!data.isPubliclyAccessible) {
        console.error(`❌ REJET [${place.name}]: ${data.reasoning}`);
      }
      return data;
    } catch (e: any) {
      attempts++;

      // Log à chaque retry pour visibilité
      if (attempts < 5) {
        console.warn(`  ⚠️ Gemini retry ${attempts}/5 [${(place.name as string)?.substring(0, 30)}]: ${e.message?.substring(0, 60)}`);
      } else {
        console.error(`\n💥 ERREUR FATALE GEMINI sur [${place.name}]:`);
        console.error(`   Message: ${e.message}`);
        if (e.response) console.error(`   Status: ${e.response.status}`);
      }

      const isRetryable =
        e.message?.includes('503') ||
        e.message?.includes('429') ||
        e.message?.includes('Error fetching') ||
        e.message?.includes('fetch') ||
        e.message?.includes('ECONNRESET') ||
        e.message?.includes('ETIMEDOUT') ||
        e.message?.includes('network') ||
        e instanceof SyntaxError;
      if (isRetryable && attempts < 5) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      break;
    }
  }

  // Retourne un objet erreur explicite avec flag _error pour distinguer d'un rejet légitime
  return { categories: [], reasoning: 'Erreur technique Gemini (voir logs)', isPubliclyAccessible: false, accessType: 'inconnu' as const, radiusMeters: 50, _error: true };
}
