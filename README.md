# Career App

Career App est une application de gestion de carriere et de recrutement. Le projet contient une interface React, une API Node/Express locale et une base embarquee PGlite pour developper sans installer PostgreSQL.

## Fonctionnalites

- Authentification locale: inscription, connexion, deconnexion et sessions.
- Profils multi-roles: etudiant, candidat, cabinet de recrutement, entreprise, freelance et autres profils.
- Gestion du profil utilisateur avec photo, informations personnelles et statut premium.
- Import et analyse de CV.
- Matching entre CV, competences et offres.
- Recommandations de carriere.
- Simulation d'entretien avec scripts de questions.
- Tableaux de bord et prototypes Python/HTML conserves a la racine du projet.

## Structure

```text
.
|-- app.py                         # Prototype Python principal
|-- dashboard.py                   # Prototype/tableau de bord Python
|-- app.html, app2.html, front.html# Prototypes HTML
|-- dataprocess.ipynb              # Notebook de traitement de donnees
|-- data/                          # Donnees d'exemple versionnees
`-- career-web-react/              # Application React + API locale
    |-- src/                       # Code frontend React
    |-- server/index.js            # API Express + persistance PGlite
    |-- package.json               # Scripts npm
    `-- package-lock.json          # Verrouillage des dependances
```

## Prerequis

- Node.js 18 ou plus recent.
- npm.
- Python 3.10+ si vous utilisez les prototypes Python.

PostgreSQL n'est pas requis: l'application React utilise PGlite en local.

## Installation de l'application React

```bash
cd career-web-react
npm install
```

## Lancer en developpement

```bash
cd career-web-react
npm run dev
```

Services lances:

- Frontend: `http://127.0.0.1:5174`
- API locale: `http://127.0.0.1:8787`
- Donnees locales PGlite: `career-web-react/server/postgres-data/` ou `career-web-react/server/postgres-runtime/`

Les dossiers de donnees locales sont ignores par Git parce qu'ils peuvent contenir des donnees utilisateur et des fichiers volumineux generes au runtime.

## Build de production

```bash
cd career-web-react
npm run build
```

Le build est genere dans `career-web-react/dist/`. Ce dossier n'est pas versionne.

Pour tester le build localement:

```bash
cd career-web-react
npm run preview
```

Preview: `http://127.0.0.1:4174`

## Scripts npm

Depuis `career-web-react`:

- `npm run dev`: lance l'API locale et le frontend en parallele.
- `npm run dev:api`: lance seulement l'API Express.
- `npm run dev:client`: lance seulement Vite.
- `npm run build`: genere le build frontend.
- `npm run preview`: sert le build localement.

## Prototypes Python

Les fichiers Python a la racine peuvent etre lances separement selon le besoin:

```bash
python app.py
python dashboard.py
```

Si des dependances Python sont ajoutees plus tard, creez un environnement virtuel et documentez-les dans `requirements.txt`.

## Donnees et fichiers sensibles

Ne pas versionner:

- `node_modules/`
- `dist/`
- fichiers `.env`
- logs
- caches
- bases locales PGlite/PostgreSQL: `postgres-data*`, `pgdata`, `postgres-runtime`
- fichiers de secrets: certificats, cles privees, keystores, dumps de base de donnees

Les donnees dans `data/` sont considerees comme donnees d'exemple du projet. Verifiez-les avant publication si elles proviennent de sources privees.

## Workflow Git recommande

```bash
git status
git add .
git status
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DevOumar/Career-App.git
git push -u origin main
```

Avant chaque commit, controlez toujours `git status` pour confirmer qu'aucun fichier sensible ou genere n'est ajoute.
