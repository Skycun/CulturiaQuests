# IconPicker Component

Composant générique de sélection d'images en grille (icônes, avatars, images).

## Localisation

`/frontend/app/components/form/IconPicker.vue`

## Description

IconPicker est un composant hautement réutilisable qui affiche une grille d'images sélectionnables. Il supporte le v-model, états de chargement, désactivation, et formatage personnalisé des URLs d'images. Bien que nommé "IconPicker", il peut être utilisé pour tout type de sélection d'image (avatars, badges, galeries, etc.).

## Props

| Nom | Type | Défaut | Description |
|-----|------|--------|-------------|
| `modelValue` | `number \| null` | `null` | ID de l'élément sélectionné (v-model) |
| `items` | `IconPickerItem[]` | `[]` | Tableau d'items à afficher dans la grille |
| `loading` | `boolean` | `false` | Affiche un état de chargement |
| `disabled` | `boolean` | `false` | Désactive la sélection |
| `label` | `string` | `''` | Label optionnel affiché au-dessus de la grille |
| `columns` | `number` | `4` | Nombre de colonnes sur mobile |
| `smColumns` | `number` | `6` | Nombre de colonnes sur écrans small+ |
| `getImageUrl` | `(item: IconPickerItem) => string` | `null` | Fonction de formatage d'URL personnalisée |

### Type IconPickerItem

```typescript
interface IconPickerItem {
  id: number
  url: string
  name?: string
}
```

## Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `number \| null` | Émis quand l'utilisateur sélectionne un item |

## États visuels

### Item sélectionné
- **Style**: Cadre indigo avec effet pixel-notch, agrandi (scale-105)
- **Image**: Encadrée dans un conteneur blanc
- **Classes**: `bg-indigo-600 p-[4px] scale-105`

### Item non sélectionné
- **Style**: Effet hover avec agrandissement (scale-110)
- **Classes**: `hover:scale-110`

### État désactivé
- **Style**: Opacité réduite, curseur not-allowed
- **Classes**: `opacity-50 cursor-not-allowed`

### États de chargement/vide
- **Chargement**: Message "Chargement..." centré
- **Aucun item**: Message "Aucun élément disponible" centré

## Utilisation

### Exemple basique

```vue
<template>
  <IconPicker
    v-model="selectedIconId"
    :items="icons"
    label="Choisissez une icône"
  />
</template>

<script setup lang="ts">
const selectedIconId = ref<number | null>(null)
const icons = ref([
  { id: 1, url: '/icons/sword.png', name: 'Épée' },
  { id: 2, url: '/icons/shield.png', name: 'Bouclier' },
  { id: 3, url: '/icons/potion.png', name: 'Potion' }
])
</script>
```

### Avec état de chargement

```vue
<template>
  <IconPicker
    v-model="selectedIconId"
    :items="icons"
    :loading="isLoading"
    label="Choisissez votre avatar"
  />
</template>

<script setup lang="ts">
const selectedIconId = ref<number | null>(null)
const icons = ref([])
const isLoading = ref(true)

onMounted(async () => {
  isLoading.value = true
  icons.value = await fetchIcons()
  isLoading.value = false
})
</script>
```

### Avec formatage d'URL personnalisé (Strapi)

```vue
<template>
  <IconPicker
    v-model="form.iconId"
    :items="icons"
    :loading="iconsLoading"
    label="Icône du personnage"
    :get-image-url="getIconUrl"
  />
</template>

<script setup lang="ts">
const config = useRuntimeConfig()

function getIconUrl(icon: any): string {
  if (!icon || !icon.url) return ''

  // Ajouter le base URL de Strapi pour les URLs relatives
  if (icon.url.startsWith('/')) {
    return `${config.public.strapi.url}${icon.url}`
  }

  return icon.url
}

const icons = ref([])
const iconsLoading = ref(false)
</script>
```

### Grille personnalisée (3 colonnes mobile, 8 sur desktop)

```vue
<template>
  <IconPicker
    v-model="selectedBadgeId"
    :items="badges"
    :columns="3"
    :sm-columns="8"
    label="Badges débloqués"
  />
</template>
```

### Mode désactivé

```vue
<template>
  <IconPicker
    v-model="selectedIconId"
    :items="icons"
    :disabled="formSubmitting"
    label="Sélection"
  />
</template>

<script setup lang="ts">
const formSubmitting = ref(false)
</script>
```

## Intégration dans register.vue

Dans la page d'inscription, IconPicker remplace la grille d'icônes manuelle:

```vue
<!-- Avant (33 lignes) -->
<div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
  <div
    v-for="icon in icons"
    :key="icon.id"
    @click="selectIcon(icon.id)"
    :class="[
      'cursor-pointer transition-all aspect-square',
      form.iconId === icon.id ? 'pixel-notch bg-indigo-600 p-[4px] scale-105' : 'hover:scale-110'
    ]"
  >
    <!-- ... -->
  </div>
</div>

<!-- Après (1 ligne) -->
<IconPicker
  v-model="form.iconId"
  :items="icons"
  :loading="iconsLoading"
  :disabled="loading"
  label="Choisissez l'icône de votre personnage"
  :get-image-url="getIconUrl"
/>
```

## Cas d'usage

### 1. Sélection d'icônes de personnage
```vue
<IconPicker
  v-model="characterIconId"
  :items="characterIcons"
  label="Icône du personnage"
/>
```

### 2. Sélection d'avatar utilisateur
```vue
<IconPicker
  v-model="userAvatarId"
  :items="avatars"
  :columns="3"
  :sm-columns="5"
  label="Votre avatar"
/>
```

### 3. Sélection d'image de guilde
```vue
<IconPicker
  v-model="guildBannerId"
  :items="banners"
  label="Bannière de la guilde"
  :get-image-url="formatBannerUrl"
/>
```

### 4. Galerie de badges
```vue
<IconPicker
  v-model="selectedBadgeId"
  :items="unlockedBadges"
  :columns="4"
  :sm-columns="8"
  label="Vos badges"
  :disabled="!canChangeBadge"
/>
```

## Pixel-notch Styling

Le style "pixel-notch" crée un effet de bordure pixelisée pour l'item sélectionné:

```css
.pixel-notch {
  clip-path: polygon(
    0px 6px, 6px 6px, 6px 0px,
    calc(100% - 6px) 0px, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0px calc(100% - 6px)
  );
}
```

Cet effet coupe les coins de 6px pour donner un aspect rétro/pixel art.

## Responsive Design

- **Mobile** (`columns` défaut): 4 colonnes
- **Small screens+** (`smColumns` défaut): 6 colonnes
- Aspect ratio carré forcé (`aspect-square`)
- Espacement adaptatif (`gap-3`)

## Notes techniques

- Enveloppé dans `<ClientOnly>` pour éviter les problèmes d'hydration SSR
- Support du v-model via `modelValue` et `update:modelValue`
- Images avec `object-contain` pour préserver les proportions
- Transitions CSS pour les effets hover/sélection
- TypeScript avec PropType pour la validation

## Gestion des URLs d'images

### Sans getImageUrl (comportement par défaut)
```typescript
// Utilise directement item.url
<img :src="item.url" />
```

### Avec getImageUrl (personnalisé)
```typescript
// Utilise la fonction fournie
<img :src="getImageUrl(item)" />
```

**Cas d'usage pour getImageUrl:**
- URLs relatives nécessitant un base URL (ex: Strapi)
- Paramètres de redimensionnement d'image
- CDN ou transformations d'URL
- Fallback images

## Accessibilité

Le composant utilise l'attribut `alt` pour chaque image:
```vue
<img :alt="item.name || 'Item'" />
```

**Améliorations recommandées:**
- Ajouter `role="radiogroup"` sur le conteneur
- Ajouter `role="radio"` sur chaque item
- Support de la navigation clavier (flèches)
- `aria-checked` pour l'item sélectionné

## Performance

- Pas de re-render inutile grâce au v-model reactif
- Images chargées de manière native (lazy loading possible via `loading="lazy"`)
- Transitions CSS (pas de JavaScript)

## Améliorations futures possibles

- Support multi-sélection (checkbox mode)
- Pagination pour grandes listes
- Lazy loading des images
- Support de drag-and-drop pour réorganisation
- Recherche/filtrage intégré
- Upload d'image personnalisée
- Preview agrandi au hover
- Support de slots pour personnalisation
