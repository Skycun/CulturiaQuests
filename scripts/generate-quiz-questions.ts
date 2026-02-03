/**
 * Script standalone pour générer des questions quiz via OpenAI et les insérer en base
 *
 * Usage:
 *   npx tsx generate-quiz-questions.ts                # Génère et affiche seulement
 *   npx tsx generate-quiz-questions.ts --save         # Génère et insère en base
 *   npx tsx generate-quiz-questions.ts --save --force # Supprime l'ancien quiz du jour avant de régénérer
 *
 * Requiert dans le .env racine:
 *   - OPENAI_API_KEY
 *   - STRAPI_BASE_URL (pour --save)
 *   - STRAPI_API_TOKEN (pour --save)
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios, { AxiosError } from 'axios';

// Support ESM : recréer __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger le .env depuis la racine du projet
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TAGS = ['Art', 'History', 'Make', 'Nature', 'Science', 'Society'];

const PROMPT = `Génère 10 questions de quiz culturel variées en français sur l'histoire, l'art, les sciences, la nature, la société et le savoir-faire.

Exigences:
- 7 questions à choix multiples (QCM) avec 4 options chacune
- 3 questions de timeline où l'utilisateur doit deviner une année
- Mélange les domaines culturels (Art, History, Make, Nature, Science, Society)
- Les questions doivent être intéressantes et éducatives
- Inclure une brève explication pour chaque réponse
- Varier les difficultés
- Tu dois varier l'ordre des réponses pour ne pas que la réponse correcte soit toujours à la même position et toujours la plus longue.
- Essaye de faire des questions originales, évite les clichés.

Format de retour (JSON object avec clé "questions"):
{
  "questions": [
    {
      "question": "Texte de la question en français",
      "type": "qcm",
      "tag": "History",
      "correctAnswer": "Texte de l'option correcte",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "explanation": "Brève explication en français"
    },
    {
      "question": "Texte de la question en français",
      "type": "timeline",
      "tag": "Science",
      "correctAnswer": "1969",
      "timelineRange": {"min": 1900, "max": 2025},
      "explanation": "Brève explication en français"
    }
  ]
}`;

interface Question {
  question: string;
  type: 'qcm' | 'timeline';
  tag: string;
  correctAnswer: string;
  options?: string[];
  timelineRange?: { min: number; max: number };
  explanation: string;
}

interface Tag {
  documentId: string;
  name: string;
}

// ===========================================
// Strapi API Client
// ===========================================

class StrapiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getTags(): Promise<Tag[]> {
    const response = await this.request<{ data: Array<{ documentId: string; name: string }> }>('get', 'tags');
    return response.data.map((t) => ({ documentId: t.documentId, name: t.name }));
  }

  async getTodaySession(): Promise<{ documentId: string } | null> {
    const today = new Date().toISOString().split('T')[0];
    const response = await this.request<{ data: Array<{ documentId: string }> }>(
      'get',
      `quiz-sessions?filters[date][$eq]=${today}`
    );
    return response.data[0] || null;
  }

  async createSession(date: string): Promise<{ documentId: string }> {
    const response = await this.request<{ data: { documentId: string } }>('post', 'quiz-sessions', {
      data: {
        date,
        generation_status: 'completed',
        generated_at: new Date().toISOString(),
      },
    });
    return response.data;
  }

  async createQuestion(
    sessionDocumentId: string,
    question: Question,
    order: number,
    tagDocumentId: string | null
  ): Promise<void> {
    await this.request('post', 'quiz-questions', {
      data: {
        question_text: question.question,
        question_type: question.type,
        order,
        correct_answer: question.correctAnswer,
        options: question.options || null,
        timeline_range: question.timelineRange || null,
        explanation: question.explanation,
        session: sessionDocumentId,
        tag: tagDocumentId,
      },
    });
  }

  async getSessionQuestions(sessionDocumentId: string): Promise<Array<{ documentId: string }>> {
    const response = await this.request<{ data: Array<{ documentId: string }> }>(
      'get',
      `quiz-questions?filters[session][documentId][$eq]=${sessionDocumentId}`
    );
    return response.data;
  }

  async deleteQuestion(documentId: string): Promise<void> {
    await this.request('delete', `quiz-questions/${documentId}`);
  }

  async deleteSession(documentId: string): Promise<void> {
    await this.request('delete', `quiz-sessions/${documentId}`);
  }

  private async request<T>(method: 'get' | 'post' | 'delete', endpoint: string, data?: unknown): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/api/${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        data,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Strapi API error: ${error.response?.status} - ${message}`);
      }
      throw error;
    }
  }
}

// ===========================================
// Database Insertion
// ===========================================

async function saveToDatabase(questions: Question[], force: boolean): Promise<void> {
  const baseUrl = process.env.STRAPI_BASE_URL;
  const token = process.env.STRAPI_API_TOKEN;

  if (!baseUrl || !token) {
    console.error('\n❌ Pour sauvegarder en base, ajoutez au .env:');
    console.error('   STRAPI_BASE_URL=http://localhost:1337');
    console.error('   STRAPI_API_TOKEN=<votre token API>');
    console.error('\n   Créez un token dans Strapi Admin: Settings > API Tokens (Full access)');
    return;
  }

  console.log('\n💾 Sauvegarde en base de données...');

  const client = new StrapiClient(baseUrl, token);

  // Vérifier si une session existe déjà pour aujourd'hui
  const existingSession = await client.getTodaySession();
  if (existingSession) {
    if (!force) {
      console.error('❌ Une session de quiz existe déjà pour aujourd\'hui.');
      console.error('   Utilisez --force pour supprimer et régénérer.');
      return;
    }

    // Supprimer les questions liées
    console.log('   🗑️  Suppression de l\'ancienne session...');
    const oldQuestions = await client.getSessionQuestions(existingSession.documentId);
    for (const q of oldQuestions) {
      await client.deleteQuestion(q.documentId);
    }
    console.log(`   ✅ ${oldQuestions.length} questions supprimées`);

    // Supprimer la session
    await client.deleteSession(existingSession.documentId);
    console.log('   ✅ Session supprimée');
  }

  // Récupérer les tags pour mapper les noms vers documentIds
  const tags = await client.getTags();
  const tagMap = new Map(tags.map((t) => [t.name, t.documentId]));

  console.log(`   📚 ${tags.length} tags trouvés`);

  // Créer la session
  const today = new Date().toISOString().split('T')[0];
  const session = await client.createSession(today);
  console.log(`   ✅ Session créée: ${session.documentId}`);

  // Créer les questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const tagDocumentId = tagMap.get(q.tag) || null;

    if (!tagDocumentId) {
      console.log(`   ⚠️  Tag "${q.tag}" non trouvé, question ${i + 1} sans tag`);
    }

    await client.createQuestion(session.documentId, q, i + 1, tagDocumentId);
    console.log(`   ✅ Question ${i + 1}/10 créée`);
  }

  console.log('\n🎉 Quiz du jour sauvegardé avec succès!');
}

// ===========================================
// Main
// ===========================================

async function generateQuestions() {
  const saveToDb = process.argv.includes('--save');
  const force = process.argv.includes('--force');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY non trouvée dans le .env');
    process.exit(1);
  }

  console.log('🚀 Génération des questions en cours...\n');
  console.log('📝 Prompt utilisé:\n');
  console.log('─'.repeat(60));
  console.log(PROMPT);
  console.log('─'.repeat(60));
  console.log('\n');

  const openai = new OpenAI({ apiKey });

  try {
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [{ role: 'user', content: PROMPT }],
      response_format: { type: 'json_object' },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const response = JSON.parse(completion.choices[0].message.content || '{}');
    const questions: Question[] = response.questions || response;

    console.log(`✅ Généré en ${elapsed}s\n`);
    console.log(`📊 Tokens utilisés: ${completion.usage?.total_tokens || 'N/A'}`);
    console.log(`   - Input: ${completion.usage?.prompt_tokens || 'N/A'}`);
    console.log(`   - Output: ${completion.usage?.completion_tokens || 'N/A'}\n`);

    // Validation
    if (!Array.isArray(questions)) {
      console.error('❌ Réponse non valide: pas un tableau');
      console.log('\nRéponse brute:', JSON.stringify(response, null, 2));
      return;
    }

    console.log(`📋 ${questions.length} questions générées:\n`);
    console.log('═'.repeat(60));

    const qcmCount = questions.filter((q) => q.type === 'qcm').length;
    const timelineCount = questions.filter((q) => q.type === 'timeline').length;

    console.log(`   QCM: ${qcmCount} | Timeline: ${timelineCount}\n`);

    questions.forEach((q, i) => {
      console.log(`\n[${i + 1}] ${q.type.toUpperCase()} - ${q.tag}`);
      console.log('─'.repeat(60));
      console.log(`❓ ${q.question}`);

      if (q.type === 'qcm' && q.options) {
        q.options.forEach((opt: string, j: number) => {
          const marker = opt === q.correctAnswer ? '✓' : ' ';
          console.log(`   ${marker} ${String.fromCharCode(65 + j)}. ${opt}`);
        });
      } else if (q.type === 'timeline') {
        console.log(`   📅 Réponse: ${q.correctAnswer}`);
        console.log(`   📏 Plage: ${q.timelineRange?.min} - ${q.timelineRange?.max}`);
      }

      console.log(`💡 ${q.explanation}`);
    });

    console.log('\n' + '═'.repeat(60));

    // Vérification des tags
    const usedTags = new Set(questions.map((q) => q.tag));
    const missingTags = TAGS.filter((t) => !usedTags.has(t));

    if (missingTags.length > 0) {
      console.log(`\n⚠️  Tags non utilisés: ${missingTags.join(', ')}`);
    }

    // Export JSON pour debug
    console.log('\n📄 JSON complet exporté dans: quiz-output.json');
    fs.writeFileSync(path.join(__dirname, 'quiz-output.json'), JSON.stringify(questions, null, 2), 'utf-8');

    // Sauvegarde en base si --save
    if (saveToDb) {
      await saveToDatabase(questions, force);
    } else {
      console.log('\n💡 Utilisez --save pour insérer en base de données');
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('❌ Erreur API OpenAI:', error.message);
      console.error('   Status:', error.status);
      console.error('   Code:', error.code);
    } else if (error instanceof Error) {
      console.error('❌ Erreur:', error.message);
    } else {
      console.error('❌ Erreur inconnue:', error);
    }
  }
}

generateQuestions();
