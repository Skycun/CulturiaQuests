/**
 * generate-comcoms-data.ts
 * Extrait les EPCIs (communautés de communes / agglomérations) depuis le fichier INSEE
 * et génère un fichier compact comcoms-data.json utilisé par comcom-import.ts
 *
 * Usage: npx tsx generate-comcoms-data.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== INTERFACES =====
interface EpciEntry {
  code: string;
  nom: string;
  communes: number;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
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

// ===== MAIN =====
async function main() {
  const sourceFile = 'communes-france-avec-polygon-2025.json';
  const sourcePath = path.join(__dirname, sourceFile);

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Fichier source introuvable: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`📂 Lecture de ${sourceFile} (60MB)...`);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const { data } = JSON.parse(raw) as { data: Record<string, string>[] };
  console.log(`   ${data.length} communes chargées`);

  // --- Regrouper par EPCI ---
  const epciMap = new Map<string, {
    nom: string;
    dep_code: string;
    dep_nom: string;
    reg_nom: string;
    lats: number[];
    lngs: number[];
  }>();

  let skippedNoEpci = 0;
  let skippedNoCoords = 0;

  for (const c of data) {
    if (!c.epci_code) { skippedNoEpci++; continue; }

    const lat = parseFloat(c.latitude_centre);
    const lng = parseFloat(c.longitude_centre);
    if (isNaN(lat) || isNaN(lng)) { skippedNoCoords++; continue; }

    if (!epciMap.has(c.epci_code)) {
      epciMap.set(c.epci_code, {
        nom: c.epci_nom,
        dep_code: c.dep_code,
        dep_nom: c.dep_nom,
        reg_nom: c.reg_nom,
        lats: [],
        lngs: [],
      });
    }

    const entry = epciMap.get(c.epci_code)!;
    entry.lats.push(lat);
    entry.lngs.push(lng);
  }

  console.log(`   ${epciMap.size} EPCIs extraits`);
  if (skippedNoEpci) console.log(`   ⚠️  ${skippedNoEpci} communes sans EPCI ignorées`);
  if (skippedNoCoords) console.log(`   ⚠️  ${skippedNoCoords} communes sans coordonnées ignorées`);

  // --- Regrouper par département ---
  const deptMap = new Map<string, DepartmentEntry>();

  for (const [code, epci] of epciMap) {
    if (!deptMap.has(epci.dep_code)) {
      deptMap.set(epci.dep_code, { code: epci.dep_code, nom: epci.dep_nom, region: epci.reg_nom, epci: [] });
    }

    deptMap.get(epci.dep_code)!.epci.push({
      code,
      nom: epci.nom,
      communes: epci.lats.length,
      bbox: {
        minLat: parseFloat(Math.min(...epci.lats).toFixed(5)),
        maxLat: parseFloat(Math.max(...epci.lats).toFixed(5)),
        minLng: parseFloat(Math.min(...epci.lngs).toFixed(5)),
        maxLng: parseFloat(Math.max(...epci.lngs).toFixed(5)),
      },
    });
  }

  // --- Trier : départements par code, EPCIs par nom ---
  const departments: DepartmentEntry[] = [...deptMap.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(d => ({ ...d, epci: d.epci.sort((a, b) => a.nom.localeCompare(b.nom)) }));

  const totalEpci = departments.reduce((sum, d) => sum + d.epci.length, 0);
  const totalCommunes = [...epciMap.values()].reduce((sum, e) => sum + e.lats.length, 0);

  // --- Écrire la sortie ---
  const output: ComcomsData = {
    generated: new Date().toISOString(),
    source: sourceFile,
    stats: { departments: departments.length, epci: totalEpci, communes: totalCommunes },
    departments,
  };

  const outPath = path.join(__dirname, 'comcoms-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const sizeMo = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);

  console.log(`\n✅ comcoms-data.json généré (${sizeMo} Mo)`);
  console.log(`   ${departments.length} départements | ${totalEpci} EPCIs | ${totalCommunes} communes`);
  console.log(`\n📍 Aperçu par région:`);

  // Afficher un résumé par département
  for (const d of departments) {
    console.log(`   [${d.code}] ${d.nom} — ${d.epci.length} EPCI`);
  }
}

main();
