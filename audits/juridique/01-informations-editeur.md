# Remplir les informations editeur

## Obligation legale

L'article 6 de la LCEN (Loi pour la Confiance dans l'Economie Numerique) impose a tout editeur de service en ligne de rendre accessibles les informations suivantes.

## Informations a fournir

Remplir les placeholders `[A completer]` dans les fichiers suivants :

### 1. CGU (`frontend/app/pages/CGU.vue`)

Lignes 27-30, section "Editeur de l'application" :
- Adresse du siege social
- Numero SIRET
- Email de contact

Ligne 127, section "Droits des utilisateurs" :
- Email de contact pour exercer les droits RGPD

### 2. Mentions legales (`frontend/app/pages/mentions-legales.vue`)

Section 1 "Editeur" :
- Capital social
- Siege social
- SIRET
- RCS
- Numero de TVA intracommunautaire
- Telephone
- Email

Section 2 "Directeur de la publication" :
- Nom et prenom du president

Section 3 "Hebergeur" :
- Raison sociale de l'hebergeur
- Adresse
- Telephone
- Site web

Section 7 "Contact" :
- Email de contact

### 3. Politique de confidentialite (`frontend/app/pages/politique-confidentialite.vue`)

Section 1 "Responsable du traitement" :
- Adresse
- SIRET
- Email du DPO / contact donnees personnelles

Section 5 "Destinataires" :
- Nom de l'hebergeur

Section 10 "Contact" :
- Email de contact

## Checklist

- [ ] Obtenir le numero SIRET aupres du greffe ou via infogreffe.fr
- [ ] Obtenir le numero RCS
- [ ] Obtenir le numero de TVA intracommunautaire (si applicable)
- [ ] Definir l'email de contact public
- [ ] Definir l'email du DPO / responsable donnees (peut etre le meme)
- [ ] Identifier l'hebergeur et ses coordonnees
- [ ] Remplir les 3 fichiers ci-dessus
