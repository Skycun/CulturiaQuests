# Système de Variables Dynamiques dans les Dialogues

Ce document référence les balises dynamiques (placeholders) utilisées dans les textes de dialogues des quêtes (stored in DB via `scripts/populate_db`).

Ces balises sont des chaînes de caractères spécifiques entre crochets `[]` qui doivent être remplacées dynamiquement par le client (Frontend) au moment de l'affichage, en fonction du contexte du joueur.

## Liste des Variables

| Variable | Description | Exemple de Remplacement | Contexte d'utilisation |
| :--- | :--- | :--- | :--- |
| **`[PlayerName]`** | Le pseudonyme du joueur connecté. | `[PlayerName]` → **"Arthas"** | Utilisé lorsque le PNJ s'adresse directement au joueur (salutations, remerciements). |
| **`[DungeonThreshold]`** | L'étage ou le palier spécifique du donjon/sanctuaire où se déroule l'objectif. | `[DungeonThreshold]` → **"3"** | Utilisé pour indiquer la localisation précise d'un objet ou d'une cible dans les quêtes de type "Musée". |

## Guide d'Implémentation (Frontend)

Lors de la récupération d'un dialogue depuis l'API Strapi, le texte brut contiendra ces balises. Il est nécessaire d'appliquer une fonction de formatage avant le rendu dans le composant Vue/Nuxt.

### Exemple de logique (TypeScript)

```typescript
/**
 * Formate le texte du dialogue en remplaçant les variables dynamiques.
 * 
 * @param rawText - Le texte brut venant de la BDD (ex: "Bonjour [PlayerName]")
 * @param context - Objet contenant les valeurs actuelles
 */
function formatDialog(rawText: string, context: { playerName: string; dungeonLevel?: number }): string {
  let formattedText = rawText;

  // 1. Remplacement du Nom du Joueur
  if (context.playerName) {
    formattedText = formattedText.replaceAll('[PlayerName]', context.playerName);
  }

  // 2. Remplacement du Palier (si applicable)
  // Note : dungeonLevel peut être null si la quête n'est pas dans un donjon
  if (context.dungeonLevel !== undefined) {
    formattedText = formattedText.replaceAll('[DungeonThreshold]', context.dungeonLevel.toString());
  } else {
    // Fallback si l'étage n'est pas connu (optionnel)
    formattedText = formattedText.replaceAll('[DungeonThreshold]', '??');
  }

  return formattedText;
}
```

### Exemple de rendu

**Entrée (BDD) :**
> "Je crois qu’elle s’est cachée à l’étage **[DungeonThreshold]**… tu pourrais m’aider à la retrouver, **[PlayerName]** ?"

**Contexte :**
*   Joueur : "Link"
*   Étage de quête : 5

**Sortie (Écran) :**
> "Je crois qu’elle s’est cachée à l’étage **5**… tu pourrais m’aider à la retrouver, **Link** ?"
