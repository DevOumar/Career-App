# Career App

Career App est une application de gestion de carrière et de recrutement. Le projet contient une interface React, une API Node/Express locale et une base embarquée PGlite pour développer sans installer PostgreSQL.

## Fonctionnalités

- Authentification locale : inscription, connexion, déconnexion et sessions.
- Profils multi-rôles : étudiant, candidat, cabinet de recrutement, entreprise, freelance et autres profils.
- Gestion du profil utilisateur avec photo, informations personnelles et statut premium.
- Import et analyse de CV.
- Matching entre CV, compétences et offres.
- Recommandations de carrière.
- Simulation d'entretien avec scripts de questions.
- Tableaux de bord et prototypes Python/HTML conservés à la racine du projet.

## Structure

```text
.
|-- app.py                         # Prototype Python principal
|-- dashboard.py                   # Prototype/tableau de bord Python
|-- requirements.txt               # Dépendances Python des prototypes
|-- app.html, app2.html, front.html# Prototypes HTML
|-- dataprocess.ipynb              # Notebook de traitement de données
|-- data/                          # Données d'exemple versionnées
`-- career-web-react/              # Application React + API locale
    |-- src/                       # Code frontend React
    |-- server/index.js            # API Express + persistance PGlite
    |-- package.json               # Scripts npm
    `-- package-lock.json          # Verrouillage des dépendances
```

## Prérequis

- Node.js 18 ou plus récent.
- npm.
- Python 3.10+ si vous utilisez les prototypes Python.

PostgreSQL n'est pas requis : l'application React utilise PGlite en local.

## Installation de l'application React

```bash
cd career-web-react
npm install
```

## Lancer en développement

```bash
cd career-web-react
npm run dev
```

Services lancés :

- Frontend : `http://127.0.0.1:5174`
- API locale : `http://127.0.0.1:8787`
- Données locales PGlite : `career-web-react/server/postgres-data/` ou `career-web-react/server/postgres-runtime/`

Les dossiers de données locales sont ignorés par Git parce qu'ils peuvent contenir des données utilisateur et des fichiers volumineux générés au runtime.

## Build de production

```bash
cd career-web-react
npm run build
```

Le build est généré dans `career-web-react/dist/`. Ce dossier n'est pas versionné.

Pour tester le build localement :

```bash
cd career-web-react
npm run preview
```

Preview : `http://127.0.0.1:4174`

## Scripts npm

Depuis `career-web-react` :

- `npm run dev` : lance l'API locale et le frontend en parallèle.
- `npm run dev:api` : lance seulement l'API Express.
- `npm run dev:client` : lance seulement Vite.
- `npm run build` : génère le build frontend.
- `npm run preview` : sert le build localement.

## Prototypes Python

Les fichiers Python à la racine peuvent être lancés séparément selon le besoin :

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Lancer l'application Streamlit principale :

```bash
streamlit run app.py
```

Lancer le tableau de bord :

```bash
streamlit run dashboard.py
```

## Données et fichiers sensibles

Ne pas versionner :

- `node_modules/`
- `dist/`
- fichiers `.env`
- logs
- caches
- bases locales PGlite/PostgreSQL : `postgres-data*`, `pgdata`, `postgres-runtime`
- fichiers de secrets : certificats, clés privées, keystores, dumps de base de données

Les données dans `data/` sont considérées comme données d'exemple du projet. Vérifiez-les avant publication si elles proviennent de sources privées.

## Workflow Git recommandé

```bash
git status
git add .
git status
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DevOumar/Career-App.git
git push -u origin main
```

Avant chaque commit, contrôlez toujours `git status` pour confirmer qu'aucun fichier sensible ou généré n'est ajouté.
