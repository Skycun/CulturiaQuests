# Logique de Session de Quiz

## Vue d'ensemble

Système de participation au quiz quotidien: récupération des questions, soumission des réponses, calcul du score, validation de l'unicité de tentative.

## Endpoints API

### 1. GET /api/quiz-attempts/today

**Description:** Récupère le quiz du jour (sans les réponses correctes)

**Authentification:** Requise

**Réponse:**
```json
{
  "data": {
    "sessionId": "xxx-session-id",
    "questions": [
      {
        "documentId": "q1",
        "question_text": "En quelle année...",
        "question_type": "qcm",
        "order": 1,
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "tag": {
          "documentId": "tag1",
          "name": "Histoire"
        }
      },
      {
        "documentId": "q2",
        "question_text": "Quand a eu lieu...",
        "question_type": "timeline",
        "order": 2,
        "timeline_range": {"min": 1800, "max": 2000},
        "tag": {
          "documentId": "tag2",
          "name": "Sciences"
        }
      }
    ]
  }
}
```

**Erreurs possibles:**
- `401`: Non authentifié
- `404`: Pas de quiz disponible pour aujourd'hui
- `400`: Vous avez déjà complété le quiz d'aujourd'hui

### 2. POST /api/quiz-attempts/submit

**Description:** Soumet les réponses et reçoit le score + récompenses

**Authentification:** Requise

**Body:**
```json
{
  "sessionId": "xxx-session-id",
  "answers": [
    {
      "questionId": "q1",
      "answer": "Option 2"
    },
    {
      "questionId": "q2",
      "answer": "1969"
    }
  ]
}
```

**Réponse:**
```json
{
  "data": {
    "attempt": {
      "documentId": "attempt-xxx",
      "score": 1850,
      "completed_at": "2026-02-03T14:32:00.000Z"
    },
    "score": 1850,
    "rewards": {
      "tier": "gold",
      "gold": 280,
      "exp": 550,
      "items": [
        {
          "documentId": "item-xxx",
          "name": "Epee Antique",
          "rarity": "rare"
        }
      ]
    },
    "detailedAnswers": [
      {
        "questionId": "q1",
        "questionText": "En quelle année...",
        "userAnswer": "Option 2",
        "correctAnswer": "Option 2",
        "score": 200,
        "isCorrect": true,
        "explanation": "..."
      },
      {
        "questionId": "q2",
        "questionText": "Quand a eu lieu...",
        "userAnswer": "1969",
        "correctAnswer": "1969",
        "score": 250,
        "isCorrect": true,
        "explanation": "..."
      }
    ]
  }
}
```

**Erreurs possibles:**
- `401`: Non authentifié
- `400`: Format invalide (pas 10 réponses)
- `400`: Quiz déjà complété
- `404`: Session introuvable

## Controller Implementation

**Fichier:** `backend/src/api/quiz-attempt/controllers/quiz-attempt.ts`

```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({

  /**
   * Récupère le quiz du jour (sans réponses correctes)
   */
  async getTodayQuiz(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    // Récupérer la guild de l'utilisateur
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['documentId']
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Récupérer la session du jour
    const session = await strapi
      .service('api::quiz-session.quiz-session')
      .getTodaySession();

    if (!session) {
      return ctx.notFound('No quiz available for today. Please try again later.');
    }

    // Vérifier si l'utilisateur a déjà tenté aujourd'hui
    const existingAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { documentId: guild.documentId },
        session: { documentId: session.documentId }
      }
    });

    if (existingAttempt) {
      return ctx.badRequest('You have already completed today\'s quiz');
    }

    // Retirer les réponses correctes et explications
    const safeQuestions = session.questions.map(q => ({
      documentId: q.documentId,
      question_text: q.question_text,
      question_type: q.question_type,
      order: q.order,
      options: q.options,
      timeline_range: q.timeline_range,
      tag: q.tag
    }));

    return ctx.send({
      data: {
        sessionId: session.documentId,
        questions: safeQuestions
      }
    });
  },

  /**
   * Soumet les réponses du quiz
   */
  async submitQuiz(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { sessionId, answers } = ctx.request.body;

    // Validation des données
    if (!sessionId || !answers || !Array.isArray(answers) || answers.length !== 10) {
      return ctx.badRequest('Invalid submission. Expected 10 answers.');
    }

    // Récupérer la guild
    const guild = await strapi.db.query('api::guild.guild').findOne({
      where: { user: { id: user.id } },
      select: ['id', 'documentId', 'gold', 'exp', 'quiz_streak']
    });

    if (!guild) {
      return ctx.notFound('Guild not found');
    }

    // Récupérer la session avec questions
    const session = await strapi.db.query('api::quiz-session.quiz-session').findOne({
      where: { documentId: sessionId },
      populate: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!session) {
      return ctx.notFound('Quiz session not found');
    }

    // Vérifier si déjà tenté
    const existingAttempt = await strapi.db.query('api::quiz-attempt.quiz-attempt').findOne({
      where: {
        guild: { id: guild.id },
        session: { documentId: sessionId }
      }
    });

    if (existingAttempt) {
      return ctx.badRequest('You have already completed this quiz');
    }

    // Calculer le score
    const result = await strapi
      .service('api::quiz-attempt.quiz-attempt')
      .calculateScore(session.questions, answers);

    // Générer les récompenses
    const rewards = await strapi
      .service('api::quiz-attempt.quiz-attempt')
      .generateRewards(guild.documentId, result.totalScore);

    // Créer l'attempt
    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        guild: guild.documentId,
        session: sessionId,
        score: result.totalScore,
        answers: result.detailedAnswers,
        completed_at: new Date(),
        rewards: rewards,
        publishedAt: new Date()
      }
    });

    // Mettre à jour la guild: gold, exp, streak
    await strapi.documents('api::guild.guild').update({
      documentId: guild.documentId,
      data: {
        gold: guild.gold + rewards.gold,
        exp: String(BigInt(guild.exp || 0) + BigInt(rewards.exp)),
        quiz_streak: guild.quiz_streak + 1
      }
    });

    return ctx.send({
      data: {
        attempt,
        score: result.totalScore,
        rewards,
        detailedAnswers: result.detailedAnswers
      }
    });
  }
}));
```

## Service de Scoring

**Fichier:** `backend/src/api/quiz-attempt/services/quiz-attempt.ts`

```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({

  /**
   * Calcule le score basé sur les réponses
   */
  calculateScore(questions, userAnswers) {
    let totalScore = 0;
    const detailedAnswers = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = userAnswers.find(a => a.questionId === question.documentId);

      if (!userAnswer) {
        detailedAnswers.push({
          questionId: question.documentId,
          questionText: question.question_text,
          userAnswer: null,
          correctAnswer: question.correct_answer,
          score: 0,
          isCorrect: false,
          explanation: question.explanation
        });
        continue;
      }

      let score = 0;
      let isCorrect = false;

      if (question.question_type === 'qcm') {
        // QCM: 200 points si correct, 0 sinon
        isCorrect = userAnswer.answer === question.correct_answer;
        score = isCorrect ? 200 : 0;

      } else if (question.question_type === 'timeline') {
        // Timeline: scoring proportionnel à la distance
        const correctYear = parseInt(question.correct_answer);
        const userYear = parseInt(userAnswer.answer);
        const distance = Math.abs(correctYear - userYear);

        if (distance === 0) {
          // Date exacte: 200 + 50 bonus
          score = 250;
          isCorrect = true;
        } else if (distance <= 5) {
          // ≤5 ans: 150-199 points
          score = 200 - (distance * 10);
        } else if (distance <= 20) {
          // ≤20 ans: 50-140 points
          score = 150 - (distance * 5);
        } else if (distance <= 50) {
          // ≤50 ans: 0-45 points
          score = 50 - distance;
        } else {
          // >50 ans: 0 points
          score = 0;
        }

        score = Math.max(0, score);
      }

      totalScore += score;

      detailedAnswers.push({
        questionId: question.documentId,
        questionText: question.question_text,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correct_answer,
        score,
        isCorrect,
        explanation: question.explanation
      });
    }

    return { totalScore, detailedAnswers };
  }
}));
```

## Algorithme de Scoring Détaillé

### Questions QCM

**Règle:** Binaire (tout ou rien)

```
if (userAnswer === correctAnswer) {
  score = 200
} else {
  score = 0
}
```

### Questions Timeline

**Règle:** Proportionnel à la distance + bonus pour exact

```
distance = |correctYear - userYear|

if (distance === 0) {
  score = 250  // Bonus +50 pour date exacte
} else if (distance <= 5) {
  score = 200 - (distance × 10)  // 150-190
} else if (distance <= 20) {
  score = 150 - (distance × 5)   // 50-140
} else if (distance <= 50) {
  score = 50 - distance           // 0-45
} else {
  score = 0
}

score = max(0, score)
```

**Exemples:**
- Année correcte: 1969, réponse: 1969 → **250 points**
- Année correcte: 1969, réponse: 1970 → **190 points** (distance 1)
- Année correcte: 1969, réponse: 1974 → **150 points** (distance 5)
- Année correcte: 1969, réponse: 1979 → **100 points** (distance 10)
- Année correcte: 1969, réponse: 1989 → **50 points** (distance 20)
- Année correcte: 1969, réponse: 2019 → **0 points** (distance 50)

### Score Total

**Maximum théorique:** 2500 points
- 7 QCM × 200 = 1400 points
- 3 Timeline × 250 = 750 points (si toutes exactes)
- Total: 2150 points

**Maximum réaliste:** 2000-2100 points (avec quelques erreurs mineures)

## Routes Configuration

### Fichier: 01-get-today.ts

**Fichier:** `backend/src/api/quiz-attempt/routes/01-get-today.ts`

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/today',
      handler: 'quiz-attempt.getTodayQuiz',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

### Fichier: 02-submit.ts

**Fichier:** `backend/src/api/quiz-attempt/routes/02-submit.ts`

```typescript
export default {
  routes: [
    {
      method: 'POST',
      path: '/quiz-attempts/submit',
      handler: 'quiz-attempt.submitQuiz',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

## Validation et Contraintes

### Contraintes Backend

1. **One attempt per day:** Vérification `guild + session` unique
2. **10 réponses exactement:** Validation du tableau answers
3. **Questions existent:** Vérification des questionIds
4. **Session valide:** Session du jour doit avoir status 'completed'

### Sécurité

1. **Pas d'exposition des réponses:** `correct_answer` et `explanation` retirés dans GET
2. **User isolation:** Controller filtre par authenticated user's guild
3. **Validation des IDs:** Vérification que questionIds correspondent à la session
4. **Rate limiting:** Une seule tentative par jour (pas de spam)

## Gestion du Streak

**Logique:**
- Streak = nombre total de jours où le quiz a été complété
- **Non-consécutif:** Rater un jour ne reset pas
- Incrémentation: `quiz_streak + 1` à chaque soumission
- Jamais de décrémentation

**Exemple:**
- Jour 1: Complète quiz → streak = 1
- Jour 2: Rate quiz → streak = 1 (inchangé)
- Jour 3: Complète quiz → streak = 2
- Jour 4: Complète quiz → streak = 3

## Tests et Validation

### Test du flow complet

```bash
# 1. Récupérer le quiz du jour
GET /api/quiz-attempts/today
Authorization: Bearer <jwt>

# 2. Soumettre les réponses
POST /api/quiz-attempts/submit
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "sessionId": "<session-id-from-step-1>",
  "answers": [
    {"questionId": "q1", "answer": "Option 2"},
    {"questionId": "q2", "answer": "1969"},
    // ... 8 autres réponses
  ]
}

# 3. Vérifier qu'on ne peut pas retenter
GET /api/quiz-attempts/today
→ Devrait retourner 400 "already completed"
```

### Vérifications

1. **Score calculé correctement:** Vérifier QCM et timeline scoring
2. **Rewards générées:** Gold, XP, items ajoutés
3. **Guild mise à jour:** gold, exp, quiz_streak incrémentés
4. **Attempt sauvegardé:** quiz-attempt créé avec answers et rewards
5. **Second attempt bloqué:** Erreur 400 si retry

## Fichiers de Référence

- `/backend/src/api/visit/controllers/visit.ts:80-150` - Pattern de cooldown 24h (openChest)
- `/backend/src/api/guild/controllers/guild.ts` - Pattern de filtrage par user
- `/backend/src/api/player-friendship/controllers/player-friendship.ts` - Pattern de validation et error handling

## Optimisations Futures

1. **Cache session du jour:** Éviter requêtes répétées
2. **Validation côté client:** Vérifier format avant soumission
3. **Time spent tracking:** Mesurer temps de réponse par question
4. **Anti-cheat:** Détecter patterns suspects (trop rapide, trop lent)
5. **Partial save:** Sauvegarder progression si timeout
