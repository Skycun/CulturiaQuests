# Architecture Générale - Quiz Quotidien

## Vue d'ensemble

Système de quiz quotidien avec 10 questions culturelles, scoring, récompenses et leaderboard social.

## Content Types

### quiz-session (Instance de quiz quotidien)

**Fichier:** `backend/src/api/quiz-session/content-types/quiz-session/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "quiz_sessions",
  "info": {
    "singularName": "quiz-session",
    "pluralName": "quiz-sessions",
    "displayName": "Quiz Session"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "date": {
      "type": "date",
      "required": true,
      "unique": true
    },
    "questions": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::quiz-question.quiz-question",
      "mappedBy": "session"
    },
    "generation_status": {
      "type": "enumeration",
      "enum": ["pending", "generating", "completed", "failed"],
      "default": "pending"
    },
    "generation_error": {
      "type": "text"
    },
    "generated_at": {
      "type": "datetime"
    }
  }
}
```

**Rationale:**
- `date` unique assure un seul quiz par jour
- `generation_status` permet de suivre l'état de génération OpenAI
- Pattern similaire au content type `run`

### quiz-question (Questions individuelles)

**Fichier:** `backend/src/api/quiz-question/content-types/quiz-question/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "quiz_questions",
  "info": {
    "singularName": "quiz-question",
    "pluralName": "quiz-questions",
    "displayName": "Quiz Question"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "question_text": {
      "type": "text",
      "required": true
    },
    "question_type": {
      "type": "enumeration",
      "enum": ["qcm", "timeline"],
      "required": true
    },
    "order": {
      "type": "integer",
      "required": true,
      "min": 1,
      "max": 10
    },
    "tag": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::tag.tag"
    },
    "correct_answer": {
      "type": "string",
      "required": true
    },
    "options": {
      "type": "json"
    },
    "timeline_range": {
      "type": "json"
    },
    "explanation": {
      "type": "text"
    },
    "session": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::quiz-session.quiz-session",
      "inversedBy": "questions"
    }
  }
}
```

**Structure des champs JSON:**
- `options` (QCM): `["Option 1", "Option 2", "Option 3", "Option 4"]`
- `timeline_range`: `{"min": 1800, "max": 2025}`
- `correct_answer`: Texte de l'option correcte (QCM) ou année (timeline)

### quiz-attempt (Tentative de quiz)

**Fichier:** `backend/src/api/quiz-attempt/content-types/quiz-attempt/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "quiz_attempts",
  "info": {
    "singularName": "quiz-attempt",
    "pluralName": "quiz-attempts",
    "displayName": "Quiz Attempt"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "quiz_attempts"
    },
    "session": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::quiz-session.quiz-session",
      "inversedBy": "attempts"
    },
    "score": {
      "type": "integer",
      "required": true,
      "default": 0,
      "min": 0,
      "max": 2500
    },
    "answers": {
      "type": "json",
      "required": true
    },
    "completed_at": {
      "type": "datetime",
      "required": true
    },
    "time_spent_seconds": {
      "type": "integer"
    },
    "rewards": {
      "type": "json"
    }
  }
}
```

**Structure des champs JSON:**
- `answers`:
  ```json
  [
    {
      "questionId": "xxx",
      "answer": "1492",
      "score": 200,
      "isCorrect": true
    }
  ]
  ```
- `rewards`:
  ```json
  {
    "tier": "gold",
    "gold": 250,
    "exp": 500,
    "items": [
      {"documentId": "xxx", "name": "Epee Antique", "rarity": "rare"}
    ]
  }
  ```

**Rationale:**
- Pattern similaire à `visit` (one-per-day participation)
- Score max 2500 (10 questions × 250 points max avec bonus timeline)
- One-to-one avec session par guild (enforcé au controller)

### Mise à jour du schema guild

**Fichier:** `backend/src/api/guild/content-types/guild/schema.json`

Ajouter aux `attributes` existants:

```json
{
  "quiz_attempts": {
    "type": "relation",
    "relation": "oneToMany",
    "target": "api::quiz-attempt.quiz-attempt",
    "mappedBy": "guild"
  },
  "quiz_streak": {
    "type": "integer",
    "default": 0,
    "min": 0
  }
}
```

**Rationale:**
- `quiz_streak` = nombre total de jours où le quiz a été fait (non-consécutif)
- Ne se reset jamais, juste un compteur de participation

## Diagramme des Relations

```
quiz-session (1) ----< (N) quiz-question
      |
      | (1)
      |
      v
    (N) quiz-attempt (N) >---- (1) guild
                                    |
                                    v
                                 quiz_streak
```

## Contraintes d'Intégrité

1. **Une session par jour:** Contrainte `unique` sur `quiz-session.date`
2. **Une tentative par jour par guild:** Vérification au controller (guild + session unique)
3. **10 questions par session:** Validation au service de génération
4. **Order des questions:** 1-10, pas de doublons
5. **Question types:** 7 QCM + 3 Timeline (recommandé mais flexible)

## Dépendances

### Packages NPM à ajouter

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "openai": "^4.67.3"
  }
}
```

### Variables d'environnement

**Fichier:** `backend/.env`

```env
OPENAI_API_KEY=sk-xxx
```

## Build Strapi

Après création des content types:

```bash
cd backend
npm install
npm run build
```

## Permissions Bootstrap

**Fichier:** `backend/src/index.ts`

Ajouter aux permissions `authenticated`:

```typescript
const authenticatedActions = [
  // ... existing
  'api::quiz-attempt.quiz-attempt.getTodayQuiz',
  'api::quiz-attempt.quiz-attempt.submitQuiz',
  'api::quiz-attempt.quiz-attempt.getTodayLeaderboard',
  'api::quiz-attempt.quiz-attempt.getMyHistory',
];
```

## Validation Post-Création

Après build Strapi, vérifier dans l'admin:
1. Content Types apparaissent dans le menu
2. Relations sont correctes (bidirectionnelles)
3. Permissions sont granted pour authenticated role

## Fichiers Critiques de Référence

- `/backend/src/api/visit/content-types/visit/schema.json` - Pattern de participation one-per-day
- `/backend/src/api/player-friendship/content-types/player-friendship/schema.json` - Pattern de relations entre guilds
- `/backend/src/api/item/content-types/item/schema.json` - Pattern de JSON fields et relations complexes
