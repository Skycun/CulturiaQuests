# Documentation du Store Quest (`stores/quest.ts`)

Ce store gère l'état et la logique liés aux quêtes (Quests) de l'application CulturiaQuests. Il interagit avec l'API Strapi pour récupérer les données et fournit des filtres pour l'affichage.

## État (State)

| Propriété | Type | Description |
| :--- | :--- | :--- |
| `quests` | `Quest[]` | La liste complète des quêtes chargées. |
| `loading` | `boolean` | Indique si une requête API est en cours. |
| `error` | `string \| null` | Contient le message d'erreur en cas d'échec de requête. |

## Getters (Computed)

Ces propriétés sont calculées automatiquement à partir de l'état.

### Filtres de Quêtes
| Nom | Description | Logique de filtrage |
| :--- | :--- | :--- |
| **`availableQuests`** | Liste des quêtes du jour (date de début = aujourd'hui). | `date_start` (jour/mois/année) == Date actuelle de l'utilisateur. |
| **`activeQuests`** | Liste des quêtes en cours (commencées mais non terminées). | Au moins un des deux POI (A ou B) n'est pas encore complété. |
| **`completedQuests`** | Liste des quêtes terminées. | Les deux POI (A et B) sont complétés (`true`). |

### Utilitaires
| Nom | Type | Description |
| :--- | :--- | :--- |
| `hasQuests` | `boolean` | `true` si la liste `quests` n'est pas vide. |
| `questCount` | `number` | Nombre total de quêtes. |
| `activeQuestCount` | `number` | Nombre de quêtes actives. |
| `completedQuestCount` | `number` | Nombre de quêtes terminées. |

## Actions

Méthodes pour modifier l'état ou interagir avec l'API.

### API & Chargement
- **`fetchQuests()`**
  - **Description :** Récupère toutes les quêtes depuis l'API Strapi (`GET /quests`).
  - **Population :** Charge automatiquement les relations `npc`, `poi_a`, et `poi_b`.
  - **Gestion d'erreur :** Met à jour `loading` et `error`.

### Manipulation locale
- **`setQuests(data: Quest[])`** : Remplace la liste entière des quêtes.
- **`clearQuests()`** : Réinitialise le store (vide la liste et les erreurs).
- **`addQuest(quest: Quest)`** : Ajoute une quête à la liste.
- **`removeQuest(questId: number)`** : Supprime une quête par son ID.
- **`updateQuest(questId: number, updates: Partial<Quest>)`** : Met à jour les propriétés d'une quête spécifique.

### Logique Métier
- **`updateQuestProgress(questId: number, poiCompleted: 'a' \| 'b')`**
  - Met à jour localement le statut de complétion d'un POI pour une quête donnée.
  - Utile pour une mise à jour optimiste de l'UI avant/après l'appel API.

## Exemple d'utilisation (Vue Component)

```typescript
<script setup lang="ts">
import { useQuestStore } from '~/stores/quest'
import { storeToRefs } from 'pinia'

const questStore = useQuestStore()
// Utilisation de storeToRefs pour garder la réactivité des getters
const { availableQuests, loading, error } = storeToRefs(questStore)

// Chargement des données au montage
onMounted(async () => {
  await questStore.fetchQuests()
})
</script>

<template>
  <div v-if="loading">Chargement...</div>
  <div v-else>
    <div v-for="quest in availableQuests" :key="quest.id">
        <!-- Affiche uniquement les quêtes disponibles -->
        {{ quest.attributes?.npc?.data?.attributes?.firstname }}
    </div>
  </div>
</template>
```
