# Structure du fichier `npc_quests.json`

Ce document décrit la structure du fichier `scripts/populate_db/data/npc_quests.json` utilisé pour peupler la base de données avec les dialogues de quêtes des PNJs.

## Vue d'ensemble

Le fichier est un tableau JSON d'objets, où chaque objet représente une étape ou un état d'un dialogue de quête pour un PNJ spécifique.

## Structure de l'objet Dialogue

Chaque entrée dans le tableau possède la structure suivante :

| Champ | Type | Description |
| :--- | :--- | :--- |
| `npc_name` | `string` | Le nom complet du PNJ associé à ce dialogue (ex: "Garen Fouldier"). Doit correspondre à un PNJ existant. |
| `type` | `string` | Le type de dialogue, définissant le moment où il doit apparaître. |
| `entries` | `string[]` | Un tableau de chaînes de caractères. Chaque chaîne est une "page" de dialogue qui s'affiche séquentiellement. |

## Types de Dialogues (`type`)

Voici les différents types de dialogues supportés :

### 1. `quest_description`
*   **Description :** Une phrase courte résumant l'objectif de la quête.
*   **Usage :** Affiché sur le tableau de quêtes ou dans le journal de quête comme titre ou résumé rapide.
*   **Exemple :** `["Retrouver la bête rare qui a échappé au garde forestier."]`

### 2. `expedition_appear`
*   **Description :** Le dialogue d'introduction de la quête.
*   **Usage :** Déclenché lorsque le joueur rencontre le PNJ et que la quête devient disponible ("Apparition"). C'est ici que le PNJ explique le problème.
*   **Contenu :** Généralement 3 à 4 phrases expliquant le contexte (objet perdu, lieu, enjeux).
*   **Variables :** Peut contenir `[PlayerName]` et `[DungeonThreshold]`.

### 3. `expedition_fail`
*   **Description :** Le dialogue affiché en cas d'échec de la quête (ex: temps écoulé, abandon, mort).
*   **Usage :** Le PNJ exprime sa déception ou encourage le joueur à réessayer.
*   **Contenu :** Souvent 3 phrases : une réaction à l'échec, une minimisation de la gravité ("c'est pas grave"), et un encouragement pour la suite.

### 4. `quest_complete`
*   **Description :** Le dialogue de réussite de la quête.
*   **Usage :** Déclenché lorsque le joueur retourne voir le PNJ avec l'objectif accompli.
*   **Contenu :** Remerciements, récompense morale, et conclusion de la petite histoire.

## Exemple complet pour une Quête

```json
[
  {
    "npc_name": "Garen Fouldier",
    "type": "quest_description",
    "entries": [
      "Retrouver la bête rare qui a échappé au garde forestier."
    ]
  },
  {
    "npc_name": "Garen Fouldier",
    "type": "expedition_appear",
    "entries": [
      "Ah, [PlayerName]… quelle galère...",
      "J’ai poursuivi une bête rare et elle m’a semé à l'étage [DungeonThreshold]...",
      "Tu pourrais m’aider ?"
    ]
  },
  {
    "npc_name": "Garen Fouldier",
    "type": "expedition_fail",
    "entries": [
      "Zut, elle t'a échappé aussi ?",
      "C'est pas grave, ne t'en fais pas.",
      "Repose-toi et on verra plus tard."
    ]
  },
  {
    "npc_name": "Garen Fouldier",
    "type": "quest_complete",
    "entries": [
      "Tu l’as retrouvée ?! Super !",
      "Merci, [PlayerName].",
      "Je te dois une fière chandelle."
    ]
  }
]
```

## Note sur les Variables

Les textes peuvent contenir des variables dynamiques comme `[PlayerName]` ou `[DungeonThreshold]`. Voir [`docs/dialog_variables.md`](./dialog_variables.md) pour plus de détails.
