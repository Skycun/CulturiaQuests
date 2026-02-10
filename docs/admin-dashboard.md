# Dashboard Admin - CulturiaQuests

## Vue d'ensemble

Le dashboard admin permet aux utilisateurs avec le role **Admin** de suivre l'evolution de l'application CulturiaQuests via une interface web dediee, accessible sur desktop et mobile.

**URL d'acces** : `http://localhost:3000/dashboard`

---

## Architecture

### Nouveau role : Admin

Un troisieme role utilisateur a ete ajoute au systeme users-permissions de Strapi, en plus des roles existants :

| Role | Type | Description |
|------|------|-------------|
| Public | `public` | Utilisateurs non connectes |
| Authenticated | `authenticated` | Joueurs connectes |
| **Admin** | `admin` | Administrateurs avec acces au dashboard |

Le role Admin est cree automatiquement au demarrage de Strapi via le bootstrap (`backend/src/index.ts`). Il herite de toutes les permissions du role Authenticated (un admin peut aussi jouer) et dispose en plus des permissions d'acces aux endpoints du dashboard.

### Protection des routes

- **Backend** : Les endpoints `/api/admin-dashboard/*` sont proteges par le systeme de permissions Strapi. Seul le role Admin y a acces.
- **Frontend** : Un middleware `admin.ts` verifie le role de l'utilisateur via un appel a `/api/admin-dashboard/check` (endpoint protege par permission) et redirige vers `/` si l'utilisateur n'est pas admin.
- **Desktop** : Les routes `/dashboard/*` sont exemptees de la restriction mobile-only, permettant l'administration depuis un ordinateur.

---

## Pages implementees

### 1. Vue d'ensemble (`/dashboard`)

Page d'accueil du dashboard avec les KPIs principaux.

**Donnees affichees :**

- **KPIs principaux** (cartes en haut)
  - Nombre total d'utilisateurs (+nouveaux cette semaine)
  - Nombre total de guildes (+nouvelles cette semaine)
  - Nombre total de personnages
  - Nombre total d'items

- **Activite recente** (tableau)
  - Expeditions lancees : 24h / 7j / 30j
  - Coffres ouverts : 24h / 7j / 30j
  - Quiz joues : 24h / 7j / 30j

- **Economie**
  - Or total en circulation
  - XP totale en circulation
  - Repartition des items par rarete (basic, common, rare, epic, legendary) avec barres de progression

- **KPIs secondaires**
  - Expeditions totales, visites totales, quetes totales, quiz joues

### 2. Liste des joueurs (`/dashboard/players`)

Tableau pagine de tous les utilisateurs avec :

- **Recherche** par nom d'utilisateur ou email (avec debounce)
- **Tri** par date d'inscription, nom ou email (asc/desc)
- **Colonnes** : joueur, guilde, niveau, or, personnages, items, role, statut, date d'inscription
- **Actions rapides** : bloquer/debloquer un joueur
- **Pagination** avec navigation page par page

### 3. Detail d'un joueur (`/dashboard/players/:id`)

Fiche detaillee d'un joueur avec :

- **Informations compte** : nom, email, role, statut
- **Actions** : bloquer/debloquer, promouvoir/revoquer admin
- **Guilde** : nom, niveau, or, XP, scrap, mode debug
- **Personnages** : liste avec icones
- **Statistiques** : expeditions, etage max, coffres ouverts, POI visites, items collectes/recycles, or total, jours actif
- **Activite recente** :
  - 10 dernieres expeditions (musee, or gagne, etage atteint)
  - 10 dernieres visites de POI (nom, nombre d'ouvertures, or)
  - 10 derniers quiz (score, temps, date)

---

## API Endpoints

Tous les endpoints sont sous le prefixe `/api/admin-dashboard/` et necessitent le role Admin.

| Methode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/admin-dashboard/check` | Verification du role admin (200 = admin, 403 = non) |
| `GET` | `/admin-dashboard/overview` | KPIs globaux du dashboard |
| `GET` | `/admin-dashboard/players` | Liste paginee des joueurs |
| `GET` | `/admin-dashboard/players/:id` | Detail d'un joueur |
| `PUT` | `/admin-dashboard/players/:id/toggle-block` | Bloquer/debloquer un joueur |
| `PUT` | `/admin-dashboard/players/:id/role` | Changer le role d'un joueur |
| `GET` | `/admin-dashboard/map` | Donnees carte (POIs et musees avec stats) |
| `GET` | `/admin-dashboard/economy` | Economie du jeu (or, XP, items, niveaux) |
| `GET` | `/admin-dashboard/expeditions` | Expeditions & quetes (musees, PNJs) |
| `GET` | `/admin-dashboard/quiz` | Analytique quiz (sessions, scores, leaderboard) |
| `GET` | `/admin-dashboard/social` | Stats sociales (amities, progression PNJ) |

### Parametres de la liste des joueurs

| Parametre | Type | Defaut | Description |
|-----------|------|--------|-------------|
| `page` | number | 1 | Numero de page |
| `pageSize` | number | 25 | Elements par page (max 100) |
| `search` | string | "" | Recherche par nom/email |
| `sortBy` | string | "createdAt" | Champ de tri |
| `sortOrder` | string | "desc" | Ordre de tri (asc/desc) |

### Reponse de l'overview

```json
{
  "totals": {
    "users": 150,
    "guilds": 120,
    "characters": 340,
    "items": 5600,
    "runs": 890,
    "visits": 2300,
    "quests": 450,
    "quizAttempts": 1200
  },
  "recent": {
    "newUsers7d": 12,
    "newGuilds7d": 8
  },
  "activity": {
    "expeditions": { "last24h": 15, "last7d": 89, "last30d": 340 },
    "chestOpened": { "last24h": 45, "last7d": 230, "last30d": 890 },
    "quizAttempts": { "last24h": 30, "last7d": 150, "last30d": 600 }
  },
  "economy": {
    "totalGoldInCirculation": 125000,
    "totalExpInCirculation": 890000,
    "itemsByRarity": {
      "basic": 2500,
      "common": 1800,
      "rare": 800,
      "epic": 350,
      "legendary": 150
    }
  }
}
```

---

## Fichiers ajoutes/modifies

### Backend

| Fichier | Type | Description |
|---------|------|-------------|
| `backend/src/index.ts` | Modifie | Ajout creation role Admin + permissions dashboard |
| `backend/src/api/admin-dashboard/controllers/admin-dashboard.ts` | Nouveau | Controller avec 11 endpoints |
| `backend/src/api/admin-dashboard/services/admin-dashboard.ts` | Nouveau | Service d'agregation des donnees (10 methodes) |
| `backend/src/api/admin-dashboard/routes/admin-dashboard.ts` | Nouveau | Definition des 11 routes API |

### Frontend

| Fichier | Type | Description |
|---------|------|-------------|
| `frontend/app/middleware/00-device-check.global.ts` | Modifie | Exemption desktop pour routes `/dashboard` |
| `frontend/app/middleware/admin.ts` | Nouveau | Middleware de verification du role admin |
| `frontend/app/composables/useAdmin.ts` | Nouveau | Composable de verification admin |
| `frontend/app/stores/admin.ts` | Nouveau | Store Pinia pour les donnees admin |
| `frontend/app/layouts/dashboard.vue` | Nouveau | Layout avec sidebar de navigation |
| `frontend/app/pages/dashboard/index.vue` | Nouveau | Page d'accueil du dashboard |
| `frontend/app/pages/dashboard/players/index.vue` | Nouveau | Liste des joueurs |
| `frontend/app/pages/dashboard/players/[id].vue` | Nouveau | Detail d'un joueur |
| `frontend/app/pages/dashboard/map.vue` | Nouveau | Carte & geolocalisation |
| `frontend/app/pages/dashboard/economy.vue` | Nouveau | Economie du jeu |
| `frontend/app/pages/dashboard/expeditions.vue` | Nouveau | Expeditions & quetes |
| `frontend/app/pages/dashboard/quiz.vue` | Nouveau | Analytique quiz |
| `frontend/app/pages/dashboard/social.vue` | Nouveau | Stats sociales |
| `frontend/app/components/dashboard/KpiCard.vue` | Nouveau | Composant carte KPI |
| `frontend/app/components/dashboard/StatBlock.vue` | Nouveau | Composant bloc statistique |

---

## Comment promouvoir un utilisateur en Admin

### Option 1 : Via le dashboard (si un admin existe deja)

1. Se connecter avec un compte admin
2. Aller sur `/dashboard/players`
3. Cliquer sur le joueur a promouvoir
4. Cliquer sur "Promouvoir admin"

### Option 2 : Via Strapi Admin Panel

1. Aller sur `http://localhost:1337/admin`
2. Se connecter avec le compte super-admin Strapi
3. Aller dans Settings > Users & Permissions > Roles
4. Le role "Admin" devrait etre visible
5. Aller dans Content Manager > User
6. Modifier le role de l'utilisateur souhaite vers "Admin"

### Option 3 : Via la console Strapi

```bash
cd backend
npm run console
```

```javascript
// Trouver le role admin
const adminRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'admin' } });

// Mettre a jour l'utilisateur (remplacer par le bon username)
await strapi.db.query('plugin::users-permissions.user').update({
  where: { username: 'mon_username' },
  data: { role: adminRole.id }
});
```

### 4. Carte & Geolocalisation (`/dashboard/map`)

Vue des POIs et musees avec leurs statistiques de frequentation.

**Donnees affichees :**

- **Points d'Interet** (tableau)
  - Nom, coordonnees (lat/lng)
  - Nombre total de visites et visiteurs uniques
  - Or total distribue
  - Nombre de quetes associees

- **Musees** (tableau)
  - Nom, coordonnees, rayon, tags
  - Nombre total d'expeditions
  - Or total distribue
  - Etage maximum atteint
  - Duree moyenne des expeditions

### 5. Economie (`/dashboard/economy`)

Analyse detaillee de l'economie du jeu.

**Donnees affichees :**

- **Sources d'or** : expeditions, coffres, quetes, quiz (avec barres de repartition)
- **Sources d'XP** : expeditions, coffres, quetes, quiz (avec barres de repartition)
- **Economie des items** : total, actifs, recycles, repartition par slot (arme, casque, charme)
- **Distribution des niveaux** : tranches 1-5, 6-10, 11-20, 21-50, 51+
- **Scrap total** en circulation

### 6. Expeditions & Quetes (`/dashboard/expeditions`)

Statistiques detaillees des expeditions et quetes.

**Donnees affichees :**

- **Statistiques par musee** (tableau)
  - Nom, nombre d'expeditions, completees
  - Or total distribue, etage max, DPS moyen, duree moyenne

- **Quetes**
  - Total, completees, partielles, en attente
  - Taux de completion

- **Classement des PNJs** (2 tableaux)
  - Par quetes : nom, nombre de quetes, completees
  - Par expeditions : nom, surnom, nombre d'expeditions

### 7. Quiz (`/dashboard/quiz`)

Analytique complete des quiz quotidiens.

**Donnees affichees :**

- **KPIs** : total tentatives, score moyen, nombre de sessions
- **Sessions recentes** (tableau des 30 dernieres)
  - Date, statut de generation, nombre de participants, score moyen, temps moyen

- **Distribution des scores** : 0-500, 501-1000, 1001-1500, 1501-2000, 2001-2500

- **Questions par tag** : nombre de questions par categorie (Histoire, Art, etc.)
- **Types de questions** : QCM vs Timeline

- **Leaderboard global** (top 20)
  - Guilde, score, date de session, temps passe

### 8. Social (`/dashboard/social`)

Vue des interactions sociales entre joueurs et avec les PNJs.

**Donnees affichees :**

- **Amities entre joueurs**
  - Total, en attente, acceptees, rejetees
  - Taux d'acceptation

- **Progression PNJ** (tableau)
  - Nom, surnom, nombre d'amities
  - Progression moyenne des quetes et expeditions (%)

- **Joueurs les plus connectes** (top 10)
  - Nom de guilde et nombre de connexions

---

## Evolutions futures prevues

Le dashboard est concu pour etre etendu. Voici les pages et fonctionnalites envisagees :

### Configuration
- Reglage des constantes de gameplay
- Parametres de recompenses et drop rates

### Monitoring
- Logs d'API et temps de reponse
- Sante des services Docker
- Journal d'audit des actions admin
