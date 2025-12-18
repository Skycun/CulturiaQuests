# Documentation Composant : Items.vue

Ce composant affiche une carte d'objet ("Item") stylisée en **Pixel Art** avec un système de rareté, de niveau et de types élémentaires. Il est conçu pour être responsive et carré (`aspect-square`).

## 📋 API des Props

Voici la liste des propriétés acceptées par le composant :

| Prop | Type | Requis | Défaut | Description |
| :--- | :--- | :---: | :---: | :--- |
| **`level`** | `Number` | ✅ | - | Le niveau de l'objet (affiché en haut à gauche). |
| **`rarity`** | `String` | ✅ | - | Définit la couleur de fond (dégradé). Valeurs acceptées : `'common'`, `'rare'`, `'epic'`, `'legendary'`. |
| **`image`** | `String` | ✅ | - | Chemin absolu vers l'image de l'objet (ex: `/assets/axe.png`). |
| **`category`** | `String` | ❌ | `'Weapon'` | Catégorie sémantique (ex: `'Weapon'`, `'Helmet'`, `'Charm'`). Sert pour l'accessibilité (`alt`). |
| **`types`** | `Array` | ❌ | `[]` | Liste des types élémentaires (ex: `['nature']`). |
| **`selected`** | `Boolean`| ❌ | `false` | Si `true`, applique une bordure noire épaisse et un léger agrandissement. |

---

## ⚠️ Règles Métier & Cohérence

Pour garantir la logique du jeu, veuillez respecter les règles suivantes lors de l'intégration :

### 1. Gestion des Types & Rareté
Le tableau `types` affiche les icônes élémentaires en bas à gauche de la carte.
* **Objets Standards** (`common`, `rare`, `epic`) : Ne doivent posséder qu'**un seul type**.
* **Objets Légendaires** (`legendary`) : Sont les seuls autorisés à posséder un **double type**.

### 2. Cohérence Visuelle (Image vs Category)
Bien que le composant n'impose pas de vérification technique, vous devez assurer la cohérence sémantique :
* Si `category="Helmet"`, l'image fournie doit représenter un casque.
* Si `category="Weapon"`, l'image doit être une arme (hache, épée, bâton...).
* Si `category="Charm"`, l'image doit être un anneau ou une amulette.

### 3. Emplacement des Assets
* **Image principale (`image`)** : Doit pointer vers un fichier dans `public/assets/`.
    * *Exemple :* `image="/assets/helmet1.png"`
* **Icônes de types** : Le composant gère automatiquement le mapping. Passez simplement le nom du type.
    * *Valeurs supportées :* `'nature'`, `'history'`, `'science'`, `'art'`, `'make'`, `'society'`.

---

## 💻 Exemples d'Utilisation

### Cas 1 : Objet Commun (Hache)
Un objet simple, non sélectionné, avec un seul type.

```vue
<Items 
  :level="12" 
  rarity="common" 
  category="Weapon"
  image="/assets/weapon3.png" 
  :types="['science']"
/>
```
### Cas 2 : Objet Légendaire (Anneau)
Un objet légendaire sélectionné (bordure noire), possédant un double type.

```vue
<Items 
  :level="35" 
  rarity="legendary" 
  category="Charm"
  image="/assets/charm2.png" 
  :types="['science', 'nature']" 
  :selected="true"
/>
```

### Cas 3 : Objet Épique (Armure)
Un objet de rareté intermédiaire.

```vue
<Items 
  :level="45" 
  rarity="epic" 
  category="Helmet"
  image="/assets/helmet1.png" 
  :types="['art']" 
/>
```

---
## 🎨 Styles & Classes

* **Pixel Art** : Le composant utilise la règle CSS `image-rendering: pixelated` pour garantir que les images basse résolution restent nettes lors du redimensionnement, ainsi que la police spécifique **Jersey 10**.
* **Typographie** : Une classe utilitaire `.text-shadow-outline` crée un contour noir solide autour du texte blanc (via `text-shadow`), assurant une lisibilité optimale sur les fonds colorés vifs.
* **Forme Géométrique** : La classe `.pixel-box` utilise la propriété `clip-path` (polygone) pour "couper" physiquement les 4 coins de la carte, créant l'esthétique chamfreinée typique des interfaces rétro.
* **Responsive Design** : Le composant est fluide. Il occupe 100% de la largeur disponible (`w-full`) définie par la grille parente, tout en forçant un ratio 1:1 grâce à la classe `aspect-square`.