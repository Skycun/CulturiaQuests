import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Sources de données (Karavia - Swiss Boundaries 3D - GeoJSON)
// Note: Si ces URLs ne sont pas stables, télécharger les fichiers localement depuis https://labs.karavia.ch/swiss-boundaries-geojson/
const SOURCES = {
  canton: {
    url: 'https://labs.karavia.ch/swiss-boundaries-geojson/swissBOUNDARIES3D_1_3_TLM_KANTONSGEBIET.geojson',
    prefix: 'CAN-' // Pour le code Strapi (ex: CAN-12)
  },
  district: {
    url: 'https://labs.karavia.ch/swiss-boundaries-geojson/swissBOUNDARIES3D_1_3_TLM_BEZIRKSGEBIET.geojson',
    prefix: 'DIS-' // Pour le code Strapi (ex: DIS-101)
  }
};

// Mapping Canton ID (1-26) -> Grande Région (NUTS 2)
// Source: Office fédéral de la statistique (OFS)
const REGIONS_DEF = {
  'Région lémanique': [23, 24, 22], // VS(23), NE(24), GE(25)? Non, IDs standard: VD(22), VS(23), GE(25) -> check IDs below
  'Espace Mittelland': [2, 10, 11, 13, 26], // BE(2), FR(10), SO(11), NE(24)?, JU(26)
  'Nordwestschweiz': [12, 19, 20], // BS(12), BL(13)?, AG(19) -> IDs standards:
  'Zürich': [1], // ZH(1)
  'Ostschweiz': [8, 14, 15, 16, 17, 18, 20], // GL, SH, AR, AI, SG, GR, TG
  'Zentralschweiz': [3, 4, 5, 6, 7, 9], // LU, UR, SZ, OW, NW, ZG
  'Ticino': [21] // TI(21)
};

// Standard Swiss Canton IDs (BFS/OFS Number)
// 1: ZH, 2: BE, 3: LU, 4: UR, 5: SZ, 6: OW, 7: NW, 8: GL, 9: ZG, 10: FR, 11: SO, 12: BS, 13: BL, 14: SH, 15: AR, 16: AI, 17: SG, 18: GR, 19: AG, 20: TG, 21: TI, 22: VD, 23: VS, 24: NE, 25: GE, 26: JU
const CANTON_ID_TO_REGION = new Map<number, string>();

// Helper pour inverser le mapping
function buildRegionMap() {
  // Définition correcte des IDs (BFS)
  // Region Lemanique: VD(22), VS(23), GE(25)
  // Espace Mittelland: BE(2), FR(10), SO(11), NE(24), JU(26)
  // Nordwestschweiz: BS(12), BL(13), AG(19)
  // Zürich: ZH(1)
  // Ostschweiz: GL(8), SH(14), AR(15), AI(16), SG(17), GR(18), TG(20)
  // Zentralschweiz: LU(3), UR(4), SZ(5), OW(6), NW(7), ZG(9)
  // Ticino: TI(21)
  
  const regions = {
    'Région lémanique': [22, 23, 25],
    'Espace Mittelland': [2, 10, 11, 24, 26],
    'Nordwestschweiz': [12, 13, 19],
    'Zürich': [1],
    'Ostschweiz': [8, 14, 15, 16, 17, 18, 20],
    'Zentralschweiz': [3, 4, 5, 6, 7, 9],
    'Ticino': [21]
  };

  for (const [regionName, cantonIds] of Object.entries(regions)) {
    for (const id of cantonIds) {
      CANTON_ID_TO_REGION.set(id, regionName);
    }
  }
}

// Cache pour stocker les IDs Strapi
const regionCache = new Map<string, number>(); // Nom Région -> ID Strapi
const cantonCache = new Map<number, number>(); // BFS ID -> ID Strapi

async function fetchGeoJSON(url: string) {
  console.log(`📥 Téléchargement de ${url}...`);
  try {
    const { data } = await axios.get(url, { 
      maxContentLength: 100 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CulturiaQuestsBot/1.0)' } // Avoid 403
    });
    return data.features;
  } catch (e: any) {
    console.error(`⚠️ Erreur lors du téléchargement de ${url}: ${e.message}`);
    if (e.response?.status === 404) {
       console.error("   -> Vérifiez que l'URL est correcte ou téléchargez le fichier localement.");
    }
    throw e;
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
  console.log('
--- 1. IMPORT REGIONS (Grandes Régions) ---');
  buildRegionMap();
  
  // Liste unique des régions
  const regionNames = Array.from(new Set(CANTON_ID_TO_REGION.values()));
  
  let count = 0;
  for (const name of regionNames) {
    // Code généré : REG-CH-LEMAN, REG-CH-ZURICH, etc. ou simple slug
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[éè]/g, 'e').replace(/ü/g, 'u');
    const code = `REG-CH-${slug.toUpperCase()}`;

    // On n'a pas de géométrie précise pour les grandes régions dans cette source, 
    // on laisse null (ou on pourrait merger les cantons si on avait Turf.js).
    // Strapi doit autoriser geometry: null.
    
    let entry = await findOne('regions', code);
    if (!entry) {
      entry = await createEntry('regions', {
        name,
        code,
        geometry: null 
      });
      process.stdout.write('+');
      count++;
    } else {
      process.stdout.write('.');
    }
    
    // Store in Cache (Nom -> ID)
    regionCache.set(name, entry.id); 
  }
  console.log(`
✅ ${count} régions ajoutées.`);
}

async function importCantons() {
  console.log('
--- 2. IMPORT CANTONS (Départements) ---');
  const features = await fetchGeoJSON(SOURCES.canton.url);

  let count = 0;
  let updated = 0;
  
  // Inspection des propriétés du premier élément pour debug
  if (features.length > 0) {
    console.log('ℹ️  Propriétés du premier canton:', JSON.stringify(features[0].properties, null, 2));
  }

  for (const f of features) {
    // Adapter selon les propriétés réelles du GeoJSON Karavia
    // Souvent: NAME, KANTONSNUMMER (ID), ou similar
    const props = f.properties;
    const name = props.NAME || props.kan_name || props.name;
    const bfsId = props.KANTONSNUMMER || props.kan_nr || props.id; // ID Numérique (1-26)
    
    if (!name || !bfsId) {
      console.warn('⚠️ Canton ignoré (données manquantes):', props);
      continue;
    }

    const code = `${SOURCES.canton.prefix}${bfsId}`;

    // Trouver la région parente
    const regionName = CANTON_ID_TO_REGION.get(parseInt(bfsId));
    const regionId = regionName ? regionCache.get(regionName) : null;
    
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
      if (regionId) {
        await updateEntry('departments', entry, { region: regionId });
        process.stdout.write('u');
        updated++;
      } else {
        process.stdout.write('.');
      }
    }
    cantonCache.set(parseInt(bfsId), entry.id);
  }
  console.log(`
✅ ${count} cantons ajoutés | ${updated} mis à jour.`);
}

async function importDistricts() {
  console.log('
--- 3. IMPORT DISTRICTS (Comcoms) ---');
  const features = await fetchGeoJSON(SOURCES.district.url);

  let count = 0;
  let updated = 0;

  if (features.length > 0) {
    console.log('ℹ️  Propriétés du premier district:', JSON.stringify(features[0].properties, null, 2));
  }

  for (const f of features) {
    const props = f.properties;
    const name = props.NAME || props.bez_name || props.name;
    const id = props.BEZIRKSNUMMER || props.bez_nr || props.id;
    const parentCantonId = props.KANTONSNUMMER || props.kan_nr;

    if (!name || !id) {
       continue;
    }

    const code = `${SOURCES.district.prefix}${id}`;
    
    // Trouver le Canton (Département) parent
    const deptId = parentCantonId ? cantonCache.get(parseInt(parentCantonId)) : null;

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
      if (deptId) {
        await updateEntry('comcoms', entry, { department: deptId });
        process.stdout.write('u');
        updated++;
      } else {
        process.stdout.write('.');
      }
    }
  }
  console.log(`
✅ ${count} districts ajoutés | ${updated} mis à jour.`);
}

async function main() {
  console.log('🇨🇭 IMPORT ZONES SUISSE');
  console.log('Structure: Grandes Régions (Region) -> Cantons (Department) -> Districts (Comcom)');

  if (!STRAPI_TOKEN) {
    console.error('❌ Erreur: STRAPI_TOKEN manquant dans .env');
    process.exit(1);
  }

  try {
    await importRegions();
    await importCantons();
    await importDistricts();
    console.log('
✨ Import terminé avec succès !');
  } catch (error: any) {
    console.error('
❌ Erreur fatale:', error.message);
  }
}

main();
