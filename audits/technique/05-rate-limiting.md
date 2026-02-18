# Rate limiting sur les endpoints d'authentification

## Probleme

Aucun rate limiting n'est configure sur les endpoints d'authentification (`/api/auth/local`, `/api/auth/register`). Cela expose l'application aux attaques par force brute et au credential stuffing.

Ce probleme est deja identifie dans `SECURITY_FIXES.md` comme non implemente.

## Fichiers concernes

- `backend/config/middlewares.ts` — ajouter le middleware de rate limiting
- `backend/package.json` — ajouter la dependance si necessaire

## Implementation

### Option A : Middleware Strapi custom (simple)

Creer `backend/src/middlewares/rate-limit.ts` :

```typescript
import { Strapi } from '@strapi/strapi';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 20; // 20 tentatives par fenetre

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    const path = ctx.request.path;

    // Appliquer uniquement sur les endpoints auth
    if (!path.startsWith('/api/auth/')) {
      return next();
    }

    const ip = ctx.request.ip;
    const key = `${ip}:${path}`;
    const now = Date.now();

    const entry = rateLimitMap.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= MAX_REQUESTS) {
        ctx.status = 429;
        ctx.body = { error: 'Too many requests. Please try again later.' };
        return;
      }
      entry.count++;
    } else {
      rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    }

    await next();
  };
};
```

Puis l'enregistrer dans `backend/config/middlewares.ts`.

### Option B : Package koa-ratelimit (plus robuste)

```bash
cd backend && npm install koa-ratelimit
```

Configurer dans un middleware Strapi.

### Option C : Rate limiting au niveau reverse proxy (recommande en production)

Si Nginx est utilise en reverse proxy, ajouter dans la config Nginx :

```nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/auth/ {
    limit_req zone=auth burst=10 nodelay;
    proxy_pass http://backend:1337;
}
```

## Recommandation

L'option A est la plus simple a implementer. L'option C est la plus performante en production.
Idealement, combiner les deux : rate limiting applicatif (option A) + rate limiting infra (option C).

## Verification

- Envoyer 21 requetes POST a `/api/auth/local` avec de mauvais identifiants → la 21e retourne 429
- Attendre 15 minutes → les requetes passent a nouveau
- Les autres endpoints ne sont pas affectes
