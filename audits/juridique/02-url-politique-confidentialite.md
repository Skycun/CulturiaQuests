# Heberger la politique de confidentialite sur URL publique

## Obligation

Google Play Store exige une **URL de politique de confidentialite accessible publiquement via un navigateur web** pour toute application qui collecte des donnees personnelles ou utilise la geolocalisation.

La page `/politique-confidentialite` existe dans l'app, mais elle n'est pas accessible via une URL web publique (uniquement via l'app mobile / localhost).

## Options

### Option A : Page statique sur le serveur de production (recommande)

Creer une page HTML statique servie par Nginx sur le domaine de production :

**URL** : `https://cqapi.ada.briceledanois.fr/privacy-policy`

1. Creer un fichier `privacy-policy.html` avec le contenu de la politique de confidentialite
2. Configurer Nginx pour servir ce fichier :

```nginx
location /privacy-policy {
    alias /var/www/culturiaquests/privacy-policy.html;
    default_type text/html;
}
```

### Option B : Endpoint Strapi

Creer un endpoint custom dans Strapi qui retourne du HTML :

```typescript
// backend/src/api/privacy/controllers/privacy.ts
export default {
  async index(ctx) {
    ctx.type = 'html';
    ctx.body = `<!DOCTYPE html><html>...contenu...</html>`;
  }
};
```

### Option C : GitHub Pages

Si le repo est public ou avec GitHub Pages active, heberger sur :
`https://skycun.github.io/CulturiaQuests/privacy-policy`

### Option D : Service tiers

Utiliser un generateur comme Termly, iubenda, ou PrivacyPolicies.com.

## Apres mise en ligne

1. Tester que l'URL est accessible depuis un navigateur externe (pas localhost)
2. Renseigner l'URL dans la Google Play Console > App content > Privacy policy
3. Ajouter un lien vers cette URL dans l'app (parametres, footer)

## Checklist

- [ ] Choisir l'option d'hebergement
- [ ] Mettre en ligne la page
- [ ] Verifier l'accessibilite publique
- [ ] Renseigner l'URL dans la Google Play Console
