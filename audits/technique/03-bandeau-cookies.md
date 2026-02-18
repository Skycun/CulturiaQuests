# Bandeau de consentement cookies / localStorage

## Probleme

L'application utilise :
- Un cookie JWT `culturia_jwt` (14 jours) pour l'authentification
- Le localStorage pour la persistance des stores Pinia (donnees de jeu)
- IndexedDB pour le cache des zones geographiques

Aucun bandeau d'information n'existe. La directive ePrivacy et les recommandations de la CNIL imposent d'informer l'utilisateur.

**Note** : Le cookie JWT est "strictement necessaire" et peut etre exempt de consentement selon la CNIL. Cependant, un bandeau informatif reste recommande pour la transparence.

## Fichiers concernes

- `frontend/app/components/CookieBanner.vue` — nouveau composant
- `frontend/app/layouts/default.vue` ou `frontend/app/app.vue` — integrer le composant
- `frontend/app/utils/storage.ts` — gerer le flag d'acceptation

## Implementation

### 1. Creer le composant CookieBanner.vue

```vue
<template>
  <div v-if="!accepted" class="fixed bottom-0 inset-x-0 z-50 p-4 bg-gray-900 text-white border-t border-gray-700">
    <div class="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-sm">
      <p class="flex-1">
        Cette application utilise des cookies techniques necessaires a son fonctionnement
        et le stockage local pour la persistance de vos donnees de jeu.
        <NuxtLink to="/politique-confidentialite" class="underline">En savoir plus</NuxtLink>
      </p>
      <button @click="accept" class="px-4 py-2 bg-indigo-600 rounded-lg font-bold shrink-0">
        J'ai compris
      </button>
    </div>
  </div>
</template>

<script setup>
const COOKIE_KEY = 'cookie_consent_accepted'
const accepted = ref(false)

onMounted(() => {
  accepted.value = localStorage.getItem(COOKIE_KEY) === 'true'
})

function accept() {
  localStorage.setItem(COOKIE_KEY, 'true')
  accepted.value = true
}
</script>
```

### 2. Integrer dans le layout

Dans `frontend/app/layouts/default.vue`, ajouter `<CookieBanner />` avant la fermeture du template.

### 3. Gerer le nettoyage

Dans `frontend/app/composables/useLogout.ts`, ne PAS supprimer le flag `cookie_consent_accepted` lors du logout (le consentement est independant de la session).

## Verification

- Premiere visite : le bandeau s'affiche en bas de l'ecran
- Clic sur "J'ai compris" : le bandeau disparait
- Rafraichissement : le bandeau ne reapparait pas
- Clic sur "En savoir plus" : redirection vers /politique-confidentialite
