// scripts/pois-importer.ts
import 'dotenv/config';
import axios from 'axios';
import OpenAI from 'openai';
import * as fs from 'fs';

// ===== CONFIG =====
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CITY = 'Saint-Lô, France';
const RADIUS = 5000;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const CULTURAL_TYPES = [
  'art_gallery',
  'auditorium',
  'performing_arts_theater',
  'historical_place',
  'monument',
  'museum',
  'sculpture',
  // Lieux de culte (monuments religieux historiques)
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
  'place_of_worship',
  // Attractions touristiques
  'tourist_attraction',
  // Parcs (peuvent contenir des monuments, sculptures, jardins historiques)
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
}

// ===== UTILITAIRES =====

// Calcul de distance avec la formule de Haversine
function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371000; // Rayon de la Terre en mètres
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

// Calcule le rayon de base à partir du viewport
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

  return {
    openingHours,
    viewport,
    baseRadiusMeters
  };
}

// Vérifie si un lieu est pertinent selon ses types
function isRelevantPlace(placeTypes: string[]): boolean {
  // Inclure si le lieu a au moins un type culturel recherché
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

  // Dédupliquer par place_id
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(p => [p.place_id, p])).values()
  );

  console.log(`📊 ${uniquePlaces.length} lieux bruts trouvés`);

  // Filtrer pour ne garder que les lieux culturels pertinents
  const filteredPlaces = uniquePlaces.filter((place: any) => {
    const isRelevant = isRelevantPlace(place.types || []);
    if (!isRelevant) {
      console.log(`   ❌ Filtré: ${place.name} (types: ${place.types?.join(', ')})`);
    }
    return isRelevant;
  });

  console.log(`✅ ${filteredPlaces.length} lieux culturels après filtrage`);
  console.log(`📋 Récupération des détails (horaires, viewport)...`);

  // Enrichir chaque lieu avec les détails (horaires + viewport)
  const enrichedPlaces = [];
  for (let i = 0; i < filteredPlaces.length; i++) {
    const place = filteredPlaces[i];
    console.log(`   📍 ${i + 1}/${filteredPlaces.length}: ${place.name}`);

    try {
      const details = await fetchPlaceDetails(place.place_id);
      enrichedPlaces.push({
        ...place,
        details
      });
      // Rate limiting pour éviter les erreurs 429
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`   ⚠️ Impossible de récupérer les détails pour ${place.name}`);
      // On garde le lieu même sans détails
      enrichedPlaces.push({
        ...place,
        details: { openingHours: null, viewport: null, baseRadiusMeters: null }
      });
    }
  }

  console.log(`✅ Détails récupérés pour ${enrichedPlaces.length} lieux`);
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
  const openingHoursText = openingHours
    ? openingHours.join('\n')
    : 'Non disponibles';

  const radiusInfo = baseRadiusMeters
    ? `${baseRadiusMeters} mètres (calculé depuis le viewport Google)`
    : 'Non disponible';

  const prompt = `Tu es un expert en classification de lieux culturels et touristiques.

Voici un lieu à analyser :
- Nom : ${name}
- Types Google : ${types.join(', ')}
- Adresse : ${vicinity}
- Horaires d'ouverture :
${openingHoursText}
- Rayon viewport suggéré : ${radiusInfo}

=== TÂCHES ===

1. **Catégories** : Assigne 1 ou 2 catégories parmi : ${GAME_CATEGORIES.join(', ')}
   - Art : musées d'art, galeries, théâtres, auditoriums
   - Nature : jardins botaniques, parcs remarquables, aquariums, zoos
   - Science : musées scientifiques, planétariums, observatoires
   - Histoire : monuments historiques, châteaux, sites archéologiques, mémoriaux
   - Savoir-faire : musées d'artisanat, du vin, de l'industrie
   - Société : lieux de culte, bibliothèques, centres culturels

2. **Accessibilité publique** : Détermine si ce lieu est un LIEU CULTUREL visitable.
   - Un lieu est "visitable" s'il a un intérêt culturel, historique ou artistique ET accueille des visiteurs

   **IMPORTANT pour les parcs** :
   - Un parc est culturel SI il contient un monument, mémorial, sculpture, jardin historique, ou site remarquable
   - Exemples de parcs CULTURELS : "Monument des Fusillés", "Jardin des Tuileries", parc avec statue historique
   - Exemples de parcs NON CULTURELS : parcs de jeux pour enfants, squares ordinaires, espaces verts sans intérêt particulier

   - Exemples visitables : musées, monuments, églises historiques, mémoriaux, jardins remarquables
   - Exemples NON visitables : bureaux administratifs, parcs ordinaires sans intérêt culturel, bâtiments privés

3. **Type d'accès** : Si visitable, indique si c'est "payant", "gratuit" ou "inconnu"

4. **Rayon d'action** : Estime le rayon d'attraction du lieu en mètres.
   - Utilise le rayon viewport comme base si disponible
   - Ajuste selon la notoriété et l'importance du lieu :
     * Sculpture / petite galerie locale → 100-200m
     * Petit musée local → viewport ou 100-500m
     * Musée moyen / auditorium régional → viewport ou 500-2000m
     * Monument majeur / grand musée → viewport × 1.5-2 ou 2000-5000m
     * Site exceptionnel (Versailles, Louvre) → viewport × 2-3 ou 5000-15000m

=== FORMAT DE RÉPONSE (JSON uniquement) ===
{
  "categories": ["Catégorie1", "Catégorie2"],
  "reasoning": "courte explication de la classification",
  "isPubliclyAccessible": true,
  "accessType": "payant",
  "radiusMeters": 500
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.1-2025-11-13',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant spécialisé dans la classification et l\'analyse de lieux culturels. Tu réponds uniquement en JSON valide. Tu es rigoureux dans ton analyse de l\'accessibilité publique des lieux.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_completion_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content;

  if (!content || content.trim() === '') {
    throw new Error('Empty response from API');
  }

  try {
    const parsed = JSON.parse(content);
    return {
      categories: parsed.categories || [],
      reasoning: parsed.reasoning || '',
      isPubliclyAccessible: parsed.isPubliclyAccessible ?? true,
      accessType: parsed.accessType || 'inconnu',
      radiusMeters: parsed.radiusMeters || baseRadiusMeters || 500
    };
  } catch (error) {
    console.log(`⚠️  JSON invalide: ${content}`);
    throw new Error(`Invalid JSON: ${content}`);
  }
}

// ===== ÉTAPE 4 : Transformation finale =====
async function transformToPOIs(places: any[]): Promise<POIOutput[]> {
  const pois: POIOutput[] = [];
  let excludedCount = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const details: PlaceDetails = place.details || {
      openingHours: null,
      viewport: null,
      baseRadiusMeters: null
    };

    console.log(`🤖 Analyse ${i + 1}/${places.length}: ${place.name}`);

    let aiResult: AICategorizationResult | null = null;
    let retries = 3;

    while (retries > 0 && !aiResult) {
      try {
        aiResult = await categorizePOI(
          place.name,
          place.types,
          place.vicinity,
          details.openingHours,
          details.baseRadiusMeters
        );

        // Filtrer les lieux non accessibles au public
        if (!aiResult.isPubliclyAccessible) {
          console.log(`   🚫 Exclu (non visitable par le public)`);
          excludedCount++;
          break;
        }

        const isMuseum = place.types.some((t: string) =>
          ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t)
        );

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
          openingHours: details.openingHours
        });

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`   ⏳ Réessai (${3 - retries}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Échec définitif pour ${place.name}: ${errorMessage}`);
        }
      }
    }
  }

  console.log(`\n📊 Résumé du filtrage: ${excludedCount} lieux exclus (non visitables)`);
  return pois;
}

// ===== MAIN =====
async function main() {
  try {
    console.log('🚀 Démarrage du script d\'import...\n');
    
    const coords = await getCityCoordinates(CITY);
    const places = await fetchCulturalPlaces(coords.lat, coords.lng);
    const pois = await transformToPOIs(places);
    
    fs.writeFileSync(
      'pois-output.json',
      JSON.stringify(pois, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ ${pois.length} POIs exportés dans pois-output.json`);
    
    const museums = pois.filter(p => p.type === 'museum').length;
    const poisCount = pois.filter(p => p.type === 'poi').length;
    console.log(`   📊 ${museums} museums | ${poisCount} POIs`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

main();