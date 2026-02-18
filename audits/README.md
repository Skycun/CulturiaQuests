# Audits CulturiaQuests

Resultats des audits de conformite realises le 18 fevrier 2026.

## Structure

```
audits/
├── README.md              ← Ce fichier
├── playStore/             ← Criteres de publication Google Play Store (6 fiches)
│   ├── README.md
│   ├── 01-icones-et-assets.md
│   ├── 02-signing-keystore.md
│   ├── 03-store-listing.md
│   ├── 04-politique-confidentialite.md
│   ├── 05-data-safety.md
│   └── 06-optimisations.md
├── technique/             ← Taches techniques restantes - code (9 fiches)
│   ├── README.md
│   ├── 01-acceptation-cgu-bdd.md
│   ├── 02-verification-age.md
│   ├── 03-bandeau-cookies.md
│   ├── 04-export-donnees.md
│   ├── 05-rate-limiting.md
│   ├── 06-cron-nettoyage-logs.md
│   ├── 07-liens-footer-landing.md
│   ├── 08-versionnement-cgu.md
│   └── 09-champ-age-fantome.md
└── juridique/             ← Taches juridiques/administratives (6 fiches)
    ├── README.md
    ├── 01-informations-editeur.md
    ├── 02-url-politique-confidentialite.md
    ├── 03-dpo.md
    ├── 04-registre-traitements.md
    ├── 05-mediateur-consommation.md
    └── 06-aipd.md
```

## Ce qui a deja ete fait

| Tache | Statut |
|-------|--------|
| Heberger Google Fonts localement | FAIT |
| Corriger incoherence CGU geolocalisation arriere-plan | FAIT |
| Completer la liste des donnees collectees dans les CGU | FAIT |
| Supprimer les donnees orphelines (gdpr-request, admin-action-log) a la suppression de compte | FAIT |
| Creer la page /mentions-legales | FAIT |
| Creer la page /politique-confidentialite | FAIT |
| Ajouter les nouvelles pages aux routes publiques (middleware) | FAIT |
| Fix SSR zone store (guard import.meta.server) | FAIT |
| Fix attribut class duplique dans badges.vue | FAIT |

## Priorites restantes

### Bloquant (avant publication Play Store)
1. `juridique/01` — Remplir les informations editeur
2. `juridique/02` — Heberger la politique de confidentialite sur URL publique
3. `playStore/01` — Remplacer les icones/splash par defaut
4. `playStore/02` — Configurer le keystore de signing
5. `playStore/03` — Preparer le store listing

### Critique (conformite legale)
6. `technique/01` — Stocker l'acceptation des CGU en BDD
7. `technique/02` — Verification d'age a l'inscription
8. `technique/03` — Bandeau de consentement cookies

### Important
9. `technique/04` — Export automatique des donnees
10. `technique/05` — Rate limiting auth
11. `technique/06` — Cron nettoyage logs
12. `juridique/03` — DPO
13. `juridique/04` — Registre des traitements
