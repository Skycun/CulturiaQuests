# Analyse d'Impact relative a la Protection des Donnees (AIPD)

## Contexte

L'article 35 du RGPD impose une AIPD lorsqu'un traitement est "susceptible d'engendrer un risque eleve pour les droits et libertes des personnes". La CNIL a publie une liste de traitements necessitant une AIPD.

## CulturiaQuests est-il concerne ?

### Criteres de la CNIL (2 criteres = AIPD obligatoire)

| Critere | CulturiaQuests | Concerne ? |
|---------|---------------|------------|
| Evaluation/scoring | Classements quiz, DPS | Potentiellement |
| Decision automatisee | Non | Non |
| Surveillance systematique | Geolocalisation temps reel | Potentiellement |
| Donnees sensibles | Non (pas de sante, religion, etc.) | Non |
| Grande echelle | Depend du nombre d'utilisateurs | A evaluer |
| Croisement de donnees | Non | Non |
| Personnes vulnerables | Mineurs potentiels (>= 15 ans) | Potentiellement |
| Usage innovant | Gamification + geolocalisation | Potentiellement |
| Exclusion d'un droit | Non | Non |

**Conclusion** : Avec la geolocalisation + le public potentiellement mineur + l'aspect innovant, 2 a 3 criteres peuvent etre remplis. **Une AIPD est recommandee**, meme si pas strictement obligatoire au stade academique.

## Contenu d'une AIPD

1. **Description du traitement** : finalites, donnees, destinataires, durees
2. **Evaluation de la necessite et de la proportionnalite** : le traitement est-il justifie ? les donnees sont-elles minimisees ?
3. **Evaluation des risques** pour les droits et libertes des personnes
4. **Mesures pour traiter les risques** : mesures de securite, garanties

## Outil CNIL

La CNIL met a disposition un logiciel gratuit pour realiser une AIPD :
https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil

## Points forts de CulturiaQuests (attenuants)

- La geolocalisation n'est pas stockee sur les serveurs (temps reel client uniquement)
- Pas de profilage ni de tracking publicitaire
- Pas de donnees sensibles au sens du RGPD (sante, opinions, etc.)
- Mesures de securite en place (HTTPS, bcrypt, isolation des donnees)
- Droit de suppression implemente et fonctionnel

## Checklist

- [ ] Evaluer le nombre d'utilisateurs prevu (petite echelle = risque reduit)
- [ ] Si > 1000 utilisateurs ou publication Play Store : realiser l'AIPD
- [ ] Telecharger l'outil PIA de la CNIL
- [ ] Documenter les 4 sections de l'AIPD
- [ ] Conserver le document (pas obligatoire de le publier, mais doit etre disponible pour la CNIL)
