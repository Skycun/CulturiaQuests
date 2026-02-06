# Leaderboard Social entre Amis

## Vue d'ensemble

Système de classement quotidien affichant les scores du quiz d'aujourd'hui pour l'utilisateur et ses amis acceptés, avec affichage des streaks.

## Endpoint API

### GET /api/quiz-attempts/leaderboard

**Description:** Récupère le classement du quiz d'aujourd'hui pour l'utilisateur et ses amis

**Authentification:** Requise

**Réponse:**
```json
{
  "data": [
    {
      "rank": 1,
      "username": "alice_2024",
      "guildName": "Les Explorateurs",
      "score": 2100,
      "streak": 45,
      "isMe": false
    },
    {
      "rank": 2,
      "username": "current_user",
      "guildName": "Ma Guilde",
      "score": 1850,
      "streak": 12,
      "isMe": true
    },
    {
      "rank": 3,
      "username": "bob_scholar",
      "guildName": "Les Savants",
      "score": 1600,
      "streak": 3,
      "isMe": false
    }
  ]
}
```

**Notes:**
- Classement trié par score décroissant
- Inclut uniquement les amis qui ont **accepté** la demande d'amitié
- Inclut uniquement ceux qui ont **complété le quiz d'aujourd'hui**
- `isMe` permet de highlight l'utilisateur courant dans l'UI

## Controller Implementation

**Fichier:** `backend/src/api/quiz-attempt/controllers/quiz-attempt.ts`

Ajouter la méthode:

```typescript
/**
 * Récupère le leaderboard du quiz d'aujourd'hui (amis uniquement)
 */
async getTodayLeaderboard(ctx) {
  const user = ctx.state.user;
  if (!user) {
    return ctx.unauthorized('You must be logged in');
  }

  // Récupérer la guild de l'utilisateur
  const guild = await strapi.db.query('api::guild.guild').findOne({
    where: { user: { id: user.id } },
    select: ['id', 'documentId', 'name']
  });

  if (!guild) {
    return ctx.notFound('Guild not found');
  }

  // Récupérer la session du jour
  const session = await strapi
    .service('api::quiz-session.quiz-session')
    .getTodaySession();

  if (!session) {
    // Pas de quiz aujourd'hui, retourner tableau vide
    return ctx.send({ data: [] });
  }

  // Récupérer les amitiés acceptées
  const friendships = await strapi.db.query('api::player-friendship.player-friendship').findMany({
    where: {
      status: 'accepted',
      $or: [
        { requester: { documentId: guild.documentId } },
        { receiver: { documentId: guild.documentId } }
      ]
    },
    populate: {
      requester: { select: ['documentId'] },
      receiver: { select: ['documentId'] }
    }
  });

  // Extraire les documentIds des amis
  const friendGuildIds = friendships.map(f =>
    f.requester.documentId === guild.documentId
      ? f.receiver.documentId
      : f.requester.documentId
  );

  // Ajouter soi-même pour être dans le leaderboard
  friendGuildIds.push(guild.documentId);

  // Récupérer les attempts du jour pour ces guilds
  const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
    where: {
      session: { documentId: session.documentId },
      guild: { documentId: { $in: friendGuildIds } }
    },
    populate: {
      guild: {
        select: ['documentId', 'name', 'quiz_streak'],
        populate: {
          user: {
            select: ['username']
          }
        }
      }
    },
    orderBy: { score: 'desc' }
  });

  // Formater le leaderboard
  const leaderboard = attempts.map((attempt, index) => ({
    rank: index + 1,
    username: attempt.guild.user.username,
    guildName: attempt.guild.name,
    score: attempt.score,
    streak: attempt.guild.quiz_streak,
    isMe: attempt.guild.documentId === guild.documentId
  }));

  return ctx.send({ data: leaderboard });
}
```

## Routes Configuration

**Fichier:** `backend/src/api/quiz-attempt/routes/03-leaderboard.ts`

```typescript
export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/leaderboard',
      handler: 'quiz-attempt.getTodayLeaderboard',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

## Logique de Filtrage

### Étape 1: Récupérer les Amitiés Acceptées

```typescript
const friendships = await strapi.db.query('api::player-friendship.player-friendship').findMany({
  where: {
    status: 'accepted',  // Uniquement acceptées
    $or: [
      { requester: { documentId: guildId } },  // Où je suis l'émetteur
      { receiver: { documentId: guildId } }     // Où je suis le receveur
    ]
  }
});
```

**Pattern utilisé:** Même que dans player-friendship controller existant

### Étape 2: Extraire les IDs des Amis

```typescript
const friendGuildIds = friendships.map(f =>
  f.requester.documentId === guildId
    ? f.receiver.documentId   // Si je suis requester, l'ami est receiver
    : f.requester.documentId  // Sinon, l'ami est requester
);

// S'ajouter soi-même
friendGuildIds.push(guildId);
```

### Étape 3: Récupérer les Attempts du Jour

```typescript
const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
  where: {
    session: { documentId: todaySessionId },
    guild: { documentId: { $in: friendGuildIds } }
  },
  orderBy: { score: 'desc' }
});
```

**Résultat:** Seulement les amis qui ont complété le quiz aujourd'hui

### Étape 4: Formater et Enrichir

```typescript
const leaderboard = attempts.map((attempt, index) => ({
  rank: index + 1,               // Position dans le classement
  username: attempt.guild.user.username,
  guildName: attempt.guild.name,
  score: attempt.score,
  streak: attempt.guild.quiz_streak,
  isMe: attempt.guild.documentId === guildId  // Highlight user
}));
```

## Cas Particuliers

### Aucun ami n'a fait le quiz

**Résultat:** Leaderboard avec uniquement l'utilisateur (si fait le quiz)

```json
{
  "data": [
    {
      "rank": 1,
      "username": "current_user",
      "guildName": "Ma Guilde",
      "score": 1850,
      "streak": 12,
      "isMe": true
    }
  ]
}
```

### L'utilisateur n'a pas fait le quiz

**Résultat:** Leaderboard des amis qui l'ont fait (utilisateur absent)

```json
{
  "data": [
    {
      "rank": 1,
      "username": "alice_2024",
      "guildName": "Les Explorateurs",
      "score": 2100,
      "streak": 45,
      "isMe": false
    }
  ]
}
```

### Aucun quiz aujourd'hui

**Résultat:** Tableau vide

```json
{
  "data": []
}
```

### Aucun ami accepté

**Résultat:** Leaderboard avec uniquement soi (si quiz fait)

## Affichage Frontend

### Composant Leaderboard

**Fichier:** `frontend/app/components/quiz/QuizLeaderboard.vue`

```vue
<template>
  <div class="leaderboard-container">
    <h2 class="text-2xl font-bold mb-4">Classement du Jour</h2>

    <div v-if="leaderboard.length === 0" class="empty-state">
      <p>Aucun ami n'a encore fait le quiz aujourd'hui.</p>
    </div>

    <div v-else class="leaderboard-list">
      <div
        v-for="entry in leaderboard"
        :key="entry.username"
        :class="[
          'leaderboard-entry',
          { 'highlight-me': entry.isMe }
        ]"
      >
        <div class="rank">
          <span class="rank-badge" :class="getRankClass(entry.rank)">
            {{ entry.rank }}
          </span>
        </div>

        <div class="user-info">
          <p class="username">{{ entry.username }}</p>
          <p class="guild-name">{{ entry.guildName }}</p>
        </div>

        <div class="stats">
          <p class="score">{{ entry.score }} pts</p>
          <p class="streak">🔥 {{ entry.streak }} jours</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuizStore } from '~/stores/quiz';

const quizStore = useQuizStore();
const leaderboard = ref([]);

onMounted(async () => {
  leaderboard.value = await quizStore.fetchLeaderboard();
});

const getRankClass = (rank: number) => {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return 'rank-default';
};
</script>
```

**Styles:**
- Rank 1: Badge or avec icône 🥇
- Rank 2: Badge argent avec icône 🥈
- Rank 3: Badge bronze avec icône 🥉
- `isMe`: Highlight avec border colorée ou background différent
- Streak: Affichage avec emoji feu 🔥

### Store Pinia

**Fichier:** `frontend/app/stores/quiz.ts`

```typescript
export const useQuizStore = defineStore('quiz', () => {
  const leaderboard = ref([]);

  async function fetchLeaderboard() {
    const { find } = useStrapi();
    const response = await find('quiz-attempts/leaderboard');
    leaderboard.value = response.data;
    return response.data;
  }

  return {
    leaderboard,
    fetchLeaderboard
  };
});
```

## Optimisations

### Cache côté frontend

```typescript
const CACHE_DURATION = 60000; // 1 minute
let lastFetch = 0;
let cachedLeaderboard = null;

async function fetchLeaderboard() {
  const now = Date.now();
  if (cachedLeaderboard && (now - lastFetch) < CACHE_DURATION) {
    return cachedLeaderboard;
  }

  const { find } = useStrapi();
  const response = await find('quiz-attempts/leaderboard');
  cachedLeaderboard = response.data;
  lastFetch = now;
  return response.data;
}
```

### Pagination (si beaucoup d'amis)

Si >50 amis:

```typescript
async getTodayLeaderboard(ctx) {
  const { page = 1, limit = 20 } = ctx.query;

  // ... existing friendship logic

  const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
    where: { /* ... */ },
    orderBy: { score: 'desc' },
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });

  // ... format leaderboard
}
```

## Interactions Sociales

### "Défi Ami"

Feature future: Envoyer une notification à un ami qui n'a pas fait le quiz

```typescript
// Identifier les amis qui n'ont PAS fait le quiz
const friendsWithoutAttempt = friendGuildIds.filter(fid =>
  !attempts.find(a => a.guild.documentId === fid)
);
```

### Comparaison Directe

Feature future: Afficher diff de score avec un ami spécifique

```typescript
const myScore = leaderboard.find(e => e.isMe)?.score || 0;
const friendScore = leaderboard.find(e => e.username === 'alice_2024')?.score || 0;
const diff = myScore - friendScore;  // +200 ou -150
```

## Statistiques Leaderboard

### Top performer hebdomadaire

```typescript
// Récupérer tous les attempts de la semaine
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);

const weekAttempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
  where: {
    completed_at: { $gte: weekAgo },
    guild: { documentId: { $in: friendGuildIds } }
  },
  populate: { guild: { populate: { user: true } } }
});

// Grouper par guild et calculer moyenne
const guildScores = {};
weekAttempts.forEach(attempt => {
  if (!guildScores[attempt.guild.documentId]) {
    guildScores[attempt.guild.documentId] = {
      username: attempt.guild.user.username,
      scores: []
    };
  }
  guildScores[attempt.guild.documentId].scores.push(attempt.score);
});

// Calculer moyennes et trier
const topPerformers = Object.values(guildScores)
  .map(g => ({
    username: g.username,
    avgScore: g.scores.reduce((a, b) => a + b, 0) / g.scores.length,
    quizCount: g.scores.length
  }))
  .sort((a, b) => b.avgScore - a.avgScore);
```

## Tests et Validation

### Test du leaderboard

```bash
# 1. Créer plusieurs guilds/users
# 2. Créer des amitiés acceptées entre eux
# 3. Faire compléter le quiz par plusieurs guilds avec scores différents

# 4. Récupérer le leaderboard
GET /api/quiz-attempts/leaderboard
Authorization: Bearer <jwt>
```

**Vérifier:**
1. ✅ Trié par score décroissant
2. ✅ Seulement amis acceptés
3. ✅ Seulement quiz d'aujourd'hui
4. ✅ User courant présent si quiz fait
5. ✅ `isMe` correct
6. ✅ Streaks affichés

### Test cas limites

1. **Aucun ami:** Vérifier que user seul apparaît
2. **Amis pending/rejected:** Vérifier qu'ils n'apparaissent pas
3. **Quiz d'hier:** Vérifier qu'ancien quiz n'apparaît pas
4. **User n'a pas fait quiz:** Vérifier absence du leaderboard

## Permissions

**Fichier:** `backend/src/index.ts`

Ajouter aux actions authenticated:

```typescript
'api::quiz-attempt.quiz-attempt.getTodayLeaderboard',
```

## Fichiers de Référence

- `/backend/src/api/player-friendship/controllers/player-friendship.ts:find()` - Pattern de query bidirectionnelle des amitiés
- `/backend/src/api/player-friendship/controllers/player-friendship.ts:searchUser()` - Pattern de filtrage par status
- `/frontend/tests/e2e/friends.spec.ts` - Tests E2E pour système d'amis

## Extensions Futures

1. **Leaderboard global:** Top 100 tous joueurs (opt-in)
2. **Leaderboard hebdomadaire:** Agrégation scores semaine
3. **Leaderboard par streak:** Top streaks entre amis
4. **Achievements sociaux:** "Battre 10 amis", "Top 1 pendant 7 jours"
5. **Graph historique:** Évolution du score vs amis sur 30 jours
6. **Notifications:** "Ton ami X t'a battu de 50 points aujourd'hui!"
