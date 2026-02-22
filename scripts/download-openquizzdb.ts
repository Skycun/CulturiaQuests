/**
 * Télécharge les fichiers JSON OpenQuizzDB depuis le miroir GitHub Zeuh/OpenQuizzDB
 * dans backend/src/data/openquizzdb/
 *
 * Usage:
 *   npx tsx scripts/download-openquizzdb.ts
 *
 * Options:
 *   --force   Re-télécharge les fichiers déjà présents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'backend', 'src', 'data', 'openquizzdb');
const BASE_URL = 'https://raw.githubusercontent.com/Zeuh/OpenQuizzDB/master/data';
const TOTAL_QUIZZES = 207;

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location!).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Nettoie le JSON mal formé d'OpenQuizzDB en parcourant caractère par caractère.
 * Gère : difficulté non quotée, caractères de contrôle dans les chaînes,
 * virgules manquantes entre objets, séquences d'échappement invalides.
 */
function sanitizeJson(raw: string): string {
  // Pré-traitement global
  let text = raw;
  text = text.replace(/"difficulté"\s*:\s*(\d+\s*\/\s*\d+)/g, '"difficulté": "$1"');
  text = text.replace(/\}(\s*)\{/g, '},$1{');

  // Parcourir caractère par caractère pour nettoyer l'intérieur des chaînes JSON
  let result = '';
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const code = text.charCodeAt(i);

    if (inString) {
      if (ch === '\\') {
        // Séquence d'échappement
        const next = text[i + 1];
        if (next === "'" ) {
          // \' → ' (invalide en JSON, pas besoin d'échapper)
          result += "'";
          i += 2;
        } else if ('"\\/bfnrtu'.includes(next)) {
          // Séquence valide, copier telle quelle
          result += ch + next;
          i += 2;
        } else {
          // \ suivi d'un caractère invalide → échapper le backslash
          result += '\\\\';
          i += 1;
        }
      } else if (ch === '"') {
        // Est-ce la vraie fin de la chaîne ou un guillemet interne non échappé ?
        // On regarde ce qui suit (en sautant les espaces/newlines)
        let lookAhead = i + 1;
        while (lookAhead < text.length && (text[lookAhead] === ' ' || text[lookAhead] === '\n' || text[lookAhead] === '\r')) {
          lookAhead++;
        }
        const nextSignificant = text[lookAhead];
        if (nextSignificant === ':' || nextSignificant === ',' || nextSignificant === '}' ||
            nextSignificant === ']' || nextSignificant === undefined) {
          // Fin réelle de la chaîne
          result += ch;
          inString = false;
        } else {
          // Guillemet interne non échappé → échapper
          result += '\\"';
        }
        i += 1;
      } else if (code < 0x20 || code === 0x7F) {
        // Caractère de contrôle dans une chaîne → supprimer
        // (inclut \n, \r, \t et tous les autres)
        i += 1;
      } else {
        result += ch;
        i += 1;
      }
    } else {
      // Hors chaîne
      if (ch === '"') {
        inString = true;
        result += ch;
        i += 1;
      } else {
        result += ch;
        i += 1;
      }
    }
  }

  return result;
}

async function main() {
  const force = process.argv.includes('--force');

  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Dossier créé : ${OUTPUT_DIR}`);
  }

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  let fixed = 0;

  for (let i = 1; i <= TOTAL_QUIZZES; i++) {
    const filename = `openquizzdb_${i}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    if (!force && fs.existsSync(filepath)) {
      skipped++;
      continue;
    }

    const url = `${BASE_URL}/${filename}`;
    try {
      const raw = await download(url);

      // Tenter le parse direct, sinon nettoyer
      let data: string;
      try {
        JSON.parse(raw);
        data = raw;
      } catch {
        const cleaned = sanitizeJson(raw);
        JSON.parse(cleaned); // Valider le résultat nettoyé
        data = cleaned;
        fixed++;
      }

      fs.writeFileSync(filepath, data, 'utf-8');
      downloaded++;
      process.stdout.write(`\r  Progression : ${downloaded + skipped}/${TOTAL_QUIZZES} (${downloaded} téléchargés, ${skipped} déjà présents, ${fixed} corrigés)`);
    } catch (err) {
      errors++;
      console.error(`\n  Erreur pour ${filename}: ${(err as Error).message}`);
    }
  }

  console.log(`\n\nTerminé !`);
  console.log(`  Téléchargés : ${downloaded}`);
  if (fixed > 0) console.log(`  Corrigés (JSON mal formé) : ${fixed}`);
  console.log(`  Déjà présents : ${skipped}`);
  if (errors > 0) console.log(`  Erreurs : ${errors}`);
  console.log(`\nFichiers dans : ${OUTPUT_DIR}`);
}

main().catch(console.error);
