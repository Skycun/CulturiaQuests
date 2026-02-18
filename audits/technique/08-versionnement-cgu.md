# Versionnement des CGU

## Probleme

Les CGU sont ecrites en dur dans `frontend/app/pages/CGU.vue`. En cas de modification :
- Impossible de savoir quelle version un utilisateur a acceptee
- Pas de notification aux utilisateurs lors d'une mise a jour
- Pas d'historique des versions

## Fichiers concernes

- `frontend/app/pages/CGU.vue` — ajouter un numero de version visible
- Schema user Strapi — `cgu_version` (deja prevu dans la tache 01)
- Middleware ou layout — verifier si l'utilisateur a accepte la derniere version

## Implementation

### 1. Constante de version

Creer une constante partagee (par exemple dans `frontend/app/utils/constants.ts`) :

```typescript
export const CURRENT_CGU_VERSION = '1.0'
```

### 2. Verification a la connexion

Dans le layout principal ou un middleware, verifier si `user.cgu_version` correspond a `CURRENT_CGU_VERSION`.
Si non, afficher une modale demandant d'accepter les nouvelles CGU.

### 3. Modale de re-acceptation

```vue
<template>
  <div v-if="showCguModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="bg-white rounded-xl p-6 max-w-md mx-4">
      <h2 class="text-lg font-bold mb-3">Mise a jour des CGU</h2>
      <p class="text-sm text-gray-600 mb-4">
        Nos Conditions Generales d'Utilisation ont ete mises a jour.
        Veuillez les consulter et les accepter pour continuer.
      </p>
      <NuxtLink to="/CGU" target="_blank" class="text-indigo-600 underline text-sm">
        Lire les nouvelles CGU
      </NuxtLink>
      <div class="mt-4 flex gap-3">
        <button @click="acceptNewCgu" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">
          J'accepte
        </button>
        <button @click="logout" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">
          Refuser et se deconnecter
        </button>
      </div>
    </div>
  </div>
</template>
```

### 4. Mise a jour en BDD

Lors de l'acceptation, mettre a jour `cgu_version` et `cgu_accepted_at` via un endpoint dedie.

## Prerequis

Cette tache depend de la tache 01 (stocker l'acceptation des CGU en BDD).

## Verification

- Modifier `CURRENT_CGU_VERSION` en `'1.1'`
- Se connecter avec un compte existant ayant `cgu_version: '1.0'`
- La modale de re-acceptation s'affiche
- Accepter → `cgu_version` passe a `'1.1'` en BDD
- Refuser → deconnexion
