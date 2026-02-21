import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Sources de données pour le Luxembourg
const SOURCES_LU = {
  country: {
    // Le Luxembourg est un petit pays, on peut le considérer comme une "Région" unique dans notre système, ou pas.
    // Pour Strapi "Region", on mettra "Luxembourg (Pays)".
    // On n'a pas forcément besoin de geojson pour le pays entier si on a les districts/cantons.
    name: 'Luxembourg',
    code: 'REG-LU-LUX'
  },
  canton: {
    // Correspond à "Département" dans notre mapping
    // Source officielle 2023
    url: 'https://download.data.public.lu/resources/limites-administratives-du-grand-duche-de-luxembourg/20231123-101528/communes4326.geojson', 
    // ATTENTION: Le lien ci-dessus est pour les COMMUNES. Le lien CANTONS est plus difficile à obtenir en lien direct stable.
    // On va essayer d'utiliser les communes et de les agresser si on ne trouve pas mieux, 
    // OU on utilise une source github tierce fiable pour les cantons.
    // Utilisons https://raw.githubusercontent.com/isellsoap/luxembourg-geojson/master/cantons.geojson (Source tierce commune)
    url_cantons: 'https://raw.githubusercontent.com/isellsoap/luxembourg-geojson/master/cantons.geojson',
    prefix: 'CAN-LU-'
  },
  commune: {
    // Correspond à "Comcom" dans notre mapping
    url: 'https://download.data.public.lu/resources/limites-administratives-du-grand-duche-de-luxembourg/20231123-101528/communes4326.geojson',
    prefix: 'COM-LU-'
  }
};

// Caches
const regionCache = new Map<string, number>();
const deptCache = new Map<string, number>();

async function fetchGeoJSON(url: string) {
  console.log(`📥 Téléchargement de ${url}...`);
  try {
    const { data } = await axios.get(url, { maxContentLength: 100 * 1024 * 1024 });
    return data.features || (data.type === 'FeatureCollection' ? data.features : [data]);
  } catch (e: any) {
    console.error(`⚠️ Erreur téléchargement ${url}: ${e.message}`);
    return [];
  }
}

async function findOne(collection: string, code: string) {
  try {
    const res = await axios.get(`${STRAPI_URL}/api/${collection}`, {
      params: { 'filters[code][$eq]': code },
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    return res.data.data[0];
  } catch (e) {
    return null;
  }
}

async function createEntry(collection: string, data: any) {
  try {
    const res = await axios.post(`${STRAPI_URL}/api/${collection}`, { data }, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    return res.data.data;
  } catch (e: any) {
    const msg = e.response?.data?.error?.message || e.message;
    // Ignorer les erreurs de validation unique si on a raté le check findOne
    if (msg.includes('must be unique')) return null; 
    console.error(`❌ Erreur création ${collection}: ${msg}`);
    return null;
  }
}

async function updateEntry(collection: string, entry: any, data: any) {
  const idToUse = entry.documentId || entry.id;
  try {
    await axios.put(`${STRAPI_URL}/api/${collection}/${idToUse}`, { data }, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
  } catch (e: any) {
    console.error(`Update failed: ${e.message}`);
  }
}

// --- LUXEMBOURG ---

async function importLuxembourg() {
  console.log('
🇱🇺 --- IMPORT LUXEMBOURG ---');
  
  // 1. Créer la Région "Luxembourg (Pays)"
  let regionId = null;
  const regCode = SOURCES_LU.country.code;
  let regionEntry = await findOne('regions', regCode);
  if (!regionEntry) {
    // Géométrie null pour la région globale (ou on pourrait merger les cantons)
    regionEntry = await createEntry('regions', { name: SOURCES_LU.country.name, code: regCode, geometry: null });
    console.log('✅ Région Luxembourg créée.');
  }
  regionId = regionEntry?.id;

  // 2. Cantons (Départements)
  console.log('Test téléchargement Cantons...');
  const cantons = await fetchGeoJSON(SOURCES_LU.canton.url_cantons);
  
  for (const f of cantons) {
    const props = f.properties;
    const name = props.name || props.nom || props.canton; // Adapter selon le geojson
    if (!name) continue;
    
    const code = `${SOURCES_LU.canton.prefix}${name.toUpperCase()}`;
    let entry = await findOne('departments', code);
    
    if (!entry) {
      const payload: any = { name, code, geometry: f.geometry };
      if (regionId) payload.region = regionId;
      entry = await createEntry('departments', payload);
      process.stdout.write('+');
    } else {
      if (regionId) await updateEntry('departments', entry, { region: regionId });
      process.stdout.write('.');
    }
    if (entry) deptCache.set(name, entry.id); // Stocker nom -> id pour lier les communes
  }
  console.log('
✅ Cantons terminés.');

  // 3. Communes (Comcoms)
  console.log('Téléchargement Communes...');
  const communes = await fetchGeoJSON(SOURCES_LU.commune.url);
  
  for (const f of communes) {
    const props = f.properties;
    const name = props.commune || props.nom || props.name;
    const cantonName = props.canton; // Le fichier officiel a souvent cette prop
    
    if (!name) continue;
    
    const code = `${SOURCES_LU.commune.prefix}${name.toUpperCase().replace(/ /g, '-')}`;
    
    let deptId = null;
    if (cantonName) {
        // Le nom du canton dans le fichier communes peut être en majuscule ou différent
        // On essaie de trouver dans le cache (case insensitive)
        for (const [key, val] of deptCache.entries()) {
            if (key.toLowerCase() === cantonName.toLowerCase()) {
                deptId = val;
                break;
            }
        }
    }

    let entry = await findOne('comcoms', code);
    if (!entry) {
      const payload: any = { name, code, geometry: f.geometry };
      if (deptId) payload.department = deptId;
      await createEntry('comcoms', payload);
      process.stdout.write('+');
    } else {
        if (deptId) await updateEntry('comcoms', entry, { department: deptId });
        process.stdout.write('.');
    }
  }
  console.log('
✅ Communes terminées.');
}

async function main() {
  console.log('🚀 IMPORT ZONES: LUXEMBOURG');
  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_TOKEN manquant dans .env');
    return;
  }

  try {
    await importLuxembourg();
    
    console.log('
✨ Terminé !');
  } catch (e: any) {
    console.error('
❌ Erreur fatale:', e.message);
  }
}

main();
