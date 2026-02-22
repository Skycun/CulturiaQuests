import axios, { AxiosInstance } from 'axios';
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
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral-nemo:12b';
export const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
export const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_TOKEN;

export const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Rayons par défaut selon le type OSM (en mètres)
const DEFAULT_RADIUS_BY_TYPE: Record<string, number> = {
  museum: 50,
  gallery: 50,
  castle: 150,
  fort: 120,
  ruins: 100,
  archaeological_site: 150,
  battlefield: 200,
  park: 200,
  garden: 100,
  nature_reserve: 300,
  place_of_worship: 40,
  monument: 30,
  memorial: 30,
  artwork: 20,
  attraction: 60,
  default: 50,
};

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

// ===== OVERPASS (OPENSTREETMAP) SERVICES =====

/** Construit la requête Overpass pour une commune (rayon autour du centre) */
function buildOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:30];
(
  nwr["tourism"~"museum|attraction|gallery|artwork"](around:${radiusM},${lat},${lng});
  nwr["historic"](around:${radiusM},${lat},${lng});
  nwr["leisure"~"park|garden|nature_reserve"](around:${radiusM},${lat},${lng});
  nwr["amenity"="place_of_worship"](around:${radiusM},${lat},${lng});
);
out center bb;`;
}

/** Détermine le type principal OSM d'un élément pour le rayon par défaut */
function getOsmMainType(tags: Record<string, string>): string {
  if (tags.tourism) return tags.tourism;
  if (tags.historic) return tags.historic;
  if (tags.leisure) return tags.leisure;
  if (tags.amenity) return tags.amenity;
  return 'default';
}

/** Calcule le rayon à partir de la géométrie OSM (bounds) ou utilise le rayon par défaut */
function calculateRadiusFromOsm(element: Record<string, unknown>): number {
  const tags = (element.tags || {}) as Record<string, string>;
  const defaultRadius = DEFAULT_RADIUS_BY_TYPE[getOsmMainType(tags)] || DEFAULT_RADIUS_BY_TYPE.default;

  // Pour les ways/relations, Overpass retourne bounds si disponible
  const bounds = element.bounds as { minlat: number; maxlat: number; minlon: number; maxlon: number } | undefined;
  if (bounds) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(bounds.maxlat - bounds.minlat);
    const dLng = toRad(bounds.maxlon - bounds.minlon);
    const midLat = toRad((bounds.maxlat + bounds.minlat) / 2);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(midLat) * Math.cos(midLat) * Math.sin(dLng / 2) ** 2;
    const diameter = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const radius = Math.round(diameter / 2);
    if (radius > 10) return Math.max(20, Math.min(radius, 500));
  }

  return defaultRadius;
}

/** Extrait les détails d'un lieu directement depuis les tags OSM (pas d'appel réseau) */
export function extractPlaceDetails(place: Record<string, unknown>): PlaceDetails {
  const tags = (place.tags || {}) as Record<string, string>;
  const openingHours = tags.opening_hours ? [tags.opening_hours] : null;
  const baseRadiusMeters = calculateRadiusFromOsm(place);
  return { openingHours, baseRadiusMeters };
}

/** Génère une description lisible des tags OSM pour le prompt IA */
function formatOsmTags(tags: Record<string, string>): string {
  const relevant = ['tourism', 'historic', 'leisure', 'amenity', 'heritage', 'wikipedia', 'wikidata', 'denomination', 'religion', 'building'];
  return relevant
    .filter(k => tags[k])
    .map(k => `${k}=${tags[k]}`)
    .join(', ') || 'N/A';
}

/** Construit une requête Overpass avec un filtre BBox couvrant toutes les communes de l'EPCI */
function buildOverpassBBoxQuery(communes: CommuneEntry[]): string {
  const margin = 0.02; // ~2km de marge pour couvrir les POIs en périphérie
  const lats = communes.map(c => c.lat);
  const lngs = communes.map(c => c.lng);
  const minLat = Math.min(...lats) - margin;
  const maxLat = Math.max(...lats) + margin;
  const minLng = Math.min(...lngs) - margin;
  const maxLng = Math.max(...lngs) + margin;

  return `[out:json][timeout:60][bbox:${minLat},${minLng},${maxLat},${maxLng}];
(
  nwr["tourism"~"museum|attraction|gallery|artwork"];
  nwr["historic"];
  nwr["leisure"~"park|garden|nature_reserve"];
  nwr["amenity"="place_of_worship"];
);
out center bb;`;
}

export async function scanEpci(epci: EpciEntry, deptNom: string, regionNom: string): Promise<Record<string, unknown>[]> {
  const seen = new Map<string, Record<string, unknown>>();

  console.log(`  📍 Scan BBox unique pour ${epci.communes.length} communes…`);
  const query = buildOverpassBBoxQuery(epci.communes);

  let attempts = 0;
  let res = null;
  while (attempts < 3) {
    try {
      res = await axios.post(OVERPASS_API_URL, `data=${encodeURIComponent(query)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 90000,
      });
      break;
    } catch (e: any) {
      attempts++;
      const status = e.response?.status;
      if ((status === 429 || status === 504) && attempts < 3) {
        const wait = [15000, 30000, 60000][attempts - 1];
        console.warn(`  ⏳ Overpass ${status}, retry ${attempts}/3 dans ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      console.warn(`  ⚠️ Overpass erreur (${epci.nom}): ${e.message?.substring(0, 80)}`);
      break;
    }
  }

  if (res?.data?.elements) {
    for (const el of res.data.elements as Record<string, unknown>[]) {
      const osmId = `${el.type}/${el.id}`;
      if (seen.has(osmId)) continue;

      const tags = (el.tags || {}) as Record<string, string>;
      if (!tags.name) continue; // Ignorer les éléments sans nom

      // Coordonnées : directes pour les nodes, center pour les ways/relations
      const lat = (el.lat as number) || (el.center as { lat: number })?.lat;
      const lng = (el.lon as number) || (el.center as { lon: number })?.lon;
      if (!lat || !lng) continue;

      seen.set(osmId, {
        osm_id: osmId,
        name: tags.name,
        tags,
        lat,
        lng,
        bounds: el.bounds,
        _sourceEpci: epci.nom,
        _sourceDept: deptNom,
        _sourceRegion: regionNom,
      });
    }
  }

  console.log(`  ✅ ${seen.size} POIs trouvés pour ${epci.nom}`);
  return [...seen.values()];
}

// ===== OLLAMA SERVICES =====

/** Test rapide de la connectivité Ollama — à appeler avant de lancer l'analyse en masse */
export async function testOllamaConnection(): Promise<boolean> {
  try {
    const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    const models = res.data.models || [];
    const modelNames = models.map((m: { name: string }) => m.name);
    const hasModel = modelNames.some((n: string) => n === OLLAMA_MODEL || n.startsWith(OLLAMA_MODEL.split(':')[0]));

    if (!hasModel) {
      console.error(`❌ Modèle "${OLLAMA_MODEL}" non trouvé dans Ollama.`);
      console.error(`   Modèles disponibles: ${modelNames.join(', ') || '(aucun)'}`);
      console.error(`   Lancez: docker exec -it ollama ollama pull ${OLLAMA_MODEL}`);
      return false;
    }

    console.log(`✅ Ollama connecté (modèle: ${OLLAMA_MODEL})`);
    return true;
  } catch (e: any) {
    console.error(`❌ Ollama inaccessible: ${e.message}`);
    console.error(`   Vérifiez que le service Ollama tourne sur ${OLLAMA_BASE_URL}`);
    return false;
  }
}

export async function categorizeWithAI(place: Record<string, unknown>, details: PlaceDetails): Promise<AIResult> {
  const tags = (place.tags || {}) as Record<string, string>;

  const prompt = `Analyse ce lieu pour un jeu RPG culturel géolocalisé.

Lieu: "${place.name}" (${formatOsmTags(tags)})
Adresse: ${tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}, ${tags['addr:city'] || ''}`.trim() : 'N/A'}
Département: ${place._sourceDept}
Horaires: ${details.openingHours ? details.openingHours.join(' | ') : 'Non spécifiés'}
Rayon estimé: ${details.baseRadiusMeters || 'N/A'} m

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
      const res = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.3 },
      });

      const data = JSON.parse(res.data.response);

      if (!data.isPubliclyAccessible) {
        console.error(`❌ REJET [${place.name}]: ${data.reasoning}`);
      }
      return data;
    } catch (e: any) {
      attempts++;

      if (attempts < 5) {
        console.warn(`  ⚠️ Ollama retry ${attempts}/5 [${(place.name as string)?.substring(0, 30)}]: ${e.message?.substring(0, 60)}`);
      } else {
        console.error(`\n💥 ERREUR FATALE OLLAMA sur [${place.name}]:`);
        console.error(`   Message: ${e.message}`);
        if (e.response) console.error(`   Status: ${e.response.status}`);
      }

      const isRetryable =
        e.message?.includes('ECONNRESET') ||
        e.message?.includes('ETIMEDOUT') ||
        e.message?.includes('ECONNREFUSED') ||
        e.message?.includes('network') ||
        e.code === 'ECONNRESET' ||
        e.code === 'ETIMEDOUT' ||
        e instanceof SyntaxError;
      if (isRetryable && attempts < 5) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      break;
    }
  }

  return { categories: [], reasoning: 'Erreur technique Ollama (voir logs)', isPubliclyAccessible: false, accessType: 'inconnu' as const, radiusMeters: 50, _error: true };
}
