# Plan d'implémentation Backend - Social & Badges

## Analyse et Raisonnement

Suite à vos retours, voici la structure mise à jour :

1.  **Architecture des Données** :
    *   **Badges** : Ils seront rattachés au **Guild** (le profil de jeu du joueur) et non directement à l'utilisateur d'authentification. Cela est cohérent avec le fait que `Guild` stocke déjà l'or, l'expérience et les objets.
    *   **Amis** : La relation d'amitié restera entre **Users** pour gérer le graph social.
    *   **Posts** : Lieront un `User` (auteur) à un `Run` (expédition).

2.  **Flux Social** :
    *   Le système filtrera les posts en se basant sur la liste d'amis de l'utilisateur connecté.

## Plan d'Action

### Étape 1 : Création et Modification des Content-Types

#### 1.1 Création du Content-Type `Badge`
*   **Nom** : `badge`
*   **Attributs** :
    *   `name` (String, requis)
    *   `description` (Text)
    *   `image` (Media, requis)
    *   `category` (String) - ex: "Com-Com", "Région".
    *   `guilds_unlocked` (Relation Many-to-Many vers `Guild`) : Inverse de `unlocked_badges`.
    *   `guilds_equipped` (Relation Many-to-Many vers `Guild`) : Inverse de `equipped_badges`.

#### 1.2 Création du Content-Type `Post`
*   **Nom** : `post`
*   **Attributs** :
    *   `author` (Relation Many-to-One vers `User`) : L'auteur du post.
    *   `run` (Relation Many-to-One vers `Run`) : L'expédition partagée.
    *   `likes` (Relation Many-to-Many vers `User`) : Les utilisateurs qui ont aimé.
    *   `reaction_icon` (String) : L'emoji choisi.
    *   `reaction_text` (String) : Le texte de réaction.
    *   `selected_stats` (JSON) : Liste des stats affichées.

#### 1.3 Modification du Content-Type `Guild` (Profil Joueur)
*   Ajout de la relation **`unlocked_badges`** :
    *   Type : Many-to-Many vers `api::badge.badge`.
*   Ajout de la relation **`equipped_badges`** :
    *   Type : Many-to-Many vers `api::badge.badge`.

#### 1.4 Extension du Plugin `users-permissions` (Modèle `User`)
*   Ajout de la relation **`friends`** :
    *   Type : Many-to-Many (Self-referencing).
    *   Target : `plugin::users-permissions.user`.

### Étape 2 : Implémentation de la Logique Métier (Contrôleurs)

#### 2.1 Contrôleur `Post` (Social)
*   **`create`** : Associer le post à l'utilisateur connecté (`ctx.state.user`).
*   **`find` (Feed)** :
    *   **Algorithme de récupération (30 items max)** :
        1.  Récupérer la liste des amis.
        2.  **Priorité** : Sélectionner le post le plus récent de *chaque* ami (datant de moins d'une semaine).
        3.  **Remplissage** : Compléter la liste jusqu'à 30 posts avec les autres publications les plus récentes des amis.
        4.  Trier le tout par date décroissante.
    *   **Enrichissement** : Ajouter `likes` (count), `hasLiked` (boolean), et les infos `author`/`run`.
*   **`like/unlike`** : Endpoint toggle simple.

#### 2.2 Contrôleur `Badge`
*   **`find`** :
    *   Récupérer la `Guild` associée au `User` connecté.
    *   Lister tous les badges.
    *   Marquer `unlocked: true` si le badge est dans `guild.unlocked_badges`.
    *   Marquer `equipped: true` si le badge est dans `guild.equipped_badges`.
*   **`equip`** :
    *   Endpoint : `PUT /api/guild/badges/equip`.
    *   Récupérer la `Guild` du user.
    *   Vérifier que les badges demandés sont bien dans `guild.unlocked_badges`.
    *   Vérifier la limite de 4 badges max.
    *   Mettre à jour `guild.equipped_badges`.

### Étape 3 : Routes API
*   Création des fichiers de routes pour exposer ces nouvelles logiques.
