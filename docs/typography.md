# Typographie - Guide d'utilisation

Ce document définit les conventions typographiques à utiliser dans l'interface de **CulturiaQuests**. L'objectif est de maintenir une cohérence visuelle forte entre l'aspect "Jeu" (RPG) et l'aspect "Contenu" (Lecture).

## Polices disponibles

Nous utilisons trois familles de polices principales via Tailwind CSS.

### 1. Font Pixel (`font-pixel`)
**Usage : Elements "Gamey" & RPG**

Cette police doit être utilisée pour tout ce qui rappelle l'interface d'un jeu vidéo rétro ou les données techniques du personnage.

*   **Classe Tailwind :** `font-pixel`
*   **Quand l'utiliser :**
    *   Noms des personnages (Héros, PNJ).
    *   Métiers / Classes (ex: "Aventurier", "Forgeron").
    *   Statistiques (Niveau, XP, Points de vie, Dégâts).
    *   Compteurs d'objets (ex: "x5").
    *   Indicateurs d'interface courts (Boutons d'action type "Jouer", "Equiper").

### 2. Font Power (`font-power`)
**Usage : Titres & Impact**

Une police de titrage forte et moderne. Elle sert à structurer les pages.

*   **Classe Tailwind :** `font-power`
*   **Quand l'utiliser :**
    *   Titres de pages (`h1`).
    *   Titres de sections importantes (`h2`, `h3` dans les articles).
    *   En-têtes de cartes importantes.

### 3. Font Onest (`font-onest`)
**Usage : Corps de texte & Lecture**

Une police sans-serif très lisible, optimisée pour la lecture de longs paragraphes.

*   **Classe Tailwind :** `font-onest`
*   **Quand l'utiliser :**
    *   Contenu des journaux et histoires.
    *   Descriptions de quêtes.
    *   Dialogues (sauf si effet de style spécifique).
    *   Tous les textes de plus de 2 lignes.

## Exemples Concrets

### Carte de Personnage
```html
<!-- Nom du perso -->
<h3 class="font-pixel text-lg">Garrick</h3>

<!-- Niveau -->
<span class="font-pixel text-sm">Niv. 5</span>

<!-- Description (si présente) -->
<p class="font-onest text-gray-500">Un guerrier courageux...</p>
```

### Page de Détail (Journal)
```html
<!-- Titre de l'entrée -->
<h2 class="font-power text-2xl">La découverte des ruines</h2>

<!-- Contenu de l'histoire -->
<p class="font-onest text-justify leading-relaxed">
    Nous avons marché pendant des heures avant d'apercevoir...
</p>
```
