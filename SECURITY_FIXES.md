# Security Fixes - Dashboard Admin

## Date: 2026-02-10

### Changements Critiques de Sécurité

#### 1. ✅ Vérification Explicite du Rôle Admin

**Problème** : Les endpoints sensibles s'appuyaient uniquement sur les permissions Strapi sans vérification explicite dans le code. Si les permissions étaient mal configurées, un utilisateur non-admin pourrait potentiellement accéder aux endpoints.

**Solution** : Ajout d'une fonction `verifyAdminRole()` qui vérifie explicitement dans la base de données que l'utilisateur a bien le rôle `admin`.

**Fichiers modifiés** :
- `backend/src/api/admin-dashboard/controllers/admin-dashboard.ts`

**Endpoints sécurisés** :
- `PUT /admin-dashboard/players/:id/toggle-block`
- `PUT /admin-dashboard/players/:id/role`

#### 2. ✅ Correction de l'Endpoint `/check`

**Problème** : L'endpoint `/check` retournait toujours `{ isAdmin: true }` sans vérifier réellement le rôle. Ce n'était pas une vraie vérification mais juste "si tu peux appeler cet endpoint, tu es admin".

**Solution** : L'endpoint effectue maintenant une vraie vérification du rôle dans la base de données.

**Code avant** :
```typescript
async check(ctx) {
  return ctx.send({ isAdmin: true });
}
```

**Code après** :
```typescript
async check(ctx) {
  const isAdmin = await verifyAdminRole(ctx);
  return ctx.send({ isAdmin });
}
```

#### 3. ✅ Audit Logging des Actions Administratives

**Problème** : Aucun logging des actions sensibles. En cas d'abus ou de problème, impossible de tracer qui a fait quoi.

**Solution** : Création d'un nouveau content-type `admin-action-log` qui enregistre automatiquement :
- L'admin qui a effectué l'action
- Le type d'action (BLOCK_USER, UNBLOCK_USER, CHANGE_ROLE_TO_ADMIN, CHANGE_ROLE_TO_AUTHENTICATED)
- L'utilisateur ciblé
- Les détails (état précédent → nouvel état)
- L'adresse IP de l'admin
- Le timestamp automatique

**Nouveau content-type créé** :
- `backend/src/api/admin-action-log/`

**Fonction helper** :
```typescript
async function logAdminAction(ctx, action: string, targetUserId: number, details?: any)
```

#### 4. ✅ Validation Renforcée du PageSize

**Problème** : La validation du `pageSize` ne vérifiait pas le minimum, permettant des valeurs négatives ou nulles.

**Solution** : Ajout de `Math.max(1, ...)` pour garantir un minimum de 1.

**Code avant** :
```typescript
pageSize: Math.min(Number(pageSize), 100)
```

**Code après** :
```typescript
pageSize: Math.max(1, Math.min(Number(pageSize), 100))
```

---

## Migration

### Étapes pour appliquer les correctifs :

1. **Rebuild le backend Strapi** pour reconnaître le nouveau content-type :
   ```bash
   cd backend
   npm run build
   ```

2. **Redémarrer les services Docker** :
   ```bash
   docker-compose restart backend
   ```

3. **Vérifier les logs** pour s'assurer que le nouveau content-type est bien créé :
   ```bash
   docker-compose logs -f backend
   ```

### Testing

Tester les scenarios suivants :

1. **Endpoint /check** : Appeler avec un utilisateur non-admin et vérifier qu'il retourne `{ isAdmin: false }`
2. **Bloquer un utilisateur** : Vérifier qu'un log est créé dans `admin_action_logs`
3. **Changer un rôle** : Vérifier qu'un log est créé avec les détails corrects
4. **PageSize invalide** : Tester avec `pageSize=-1` ou `pageSize=0` et vérifier que la valeur est corrigée à 1

### Accès aux Logs d'Audit

Les logs d'audit sont accessibles via :
- **Strapi Admin Panel** : Content Manager > Admin Action Log
- **API** (si permissions configurées) : `GET /api/admin-action-logs`

---

## Sécurité Additionnelle Recommandée (Non Implémenté)

### Rate Limiting
Ajouter un middleware de rate limiting sur les endpoints sensibles pour prévenir les abus.

### Cache sur /overview
Ajouter un cache de 5 minutes sur l'endpoint `/overview` pour réduire la charge DB.

### Cleanup des Connection Logs
Implémenter un cron job pour supprimer les logs de connexion de plus de 6 mois.

---

## Notes

- **Defense in Depth** : Ces correctifs ajoutent une couche de sécurité supplémentaire. Les permissions Strapi restent la première ligne de défense.
- **Non-Breaking Changes** : Ces modifications sont rétrocompatibles et ne nécessitent aucun changement côté frontend.
- **Production Ready** : Ces correctifs peuvent être déployés en production immédiatement après testing.
