# Verification d'age a l'inscription

## Probleme

Les CGU mentionnent un age minimum de 15 ans, mais :
- Le champ `age` existe dans le schema Strapi et dans `allowedFields` mais n'apparait dans aucun formulaire
- Aucune validation serveur ne verifie l'age
- La mention dans les CGU est purement declarative

Le RGPD (article 8) et la loi francaise (15 ans pour le consentement numerique) exigent une verification.

## Fichiers concernes

- `frontend/app/pages/account/register.vue` — ajouter un champ date de naissance
- `backend/src/extensions/users-permissions/content-types/user/schema.json` — remplacer `age` par `date_of_birth`
- `backend/config/plugins.ts` — mettre a jour `allowedFields`
- `backend/src/extensions/users-permissions/strapi-server.ts` — ajouter une validation serveur

## Implementation

### 1. Remplacer le champ `age` par `date_of_birth` dans le schema user

```json
"date_of_birth": {
  "type": "date",
  "required": true
}
```

Supprimer le champ `age` inutilise.

### 2. Mettre a jour `allowedFields`

```typescript
allowedFields: ['date_of_birth', 'cgu_accepted_at', 'cgu_version']
```

### 3. Ajouter un champ dans le formulaire d'inscription

Ajouter un date picker ou trois selects (jour/mois/annee) dans le formulaire.
Calculer l'age cote frontend et afficher un message si < 15 ans.

### 4. Validation serveur

Dans l'extension `strapi-server.ts`, wrapper le `register` pour verifier :

```typescript
const birthDate = new Date(ctx.request.body.date_of_birth);
const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
if (age < 15) {
  return ctx.badRequest('Vous devez avoir au moins 15 ans pour vous inscrire.');
}
```

## Verification

- Tenter de s'inscrire avec une date de naissance de moins de 15 ans → refus
- Tenter de s'inscrire avec une date de naissance de 15 ans ou plus → succes
- Verifier que la date est bien enregistree en BDD
