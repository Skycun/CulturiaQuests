# Stocker l'acceptation des CGU en base de donnees

## Probleme

L'acceptation des CGU est verifiee uniquement cote frontend (checkbox). Aucune preuve horodatee n'est conservee en base de donnees. En cas de litige, il est impossible de demontrer qu'un utilisateur a accepte les CGU (obligation article 7.1 du RGPD).

## Fichiers concernes

- `backend/src/extensions/users-permissions/content-types/user/schema.json` — ajouter les champs
- `frontend/app/pages/account/register.vue` — envoyer les donnees a l'inscription
- `backend/config/plugins.ts` — autoriser les nouveaux champs dans `allowedFields`

## Implementation

### 1. Ajouter les champs au schema user Strapi

Dans `backend/src/extensions/users-permissions/content-types/user/schema.json`, ajouter dans `attributes` :

```json
"cgu_accepted_at": {
  "type": "datetime"
},
"cgu_version": {
  "type": "string"
}
```

### 2. Autoriser les champs a l'inscription

Dans `backend/config/plugins.ts`, ajouter dans `allowedFields` :

```typescript
allowedFields: ['age', 'cgu_accepted_at', 'cgu_version']
```

### 3. Envoyer les donnees depuis le formulaire d'inscription

Dans `frontend/app/pages/account/register.vue`, lors de l'appel a `register()`, ajouter :

```typescript
cgu_accepted_at: new Date().toISOString(),
cgu_version: '1.0'  // a incrementer a chaque modification des CGU
```

### 4. Rebuild Strapi

Apres modification du schema : `cd backend && npm run build`

## Verification

- Creer un nouveau compte et verifier en BDD que `cgu_accepted_at` et `cgu_version` sont renseignes
- Verifier que les comptes existants ont ces champs a `null` (pas de migration destructive)
