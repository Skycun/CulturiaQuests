# 5. Formulaire Data Safety (Google Play Console)

## Contexte

Depuis 2022, Google Play exige que chaque application remplisse un formulaire "Data Safety" detaillant les donnees collectees, leur usage, et les pratiques de securite. Ce formulaire est visible par les utilisateurs sur la fiche Play Store.

## Reponses a fournir

### Section 1 : Pratiques de collecte

| Question | Reponse |
|----------|---------|
| L'app collecte-t-elle des donnees ? | Oui |
| L'app partage-t-elle des donnees avec des tiers ? | Non (*) |
| L'app permet-elle la suppression des donnees ? | Oui (parametres > supprimer le compte) |

(*) Les tuiles OpenStreetMap/CartoDB et Google Fonts (si non locales) transmettent l'IP de l'utilisateur. Selon l'interpretation de Google, cela pourrait etre considere comme un "partage". Heberger les fonts localement simplifie cette declaration.

### Section 2 : Types de donnees collectees

| Categorie | Type | Collecte | Partage | Optionnel |
|-----------|------|----------|---------|-----------|
| **Infos personnelles** | Adresse email | Oui | Non | Non (inscription) |
| **Infos personnelles** | Nom d'utilisateur | Oui | Non | Non (inscription) |
| **Photos et videos** | Avatar | Oui | Non | Oui |
| **Localisation** | Localisation precise (GPS) | Oui | Non | Oui (on peut utiliser la position par defaut) |
| **Activite dans l'app** | Interactions dans l'app (progression, quetes, expeditions) | Oui | Non | Non |
| **Activite dans l'app** | Historique de recherche | Non | - | - |
| **Identifiants** | Identifiant utilisateur | Oui | Non | Non |
| **Infos financieres** | - | Non | - | - |
| **Sante et forme** | - | Non | - | - |
| **Messages** | - | Non | - | - |
| **Contacts** | - | Non | - | - |

### Section 3 : Finalites

Pour chaque type de donnee collectee :

| Donnee | Finalites |
|--------|----------|
| Email | Gestion du compte, authentification |
| Nom d'utilisateur | Fonctionnalite de l'app (affichage social, amities) |
| Avatar | Personnalisation |
| Localisation | Fonctionnalite principale de l'app (gameplay geolocalise) |
| Activite dans l'app | Fonctionnalite de l'app (progression de jeu) |
| Identifiant utilisateur | Gestion du compte |

### Section 4 : Securite

| Question | Reponse |
|----------|---------|
| Les donnees sont-elles chiffrees en transit ? | Oui (HTTPS) |
| L'utilisateur peut-il demander la suppression ? | Oui |

## Processus

1. Aller dans la [Google Play Console](https://play.google.com/console)
2. Selectionner l'application
3. Aller dans **App content** > **Data safety**
4. Remplir le formulaire avec les informations ci-dessus
5. Le formulaire est revu par Google et affiche sur la fiche

## Conseils

- Etre honnete et precis : Google peut verifier et sanctionner les declarations fausses
- En cas de doute sur une categorie, inclure plutot que d'omettre
- Mettre a jour le formulaire a chaque nouvelle version qui modifie la collecte de donnees
