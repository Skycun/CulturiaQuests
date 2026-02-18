# Mediateur de la consommation

## Obligation

Depuis le 1er janvier 2016 (ordonnance n°2015-1033), tout professionnel doit proposer a ses clients un dispositif de mediation de la consommation. Cette obligation s'applique meme si le service est gratuit, des lors qu'il existe une relation "professionnel-consommateur".

## Ce qu'il faut faire

### 1. Adherer a un dispositif de mediation

Choisir un mediateur de la consommation parmi les mediateurs agrees par la CECMC (Commission d'Evaluation et de Controle de la Mediation de la Consommation).

**Options courantes** :
- **FEVAD** (Federation du e-commerce) : pour les services en ligne
  - Site : https://www.fevad.com
  - Mediateur : Mediateur du e-commerce de la FEVAD
- **CM2C** (Centre de la Mediation de la Consommation de Conciliateurs de Justice)
  - Site : https://www.cm2c.net
- **CNPM** (Centre National des Professions du Multimedia)
  - Pour les entreprises du numerique

**Cout** : Variable selon le mediateur (souvent quelques centaines d'euros par an pour les petites structures).

### 2. Mentionner le mediateur dans les CGU

Ajouter dans `frontend/app/pages/CGU.vue`, section 10 (Droit applicable), un paragraphe :

```
Conformement aux articles L.611-1 et R.612-1 et suivants du Code de la consommation,
nous proposons un dispositif de mediation de la consommation. Le mediateur designe est :

[Nom du mediateur]
[Adresse]
[Site web]

Avant de saisir le mediateur, le consommateur doit avoir prealablement tente de resoudre
son litige directement aupres du professionnel par une reclamation ecrite.
```

### 3. Mentionner dans les mentions legales

Ajouter la meme information dans `frontend/app/pages/mentions-legales.vue`.

## Note

Si CulturiaQuests est considere comme un projet purement academique et non commercial (pas de revenus, pas de vente), l'obligation pourrait ne pas s'appliquer. Cependant, le statut SASU et l'eventuelle publication sur le Play Store suggerent une activite professionnelle.

## Checklist

- [ ] Evaluer si l'obligation s'applique (activite commerciale ?)
- [ ] Si oui, choisir et adherer a un mediateur agree
- [ ] Ajouter les coordonnees du mediateur dans les CGU et les mentions legales
