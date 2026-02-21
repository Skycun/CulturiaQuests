/**
 * sync-state.ts
 * Script de synchronisation de l'état d'import (import-state.json)
 * à partir des données réellement présentes dans la base Strapi.
 *
 * Usage: npx tsx sync-state.ts
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement des variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import types and helpers
import { 
  ComcomsData, saveImportState, ImportState, DepartmentEntry,
  STRAPI_BASE_URL, STRAPI_API_TOKEN 
} from './utils';

async function fetchAllItems(endpoint: string) {
  const items: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    try {
      // Strapi v5: populate=* or populate[comcom][fields][0]=name
      const res = await axios.get(`${STRAPI_BASE_URL}/api/${endpoint}`, {
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
        params: {
          'pagination[page]': page,
          'pagination[pageSize]': pageSize,
          'populate[comcom][fields][0]': 'name' // On veut juste le nom de la comcom
        }
      });

      const data = res.data.data;
      if (!data || data.length === 0) break;

      items.push(...data);
      
      const meta = res.data.meta;
      if (page >= meta.pagination.pageCount) break;
      
      page++;
      process.stdout.write('.');
    } catch (e: any) {
      console.error(`Error fetching ${endpoint} page ${page}:`, e.message);
      break;
    }
  }
  return items;
}

async function main() {
  console.log("🔄 Synchronisation de l'état d'import depuis Strapi...\n");

  if (!STRAPI_API_TOKEN) {
    console.error('❌ Erreur: STRAPI_API_TOKEN manquant dans .env');
    process.exit(1);
  }

  // 1. Charger les données de référence (Comcoms Data)
  const dataPath = path.join(__dirname, 'comcoms-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error("❌ comcoms-data.json introuvable. Lancez generate-comcoms-data.ts d'abord.");
    process.exit(1);
  }
  const comcomsData: ComcomsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Créer une Map pour retrouver rapidement les infos d'un EPCI par son NOM
  // Map<Nom_EPCI, { epciCode, deptCode, deptNom }>
  const epciMap = new Map<string, { epciCode: string, deptCode: string, deptNom: string }>();

  for (const dept of comcomsData.departments) {
    for (const epci of dept.epci) {
      epciMap.set(epci.nom, { epciCode: epci.code, deptCode: dept.code, deptNom: dept.nom });
    }
  }

  // 2. Récupérer les données Strapi
  process.stdout.write('   Récupération des POIs ');
  const pois = await fetchAllItems('pois');
  console.log(` ✅ ${pois.length}`);

  process.stdout.write('   Récupération des Musées ');
  const museums = await fetchAllItems('museums');
  console.log(` ✅ ${museums.length}`);

  const allItems = [...pois, ...museums];

  // 3. Compter par ComCom
  const stats = new Map<string, number>(); // NomComcom -> Count

  for (const item of allItems) {
    const comcomName = item.comcom?.name;
    if (comcomName) {
      stats.set(comcomName, (stats.get(comcomName) || 0) + 1);
    }
  }

  console.log(`\n📊 ${stats.size} Communautés de communes trouvées en base.`);

  // 4. Construire le State
  const newState: ImportState = {
    last_updated: new Date().toISOString(),
    departments: {}
  };

  let syncedCount = 0;
  let unknownCount = 0;

  for (const [comcomName, count] of stats.entries()) {
    const info = epciMap.get(comcomName);
    
    if (info) {
      // Init Dept if needed
      if (!newState.departments[info.deptCode]) {
        newState.departments[info.deptCode] = {
          code: info.deptCode,
          nom: info.deptNom,
          status: 'partial',
          epci: {}
        };
      }

      // Add EPCI info
      newState.departments[info.deptCode].epci[info.epciCode] = {
        nom: comcomName,
        status: 'done',
        last_scan: new Date().toISOString(),
        pois_found: count
      };
      
      syncedCount++;
    } else {
        // Cas où le nom dans Strapi ne matche pas exactement comcoms-data.json
        // Ou importé manuellement sans lien comcom correct
        unknownCount++;
        // console.log(`⚠️  Inconnu: "${comcomName}"`);
    }
  }

  // Vérifier les départements complets
  for (const deptCode in newState.departments) {
    const stateDept = newState.departments[deptCode];
    // Retrouver le Dept original pour savoir combien d'EPCI il a au total
    const refDept = comcomsData.departments.find(d => d.code === deptCode);
    
    if (refDept && Object.keys(stateDept.epci).length >= refDept.epci.length) {
      stateDept.status = 'done';
    }
  }

  // 5. Sauvegarder
  saveImportState(newState);

  console.log(`\n✅ Synchronisation terminée !`);
  console.log(`   EPCIs synchronisés : ${syncedCount}`);
  if (unknownCount > 0) console.log(`   EPCIs non reconnus (noms différents ?) : ${unknownCount}`);
  console.log(`   Fichier mis à jour : scripts/pois_importer/import-state.json`);
}

main().catch(console.error);
