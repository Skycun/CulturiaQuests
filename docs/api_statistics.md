# API Statistics Documentation

Cette API personnalisée fournit des statistiques agrégées pour la Guilde de l'utilisateur connecté.

**Base URL :** `/api/statistics`

## Endpoints

### 1. Get Summary

Récupère un résumé global des statistiques du joueur.

- **URL :** `/summary`
- **Method :** `GET`
- **Auth :** Required (Bearer Token)
- **Permissions :** `api::statistic.statistic.getSummary` (Authenticated Role)

#### Response (200 OK)

```json
{
  "totalExpeditions": 42,
  "totalTime": 123456000, // en ms
  "maxFloor": 15,
  "totalDamage": 5000000,
  "totalPoiVisits": 120, // Total ouvertures de coffres
  "totalDistinctPois": 45, // Lieux uniques
  "totalItemsCollected": 300,
  "totalItemsScrapped": 50,
  "totalScrapAccumulated": 2500,
  "totalExp": 15000,
  "totalGold": 5000,
  "accountDays": 10
}
```

#### Implementation Details

Cette route est optimisée pour la performance. Au lieu de charger tous les enregistrements (`findMany`), elle utilise le Query Engine de Strapi (`strapi.db.query`) pour effectuer des sélections ciblées et des agrégations en mémoire serveur (pour les calculs complexes) ou via SQL implicite.

- **Service :** `backend/src/api/statistic/services/statistic.ts`
- **Controller :** `backend/src/api/statistic/controllers/statistic.ts`

#### Logic

1.  Identifie la Guilde liée à l'utilisateur connecté via `ctx.state.user`.
2.  Exécute 5 requêtes parallèles (Runs, Visits, Items, Quests, User).
3.  Effectue les sommes et comptages (ex: calcule le scrap basé sur la rareté et le niveau des items marqués `isScrapped`).
4.  Retourne l'objet JSON agrégé.
