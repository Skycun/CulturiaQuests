# CulturiaQuests

Ce projet est une application web full-stack de type RPG géolocalisé, comprenant un back-end (API headless) développé avec Strapi et un front-end développé avec Nuxt. Le tout est conteneurisé à l'aide de Docker pour un développement et un déploiement simplifiés.

---

## Table des matières

- [✨ Stack Technique](#-stack-technique)
- [🚧 État du Développement](#-état-du-développement)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [📂 Structure du Projet](#-structure-du-projet)
- [🛠 Dépannage Courant](#-dépannage-courant)
- [🔧 Scripts Utilitaires](#-scripts-utilitaires)
- [📝 Notes de Développement](#-notes-de-développement)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)
- [## Premier pas](#-premier-pas)
---

## ✨ Stack Technique

- **Frontend**: [Nuxt 4](https://nuxt.com/) (Vue.js 3 + TypeScript)
- **Backend**: [Strapi v5](https://strapi.io/) (Headless CMS Node.js + TypeScript)
- **Base de données**: [PostgreSQL](https://www.postgresql.org/)
- **Conteneurisation**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## 🚧 État du Développement

**⚠️ Refonte en cours :** Le projet subit actuellement une refonte majeure de ses types de contenu (Content-Types) Strapi.
Pour plus de détails sur l'architecture de la base de données et le plan d'implémentation, voir le fichier [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

---

## 🚀 Démarrage Rapide

Suivez ces étapes rigoureusement pour installer le projet et éviter les erreurs de première génération (notamment sur Strapi v5).

### Prérequis

Assurez-vous d'avoir installé sur votre machine :
- [Node.js](https://nodejs.org/) (Version 20 ou supérieure recommandée)
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Cloner le Dépôt

```bash
git clone <URL_DU_DEPOT>
cd CulturiaQuests
```

### 2. Configuration des Variables d'Environnement

Le projet nécessite deux fichiers de configuration `.env` (un à la racine pour Docker, un dans le backend pour Strapi).

**A. À la racine du projet :**
Copiez le fichier d'exemple :

```bash
cp .env.exemple .env
```

**B. Dans le dossier backend :**
Strapi a besoin de ses propres clés pour construire l'interface d'administration.

```bash
cd backend
cp .env.example .env
```

> **Note :** Pour la production, modifiez impérativement les clés secrètes (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, etc.) dans ces fichiers.

### 3. Installation et Construction Manuelle (Important)

Pour éviter des erreurs d'interface lors du premier lancement (ex: *TypeError: reading 'tours'*), il est nécessaire de construire l'admin panel manuellement une première fois.

Toujours dans le dossier `backend/` :

1. Installez les dépendances :

```bash
npm install
```

2. **Étape Cruciale :** Reconstruisez l'admin panel pour générer les fichiers correctement :

```bash
npm run build
```

3. Revenez à la racine du projet :

```bash
cd ..
```

### 4. Lancer l'Application avec Docker

Une fois la préparation terminée, lancez l'ensemble des services :

```bash
docker-compose up --build
```

*(Ajoutez l'option `-d` si vous souhaitez lancer les conteneurs en arrière-plan).*

Les services suivants seront démarrés :

- `database`: Le serveur PostgreSQL.
- `backend`: L'application Strapi (démarre sur le port 1337).
- `frontend`: L'application Nuxt (démarre sur le port 3000).

### 5. Accéder à l'Application

- 🌍 **Frontend (Nuxt)** : [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend (API Strapi)** : [http://localhost:1337/api](http://localhost:1337/api)
- 🔐 **Panneau d'Administration Strapi** : [http://localhost:1337/admin](http://localhost:1337/admin)

> **Premier lancement :** Vous devrez créer le premier compte administrateur ("Super Admin") lors de votre première connexion au panneau d'administration.

---

## 📂 Structure du Projet

```
.
├── backend/         # Contient l'application Strapi v5 (API)
│   ├── config/      # Configuration Strapi
│   ├── src/         # Code source (Content-Types, API, Extensions)
│   ├── public/      # Fichiers statiques
│   └── ...
├── frontend/        # Contient l'application Nuxt 4 (Client)
│   ├── app/         # Pages, composants, stores (Pinia)
│   ├── public/      # Fichiers statiques
│   └── ...
├── scripts/         # Scripts utilitaires
│   ├── pois_importer/ # Script d'import de POI (Google Maps)
│   ├── populate_db/   # Script de seeding de la base de données
│   └── ai_reviewer.py # Script de revue de code (CI/CD)
├── .env             # Config Docker (à créer)
├── .env.exemple     # Modèle de config racine
├── docker-compose.yml # Orchestration des conteneurs
└── IMPLEMENTATION_PLAN.md # Plan détaillé des Content-Types
```

---

## 🛠 Dépannage Courant

**Erreur "reading 'tours' undefined" sur Strapi :**
Si vous rencontrez cette erreur au lancement, c'est que le build de l'admin est corrompu.

1. Arrêtez les conteneurs.
2. Allez dans le dossier `backend`.
3. Supprimez les dossiers `.strapi`, `dist` et `node_modules`.
4. Relancez `npm install` puis `npm run build`.

**Problèmes de connexion à la base de données :**
Vérifiez que :
1. Le conteneur PostgreSQL est bien démarré
2. Les variables d'environnement dans `.env` sont correctes
3. Les ports ne sont pas en conflit

---

## 🔧 Scripts Utilitaires

Le projet inclut plusieurs scripts utilitaires situés dans le dossier `scripts/` :

1. **POI Importer** (`scripts/pois_importer/`) :
   - Importe des Points d'Intérêt depuis des sources externes (ex: Google Maps).
   - Génère des fichiers JSON utilisés ensuite pour le seeding.

2. **Populate DB** (`scripts/populate_db/`) :
   - Remplit la base de données Strapi avec des données initiales (NPCs, Items, POIs, Dialogues).
   - Utile pour initialiser un environnement de développement cohérent.

3. **AI Reviewer** (`scripts/ai_reviewer.py`) :
   - Analyse les changements de code dans les Pull Requests.
   - Utilisé par le workflow GitHub Actions.

---

## 📝 Notes de Développement

- **Strapi v5** : Ce projet utilise Strapi v5 qui introduit des changements significatifs par rapport aux versions précédentes (Factory Pattern, Document Service API).
- **TypeScript** : Le backend et le frontend utilisent strictement TypeScript pour un meilleur typage et maintenabilité.
- **Docker** : Tous les services sont conteneurisés pour une meilleure portabilité.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Premier pas
# Pour lancer :
Avoir lancé docker desktop
docker compose up --build -d

# Pour restaurer la base de données avec les données initiales :
(avoir déjà lancé les conteneurs)
bash scripts/restore-db.sh backups/initial_data.tar.gz

# pour faire une sauvegarde de la base de données :
bash scripts/backup