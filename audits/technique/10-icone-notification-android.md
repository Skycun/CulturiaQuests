# Icone de notification Android (monochromatique)

## Probleme

Le systeme de notifications locales (quiz quotidien + geolocalisation active) utilise un fichier placeholder `ic_stat_notify.png` (cercle blanc basique). Android impose que les petites icones de notification soient **monochromatiques blanches sur fond transparent**. Une icone coloree classique apparait comme un carre gris/blanc plein dans la barre de statut.

## Contraintes Android

- **Couleurs** : uniquement des pixels blancs (`#FFFFFF`) + transparence (canal alpha). Pas de couleurs, pas de degradres.
- Android applique automatiquement la teinte configuree (`#4F46E5` indigo) sur les pixels blancs.
- **Tailles requises** (density buckets) :
  - `drawable-mdpi/` : 24x24 px
  - `drawable-hdpi/` : 36x36 px
  - `drawable-xhdpi/` : 48x48 px
  - `drawable-xxhdpi/` : 72x72 px
- Format PNG avec canal alpha

## Fichiers concernes

- `frontend/android/app/src/main/res/drawable/ic_stat_notify.png` — fichier placeholder actuel (24x24, cercle blanc)
- Optionnel : creer les variantes dans `drawable-hdpi/`, `drawable-xhdpi/`, `drawable-xxhdpi/` pour un rendu net sur tous les ecrans
- `frontend/capacitor.config.ts` — reference le nom `ic_stat_notify` dans la config `LocalNotifications`

## Implementation

### 1. Designer l'icone

Creer une silhouette simple representant l'application (boussole, lettre "C" stylisee, ou logo simplifie) en blanc sur fond transparent.

Outils possibles :
- **Figma / Illustrator** : dessiner la forme en blanc, exporter en PNG transparent
- **Android Asset Studio** (romannurik.github.io/AndroidAssetStudio) : generateur en ligne de Google, section "Notification icon generator"
- **Image Magick** : convertir un logo existant en silhouette monochrome

### 2. Exporter aux bonnes tailles

Generer les 4 variantes (mdpi 24px, hdpi 36px, xhdpi 48px, xxhdpi 72px).

### 3. Placer les fichiers

```
frontend/android/app/src/main/res/
├── drawable/ic_stat_notify.png          (24x24 — remplacer le placeholder)
├── drawable-hdpi/ic_stat_notify.png     (36x36 — creer le dossier si besoin)
├── drawable-xhdpi/ic_stat_notify.png    (48x48 — creer le dossier si besoin)
└── drawable-xxhdpi/ic_stat_notify.png   (72x72 — creer le dossier si besoin)
```

### 4. Verifier

- Builder l'app Android (`npx cap sync android` + build Android Studio)
- Declencher une notification (ouvrir la carte pour la notif geo)
- Verifier que l'icone s'affiche correctement dans la barre de statut (petite, nette, teintee en indigo)
- Verifier dans le tiroir de notifications (icone plus grande, bien reconnaissable)

## Verification

- L'icone est visible et reconnaissable dans la barre de statut Android
- L'icone n'apparait pas comme un carre blanc/gris plein
- L'icone s'affiche correctement sur differentes densites d'ecran
- La teinte indigo (`#4F46E5`) est appliquee par Android
