# 1. Icones et Assets Visuels

## Probleme actuel

L'application utilise les assets par defaut de Capacitor :
- **Icone** : le "X" bleu sur fond blanc avec motif grille
- **Splash screen** : logo Capacitor par defaut
- **Foreground adaptive icon** : robot Android par defaut (`ic_launcher_foreground.xml` dans `drawable-v24`)

Google Play peut rejeter l'application pour utilisation d'assets generiques.

## Ce qu'il faut faire

### 1.1 Icone de l'application (512x512)

Creer une icone personnalisee CulturiaQuests au format **512x512 PNG 32 bits**.

Generer ensuite toutes les variantes mipmap avec [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) ou Android Studio :

| Dossier | Taille |
|---------|--------|
| `mipmap-mdpi/` | 48x48 |
| `mipmap-hdpi/` | 72x72 |
| `mipmap-xhdpi/` | 96x96 |
| `mipmap-xxhdpi/` | 144x144 |
| `mipmap-xxxhdpi/` | 192x192 |

**Fichiers a remplacer** dans `frontend/android/app/src/main/res/` :
- `mipmap-*/ic_launcher.png`
- `mipmap-*/ic_launcher_round.png`
- `mipmap-*/ic_launcher_foreground.png`

### 1.2 Adaptive Icon (Android 8+)

L'adaptive icon est composee de deux calques :
- **Foreground** : le logo (avec marges de securite, zone safe de 66%)
- **Background** : couleur ou image de fond

Fichiers a modifier :
- `frontend/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
- `frontend/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`

Configuration actuelle (a adapter) :
```xml
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### 1.3 Splash Screen

Remplacer les fichiers splash par defaut dans `frontend/android/app/src/main/res/` :
- `drawable/splash.png`
- `drawable-port-hdpi/splash.png` (480x800)
- `drawable-port-mdpi/splash.png` (320x480)
- `drawable-port-xhdpi/splash.png` (720x1280)
- `drawable-port-xxhdpi/splash.png` (960x1600)
- `drawable-port-xxxhdpi/splash.png` (1280x1920)
- `drawable-land-hdpi/splash.png` (800x480)
- `drawable-land-mdpi/splash.png` (480x320)
- `drawable-land-xhdpi/splash.png` (1280x720)
- `drawable-land-xxhdpi/splash.png` (1600x960)
- `drawable-land-xxxhdpi/splash.png` (1920x1280)

### 1.4 Icone haute resolution Play Store

En plus des mipmap, le Play Store exige une icone **512x512 PNG** uploadee directement dans la console. C'est la meme source que l'icone de l'app.

### 1.5 Feature Graphic

Image banniere **1024x500 pixels** affichee en haut de la fiche Play Store.
- Format : JPG ou PNG 24 bits (pas de transparence)
- Doit etre visuellement attrayante et representer le jeu

## Outils recommandes

- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) : generation automatique de toutes les tailles
- [Figma](https://figma.com) ou [Canva](https://canva.com) : creation des visuels
- Android Studio > clic droit sur `res` > New > Image Asset : assistant integre
