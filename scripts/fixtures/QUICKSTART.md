# 🚀 Démarrage Rapide - Script de Fixtures

## Installation (1 minute)

```bash
cd scripts/fixtures
npm install
```

## Configuration (2 minutes)

### 1. Token API

1. Ouvrir http://localhost:1337/admin
2. **Settings > API Tokens**
3. **Create new API Token**
   - Name: `Fixtures Generator`
   - Token type: `Full access`
   - Duration: `Unlimited`
4. Copier le token généré
5. Ajouter dans `.env` (racine du projet) :

```env
STRAPI_API_TOKEN=votre_token_ici
```

### 2. Permissions

1. **Settings > Users & Permissions Plugin > Roles > Authenticated**
2. Cocher pour chaque entité :

```
Guild:          ✅ create, find, findOne, update
Character:      ✅ create, find, findOne
Item:           ✅ create, find, findOne
Visit:          ✅ create
Run:            ✅ create
Quest:          ✅ create
Quiz-Attempt:   ✅ create
Friendship:     ✅ create
NPC-Friendship: ✅ create (si existe)
```

3. **Save** en haut à droite

## Vérification (30 secondes)

```bash
npm run check
```

**Résultat attendu** :
```
✅ Tags: 9 found (min: 5)
✅ Rarities: 5 found (min: 4)
✅ NPCs: 7 found (min: 5)
✅ POIs: 100 found (min: 10)
✅ Museums: 100 found (min: 3)
✅ Quiz Sessions (30d): 1 found (min: 0)
✅ Character Icons: 22 found (min: 1)
✅ Weapon Icons: 22 found (min: 1)
✅ Helmet Icons: 22 found (min: 1)
✅ Charm Icons: 22 found (min: 1)

✅ Toutes les données de référence sont OK
```

Si une ligne est ❌, voir la section Dépannage ci-dessous.

## Test (1 minute)

```bash
npm run generate -- --users 5
```

**Résultat attendu** :
```
🎮 CulturiaQuests - Générateur de Fixtures

📦 Génération de 5 utilisateurs avec activités...

1️⃣  Chargement des données de référence...
   ✅ 100 POIs, 100 museums, 7 NPCs

2️⃣  Création des utilisateurs, guildes et personnages...
   ████████████████████████████████████████ 100% | 5/5 users

3️⃣  Génération des activités...
   ████████████████████████████████████████ 100% | 5/5 users

4️⃣  Mise à jour des ressources des guildes...
   ✅ Ressources mises à jour

✨ Génération terminée en 45.23s!

📊 Résumé de la génération:

Distribution des personas:
   ⚔️  Hardcore: 1 (20.0%)
   🎮 Regular: 2 (40.0%)
   🌟 Casual: 2 (40.0%)
   💤 Dormant: 0 (0.0%)

Ressources totales:
   💰 Gold: 12,450
   ⭐ XP: 5,230

Moyennes par utilisateur:
   💰 Gold: 2,490
   ⭐ XP: 1,046
```

## Vérification Dashboard

Ouvrir http://localhost:3000/dashboard et vérifier :

- ✅ **Overview** : Métriques remplies
- ✅ **Players** : 5 utilisateurs listés
- ✅ **Map** : Activités visibles
- ✅ **Economy** : Gold/XP distribués
- ✅ **Quiz** : Attempts créés
- ✅ **Social** : Friendships créées

## Génération Complète

```bash
npm run generate -- --users 50
```

⏱️ Temps estimé : ~3 minutes

## Cleanup

```bash
npm run cleanup
```

Supprime tous les utilisateurs `fixture_*` et leurs données.

## 🔥 Dépannage Express

### ❌ "STRAPI_API_TOKEN non trouvé"

**Solution** : Créer le token API et l'ajouter dans `.env`

### ❌ "403 Forbidden"

**Solution** : Configurer les permissions (voir section Configuration ci-dessus)

### ❌ "Email or Username are already taken"

**Solution** : `npm run cleanup` puis relancer

### ❌ "No matching data found"

**Solution** : Vérifier que les POIs, Museums, NPCs existent en base

### ❌ "Character Icons: 0 found"

**Solution** : Ajouter des images dans la media library Strapi

## 📖 Documentation Complète

- **README.md** : Documentation utilisateur complète
- **IMPLEMENTATION.md** : Détails techniques
- **PERMISSIONS.md** : Guide permissions détaillé
- **SUMMARY.md** : Vue d'ensemble du projet

## 🎯 Résultat Final

Après génération de 50 utilisateurs :

- **Dashboard Overview** : Toutes les métriques remplies
- **Players** : 50 joueurs avec statistiques variées
- **Map** : Centaines de visites POI et runs musée
- **Economy** : Distribution réaliste de gold/XP
- **Expeditions** : Stats détaillées par musée
- **Quiz** : Leaderboard et distribution de scores
- **Social** : Réseau de friendships
- **Connections** : Graphiques hebdomadaires et heures de pointe

🎉 **Prêt pour la présentation !**
