# Plan: Feature Expédition Musée

## Résumé des décisions utilisateur

- **Relation Museum-NPC**: 1 NPC par musée (manyToOne)
- **Tirage quête**: Au début de l'expédition (1/5 chance)
- **Déclencheur**: Clic sur le musée → page NPC → /expedition
- **Persistence**: Timer calculé depuis `date_start` (pas de timer local)
- **Page NPC (vision finale)**: Dialog expedition_appear + info quête + bouton lancer
- **Page NPC (placeholder)**: "Interaction NPC" + bouton "Accepter la quête"

---

## Phase 1: Backend - Modifications Schema

### 1.1 Ajouter relation NPC dans Museum
**Fichier**: `backend/src/api/museum/content-types/museum/schema.json`

```json
"npc": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::npc.npc",
  "inversedBy": "museums"
}
```

### 1.2 Ajouter relation inverse dans NPC
**Fichier**: `backend/src/api/npc/content-types/npc/schema.json`

```json
"museums": {
  "type": "relation",
  "relation": "oneToMany",
  "target": "api::museum.museum",
  "mappedBy": "npc"
}
```

### 1.3 Rebuild Strapi
```bash
cd backend && npm run build
```

---

## Phase 2: Backend - Nouveaux Endpoints

### 2.1 Créer fichier routes
**Fichier**: `backend/src/api/run/routes/01-expedition.ts`

Routes:
- `POST /runs/start-expedition`
- `POST /runs/end-expedition`
- `GET /runs/active`

### 2.2 POST /runs/start-expedition

**Input**:
```typescript
{ museumDocumentId: string, userLat: number, userLng: number }
```

**Logique**:
1. Auth user → get guild
2. Fetch museum avec npc + dialogs
3. Valider distance (Haversine ≤ museum.radius)
4. Vérifier pas de run active (sans date_end)
5. Calculer DPS depuis équipement des personnages
6. Roll 1/5 → target_threshold (5-15) ou null
7. Créer run: date_start, dps, museum, npc, guild
8. Retourner run + dialog expedition_appear

**Output**:
```typescript
{
  run: Run,
  questRolled: boolean,
  dialog: string[]
}
```

### 2.3 POST /runs/end-expedition

**Input**:
```typescript
{ runDocumentId: string }
```

**Logique**:
1. Fetch run, valider appartient au user
2. Calculer elapsed = now - date_start
3. totalDamage = elapsed * dps
4. tier = floor(log(totalDamage/100) / log(1.5)) + 2
5. gold = tier * 250 + totalDamage/100
6. xp = tier * 180 + totalDamage/150
7. itemCount = min(4 + floor(tier/2), 12)
8. Générer loot via item.service.generateRandomItem()
9. Si target_threshold et tier >= target → entry_unlocked = true
10. Update run, guild.gold, guild.exp
11. Retourner rewards + loot

**Output**:
```typescript
{
  run: Run,
  rewards: { gold, xp, items: Item[] },
  questSuccess: boolean
}
```

### 2.4 GET /runs/active

Retourne le run actif (sans date_end) de la guild du user, ou null.

---

## Phase 3: Backend - Service Logic

**Fichier**: `backend/src/api/run/services/run.ts`

Ajouter méthodes:
- `calculateGuildDPS(guildDocumentId)` - Somme des dégâts de tous les items équipés
- `calculateTierFromDamage(totalDamage)` - Formule logarithmique
- `calculateRewards(tier, totalDamage)` - Gold et XP
- `rollQuestChance()` - 20% de chance, tier cible 5-15

---

## Phase 4: Frontend - Page Placeholder NPC

**Fichier**: `frontend/app/pages/npc-interaction.vue` (NOUVEAU)

```vue
<template>
  <div class="h-screen bg-gradient-to-b from-[#040050] to-black
              flex flex-col items-center justify-center text-white">
    <h1 class="font-pixel text-4xl mb-8">Interaction NPC</h1>
    <FormPixelButton color="indigo" @click="acceptQuest">
      Accepter la quête
    </FormPixelButton>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'blank' });

const route = useRoute();
const router = useRouter();
const museumId = computed(() => route.query.museum);

async function acceptQuest() {
  // TODO: Appel API start-expedition
  router.push('/expedition');
}
</script>
```

---

## Phase 5: Frontend - Modifications expedition.vue

**Fichier**: `frontend/app/pages/expedition.vue`

Changements:
1. Charger run active au mount (ou depuis query param)
2. Timer basé sur `date_start`:
   ```js
   const secondsElapsed = ref(0);
   onMounted(() => {
     const start = new Date(run.value.date_start).getTime();
     setInterval(() => {
       secondsElapsed.value = Math.floor((Date.now() - start) / 1000);
     }, 1000);
   });
   ```
3. Afficher museum.name depuis run
4. stopExpedition() → POST /runs/end-expedition → redirect summary

---

## Phase 6: Frontend - Modifications expedition-summary.vue

**Fichier**: `frontend/app/pages/expedition-summary.vue`

Changements:
1. Recevoir rewards depuis API (pas générer localement)
2. Afficher vrais items du loot
3. Afficher si quête réussie (entry_unlocked)
4. Rafraîchir guildStore après affichage

---

## Ordre d'implémentation

1. [x] Schema museum: ajouter relation npc
   Status: ✅ Already present in schema.json
2. [x] Schema npc: ajouter relation inverse museums
   Status: ✅ Already present in schema.json
3. [x] `npm run build` backend
   Status: ✅ Build successful
4. [x] Créer `backend/src/api/run/routes/01-expedition.ts`
   Status: ✅ Already present
5. [x] Implémenter `run.service.ts` (calculateGuildDPS, rewards, etc.)
   Status: ✅ Implemented
6. [x] Implémenter `run.controller.ts` (startExpedition, endExpedition, getActiveRun)
   Status: ✅ Implemented
7. [x] Ajouter permissions dans `backend/src/index.ts`
   Status: ✅ Added permissions in bootstrap
8. [x] Créer `frontend/app/pages/npc-interaction.vue` (placeholder)
   Status: ✅ Created with functional logic
9. [x] Modifier `frontend/app/pages/expedition.vue` (timer depuis date_start)
   Status: ✅ Implemented with runStore integration
10. [x] Modifier `frontend/app/pages/expedition-summary.vue` (vraies données)
    Status: ✅ Implemented with API fetch
11. [x] Ajouter méthodes dans `frontend/app/stores/run.ts`
   Status: ✅ Implemented early to support frontend pages
12. [x] Vérification finale
    Status: ✅ Verified logic consistency (DPS calc) and flow links.


---

## Fichiers critiques

### Backend:
- `backend/src/api/museum/content-types/museum/schema.json`
- `backend/src/api/npc/content-types/npc/schema.json`
- `backend/src/api/run/routes/01-expedition.ts` (nouveau)
- `backend/src/api/run/services/run.ts`
- `backend/src/api/run/controllers/run.ts`
- `backend/src/index.ts` (permissions)

### Frontend:
- `frontend/app/pages/npc-interaction.vue` (nouveau)
- `frontend/app/pages/expedition.vue`
- `frontend/app/pages/expedition-summary.vue`
- `frontend/app/stores/run.ts`

---

## Vérification

1. **Test schema**: Vérifier relation museum-npc dans admin Strapi
2. **Test API**: Postman/curl les 3 endpoints
3. **Test flow complet**: Carte → NPC → Expédition → Summary
4. **Test persistence**: Fermer app pendant expédition, rouvrir
5. **Test quête**: Vérifier roll 1/5 et entry_unlocked
