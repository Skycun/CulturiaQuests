/**
 * Service de génération automatique du quiz quotidien
 *
 * - 7 QCM piochés dans OpenQuizzDB (fichiers JSON locaux)
 * - 3 Timeline générées par Ollama (avec fallback)
 * - Historique anti-répétition via used-questions.json
 */

import fs from 'fs';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────

interface SelectedQuiz {
  id: number;
  theme: string;
  tag: string;
}

interface SelectedQuizzesConfig {
  quizzes: SelectedQuiz[];
}

interface OpenQuizzDBQuestion {
  id: number;
  question: string;
  propositions: string[];
  réponse: string;
  anecdote: string;
}

interface DifficultyLevels {
  débutant?: OpenQuizzDBQuestion[] | Record<string, OpenQuizzDBQuestion>;
  confirmé?: OpenQuizzDBQuestion[] | Record<string, OpenQuizzDBQuestion>;
  expert?: OpenQuizzDBQuestion[] | Record<string, OpenQuizzDBQuestion>;
}

interface OpenQuizzDBFile {
  thème: string;
  quizz: DifficultyLevels & {
    // Certains fichiers ont une couche langue : quizz.fr.débutant
    fr?: DifficultyLevels;
  };
}

interface UsedQuestionsData {
  lastReset: string;
  usedIds: string[];
}

interface GeneratedQuestion {
  question_text: string;
  question_type: 'qcm' | 'timeline';
  correct_answer: string;
  options: string[] | null;
  timeline_range: { min: number; max: number } | null;
  explanation: string;
  tagName: string;
}

// ─── Constantes ──────────────────────────────────────────────────────

// process.cwd() = racine du backend (/opt/app en Docker, ./backend en local)
const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'openquizzdb');
const SELECTED_QUIZZES_PATH = path.join(DATA_DIR, 'selected-quizzes.json');
const USED_QUESTIONS_PATH = path.join(DATA_DIR, 'used-questions.json');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://ollama:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b';

const TIMELINE_PROMPT = `Génère exactement 3 questions de type "timeline" culturelles en français.
Pour chaque question, l'utilisateur doit deviner une année.

Exigences :
- Questions variées : histoire, art, sciences, nature, société ou savoir-faire
- Chaque question doit avoir un tag parmi : Art, History, Make, Nature, Science, Society
- L'année correcte doit être entre 1000 et 2025
- La plage (min/max) doit encadrer la réponse avec une marge raisonnable
- Inclure une brève explication

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "questions": [
    {
      "question": "En quelle année ... ?",
      "tag": "History",
      "correctAnswer": "1789",
      "timelineRange": {"min": 1700, "max": 1850},
      "explanation": "Explication courte"
    }
  ]
}`;

// ─── Helpers ─────────────────────────────────────────────────────────

function loadSelectedQuizzes(): SelectedQuizzesConfig {
  if (!fs.existsSync(SELECTED_QUIZZES_PATH)) {
    throw new Error(`Fichier de sélection non trouvé : ${SELECTED_QUIZZES_PATH}`);
  }
  return JSON.parse(fs.readFileSync(SELECTED_QUIZZES_PATH, 'utf-8'));
}

function loadUsedQuestions(): UsedQuestionsData {
  if (!fs.existsSync(USED_QUESTIONS_PATH)) {
    return { lastReset: new Date().toISOString().split('T')[0], usedIds: [] };
  }
  return JSON.parse(fs.readFileSync(USED_QUESTIONS_PATH, 'utf-8'));
}

function saveUsedQuestions(data: UsedQuestionsData): void {
  fs.writeFileSync(USED_QUESTIONS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Nettoie le JSON mal formé d'OpenQuizzDB (parcours caractère par caractère)
 */
function sanitizeJson(raw: string): unknown {
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

function makeQuestionId(quizId: number, difficulty: string, questionId: number): string {
  return `${quizId}_${difficulty}_${questionId}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function callOllama(prompt: string, retries = 3): Promise<unknown> {
  const url = `${OLLAMA_BASE_URL}/api/generate`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          format: 'json',
          stream: false,
          options: { temperature: 0.7 },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const data = await response.json() as { response: string };
      return JSON.parse(data.response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.warn(`[quiz-generator] Ollama tentative ${attempt}/${retries} échouée : ${message}`);

      if (attempt < retries) {
        // Backoff exponentiel : 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  return null;
}

// ─── Fonctions principales ───────────────────────────────────────────

function pickOpenQuizzDBQuestions(count: number): GeneratedQuestion[] {
  const config = loadSelectedQuizzes();
  const usedData = loadUsedQuestions();

  // Collecter toutes les questions disponibles depuis les quiz sélectionnés
  interface AvailableQuestion {
    id: string;
    quizId: number;
    tag: string;
    question: OpenQuizzDBQuestion;
  }

  let allQuestions: AvailableQuestion[] = [];

  for (const quiz of config.quizzes) {
    const filePath = path.join(DATA_DIR, `openquizzdb_${quiz.id}.json`);
    if (!fs.existsSync(filePath)) {
      strapi.log.warn(`[quiz-generator] Fichier manquant : openquizzdb_${quiz.id}.json`);
      continue;
    }

    try {
      const data = sanitizeJson(fs.readFileSync(filePath, 'utf-8')) as OpenQuizzDBFile;

      // Gérer les deux formats : quizz.débutant ou quizz.fr.débutant
      const levels = data.quizz.fr || data.quizz;

      const difficultyKeys = ['débutant', 'confirmé', 'expert'] as const;

      for (const diffKey of difficultyKeys) {
        const questionsRaw = (levels as DifficultyLevels)[diffKey];
        if (!questionsRaw) continue;

        // Gérer tableau ou objet avec clés numérotées
        const questions: OpenQuizzDBQuestion[] = Array.isArray(questionsRaw)
          ? questionsRaw
          : Object.values(questionsRaw);

        for (const q of questions) {
          if (!q.question || !q.propositions || !q.réponse) continue;
          const qId = makeQuestionId(quiz.id, diffKey, q.id);
          allQuestions.push({
            id: qId,
            quizId: quiz.id,
            tag: quiz.tag,
            question: q,
          });
        }
      }
    } catch (err) {
      strapi.log.warn(`[quiz-generator] Erreur lecture openquizzdb_${quiz.id}.json : ${(err as Error).message}`);
    }
  }

  if (allQuestions.length === 0) {
    throw new Error('Aucune question OpenQuizzDB disponible. Vérifiez les fichiers téléchargés et selected-quizzes.json.');
  }

  // Filtrer les questions déjà utilisées
  const usedSet = new Set(usedData.usedIds);
  let available = allQuestions.filter((q) => !usedSet.has(q.id));

  // Si toutes les questions ont été utilisées, reset l'historique
  if (available.length < count) {
    strapi.log.info(`[quiz-generator] Toutes les questions utilisées (${usedData.usedIds.length}), reset de l'historique`);
    usedData.usedIds = [];
    usedData.lastReset = new Date().toISOString().split('T')[0];
    available = allQuestions;
  }

  // Piocher aléatoirement
  const picked = shuffleArray(available).slice(0, count);

  // Enregistrer les questions utilisées
  for (const q of picked) {
    usedData.usedIds.push(q.id);
  }
  saveUsedQuestions(usedData);

  // Transformer au format quiz-question Strapi
  return picked.map((q) => {
    // Mélanger les propositions pour varier la position de la bonne réponse
    const shuffledOptions = shuffleArray(q.question.propositions);

    return {
      question_text: q.question.question,
      question_type: 'qcm' as const,
      correct_answer: q.question.réponse,
      options: shuffledOptions,
      timeline_range: null,
      explanation: q.question.anecdote || '',
      tagName: q.tag,
    };
  });
}

async function generateTimelineQuestions(count: number): Promise<GeneratedQuestion[]> {
  strapi.log.info(`[quiz-generator] Génération de ${count} questions timeline via Ollama (${OLLAMA_MODEL})...`);

  const result = await callOllama(TIMELINE_PROMPT) as { questions?: Array<{
    question: string;
    tag: string;
    correctAnswer: string;
    timelineRange: { min: number; max: number };
    explanation: string;
  }> } | null;

  if (!result || !result.questions || !Array.isArray(result.questions)) {
    strapi.log.warn('[quiz-generator] Ollama indisponible ou réponse invalide, skip des questions timeline');
    return [];
  }

  const validTags = ['Art', 'History', 'Make', 'Nature', 'Science', 'Society'];

  return result.questions.slice(0, count).map((q) => ({
    question_text: q.question,
    question_type: 'timeline' as const,
    correct_answer: String(q.correctAnswer),
    options: null,
    timeline_range: q.timelineRange || { min: 1800, max: 2025 },
    explanation: q.explanation || '',
    tagName: validTags.includes(q.tag) ? q.tag : 'History',
  }));
}

// ─── Service Strapi ──────────────────────────────────────────────────

export default {
  async generateDailyQuiz() {
    const today = new Date().toISOString().split('T')[0];
    strapi.log.info(`[quiz-generator] Démarrage de la génération du quiz pour ${today}`);

    // Vérifier si une session existe déjà pour aujourd'hui
    const existingSession = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { date: today },
    });

    if (existingSession) {
      strapi.log.info(`[quiz-generator] Une session existe déjà pour ${today} (status: ${existingSession.generation_status}), skip`);
      return;
    }

    // Créer la session en status "generating"
    const session = await strapi.documents('api::quiz-session.quiz-session').create({
      data: {
        date: today,
        generation_status: 'generating',
      },
    });

    try {
      // 1. Piocher 7 QCM depuis OpenQuizzDB
      const qcmQuestions = pickOpenQuizzDBQuestions(7);
      strapi.log.info(`[quiz-generator] ${qcmQuestions.length} QCM piochés depuis OpenQuizzDB`);

      // 2. Générer 3 questions timeline via Ollama
      const timelineQuestions = await generateTimelineQuestions(3);
      strapi.log.info(`[quiz-generator] ${timelineQuestions.length} timeline générées via Ollama`);

      // Combiner et mélanger
      const allQuestions = shuffleArray([...qcmQuestions, ...timelineQuestions]);

      if (allQuestions.length === 0) {
        throw new Error('Aucune question générée');
      }

      // Récupérer les tags depuis la base
      const tags = await strapi.db.query('api::tag.tag').findMany({});
      const tagMap = new Map(tags.map((t: { documentId: string; name: string }) => [t.name, t.documentId]));

      // Créer les questions en base
      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        const tagDocumentId = tagMap.get(q.tagName) || null;

        if (!tagDocumentId) {
          strapi.log.warn(`[quiz-generator] Tag "${q.tagName}" non trouvé en base`);
        }

        await strapi.documents('api::quiz-question.quiz-question').create({
          data: {
            question_text: q.question_text,
            question_type: q.question_type,
            order: i + 1,
            correct_answer: q.correct_answer,
            options: q.options,
            timeline_range: q.timeline_range,
            explanation: q.explanation,
            session: session.documentId,
            tag: tagDocumentId,
          },
        });
      }

      // Mettre à jour la session comme completed
      await strapi.documents('api::quiz-session.quiz-session').update({
        documentId: session.documentId,
        data: {
          generation_status: 'completed',
          generated_at: new Date().toISOString(),
        },
      });

      strapi.log.info(
        `[quiz-generator] Quiz du ${today} généré avec succès : ${qcmQuestions.length} QCM + ${timelineQuestions.length} timeline`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.error(`[quiz-generator] Erreur lors de la génération : ${message}`);

      // Marquer la session comme failed
      await strapi.documents('api::quiz-session.quiz-session').update({
        documentId: session.documentId,
        data: {
          generation_status: 'failed',
          generation_error: message,
        },
      });
    }
  },
};
