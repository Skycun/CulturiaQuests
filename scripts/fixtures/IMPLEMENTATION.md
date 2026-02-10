# Implémentation du Script de Fixtures

## ✅ Ce qui a été implémenté

### Architecture Complète

```
scripts/fixtures/
├── generate-user-base.ts          # ✅ CLI interactif avec inquirer
├── package.json                   # ✅ Dependencies et scripts npm
├── tsconfig.json                  # ✅ Configuration TypeScript ESM
├── lib/
│   ├── strapi-client.ts           # ✅ Client API réutilisable
│   ├── data-generator.ts          # ✅ Génération avec Faker.js (FR)
│   ├── activity-distributor.ts    # ✅ Distribution temporelle + clustering
│   └── user-persona.ts            # ✅ 4 personas (Hardcore/Regular/Casual/Dormant)
├── config/
│   └── generation-config.ts       # ✅ Toutes les constantes configurables
├── README.md                      # ✅ Documentation utilisateur
└── IMPLEMENTATION.md              # ✅ Ce fichier
```

### Fonctionnalités

#### CLI (generate-user-base.ts)

- ✅ Mode interactif avec inquirer
- ✅ Mode direct : `--users N`
- ✅ Mode check : `--check` (vérifie les données de référence)
- ✅ Mode cleanup : `--cleanup` (supprime les fixtures)
- ✅ Progress bars avec cli-progress
- ✅ Coloration avec chalk
- ✅ Gestion d'erreurs complète
- ✅ Résumé détaillé après génération

#### Client Strapi (strapi-client.ts)

**Méthodes de fetch** :
- ✅ `fetchReferenceData()` - Récupère tags, rarities, NPCs, POIs, museums, quiz sessions, icons
- ✅ `getTags()`, `getRarities()`, `getNPCs()`, `getPOIs()`, `getMuseums()`
- ✅ `getRecentQuizSessions(days)` - Sessions des N derniers jours
- ✅ `getAllIcons()` - Toutes les images de la media library

**Méthodes de création** :
- ✅ `createUser()` - Via `/auth/local/register`
- ✅ `createGuild()` - Avec user JWT
- ✅ `createCharacter()` - Avec user JWT
- ✅ `createStarterItems()` - 3 items (weapon, helmet, charm)
- ✅ `createVisit()` - POI visit avec gold/XP
- ✅ `createRun()` - Museum expedition
- ✅ `createQuest()` - Quête NPC entre 2 POIs
- ✅ `createQuizAttempt()` - Tentative de quiz
- ✅ `createItem()` - Item généré
- ✅ `createFriendship()` - Amitié entre joueurs
- ✅ `createNPCFriendship()` - Progression avec NPC

**Méthodes de mise à jour** :
- ✅ `updateGuild()` - Gold, XP, quiz_streak

**Méthodes de cleanup** :
- ✅ `deleteGuild()` - Suppression avec cascade
- ✅ `deleteUser()` - Suppression utilisateur
- ✅ `findGuildsByUsernamePrefix()` - Recherche fixtures

#### Générateur de Données (data-generator.ts)

**User Data** :
- ✅ `generateUserData()` - Username (timestamped), email, password, guild name, character name
- ✅ Faker.js configuré en français
- ✅ Noms de guild avec `faker.company.name()`
- ✅ Noms de character avec `faker.person.firstName/lastName()`

**Items** :
- ✅ `generateItemData()` - Slot, level, rarity, damage, icon, tags
- ✅ Distribution de rareté : 50% common, 30% rare, 15% epic, 5% legendary
- ✅ Legendary = 2 tags, autres = 1 tag
- ✅ Noms générés avec nouns/adjectives/suffixes
- ✅ Dégâts selon rareté (common: 1-10, rare: 5-15, epic: 10-20, legendary: 15-25)

**Activités** :
- ✅ `generateVisitData()` - POI, timestamp, gold, XP, chestsOpened
- ✅ `generateRunData()` - Museum, NPC, duration, maxFloor, gold, XP
- ✅ `generateQuestData()` - NPC, 2 POIs, gold, XP, completed
- ✅ `generateQuizAttemptData()` - Session, score (gaussien), gold, XP

**Récompenses** :
- ✅ `calculateRewards()` - Gold/XP avec multiplicateur de persona
- ✅ `calculateQuizRewards()` - Basé sur score (gold = score/25, xp = score/50)
- ✅ Multiplicateur Hardcore = 1.2x

**Friendships** :
- ✅ `selectFriendshipStatus()` - 60% accepted, 25% pending, 15% rejected
- ✅ `selectActivityType()` - Selon poids du persona

#### Distribution Temporelle (activity-distributor.ts)

**Clustering** :
- ✅ `distributeActivities()` - Génère timestamps sur N jours
- ✅ `generateActiveStreaks()` - Streaks de jours actifs (3-5j Hardcore, 1-2j Casual)
- ✅ Pauses réalistes entre streaks (1-2j Hardcore, 7-14j Dormant)

**Heures de pointe** :
- ✅ `selectPeakHour()` - Distribution pondérée
  - 8h-9h : 20%
  - 12h-14h : 30%
  - 18h-22h : 40%
  - Autres : 10%

**Quiz Scores** :
- ✅ `generateQuizScore()` - Distribution gaussienne (Box-Muller transform)
  - Hardcore : mean=1800, stdDev=300
  - Regular : mean=1400, stdDev=350
  - Casual : mean=1000, stdDev=400
  - Dormant : mean=600, stdDev=300
- ✅ Clamp 0-2500

**Connection Logs** :
- ✅ `generateConnectionLogs()` - Backfill logs hebdomadaires

#### Personas (user-persona.ts)

**Types** :
- ✅ `enum UserPersona` - HARDCORE, REGULAR, CASUAL, DORMANT

**Distribution** :
- ✅ `assignPersona()` - 10% / 30% / 45% / 15%
- ✅ Paramètres d'activité par persona (activitiesPerMonth, activeDays, streakLength, pauseDays)
- ✅ Quiz score params par persona
- ✅ Friendships count par persona
- ✅ `getRewardMultiplier()` - 1.2 / 1.0 / 0.9 / 0.8

#### Configuration (generation-config.ts)

**IDs de référence** :
- ✅ `RARITY_IDS` - basic=1, common=3, rare=5, epic=7, legendary=9
- ✅ `TAG_IDS` - History=1, Art=3, Science=5, Nature=34, Society=9, Make=13

**Paramètres** :
- ✅ `PERSONA_DISTRIBUTION` - %  par persona
- ✅ `PERSONA_ACTIVITY_PARAMS` - Tous les paramètres d'activité
- ✅ `PEAK_HOURS` - Heures de pointe avec poids
- ✅ `ACTIVITY_WEIGHTS` - Poids visit/run/quest/quiz par persona
- ✅ `BASE_REWARDS` - Gold/XP par type d'activité
- ✅ `RARITY_WEIGHTS` - Distribution des rarités
- ✅ `ITEMS_PER_PERSONA` - Nombre d'items générés
- ✅ `FRIENDSHIP_STATUS_WEIGHTS` - Distribution accepted/pending/rejected
- ✅ `RUN_PARAMS` - Duration, maxFloor
- ✅ `RATE_LIMITS` - Délais entre requêtes API
- ✅ `SIMULATION_DAYS` - 30 jours
- ✅ `CONNECTION_LOGS_WEEKS` - 12 semaines

## ⚠️ Ce qui reste à faire

### Permissions Strapi

Le script est prêt mais nécessite que les permissions Strapi soient configurées manuellement :

**À configurer dans Settings > Users & Permissions Plugin > Roles > Authenticated** :

- [ ] Guild : `create`, `update`, `find`, `findOne`
- [ ] Character : `create`, `find`, `findOne`
- [ ] Item : `create`, `find`, `findOne`
- [ ] Visit : `create`
- [ ] Run : `create`
- [ ] Quest : `create`
- [ ] Quiz-Attempt : `create`
- [ ] Friendship : `create`
- [ ] NPC-Friendship : `create`

### Alternative : Endpoint Custom

Une alternative serait de créer un endpoint custom dans Strapi qui bypasse les permissions :

```typescript
// backend/src/api/fixtures/routes/fixtures.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/fixtures/generate-user',
      handler: 'fixtures.generateUser',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
```

Cet endpoint pourrait utiliser les services Strapi directement sans passer par les permissions API.

### Tests à effectuer

1. **Configurer les permissions** dans Strapi Admin
2. **Lancer le check** : `npm run check`
3. **Générer 5 utilisateurs** : `npm run generate -- --users 5`
4. **Vérifier dans le dashboard admin** :
   - Overview : Metrics remplies
   - Players : 5 utilisateurs listés
   - Map : Visites et runs
   - Economy : Gold/XP distribués
   - Quiz : Attempts créés
   - Social : Friendships

5. **Cleanup** : `npm run cleanup`

## 📊 Métriques Attendues

Pour 50 utilisateurs générés :

- **Users/Guilds/Characters** : 50 de chaque
- **Items** : 150 (starter) + ~500-1500 (générés) = ~650-1650 total
- **Activities** : ~1000 (20/user en moyenne)
  - Visits : ~400
  - Runs : ~300
  - Quests : ~150
  - Quiz Attempts : ~150
- **Gold total** : ~50k-200k (varie selon distribution)
- **XP total** : ~25k-100k
- **Friendships** : ~150-250
- **NPC Friendships** : ~100-150

## 🚀 Prochaines Étapes

1. **Tester avec 5 users** après configuration des permissions
2. **Ajuster les paramètres** dans `generation-config.ts` si nécessaire
3. **Générer 50+ users** pour la démo
4. **Vérifier tous les dashboards** admin
5. **Documenter les résultats** et screenshots

## 💡 Améliorations Futures

- [ ] Mode `--dry-run` pour simuler sans créer
- [ ] Export JSON des données générées
- [ ] Import de données depuis JSON
- [ ] Parallélisation avancée des activités
- [ ] Génération de connection logs plus détaillés
- [ ] Support de différentes périodes de simulation
- [ ] Mode `--append` pour ajouter des activités aux users existants
- [ ] Statistiques détaillées par persona après génération
