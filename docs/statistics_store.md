# Statistics Store Documentation

Ce store Pinia `useStatisticsStore` gère la récupération des statistiques globales de la guilde.

**Optimisation (2025) :** Le calcul est désormais effectué côté serveur via l'endpoint `/api/statistics/summary`. Le store ne fait plus de calculs lourds ni de récupération paginée de tout l'historique côté client.

## Utilisation

```typescript
import { useStatisticsStore } from '~/stores/statistics'
import { onMounted } from 'vue'

const statsStore = useStatisticsStore()

onMounted(async () => {
  // Récupère les stats agrégées (Rapide : 1 seule requête)
  await statsStore.fetchStatistics()
})

// Accès aux données (réactives)
console.log(statsStore.totalExpeditions) // Nombre de runs
console.log(statsStore.formattedTotalTime) // "12h 30m"
```

## Données disponibles (State/Getters)

| Propriété | Type | Description |
| :--- | :--- | :--- |
| `totalExpeditions` | `number` | Nombre total de runs lancés. |
| `totalTime` | `number` | Temps total passé en expédition (ms). |
| `formattedTotalTime` | `string` | Temps total formaté (ex: "5h 12m"). |
| `maxFloor` | `number` | Étage le plus élevé atteint. |
| `totalDamage` | `number` | Total des dégâts infligés (DPS × Durée). |
| `formattedTotalDamage` | `string` | Dégâts formatés (ex: "1.2M"). |
| `totalPoiVisits` | `number` | Nombre total d'interactions avec des POI (Total ouvertures). |
| `totalDistinctPois` | `number` | Nombre de POI uniques visités. |
| `totalItemsCollected` | `number` | Nombre total d'items obtenus (Runs + Visites). |
| `totalItemsScrapped` | `number` | Nombre d'items recyclés. |
| `totalScrapAccumulated`| `number` | Valeur totale en scrap générée. |
| `totalGold` | `number` | Or total accumulé (Runs + Visites + Quêtes). |
| `totalExp` | `number` | Expérience totale de la guilde. |
| `accountDays` | `number` | Jours depuis la création du compte. |
| `isLoading` | `boolean` | Indique si la requête est en cours. |

## Backend

Ce store dépend de l'API Backend custom :
- **Endpoint :** `GET /api/statistics/summary`
- **Contrôleur :** `api::statistic.statistic.getSummary`
- **Service :** Utilise `strapi.db.query` pour des agrégations optimisées (Count, Sum) directement en base de données.
