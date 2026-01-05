# Alert Component

Composant d'alerte générique pour afficher des messages avec différents styles (erreur, succès, info, warning).

## Localisation

`/frontend/app/components/form/Alert.vue`

## Description

Alert est un composant réutilisable qui affiche des messages avec un style visuel adapté au type de message (erreur, succès, warning, info). Il supporte l'affichage d'icônes et peut être rendu dismissible.

## Props

| Nom | Type | Défaut | Description |
|-----|------|--------|-------------|
| `message` | `string \| null` | `null` | Le message à afficher. Si `null`, le composant ne s'affiche pas |
| `variant` | `'error' \| 'success' \| 'warning' \| 'info'` | `'error'` | Le type d'alerte qui détermine le style visuel |
| `icon` | `boolean` | `true` | Afficher ou non une icône avant le message |
| `dismissible` | `boolean` | `false` | Afficher un bouton de fermeture |

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `dismiss` | `void` | Émis quand l'utilisateur clique sur le bouton de fermeture (si `dismissible: true`) |

## Variants

### error (défaut)
- **Couleur**: Rouge
- **Icône**: ✕
- **Classes**: `text-red-500 bg-red-50 border-red-200`

### success
- **Couleur**: Vert
- **Icône**: ✓
- **Classes**: `text-green-500 bg-green-50 border-green-200`

### warning
- **Couleur**: Jaune
- **Icône**: ⚠
- **Classes**: `text-yellow-600 bg-yellow-50 border-yellow-200`

### info
- **Couleur**: Bleu
- **Icône**: ℹ
- **Classes**: `text-blue-600 bg-blue-50 border-blue-200`

## Utilisation

### Exemple basique (erreur)

```vue
<template>
  <Alert :message="error" variant="error" />
</template>

<script setup lang="ts">
const error = ref<string | null>(null)

// Afficher une erreur
error.value = "Une erreur est survenue"

// Masquer l'erreur
error.value = null
</script>
```

### Exemple avec succès

```vue
<template>
  <Alert
    :message="successMessage"
    variant="success"
  />
</template>

<script setup lang="ts">
const successMessage = ref("Opération réussie !")
</script>
```

### Exemple dismissible

```vue
<template>
  <Alert
    :message="notification"
    variant="info"
    :dismissible="true"
    @dismiss="notification = null"
  />
</template>

<script setup lang="ts">
const notification = ref("Nouvelle fonctionnalité disponible")
</script>
```

### Sans icône

```vue
<template>
  <Alert
    message="Message sans icône"
    variant="warning"
    :icon="false"
  />
</template>
```

## Intégration dans register.vue

Dans la page d'inscription, Alert remplace l'ancien message d'erreur inline:

```vue
<!-- Avant -->
<div v-if="error" class="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded border border-red-200">
  {{ error }}
</div>

<!-- Après -->
<Alert :message="error" variant="error" />
```

## Notes techniques

- Enveloppé dans `<ClientOnly>` pour éviter les problèmes d'hydration SSR
- Utilise `inheritAttrs: false` pour un meilleur contrôle des attributs
- Le composant ne s'affiche que si `message` n'est pas `null`
- Les styles sont responsives et utilisent Tailwind CSS

## Améliorations futures possibles

- Ajouter une transition d'entrée/sortie
- Support pour du contenu HTML riche via slots
- Auto-dismiss avec timeout configurable
- Position sticky/fixed optionnelle
