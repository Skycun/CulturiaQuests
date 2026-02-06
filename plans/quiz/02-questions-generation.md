# Génération Quotidienne de Questions via OpenAI

## Vue d'ensemble

Système de génération automatique quotidienne de 10 questions culturelles via l'API OpenAI, orchestré par un cron job.

## Architecture du Système de Scheduling

### Option retenue: node-cron

**Rationale:**
- Aucun système de scheduling existant dans le codebase
- Simple et léger (pas besoin de Redis comme BullMQ)
- Intégré directement dans le lifecycle Strapi
- Une seule tâche planifiée initialement

### Fichier: Quiz Scheduler Service

**Fichier:** `backend/src/services/quiz-scheduler.ts`

```typescript
import cron from 'node-cron';
import type { Core } from '@strapi/strapi';

export default {
  start(strapi: Core.Strapi) {
    // Exécution quotidienne à 00:01 UTC
    cron.schedule('1 0 * * *', async () => {
      strapi.log.info('[QuizScheduler] Starting daily quiz generation...');

      try {
        await strapi
          .service('api::quiz-session.quiz-session')
          .generateDailyQuiz();

        strapi.log.info('[QuizScheduler] Daily quiz generated successfully');
      } catch (error) {
        strapi.log.error('[QuizScheduler] Failed to generate daily quiz:', error);
      }
    }, {
      timezone: "UTC"
    });

    strapi.log.info('[QuizScheduler] Cron job registered for daily quiz generation');
  }
};
```

### Intégration Bootstrap

**Fichier:** `backend/src/index.ts`

Ajouter après les permissions:

```typescript
import quizScheduler from './services/quiz-scheduler';

export default {
  register(/* { strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // ... existing permission grants

    // Start quiz scheduler
    quizScheduler.start(strapi);
  },
};
```

## Service de Génération de Questions

### Fichier: Quiz Session Service

**Fichier:** `backend/src/api/quiz-session/services/quiz-session.ts`

```typescript
import { factories } from '@strapi/strapi';
import OpenAI from 'openai';

export default factories.createCoreService('api::quiz-session.quiz-session', ({ strapi }) => ({

  /**
   * Génère le quiz quotidien avec OpenAI
   */
  async generateDailyQuiz() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Vérifier si le quiz d'aujourd'hui existe déjà
    const existing = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { date: today }
    });

    if (existing && existing.generation_status === 'completed') {
      strapi.log.info(`[QuizSession] Quiz for ${today} already exists`);
      return existing;
    }

    // Créer ou mettre à jour la session
    let session = existing;
    if (!session) {
      session = await strapi.documents('api::quiz-session.quiz-session').create({
        data: {
          date: today,
          generation_status: 'generating',
          publishedAt: new Date()
        }
      });
    } else {
      session = await strapi.documents('api::quiz-session.quiz-session').update({
        documentId: session.documentId,
        data: { generation_status: 'generating' }
      });
    }

    try {
      // Générer les questions via OpenAI
      const questions = await this.generateQuestionsWithOpenAI();

      // Sauvegarder en base de données
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await strapi.documents('api::quiz-question.quiz-question').create({
          data: {
            question_text: q.question,
            question_type: q.type,
            order: i + 1,
            correct_answer: q.correctAnswer,
            options: q.options || null,
            timeline_range: q.timelineRange || null,
            explanation: q.explanation,
            tag: q.tagDocumentId,
            session: session.documentId,
            publishedAt: new Date()
          }
        });
      }

      // Marquer comme complété
      await strapi.documents('api::quiz-session.quiz-session').update({
        documentId: session.documentId,
        data: {
          generation_status: 'completed',
          generated_at: new Date()
        }
      });

      strapi.log.info(`[QuizSession] Successfully generated ${questions.length} questions for ${today}`);
      return session;

    } catch (error) {
      strapi.log.error('[QuizSession] Generation failed:', error);

      await strapi.documents('api::quiz-session.quiz-session').update({
        documentId: session.documentId,
        data: {
          generation_status: 'failed',
          generation_error: error.message
        }
      });

      throw error;
    }
  },

  /**
   * Appelle OpenAI pour générer 10 questions
   */
  async generateQuestionsWithOpenAI() {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Récupérer tous les tags disponibles
    const tags = await strapi.db.query('api::tag.tag').findMany({
      select: ['documentId', 'name']
    });

    const prompt = `Génère 10 questions de quiz culturel variées en français sur l'histoire, l'art, les sciences, la nature, la société et le savoir-faire.

Exigences:
- 7 questions à choix multiples (QCM) avec 4 options chacune
- 3 questions de timeline où l'utilisateur doit deviner une année
- Mélange les domaines culturels (Histoire, Art, Sciences, Nature, Société, Savoir Faire)
- Les questions doivent être intéressantes et éducatives
- Inclure une brève explication pour chaque réponse
- Varier les difficultés

Format de retour (JSON array):
[
  {
    "question": "Texte de la question en français",
    "type": "qcm",
    "tag": "Histoire",
    "correctAnswer": "Texte de l'option correcte",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "explanation": "Brève explication en français"
  },
  {
    "question": "Texte de la question en français",
    "type": "timeline",
    "tag": "Sciences",
    "correctAnswer": "1969",
    "timelineRange": {"min": 1900, "max": 2025},
    "explanation": "Brève explication en français"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8
    });

    const response = JSON.parse(completion.choices[0].message.content);
    const questions = response.questions || response;

    // Validation basique
    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error(`Expected 10 questions, got ${questions?.length || 0}`);
    }

    // Mapper les noms de tags vers leurs documentIds
    const tagMap = new Map(tags.map(t => [t.name, t.documentId]));

    return questions.map(q => ({
      ...q,
      tagDocumentId: tagMap.get(q.tag) || tags[0]?.documentId
    }));
  },

  /**
   * Récupère la session du jour avec ses questions
   */
  async getTodaySession() {
    const today = new Date().toISOString().split('T')[0];

    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { date: today, generation_status: 'completed' },
      populate: {
        questions: {
          orderBy: { order: 'asc' },
          populate: ['tag']
        }
      }
    });

    return session;
  }
}));
```

## Prompt Engineering

### Structure du Prompt

Le prompt OpenAI doit:
1. **Spécifier la langue:** Français explicite
2. **Définir les types:** 7 QCM + 3 Timeline (recommandé)
3. **Demander la variété:** Mix des domaines culturels
4. **Exiger le format JSON:** Structure exacte attendue
5. **Demander des explications:** Pour valeur éducative

### Gestion des Erreurs OpenAI

**Cas d'échec possibles:**
- API key invalide
- Rate limit dépassé
- Timeout réseau
- Format JSON incorrect
- Nombre de questions incorrect

**Stratégie:**
- Marquer session comme `failed`
- Logger l'erreur complète
- Conserver `generation_error` pour debug admin
- Retry manuel possible via console ou admin panel

## Configuration OpenAI

### Variables d'environnement

**Fichier:** `backend/.env` et `backend/.env.example`

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-xxx
```

### Installation SDK

```bash
cd backend
npm install openai@^4.67.3
```

## Tests et Validation

### Test manuel via Strapi console

```bash
cd backend
npm run console
```

Puis dans la console:

```typescript
// Générer manuellement le quiz du jour
await strapi.service('api::quiz-session.quiz-session').generateDailyQuiz();

// Vérifier les questions créées
const session = await strapi.service('api::quiz-session.quiz-session').getTodaySession();
console.log(session);
```

### Vérifications

1. **Session créée:** Vérifier `quiz-session` dans l'admin avec date du jour
2. **10 questions:** Compter les `quiz-question` liées
3. **Types corrects:** 7 QCM, 3 Timeline (ou autre mix)
4. **Tags assignés:** Vérifier relations avec tags
5. **Order séquentiel:** 1 à 10 sans doublons
6. **Champs JSON valides:** `options` et `timeline_range` bien formés

## Monitoring et Logs

### Logs à surveiller

```
[QuizScheduler] Cron job registered for daily quiz generation
[QuizScheduler] Starting daily quiz generation...
[QuizSession] Successfully generated 10 questions for 2026-02-03
```

### En cas d'erreur

```
[QuizScheduler] Failed to generate daily quiz: <error details>
[QuizSession] Generation failed: OpenAI API error
```

**Action:** Vérifier `quiz-session.generation_error` dans l'admin

## Régénération Manuelle

### Via console Strapi

```typescript
// Force regeneration même si existe déjà
const today = new Date().toISOString().split('T')[0];

// Supprimer la session existante
const existing = await strapi.db.query('api::quiz-session.quiz-session').findOne({
  where: { date: today }
});

if (existing) {
  // Supprimer les questions liées
  await strapi.db.query('api::quiz-question.quiz-question').deleteMany({
    where: { session: { documentId: existing.documentId } }
  });

  // Supprimer la session
  await strapi.documents('api::quiz-session.quiz-session').delete({
    documentId: existing.documentId
  });
}

// Régénérer
await strapi.service('api::quiz-session.quiz-session').generateDailyQuiz();
```

## Optimisations Futures (Phase 7+)

1. **Cache in-memory:** Éviter requêtes répétées pour session du jour
2. **Retry automatique:** 3 tentatives en cas d'échec OpenAI
3. **Backup questions:** Pool de questions pré-générées en fallback
4. **Admin panel:** Interface pour voir statut et régénérer
5. **Webhooks:** Notification Discord/Slack si génération échoue
6. **A/B Testing:** Tester différents prompts pour qualité

## Coût Estimé

**GPT-4o pricing (Feb 2026):**
- Input: ~$2.50 / 1M tokens
- Output: ~$10 / 1M tokens

**Estimation par quiz:**
- Prompt: ~500 tokens
- Response: ~1500 tokens
- Coût: ~$0.02 par génération

**Mensuel:** $0.60 (30 jours × $0.02)

## Fichiers Critiques

- `/backend/src/services/quiz-scheduler.ts` - Cron job (à créer)
- `/backend/src/api/quiz-session/services/quiz-session.ts` - Service de génération (à créer)
- `/backend/src/index.ts` - Bootstrap pour démarrer le scheduler (à modifier)
- `/backend/.env` - Configuration OPENAI_API_KEY (à ajouter)
