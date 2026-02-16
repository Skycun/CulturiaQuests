import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Sources de données (Etalab - Millésime 2024 - Simplifié 100m)
const SOURCES = {
  region: {
    url: 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/regions-100m.geojson',
    prefix: 'REG-'
  },
  department: {
    url: 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/departements-100m.geojson',
    prefix: 'DEP-'
  },
  comcom: {
    url: 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/epci-100m.geojson',
    prefix: 'EPCI-'
  }
};

// Cache pour stocker les IDs Strapi des parents (Code Externe -> ID Strapi)
// Pour les updates, Strapi v5 préfère documentId, mais les relations 'connect' acceptent souvent l'ID numérique.
// On va stocker l'ID numérique pour la cohérence des relations.
const regionCache = new Map<string, number>();
const deptCache = new Map<string, number>();

// Cache spécifique pour mapper EPCI -> Code Département (via API Geo)
const epciToDeptMap = new Map<string, string>();

async function fetchGeoJSON(url: string) {
  console.log(`📥 Téléchargement de ${url}...`);
  const { data } = await axios.get(url, { maxContentLength: 100 * 1024 * 1024 });
  return data.features;
}

// Récupère le mapping EPCI -> Département depuis l'API Géo
async function buildEpciMapping() {
  console.log('🔄 Récupération du mapping EPCI -> Département (API Géo)...');
  try {
    const { data } = await axios.get('https://geo.api.gouv.fr/epcis?fields=code,codesDepartements');
    for (const item of data) {
      if (item.codesDepartements && item.codesDepartements.length > 0) {
        // On prend le premier département (le principal ou siège souvent)
        epciToDeptMap.set(item.code, item.codesDepartements[0]);
      }
    }
    console.log(`✅ Mapping chargé pour ${epciToDeptMap.size} EPCI.`);
  } catch (e) {
    console.error('⚠️ Impossible de charger le mapping EPCI. Les Comcoms seront orphelines.');
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
    throw new Error(`${collection} creation failed: ${msg}`);
  }
}

async function updateEntry(collection: string, entry: any, data: any) {
  // Strapi v5 uses documentId for updates via API
  const idToUse = entry.documentId || entry.id;
  try {
    const res = await axios.put(`${STRAPI_URL}/api/${collection}/${idToUse}`, { data }, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
    });
    return res.data.data;
  } catch (e: any) {
    console.error(`Update failed for ${collection}/${idToUse}:`, e.response?.status, e.message);
  }
}

async function importRegions() {
  console.log('\n--- 1. IMPORT REGIONS ---');
  const features = await fetchGeoJSON(SOURCES.region.url);
  
  let count = 0;
  for (const f of features) {
    const codeRaw = f.properties.code;
    const name = f.properties.nom;
    const code = `${SOURCES.region.prefix}${codeRaw}`;

    // Check existing
    let entry = await findOne('regions', code);
    if (!entry) {
      entry = await createEntry('regions', {
        name,
        code,
        geometry: f.geometry
      });
      process.stdout.write('+');
      count++;
    } else {
      process.stdout.write('.');
    }
    
    // Store in Cache
    regionCache.set(codeRaw, entry.id); 
  }
  console.log(`\n✅ ${count} régions ajoutées.`);
}

async function importDepartments() {
  console.log('\n--- 2. IMPORT DEPARTMENTS ---');
  const features = await fetchGeoJSON(SOURCES.department.url);

  let count = 0;
  let updated = 0;
  for (const f of features) {
    const codeRaw = f.properties.code; // '14'
    const name = f.properties.nom;
    const regionCodeRaw = f.properties.region; 
    const code = `${SOURCES.department.prefix}${codeRaw}`;

    // Resolve Parent Region
    const regionId = regionCache.get(regionCodeRaw);
    
    let entry = await findOne('departments', code);
    if (!entry) {
      const payload: any = {
        name,
        code,
        geometry: f.geometry
      };
      if (regionId) payload.region = regionId;

      entry = await createEntry('departments', payload);
      process.stdout.write('+');
      count++;
    } else {
      // FORCE UPDATE RELATION if missing (via Update logic)
      if (regionId) {
        await updateEntry('departments', entry, { region: regionId });
        process.stdout.write('u');
        updated++;
      } else {
        process.stdout.write('.');
      }
    }
    deptCache.set(codeRaw, entry.id);
  }
  console.log(`\n✅ ${count} départements ajoutés | ${updated} mis à jour.`);
}

async function importComcoms() {
  console.log('\n--- 3. IMPORT COMCOMS (EPCI) ---');
  console.log(`ℹ️  Taille du cache Départements: ${deptCache.size}`);
  
  // Pre-load mapping
  await buildEpciMapping();

  const features = await fetchGeoJSON(SOURCES.comcom.url);

  let count = 0;
  let updated = 0;
  let debugLogCount = 0;

  for (const f of features) {
    const codeRaw = f.properties.code; 
    const name = f.properties.nom;
    const code = `${SOURCES.comcom.prefix}${codeRaw}`;
    
    // 1. Get Dept Code from Mapping
    const deptCodeRaw = epciToDeptMap.get(codeRaw);
    
    // 2. Get Dept ID from Cache
    let deptId = null;
    if (deptCodeRaw && deptCache.has(deptCodeRaw)) {
      deptId = deptCache.get(deptCodeRaw);
    } else if (debugLogCount < 5) {
       // DEBUG: Log first 5 failures to understand why
       if (!deptCodeRaw) {
         console.log(`\n❓ [DEBUG] EPCI ${name} (${codeRaw}) : Pas de département trouvé dans le mapping API.`);
       } else {
         console.log(`\n❓ [DEBUG] EPCI ${name} (${codeRaw}) : Dept ${deptCodeRaw} trouvé dans map, MAIS absent du Cache (Cache keys ex: ${Array.from(deptCache.keys()).slice(0,3)})`);
       }
       debugLogCount++;
    }

    let entry = await findOne('comcoms', code);
    if (!entry) {
      const payload: any = {
        name,
        code,
        geometry: f.geometry
      };
      if (deptId) payload.department = deptId;

      await createEntry('comcoms', payload);
      process.stdout.write('+');
      count++;
    } else {
      // FORCE UPDATE RELATION if we found a dept
      if (deptId) {
        await updateEntry('comcoms', entry, { department: deptId });
        process.stdout.write('u');
        updated++;
      } else {
        process.stdout.write('.');
      }
    }
  }
  console.log(`\n✅ ${count} comcoms ajoutées | ${updated} mises à jour.`);
}

async function main() {
  console.log('🌍 REFONTE ZONES: Importation Hiérarchique');

  if (!STRAPI_TOKEN) {
    console.error('❌ Erreur: STRAPI_TOKEN manquant dans .env');
    process.exit(1);
  }

  try {
    await importRegions();
    await importDepartments();
    await importComcoms();
    console.log('\n✨ Import terminé avec succès !');
  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
  }
}

main();
