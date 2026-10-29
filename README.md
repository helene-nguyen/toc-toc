# Toc-Toc

Suivi des contractions et des mouvements du bébé, en temps réel, avec un tracé façon monitoring de maternité qu'on peut zoomer, garder et imprimer. Auto-hébergé sur un Raspberry Pi, partageable : chaque personne a son compte (email et mot de passe, ou Google) et ne voit que ses propres sessions.

> Le tracé est reconstruit à partir des saisies (début, fin, intensité ressentie). Ce n'est pas une mesure de pression utérine et il ne remplace pas un monitoring en maternité.

## Architecture

Monorepo pnpm, sur le modèle de [memomentis](https://github.com/helene-nguyen/memomentis) :

- `apps/api` : Fastify 5, PostgreSQL, architecture hexagonale (ports & adapters)
  - `src/core/monitoring/` : les cas d'usage (démarrer/arrêter un monitoring, enregistrer une contraction ou un mouvement…) et leurs règles, sans HTTP ni SQL. Chacun renvoie un `Result`. Chaque monitoring appartient à un compte.
  - `src/core/user/` : les comptes (inscription, connexion, Google, liste d'emails autorisés)
  - `src/adapters/http/` : les routes `/api/v1/…`, avec schémas JSON ; la session tient dans deux cookies httpOnly (accès 15 min, renouvellement 30 jours)
  - `src/adapters/postgres/` : le dépôt PostgreSQL ; `migrations/` : le schéma (node-pg-migrate)
- `apps/web` : React 19, Vite, Redux Toolkit (RTK Query), React Router
  - `src/features/monitoring/domain/` : le tracé (`toco.ts`), les indicateurs et le repère 5-1-1 (`stats.ts`), en fonctions pures testées

Les identifiants des sessions, contractions et mouvements sont des UUID créés par le téléphone. Chaque appui peut ainsi être enregistré hors ligne puis renvoyé sans créer de doublon (`PUT`).

## Développer

Prérequis : Node 24, pnpm 9 (`corepack enable`), Docker.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
docker compose up -d          # PostgreSQL sur le port 5436
pnpm install
pnpm --filter @toc-toc/api migrate
pnpm dev                      # API sur :4210, web sur http://localhost:5173
```

Dans `apps/api/.env`, mettre un `JWT_SECRET` (n'importe quelle longue chaîne en développement). Google est facultatif.

Tests : `pnpm test` (unitaires), `pnpm test:integration` (PostgreSQL requis), `pnpm lint`, `pnpm typecheck`.

## Déployer sur le Raspberry Pi

Une seule image contient l'API et l'app web compilée ; elle applique les migrations au démarrage. La CI la construit pour arm64 et la publie sur `ghcr.io/helene-nguyen/toc-toc` à chaque push sur `main`.

Sur le Pi (64 bits, Docker installé) :

```bash
git clone git@github.com:helene-nguyen/toc-toc.git && cd toc-toc
cp .env.example .env          # POSTGRES_PASSWORD, JWT_SECRET, APP_URL : voir ci-dessous
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Dans `.env` :

- `POSTGRES_PASSWORD` : un vrai mot de passe
- `JWT_SECRET` : signe les sessions, à générer avec `openssl rand -hex 32`
- `APP_URL` : l'adresse ouverte sur les téléphones, par exemple `https://raspberrypi.tail1234.ts.net` (voir Tailscale plus bas)
- `ALLOWED_EMAILS` (facultatif) : les seuls emails qui pourront créer un compte, séparés par des virgules. Vide, toute personne qui atteint l'app peut s'inscrire.
- `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (facultatifs) : pour « Continuer avec Google », voir plus bas

Les sessions enregistrées avant l'arrivée des comptes reviennent au premier compte créé.

Sans registre, construire l'image sur le Pi : `docker compose -f docker-compose.prod.yml build` (plus lent).

Mettre à jour : `pull` puis `up -d` à nouveau.

### Accès depuis le téléphone : Tailscale

L'app n'écoute que sur `127.0.0.1:4210`. Pour y accéder depuis le téléphone, à la maison comme à la maternité, en HTTPS et sans ouvrir de port sur la box :

1. Installer [Tailscale](https://tailscale.com/download) sur le Pi et sur le téléphone, avec le même compte.
2. Sur le Pi : `sudo tailscale serve --bg 4210`
3. Ouvrir `https://<nom-du-pi>.<tailnet>.ts.net` sur le téléphone, puis « Ajouter à l'écran d'accueil ».

Le HTTPS est nécessaire pour garder l'écran allumé pendant une session et pour installer l'app sur le téléphone.

### Partager l'application

Deux façons de donner l'accès à d'autres personnes :

- **Privé (recommandé)** : partager le Pi depuis la console Tailscale (*Machines → … → Share*). Chaque personne installe Tailscale avec son propre compte, puis ouvre la même adresse. Personne d'autre ne peut atteindre l'app.
- **Public** : `sudo tailscale funnel --bg 4210` à la place de `serve` rend l'adresse accessible depuis tout Internet (la console Tailscale demande d'autoriser Funnel la première fois). Dans ce cas, remplissez `ALLOWED_EMAILS` pour choisir qui peut créer un compte.

Il n'y a pas de « mot de passe oublié » (le Pi n'envoie pas d'emails). Une personne qui a perdu son mot de passe peut se connecter avec Google si son compte Google a le même email.

### Connexion avec Google (facultatif)

1. Sur [console.cloud.google.com](https://console.cloud.google.com), créer un projet.
2. *APIs & Services → OAuth consent screen* : type *External*. Tant que l'app est en mode *Testing*, ajouter les adresses Gmail autorisées dans *Test users*.
3. *Credentials → Create credentials → OAuth client ID* : type *Web application*, avec comme *Authorized redirect URI* `<APP_URL>/api/v1/auth/google/callback`.
4. Copier l'identifiant et le secret dans `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, puis `docker compose -f docker-compose.prod.yml up -d`.

Le bouton « Continuer avec Google » apparaît dès que ces deux variables sont remplies.

### Sauvegardes

Le service `backup` écrit chaque nuit une sauvegarde compressée dans `./backups` et garde les 14 dernières. Restaurer :

```bash
gunzip -c backups/toc-toc-AAAA-MM-JJ.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U toctoc toctoc
```

De préférence, placez le projet sur un SSD plutôt que sur la carte SD.
