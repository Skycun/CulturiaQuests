// scripts/pois-importer.ts
import 'dotenv/config';
import axios from 'axios';
import OpenAI from 'openai';
import * as fs from 'fs';

// ===== CONFIG =====
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Cible de scan
const CITY = 'Saint-Lô, France';
const RADIUS = 5000;

// Rattachement géographique (pour compatibilité avec import-from-json.ts)
const EPCI = 'Saint-Lô Agglo';
const DEPT = 'Manche';
const REGION = 'Normandie';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const CULTURAL_TYPES = [
  'art_gallery',
  'auditorium',
  'performing_arts_theater',
  'historical_place',
  'monument',
  'museum',
  'sculpture',
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
  'place_of_worship',
  'tourist_attraction',
  'park',
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
  rating: number | null;
  accessType: 'payant' | 'gratuit' | 'inconnu';
  radiusMeters: number;
  openingHours: string[] | null;
  epci: string;
  department: string;
  region: string;
}

// ===== UTILITAIRES =====

function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBaseRadius(viewport: Viewport): number {
  const diagonal = haversineDistance(viewport.northeast, viewport.southwest);
  return Math.round(diagonal / 2);
}

// ===== ÉTAPE 1 : Géocoder la ville =====
async function getCityCoordinates(city: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json`;
  const response = await axios.get(url, {
    params: { address: city, key: GOOGLE_API_KEY }
  });
  const location = response.data.results[0]?.geometry.location;
  if (!location) throw new Error('Ville introuvable');
  console.log(`📍 Coordonnées de ${city}:`, location);
  return location;
}

// ===== ÉTAPE 1b : Récupérer les détails d'un lieu =====
async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json`;
  const response = await axios.get(url, {
    params: {
      place_id: placeId,
      fields: 'opening_hours,geometry',
      key: GOOGLE_API_KEY
    }
  });
  const result = response.data.result;
  const openingHours = result?.opening_hours?.weekday_text || null;
  const viewport = result?.geometry?.viewport || null;
  let baseRadiusMeters: number | null = null;
  if (viewport) {
    baseRadiusMeters = calculateBaseRadius(viewport);
  }
  return { openingHours, viewport, baseRadiusMeters };
}

function isRelevantPlace(placeTypes: string[]): boolean {
  return placeTypes.some(t => CULTURAL_TYPES.includes(t));
}

// ===== ÉTAPE 2 : Récupérer les POIs =====
async function fetchCulturalPlaces(lat: number, lng: number) {
  const allPlaces = [];
  for (const type of CULTURAL_TYPES) {
    console.log(`🔍 Recherche des ${type}...`);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    let nextPageToken = null;
    do {
      const params: any = {
        location: `${lat},${lng}`,
        radius: RADIUS,
        type: type,
        key: GOOGLE_API_KEY
      };
      if (nextPageToken) {
        params.pagetoken = nextPageToken;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      const response = await axios.get(url, { params });
      allPlaces.push(...response.data.results);
      nextPageToken = response.data.next_page_token;
    } while (nextPageToken);
  }
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(p => [p.place_id, p])).values()
  );
  console.log(`📊 ${uniquePlaces.length} lieux bruts trouvés`);
  const filteredPlaces = uniquePlaces.filter((place: any) => isRelevantPlace(place.types || []));
  console.log(`✅ ${filteredPlaces.length} lieux culturels après filtrage`);
  const enrichedPlaces = [];
  for (let i = 0; i < filteredPlaces.length; i++) {
    const place = filteredPlaces[i];
    console.log(`   📍 ${i + 1}/${filteredPlaces.length}: ${place.name}`);
    try {
      const details = await fetchPlaceDetails(place.place_id);
      enrichedPlaces.push({ ...place, details });
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      enrichedPlaces.push({
        ...place,
        details: { openingHours: null, viewport: null, baseRadiusMeters: null }
      });
    }
  }
  return enrichedPlaces;
}

// ===== ÉTAPE 3 : Catégoriser et analyser avec GPT =====
async function categorizePOI(
  name: string,
  types: string[],
  vicinity: string,
  openingHours: string[] | null,
  baseRadiusMeters: number | null
): Promise<AICategorizationResult> {
  const openingHoursText = openingHours ? openingHours.join('\n') : 'Non disponibles';
  const radiusInfo = baseRadiusMeters ? `${baseRadiusMeters} mètres` : 'Non disponible';

  const prompt = `Tu es un expert en classification de lieux culturels.
Lieu à analyser :
- Nom : ${name}
- Types : ${types.join(', ')}
- Adresse : ${vicinity}
- Horaires : ${openingHoursText}
- Rayon suggéré : ${radiusInfo}

Tâches :
1. Catégories : 1 ou 2 parmi : ${GAME_CATEGORIES.join(', ')}
2. Accessibilité publique : true si visitable (lieux culturels), false sinon.
3. Type d'accès : "payant", "gratuit" ou "inconnu".
4. Rayon d'action : Estime le rayon d'attraction en mètres.

Format JSON :
{
  "categories": ["Catégorie1"],
  "reasoning": "explication",
  "isPubliclyAccessible": true,
  "accessType": "payant",
  "radiusMeters": 500
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Tu es un assistant spécialisé. Réponds uniquement en JSON.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

// ===== ÉTAPE 4 : Transformation finale =====
async function transformToPOIs(places: any[]): Promise<POIOutput[]> {
  const pois: POIOutput[] = [];
  let excludedCount = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const details: PlaceDetails = place.details || { openingHours: null, viewport: null, baseRadiusMeters: null };
    console.log(`🤖 Analyse ${i + 1}/${places.length}: ${place.name}`);

    try {
      const aiResult = await categorizePOI(place.name, place.types, place.vicinity, details.openingHours, details.baseRadiusMeters);
      if (!aiResult.isPubliclyAccessible) {
        excludedCount++;
        continue;
      }
      const isMuseum = place.types.some((t: string) => ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t));
      pois.push({
        name: place.name,
        description: `${place.vicinity} - ${aiResult.reasoning}`,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        type: isMuseum ? 'museum' : 'poi',
        categories: aiResult.categories,
        rating: place.rating || null,
        accessType: aiResult.accessType,
        radiusMeters: aiResult.radiusMeters,
        openingHours: details.openingHours,
        epci: EPCI,
        department: DEPT,
        region: REGION
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Échec pour ${place.name}`);
    }
  }
  console.log(`\n📊 Exclus : ${excludedCount}`);
  return pois;
}

// ===== MAIN =====
async function main() {
  try {
    console.log('🚀 Démarrage du script d\'import...\n');
    const coords = await getCityCoordinates(CITY);
    const places = await fetchCulturalPlaces(coords.lat, coords.lng);
    const pois = await transformToPOIs(places);
    fs.writeFileSync('pois-output.json', JSON.stringify(pois, null, 2), 'utf-8');
    console.log(`\n✅ ${pois.length} POIs exportés dans pois-output.json`);
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

main();
