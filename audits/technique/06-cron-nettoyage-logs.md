# Cron de nettoyage des logs de connexion

## Probleme

Les `connection-log` s'accumulent indefiniment en base de donnees. La politique de confidentialite indique une duree de conservation de 6 mois, mais aucun mecanisme de nettoyage automatique n'existe.

Ce probleme est deja identifie dans `SECURITY_FIXES.md`.

## Fichiers concernes

- `backend/src/index.ts` (bootstrap) — ajouter le cron job Strapi

## Implementation

Strapi 5 supporte les cron jobs natifs. Ajouter dans `backend/config/cron-tasks.ts` (ou dans le bootstrap) :

### Option A : Dans config/cron-tasks.ts

Creer `backend/config/cron-tasks.ts` :

```typescript
export default {
  // Tous les jours a 3h du matin
  '0 3 * * *': async ({ strapi }) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    try {
      const oldLogs = await strapi.db.query('api::connection-log.connection-log').findMany({
        where: {
          connected_at: { $lt: sixMonthsAgo.toISOString() },
        },
      });

      for (const log of oldLogs) {
        await strapi.documents('api::connection-log.connection-log').delete({
          documentId: log.documentId,
        });
      }

      if (oldLogs.length > 0) {
        strapi.log.info(`Cron: ${oldLogs.length} connection logs older than 6 months deleted.`);
      }
    } catch (error) {
      strapi.log.error('Cron: Error cleaning connection logs:', error);
    }
  },
};
```

### Option B : Suppression en masse (plus performant)

Si le volume est important, utiliser une requete SQL directe via knex :

```typescript
'0 3 * * *': async ({ strapi }) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const knex = strapi.db.connection;
  const result = await knex('connection_logs')
    .where('connected_at', '<', sixMonthsAgo.toISOString())
    .delete();

  if (result > 0) {
    strapi.log.info(`Cron: ${result} old connection logs deleted.`);
  }
},
```

### Activation dans config/server.ts

S'assurer que les crons sont actives :

```typescript
export default ({ env }) => ({
  // ...
  cron: {
    enabled: true,
  },
});
```

## Verification

- Inserer manuellement un log avec une date > 6 mois
- Declencher le cron (ou attendre 3h du matin)
- Verifier que le log a ete supprime
- Verifier que les logs recents ne sont pas touches
