import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
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

// Rayon de recherche par commune (en mètres)
const SEARCH_RADIUS = 8000;

// Communes principales de la Manche (couvrant tout le département)
const MANCHE_COMMUNES = [
  // Préfecture et sous-préfectures
  { name: 'Saint-Lô', lat: 49.1167, lng: -1.0833 },
  { name: 'Cherbourg-en-Cotentin', lat: 49.6337, lng: -1.6222 },
  { name: 'Avranches', lat: 48.6833, lng: -1.3667 },
  { name: 'Coutances', lat: 49.0333, lng: -1.4333 },

  // Grandes villes
  { name: 'Granville', lat: 48.8378, lng: -1.5972 },
  { name: 'Valognes', lat: 49.5097, lng: -1.4703 },
  { name: 'Carentan-les-Marais', lat: 49.3031, lng: -1.2419 },
  { name: 'Villedieu-les-Poêles', lat: 48.8422, lng: -1.2211 },
  { name: 'Mortain-Bocage', lat: 48.6492, lng: -0.9417 },
  { name: 'Saint-James', lat: 48.5219, lng: -1.3278 },
  { name: 'Pontorson', lat: 48.5528, lng: -1.5083 },

  // Cotentin Nord
  { name: 'Beaumont-Hague', lat: 49.6625, lng: -1.8403 },
  { name: 'Les Pieux', lat: 49.5131, lng: -1.8025 },
  { name: 'Bricquebec-en-Cotentin', lat: 49.4703, lng: -1.6317 },
  { name: 'Saint-Pierre-Église', lat: 49.6689, lng: -1.4017 },
  { name: 'Barfleur', lat: 49.6703, lng: -1.2642 },
  { name: 'Saint-Vaast-la-Hougue', lat: 49.5894, lng: -1.2631 },
  { name: 'Quettehou', lat: 49.5933, lng: -1.3033 },

  // Cotentin Ouest
  { name: 'Barneville-Carteret', lat: 49.3833, lng: -1.7833 },
  { name: 'Portbail', lat: 49.3331, lng: -1.6967 },
  { name: 'La Haye', lat: 49.2833, lng: -1.5333 },
  { name: 'Saint-Sauveur-le-Vicomte', lat: 49.3856, lng: -1.5328 },

  // Centre Manche
  { name: 'Canisy', lat: 49.0833, lng: -1.0333 },
  { name: 'Marigny-Le-Lozon', lat: 49.1000, lng: -1.2500 },
  { name: 'Percy-en-Normandie', lat: 48.9167, lng: -1.1833 },
  { name: 'Tessy-Bocage', lat: 48.9667, lng: -1.0667 },
  { name: 'Torigni-les-Villes', lat: 49.0333, lng: -0.9833 },

  // Côte Ouest
  { name: 'Agon-Coutainville', lat: 49.0167, lng: -1.5833 },
  { name: 'Bréhal', lat: 48.9000, lng: -1.5167 },
  { name: 'Saint-Pair-sur-Mer', lat: 48.8167, lng: -1.5667 },
  { name: 'Jullouville', lat: 48.7733, lng: -1.5633 },
  { name: 'Carolles', lat: 48.7500, lng: -1.5667 },

  // Sud Manche / Baie du Mont-Saint-Michel
  { name: 'Le Mont-Saint-Michel', lat: 48.6361, lng: -1.5114 },
  { name: 'Ducey-Les Chéris', lat: 48.6197, lng: -1.2917 },
  { name: 'Saint-Hilaire-du-Harcouët', lat: 48.5778, lng: -1.0917 },
  { name: 'Isigny-le-Buat', lat: 48.6167, lng: -1.1667 },
  { name: 'Sourdeval', lat: 48.7167, lng: -0.9167 },
  { name: 'Le Teilleul', lat: 48.5333, lng: -0.8667 },
  { name: 'Barenton', lat: 48.5997, lng: -0.8200 },

  // Est Manche (limite Calvados)
  { name: 'Saint-Jean-de-Daye', lat: 49.2167, lng: -1.1500 },
  { name: 'Pont-Hébert', lat: 49.1833, lng: -1.1167 },
  { name: 'Condé-sur-Vire', lat: 49.0500, lng: -0.9833 },

  // Sites touristiques majeurs (pour être sûr de les capturer)
  { name: 'Sainte-Mère-Église', lat: 49.4089, lng: -1.3169 },
  { name: 'Utah Beach', lat: 49.4167, lng: -1.1833 },
  { name: 'Lessay', lat: 49.2167, lng: -1.5333 },
];

// Types culturels recherchés
const CULTURAL_TYPES = [
  'art_gallery', 'auditorium', 'performing_arts_theater',
  'historical_place', 'monument', 'museum', 'sculpture',
  'church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship',
  'tourist_attraction', 'park', 'cemetery'
];

const GAME_CATEGORIES = ['Art', 'Nature', 'Science', 'Histoire', 'Savoir-faire', 'Société'];

// ===== INTERFACES =====
interface Viewport {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

interface PlaceDetails {
  openingHours: string[] | null;
  viewport: Viewport | null;
  baseRadiusMeters: number | null;
}

interface AICategorizationResult {
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
  commune: string;
}

// ===== STRAPI CLIENT =====
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

  async importPOI(poi: POIOutput) {
    const collection = poi.type === 'museum' ? 'museums' : 'pois';

    const existing = await this.findOne(collection, { 'filters[name][$eq]': poi.name });
    if (existing) {
      console.log(`⚠️  ${poi.name} existe déjà (ID: ${existing.id}). Skip.`);
      return false;
    }

    const tagIds: number[] = [];
    if (poi.categories?.length) {
      for (const cat of poi.categories) {
        const id = await this.getOrCreateTag(cat);
        if (id) tagIds.push(id);
      }
    }

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

// ===== GOOGLE MAPS SERVICES =====
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json`;
  const response = await axios.get(url, {
    params: {
      place_id: placeId,
      fields: 'opening_hours,geometry',
      key: GOOGLE_MAPS_API_KEY
    }
  });

  const result = response.data.result;
  const openingHours = result?.opening_hours?.weekday_text || null;
  const viewport = result?.geometry?.viewport || null;

  let baseRadiusMeters: number | null = null;
  if (viewport) {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(viewport.southwest.lat - viewport.northeast.lat);
    const dLng = toRad(viewport.southwest.lng - viewport.northeast.lng);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
              Math.cos(toRad(viewport.northeast.lat))*Math.cos(toRad(viewport.southwest.lat))*
              Math.sin(dLng/2)*Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const diagonal = R * c;
    baseRadiusMeters = Math.round(diagonal / 2);
  }

  return { openingHours, viewport, baseRadiusMeters };
}

async function searchNearbyCommune(commune: { name: string; lat: number; lng: number }) {
  const allPlaces = new Map();
  const searchTypes = ['tourist_attraction', 'museum', 'historical_place', 'park', 'church'];

  for (const type of searchTypes) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    try {
      const res = await axios.get(url, {
        params: {
          location: `${commune.lat},${commune.lng}`,
          radius: SEARCH_RADIUS,
          type: type,
          key: GOOGLE_MAPS_API_KEY
        }
      });

      for (const p of res.data.results) {
        allPlaces.set(p.place_id, { ...p, sourceCommune: commune.name });
      }
    } catch (e) {
      // Silently continue on error
    }
  }

  return Array.from(allPlaces.values());
}

// ===== GEMINI SERVICE =====
async function categorizeWithGemini(place: any, details: PlaceDetails): Promise<AICategorizationResult> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
  Analyse ce lieu pour un jeu RPG culturel géolocalisé dans la Manche (Normandie, France).

  Lieu: "${place.name}" (${place.types?.join(', ') || 'N/A'})
  Adresse: ${place.vicinity || 'N/A'}
  Commune source: ${place.sourceCommune}
  Horaires: ${details.openingHours ? 'Oui' : 'Non spécifiés'}
  Viewport Radius: ${details.baseRadiusMeters || 'N/A'}

  Contexte régional: La Manche est connue pour:
  - Le Mont-Saint-Michel et sa baie
  - Les plages du Débarquement (Utah Beach, Sainte-Mère-Église)
  - Le bocage normand et son patrimoine rural
  - Les ports historiques (Cherbourg, Granville, Barfleur)
  - L'artisanat (cuivre de Villedieu, dentelle)
  - Les abbayes et églises romanes/gothiques

  Tâches:
  1. Catégories: Choisis 1-2 parmi [${GAME_CATEGORIES.join(', ')}].
  2. Accessible: Est-ce un lieu culturel visitable par le public ? (Oui/Non)
     - Églises/chapelles historiques: OUI si patrimoine architectural notable
     - Parcs: OUI seulement si intérêt historique/monumental
     - Cimetières militaires (WW2): OUI - patrimoine mémoriel important
     - Boutiques/Restos: NON sauf si historique majeur
  3. Accès: "gratuit", "payant", "inconnu"
  4. Rayon: Estime le rayon d'interaction en mètres (min 50m, max 500m pour POI, plus pour grands sites)

  Réponds UNIQUEMENT avec ce JSON :
  {
    "categories": ["string"],
    "reasoning": "string (court, en français)",
    "isPubliclyAccessible": boolean,
    "accessType": "gratuit" | "payant" | "inconnu",
    "radiusMeters": number
  }
  `;

  let attempts = 0;
  const maxAttempts = 5;
  let delay = 1000;

  while (attempts < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e: any) {
      attempts++;
      const isOverloaded = e.message?.includes('503') || e.message?.includes('429');

      if (isOverloaded && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      break;
    }
  }

  return {
    categories: [],
    reasoning: "Erreur IA",
    isPubliclyAccessible: false,
    accessType: "inconnu",
    radiusMeters: 50
  };
}

// ===== DASHBOARD =====
interface DashboardState {
  communes: { name: string; status: 'pending' | 'scanning' | 'done'; placesFound: number }[];
  places: { name: string; status: 'pending' | 'processing' | 'accepted' | 'rejected' }[];
  validPOIs: POIOutput[];
  recentLogs: string[];
}

function renderDashboard(state: DashboardState) {
  process.stdout.write('\x1B[2J\x1B[0f');

  console.log('🗺️  CulturiaQuests - Import Département de la Manche\n');

  // Communes progress
  const communesDone = state.communes.filter(c => c.status === 'done').length;
  const communesScanning = state.communes.filter(c => c.status === 'scanning').length;
  const totalPlacesFound = state.communes.reduce((sum, c) => sum + c.placesFound, 0);

  console.log(`📍 Communes: ${communesDone}/${state.communes.length} | 🔍 En cours: ${communesScanning} | 📊 Lieux trouvés: ${totalPlacesFound}`);

  // Places analysis progress
  const accepted = state.places.filter(p => p.status === 'accepted').length;
  const rejected = state.places.filter(p => p.status === 'rejected').length;
  const processing = state.places.filter(p => p.status === 'processing').length;
  const pending = state.places.filter(p => p.status === 'pending').length;

  if (state.places.length > 0) {
    const progress = Math.round(((state.places.length - pending) / state.places.length) * 100);
    const progressBar = `[${'='.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}%`;
    console.log(`🤖 Analyse: ✅ ${accepted} | ❌ ${rejected} | 🔄 ${processing} | ⏳ ${pending} | ${progressBar}`);
  }

  console.log(''.padEnd(70, '-'));

  // Communes grid (compact)
  let communeGrid = '   ';
  state.communes.forEach((c, i) => {
    let symbol = '\x1b[90m○\x1b[0m'; // Gray (Pending)
    if (c.status === 'scanning') symbol = '\x1b[34m●\x1b[0m'; // Blue
    if (c.status === 'done') symbol = c.placesFound > 0 ? '\x1b[32m●\x1b[0m' : '\x1b[33m○\x1b[0m'; // Green or Yellow
    communeGrid += symbol + ' ';
    if ((i + 1) % 25 === 0) communeGrid += '\n   ';
  });
  console.log(communeGrid + '\n');

  // Recent logs
  console.log('--- Activité récente ---');
  state.recentLogs.slice(-8).forEach(log => console.log(log));
}

// ===== MAIN FLOW =====
async function main() {
  console.log('🗺️  CulturiaQuests - Import de la Manche (50)\n');

  if (!GOOGLE_MAPS_API_KEY || !GEMINI_API_KEY) {
    console.error('❌ Erreur: Clés API manquantes dans .env');
    console.log('Requis: GOOGLE_MAPS_API_KEY, GEMINI_API_KEY');
    process.exit(1);
  }

  // Mode selection
  const { mode } = await inquirer.prompt([{
    type: 'list',
    name: 'mode',
    message: 'Mode de scan:',
    choices: [
      { name: `Scan complet (${MANCHE_COMMUNES.length} communes)`, value: 'full' },
      { name: 'Sélection de communes', value: 'select' },
      { name: 'Test rapide (5 communes)', value: 'test' }
    ]
  }]);

  let communesToScan = MANCHE_COMMUNES;

  if (mode === 'select') {
    const { selection } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selection',
      message: 'Sélectionnez les communes:',
      choices: MANCHE_COMMUNES.map(c => ({ name: c.name, value: c, checked: false })),
      pageSize: 20
    }]);
    communesToScan = selection;
  } else if (mode === 'test') {
    communesToScan = MANCHE_COMMUNES.slice(0, 5);
  }

  if (communesToScan.length === 0) {
    console.log('Aucune commune sélectionnée.');
    process.exit(0);
  }

  console.log(`\n🚀 Démarrage du scan de ${communesToScan.length} communes...\n`);

  // Initialize state
  const state: DashboardState = {
    communes: communesToScan.map(c => ({ name: c.name, status: 'pending', placesFound: 0 })),
    places: [],
    validPOIs: [],
    recentLogs: ['Démarrage...']
  };

  // Global deduplication set
  const seenPlaceIds = new Set<string>();
  const allPlaces: any[] = [];

  // Phase 1: Scan all communes
  renderDashboard(state);

  for (let i = 0; i < communesToScan.length; i++) {
    const commune = communesToScan[i];
    state.communes[i].status = 'scanning';
    state.recentLogs.push(`🔍 Scan: ${commune.name}...`);
    renderDashboard(state);

    try {
      const places = await searchNearbyCommune(commune);

      // Deduplicate
      let newPlaces = 0;
      for (const place of places) {
        if (!seenPlaceIds.has(place.place_id)) {
          seenPlaceIds.add(place.place_id);

          // Filter by cultural types
          if (place.types?.some((t: string) => CULTURAL_TYPES.includes(t))) {
            allPlaces.push(place);
            newPlaces++;
          }
        }
      }

      state.communes[i].placesFound = newPlaces;
      state.communes[i].status = 'done';
      state.recentLogs.push(`✅ ${commune.name}: ${newPlaces} nouveaux lieux`);

    } catch (e) {
      state.communes[i].status = 'done';
      state.recentLogs.push(`⚠️ ${commune.name}: Erreur`);
    }

    renderDashboard(state);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n📊 Phase 1 terminée: ${allPlaces.length} lieux uniques trouvés\n`);

  if (allPlaces.length === 0) {
    console.log('Aucun lieu culturel trouvé.');
    process.exit(0);
  }

  // Phase 2: AI Analysis
  const { confirmAnalysis } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmAnalysis',
    message: `Analyser ${allPlaces.length} lieux avec Gemini ? (peut prendre du temps)`,
    default: true
  }]);

  if (!confirmAnalysis) {
    // Save raw data anyway
    const rawFilename = path.join(__dirname, 'exports', `manche-raw-${Date.now()}.json`);
    fs.mkdirSync(path.join(__dirname, 'exports'), { recursive: true });
    fs.writeFileSync(rawFilename, JSON.stringify(allPlaces, null, 2));
    console.log(`💾 Données brutes sauvegardées: ${rawFilename}`);
    process.exit(0);
  }

  // Initialize places state
  state.places = allPlaces.map(p => ({ name: p.name, status: 'pending' as const }));
  renderDashboard(state);

  // Process in batches
  const BATCH_SIZE = 10;

  for (let i = 0; i < allPlaces.length; i += BATCH_SIZE) {
    const batch = allPlaces.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (place, batchIdx) => {
      const globalIdx = i + batchIdx;
      state.places[globalIdx].status = 'processing';
      renderDashboard(state);

      try {
        const details = await fetchPlaceDetails(place.place_id);
        const analysis = await categorizeWithGemini(place, details);

        if (analysis.isPubliclyAccessible) {
          state.places[globalIdx].status = 'accepted';

          const isMuseum = place.types?.some((t: string) =>
            ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t)
          );

          state.validPOIs.push({
            name: place.name,
            description: analysis.reasoning,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            type: isMuseum ? 'museum' : 'poi',
            categories: analysis.categories,
            accessType: analysis.accessType,
            radiusMeters: analysis.radiusMeters,
            rating: place.rating || null,
            commune: place.sourceCommune
          });

          state.recentLogs.push(`✅ ${place.name.substring(0, 35)}... (${analysis.categories[0] || '-'})`);
        } else {
          state.places[globalIdx].status = 'rejected';
          state.recentLogs.push(`❌ ${place.name.substring(0, 35)}...`);
        }
      } catch (e) {
        state.places[globalIdx].status = 'rejected';
        state.recentLogs.push(`⚠️ Erreur: ${place.name.substring(0, 25)}...`);
      }

      renderDashboard(state);
    }));

    // Pause between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Phase 3: Save results
  console.log('\n\n✅ Analyse terminée!\n');

  const exportDir = path.join(__dirname, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(exportDir, `manche-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(state.validPOIs, null, 2));

  console.log(`💾 ${state.validPOIs.length} lieux sauvegardés dans ${filename}`);

  // Summary
  if (state.validPOIs.length > 0) {
    console.log('\n=== RÉSUMÉ PAR CATÉGORIE ===');
    const catCount: Record<string, number> = {};
    state.validPOIs.forEach(p => {
      p.categories.forEach(c => {
        catCount[c] = (catCount[c] || 0) + 1;
      });
    });
    Object.entries(catCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    console.log('\n=== RÉSUMÉ PAR TYPE ===');
    const museums = state.validPOIs.filter(p => p.type === 'museum').length;
    const pois = state.validPOIs.filter(p => p.type === 'poi').length;
    console.log(`   Museums: ${museums}`);
    console.log(`   POIs: ${pois}`);

    // Import to Strapi?
    if (STRAPI_API_TOKEN) {
      const { confirmImport } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmImport',
        message: `Importer les ${state.validPOIs.length} lieux dans Strapi ?`,
        default: false
      }]);

      if (confirmImport) {
        console.log('\n🚀 Import vers Strapi...');
        const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);

        let importedCount = 0;
        for (const poi of state.validPOIs) {
          process.stdout.write(`   ${poi.name.substring(0, 40)}... `);
          try {
            const success = await strapi.importPOI(poi);
            if (success) {
              console.log('✅');
              importedCount++;
            }
          } catch (e) {
            console.log(`❌`);
          }
        }
        console.log(`\n✨ ${importedCount}/${state.validPOIs.length} importés dans Strapi.`);
      }
    }
  }

  console.log('\n👋 Terminé!');
}

main().catch(console.error);
