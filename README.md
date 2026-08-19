# Career App

Career App est une application de gestion de carrière et de recrutement : import et analyse de CV, matching CV/offre, optimisation ATS par IA, lettres de motivation, préparation d'entretiens, suivi de candidatures, et un espace admin/école dédié.

Le projet est une architecture **frontend/backend séparée** : une interface React (Vite) et une API Node/Express, toutes deux dans `career-web-react/`, avec une base PostgreSQL (Supabase en production, PGlite embarqué en repli local).

## Structure

```text
.
`-- career-web-react/          # Toute l'application
    |-- frontend/              # Interface React (Vite)
    |   |-- index.html
    |   `-- src/
    |       |-- App.jsx        # Coquille de l'app (session, nav, routage entre modules)
    |       |-- main.jsx       # Point d'entrée React
    |       |-- styles.css
    |       |-- components/    # Composants UI partagés (icônes, cartes KPI...)
    |       |-- features/      # Un dossier par module métier (CV, entretiens, admin, école...)
    |       |   `-- admin|school/pages/  # Une page par fichier pour les 2 plus gros modules
    |       |-- data/          # Données statiques partagées (offres, plans, compétences)
    |       `-- lib/           # Client API + logique de matching partagée
    |-- backend/                # API Express
    |   |-- index.js           # Point d'entrée : config, base de données, helpers, middlewares
    |   |-- routes/            # Un fichier (ou sous-dossier) par domaine de routes
    |   |   `-- admin|school/  # Sous-découpage par sous-domaine pour les 2 plus gros
    |   |-- stripeService.js
    |   |-- salaryDataService.js
    |   `-- database/schema.sql
    |-- vite.config.js         # root: frontend/, envDir: .. (lit le .env à la racine), sortie: ../dist
    |-- package.json           # Un seul package.json pour tout le projet
    `-- dist/                  # Build de production (généré, non versionné)
```

Le frontend et le backend partagent un seul `package.json`/`node_modules` (le backend importe directement quelques modules du frontend comme `frontend/src/data/plans.js` ou `frontend/src/lib/matchingService.js`, pour réutiliser la même logique de matching côté serveur et côté client sans la dupliquer).

Voir [career-web-react/ARCHITECTURE.md](career-web-react/ARCHITECTURE.md) pour le détail : convention `features/<module>/` et `backend/routes/<domaine>.js`, comment trouver/ajouter le code d'un module métier, les pièges déjà rencontrés lors des découpages précédents, et l'état de la migration.

## Prérequis

- Node.js 18 ou plus récent.
- npm.
- Une base PostgreSQL (Supabase recommandé) — sinon l'API bascule automatiquement sur PGlite en local, sans installation nécessaire.

## Installation

```bash
cd career-web-react
npm install
```

Copiez `.env.example` vers `.env` et renseignez vos clés (base de données, IA, Stripe, email...).

## Lancer en développement

```bash
cd career-web-react
npm run dev
```

Services lancés :

- Frontend : `http://127.0.0.1:5174`
- API : `http://127.0.0.1:8787`

## Scripts npm

Depuis `career-web-react/` :

- `npm run dev` : lance l'API et le frontend en parallèle.
- `npm run dev:api` : lance seulement l'API Express (`backend/index.js`).
- `npm run dev:client` : lance seulement Vite (`frontend/`).
- `npm run build` : génère le build frontend dans `dist/`.
- `npm run preview` : sert le build localement (`http://127.0.0.1:4174`).

## Données et fichiers sensibles

Ne sont jamais versionnés :

- `node_modules/`, `dist/`, `.vite/`
- fichiers `.env`
- logs, caches
- bases locales PGlite/PostgreSQL de repli : `backend/postgres-data*`, `backend/pgdata*`, `backend/postgres-runtime`
- fichiers de secrets : certificats, clés privées, keystores, dumps de base de données

## Workflow Git

Branches : `feature_oumar` → `develop` → `main` (fusion dans cet ordre). `orchestrateur` est maintenue synchronisée avec `main`.

Avant chaque commit, contrôlez toujours `git status` pour confirmer qu'aucun fichier sensible ou généré n'est ajouté.
