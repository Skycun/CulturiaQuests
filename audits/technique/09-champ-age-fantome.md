# Nettoyer le champ age fantome

## Probleme

Le champ `age` est declare dans le schema user Strapi et dans `allowedFields` du plugin users-permissions, mais :
- Il n'apparait dans aucun formulaire frontend
- Il n'est utilise nulle part dans le code
- C'est une donnee personnelle inutilement collectee (contraire au principe de minimisation du RGPD)

## Fichiers concernes

- `backend/src/extensions/users-permissions/content-types/user/schema.json` — supprimer le champ `age`
- `backend/config/plugins.ts` — retirer `age` de `allowedFields`

## Implementation

### 1. Supprimer le champ du schema

Dans `backend/src/extensions/users-permissions/content-types/user/schema.json`, supprimer :

```json
"age": {
  "type": "integer"
}
```

### 2. Retirer de allowedFields

Dans `backend/config/plugins.ts`, retirer `'age'` de `allowedFields`.

### 3. Rebuild Strapi

```bash
cd backend && npm run build
```

**Note** : Si la tache 02 (verification d'age) est implementee en premier, ce champ sera remplace par `date_of_birth`. Dans ce cas, cette tache est automatiquement resolue.

## Verification

- Verifier que le champ `age` n'apparait plus dans l'admin Strapi
- Verifier que l'inscription fonctionne toujours
