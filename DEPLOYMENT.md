# 🚀 Guide de déploiement CulturiaQuests

## Architecture

- **Backend** : Strapi (headless CMS) déployé sur serveur privé → `https://cqapi.ada.briceledanois.fr`
- **Frontend** : Nuxt.js embarqué dans une app Android via Capacitor
- **Base de données** : PostgreSQL 14 (uniquement accessible par le backend)

---

## 📦 Déploiement Backend (Production)

### Premier déploiement (sur le serveur)

```bash
# 1. SSH sur le serveur
ssh user@cqapi.ada.briceledanois.fr

# 2. Cloner le repo
git clone <repo-url> /opt/culturiaquests
cd /opt/culturiaquests

# 3. Checkout la branche release
git checkout release

# 4. Créer .env.production
cp .env.production.exemple .env.production
nano .env.production  # Modifier tous les secrets

# 5. Copier le backup initial
# (uploader depuis ta machine locale via scp)
scp backups/initial_data.tar.gz user@serveur:/opt/culturiaquests/backups/

# 6. Lancer l'installation
./install-prod.sh backups/initial_data.tar.gz
```

### Déploiements suivants (automatiques via CI/CD)

```bash
# Sur ta machine locale
git checkout release
git merge main  # ou feature/xxx
git push origin release
```

Le workflow GitHub Actions va automatiquement :
1. SSH sur le serveur
2. Pull le code
3. Rebuild les images Docker
4. Redémarrer les services

### Commandes utiles sur le serveur

```bash
cd /opt/culturiaquests

# Voir les logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend

# Redémarrer le backend
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend

# Arrêter tout
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Démarrer
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 📱 Build de l'app Android

### Prérequis

- Node.js 22+
- Java JDK 17+ (pour Gradle)
- Android Studio (optionnel, seulement pour éditer/debug)

### Build de l'APK

```bash
cd frontend

# 1. Build le frontend (génère .output/public)
npm run generate

# 2. Sync avec Capacitor (copie dans android/)
npx cap sync android

# 3. Build l'APK
cd android
./gradlew assembleRelease

# L'APK sera dans :
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Script automatisé

```bash
cd frontend
./build-android.sh prod  # ou ./build-android.sh dev
```

### Signer l'APK (pour Google Play)

```bash
# Générer une clé de signature (une seule fois)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias

# Signer l'APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.jks app-release-unsigned.apk my-alias

# Zipalign
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

---

## 🔧 Configuration GitHub Actions

### Secrets requis

| Secret | Description | Exemple |
|---|---|---|
| `DEPLOY_HOST` | IP/hostname du serveur | `51.83.45.123` |
| `DEPLOY_USER` | Utilisateur SSH | `deploy` |
| `DEPLOY_SSH_KEY` | Clé privée SSH (complète) | `-----BEGIN OPENSSH...` |
| `DEPLOY_PATH` | Chemin du projet | `/opt/culturiaquests` |
| `POSTGRES_DB` | Nom de la base | `strapi` |
| `POSTGRES_USER` | User PostgreSQL | `strapi` |
| `POSTGRES_PASSWORD` | Password PostgreSQL | (généré) |
| `APP_KEYS` | Strapi app keys (4 clés) | `key1,key2,key3,key4` |
| `API_TOKEN_SALT` | Strapi API token salt | (généré) |
| `ADMIN_JWT_SECRET` | Strapi admin secret | (généré) |
| `TRANSFER_TOKEN_SALT` | Strapi transfer salt | (généré) |
| `JWT_SECRET` | JWT secret utilisateurs | (généré) |
| `OPENAI_API_KEY` | Clé API OpenAI | `sk-...` |
| `DISCORD_WEBHOOK_ID` | (optionnel) Discord ID | |
| `DISCORD_WEBHOOK_TOKEN` | (optionnel) Discord token | |

### Générer les secrets Strapi

```bash
openssl rand -base64 32  # Répéter pour chaque secret
```

### Configurer la clé SSH

```bash
# Générer une clé SSH dédiée (SANS passphrase)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Copier la clé publique sur le serveur
ssh-copy-id -i ~/.ssh/github_deploy_key.pub user@serveur

# Copier la clé PRIVÉE dans GitHub Secret DEPLOY_SSH_KEY
cat ~/.ssh/github_deploy_key
```

---

## 🌐 Configuration Caddy (reverse proxy)

Ajouter au Caddyfile du serveur :

```
cqapi.ada.briceledanois.fr {
    reverse_proxy localhost:1337
}
```

Caddy gère automatiquement HTTPS via Let's Encrypt.

---

## ✅ Vérification du déploiement

### Backend

```bash
# Health check
curl https://cqapi.ada.briceledanois.fr/_health

# API
curl https://cqapi.ada.briceledanois.fr/api

# Admin panel (navigateur)
https://cqapi.ada.briceledanois.fr/admin
```

### App Android

L'app se connecte automatiquement à `https://cqapi.ada.briceledanois.fr` grâce au fichier `frontend/.env.production`.

---

## 🐛 Troubleshooting

### Backend ne démarre pas

```bash
# Voir les logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend

# Vérifier que PostgreSQL est ready
docker compose -f docker-compose.prod.yml --env-file .env.production logs database
```

### CORS errors depuis l'app

Vérifier `backend/config/middlewares.ts` :
- `capacitor://localhost` (iOS)
- `http://localhost` (Android)

### Build Android échoue

```bash
# Clean Gradle
cd frontend/android
./gradlew clean

# Rebuild
./gradlew assembleRelease
```

---

## 📚 Ressources

- [Strapi v5 Docs](https://docs.strapi.io/dev-docs/intro)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Nuxt 4 Docs](https://nuxt.com/docs)
