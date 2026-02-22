# 🏰 CulturiaQuests

<div align="center">

![CulturiaQuests Banner](https://img.shields.io/badge/CulturiaQuests-RPG%20Géolocalisé-8B5CF6?style=for-the-badge&logo=mapbox&logoColor=white)

**Explorez Saint-Lô, découvrez sa culture, vivez l'aventure !**

[![Nuxt](https://img.shields.io/badge/Nuxt%204-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Strapi](https://img.shields.io/badge/Strapi%20v5-4945FF?style=flat-square&logo=strapi&logoColor=white)](https://strapi.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

*Projet de fin d'études BUT MMI 3ème année*

</div>

---

## 📖 À propos

**CulturiaQuests** est une application web de type **RPG géolocalisé** qui transforme l'exploration culturelle de la ville de **Saint-Lô** en une aventure ludique et immersive. Destinée aux **18-25 ans**, l'application incite les joueurs à découvrir le patrimoine local à travers des quêtes, des personnages et une progression de type jeu de rôle.

### 🎯 Notre mission

Rendre la culture accessible et attractive pour les jeunes adultes en combinant :
- 🗺️ **Exploration géolocalisée** de lieux culturels réels
- ⚔️ **Mécaniques RPG** engageantes (quêtes, personnages, équipements)
- 🏛️ **Découverte du patrimoine** de Saint-Lô

---

## ✨ Fonctionnalités

### 🗺️ Exploration
- **Carte interactive** avec les Points d'Intérêt (POI) culturels de Saint-Lô
- **Géolocalisation** pour valider la visite des lieux
- **Musées et sites** à découvrir dans la ville

### ⚔️ Gameplay RPG
- **Système de quêtes** avec objectifs à compléter
- **PNJ (Personnages Non-Joueurs)** avec dialogues et histoires
- **Guilde** personnalisable avec progression (XP, or, niveau)
- **Personnages jouables** avec différentes classes (Héros, Mage, Archer, Soldat)
- **Système d'équipement** (armes, casques, charmes) avec raretés

### 📊 Progression
- **Expéditions** dans les musées pour gagner des récompenses
- **Système d'amitié** avec les PNJ
- **Collection d'objets** et gestion d'inventaire
- **Journal d'entrées** débloquables

---

## 🛠️ Stack Technique

| Couche | Technologie | Description |
|--------|-------------|-------------|
| **Frontend** | [Nuxt 4](https://nuxt.com/) | Framework Vue.js 3 + TypeScript |
| **Backend** | [Strapi v5](https://strapi.io/) | Headless CMS Node.js + TypeScript |
| **Base de données** | [PostgreSQL](https://www.postgresql.org/) | Base de données relationnelle |
| **Conteneurisation** | [Docker](https://www.docker.com/) | Orchestration des services |
| **Géolocalisation** | strapi-geodata | Gestion des coordonnées GPS |

---

## 🚀 Démarrage Rapide

### Prérequis

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/)

### Installation

#### 1️⃣ Cloner le dépôt

```bash
git clone https://github.com/Skycun/CulturiaQuests.git
cd CulturiaQuests
```

#### 2️⃣ Configurer les variables d'environnement

**À la racine du projet :**
```bash
cp .env.exemple .env
```

**Dans le dossier backend :**
```bash
cd backend
cp .env.example .env
```

#### 3️⃣ Construire le backend (Important pour Strapi v5)

```bash
# Dans le dossier backend/
npm install
npm run build
cd ..
```

#### 4️⃣ Lancer l'application

```bash
docker compose up --build -d
```

#### 5️⃣ Créer votre premier compte admin

Lors de votre première connexion sur [http://localhost:1337/admin](http://localhost:1337/admin), vous devrez créer un compte Super Admin.

> **Note** : Les données initiales de démonstration ne sont pas fournies dans le dépôt public.

### 🌐 Accès à l'application

| Service | URL | Description |
|---------|-----|-------------|
| 🎮 Frontend | [http://localhost:3000](http://localhost:3000) | Application Nuxt |
| 🔌 API | [http://localhost:1337/api](http://localhost:1337/api) | API Strapi |
| ⚙️ Admin | [http://localhost:1337/admin](http://localhost:1337/admin) | Panneau d'administration |

> **💡 Premier lancement :** Créez un compte Super Admin lors de votre première connexion au panneau d'administration.

---

## 📂 Structure du Projet

```
CulturiaQuests/
├── 📁 backend/              # API Strapi v5
│   ├── config/              # Configuration Strapi
│   ├── src/
│   │   └── api/             # Content-Types (Guild, Character, Item, Quest, etc.)
│   └── public/              # Fichiers statiques
│
├── 📁 frontend/             # Application Nuxt 4
│   ├── app/                 # Pages, composants, stores (Pinia)
│   └── public/              # Assets publics
│
├── 📁 scripts/              # Scripts utilitaires
│   ├── pois_importer/       # Import de POI (OpenStreetMap + Ollama)
│   ├── populate_db/         # Seeding de la base de données
│   └── ai_reviewer.py       # Revue de code IA (CI/CD)
│
├── 📁 docs/                 # Documentation
├── 📄 docker-compose.yml    # Orchestration Docker
├── 📄 install.sh            # Script d'installation automatique
└── 📄 IMPLEMENTATION_PLAN.md # Architecture des Content-Types
```

---

## 🎮 Architecture du Jeu

### Entités principales

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Guild    │────▶│  Character  │────▶│    Item     │
│  (Joueur)   │     │   (Héros)   │     │ (Équipement)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Quest    │────▶│     NPC     │────▶│   Dialog    │
│  (Mission)  │     │ (Personnage)│     │ (Dialogue)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│     POI     │     │   Museum    │
│(Point Intérêt)    │   (Musée)   │
└─────────────┘     └─────────────┘
```

---

## 🔧 Scripts Utilitaires

| Script | Commande | Description |
|--------|----------|-------------|
| **Démarrer** | `docker compose up --build -d` | Lance tous les services |
| **Arrêter** | `docker compose down` | Arrête les conteneurs |
| **Sauvegarde BDD** | `bash scripts/backup-db.sh` | Crée une sauvegarde |
| **Restaurer BDD** | `bash scripts/restore-db.sh <fichier>.tar.gz` | Restaure une sauvegarde |
| **Import POIs** | `npx tsx scripts/pois_importer/comcom-import.ts` | Import par ComCom (OpenStreetMap + Ollama) |

---

## 🛠 Dépannage

<details>
<summary><strong>❌ Erreur "reading 'tours' undefined" sur Strapi</strong></summary>

Le build de l'admin est corrompu. Solution : 

```bash
cd backend
rm -rf .strapi dist node_modules
npm install
npm run build
cd ..
docker compose up --build
```
</details>

<details>
<summary><strong>❌ Problèmes de connexion à la base de données</strong></summary>

1. Vérifiez que le conteneur PostgreSQL est démarré : `docker ps`
2. Vérifiez les variables dans `.env`
3. Vérifiez les conflits de ports (5432)
</details>

---

## 👥 Équipe

<table>
  <tr>
    <td align="center">
      <strong>Brice</strong><br/>
      <sub>Chef de projet</sub><br/>
      <sub>Lead Designer</sub><br/>
      <sub>Lead Developer</sub>
    </td>
    <td align="center">
      <strong>Lelio</strong><br/>
      <sub>Lead Game Designer</sub><br/>
      <sub>Developer</sub>
    </td>
    <td align="center">
      <strong>Ethan</strong><br/>
      <sub>Designer</sub><br/>
      <sub>Developer</sub>
    </td>
  </tr>
</table>

---

## 🎓 Contexte Académique

Ce projet est réalisé dans le cadre du **projet de fin d'études** de 3ème année du **BUT MMI** (Métiers du Multimédia et de l'Internet).

---

## ⚠️ Droits d'Auteur et Licence

**Ce projet est protégé par le droit d'auteur.**

Ce dépôt est public **uniquement à des fins de consultation** pour permettre la présentation de notre projet de fin d'études. Le code source est la propriété exclusive de ses auteurs et de l'IUT Grand Ouest Normandie.

**Vous n'êtes PAS autorisé à :**
- Copier ou reproduire ce code
- Modifier ou créer des œuvres dérivées
- Distribuer ou publier ce code
- Utiliser ce code dans vos propres projets

Pour toute demande d'utilisation, veuillez contacter les auteurs.

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 📝 Notes de Développement

- **Strapi v5** : Utilise le Document Service API et le Factory Pattern
- **TypeScript** : Typage strict sur tout le projet
- **Docker** : Environnement conteneurisé pour la portabilité
- **strapi-geodata** : Plugin pour la gestion des coordonnées GPS avec geohash

---

## 📄 Licence

```
Copyright (c) 2026 Brice Ledanois, Ethan Raulin, Lelio Buton
IUT Grand Ouest Normandie - Université de Caen Normandie

ALL RIGHTS RESERVED
```

Ce code est protégé par le droit d'auteur. Voir le fichier [LICENSE](LICENSE) pour les détails complets.

---

<div align="center">

**Fait avec ❤️ à Saint-Lô**

*CulturiaQuests © 2026 - Projet BUT MMI*
*Brice Ledanois, Ethan Raulin, Lelio Buton*
*IUT Grand Ouest Normandie - Université de Caen Normandie*

**Tous droits réservés**

</div>
