# Statistics Store Documentation

Ce store Pinia `useStatisticsStore` gère la récupération, l'agrégation et le calcul des statistiques globales de la guilde (Runs, Visites, Items, etc.).

## Utilisation

```typescript
import { useStatisticsStore } from '~/stores/statistics'
import { onMounted } from 'vue'

const statsStore = useStatisticsStore()

onMounted(async () => {
  // Déclenche le calcul (peut prendre du temps : fetch paginé)
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
| `totalPoiVisits` | `number` | Nombre total d'interactions avec des POI. |
| `totalDistinctPois` | `number` | Nombre de POI uniques visités. |
| `totalItemsCollected` | `number` | Nombre total d'items ramassés. |
| `totalItemsScrapped` | `number` | Nombre d'items recyclés. |
| `totalScrapAccumulated`| `number` | Valeur totale en scrap des items recyclés. |
| `totalExp` | `number` | Expérience totale (Runs + Visites). |
| `accountDays` | `number` | Jours depuis la création du compte. |
| `isLoading` | `boolean` | Indique si le calcul est en cours. |
