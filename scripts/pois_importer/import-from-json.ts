/**
 * import-from-json.ts
 * Importateur de POIs depuis des fichiers JSON existants (backup ou export Gemini).
 * Réutilise le client Strapi centralisé dans utils.ts
 *
 * Usage: npx tsx import-from-json.ts
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import depuis UTILS
import {
  STRAPI_BASE_URL, STRAPI_API_TOKEN,
  StrapiClient, POIOutput
} from './utils';

// ===== MAIN =====
async function main() {
  console.log('📂 Importateur de sauvegardes JSON vers Strapi\n');

  if (!STRAPI_API_TOKEN) {
    console.error('❌ Erreur: STRAPI_API_TOKEN manquant dans .env');
    process.exit(1);
  }

  // 1. List files (Current Dir + exports/)
  const exportDir = path.join(__dirname, 'exports');
  let files: { name: string; path: string }[] = [];

  // Scan current directory
  try {
    const currentDirFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.json') && !['package.json', 'package-lock.json', 'tsconfig.json', 'comcoms-data.json'].includes(f))
      .map(f => ({ name: f, path: path.join(__dirname, f) }));
    files = [...files, ...currentDirFiles];
  } catch (e) {
    // ignore
  }

  // Scan exports directory
  if (fs.existsSync(exportDir)) {
    const exportFiles = fs.readdirSync(exportDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: `exports/${f}`, path: path.join(exportDir, f) }));
    files = [...files, ...exportFiles];
  }

  if (files.length === 0) {
    console.log('Aucun fichier JSON importable trouvé (dans . ou ./exports).');
    process.exit(0);
  }

  // 2. Select File
  const { selectedFileObj } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedFileObj',
      message: 'Quel fichier voulez-vous importer ?',
      choices: files.map(f => ({ name: f.name, value: f }))
    }
  ]);

  const rawData = fs.readFileSync(selectedFileObj.path, 'utf-8');
  let pois: POIOutput[] = [];
  try {
    pois = JSON.parse(rawData);
    if (!Array.isArray(pois)) {
      throw new Error('Le fichier doit contenir un tableau d\'objets JSON.');
    }
  } catch (e) {
    console.error(`❌ JSON invalide: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  console.log(`\n📄 Chargé: ${selectedFileObj.name} (${pois.length} lieux)`);

  // 3. Select Mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Que voulez-vous faire ?',
      choices: [
        { name: 'Tout importer', value: 'all' },
        { name: 'Sélectionner manuellement', value: 'select' }
      ]
    }
  ]);

  let poisToImport = pois;

  if (mode === 'select') {
    const { selection } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selection',
        message: 'Cochez les lieux à importer (Espace pour cocher)',
        choices: pois.map((p: any) => ({
          name: `${p.name} (${p.type})`,
          value: p,
          checked: true
        })),
        pageSize: 20
      }
    ]);
    poisToImport = selection;
  }

  if (poisToImport.length === 0) {
    console.log('Aucun lieu sélectionné.');
    process.exit(0);
  }

  // 4. Import
  console.log(`\n🚀 Démarrage de l'import de ${poisToImport.length} lieux...`);
  const strapi = new StrapiClient(STRAPI_BASE_URL, STRAPI_API_TOKEN);

  let successCount = 0;
  for (const poi of poisToImport) {
    process.stdout.write(`   Import ${poi.name}... `);
    try {
      const success = await strapi.importPOI(poi);
      if (success) {
        console.log('✅');
        successCount++;
      } else {
        console.log('⚠️  (Déjà existant ou Erreur)');
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.error?.message || e.message;
      console.log(`❌ Erreur: ${errorMsg}`);
    }
  }

  console.log(`\n✨ Terminé ! ${successCount}/${poisToImport.length} lieux importés.`);
}

main().catch(console.error);
