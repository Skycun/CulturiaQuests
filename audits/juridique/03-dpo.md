# Designer un DPO / Contact donnees personnelles

## Contexte

Le RGPD (article 37) impose la designation d'un Delegue a la Protection des Donnees (DPO) dans certains cas :
- Traitement a grande echelle de donnees sensibles
- Suivi systematique a grande echelle de personnes

CulturiaQuests collecte des donnees de geolocalisation, ce qui peut etre considere comme un suivi systematique si l'application atteint une echelle significative.

## Ce qu'il faut faire

### Cas 1 : Petite echelle (projet academique, < 1000 utilisateurs)

La designation d'un DPO n'est probablement pas obligatoire. Cependant, il est **fortement recommande** de designer un point de contact pour les questions relatives aux donnees personnelles.

**Action** : Choisir une personne (probablement le president de la SASU) comme contact donnees personnelles et renseigner son email dans les pages legales.

### Cas 2 : Grande echelle (> 1000 utilisateurs, utilisation commerciale)

La designation d'un DPO devient fortement recommandee, voire obligatoire.

**Options** :
- DPO interne : un membre de l'equipe forme a la protection des donnees
- DPO externe : un prestataire specialise (cabinet d'avocats, societe de conseil RGPD)

### Declaration a la CNIL

Si un DPO est designe, il faut le declarer aupres de la CNIL via le formulaire en ligne :
https://www.cnil.fr/fr/designation-dpo

## Checklist

- [ ] Evaluer si la designation d'un DPO est obligatoire (en fonction de l'echelle)
- [ ] Designer un contact donnees personnelles (au minimum)
- [ ] Creer une adresse email dediee (ex: dpo@culturiaquests.fr ou donnees@culturiaquests.fr)
- [ ] Renseigner cet email dans les pages legales de l'application
- [ ] Si DPO designe : le declarer aupres de la CNIL
