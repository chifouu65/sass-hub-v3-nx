## Démarrage rapide

- `npm run start:all` : lance tout (hub + linkedin)
- `npm run start:hub` : lance hub-frontend (4200) + hub-backend (4301)
- `npm run start:linkedin` : lance linkedin-ai-frontend (4300) + linkedin-ai-backend (4302)
- Individuel : `start:hub-frontend`, `start:hub-backend`, `start:linkedin-frontend`, `start:linkedin-backend`

## Carte des ports

- 4200 : hub-frontend (Angular)
- 4301 : hub-backend (Nest/Webpack, mode dev)
- 4300 : linkedin-ai-frontend (Angular)
- 4302 : linkedin-ai-backend (Nest/Webpack, mode dev)

## Auth (endpoints hub)

- Authn : `POST /auth/login` -> renvoie token/jwt
- Refresh : `POST /auth/refresh`
- Profil : `GET /auth/me`
- JWKs : `GET /.well-known/jwks.json`
- Backends satellites (ex. linkedin-ai-backend) vérifient les JWT émis par le hub.

## Structure (Nx)

- `hub-frontend/` : app Angular principale (UI hub)
- `hub-backend/` : API/backend hub (Nest + webpack)
- `linkedin-ai-frontend/` : app Angular LinkedIn AI
- `linkedin-ai-backend/` : API backend LinkedIn AI
- `packages/` : librairies partagées (à venir)
- `nx.json`, `package.json` : config Nx/monorepo

### Dépendances et flux auth

- Les frontends (`hub-frontend`, `linkedin-ai-frontend`) consomment l’auth du hub via les endpoints OAuth (PKCE).
- Les backends satellites (ex. `linkedin-ai-backend`) délèguent l’auth au hub via la vérification des JWT (JWKs exposés) et récupèrent l’identité via les claims.

## Auth et fédération

- Le hub gère l’auth centrale côté backend (`hub-backend`), expose les endpoints d’auth et vérifie les JWT.
- Les frontends (hub + LinkedIn AI) consomment l’auth via le flux OAuth PKCE directement.
- Les backends spécifiques (ex. `linkedin-ai-backend`) s’appuient sur le hub pour la validation des tokens et la délégation d’identité.

## Conseils de dev

- Préférez `npm exec nx ...` pour build/test/lint.
- Pour éviter les conflits de port, conservez la carte ci-dessus ou passez `-- --port=<num>`.

