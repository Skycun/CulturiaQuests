# Registre des traitements (article 30 RGPD)

## Obligation

L'article 30 du RGPD impose a tout responsable de traitement de tenir un registre des activites de traitement. Ce registre doit etre mis a disposition de la CNIL sur demande.

## Modele de registre pour CulturiaQuests

Creer un document (tableur ou PDF) contenant les informations suivantes pour chaque traitement :

### Traitement 1 : Gestion des comptes utilisateurs

| Champ | Valeur |
|-------|--------|
| **Finalite** | Creation et gestion des comptes utilisateurs |
| **Base legale** | Execution du contrat (CGU) |
| **Categories de personnes** | Utilisateurs de l'application (>= 15 ans) |
| **Categories de donnees** | Email, nom d'utilisateur, mot de passe (hashe), avatar |
| **Destinataires** | Hebergeur [nom] |
| **Transferts hors UE** | Non |
| **Duree de conservation** | Duree d'activite du compte + 30 jours |
| **Mesures de securite** | HTTPS, bcrypt, JWT, isolation des donnees |

### Traitement 2 : Geolocalisation

| Champ | Valeur |
|-------|--------|
| **Finalite** | Fonctionnement du jeu (carte, POI, musees, brouillard de guerre) |
| **Base legale** | Consentement |
| **Categories de personnes** | Utilisateurs ayant active la geolocalisation |
| **Categories de donnees** | Position GPS (temps reel, non stockee) |
| **Destinataires** | Aucun (traitement cote client uniquement) |
| **Transferts hors UE** | Non (IP exposee a OpenStreetMap/CartoDB via tuiles) |
| **Duree de conservation** | Aucune (temps reel uniquement) |
| **Mesures de securite** | Consentement explicite, pas de stockage serveur |

### Traitement 3 : Donnees de jeu

| Champ | Valeur |
|-------|--------|
| **Finalite** | Fonctionnement du jeu (progression, inventaire, quetes, expeditions, quiz) |
| **Base legale** | Execution du contrat (CGU) |
| **Categories de personnes** | Tous les utilisateurs |
| **Categories de donnees** | Progression, inventaire, scores quiz, expeditions, quetes, badges, amities |
| **Destinataires** | Hebergeur [nom] |
| **Transferts hors UE** | Non |
| **Duree de conservation** | Duree d'activite du compte + 30 jours |
| **Mesures de securite** | HTTPS, isolation des donnees par guild |

### Traitement 4 : Logs de connexion

| Champ | Valeur |
|-------|--------|
| **Finalite** | Securite, statistiques internes |
| **Base legale** | Interet legitime |
| **Categories de personnes** | Tous les utilisateurs |
| **Categories de donnees** | Date et heure de connexion |
| **Destinataires** | Hebergeur [nom], administrateurs |
| **Transferts hors UE** | Non |
| **Duree de conservation** | 6 mois |
| **Mesures de securite** | Acces restreint aux administrateurs |

### Traitement 5 : Generation de quiz (IA)

| Champ | Valeur |
|-------|--------|
| **Finalite** | Generation de questions de quiz culturel |
| **Base legale** | Interet legitime |
| **Categories de personnes** | Aucune (pas de donnees personnelles) |
| **Categories de donnees** | Aucune donnee personnelle transmise |
| **Destinataires** | OpenAI (prompts de generation uniquement) |
| **Transferts hors UE** | Oui (serveurs OpenAI aux USA) - mais aucune donnee personnelle |
| **Duree de conservation** | N/A |
| **Mesures de securite** | Cle API securisee, pas de donnees personnelles dans les prompts |

## Format

La CNIL propose un modele de registre telechargeable :
https://www.cnil.fr/fr/RGDP-le-registre-des-activites-de-traitement

## Checklist

- [ ] Telecharger le modele CNIL
- [ ] Remplir les 5 traitements ci-dessus avec les vraies informations
- [ ] Conserver le registre dans un endroit accessible (pas dans le repo public)
- [ ] Mettre a jour le registre a chaque nouveau traitement
