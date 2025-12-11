// scripts/pois-importer.ts
import 'dotenv/config';
import axios from 'axios';
import OpenAI from 'openai';
import * as fs from 'fs';

// ===== CONFIG =====
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CITY = 'Granville, France';
const RADIUS = 5000;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const CULTURAL_TYPES = [
  'museum',
  'art_gallery',
  'tourist_attraction',
  'library',
  'church',
  'synagogue',
  'hindu_temple',
  'mosque'
];

const GAME_CATEGORIES = ['Art', 'Nature', 'Science', 'Histoire', 'Savoir-faire', 'Société'];

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
  
  console.log(`✅ ${uniquePlaces.length} lieux uniques trouvés`);
  return uniquePlaces;
}

// ===== ÉTAPE 3 : Catégoriser avec GPT-5 mini =====
async function categorizePOI(name: string, types: string[], vicinity: string) {
  const prompt = `Tu es un expert en classification de lieux culturels.

Voici un lieu :
- Nom : ${name}
- Types Google : ${types.join(', ')}
- Adresse : ${vicinity}

Assigne-lui 1 ou 2 catégories parmi : ${GAME_CATEGORIES.join(', ')}

Règles :
- Art : musées d'art, galeries, théâtres
- Nature : jardins, parcs, aquariums, zoos
- Science : musées scientifiques, planétariums, observatoires
- Histoire : monuments historiques, châteaux, sites archéologiques
- Savoir-faire : musées d'artisanat, du vin, de l'industrie
- Société : lieux de culte, bibliothèques, centres culturels

Réponds UNIQUEMENT au format JSON :
{"categories": ["Catégorie1"], "reasoning": "courte explication"}

ou si 2 catégories :
{"categories": ["Catégorie1", "Catégorie2"], "reasoning": "courte explication"}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini-2025-08-07',
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant spécialisé dans la classification de lieux culturels. Tu réponds uniquement en JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_completion_tokens: 1000, // ✅ Augmenté de 200 à 1000 (raisonnement + réponse)
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content || content.trim() === '') {
    throw new Error('Empty response from API');
  }
  
  try {
    return JSON.parse(content);
  } catch (error) {
    console.log(`⚠️  JSON invalide: ${content}`);
    throw new Error(`Invalid JSON: ${content}`);
  }
}

// ===== ÉTAPE 4 : Transformation finale =====
async function transformToPOIs(places: any[]) {
  const pois = [];
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    console.log(`🤖 Catégorisation ${i + 1}/${places.length}: ${place.name}`);
    
    let aiResult = null;
    let retries = 3;
    
    while (retries > 0 && !aiResult) {
      try {
        aiResult = await categorizePOI(
          place.name,
          place.types,
          place.vicinity
        );
        
        const isMuseum = place.types.some(t => 
          ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t)
        );
        
        pois.push({
          name: place.name,
          description: `${place.vicinity} - ${aiResult.reasoning}`,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          type: isMuseum ? 'museum' : 'poi',
          categories: aiResult.categories,
          rating: place.rating || null
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`   ⏳ Réessai (${3 - retries}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error(`❌ Échec définitif pour ${place.name}: ${error.message}`);
        }
      }
    }
  }
  
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