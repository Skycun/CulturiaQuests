# Plan d'implémentation : Vérification de distance pour les expéditions

## Objectif
Empêcher les utilisateurs de démarrer une expédition (musée) ou d'ouvrir un coffre (POI) s'ils sont à plus de 1km de distance. Afficher la distance actuelle dans le drawer.

## Exigences
- ✅ Appliquer la vérification pour les musées ET les POIs
- ✅ Afficher un bouton rouge outline avec "Vous êtes trop loin" si distance > 1km
- ✅ Afficher la distance actuelle dans le drawer
- ✅ Utiliser la fonction `calculateDistance` existante dans `~/utils/geolocation.ts`

## Étapes d'implémentation

### 1. Modifier `frontend/app/pages/map.vue`

**Localisation** : frontend/app/pages/map.vue:89 (après `selectedItem`)

**Actions** :
- Créer un computed `distanceToSelectedItem` qui calcule la distance entre l'utilisateur et l'élément sélectionné
- Importer `calculateDistance` depuis `~/utils/geolocation`
- Passer cette distance au composant `DrawerContent` via une prop `distance-to-user`

**Code à ajouter** :
```typescript
// Import
import { calculateDistance } from '~/utils/geolocation'

// Computed
const distanceToSelectedItem = computed<number>(() => {
  if (!selectedItem.value) return 0

  const itemLat = selectedItem.value.lat
  const itemLng = selectedItem.value.lng

  if (itemLat === undefined || itemLng === undefined) return 0

  return calculateDistance(userLat.value, userLng.value, itemLat, itemLng)
})
```

**Template à modifier** :
```vue
<BottomDrawer v-model="isDrawerOpen">
  <MapDrawerContent
    :selected-item="selectedItem"
    :guild-characters="guildCharacters"
    :distance-to-user="distanceToSelectedItem"
    @start-expedition="handleStartExpedition"
  />
</BottomDrawer>
```

### 2. Modifier `frontend/app/components/map/DrawerContent.vue`

**Actions** :
- Ajouter une prop `distanceToUser` de type `number`
- Créer un computed `isTooFar` qui retourne `true` si `distanceToUser > 1`
- Afficher la distance sous le nom de l'élément
- Modifier la logique d'affichage des boutons pour vérifier `isTooFar`

**Props à ajouter** (ligne 85-90):
```typescript
const props = defineProps<{
  selectedItem: Museum | Poi | null
  guildCharacters: Character[]
  distanceToUser: number  // ← Nouvelle prop
}>()
```

**Computed à ajouter** :
```typescript
/**
 * Détermine si l'utilisateur est trop loin de l'élément sélectionné.
 * Seuil : 1 km
 */
const isTooFar = computed<boolean>(() => {
  return props.distanceToUser > 1
})

/**
 * Formate la distance pour l'affichage.
 * Affiche en mètres si < 1km, en km sinon.
 */
const formattedDistance = computed<string>(() => {
  if (props.distanceToUser < 1) {
    return `${Math.round(props.distanceToUser * 1000)} m`
  }
  return `${props.distanceToUser.toFixed(2)} km`
})
```

**Template - Affichage de la distance** :
Ajouter après le titre (ligne 12 et ligne 32) :
```vue
<!-- Pour musées (après ligne 12) -->
<h2 class="text-xl font-power mb-2 text-right gap-4">{{ selectedItem.name }}</h2>
<p class="text-sm font-onest text-gray-600 text-right">
  📍 Distance : {{ formattedDistance }}
</p>

<!-- Pour POIs (après ligne 32) -->
<h2 class="text-xl font-power mb-2 text-right gap-4">{{ selectedItem.name }}</h2>
<p class="text-sm font-onest text-gray-600 text-right">
  📍 Distance : {{ formattedDistance }}
</p>
```

**Template - Modification des boutons** (lignes 59-71):

```vue
<!-- Boutons CTA -->
<div v-if="isTooFar" class="w-full mt-4">
  <!-- Bouton désactivé si trop loin (pour musées ET POIs) -->
  <FormPixelButton
    color="red"
    variant="outline"
    class="w-full"
    disabled
  >
    Vous êtes trop loin
  </FormPixelButton>
</div>
<div v-else>
  <!-- Boutons normaux si distance OK -->
  <FormPixelButton
    v-if="isMuseum"
    color="indigo"
    variant="filled"
    class="w-full mt-4"
    @click="$emit('start-expedition')"
  >
    Démarrer l'expédition
  </FormPixelButton>
  <FormPixelButton
    v-else
    color="red"
    variant="outline"
    class="w-full mt-4"
    disabled
  >
    Ce coffre à déjà été ouvert
  </FormPixelButton>
</div>
```

## Résultat attendu

### Comportement
1. **Distance ≤ 1 km** :
   - Musées : Bouton bleu "Démarrer l'expédition" actif
   - POIs : Bouton rouge "Ce coffre à déjà été ouvert" (comportement existant)
   - Affichage : "Distance : 350 m" ou "Distance : 0.85 km"

2. **Distance > 1 km** :
   - Musées ET POIs : Bouton rouge outline "Vous êtes trop loin" désactivé
   - Affichage : "Distance : 1.52 km"

### Avantages de cette implémentation
- ✅ Réutilise la fonction `calculateDistance` existante
- ✅ Calcul réactif via computed (se met à jour si l'utilisateur bouge)
- ✅ Logique centralisée dans le composant DrawerContent
- ✅ Formatage intelligent de la distance (m/km)
- ✅ Interface cohérente avec les boutons existants

## Fichiers impactés
1. `frontend/app/pages/map.vue` (ajouter computed + prop)
2. `frontend/app/components/map/DrawerContent.vue` (logique + UI)

## Tests à effectuer
- [ ] Vérifier que la distance s'affiche correctement
- [ ] Vérifier que le bouton change bien selon la distance
- [ ] Tester avec un musée proche (< 1km)
- [ ] Tester avec un musée loin (> 1km)
- [ ] Tester avec un POI proche
- [ ] Tester avec un POI loin
- [ ] Vérifier que le calcul se met à jour quand l'utilisateur bouge
