# CulturiaQuests

Ce projet est une application web full-stack comprenant un back-end (API headless) développé avec Strapi et un front-end développé avec Nuxt.js. Le tout est conteneurisé à l'aide de Docker pour un développement et un déploiement simplifiés.

## ✨ Stack Technique

-   **Frontend**: [Nuxt.js](https://nuxt.com/) (Framework Vue.js)
-   **Backend**: [Strapi](https://strapi.io/) (Headless CMS Node.js)
-   **Base de données**: [PostgreSQL](https://www.postgresql.org/)
-   **Conteneurisation**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Démarrage Rapide

Suivez ces étapes rigoureusement pour installer le projet et éviter les erreurs de première génération (notamment sur Strapi v5).

### Prérequis

Assurez-vous d'avoir installé sur votre machine :
-   [Node.js](https://nodejs.org/) (Version 20 ou supérieure recommandée)
-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Cloner le Dépôt

```bash
git clone <URL_DU_DEPOT>
cd CulturiaQuests
```

### 2\. Configuration des Variables d'Environnement

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

### 3\. Installation et Construction Manuelle (Important)

Pour éviter des erreurs d'interface lors du premier lancement (ex: *TypeError: reading 'tours'*), il est nécessaire de construire l'admin panel manuellement une première fois.

Toujours dans le dossier `backend/` :

1.  Installez les dépendances :

    ```bash
    npm install
    ```

2.  **Étape Cruciale :** Reconstruisez l'admin panel pour générer les fichiers correctement :

    ```bash
    npm run build
    ```

3.  Revenez à la racine du projet :

    ```bash
    cd ..
    ```

### 4\. Lancer l'Application avec Docker

Une fois la préparation terminée, lancez l'ensemble des services :

```bash
docker-compose up --build
```

*(Ajoutez l'option `-d` si vous souhaitez lancer les conteneurs en arrière-plan).*

Les services suivants seront démarrés :

  - `database`: Le serveur PostgreSQL.
  - `backend`: L'application Strapi (démarre sur le port 1337).
  - `frontend`: L'application Nuxt.js (démarre sur le port 3000).

### 5\. Accéder à l'Application

  - 🌍 **Frontend (Nuxt)** : [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
  - ⚙️ **Backend (API Strapi)** : [http://localhost:1337/api](https://www.google.com/search?q=http://localhost:1337/api)
  - 🔐 **Panneau d'Administration Strapi** : [http://localhost:1337/admin](https://www.google.com/search?q=http://localhost:1337/admin)

> **Premier lancement :** Vous devrez créer le premier compte administrateur ("Super Admin") lors de votre première connexion au panneau d'administration.

-----

## 🛠 Dépannage Courant

**Erreur "reading 'tours' undefined" sur Strapi :**
Si vous rencontrez cette erreur au lancement, c'est que le build de l'admin est corrompu.

1.  Arrêtez les conteneurs.
2.  Allez dans le dossier `backend`.
3.  Supprimez les dossiers `.strapi`, `dist` et `node_modules`.
4.  Relancez `npm install` puis `npm run build`.

-----

## 📂 Structure du Projet

```
.
├── backend/         # Contient l'application Strapi (API)
│   ├── .env         # Config Strapi (à créer)
│   └── ...
├── frontend/        # Contient l'application Nuxt.js (Client)
├── .env             # Config Docker (à créer)
├── .env.exemple     # Modèle de config racine
└── docker-compose.yml # Orchestration des conteneurs
```