# Export automatique des donnees (droit a la portabilite)

## Probleme

Le droit a la portabilite (article 20 du RGPD) exige que les donnees soient fournies dans un "format structure, couramment utilise et lisible par machine". Actuellement, la demande RGPD cree un ticket manuel sans export automatique.

## Fichiers concernes

- `backend/src/api/user-settings/controllers/user-settings.ts` — ajouter un endpoint `exportData`
- `backend/src/api/user-settings/routes/user-settings.ts` — ajouter la route
- `backend/src/index.ts` (bootstrap) — accorder la permission
- `frontend/app/pages/account/settings.vue` — ajouter un bouton "Telecharger mes donnees"

## Implementation

### 1. Endpoint backend `exportData`

Creer un endpoint `GET /api/user-settings/export` qui :
1. Recupere toutes les donnees liees a l'utilisateur
2. Les assemble en un objet JSON structure
3. Retourne le JSON avec le header `Content-Disposition: attachment`

```typescript
async exportData(ctx) {
  const user = ctx.state.user;
  if (!user) return ctx.unauthorized();

  // Recuperer la guild
  const guild = await strapi.db.query('api::guild.guild').findOne({
    where: { user: { id: user.id } },
    populate: true,
  });

  // Recuperer toutes les donnees liees
  const [characters, items, runs, visits, quests, progressions, friendships, quizAttempts, connectionLogs] = await Promise.all([
    guild ? strapi.db.query('api::character.character').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::item.item').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::run.run').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::visit.visit').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::quest.quest').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::progression.progression').findMany({ where: { guild: guild.id } }) : [],
    guild ? strapi.db.query('api::player-friendship.player-friendship').findMany({
      where: { $or: [{ requester: guild.id }, { receiver: guild.id }] },
    }) : [],
    guild ? strapi.db.query('api::quiz-attempt.quiz-attempt').findMany({ where: { guild: guild.id } }) : [],
    strapi.db.query('api::connection-log.connection-log').findMany({ where: { user: user.id } }),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
    guild,
    characters,
    items,
    runs,
    visits,
    quests,
    progressions,
    friendships,
    quiz_attempts: quizAttempts,
    connection_logs: connectionLogs,
  };

  ctx.set('Content-Disposition', 'attachment; filename="culturiaquests-export.json"');
  ctx.set('Content-Type', 'application/json');
  return ctx.send(exportData);
}
```

### 2. Route

```typescript
{ method: 'GET', path: '/user-settings/export', handler: 'user-settings.exportData' }
```

### 3. Permission bootstrap

Ajouter `'api::user-settings.user-settings.exportData'` aux permissions du role Authenticated.

### 4. Frontend

Ajouter un bouton dans les parametres qui telecharge le fichier JSON :

```typescript
async function downloadData() {
  const response = await $fetch('/api/user-settings/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'culturiaquests-export.json';
  a.click();
  URL.revokeObjectURL(url);
}
```

## Verification

- Cliquer sur "Telecharger mes donnees" → un fichier JSON est telecharge
- Le JSON contient toutes les donnees de l'utilisateur
- Un utilisateur ne peut telecharger que ses propres donnees
