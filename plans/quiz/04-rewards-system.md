# Système de Récompenses du Quiz

## Vue d'ensemble

Système de récompenses aléatoires basé sur le score obtenu au quiz, inspiré du système de chest POI existant. Rewards: Gold, XP, et 1-2 items avec rareté variable.

## Tiers de Récompenses

### Classification par Score

| Tier | Score | Pourcentage | Description |
|------|-------|-------------|-------------|
| **Bronze** | 0-999 | 0-49% | Début de partie ou mauvaise session |
| **Silver** | 1000-1399 | 50-69% | Performance moyenne |
| **Gold** | 1400-1799 | 70-89% | Bonne performance |
| **Platinum** | 1800-2500 | 90-100% | Excellence, quasi-parfait |

### Récompenses par Tier

| Tier | Gold | XP | Items |
|------|------|-----|-------|
| Bronze | 50-100 | 100-200 | 1-2 |
| Silver | 100-200 | 200-400 | 1-2 |
| Gold | 200-350 | 400-700 | 1-2 |
| Platinum | 300-500 | 600-1000 | 1-2 |

**Note:** Les montants sont aléatoires dans les ranges (pas de valeur fixe)

## Service de Génération de Récompenses

**Fichier:** `backend/src/api/quiz-attempt/services/quiz-attempt.ts`

Ajouter au service existant:

```typescript
/**
 * Génère des récompenses aléatoires basées sur le score
 */
async generateRewards(guildDocumentId: string, score: number) {
  // Déterminer le tier basé sur le score
  let tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  if (score >= 1800) tier = 'platinum';      // 90%+
  else if (score >= 1400) tier = 'gold';     // 70-89%
  else if (score >= 1000) tier = 'silver';   // 50-69%
  else tier = 'bronze';                       // <50%

  // Ranges de récompenses par tier
  const tierRewards = {
    bronze: { goldMin: 50, goldMax: 100, expMin: 100, expMax: 200 },
    silver: { goldMin: 100, goldMax: 200, expMin: 200, expMax: 400 },
    gold: { goldMin: 200, goldMax: 350, expMin: 400, expMax: 700 },
    platinum: { goldMin: 300, goldMax: 500, expMin: 600, expMax: 1000 }
  };

  const tierData = tierRewards[tier];

  // Générer gold aléatoire
  const gold = Math.floor(
    Math.random() * (tierData.goldMax - tierData.goldMin + 1)
  ) + tierData.goldMin;

  // Générer XP aléatoire
  const exp = Math.floor(
    Math.random() * (tierData.expMax - tierData.expMin + 1)
  ) + tierData.expMin;

  // Générer 1-2 items aléatoires
  const itemCount = Math.random() < 0.5 ? 1 : 2;
  const items = [];

  // Récupérer le maxFloor pour la génération d'items
  const runs = await strapi.db.query('api::run.run').findMany({
    where: { guild: { documentId: guildDocumentId } },
    select: ['threshold_reached']
  });
  const maxFloor = runs.reduce((max, run) => {
    return run.threshold_reached && run.threshold_reached > max ? run.threshold_reached : max;
  }, 1);

  // Générer items avec le service existant
  for (let i = 0; i < itemCount; i++) {
    const item = await strapi
      .service('api::item.item')
      .generateRandomItem(guildDocumentId, maxFloor);

    items.push({
      documentId: item.documentId,
      name: item.name,
      rarity: item.rarity?.name || 'common'
    });
  }

  return {
    tier,
    gold,
    exp,
    items
  };
}
```

## Intégration avec Service Item Existant

### Réutilisation de generateRandomItem

**Service utilisé:** `/backend/src/api/item/services/item.ts`

**Signature:**
```typescript
async generateRandomItem(
  guildDocumentId: string,
  maxFloor: number,
  visitDocumentId?: string
): Promise<Item>
```

**Paramètres pour quiz:**
- `guildDocumentId`: ID de la guild du joueur
- `maxFloor`: Plus haut palier atteint dans les runs (pour level scaling)
- `visitDocumentId`: Non utilisé pour quiz (optionnel)

**Ce que le service génère:**
- Rareté aléatoire (common 60%, rare 30%, epic 9%, legendary 1%)
- Level basé sur maxFloor ± 5
- Index damage selon rareté
- Slot aléatoire (weapon, helmet, charm)
- Tags aléatoires (1 pour common/rare/epic, 2 pour legendary)
- Nom procédural basé sur slot + tags
- Icon aléatoire depuis media library

## Format de Stockage des Rewards

### Dans quiz-attempt.rewards (JSON)

```json
{
  "tier": "gold",
  "gold": 280,
  "exp": 550,
  "items": [
    {
      "documentId": "item-xxx-1",
      "name": "Epee Antique",
      "rarity": "rare"
    },
    {
      "documentId": "item-xxx-2",
      "name": "Heaume Mystique",
      "rarity": "epic"
    }
  ]
}
```

**Utilité:**
- Historique des récompenses obtenues
- Affichage dans l'UI de résultats
- Analytics (quels tiers obtiennent quelles rewards)

## Application des Récompenses

### Mise à jour de la Guild

Après calcul des rewards (dans `submitQuiz` controller):

```typescript
// Mettre à jour gold, exp, streak
await strapi.documents('api::guild.guild').update({
  documentId: guild.documentId,
  data: {
    gold: guild.gold + rewards.gold,
    exp: String(BigInt(guild.exp || 0) + BigInt(rewards.exp)),
    quiz_streak: guild.quiz_streak + 1
  }
});
```

**Notes:**
- `exp` utilise BigInt pour éviter overflow
- `gold` est un integer normal
- Items déjà créés et liés à la guild par generateRandomItem

### Items Automatiquement Ajoutés

Le service `generateRandomItem` crée directement l'item en base avec:
- Relation `guild: guildDocumentId`
- L'item apparaît dans l'inventaire de la guild
- Pas besoin de création manuelle

## Variations de Récompenses

### Randomisation

**Gold et XP:** Random dans le range
```typescript
// Exemple pour Gold tier
gold = random(200, 350)  // Peut être 200, 250, 300, 350...
exp = random(400, 700)   // Peut être 400, 550, 700...
```

**Nombre d'items:** 50% chance de 1 item, 50% chance de 2 items
```typescript
itemCount = Math.random() < 0.5 ? 1 : 2
```

**Rareté des items:** Selon drop rates du service item
- Common: 60%
- Rare: 30%
- Epic: 9%
- Legendary: 1%

### Streak n'influence PAS les récompenses

**Décision design:** Les rewards ne varient PAS avec le streak
- Streak = métrique de participation, pas de performance
- Rewards = basées uniquement sur score du quiz actuel
- Pas de bonus "jour 7", "jour 30", etc.

**Rationale:**
- Simplicité du système
- Pas de pression pour streaks consécutives
- Focus sur la qualité des réponses, pas la régularité

## Affichage Frontend des Récompenses

### Composant Rewards Display

Similaire aux composants chest:
- `components/quiz/QuizRewardsDisplay.vue`
- `components/quiz/RewardItemCard.vue`
- `components/quiz/RewardBadges.vue`

**Éléments à afficher:**
1. **Tier badge:** Bronze/Silver/Gold/Platinum avec couleur
2. **Gold badge:** Montant + icône pièce
3. **XP badge:** Montant + icône étoile
4. **Item cards:** Pour chaque item (rarity color, icon, name, level, damage)

**Couleurs par tier:**
- **Platinum:** `bg-gradient-to-r from-cyan-400 to-blue-500` (cyan/bleu brillant)
- **Gold:** `bg-gradient-to-r from-amber-400 to-yellow-500` (or)
- **Silver:** `bg-gradient-to-r from-gray-300 to-gray-400` (argent)
- **Bronze:** `bg-gradient-to-r from-orange-700 to-orange-800` (bronze)

## Statistiques et Analytics

### Données à tracker

Via `quiz-attempt.rewards`:
- Distribution des tiers (combien de bronze vs platinum)
- Gold moyen par tier
- XP moyen par tier
- Rareté d'items par tier
- Nombre d'items moyen

### Requête d'exemple

```typescript
// Calculer le gold moyen par tier
const attempts = await strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({
  select: ['rewards']
});

const tierStats = {
  bronze: { count: 0, totalGold: 0 },
  silver: { count: 0, totalGold: 0 },
  gold: { count: 0, totalGold: 0 },
  platinum: { count: 0, totalGold: 0 }
};

attempts.forEach(attempt => {
  const tier = attempt.rewards.tier;
  tierStats[tier].count++;
  tierStats[tier].totalGold += attempt.rewards.gold;
});

// Calculer moyennes
Object.keys(tierStats).forEach(tier => {
  const avg = tierStats[tier].totalGold / tierStats[tier].count;
  console.log(`${tier}: ${avg.toFixed(0)} gold en moyenne`);
});
```

## Équilibrage et Tuning

### Ajustement des ranges

Si les récompenses semblent trop généreuses ou trop faibles:

**Modifier les tierRewards:**
```typescript
const tierRewards = {
  bronze: { goldMin: 50, goldMax: 100, expMin: 100, expMax: 200 },
  // Ajuster ici selon feedback
};
```

### Ajustement des drop rates items

Si trop de legendaries ou pas assez:

**Modifier dans item service:**
```typescript
const DROP_RATES = {
  common: 60,
  rare: 30,
  epic: 9,
  legendary: 1
};
```

### Ajustement nombre d'items

Si 2 items systématiques devient trop généreux:

```typescript
// Option 1: Basé sur tier
const itemCount = tier === 'platinum' || tier === 'gold' ? 2 : 1;

// Option 2: Random pondéré
const itemCount = Math.random() < 0.3 ? 1 : 2;  // 70% chance de 2 items

// Option 3: Basé sur score exact
const itemCount = score >= 2000 ? 2 : 1;
```

## Comparaison avec Chest POI

| Aspect | Chest POI | Quiz |
|--------|-----------|------|
| **Déclencheur** | Géolocalisation | Participation quiz |
| **Cooldown** | 24h par POI | 24h global |
| **Gold** | 50-150 fixe | 50-500 selon tier |
| **XP** | 100-300 fixe | 100-1000 selon tier |
| **Items** | 1-3 random | 1-2 random |
| **Scaling** | MaxFloor | MaxFloor |
| **Variabilité** | Faible | Haute (tiers) |

**Avantage quiz:** Rewards proportionnelles à la performance

## Tests et Validation

### Test des tiers

```typescript
// Tester chaque tier
const testScores = [500, 1200, 1600, 1900];

for (const score of testScores) {
  const rewards = await strapi
    .service('api::quiz-attempt.quiz-attempt')
    .generateRewards('guild-xxx', score);

  console.log(`Score ${score}:`, rewards);
}
```

**Vérifier:**
1. Tier correct assigné
2. Gold dans le range
3. XP dans le range
4. 1 ou 2 items générés
5. Items avec raretés variées

### Vérification inventaire

Après soumission quiz:
1. Ouvrir inventaire guild
2. Vérifier nouveaux items présents
3. Vérifier gold/exp incrémentés
4. Vérifier streak incrémenté

## Fichiers de Référence

- `/backend/src/api/item/services/item.ts` - Service de génération d'items aléatoires (à réutiliser)
- `/backend/src/api/visit/services/visit.ts` - Pattern de génération de loot (generateChestLoot)
- `/frontend/app/components/chest/ChestLootDisplay.vue` - Pattern d'affichage rewards

## Optimisations Futures

1. **Bonus streaks optionnel:** +10% gold/exp tous les 7 jours de streak
2. **Événements spéciaux:** Double rewards certains jours
3. **Achievements:** "Obtenir 10 platinum tiers" → reward spéciale
4. **Pity system:** Garantir un rare/epic après X bronzes
5. **Loot tables personnalisées:** Différentes pour quiz vs chest
