# Documentation des Stores Pinia - CulturiaQuests

## Table des matières

1. [Introduction](#introduction)
2. [Configuration globale](#configuration-globale)
3. [Store Guild](#store-guild)
4. [Store Character](#store-character)
5. [Store Inventory](#store-inventory)
6. [Store Quest](#store-quest)
7. [Store Visit](#store-visit)
8. [Store Run](#store-run)
9. [Store Friendship](#store-friendship)
10. [Store Npc](#store-npc)
11. [Store Zone](#store-zone)
12. [Exemples d'utilisation](#exemples-dutilisation)
13. [Bonnes pratiques](#bonnes-pratiques)

---

## Introduction

CulturiaQuests utilise **Pinia** comme système de gestion d'état. Les stores permettent de gérer les données de l'application de manière centralisée et réactive.

### Qu'est-ce qu'un store ?

Un store est un conteneur qui centralise :
- **State** : Les données de l'application
- **Getters** : Des computed properties pour accéder aux données
- **Actions** : Des fonctions pour modifier les données

### Persistance

Tous les stores utilisent `pinia-plugin-persistedstate` pour sauvegarder automatiquement les données dans le localStorage du navigateur.

**Exception notable :** Le `Store Zone` utilise **IndexedDB** (`idb-keyval`) car le volume de données géographiques (~1500 polygones complexes) est trop important pour le LocalStorage (limité à ~5Mo).

---

## Configuration globale

### Import d'un store dans une page

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const guildStore = useGuildStore()
</script>
```

### Accès aux données

```vue
<template>
  <div>
    <p>Or : {{ guildStore.gold }}</p>
    <p>Nom : {{ guildStore.name }}</p>
  </div>
</template>
```

---

## Store Guild

**Fichier :** `/frontend/app/stores/guild.ts`

### Description

Gère les données de la guilde du joueur (or, expérience, scrap) et hydrate tous les autres stores.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `guild` | `Guild \| null` | Objet guilde complet |
| `loading` | `boolean` | Indique si une requête est en cours |
| `error` | `string \| null` | Message d'erreur éventuel |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasGuild` | `boolean` | Vérifie si l'utilisateur a une guilde |
| `gold` | `number` | Quantité d'or de la guilde |
| `exp` | `number` | Expérience de la guilde |
| `scrap` | `number` | Scrap de la guilde |
| `name` | `string` | Nom de la guilde |

### Actions principales

#### `fetchGuild()`

Récupère les informations de base de la guilde.

```typescript
const guildStore = useGuildStore()
await guildStore.fetchGuild()
```

#### `fetchAll()`

Récupère la guilde avec **toutes** les relations (personnages, items, quêtes, etc.) et hydrate automatiquement tous les autres stores.

```typescript
const guildStore = useGuildStore()
await guildStore.fetchAll() // Hydrate tous les stores en une seule requête
```

**Stores hydratés automatiquement :**
- CharacterStore
- InventoryStore
- QuestStore
- VisitStore
- RunStore
- FriendshipStore

#### `refetchStats()`

Rafraîchit uniquement les statistiques (gold, exp, scrap).

```typescript
await guildStore.refetchStats()
```

#### `createGuildSetup(payload)`

Crée une nouvelle guilde avec un personnage et 3 items de départ.

```typescript
await guildStore.createGuildSetup({
  guildName: 'Les Aventuriers',
  characterName: 'Héros',
  iconId: 123
})
```

#### `clearAll()`

Nettoie toutes les données de tous les stores (utile lors de la déconnexion).

```typescript
guildStore.clearAll()
```

### Exemple complet

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const guildStore = useGuildStore()

// Charger toutes les données au montage du composant
onMounted(async () => {
  await guildStore.fetchAll()
})
</script>

<template>
  <div v-if="guildStore.hasGuild">
    <h1>{{ guildStore.name }}</h1>
    <p>Or : {{ guildStore.gold }} 💰</p>
    <p>XP : {{ guildStore.exp }} ⭐</p>
    <p>Scrap : {{ guildStore.scrap }} 🔩</p>
  </div>
  <div v-else>
    <p>Aucune guilde trouvée</p>
  </div>
</template>
```

---

## Store Character

**Fichier :** `/frontend/app/stores/character.ts`

### Description

Gère les personnages de la guilde.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `characters` | `Character[]` | Liste des personnages |
| `availableIcons` | `StrapiMedia[]` | Icônes disponibles pour les personnages |
| `loading` | `boolean` | État de chargement |
| `iconsLoading` | `boolean` | État de chargement des icônes |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasCharacters` | `boolean` | Vérifie si la guilde a des personnages |
| `characterCount` | `number` | Nombre de personnages |
| `getCharacterById(id)` | `Character \| undefined` | Récupère un personnage par ID |

### Actions principales

#### `fetchCharacters()`

Récupère tous les personnages de la guilde.

```typescript
const characterStore = useCharacterStore()
await characterStore.fetchCharacters()
```

#### `fetchCharacterIcons()`

Récupère les icônes disponibles pour les personnages.

```typescript
await characterStore.fetchCharacterIcons()
```

#### `createCharacter(data)`

Crée un nouveau personnage.

```typescript
const newCharacter = await characterStore.createCharacter({
  firstname: 'Jean',
  lastname: 'Dupont',
  iconId: 5
})
```

#### `saveCharacter(documentId, data)`

Modifie un personnage existant.

```typescript
const success = await characterStore.saveCharacter('doc-id-123', {
  firstname: 'Jean',
  lastname: 'Martin',
  iconId: 6
})
```

#### `deleteCharacter(documentId)`

Supprime un personnage.

```typescript
const success = await characterStore.deleteCharacter('doc-id-123')
```

### Exemple complet

```vue
<script setup lang="ts">
import { useCharacterStore } from '~/stores/character'

const characterStore = useCharacterStore()

onMounted(async () => {
  await characterStore.fetchCharacters()
  await characterStore.fetchCharacterIcons()
})

const createNewCharacter = async () => {
  await characterStore.createCharacter({
    firstname: 'Alice',
    lastname: 'Wonder',
    iconId: 10
  })
}
</script>

<template>
  <div>
    <h2>Mes personnages ({{ characterStore.characterCount }})</h2>
    <div v-for="char in characterStore.characters" :key="char.id">
      <p>{{ char.firstname }} {{ char.lastname }}</p>
    </div>

    <button @click="createNewCharacter">Créer un personnage</button>
  </div>
</template>
```

---

## Store Inventory

**Fichier :** `/frontend/app/stores/inventory.ts`

### Description

Gère l'inventaire de la guilde (armes, casques, charmes).

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `items` | `Item[]` | Liste des items |
| `availableIcons` | `any[]` | Icônes disponibles pour les items |
| `loading` | `boolean` | État de chargement |
| `iconsLoading` | `boolean` | État de chargement des icônes |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasItems` | `boolean` | Vérifie si la guilde a des items |
| `itemCount` | `number` | Nombre d'items |
| `itemsBySlot(slot)` | `Item[]` | Filtre par slot ('weapon', 'helmet', 'charm') |
| `itemsByRarity(rarity)` | `Item[]` | Filtre par rareté |
| `scrappedItems` | `Item[]` | Items détruits/scrappés |
| `equippableItems` | `Item[]` | Items équipables (non scrappés) |

### Actions principales

#### `fetchItems()`

Récupère tous les items de la guilde.

```typescript
const inventoryStore = useInventoryStore()
await inventoryStore.fetchItems()
```

#### `fetchItemIcons()`

Récupère les icônes disponibles pour les items.

```typescript
await inventoryStore.fetchItemIcons()
```

### Exemple complet

```vue
<script setup lang="ts">
import { useInventoryStore } from '~/stores/inventory'

const inventoryStore = useInventoryStore()

onMounted(async () => {
  await inventoryStore.fetchItems()
})

const weapons = computed(() => inventoryStore.itemsBySlot('weapon'))
const legendaryItems = computed(() => inventoryStore.itemsByRarity('Légendaire'))
</script>

<template>
  <div>
    <h2>Inventaire ({{ inventoryStore.itemCount }} items)</h2>

    <section>
      <h3>Armes</h3>
      <div v-for="weapon in weapons" :key="weapon.id">
        <p>{{ weapon.name }} - Niveau {{ weapon.level }}</p>
      </div>
    </section>

    <section>
      <h3>Items légendaires</h3>
      <div v-for="item in legendaryItems" :key="item.id">
        <p>{{ item.name }}</p>
      </div>
    </section>
  </div>
</template>
```

---

## Store Quest

**Fichier :** `/frontend/app/stores/quest.ts`

### Description

Gère les quêtes de la guilde.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `quests` | `Quest[]` | Liste des quêtes |
| `loading` | `boolean` | État de chargement |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasQuests` | `boolean` | Vérifie si la guilde a des quêtes |
| `questCount` | `number` | Nombre total de quêtes |
| `activeQuests` | `Quest[]` | Quêtes en cours (non terminées) |
| `completedQuests` | `Quest[]` | Quêtes terminées |
| `activeQuestCount` | `number` | Nombre de quêtes actives |
| `completedQuestCount` | `number` | Nombre de quêtes terminées |

### Actions principales

#### `fetchQuests()`

Récupère toutes les quêtes de la guilde.

```typescript
const questStore = useQuestStore()
await questStore.fetchQuests()
```

#### `updateQuestProgress(questId, poi)`

Met à jour la progression d'une quête.

```typescript
// Marquer le POI A comme complété
questStore.updateQuestProgress(123, 'a')

// Marquer le POI B comme complété
questStore.updateQuestProgress(123, 'b')
```

### Exemple complet

```vue
<script setup lang="ts">
import { useQuestStore } from '~/stores/quest'

const questStore = useQuestStore()

onMounted(async () => {
  await questStore.fetchQuests()
})
</script>

<template>
  <div>
    <h2>Quêtes actives ({{ questStore.activeQuestCount }})</h2>
    <div v-for="quest in questStore.activeQuests" :key="quest.id">
      <p>{{ quest.name }}</p>
      <p>POI A : {{ quest.is_poi_a_completed ? '✅' : '❌' }}</p>
      <p>POI B : {{ quest.is_poi_b_completed ? '✅' : '❌' }}</p>
    </div>

    <h2>Quêtes terminées ({{ questStore.completedQuestCount }})</h2>
    <div v-for="quest in questStore.completedQuests" :key="quest.id">
      <p>{{ quest.name }} ✅</p>
    </div>
  </div>
</template>
```

---

## Store Visit

**Fichier :** `/frontend/app/stores/visit.ts`

### Description

Gère les visites de POIs (Points d'Intérêt).

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `visits` | `Visit[]` | Liste des visites |
| `loading` | `boolean` | État de chargement |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasVisits` | `boolean` | Vérifie si la guilde a des visites |
| `visitCount` | `number` | Nombre de visites |
| `totalGoldEarned` | `number` | Total d'or gagné via les visites |
| `totalExpEarned` | `number` | Total d'XP gagné via les visites |

### Actions principales

#### `fetchVisits()`

Récupère toutes les visites de la guilde.

```typescript
const visitStore = useVisitStore()
await visitStore.fetchVisits()
```

### Exemple complet

```vue
<script setup lang="ts">
import { useVisitStore } from '~/stores/visit'

const visitStore = useVisitStore()

onMounted(async () => {
  await visitStore.fetchVisits()
})
</script>

<template>
  <div>
    <h2>Statistiques des visites</h2>
    <p>Nombre de visites : {{ visitStore.visitCount }}</p>
    <p>Or total gagné : {{ visitStore.totalGoldEarned }} 💰</p>
    <p>XP total gagné : {{ visitStore.totalExpEarned }} ⭐</p>

    <h3>Historique</h3>
    <div v-for="visit in visitStore.visits" :key="visit.id">
      <p>POI visité - Or : {{ visit.total_gold_earned }}</p>
    </div>
  </div>
</template>
```

---

## Store Run

**Fichier :** `/frontend/app/stores/run.ts`

### Description

Gère les runs (sessions de jeu dans les musées).

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `runs` | `Run[]` | Liste des runs |
| `loading` | `boolean` | État de chargement |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasRuns` | `boolean` | Vérifie si la guilde a des runs |
| `runCount` | `number` | Nombre total de runs |
| `activeRun` | `Run \| null` | Run en cours (pas de date de fin) |
| `completedRuns` | `Run[]` | Runs terminés |
| `totalGoldEarned` | `number` | Total d'or gagné via les runs |
| `totalExpEarned` | `number` | Total d'XP gagné via les runs |

### Actions principales

#### `fetchRuns()`

Récupère tous les runs de la guilde.

```typescript
const runStore = useRunStore()
await runStore.fetchRuns()
```

### Exemple complet

```vue
<script setup lang="ts">
import { useRunStore } from '~/stores/run'

const runStore = useRunStore()

onMounted(async () => {
  await runStore.fetchRuns()
})
</script>

<template>
  <div>
    <h2>Run actif</h2>
    <div v-if="runStore.activeRun">
      <p>Musée : {{ runStore.activeRun.museum?.name }}</p>
      <p>Or gagné : {{ runStore.activeRun.gold_earned }}</p>
    </div>
    <p v-else>Aucun run en cours</p>

    <h2>Statistiques totales</h2>
    <p>Runs terminés : {{ runStore.completedRuns.length }}</p>
    <p>Or total : {{ runStore.totalGoldEarned }} 💰</p>
    <p>XP total : {{ runStore.totalExpEarned }} ⭐</p>
  </div>
</template>
```

---

## Store Friendship

**Fichier :** `/frontend/app/stores/friendship.ts`

### Description

Gère les relations d'amitié avec les NPCs.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `friendships` | `Friendship[]` | Liste des amitiés |
| `loading` | `boolean` | État de chargement |
| `error` | `string \| null` | Erreur éventuelle |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasFriendships` | `boolean` | Vérifie si la guilde a des amitiés |
| `friendshipCount` | `number` | Nombre d'amitiés |
| `getFriendshipByNpc(npcId)` | `Friendship \| null` | Récupère l'amitié avec un NPC spécifique |
| `totalQuestsUnlocked` | `number` | Total de quêtes débloquées |
| `totalExpeditionsUnlocked` | `number` | Total d'expéditions débloquées |

### Actions principales

#### `fetchFriendships()`

Récupère toutes les amitiés de la guilde.

```typescript
const friendshipStore = useFriendshipStore()
await friendshipStore.fetchFriendships()
```

### Exemple complet

```vue
<script setup lang="ts">
import { useFriendshipStore } from '~/stores/friendship'

const friendshipStore = useFriendshipStore()

onMounted(async () => {
  await friendshipStore.fetchFriendships()
})

const checkFriendship = (npcId: number) => {
  const friendship = friendshipStore.getFriendshipByNpc(npcId)
  return friendship ? friendship.level : 0
}
</script>

<template>
  <div>
    <h2>Amitiés ({{ friendshipStore.friendshipCount }})</h2>

    <div v-for="friendship in friendshipStore.friendships" :key="friendship.id">
      <p>NPC : {{ friendship.npc?.name }}</p>
      <p>Niveau d'amitié : {{ friendship.level }}</p>
    </div>

    <h3>Statistiques</h3>
    <p>Quêtes débloquées : {{ friendshipStore.totalQuestsUnlocked }}</p>
    <p>Expéditions débloquées : {{ friendshipStore.totalExpeditionsUnlocked }}</p>
  </div>
</template>
```

---

## Store Npc

**Fichier :** `/frontend/app/stores/npc.ts`

### Description

Gère les données des NPCs (Personnages Non Joueurs) et la logique d'affichage des journaux (Stories). Il centralise le formatage et le tri des NPCs en fonction de leur découverte par le joueur.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `npcs` | `Npc[]` | Liste complète des NPCs |
| `loading` | `boolean` | État de chargement |
| `error` | `string \| null` | Erreur éventuelle |
| `storiesSortMethod` | `'alpha' \| 'entries'` | Méthode de tri actuelle pour les journaux |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `hasNpcs` | `boolean` | Vérifie si des NPCs sont chargés |
| `npcCount` | `number` | Nombre total de NPCs |
| `sortedJournals` | `Object[]` | **Clé** : Liste formatée et triée des journaux pour l'affichage (Grid) |
| `getNpcFriendshipInfo(id)` | `Object` | Retourne les infos de progression (découvert, niveaux débloqués) pour un NPC |
| `discoveredCount` | `number` | Nombre de NPCs découverts |

### Actions principales

#### `fetchNpcs()`

Récupère la liste de tous les NPCs.

```typescript
const npcStore = useNpcStore()
await npcStore.fetchNpcs()
```

#### `toggleSortMethod()`

Bascule le tri des journaux entre alphabétique et par progression.

```typescript
npcStore.toggleSortMethod()
```

### Exemple complet (JournalGrid)

```vue
<script setup lang="ts">
import { useNpcStore } from '~/stores/npc'

const npcStore = useNpcStore()
const { sortedJournals } = storeToRefs(npcStore)

onMounted(async () => {
  await npcStore.fetchNpcs()
})
</script>

<template>
  <div v-for="journal in sortedJournals" :key="journal.id">
    <p>{{ journal.name }} - Niveau {{ journal.level }}</p>
    <img :src="journal.image" />
  </div>
</template>
```

---

## Store Zone

**Fichier :** `/frontend/app/stores/zone.ts`

### Description

Gère les données géographiques (carte) de l'application : Régions, Départements et Communautés de Communes (EPCI).

Contrairement aux autres stores, il utilise **IndexedDB** pour le cache afin de stocker les lourds fichiers GeoJSON sans ralentir le navigateur ni saturer le LocalStorage.

### State

| Propriété | Type | Description |
|-----------|------|-------------|
| `regions` | `Region[]` | Liste des régions |
| `departments` | `Department[]` | Liste des départements |
| `comcoms` | `Comcom[]` | Liste des communautés de communes (EPCI) |
| `loading` | `boolean` | État de chargement global |
| `error` | `string \| null` | Erreur éventuelle |
| `isInitialized` | `boolean` | Indique si les données sont chargées (cache ou API) |

### Getters

| Getter | Type | Description |
|--------|------|-------------|
| `getZonesForZoom(zoom)` | `GeoZone[]` | Retourne la collection appropriée selon le niveau de zoom (Regions < 6, Depts 6-10, Comcoms > 10) |

### Actions principales

#### `init()`

Charge intelligemment les 3 collections en parallèle.
1. Vérifie le cache IndexedDB (`idb-keyval`).
2. Si cache vide ou version obsolète : Télécharge depuis l'API Strapi (paginé) et met en cache.
3. Si cache valide : Hydrate le state depuis IndexedDB (très rapide).

```typescript
const zoneStore = useZoneStore()
await zoneStore.init()
```

---

## Exemples d'utilisation

### Charger toutes les données au démarrage de l'application

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const guildStore = useGuildStore()

onMounted(async () => {
  // Charge la guilde + tous les stores liés en une seule requête
  await guildStore.fetchAll()
})
</script>
```

### Combiner plusieurs stores

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'
import { useCharacterStore } from '~/stores/character'
import { useInventoryStore } from '~/stores/inventory'

const guildStore = useGuildStore()
const characterStore = useCharacterStore()
const inventoryStore = useInventoryStore()

const stats = computed(() => ({
  gold: guildStore.gold,
  characters: characterStore.characterCount,
  items: inventoryStore.itemCount,
  weapons: inventoryStore.itemsBySlot('weapon').length
}))
</script>

<template>
  <div>
    <h2>Tableau de bord</h2>
    <p>Or : {{ stats.gold }} 💰</p>
    <p>Personnages : {{ stats.characters }}</p>
    <p>Items : {{ stats.items }}</p>
    <p>Armes : {{ stats.weapons }}</p>
  </div>
</template>
```

### Déconnexion et nettoyage des stores

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const { logout } = useStrapiAuth()
const router = useRouter()
const guildStore = useGuildStore()

const handleLogout = async () => {
  // Nettoie tous les stores
  guildStore.clearAll()

  // Déconnexion Strapi
  await logout()

  // Redirection
  await router.push('/account/login')
}
</script>
```

### Rafraîchir uniquement certaines données

```vue
<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'
import { useInventoryStore } from '~/stores/inventory'

const guildStore = useGuildStore()
const inventoryStore = useInventoryStore()

const refreshData = async () => {
  // Rafraîchir seulement les stats de la guilde
  await guildStore.refetchStats()

  // Rafraîchir seulement l'inventaire
  await inventoryStore.fetchItems()
}
</script>
```

---

## Bonnes pratiques

### 1. Utiliser `fetchAll()` au démarrage

Pour charger toutes les données en une seule requête :

```typescript
onMounted(async () => {
  await guildStore.fetchAll()
})
```

### 2. Vérifier les états de chargement

```vue
<template>
  <div v-if="guildStore.loading">
    Chargement...
  </div>
  <div v-else-if="guildStore.error">
    Erreur : {{ guildStore.error }}
  </div>
  <div v-else>
    <!-- Contenu -->
  </div>
</template>
```

### 3. Utiliser les getters computed

Les getters sont automatiquement réactifs :

```typescript
const weapons = computed(() => inventoryStore.itemsBySlot('weapon'))
```

### 4. Ne pas modifier directement le state

❌ **Mauvais :**
```typescript
guildStore.guild.gold = 100
```

✅ **Bon :**
```typescript
await guildStore.refetchStats()
```

### 5. Gérer les erreurs

```typescript
try {
  await characterStore.createCharacter(data)
} catch (error) {
  console.error('Erreur lors de la création:', error)
  // Afficher un message à l'utilisateur
}
```

### 6. Nettoyer lors de la déconnexion

Toujours appeler `clearAll()` lors de la déconnexion :

```typescript
guildStore.clearAll()
await logout()
```

### 7. Persistance automatique

Les données sont automatiquement sauvegardées dans le localStorage. Pas besoin de gérer manuellement la persistance.

### 8. Typage TypeScript

Utilisez les types définis dans `~/types/` :

```typescript
import type { Character } from '~/types/character'
import type { Item } from '~/types/item'
```

---

## Résumé des stores

| Store | Fichier | Rôle principal |
|-------|---------|----------------|
| **Guild** | `guild.ts` | Guilde, or, XP, scrap, hydratation |
| **Character** | `character.ts` | Personnages de la guilde |
| **Inventory** | `inventory.ts` | Items (armes, casques, charmes) |
| **Quest** | `quest.ts` | Quêtes actives et terminées |
| **Visit** | `visit.ts` | Visites de POIs |
| **Run** | `run.ts` | Sessions de jeu dans les musées |
| **Friendship** | `friendship.ts` | Amitiés avec les NPCs |
| **Npc** | `npc.ts` | Données des NPCs et formatage des journaux (Stories) |
| **Zone** | `zone.ts` | Carte (Régions, Départements, Comcoms) + Cache IndexedDB |

---

## Support

Pour toute question sur l'utilisation des stores, consultez :
- Le code source dans `/frontend/app/stores/`
- Les types dans `/frontend/app/types/`
- Les exemples d'utilisation dans les pages existantes
