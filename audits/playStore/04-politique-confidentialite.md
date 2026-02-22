# 4. Politique de Confidentialite (URL publique)

## Probleme actuel

Google Play exige une **URL de politique de confidentialite accessible publiquement via un navigateur web** pour toute application qui :
- Collecte des donnees personnelles (email, pseudo)
- Utilise la geolocalisation
- Demande des permissions sensibles (ACCESS_FINE_LOCATION)

Actuellement, la politique de confidentialite est integree dans la page CGU de l'app (`/CGU`, section 5), qui n'est pas accessible via une URL web publique.

## Ce qu'il faut faire

### Option A : Page sur le site/API de production (recommandee)

Heberger une page a une URL comme :
```
https://cqapi.ada.briceledanois.fr/privacy-policy
```

Cela peut etre fait via :
- Une page statique servie par le reverse proxy (Nginx)
- Un endpoint custom dans Strapi qui retourne du HTML
- Une page sur un sous-domaine dedie

### Option B : Page GitHub Pages

Si le repo est public ou si tu as GitHub Pages active :
```
https://skycun.github.io/CulturiaQuests/privacy-policy
```

### Option C : Page tierce

Utiliser un service comme [Termly](https://termly.io), [PrivacyPolicies.com](https://www.privacypolicies.com/), ou une simple page Google Sites.

## Contenu requis

La politique de confidentialite doit couvrir :

1. **Identite du responsable de traitement** (nom, adresse, SIRET, email)
2. **Donnees collectees** :
   - Email (inscription)
   - Nom d'utilisateur / pseudonyme
   - Geolocalisation GPS (temps reel, pas de stockage permanent)
   - Avatar (optionnel)
   - Donnees de jeu (progression, inventaire, scores quiz, expeditions)
   - Logs de connexion (date/heure de chaque connexion)
   - Adresse IP (lors des demandes RGPD uniquement)
3. **Finalite du traitement** : fonctionnement du jeu, authentification, analytics internes
4. **Base legale** : execution du contrat (jeu) + consentement (geolocalisation)
5. **Duree de conservation** :
   - Donnees de compte : pendant la duree d'activite + 30 jours apres suppression
   - Logs de connexion : a definir (recommande 6 mois max)
6. **Destinataires / Sous-traitants** :
   - Hebergeur : [nom et pays]
   - OpenStreetMap / CartoDB (tuiles cartographiques, IP exposee)
   - Google Fonts (si non hebergees localement, IP exposee)
   - Ollama (generation de quiz en local, aucune donnee transmise a un tiers)
7. **Transferts hors UE** : mentionner les services US le cas echeant
8. **Droits des utilisateurs** : acces, rectification, effacement, portabilite, opposition, limitation
9. **Comment exercer ses droits** : email de contact, bouton "Demander mes donnees" dans l'app
10. **Cookies et stockage local** :
    - Cookie `culturia_jwt` (authentification, 14 jours, strictement necessaire)
    - localStorage (persistance des donnees de jeu cote client)
11. **Securite** : HTTPS, mots de passe hashes (bcrypt), JWT securise
12. **Contact CNIL** : www.cnil.fr

## URL a renseigner

Une fois la page en ligne, renseigner l'URL dans :
1. **Google Play Console** > Store listing > Privacy policy URL
2. **Les CGU de l'app** (ajouter un lien vers la politique)
3. **Les parametres utilisateur** de l'app
