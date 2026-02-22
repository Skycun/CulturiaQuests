/**
 * Liste tous les thèmes des quiz OpenQuizzDB téléchargés
 * pour faciliter la sélection manuelle dans selected-quizzes.json
 *
 * Usage:
 *   npx tsx scripts/list-openquizzdb-themes.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'backend', 'src', 'data', 'openquizzdb');

/**
 * Nettoie le JSON mal formé d'OpenQuizzDB (parcours caractère par caractère)
 */
function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    let text = raw;
    text = text.replace(/"difficulté"\s*:\s*(\d+\s*\/\s*\d+)/g, '"difficulté": "$1"');
    text = text.replace(/\}(\s*)\{/g, '},$1{');

    let result = '';
    let inString = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      const code = text.charCodeAt(i);
      if (inString) {
        if (ch === '\\') {
          const next = text[i + 1];
          if (next === "'") { result += "'"; i += 2; }
          else if ('"\\/bfnrtu'.includes(next)) { result += ch + next; i += 2; }
          else { result += '\\\\'; i += 1; }
        } else if (ch === '"') {
          let la = i + 1;
          while (la < text.length && ' \n\r'.includes(text[la])) la++;
          const ns = text[la];
          if (ns === ':' || ns === ',' || ns === '}' || ns === ']' || ns === undefined) {
            result += ch; inString = false;
          } else { result += '\\"'; }
          i += 1;
        }
        else if (code < 0x20 || code === 0x7F) { i += 1; }
        else { result += ch; i += 1; }
      } else {
        if (ch === '"') { inString = true; }
        result += ch;
        i += 1;
      }
    }
    return JSON.parse(result);
  }
}

function countQuestions(quizz: Record<string, unknown>): number {
  // Gérer les deux formats : quizz.débutant ou quizz.fr.débutant
  const levels = (quizz.fr || quizz) as Record<string, unknown>;
  let count = 0;

  for (const key of ['débutant', 'confirmé', 'expert']) {
    const qs = levels[key];
    if (Array.isArray(qs)) {
      count += qs.length;
    } else if (qs && typeof qs === 'object') {
      count += Object.keys(qs).length;
    }
  }
  return count;
}

function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Dossier non trouvé : ${DATA_DIR}`);
    console.error('Lancez d\'abord : npx tsx scripts/download-openquizzdb.ts');
    process.exit(1);
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('openquizzdb_') && f.endsWith('.json'))
    .sort((a, b) => {
      const idA = parseInt(a.replace('openquizzdb_', '').replace('.json', ''));
      const idB = parseInt(b.replace('openquizzdb_', '').replace('.json', ''));
      return idA - idB;
    });

  if (files.length === 0) {
    console.error('Aucun fichier OpenQuizzDB trouvé.');
    console.error('Lancez d\'abord : npx tsx scripts/download-openquizzdb.ts');
    process.exit(1);
  }

  console.log(`${files.length} quiz trouvés :\n`);
  console.log('ID'.padEnd(6) + 'Thème'.padEnd(55) + 'Difficulté'.padEnd(15) + 'Questions');
  console.log('-'.repeat(90));

  for (const file of files) {
    const id = file.replace('openquizzdb_', '').replace('.json', '');
    try {
      const data = safeParseJson(
        fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')
      ) as { thème?: string; difficulté?: string; quizz?: Record<string, unknown> };

      const questionCount = data.quizz ? countQuestions(data.quizz) : 0;

      console.log(
        `${id.padEnd(6)}${(data.thème || '???').padEnd(55)}${String(data.difficulté || '?').padEnd(15)}${questionCount}`
      );
    } catch {
      console.log(`${id.padEnd(6)}(erreur de lecture)`);
    }
  }

  console.log('\nPour ajouter un quiz, éditez : backend/src/data/openquizzdb/selected-quizzes.json');
}

main();
