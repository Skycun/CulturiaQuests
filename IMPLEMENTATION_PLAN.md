# Plan d'Implémentation - Content-Types Strapi pour Culturia Quests

## Vue d'ensemble

Ce plan détaille la création et modification de tous les Content-Types Strapi pour correspondre au schéma de base de données du jeu RPG géolocalisé "Culturia Quests".

**Projet:** Strapi v5.31.1
**Localisation:** `/home/skycun/cours/CulturiaQuests/backend/`

---

## Analyse de l'État Actuel

### Content-Types Existants (10)
✅ guild, character, item, npc, run, friendship, poi, tag, rarity, entry

### Content-Types à Créer (4)
🆕 museum, visit, quest, dialog

### Content-Types à Modifier (10)
🔧 Tous les existants nécessitent des modifications

---

## Décisions Architecturales

### 1. Gestion du Content-Type "Entry"
**Décision:** Supprimer "entry" et créer "dialog" de zéro.
**Raison:** Les attributs sont complètement différents (entry_number/text vs text_type/dialogues). Plus propre de recréer.

### 2. Stratégie de Migration
- **Pas de backup nécessaire** pour cette phase de développement
- **Ordre d'opération:** Créer les nouveaux Content-Types d'abord, puis modifier les existants
- **Relations:** Les changements de oneToOne vers manyToOne nécessitent de mettre à jour les deux côtés de la relation

### 3. Relations Bidirectionnelles
- **oneToMany:** Le côté "One" utilise `inversedBy`, le côté "Many" utilise `mappedBy`
- **manyToOne:** Le côté "Many" utilise `inversedBy`, le côté "One" utilise `mappedBy`
- **manyToMany:** Définir la relation des deux côtés avec `inversedBy`

### 4. Valeurs par Défaut
- **En base de données:** Strapi gère automatiquement les valeurs null
- **Dans le code:** Définir les defaults dans les controllers/services si nécessaire
- **Pour les booleans:** Strapi initialise à `false` par défaut
- **Pour les integers:** Initialisation à `null` ou `0` selon le contexte applicatif

### 5. Relation Guild ↔ User
- **Target:** `plugin::users-permissions.user` (pas `api::user.user`)
- **Type:** oneToOne bidirectionnelle
- Ne PAS toucher au schéma User natif de Strapi

---

## Configuration du Plugin strapi-geodata

### Installation
Le plugin strapi-geodata a été installé pour gérer les coordonnées GPS de manière optimale.

**Package installé:**
```bash
npm install strapi-geodata
```

### Fonctionnement du Plugin

Le plugin strapi-geodata ajoute automatiquement une interface de carte interactive dans l'admin Strapi pour les Content-Types qui ont les champs suivants :
- `latitude` (float)
- `longitude` (float)
- `geohash` (string) - auto-généré

**Avantages:**
- ✅ Interface visuelle pour placer les POI/Museums sur une carte
- ✅ Recherche d'adresse intégrée
- ✅ Geohash auto-généré pour requêtes de proximité optimisées
- ✅ Compatible avec SQLite (base actuelle)

### Content-Types Utilisant strapi-geodata

1. **Museum** - latitude, longitude, geohash
2. **POI** - latitude, longitude, geohash

### Exemple de Requêtes de Proximité Optimisées

```javascript
// Requête de proximité utilisant le geohash (rapide, indexable)
const Geohash = require('ngeohash');

// Position de l'utilisateur
const userLat = 48.8566;
const userLng = 2.3522;
const userGeohash = Geohash.encode(userLat, userLng, 6);

// Préfiltrage rapide avec geohash (requête indexée en base)
const nearbyPOIs = await strapi.entityService.findMany('api::poi.poi', {
  filters: {
    geohash: {
      $startsWith: userGeohash.substring(0, 4) // Zone approximative
    }
  },
  limit: 100
});

// Calcul précis de distance uniquement sur les candidats
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance en mètres
};

const poisWithDistance = nearbyPOIs
  .map(poi => ({
    ...poi,
    distance: calculateDistance(userLat, userLng, poi.latitude, poi.longitude)
  }))
  .filter(poi => poi.distance < 5000) // 5km
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 20); // Top 20 POIs les plus proches

console.log(poisWithDistance);
```

---

## Plan d'Implémentation Étape par Étape

### Phase 1: Création des Nouveaux Content-Types

#### Étape 1.1: Créer Museum
**Fichiers à créer:**
```
backend/src/api/museum/
├── content-types/museum/schema.json
├── controllers/museum.ts
├── services/museum.ts
└── routes/museum.ts
```

**Schema museum:**
```json
{
  "kind": "collectionType",
  "collectionName": "museums",
  "info": {
    "singularName": "museum",
    "pluralName": "museums",
    "displayName": "Museum"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "latitude": {
      "type": "float",
      "required": true
    },
    "longitude": {
      "type": "float",
      "required": true
    },
    "geohash": {
      "type": "string"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::tag.tag",
      "inversedBy": "museums"
    },
    "runs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::run.run",
      "mappedBy": "museum"
    }
  }
}
```

**Vérification:** Lancer `npm run build` pour vérifier que le Content-Type compile.

---

#### Étape 1.2: Créer Visit
**Fichiers à créer:**
```
backend/src/api/visit/
├── content-types/visit/schema.json
├── controllers/visit.ts
├── services/visit.ts
└── routes/visit.ts
```

**Schema visit:**
```json
{
  "kind": "collectionType",
  "collectionName": "visits",
  "info": {
    "singularName": "visit",
    "pluralName": "visits",
    "displayName": "Visit"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "open_count": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "last_opened_at": {
      "type": "datetime"
    },
    "total_gold_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "total_exp_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "visits"
    },
    "poi": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::poi.poi",
      "inversedBy": "visits"
    },
    "items": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::item.item",
      "inversedBy": "visits"
    }
  }
}
```

**Vérification:** Build et vérifier dans l'admin Strapi.

---

#### Étape 1.3: Créer Quest
**Fichiers à créer:**
```
backend/src/api/quest/
├── content-types/quest/schema.json
├── controllers/quest.ts
├── services/quest.ts
└── routes/quest.ts
```

**Schema quest:**
```json
{
  "kind": "collectionType",
  "collectionName": "quests",
  "info": {
    "singularName": "quest",
    "pluralName": "quests",
    "displayName": "Quest"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "is_poi_a_completed": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "is_poi_b_completed": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "date_start": {
      "type": "datetime",
      "required": true
    },
    "date_end": {
      "type": "datetime"
    },
    "gold_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "xp_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "quests"
    },
    "npc": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::npc.npc",
      "inversedBy": "quests"
    },
    "poi_a": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::poi.poi",
      "inversedBy": "quests_a"
    },
    "poi_b": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::poi.poi",
      "inversedBy": "quests_b"
    }
  }
}
```

**Note importante:** Quest a deux relations distinctes vers POI (poi_a et poi_b).

**Vérification:** Build et tester la création de Quest.

---

#### Étape 1.4: Créer Dialog
**Fichiers à créer:**
```
backend/src/api/dialog/
├── content-types/dialog/schema.json
├── controllers/dialog.ts
├── services/dialog.ts
└── routes/dialog.ts
```

**Schema dialog:**
```json
{
  "kind": "collectionType",
  "collectionName": "dialogs",
  "info": {
    "singularName": "dialog",
    "pluralName": "dialogs",
    "displayName": "Dialog"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "text_type": {
      "type": "enumeration",
      "enum": [
        "quest_description",
        "expedition_appear",
        "expedition_fail",
        "quest_complete",
        "journal_entries"
      ],
      "required": true
    },
    "dialogues": {
      "type": "json",
      "required": true
    },
    "npc": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::npc.npc",
      "inversedBy": "dialogs"
    }
  }
}
```

**Vérification:** Build et tester les enums.

---

### Phase 2: Modification des Content-Types Existants

#### Étape 2.1: Modifier Guild
**Fichier:** `/backend/src/api/guild/content-types/guild/schema.json`

**Modifications:**
1. Renommer `experience` → `exp`
2. Renommer `scraps` → `scrap`
3. Ajouter relation `user` (oneToOne vers plugin::users-permissions.user)
4. Ajouter relations: `items`, `visits`, `runs`, `friendships`, `quests` (toutes oneToMany)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "guilds",
  "info": {
    "singularName": "guild",
    "pluralName": "guilds",
    "displayName": "Guild"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "gold": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "exp": {
      "type": "biginteger",
      "default": "0"
    },
    "scrap": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::users-permissions.user"
    },
    "characters": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::character.character",
      "mappedBy": "guild"
    },
    "items": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::item.item",
      "mappedBy": "guild"
    },
    "visits": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::visit.visit",
      "mappedBy": "guild"
    },
    "runs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::run.run",
      "mappedBy": "guild"
    },
    "friendships": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::friendship.friendship",
      "mappedBy": "guild"
    },
    "quests": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::quest.quest",
      "mappedBy": "guild"
    }
  }
}
```

**Vérification:** Build et tester la relation avec User.

---

#### Étape 2.2: Modifier Character
**Fichier:** `/backend/src/api/character/content-types/character/schema.json`

**Modifications:**
1. Supprimer `name`
2. Ajouter `firstname` et `lastname`
3. Changer `job` de string vers enumeration
4. Ajouter relation `items` (oneToMany vers items équipés)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "characters",
  "info": {
    "singularName": "character",
    "pluralName": "characters",
    "displayName": "Character"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "firstname": {
      "type": "string",
      "required": true
    },
    "lastname": {
      "type": "string",
      "required": true
    },
    "job": {
      "type": "enumeration",
      "enum": ["hero", "mage", "archer", "soldier"],
      "required": true
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "characters"
    },
    "items": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::item.item",
      "mappedBy": "character"
    }
  }
}
```

**Vérification:** Build et vérifier l'enum job.

---

#### Étape 2.3: Modifier Item
**Fichier:** `/backend/src/api/item/content-types/item/schema.json`

**Modifications:**
1. Changer `rarity` de oneToOne vers manyToOne
2. Changer `guild` de oneToOne vers manyToOne
3. Changer `character` de oneToOne vers manyToOne (nullable)
4. Ajouter `slot` (enumeration)
5. Ajouter `isScrapped` (boolean)
6. Ajouter relations manyToMany: `tags`, `runs`, `visits`

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "items",
  "info": {
    "singularName": "item",
    "pluralName": "items",
    "displayName": "Item"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "level": {
      "type": "integer",
      "required": true
    },
    "index_damage": {
      "type": "integer",
      "required": true
    },
    "slot": {
      "type": "enumeration",
      "enum": ["weapon", "helmet", "charm"],
      "required": true
    },
    "isScrapped": {
      "type": "boolean",
      "default": false,
      "required": true
    },
    "rarity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::rarity.rarity",
      "inversedBy": "items"
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "items"
    },
    "character": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::character.character",
      "inversedBy": "items"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::tag.tag",
      "inversedBy": "items"
    },
    "runs": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::run.run",
      "inversedBy": "items"
    },
    "visits": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::visit.visit",
      "inversedBy": "items"
    }
  }
}
```

**Vérification:** Vérifier que character peut être null.

---

#### Étape 2.4: Modifier NPC
**Fichier:** `/backend/src/api/npc/content-types/npc/schema.json`

**Modifications:**
1. Garder `firstname`, `lastname`, `pronouns`
2. Supprimer `professions`
3. Supprimer relation `entries`
4. Ajouter `quests_entry_available` et `expedition_entry_available` (integers)
5. Ajouter relations: `friendships`, `quests`, `dialogs`, `runs` (toutes oneToMany)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "npcs",
  "info": {
    "singularName": "npc",
    "pluralName": "npcs",
    "displayName": "Npc"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "firstname": {
      "type": "string",
      "required": true
    },
    "lastname": {
      "type": "string",
      "required": true
    },
    "pronouns": {
      "type": "string",
      "required": true
    },
    "quests_entry_available": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "expedition_entry_available": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "friendships": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::friendship.friendship",
      "mappedBy": "npc"
    },
    "quests": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::quest.quest",
      "mappedBy": "npc"
    },
    "dialogs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::dialog.dialog",
      "mappedBy": "npc"
    },
    "runs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::run.run",
      "mappedBy": "npc"
    }
  }
}
```

**Vérification:** Build sans erreur.

---

#### Étape 2.5: Modifier Run
**Fichier:** `/backend/src/api/run/content-types/run/schema.json`

**Modifications:**
1. Changer `guild` de oneToOne vers manyToOne
2. Supprimer relation `poi`
3. Ajouter relation `museum` (manyToOne)
4. Ajouter relation `npc` (manyToOne, nullable)
5. Ajouter `xp_earned`, `threshold_reached`, `target_threshold`, `entry_unlocked`
6. Ajouter relation `items` (manyToMany)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "runs",
  "info": {
    "singularName": "run",
    "pluralName": "runs",
    "displayName": "Run"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "dps": {
      "type": "integer",
      "required": true
    },
    "date_start": {
      "type": "datetime",
      "required": true
    },
    "date_end": {
      "type": "datetime"
    },
    "gold_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "xp_earned": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "threshold_reached": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "target_threshold": {
      "type": "integer"
    },
    "entry_unlocked": {
      "type": "boolean"
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "runs"
    },
    "museum": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::museum.museum",
      "inversedBy": "runs"
    },
    "npc": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::npc.npc",
      "inversedBy": "runs"
    },
    "items": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::item.item",
      "inversedBy": "runs"
    }
  }
}
```

**Vérification:** Vérifier que npc, date_end, target_threshold, entry_unlocked peuvent être null.

---

#### Étape 2.6: Modifier Friendship
**Fichier:** `/backend/src/api/friendship/content-types/friendship/schema.json`

**Modifications:**
1. Changer `npc` de oneToOne vers manyToOne
2. Changer `guild` de oneToOne vers manyToOne
3. Supprimer `entry_count_unlocked`
4. Ajouter `quests_entry_unlocked` et `expedition_entry_unlocked`

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "friendships",
  "info": {
    "singularName": "friendship",
    "pluralName": "friendships",
    "displayName": "Friendship"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "quests_entry_unlocked": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "expedition_entry_unlocked": {
      "type": "integer",
      "default": 0,
      "required": true
    },
    "npc": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::npc.npc",
      "inversedBy": "friendships"
    },
    "guild": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::guild.guild",
      "inversedBy": "friendships"
    }
  }
}
```

**Vérification:** Build et tester.

---

#### Étape 2.7: Modifier POI
**Fichier:** `/backend/src/api/poi/content-types/poi/schema.json`

**Modifications:**
1. Garder `name`
2. Remplacer `location` (json) par `latitude`, `longitude`, `geohash` (pour strapi-geodata)
3. Ajouter relation `visits` (oneToMany)
4. Ajouter relations `quests_a` et `quests_b` (oneToMany vers quest)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "pois",
  "info": {
    "singularName": "poi",
    "pluralName": "pois",
    "displayName": "POI"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "latitude": {
      "type": "float",
      "required": true
    },
    "longitude": {
      "type": "float",
      "required": true
    },
    "geohash": {
      "type": "string"
    },
    "visits": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::visit.visit",
      "mappedBy": "poi"
    },
    "quests_a": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::quest.quest",
      "mappedBy": "poi_a"
    },
    "quests_b": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::quest.quest",
      "mappedBy": "poi_b"
    }
  }
}
```

**Vérification:** Build et vérifier les deux relations vers Quest.

---

#### Étape 2.8: Modifier Tag
**Fichier:** `/backend/src/api/tag/content-types/tag/schema.json`

**Modifications:**
1. Garder `name`
2. Ajouter relations `items` et `museums` (manyToMany)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "tags",
  "info": {
    "singularName": "tag",
    "pluralName": "tags",
    "displayName": "Tag"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "items": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::item.item",
      "inversedBy": "tags"
    },
    "museums": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::museum.museum",
      "inversedBy": "tags"
    }
  }
}
```

**Vérification:** Build sans erreur.

---

#### Étape 2.9: Modifier Rarity
**Fichier:** `/backend/src/api/rarity/content-types/rarity/schema.json`

**Modifications:**
1. Garder `name`
2. Ajouter relation `items` (oneToMany)

**Schema complet:**
```json
{
  "kind": "collectionType",
  "collectionName": "rarities",
  "info": {
    "singularName": "rarity",
    "pluralName": "rarities",
    "displayName": "Rarity"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "name": {
      "type": "string",
      "required": true
    },
    "items": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::item.item",
      "mappedBy": "rarity"
    }
  }
}
```

**Vérification:** Build et tester.

---

### Phase 3: Suppression de l'Ancien Content-Type

#### Étape 3.1: Supprimer Entry
**Action:** Supprimer tout le dossier `/backend/src/api/entry/`

**Commandes:**
```bash
rm -rf /home/skycun/cours/CulturiaQuests/backend/src/api/entry
```

**Vérification:** Build pour s'assurer qu'aucune autre partie du code ne référence Entry.

---

### Phase 4: Mise à Jour du Bootstrap/Seeding

#### Étape 4.1: Mettre à jour le fichier bootstrap
**Fichier:** `/backend/src/index.ts`

**Actions:**
1. Supprimer le seeding des NPCs qui référencent "entries"
2. Optionnel: Ajouter le seeding pour Museums si nécessaire

**Vérification:** Lancer `npm run develop` et vérifier que le seeding fonctionne.

---

## Ordre d'Exécution Recommandé

### ⚠️ IMPORTANT: Ordre des Opérations

Pour éviter les erreurs de dépendances circulaires:

1. **Créer Museum** (pas de dépendances complexes)
2. **Créer Visit** (dépend de Guild et POI qui existent)
3. **Créer Quest** (dépend de Guild, NPC, POI qui existent)
4. **Créer Dialog** (dépend de NPC qui existe)
5. **Modifier Tag** (ajouter relations vers Museum et Item)
6. **Modifier Rarity** (ajouter relation vers Item)
7. **Modifier Guild** (ajouter toutes les nouvelles relations)
8. **Modifier Character** (changer job en enum, ajouter firstname/lastname)
9. **Modifier Item** (ajouter slot, isScrapped, et relations manyToMany)
10. **Modifier POI** (ajouter relations vers Visit et Quest)
11. **Modifier NPC** (ajouter relations vers Dialog, Quest, etc.)
12. **Modifier Run** (changer relation vers Museum au lieu de POI)
13. **Modifier Friendship** (renommer champs)
14. **Supprimer Entry**
15. **Mettre à jour Bootstrap**

---

## Vérifications à Chaque Étape

Après chaque modification:

1. ✅ **Build:** `npm run build` doit réussir sans erreur
2. ✅ **TypeScript:** Aucune erreur de type
3. ✅ **Admin Panel:** Vérifier dans l'interface Strapi que le Content-Type apparaît correctement
4. ✅ **Relations:** Tester la création d'une entrée avec relations
5. ✅ **API:** Tester un appel GET/POST sur l'endpoint

---

## Commandes Utiles

### Build du projet
```bash
cd /home/skycun/cours/CulturiaQuests/backend
npm run build
```

### Lancer le serveur de développement
```bash
npm run develop
```

### Vérifier les types TypeScript
```bash
npm run build
```

---

## Risques et Points d'Attention

### ⚠️ Risque 1: Relations Circulaires
**Problème:** Les relations bidirectionnelles peuvent créer des dépendances circulaires.
**Solution:** Toujours créer les Content-Types de base avant d'ajouter les relations complexes.

### ⚠️ Risque 2: Changement oneToOne → manyToOne
**Problème:** Les données existantes peuvent être perdues.
**Solution:** Pour ce projet en développement, c'est acceptable. En production, il faudrait une migration.

### ⚠️ Risque 3: Enumerations
**Problème:** Les valeurs d'enum ne peuvent pas être changées facilement après création.
**Solution:** Vérifier deux fois les valeurs avant de créer.

### ⚠️ Risque 4: Relation User
**Problème:** La relation vers `plugin::users-permissions.user` peut être délicate.
**Solution:** Utiliser exactement cette syntaxe, ne pas toucher au schéma User.

### ⚠️ Risque 5: Champs Nullables
**Problème:** Strapi peut ne pas gérer correctement les champs nullable sans configuration explicite.
**Solution:** Ne pas mettre `required: true` sur les champs qui doivent être nullables.

---

## Template de Fichiers

### Controller Template
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::{name}.{name}');
```

### Service Template
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::{name}.{name}');
```

### Routes Template
```typescript
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::{name}.{name}');
```

---

## Résultat Final Attendu

### Content-Types Finaux (13 total)
✅ guild, character, item, npc, run, friendship, poi, tag, rarity, museum, visit, quest, dialog

### Relations Complètes
- User ↔ Guild (oneToOne)
- Guild → Character, Item, Visit, Run, Friendship, Quest (oneToMany)
- Character → Item (oneToMany équipement)
- Rarity → Item (oneToMany)
- POI → Visit, Quest (poi_a), Quest (poi_b) (oneToMany)
- Museum → Run (oneToMany)
- NPC → Friendship, Quest, Dialog, Run (oneToMany)
- Item ↔ Tag (manyToMany)
- Museum ↔ Tag (manyToMany)
- Run ↔ Item (manyToMany items générés)
- Visit ↔ Item (manyToMany items récompenses)

### Enumerations Définies
- Character.job: hero, mage, archer, soldier
- Item.slot: weapon, helmet, charm
- Dialog.text_type: quest_description, expedition_appear, expedition_fail, quest_complete, journal_entries

---

## Notes Supplémentaires

- Tous les fichiers utilisent le format JSON pour les schemas
- Tous les controllers/services/routes utilisent le pattern Factory de Strapi v5
- L'option `draftAndPublish: true` est activée sur tous les Content-Types
- Les valeurs par défaut sont définies dans les schemas quand c'est pertinent
- Les champs `required: true` sont ajoutés pour les champs obligatoires

---

**Date de création du plan:** 2025-12-11
**Auteur:** Claude Code
**Projet:** Culturia Quests Backend (Strapi v5.31.1)
