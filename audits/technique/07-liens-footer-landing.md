# Liens CGU / Mentions legales dans le footer et la landing

## Probleme

Les pages legales (CGU, mentions legales, politique de confidentialite) ne sont accessibles que depuis :
- La page d'inscription (lien CGU)
- Les parametres utilisateur

Il manque des liens dans le footer permanent de l'application et sur la landing page.

## Fichiers concernes

- `frontend/app/components/AppFooter.vue` (ou equivalent) — ajouter les liens
- `frontend/app/pages/index.vue` — ajouter les liens sur la landing

## Implementation

### 1. Footer de l'application

Identifier le composant footer (probablement `AppFooter.vue` ou dans le layout `default.vue`).
Ajouter une section avec les liens :

```vue
<div class="flex justify-center gap-4 text-xs text-gray-500 py-2">
  <NuxtLink to="/CGU" class="hover:underline">CGU</NuxtLink>
  <NuxtLink to="/mentions-legales" class="hover:underline">Mentions legales</NuxtLink>
  <NuxtLink to="/politique-confidentialite" class="hover:underline">Confidentialite</NuxtLink>
</div>
```

### 2. Landing page

Dans `frontend/app/pages/index.vue`, ajouter les memes liens en bas de page.

## Verification

- Les liens sont visibles dans le footer sur toutes les pages
- Les liens sont visibles sur la landing page
- Chaque lien mene a la bonne page
- Les pages sont accessibles sans authentification (deja configure dans le middleware)
