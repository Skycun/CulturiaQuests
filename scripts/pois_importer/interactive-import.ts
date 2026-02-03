import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import axios, { AxiosInstance, AxiosError } from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import inquirer from 'inquirer';
import * as fs from 'fs';

// ===== CONFIG =====
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const STRAPI_BASE_URL = process.env.STRAPI_BASE_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

const DEFAULT_RADIUS = 5000;

// Types culturels recherchés
const CULTURAL_TYPES = [
  'art_gallery', 'auditorium', 'performing_arts_theater',
  'historical_place', 'monument', 'museum', 'sculpture',
  'church', 'mosque', 'synagogue', 'hindu_temple', 'place_of_worship',
  'tourist_attraction', 'park'
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

    // Check existing
    const existing = await this.findOne('tags', { 'filters[name][$eq]': tagName });
    if (existing) {
      this.tagCache.set(tagName, existing.id);
      return existing.id;
    }

    // Create new
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
    // 1. Check uniqueness
    const collection = poi.type === 'museum' ? 'museums' : 'pois';
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

// ===== GOOGLE MAPS SERVICES =====
async function getCityCoordinates(city: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json`;
  const response = await axios.get(url,
    {
      params: { address: city, key: GOOGLE_MAPS_API_KEY }
    }
  );
  return response.data.results[0]?.geometry.location;
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json`;
  const response = await axios.get(url,
    {
      params: {
        place_id: placeId,
        fields: 'opening_hours,geometry',
        key: GOOGLE_MAPS_API_KEY
      }
    }
  );
  const result = response.data.result;
  const openingHours = result?.opening_hours?.weekday_text || null;
  const viewport = result?.geometry?.viewport || null;
  
  // Calculate base radius
  let baseRadiusMeters: number | null = null;
  if (viewport) {
      const R = 6371000;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(viewport.southwest.lat - viewport.northeast.lat);
      const dLng = toRad(viewport.southwest.lng - viewport.northeast.lng);
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(viewport.northeast.lat))*Math.cos(toRad(viewport.southwest.lat))*Math.sin(dLng/2)*Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const diagonal = R * c;
      baseRadiusMeters = Math.round(diagonal / 2);
  }

  return { openingHours, viewport, baseRadiusMeters };
}

async function searchNearby(lat: number, lng: number, radius: number) {
  const allPlaces = new Map();

  // Search for each type to get maximum results
  // For interactive demo, maybe we limit to a few types or do parallel?
  // Let's do a smarter search: 'tourist_attraction' + 'museum' covers a lot.
  const searchTypes = ['tourist_attraction', 'museum', 'historical_place', 'park'];
  
  process.stdout.write('🔍 Recherche Google Maps en cours... ');

  for (const type of searchTypes) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    try {
        const res = await axios.get(url,
          {
              params: {
                  location: `${lat},${lng}`,
                  radius: radius,
                  type: type,
                  key: GOOGLE_MAPS_API_KEY
              }
          }
        );
        
        for (const p of res.data.results) {
            allPlaces.set(p.place_id, p);
        }
    } catch (e) {
        console.error(`Error searching ${type}:`, e);
    }
  }
  console.log(`\n✅ Trouvé ${allPlaces.size} lieux potentiels.`);
  return Array.from(allPlaces.values());
}

// ===== GEMINI SERVICE =====
async function categorizeWithGemini(place: any, details: PlaceDetails): Promise<AICategorizationResult> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
  Analyse ce lieu pour un jeu RPG culturel géolocalisé.
  Lieu: "${place.name}" (${place.types.join(', ')})
  Adresse: ${place.vicinity}
  Horaires: ${details.openingHours ? 'Oui' : 'Non spécifiés'}
  Viewport Radius: ${details.baseRadiusMeters || 'N/A'}

  Tâches:
  1. Catégories: Choisis 1-2 parmi [${GAME_CATEGORIES.join(', ')}].
  2. Accessible: Est-ce un lieu culturel visitable par le public ? (Oui/Non)
     - Parcs: OUI seulement si intérêt historique/monumental.
     - Boutiques/Restos: NON sauf si historique majeur.
  3. Accès: "gratuit", "payant", "inconnu".
  4. Rayon: Estime le rayon d'interaction en mètres (min 50m, max 500m pour POI, plus pour grands parcs/musées).

  Réponds UNIQUEMENT avec ce JSON :
  {
    "categories": ["string"],
    "reasoning": "string (court)",
    "isPubliclyAccessible": boolean,
    "accessType": "gratuit" | "payant" | "inconnu",
    "radiusMeters": number
  }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Gemini Error:", e);
    // Fallback default
    return {
        categories: [],
        reasoning: "Erreur IA",
        isPubliclyAccessible: false,
        accessType: "inconnu",
        radiusMeters: 50
    };
  }
}

// ===== MAIN FLOW =====
async function main() {
  console.log('🌍 CulturiaQuests - Importateur de POIs (Gemini Edition)\n');

  if (!GOOGLE_MAPS_API_KEY || !GEMINI_API_KEY || !STRAPI_API_TOKEN) {
    console.error('❌ Erreur: Manque des clés API dans .env');
    console.log('Requis: GOOGLE_MAPS_API_KEY, GEMINI_API_KEY, STRAPI_API_TOKEN, STRAPI_BASE_URL');
    process.exit(1);
  }

  const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);

  // 1. Ask for City
  const { city } = await inquirer.prompt([{
    type: 'input',
    name: 'city',
    message: 'Quelle ville voulez-vous scanner ?',
    default: 'Saint-Lô, France'
  }]);

  // 2. Geocode
  const location = await getCityCoordinates(city);
  if (!location) {
    console.error('Ville introuvable.');
    process.exit(1);
  }
  console.log(`📍 Centre: ${location.lat}, ${location.lng}`);

  // 3. Search
  const places = await searchNearby(location.lat, location.lng, DEFAULT_RADIUS);

  // 4. Batch Process with Gemini
  console.log(`\n🤖 Analyse IA de ${places.length} lieux en cours...`);
  
  const processedPOIs = [];
  const validPOIs = [];

  let count = 0;
  for (const place of places) {
    // Basic filter
    if (!place.types.some((t: string) => CULTURAL_TYPES.includes(t))) continue;

    count++;
    process.stdout.write(`   [${count}/${places.length}] ${place.name}... `);

    // Fetch details
    const details = await fetchPlaceDetails(place.place_id);
    
    // Analyze
    const analysis = await categorizeWithGemini(place, details);
    
    const poiData = {
      name: place.name,
      original_types: place.types,
      vicinity: place.vicinity,
      rating: place.rating,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      gemini_analysis: analysis
    };

    processedPOIs.push(poiData);

    if (analysis.isPubliclyAccessible) {
        console.log(`✅ Validé (${analysis.categories[0] || '?'})`);
        
        // Prepare Strapi Format
        const isMuseum = place.types.some((t: string) => ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t));
        const targetType = isMuseum ? 'museum' : 'poi';

        validPOIs.push({
            name: place.name,
            description: analysis.reasoning,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            type: targetType,
            categories: analysis.categories,
            accessType: analysis.accessType,
            radiusMeters: analysis.radiusMeters,
            rating: place.rating
        });
    } else {
        console.log(`❌ Rejeté`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 5. Save JSON
  const exportDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedCity = city.split(',')[0].trim().replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = path.join(exportDir, `pois-export-${sanitizedCity}-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(validPOIs, null, 2));
  console.log(`\n💾 ${validPOIs.length} lieux valides sauvegardés dans ${filename}`);

  // 6. Summary Table
  if (validPOIs.length > 0) {
      console.log('\n=== RÉSUMÉ DES LIEUX VALIDÉS ===');
      console.table(validPOIs.map(p => ({
          Name: p.name.substring(0, 30),
          Type: p.type,
          Category: p.categories[0] || '-',
          Access: p.accessType
      })));

      // 7. Ask for Import
      const { confirmImport } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmImport',
          message: `Voulez-vous importer ces ${validPOIs.length} lieux dans Strapi maintenant ?`,
          default: false
      }]);

      if (confirmImport) {
          console.log('\n🚀 Importation vers Strapi...');
          let importedCount = 0;
          for (const poi of validPOIs) {
              process.stdout.write(`   Import ${poi.name}... `);
              try {
                  const success = await strapi.importPOI(poi);
                  if (success) {
                      console.log('✅');
                      importedCount++;
                  } else {
                      // Already logged inside importPOI
                  }
              } catch (e) {
                  console.log(`❌ Erreur: ${e instanceof Error ? e.message : e}`);
              }
          }
          console.log(`\n✨ Terminé ! ${importedCount}/${validPOIs.length} importés.`);
      } else {
          console.log('👋 Importation annulée. Le fichier JSON est conservé.');
      }
  } else {
      console.log('Aucun lieu valide trouvé.');
  }
}

main().catch(console.error);
