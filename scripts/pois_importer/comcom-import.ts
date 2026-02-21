/**
 * comcom-import.ts
 * Importateur de POIs par communautés de communes (EPCI).
 * Sélection interactive département → EPCI, scan multi-points Google Maps, analyse Gemini.
 *
 * Usage: npx tsx comcom-import.ts
 * Prérequis: comcoms-data.json généré via generate-comcoms-data.ts
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import depuis UTILS
import {
  GOOGLE_MAPS_API_KEY, GEMINI_API_KEY, STRAPI_BASE_URL, STRAPI_API_TOKEN,
  SEARCH_TYPES, CULTURAL_TYPES,
  EpciEntry, DepartmentEntry, ComcomsData, POIOutput,
  computeAreaKm2,
  StrapiClient, fetchPlaceDetails, scanEpci, categorizeWithGemini, testGeminiConnection,
  loadImportState, updateEpciState
} from './utils';

// ===== CACHE EPCI =====
function epciCacheFileName(epciNom: string): string {
  const slug = epciNom
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `raw-${slug}.json`;
}

// ===== DASHBOARD =====
interface DashboardState {
  epciList: { nom: string; dept: string; status: 'pending' | 'scanning' | 'done'; placesFound: number }[];
  analysisTotal: number;
  analysisAccepted: number;
  analysisRejected: number;
  analysisErrors: number;
  analysisProcessing: number;
  recentLogs: string[];
}

function renderDashboard(state: DashboardState) {
  // process.stdout.write('\x1B[2J\x1B[0f'); // Désactivé pour DEBUG

  console.log('🗺️  CulturiaQuests — Import par Communautés de Communes\n');

  // --- Scan EPCIs ---
  const done     = state.epciList.filter(e => e.status === 'done').length;
  const scanning = state.epciList.filter(e => e.status === 'scanning').length;
  const totalPl  = state.epciList.reduce((s, e) => s + e.placesFound, 0);

  console.log(`📍 EPCIs: ${done}/${state.epciList.length} | 🔍 En cours: ${scanning} | Lieux bruts: ${totalPl}`);

  // --- Analyse (phase 2) ---
  if (state.analysisTotal > 0) {
    const pending  = state.analysisTotal - state.analysisAccepted - state.analysisRejected - state.analysisErrors - state.analysisProcessing;
    const done2    = state.analysisTotal - pending;
    const pct      = Math.round((done2 / state.analysisTotal) * 100);
    const filled   = Math.floor(pct / 5);
    const bar      = `[${'='.repeat(filled)}${' '.repeat(20 - filled)}] ${pct}%`;
    console.log(`🤖 Analyse: ✅ ${state.analysisAccepted} | ❌ ${state.analysisRejected} | ⚠️ ${state.analysisErrors} | 🔄 ${state.analysisProcessing} | ${bar}`);
  }

  console.log(''.padEnd(70, '-'));

  // --- Grille EPCI (●/○ colorée) ---
  let grid = '   ';
  state.epciList.forEach((e, i) => {
    let sym = '\x1b[90m○\x1b[0m';                                          // gris  = pending
    if (e.status === 'scanning') sym = '\x1b[34m●\x1b[0m';                 // bleu  = en cours
    if (e.status === 'done')     sym = e.placesFound > 0
      ? '\x1b[32m●\x1b[0m'                                                 // vert  = lieux trouvés
      : '\x1b[33m○\x1b[0m';                                                // jaune  = rien trouvé
    grid += sym + ' ';
    if ((i + 1) % 30 === 0) grid += '\n   ';
  });
  console.log(grid + '\n');

  // --- Logs récents ---
  console.log('--- Activité récente ---');
  state.recentLogs.slice(-8).forEach(l => console.log(`  ${l}`));
}

// ===== SELECTION UI =====

/** Étape 1 — sélection des départements */
async function promptDepartments(departments: DepartmentEntry[]): Promise<DepartmentEntry[]> {
  const importState = loadImportState();
  
  const { selected } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selected',
    message: 'Sélectionnez les départements à explorer :',
    choices: departments.map(d => {
      const state = importState.departments[d.code];
      let icon = '⬜';
      if (state?.status === 'done') icon = '✅';
      else if (state?.status === 'partial') icon = '⚠️';
      
      return {
        name: `${icon} [${d.code}] ${d.nom}  (${d.epci.length} EPCI)`,
        value: d,
      };
    }),
    pageSize: 30,
  }]);
  return selected as DepartmentEntry[];
}

/** Étape 2 — sélection des EPCIs, groupés par département avec séparateurs */
async function promptEpcis(
  depts: DepartmentEntry[]
): Promise<{ epci: EpciEntry; dept: DepartmentEntry }[]> {
  const importState = loadImportState();
  
  // Construire la liste avec des séparateurs visuels par département
  const choices: unknown[] = [];

  for (const dept of depts) {
    choices.push(new inquirer.Separator(`\n  ── ${dept.nom} (${dept.code}) ──`));

    const deptState = importState.departments[dept.code]?.epci || {};

    for (const epci of dept.epci) {
      const area   = computeAreaKm2(epci.communes).toFixed(0);
      const nbCommunes = epci.communesCount || epci.communes.length;
      
      const epciState = deptState[epci.code];
      let icon = '⬜';
      let info = '';
      
      if (epciState?.status === 'done') {
        icon = '✅';
        info = ` | ${epciState.pois_found} POIs`;
      }

      choices.push({
        name:  `${icon} ${epci.nom}${info} — ${nbCommunes} communes | ~${area} km²`,
        value: { epci, dept },
      });
    }
  }

  const { selected } = await inquirer.prompt([{
    type: 'checkbox',
    name: 'selected',
    message: 'Sélectionnez les EPCIs à scanner :',
    choices,
    pageSize: 35,
  }]);

  return selected as { epci: EpciEntry; dept: DepartmentEntry }[];
}

// ===== MAIN =====
async function main() {
  console.log('🗺️  CulturiaQuests — Importateur par Communautés de Communes\n');

  // --- Vérifications ---
  if (!GOOGLE_MAPS_API_KEY || !GEMINI_API_KEY) {
    console.error('❌ Clés API manquantes dans .env');
    console.log('   Requis : GOOGLE_MAPS_API_KEY, GEMINI_API_KEY');
    process.exit(1);
  }

  const dataPath = path.join(__dirname, 'comcoms-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ comcoms-data.json introuvable.');
    console.log('   Lancez d\'abord :  npx tsx generate-comcoms-data.ts');
    process.exit(1);
  }

  const comcomsData: ComcomsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const totalEpci = comcomsData.departments.reduce((s, d) => s + d.epci.length, 0);
  console.log(`📂 Données : ${comcomsData.departments.length} départements, ${totalEpci} EPCIs`);
  console.log(`   (génerées le ${comcomsData.generated.split('T')[0]})\n`);

  // ============================================================
  // ÉTAPE 1 — Choisir les départements
  // ============================================================
  const selectedDepts = await promptDepartments(comcomsData.departments);
  if (selectedDepts.length === 0) {
    console.log('\nAucun département sélectionné.');
    process.exit(0);
  }

  // ============================================================
  // ÉTAPE 2 — Choisir les EPCIs dans les départements sélectionnés
  // ============================================================
  const selectedEpcis = await promptEpcis(selectedDepts);
  if (selectedEpcis.length === 0) {
    console.log('\nAucun EPCI sélectionné.');
    process.exit(0);
  }

  // ============================================================
  // Résumé avant lancement
  // ============================================================
  const totalCommunes = selectedEpcis.reduce(
    (sum, { epci }) => sum + (epci.communesCount || epci.communes.length), 0
  );

  console.log('\n📋 Résumé de la sélection :');
  console.log(`   Départements :  ${[...new Set(selectedEpcis.map(s => s.dept.nom))].join(', ')}`);
  console.log(`   EPCIs :          ${selectedEpcis.length}`);
  console.log(`   Communes :       ${totalCommunes} (Points de recherche)`);
  console.log(`   Requêtes API est.: ${totalCommunes * SEARCH_TYPES.length} (Google Maps)\n`);

  const { go } = await inquirer.prompt([{
    type: 'confirm',
    name: 'go',
    message: 'Démarrer le scan Google Maps ?',
    default: true,
  }]);
  if (!go) process.exit(0);

  // ============================================================
  // PHASE 1 — Scan Google Maps (multi-points par EPCI)
  // ============================================================
  const state: DashboardState = {
    epciList: selectedEpcis.map(({ epci, dept }) => ({
      nom: epci.nom, dept: dept.nom, status: 'pending' as const, placesFound: 0,
    })),
    analysisTotal: 0, analysisAccepted: 0, analysisRejected: 0, analysisErrors: 0, analysisProcessing: 0,
    recentLogs: ['🚀 Démarrage du scan...'],
  };

  const globalSeen = new Set<string>();   // dédup globale par place_id
  const allPlaces: Record<string, unknown>[] = [];

  renderDashboard(state);

  const exportDir = path.join(__dirname, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });

  for (let i = 0; i < selectedEpcis.length; i++) {
    const { epci, dept } = selectedEpcis[i];

    // Vérifier le cache avant de scanner
    const cacheFile = path.join(exportDir, epciCacheFileName(epci.nom));
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as Record<string, unknown>[];
      let newCount = 0;
      for (const p of cached) {
        const id = p.place_id as string;
        if (!globalSeen.has(id)) {
          globalSeen.add(id);
          allPlaces.push(p);
          newCount++;
        }
      }
      state.epciList[i].placesFound = newCount;
      state.epciList[i].status = 'done';
      state.recentLogs.push(`  📦 ${epci.nom} → ${newCount} lieux (cache)`);
      renderDashboard(state);
      continue;
    }

    state.epciList[i].status = 'scanning';
    state.recentLogs.push(`🔍 ${epci.nom} (${dept.nom})…`);
    renderDashboard(state);

    try {
      const places = await scanEpci(epci, dept.nom, dept.region);

      let newCount = 0;
      for (const p of places) {
        const id = p.place_id as string;
        if (!globalSeen.has(id)) {
          globalSeen.add(id);
          allPlaces.push(p);
          newCount++;
        }
      }

      state.epciList[i].placesFound = newCount;
      state.epciList[i].status = 'done';
      state.recentLogs.push(`  ✅ ${epci.nom} → ${newCount} nouveaux lieux`);

      // Sauvegarder le cache raw pour cet EPCI
      const epciPlaces = allPlaces.filter(p => p._sourceEpci === epci.nom);
      fs.writeFileSync(cacheFile, JSON.stringify(epciPlaces, null, 2));
    } catch {
      state.epciList[i].status = 'done';
      state.recentLogs.push(`  ⚠️ ${epci.nom} — erreur réseau`);
    }

    renderDashboard(state);
  }

  // Sortie phase 1
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Phase 1 terminée : ${allPlaces.length} lieux uniques trouvés\n`);

  if (allPlaces.length === 0) {
    console.log('Aucun lieu culturel trouvé. Fin.');
    process.exit(0);
  }

  // ============================================================
  // PHASE 2 — Analyse Gemini
  // ============================================================
  const { doAnalysis } = await inquirer.prompt([{
    type: 'confirm',
    name: 'doAnalysis',
    message: `Analyser ces ${allPlaces.length} lieux avec Gemini ?`,
    default: true,
  }]);

  if (!doAnalysis) {
    console.log(`💾 Données brutes en cache dans exports/ (${selectedEpcis.length} fichiers EPCI)`);
    process.exit(0);
  }

  // Test de connectivité Gemini avant de lancer l'analyse en masse
  console.log('\n🔌 Test de connexion Gemini...');
  const geminiOk = await testGeminiConnection();
  if (!geminiOk) {
    console.error('\n❌ Impossible de contacter Gemini. Abandon de l\'analyse.');
    console.log(`💾 Données brutes en cache dans exports/ (${selectedEpcis.length} fichiers EPCI)`);
    console.log('   Relancez le script pour reprendre sans rescanner.');
    process.exit(1);
  }

  // Réinitialise dashboard pour la phase 2
  state.analysisTotal = allPlaces.length;
  const validPOIs: POIOutput[] = [];

  renderDashboard(state);

  // Concurrence limitée à 3 pour respecter les rate limits Gemini/Google
  const CONCURRENCY = 3;

  async function processWithConcurrency<T>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<void>
  ) {
    let index = 0;
    async function worker() {
      while (index < items.length) {
        const currentIndex = index++;
        await fn(items[currentIndex], currentIndex);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  }

  await processWithConcurrency(allPlaces, CONCURRENCY, async (place) => {
    state.analysisProcessing++;
    renderDashboard(state);

    try {
      const details  = await fetchPlaceDetails(place.place_id as string);
      const analysis = await categorizeWithGemini(place, details);

      state.analysisProcessing--;

      if (analysis._error) {
        // Erreur technique Gemini (rate limit, parsing, etc.)
        state.analysisErrors++;
        state.recentLogs.push(`  ⚠️ ERREUR: ${((place.name as string) || '?').substring(0, 30)}…`);
      } else if (analysis.isPubliclyAccessible) {
        state.analysisAccepted++;

        const isMuseum = (place.types as string[])?.some(t =>
          ['museum', 'art_gallery', 'aquarium', 'zoo'].includes(t)
        );

        validPOIs.push({
          name:        place.name as string,
          description: analysis.reasoning,
          latitude:    (place.geometry as { location: { lat: number } }).location.lat,
          longitude:   (place.geometry as { location: { lng: number } }).location.lng,
          type:        isMuseum ? 'museum' : 'poi',
          categories:  analysis.categories,
          accessType:  analysis.accessType,
          radiusMeters: analysis.radiusMeters,
          rating:      (place.rating as number) || null,
          epci:        place._sourceEpci as string,
          department:  place._sourceDept as string,
          region:      place._sourceRegion as string,
        });

        state.recentLogs.push(`  ✅ ${(place.name as string).substring(0, 36)}… (${analysis.categories[0] || '-'})`);
      } else {
        state.analysisRejected++;
        state.recentLogs.push(`  ❌ ${(place.name as string).substring(0, 36)}…`);
      }
    } catch (err: any) {
      state.analysisProcessing--;
      state.analysisErrors++;
      state.recentLogs.push(`  ⚠️ ERREUR: ${((place.name as string) || '?').substring(0, 30)} — ${err.message?.substring(0, 40)}`);
    }

    renderDashboard(state);

    // Délai entre chaque appel pour respecter les rate limits (500ms)
    await new Promise(r => setTimeout(r, 500));
  });

  // ============================================================
  // PHASE 3 — Export JSON + résumés
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('✅ Analyse terminée!\n');

  const deptCodes  = [...new Set(selectedEpcis.map(s => s.dept.code))].sort().join('-');
  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFile = path.join(exportDir, `comcom-${deptCodes}-${timestamp}.json`);
  fs.writeFileSync(exportFile, JSON.stringify(validPOIs, null, 2));

  console.log(`💾 ${validPOIs.length} lieux exportés → ${path.basename(exportFile)}\n`);

  // Nettoyage des caches raw des EPCIs traités
  const cacheFiles = selectedEpcis.map(({ epci }) => path.join(exportDir, epciCacheFileName(epci.nom)));
  const existingCaches = cacheFiles.filter(f => fs.existsSync(f));
  if (existingCaches.length > 0) {
    const { cleanCache } = await inquirer.prompt([{
      type: 'confirm',
      name: 'cleanCache',
      message: `Supprimer les ${existingCaches.length} fichiers de cache raw ?`,
      default: true,
    }]);
    if (cleanCache) {
      existingCaches.forEach(f => fs.unlinkSync(f));
      console.log(`🧹 ${existingCaches.length} fichiers de cache supprimés.\n`);
    }
  }

  if (validPOIs.length === 0) {
    console.log('Aucun lieu validé par l\'IA.');
    process.exit(0);
  }

  // --- Résumé par région ---
  console.log('=== PAR RÉGION ===');
  const byRegion: Record<string, number> = {};
  validPOIs.forEach(p => { byRegion[p.region] = (byRegion[p.region] || 0) + 1; });
  Object.entries(byRegion).sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => console.log(`   ${region}: ${count}`));

  // --- Résumé par département ---
  console.log('\n=== PAR DÉPARTEMENT ===');
  const byDept: Record<string, number> = {};
  validPOIs.forEach(p => { byDept[p.department] = (byDept[p.department] || 0) + 1; });
  Object.entries(byDept).sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => console.log(`   ${dept}: ${count}`));

  // --- Résumé par EPCI ---
  console.log('\n=== PAR EPCI ===');
  const byEpci: Record<string, number> = {};
  validPOIs.forEach(p => { byEpci[p.epci] = (byEpci[p.epci] || 0) + 1; });
  Object.entries(byEpci).sort((a, b) => b[1] - a[1])
    .forEach(([epci, count]) => console.log(`   ${epci}: ${count}`));

  // --- Résumé par catégorie ---
  console.log('\n=== PAR CATÉGORIE ===');
  const byCat: Record<string, number> = {};
  validPOIs.forEach(p => p.categories.forEach(c => { byCat[c] = (byCat[c] || 0) + 1; }));
  Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`   ${cat}: ${count}`));

  // --- Museums vs POIs ---
  console.log('\n=== PAR TYPE ===');
  console.log(`   Museums : ${validPOIs.filter(p => p.type === 'museum').length}`);
  console.log(`   POIs    : ${validPOIs.filter(p => p.type === 'poi').length}`);

  // ============================================================
  // Import optionnel vers Strapi
  // ============================================================
  if (STRAPI_API_TOKEN) {
    const { doImport } = await inquirer.prompt([{
      type: 'confirm',
      name: 'doImport',
      message: `Importer ces ${validPOIs.length} lieux dans Strapi ?`,
      default: false,
    }]);

    if (doImport) {
      console.log('\n🚀 Import vers Strapi…');
      const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);
      let imported = 0;

      for (const poi of validPOIs) {
        process.stdout.write(`   ${poi.name.substring(0, 42).padEnd(42)} `);
        try {
          if (await strapi.importPOI(poi)) { console.log('✅'); imported++; }
        } catch { console.log('❌'); }
      }
      console.log(`\n✨ ${imported}/${validPOIs.length} importés dans Strapi.`);

      // --- Mise à jour de l'état d'import ---
      console.log('📝 Mise à jour du registre des imports...');
      for (const { epci, dept } of selectedEpcis) {
        const count = validPOIs.filter(p => p.epci === epci.nom).length;
        updateEpciState(dept, epci, count);
      }
    }
  }

  console.log('\n👋 Terminé!');
}

main().catch(console.error);
