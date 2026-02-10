# 🔒 Configuration des Permissions Strapi

## Pourquoi ces permissions sont nécessaires ?

Le script de fixtures crée des utilisateurs qui génèrent ensuite leurs propres données (guildes, personnages, items, activités). Pour cela, les utilisateurs **authentifiés** doivent avoir les permissions de création sur ces entités.

## 🛠️ Étapes de Configuration

### 1. Accéder à Strapi Admin

```
http://localhost:1337/admin
```

### 2. Naviguer vers les Permissions

```
Settings > Users & Permissions Plugin > Roles > Authenticated
```

### 3. Activer les Permissions

Cochez les cases suivantes :

#### 📦 Guild

- [x] `create`
- [x] `find`
- [x] `findOne`
- [x] `update`

#### 👤 Character

- [x] `create`
- [x] `find`
- [x] `findOne`

#### ⚔️ Item

- [x] `create`
- [x] `find`
- [x] `findOne`

#### 📍 Visit

- [x] `create`

#### 🏛️ Run

- [x] `create`

#### 🎯 Quest

- [x] `create`

#### 📝 Quiz-Attempt

- [x] `create`

#### 🤝 Friendship

- [x] `create`

#### 👥 NPC-Friendship (si existe)

- [x] `create`

### 4. Sauvegarder

Cliquez sur **Save** en haut à droite.

## ✅ Vérification

Après configuration, relancez le check :

```bash
cd scripts/fixtures
npm run check
```

Si tout est OK, générez un utilisateur de test :

```bash
npm run generate -- --users 1
```

## 🔐 Sécurité

Ces permissions sont **sûres** car :

1. **Isolation par utilisateur** : Les contrôleurs custom filtrent automatiquement par utilisateur authentifié
2. **Pas d'accès croisé** : Un utilisateur ne peut pas modifier les données d'un autre
3. **Validation Strapi** : Toutes les validations du schéma sont appliquées

## 🚫 Ce que les utilisateurs NE PEUVENT PAS faire

Même avec ces permissions, les utilisateurs authentifiés ne peuvent pas :

- ❌ Voir ou modifier les données d'autres utilisateurs
- ❌ Créer des POIs, Museums, NPCs, Tags, Rarities
- ❌ Supprimer des données (seul le cleanup script peut le faire avec le token admin)
- ❌ Modifier les settings Strapi

## 📝 Alternative : Endpoint Custom

Si vous préférez ne pas donner ces permissions publiquement, vous pouvez créer un endpoint custom qui n'est accessible qu'avec le token admin :

```typescript
// backend/src/api/fixtures/controllers/fixtures.ts
export default {
  async generateUser(ctx) {
    // Vérifier que c'est le token admin
    if (!ctx.state.auth.strategy === 'api-token') {
      return ctx.unauthorized();
    }

    const { userData, guildData, characterData } = ctx.request.body;

    // Créer user, guild, character, items directement via services
    const user = await strapi.plugins['users-permissions'].services.user.add(userData);
    const guild = await strapi.documents('api::guild.guild').create({ data: guildData });
    const character = await strapi.documents('api::character.character').create({ data: characterData });

    return { user, guild, character };
  },
};
```

Puis adapter le script pour utiliser cet endpoint.

## 🔧 Dépannage

### Erreur 403 Forbidden

**Symptôme** : `Error: Strapi API error [POST guilds]: 403 - Forbidden`

**Cause** : Les permissions ne sont pas configurées ou pas sauvegardées.

**Solution** :
1. Vérifier que les permissions sont cochées
2. Cliquer sur **Save**
3. Redémarrer Strapi : `docker-compose restart backend`

### Erreur 401 Unauthorized

**Symptôme** : `Error: Strapi API error [POST characters]: 401 - You must be logged in`

**Cause** : Le JWT de l'utilisateur n'est pas valide ou expiré.

**Solution** : Vérifier que le token est correctement passé dans les headers.

## 📚 Ressources

- [Strapi Permissions Documentation](https://docs.strapi.io/dev-docs/plugins/users-permissions#updating-the-defaultroles)
- [Users & Permissions Plugin](https://docs.strapi.io/dev-docs/plugins/users-permissions)

---

**Note** : Ces permissions sont nécessaires uniquement pour la génération de fixtures. Elles correspondent aux permissions qu'auront les vrais utilisateurs de l'application en production.
