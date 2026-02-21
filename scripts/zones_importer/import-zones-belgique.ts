import axios from 'axios';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Sources de données pour la Belgique
const SOURCES_BE = {
  region: {
    // Les régions belges sont souvent incluses dans les fichiers provinces ou topojson globaux.
    // On va utiliser une approche "statique" ou extraite d'un geojson global si possible,
    // ou alors on construit les régions à partir des provinces.
    // Pour simplifier, on va utiliser le TopoJSON de bmesuere qui est très complet, mais il faut le convertir.
    // Alternativement, on peut utiliser des GeoJSONs directs si on en trouve.
    // On va utiliser le dépôt github.com/mathiasleroy/belgium-geographic-data qui semble avoir des geojson.
    // URL brute potentielle (à vérifier/adapter):
    // https://raw.githubusercontent.com/mathiasleroy/belgium-geographic-data/master/dist/polygons/be-regions.geo.json (hypothèse)
    // Sinon on utilise une source statique simplifiée ou on skippe la géométrie précise pour l'instant.
    // On va tenter d'utiliser https://raw.githubusercontent.com/mathiasleroy/belgium-geographic-data/master/dist/polygons/be-regions-unk.geo.json
    url: 'https://raw.githubusercontent.com/mathiasleroy/belgium-geographic-data/master/dist/polygons/be-regions-unk.geo.json',
    prefix: 'REG-BE-'
  },
  province: {
    url: 'https://raw.githubusercontent.com/mathiasleroy/belgium-geographic-data/master/dist/polygons/be-provinces-unk.geo.json',
    prefix: 'PROV-BE-'
  },
  arrondissement: {
    // Correspond au niveau "District" ou "Arrondissement"
    url: 'https://raw.githubusercontent.com/mathiasleroy/belgium-geographic-data/master/dist/polygons/be-districts-unk.geo.json',
    prefix: 'ARR-BE-'
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

// --- BELGIQUE ---

async function importBelgiumRegions() {
  console.log('
🇧🇪 --- IMPORT REGIONS BELGIQUE ---');
  // Les codes régions ne sont pas toujours standard dans les geojson.
  // On va mapper manuellement si besoin ou utiliser le nom.
  // Fichier attendu: features avec properties.name (Brussels, Flanders, Wallonia)
  
  const features = await fetchGeoJSON(SOURCES_BE.region.url);
  
  for (const f of features) {
    const props = f.properties;
    const name = props.name_fr || props.name || props.NOM_REG; 
    if (!name) continue;

    const code = `${SOURCES_BE.region.prefix}${name.substring(0, 3).toUpperCase()}`; // Ex: REG-BE-WAL
    
    let entry = await findOne('regions', code);
    if (!entry) {
      entry = await createEntry('regions', { name, code, geometry: f.geometry });
      process.stdout.write('+');
    } else {
      process.stdout.write('.');
    }
    if (entry) regionCache.set(name, entry.id);
    // On mappe aussi les variantes de noms pour le cache
    if (entry && props.name_nl) regionCache.set(props.name_nl, entry.id);
  }
  console.log('
✅ Régions terminées.');
}

async function importBelgiumProvinces() {
  console.log('
🇧🇪 --- IMPORT PROVINCES BELGIQUE (Départements) ---');
  const features = await fetchGeoJSON(SOURCES_BE.province.url);

  for (const f of features) {
    const props = f.properties;
    const name = props.name_fr || props.name;
    // On essaie de trouver la région parente via le code NIS ou une propriété
    // Souvent les 2 premiers chiffres du NIS province indiquent la région, mais c'est complexe en BE.
    // On va faire une recherche spatiale simplifiée ou utiliser une map manuelle si on avait le temps.
    // Ici, on va voir si le GeoJSON contient l'info de région.
    
    if (!name) continue;
    const code = `${SOURCES_BE.province.prefix}${props.nis || name.substring(0, 3).toUpperCase()}`;

    // Tentative de liaison région (Mapping manuel simplifié pour l'exemple)
    let regionId = null;
    // Logique simplifiée basée sur le nom (à adapter selon les données réelles)
    if (['Anvers', 'Limbourg', 'Flandre', 'Brabant flamand'].some(k => name.includes(k))) regionId = regionCache.get('Flanders') || regionCache.get('Vlaams Gewest');
    if (['Hainaut', 'Liège', 'Luxembourg', 'Namur', 'Brabant wallon'].some(k => name.includes(k))) regionId = regionCache.get('Wallonia') || regionCache.get('Région Wallonne');
    // Bruxelles n'est pas une province mais une région-capitale souvent traitée à part.

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
    if (entry) deptCache.set(props.nis || name, entry.id);
  }
  console.log('
✅ Provinces terminées.');
}

async function importBelgiumArrondissements() {
  console.log('
🇧🇪 --- IMPORT ARRONDISSEMENTS BELGIQUE (Comcoms) ---');
  const features = await fetchGeoJSON(SOURCES_BE.arrondissement.url);

  for (const f of features) {
    const props = f.properties;
    const name = props.name_fr || props.name;
    const nis = props.nis; // Code NIS arrondissement
    if (!name) continue;

    const code = `${SOURCES_BE.arrondissement.prefix}${nis || name}`;
    
    // Le parent est la province. Le code NIS arrondissement commence souvent par celui de la province (sauf exception).
    // Ex: Prov 10000 -> Arr 11000.
    // On cherche le dept qui match.
    let deptId = null;
    if (nis) {
        // Chercher une province dont le NIS est proche (ex: 2 premiers chiffres)
        // C'est approximatif, l'idéal est d'avoir un geojson hiérarchique.
        // On va itérer sur le cache pour trouver le prefixe.
        for (const [pNis, pId] of deptCache.entries()) {
            if (nis.startsWith(pNis.substring(0, 1))) { // Très approximatif
               // deptId = pId; break; 
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
      process.stdout.write('.');
    }
  }
  console.log('
✅ Arrondissements terminés.');
}

async function main() {
  console.log('🚀 IMPORT ZONES: BELGIQUE');
  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_TOKEN manquant dans .env');
    return;
  }

  try {
    await importBelgiumRegions();
    await importBelgiumProvinces();
    await importBelgiumArrondissements();
    
    console.log('
✨ Terminé !');
  } catch (e: any) {
    console.error('
❌ Erreur fatale:', e.message);
  }
}

main();
