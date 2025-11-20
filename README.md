# CulturiaQuests

Ce projet est une application web full-stack comprenant un back-end (API headless) développé avec Strapi et un front-end développé avec Nuxt.js. Le tout est conteneurisé à l'aide de Docker pour un développement et un déploiement simplifiés.

## ✨ Stack Technique

-   **Frontend**: [Nuxt.js](https://nuxt.com/) (Framework Vue.js)
-   **Backend**: [Strapi](https://strapi.io/) (Headless CMS Node.js)
-   **Base de données**: [PostgreSQL](https://www.postgresql.org/)
-   **Conteneurisation**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

---

## 🚀 Démarrage Rapide

Suivez ces étapes pour lancer l'application en environnement de développement.

### Prérequis

Assurez-vous d'avoir installé sur votre machine :
-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Cloner le Dépôt

```bash
git clone <URL_DU_DEPOT>
cd CulturiaQuests
```

### 2. Configuration de l'Environnement

Le projet utilise un fichier `.env` à la racine pour gérer toutes les variables d'environnement (base de données, ports, clés secrètes).

Copiez le fichier d'exemple pour créer votre propre configuration :

```bash
cp .env.exemple .env
```

Le fichier `.env` contient déjà des valeurs par défaut pour un environnement de développement local. **Pour un environnement de production, il est crucial de modifier les clés de sécurité** (`APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, etc.).

### 3. Lancer l'Application

Une fois le fichier `.env` configuré, lancez l'ensemble des services avec Docker Compose :

```bash
docker-compose up --build -d
```
-   `--build` : Construit les images Docker pour le front-end et le back-end à partir de leur `Dockerfile`.
-   `-d` : Lance les conteneurs en mode détaché (en arrière-plan).

Les services suivants seront démarrés :
-   `database`: Le serveur PostgreSQL.
-   `backend`: L'application Strapi.
-   `frontend`: L'application Nuxt.js.

### 4. Accéder à l'Application

Une fois les conteneurs lancés :

-   🌍 **Frontend (Nuxt)** est accessible à l'adresse : [http://localhost:3000](http://localhost:3000)
-   ⚙️ **Backend (API Strapi)** est accessible à l'adresse : [http://localhost:1337/api](http://localhost:1337/api)
-   🔐 **Panneau d'Administration Strapi** est accessible à : [http://localhost:1337/admin](http://localhost:1337/admin)

> **Note importante :** Lors du premier accès au panneau d'administration de Strapi, vous devrez créer le premier compte administrateur.

---

##  Scripts Docker Compose Utiles

-   **Arrêter tous les services :**
    ```bash
    docker-compose down
    ```

-   **Voir les logs d'un service en temps réel** (remplacer `backend` par `frontend` ou `database` si besoin) :
    ```bash
    docker-compose logs -f backend
    ```

-   **Se connecter au terminal d'un conteneur :**
    ```bash
    docker-compose exec backend bash
    ```

---

## 📂 Structure du Projet

```
.
├── backend/         # Contient l'application Strapi (API)
├── frontend/        # Contient l'application Nuxt.js (Client)
├── .env             # Fichier de configuration local (à créer)
├── .env.exemple     # Fichier d'exemple pour la configuration
└── docker-compose.yml # Fichier d'orchestration des conteneurs
```
