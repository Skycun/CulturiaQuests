# 2. Signing / Keystore

## Probleme actuel

Aucun keystore de release n'est configure. Le `build.gradle` n'a pas de `signingConfigs` pour le build release.

## Ce qu'il faut faire

### 2.1 Generer un keystore

```bash
keytool -genkey -v \
  -keystore culturiaquests-release.keystore \
  -alias culturiaquests \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Tu seras invite a fournir :
- Un mot de passe pour le keystore
- Un mot de passe pour la cle
- Nom, organisation, localite, pays

**IMPORTANT** : Note ces mots de passe dans un endroit securise. La perte du keystore = impossibilite de mettre a jour l'app sur le Play Store.

### 2.2 Configurer le signing dans Gradle

Creer un fichier `frontend/android/keystore.properties` (ne PAS le committer) :
```properties
storePassword=MOT_DE_PASSE_KEYSTORE
keyPassword=MOT_DE_PASSE_CLE
keyAlias=culturiaquests
storeFile=../culturiaquests-release.keystore
```

Modifier `frontend/android/app/build.gradle` :
```groovy
// En haut du fichier, avant android {}
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2.3 Securiser le keystore

Ajouter au `.gitignore` :
```
# Signing
*.keystore
*.jks
keystore.properties
```

### 2.4 Alternative recommandee : Play App Signing

Google recommande d'utiliser **Play App Signing** :
1. Tu generes un upload key (keystore local)
2. Google gere la cle de signature finale
3. Avantage : si tu perds ton upload key, Google peut en generer un nouveau

Configuration dans la Google Play Console > Setup > App signing.

### 2.5 Generer l'AAB (Android App Bundle)

Le Play Store exige un fichier `.aab` (pas `.apk`) :

```bash
cd frontend
npx cap sync android
cd android
./gradlew bundleRelease
```

Le fichier sera dans `frontend/android/app/build/outputs/bundle/release/app-release.aab`.
