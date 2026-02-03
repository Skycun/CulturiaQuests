# Audit — Intégration & Sécurité du Quiz

**Date :** 2026-02-03
**Branche :** Feature/Quiz
**Périmètre :** Backend (controllers, services, routes, permissions), Frontend (pages test), Script de génération

---

## Résumé

| Catégorie | Trouvé | Corrigé | En attente |
|-----------|--------|---------|------------|
| Sécurité | 3 | 1 | 2 |
| Intégration plan vs code | 4 | 0 | 4 |
| Refactoring | 2 | 0 | 2 |

---

## Sécurité

### 1. CRITIQUE — `correct_answer` exposé via l'API CRUD de `quiz-question` ✅ CORRIGÉ

**Fichiers touchés :**
- `backend/src/api/quiz-question/controllers/quiz-question.ts`
- `frontend/app/pages/tests/quiz-sessions.vue`

**Problème :**
`backend/src/index.ts:82-83` accorde les permissions `find` et `findOne` sur `quiz-question` à tout utilisateur authentifié. Le controller était un factory par défaut (une seule ligne) — il retournait tous les champs sans filtrage, y compris `correct_answer` et `explanation`.

Requête exploitable avant le fix :
```
GET /api/quiz-questions?filters[session][documentId][$eq]=<session-du-jour>
Authorization: Bearer <jwt>
```
Retournait les 10 réponses correctes avant même de démarrer le quiz. C'est exactement ce que faisait la page debug `/tests/quiz-sessions.vue` via le même endpoint.

**Fix appliqué :**
Override de `find` et `findOne` dans le controller avec une fonction `stripSensitiveFields` qui retire `correct_answer` et `explanation` avant la réponse. Le calcul du score reste exclusivement server-side dans `submitQuiz` — ces champs sont lus en interne via `strapi.db.query` mais jamais envoyés au client.

La page debug a été mise à jour pour ne plus afficher ces champs (elle ne les reçoit plus).

---

### 2. MOYEN — `limit` dans `getMyHistory` non borné

**Fichier :** `backend/src/api/quiz-attempt/controllers/quiz-attempt.ts:301`

**Problème :**
```typescript
const { limit = 30 } = ctx.query;
// ...
limit: parseInt(limit as string),
```
Pas de vérification de maximum. Un utilisateur peut passer `?limit=999999` et charger toute la table `quiz_attempts` pour sa guild.

**Fix proposé :**
```typescript
const { limit = 30 } = ctx.query;
const sanitizedLimit = Math.min(Math.max(parseInt(limit as string) || 30, 1), 100);
```

---

### 3. FAIBLE — Permissions `find`/`findOne` sur `quiz-session` et `quiz-question` plus larges que nécessaire

**Fichier :** `backend/src/index.ts:80-83`

**Problème :**
Les seuls endpoints utilisés par le client sont les custom routes (`/today`, `/submit`, `/leaderboard`, `/history`). Ces derniers récupèrent les sessions et questions en interne via les services. Les permissions CRUD sur `quiz-session` et `quiz-question` ne sont nécessaires que pour la page debug `/tests/quiz-sessions.vue`.

**Décision à prendre :** Si la page debug est abandonnée en production, ces 4 permissions peuvent être retirées de `index.ts`. Sinon, le fix du point 1 suffit à les rendre inoffensives.

---

## Intégration — Écarts plan vs implémentation

### 4. Streak — logique contradictoire entre le plan et le code

**Fichiers :**
- Plan : `plans/quiz/03-quiz-session.md:494-499`
- Code : `backend/src/api/quiz-attempt/controllers/quiz-attempt.ts:6-41` (`updateQuizStreak`)

**Problème :**
Le plan dit explicitement que le streak est **non-consécutif** :
> Streak = nombre total de jours où le quiz a été complété. Rater un jour ne reset pas.

Le code fait exactement l'inverse. `updateQuizStreak` vérifie si le dernier attempt était hier et **reset à 1** sinon. C'est un vrai streak consécutif.

Le comportement du code (consécutif avec reset) est plus cohérent avec le concept de "streak" et plus intéressant en gameplay. Le plan est à mettre à jour pour refléter la réalité.

---

### 5. Score max affiché en frontend vs réalité

**Fichier :** `frontend/app/pages/tests/quiz.vue:227` et `:265`

**Problème :**
Le frontend affiche deux fois `/ 2000` comme score maximum :
```html
<span class="text-lg text-gray-400"> / 2000</span>
```

Le max réel est **2150** :
- 7 QCM × 200 = 1 400
- 3 Timeline × 250 (exact) = 750
- Total = 2 150

La valeur `2000` est incorrecte.

**Fix proposé :** Remplacer `/ 2000` par `/ 2150` aux deux occurrences.

---

### 6. `liveScore` — dead code

**Fichier :** `frontend/app/pages/tests/quiz.vue:35-46`

**Problème :**
La computed `liveScore` existe mais ne fait rien de valide (elle retourne toujours 0) et n'est jamais utilisée dans le template. Elle a visiblement été un essai de calcul côté client qui a été abandonné en faveur du calcul server-side.

**Fix proposé :** Supprimer la computed entièrement (lignes 34-46).

---

### 7. Génération quotidienne — pas de cron en-app

**Fichiers :**
- Plan : `plans/quiz/02-questions-generation.md` décrit un `backend/src/services/quiz-scheduler.ts` avec `node-cron`
- Réalité : ce fichier n'existe pas. La génération se fait uniquement via `scripts/generate-quiz-questions.ts`

**État actuel :**
Le script CLI est une solution fonctionnelle pour le développement. Il nécessite un appel manuel (ou un cron externe) pour créer le quiz chaque jour. Si personne ne lance le script, il n'y a pas de quiz.

**Décision à prendre :** Implémenter le scheduler en-app décrit dans le plan, ou documenter que la génération reste externe et à orchestrer (GitHub Actions, cron serveur, etc.).

---

### 8. Permissions CRUD sur `quiz-session` et `quiz-question` — voir point 3

---

## Refactoring

### 9. Long method — `submitQuiz`

**Fichier :** `backend/src/api/quiz-attempt/controllers/quiz-attempt.ts:114-212`

**Problème :**
La méthode fait 8 choses en séquence : validation du body, récupération guild, récupération session, vérification duplicate, calcul score, génération rewards, création attempt, mise à jour guild + streak. C'est environ 100 lignes de logique dans un seul controller method.

**Refactor proposé :** Extraire la logique de mise à jour guild (gold + exp + streak) dans le service `quiz-attempt` pour que le controller ne garde que l'orchestration haute-niveau et les retours HTTP. Exemple :

```typescript
// Dans le service quiz-attempt.ts
async applyRewards(guildDocumentId: string, guild: any, rewards: any, sessionDate: string) {
  await strapi.documents('api::guild.guild').update({
    documentId: guildDocumentId,
    data: {
      gold: (guild.gold || 0) + rewards.gold,
      exp: String(BigInt(guild.exp || 0) + BigInt(rewards.exp)),
    },
  });
  return await updateQuizStreak(strapi, guild, sessionDate);
}
```

---

### 10. Leaderboard dupliqué × 2 dans le template

**Fichier :** `frontend/app/pages/tests/quiz.vue`

**Problème :**
Le bloc d'affichage du leaderboard est copié-collé identiquement deux fois :
- Lignes 235–256 (écran "déjà complété")
- Lignes 336–357 (écran "résultats après soumission")

**Refactor proposé :** Extraire en composant `QuizLeaderboard.vue` dans `components/quiz/` et l'utiliser aux deux endroits avec `:leaderboard="leaderboard"` en prop.

---

## Checklist de suivi

- [x] Override controller `quiz-question` — `correct_answer` et `explanation` masqués
- [x] Page debug `quiz-sessions.vue` mise à jour
- [ ] Borner `limit` dans `getMyHistory` (max 100)
- [ ] Corriger score max affiché : `/ 2000` → `/ 2150`
- [ ] Supprimer `liveScore` dead code
- [ ] Décider sur permissions CRUD `quiz-session` / `quiz-question`
- [ ] Mettre à jour le plan streak (`03-quiz-session.md`) pour refléter le comportement consécutif
- [ ] Décider sur le scheduler en-app vs génération externe
- [ ] Extraire `applyRewards` dans le service (refactor `submitQuiz`)
- [ ] Extraire composant `QuizLeaderboard.vue`
