# Audit Google Play Store - CulturiaQuests

## Checklist de publication

| # | Chantier | Statut | Bloquant ? | Fichier |
|---|----------|--------|------------|---------|
| 1 | Icones et assets visuels | A FAIRE | OUI | [01-icones-et-assets.md](./01-icones-et-assets.md) |
| 2 | Signing / Keystore | A FAIRE | OUI | [02-signing-keystore.md](./02-signing-keystore.md) |
| 3 | Store Listing (fiche) | A FAIRE | OUI | [03-store-listing.md](./03-store-listing.md) |
| 4 | Politique de confidentialite (URL) | A FAIRE | OUI | [04-politique-confidentialite.md](./04-politique-confidentialite.md) |
| 5 | Formulaire Data Safety | A FAIRE | OUI | [05-data-safety.md](./05-data-safety.md) |
| 6 | Optimisations techniques | RECOMMANDE | NON | [06-optimisations.md](./06-optimisations.md) |

## Ce qui est deja pret

- App ID : `fr.briceledanois.culturiaquests` (format reverse domain correct)
- Target SDK : 36 (depasse l'exigence minimale de 34)
- Permissions Android : 4 declarees, toutes justifiees (INTERNET, FINE/COARSE_LOCATION, NETWORK_STATE)
- HTTPS : configure (`androidScheme: 'https'`, `cleartext: false`)
- Pas d'achats in-app
- Suppression de compte : implementee (exigence Google Play depuis 2023)
- Contenu adapte : RPG educatif/culturel
- Adaptive icons : fichiers XML presents dans mipmap-anydpi-v26
- Structure Capacitor Android fonctionnelle

## Ordre recommande

1. Icones et assets (peut etre fait en parallele avec le reste)
2. Politique de confidentialite (prerequis pour la soumission)
3. Signing / Keystore
4. Store Listing
5. Data Safety (formulaire en ligne)
6. Optimisations (optionnel, peut etre fait apres la premiere publication)
