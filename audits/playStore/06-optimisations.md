# 6. Optimisations Techniques (non bloquantes)

Ces optimisations ne sont pas requises pour la publication mais sont recommandees.

## 6.1 Activer ProGuard / R8

**Fichier** : `frontend/android/app/build.gradle`

Actuellement `minifyEnabled false`. Pour le build release :

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

**Avantages** :
- Code obfusque (protection contre le reverse engineering)
- APK/AAB plus petit (suppression du code inutilise)
- Ressources inutilisees supprimees

**Note** : Pour une app Capacitor (WebView), le gain est modere car le code principal est du JS/HTML dans le WebView. Mais c'est une bonne pratique.

## 6.2 Network Security Config

Creer `frontend/android/app/src/main/res/xml/network_security_config.xml` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

Puis le referencer dans `AndroidManifest.xml` :
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

Cela documente explicitement que l'app refuse le trafic HTTP en clair.

## 6.3 Version name et version code

A chaque mise a jour sur le Play Store, incrementer dans `frontend/android/app/build.gradle` :

```groovy
android {
    defaultConfig {
        versionCode 2      // Incrementer de 1 a chaque upload
        versionName "1.1"   // Version lisible par l'utilisateur
    }
}
```

**Regle** : `versionCode` doit etre strictement superieur a la version precedente sur le Play Store.

## 6.4 Play App Signing (recommande)

Plutot que de gerer la cle de signature localement, utiliser Play App Signing :
1. Google gere la cle de signature finale
2. Tu ne fournis qu'une "upload key"
3. Si tu perds ton upload key, Google peut en generer un nouveau
4. Configuration dans Play Console > Setup > App signing

## 6.5 Fastlane (automatisation)

Pour automatiser les deployments futurs, envisager [Fastlane](https://fastlane.tools/) :
- Build automatique
- Upload automatique sur le Play Store
- Gestion des screenshots
- Gestion des metadonnees (descriptions, changelogs)

Ce n'est pas necessaire pour la premiere publication mais utile a long terme.

## 6.6 Correction de l'incoherence CGU geolocalisation

Les CGU (section 6) mentionnent : "Nous collectons la localisation meme lorsque l'application est fermee ou non utilisee."

Mais :
- La permission `ACCESS_BACKGROUND_LOCATION` n'est PAS declaree dans AndroidManifest.xml
- Le code utilise uniquement `navigator.geolocation.watchPosition()` (premier plan uniquement)

**Action** : Retirer cette mention des CGU car la collecte en arriere-plan n'est ni implementee ni necessaire. Si elle etait implementee, cela compliquerait considerablement la validation Play Store (Google impose des restrictions strictes sur ACCESS_BACKGROUND_LOCATION).
