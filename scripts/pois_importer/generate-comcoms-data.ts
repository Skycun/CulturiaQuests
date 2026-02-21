/**
 * generate-comcoms-data.ts
 * Génère le fichier de référence des Communautés de Communes (EPCI) via l'API Géo Gouv.
 * Version améliorée : Stocke la liste des communes pour un scan précis (pas de BBox globale).
 *
 * Usage: npx tsx generate-comcoms-data.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== INTERFACES =====
interface CommuneEntry {
  code: string;
  nom: string;
  lat: number;
  lng: number;
  // On peut ajouter la surface si l'API le donne, sinon on fera une estimation de rayon par défaut
  surface?: number; 
}

interface EpciEntry {
  code: string;
  nom: string;
  communesCount: number;
  communes: CommuneEntry[];
}

interface DepartmentEntry {
  code: string;
  nom: string;
  region: string;
  epci: EpciEntry[];
}

interface ComcomsData {
  generated: string;
  source: string;
  stats: { departments: number; epci: number; communes: number };
  departments: DepartmentEntry[];
}

// ===== API GOUV =====
const API_GEO = 'https://geo.api.gouv.fr';

async function fetchFromApi(endpoint: string) {
  try {
    const res = await axios.get(`${API_GEO}${endpoint}`);
    return res.data;
  } catch (e: any) {
    return [];
  }
}

// ===== MAIN =====
async function main() {
  console.log('🌍 Génération de la base de données EPCI détaillée (via geo.api.gouv.fr)...\n');

  // 1. Récupérer les Départements
  process.stdout.write('   Chargement des départements... ');
  const deptsRaw = await fetchFromApi('/departements?fields=code,nom,region');
  const deptsMap = new Map<string, { nom: string; region: string }>();
  deptsRaw.forEach((d: any) => deptsMap.set(d.code, { nom: d.nom, region: d.region?.nom || 'Inconnue' }));
  console.log(`✅ ${deptsRaw.length} départements.`);

  // 2. Récupérer TOUS les EPCIs d'un coup
  process.stdout.write('   Chargement de la liste des EPCIs... ');
  const allEpcis = await fetchFromApi('/epcis?fields=code,nom');
  console.log(`✅ ${allEpcis.length} EPCIs trouvés.`);

  const deptsContent = new Map<string, EpciEntry[]>();
  let totalCommunes = 0;
  let processed = 0;

  console.log('\n   Traitement détaillé (récupération des communes)...');

  const BATCH_SIZE = 20;
  for (let i = 0; i < allEpcis.length; i += BATCH_SIZE) {
    const batch = allEpcis.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (epci: any) => {
      // Récupérer les communes membres de l'EPCI avec leur centre et surface
      const communes = await fetchFromApi(`/epcis/${epci.code}/communes?fields=code,nom,departement,centre,surface`);
      
      if (communes.length === 0) return;

      const communeEntries: CommuneEntry[] = communes.map((c: any) => ({
        code: c.code,
        nom: c.nom,
        lat: c.centre.coordinates[1],
        lng: c.centre.coordinates[0],
        surface: c.surface // en hectares (parfois absent)
      }));

      const entry: EpciEntry = {
        code: epci.code,
        nom: epci.nom,
        communesCount: communes.length,
        communes: communeEntries
      };

      // Rattacher l'EPCI au département majoritaire
      const deptCode = communes[0].departement?.code;
      if (deptCode) {
        if (!deptsContent.has(deptCode)) deptsContent.set(deptCode, []);
        deptsContent.get(deptCode)!.push(entry);
      }

      totalCommunes += communes.length;
    }));

    processed += batch.length;
    process.stdout.write(`\r   Progression : ${Math.round((processed / allEpcis.length) * 100)}% (${processed}/${allEpcis.length})`);
    
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n   Construction finale...');

  const departmentsData: DepartmentEntry[] = [];
  const sortedDeptCodes = [...deptsContent.keys()].sort();

  for (const code of sortedDeptCodes) {
    const deptInfo = deptsMap.get(code) || { nom: `Dept ${code}`, region: 'Inconnue' };
    const epciList = deptsContent.get(code)!;

    departmentsData.push({
      code: code,
      nom: deptInfo.nom,
      region: deptInfo.region,
      epci: epciList.sort((a, b) => a.nom.localeCompare(b.nom))
    });
  }

  const output: ComcomsData = {
    generated: new Date().toISOString(),
    source: 'geo.api.gouv.fr',
    stats: { 
      departments: departmentsData.length, 
      epci: allEpcis.length, 
      communes: totalCommunes 
    },
    departments: departmentsData,
  };

  const outPath = path.join(__dirname, 'comcoms-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const sizeMo = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ comcoms-data.json généré (${sizeMo} Mo)`);
}

main().catch(console.error);
