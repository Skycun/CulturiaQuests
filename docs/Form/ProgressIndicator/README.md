# ProgressIndicator Component

Composant d'indicateur de progression pour formulaires multi-étapes.

## Localisation

`/frontend/app/components/form/ProgressIndicator.vue`

## Description

ProgressIndicator affiche visuellement la progression d'un utilisateur à travers un processus multi-étapes (par exemple, un formulaire d'inscription). Il montre l'étape actuelle, les étapes complétées, et les étapes à venir avec des cercles numérotés connectés par des lignes.

## Props

| Nom | Type | Requis | Validation | Description |
|-----|------|--------|------------|-------------|
| `currentStep` | `number` | ✓ | `>= 1` | L'étape actuelle (1-indexed) |
| `totalSteps` | `number` | ✓ | `>= 1` | Le nombre total d'étapes |
| `stepTitles` | `string[]` | ✓ | `length > 0` | Tableau des titres pour chaque étape |

## Comportement visuel

### Étape complétée (stepNum < currentStep)
- **Cercle**: Fond vert avec checkmark (✓)
- **Ligne de connexion**: Verte
- **Classes**: `bg-green-500 text-white`

### Étape actuelle (stepNum === currentStep)
- **Cercle**: Fond indigo, agrandi (scale-110)
- **Affichage**: Numéro de l'étape
- **Classes**: `bg-indigo-600 text-white scale-110`

### Étape à venir (stepNum > currentStep)
- **Cercle**: Fond gris clair
- **Affichage**: Numéro de l'étape
- **Classes**: `bg-gray-200 text-gray-500`

### Ligne de connexion
- **Complétée**: Verte (`bg-green-500`)
- **À venir**: Grise (`bg-gray-200`)
- **Dimensions**: 24rem x 0.25rem (`w-24 h-1`)

## Utilisation

### Exemple basique

```vue
<template>
  <ProgressIndicator
    :current-step="currentStep"
    :total-steps="3"
    :step-titles="['Compte', 'Profil', 'Confirmation']"
  />
</template>

<script setup lang="ts">
const currentStep = ref(1)
</script>
```

### Exemple avec navigation

```vue
<template>
  <div>
    <ProgressIndicator
      :current-step="currentStep"
      :total-steps="totalSteps"
      :step-titles="stepTitles"
    />

    <div class="flex gap-3 mt-4">
      <button
        v-if="currentStep > 1"
        @click="currentStep--"
      >
        Précédent
      </button>
      <button
        v-if="currentStep < totalSteps"
        @click="currentStep++"
      >
        Suivant
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const currentStep = ref(1)
const totalSteps = 3
const stepTitles = [
  'Informations de compte',
  'Détails personnels',
  'Confirmation'
]
</script>
```

## Intégration dans register.vue

Dans la page d'inscription (2 étapes):

```vue
<template>
  <ProgressIndicator
    :current-step="currentStep"
    :total-steps="totalSteps"
    :step-titles="stepTitles"
  />

  <!-- Formulaire multi-étapes -->
  <form @submit.prevent="handleSubmit">
    <div v-if="currentStep === 1">
      <!-- Étape 1: Compte -->
    </div>
    <div v-if="currentStep === 2">
      <!-- Étape 2: Guilde et personnage -->
    </div>
  </form>
</template>

<script setup lang="ts">
const currentStep = ref(1)
const totalSteps = 2
const stepTitles = [
  'Informations de compte',
  'Guilde, personnage et icône'
]

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}
</script>
```

## Structure du rendu

```
┌─────────────────────────────────────────┐
│  [✓]─────[2]─────[ 3 ]                 │
│  Informations de compte                 │
└─────────────────────────────────────────┘
```

Où:
- `[✓]` = Étape complétée (verte)
- `[2]` = Étape actuelle (indigo, agrandie)
- `[ 3 ]` = Étape à venir (grise)
- `─────` = Ligne de connexion

## Responsive Design

- **Mobile**: Largeur maximale de 28rem (`max-w-md`)
- **Desktop**: Centrage automatique avec flexbox
- Les cercles restent de taille fixe (2rem x 2rem)
- Le titre s'affiche sous l'indicateur

## Validation des props

Le composant valide automatiquement:
- `currentStep >= 1`
- `totalSteps >= 1`
- `stepTitles.length > 0`

Si ces conditions ne sont pas respectées, Vue émettra des warnings en développement.

## Accessibilité

**Améliorations recommandées** (non implémentées actuellement):
- Ajouter `aria-label` sur les cercles
- Marquer l'étape actuelle avec `aria-current="step"`
- Ajouter `role="progressbar"` avec `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

## Notes techniques

- Utilise Vue 3 Composition API avec `<script setup>`
- Validation des props avec fonctions validator
- Transitions CSS sur les changements d'état
- Compatible SSR (pas besoin de ClientOnly)

## Améliorations futures possibles

- Animation de transition entre les étapes
- Support pour des étapes optionnelles/sautables
- Icônes personnalisées au lieu de numéros
- Orientation verticale en option
- Support pour des sous-étapes
