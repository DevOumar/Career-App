# Career CV

Career CV est une plateforme web de gestion de carriere, de candidature et de recrutement. Elle combine import/analyse de CV, matching CV/offre, outils IA pour candidater, entrainement entretien, test technique, suivi de candidatures, paiements, licences B2B, et espaces dedies candidat, administrateur, ecole et cabinet.

Production actuelle :

- Frontend Vercel : `https://www.careercv.fr`
- Ancienne URL Vercel encore disponible : `https://career-cv-henna.vercel.app`
- API Render : `https://career-app-api-mlk9.onrender.com`

## Fonctionnalites

### Espace candidat

- Import de CV et analyse IA.
- Matching CV/offre avec score global, forces, ecarts, mots-cles et recommandations.
- Historique des CV et analyses.
- Suivi des candidatures.
- Lettre de motivation IA.
- Simulation d'entretien IA : RH, technique/metier, direction/vision.
- Test technique integre : generation d'exercice, editeur de code, indices, exemples, correction IA et historique.
- Negociation salariale IA.
- Email Scout pour retrouver des emails professionnels.
- Tarifs, paiement Stripe, historique de facturation et solde de jetons.
- Profil, securite de compte, MFA/TOTP, cles de securite/passkeys, appareils actifs.

### Espace administrateur plateforme

- Tableau de bord de pilotage.
- Gestion des comptes utilisateurs et affiliations.
- Gestion des CV, analyses et matching.
- Monitoring IA : couts, usages, echantillons, qualite.
- Finance, plans, prix Stripe, codes licences.
- Gestion des ecoles et cabinets.
- Annonces, notifications, satisfaction, activite et audit.
- Exports CSV/XLSX et filtres avances.

### Espace ecole

- Tableau de bord ecole.
- Gestion des etudiants, promotions, evenements et communications.
- Licences, invitations, facturation et rapports.
- Statistiques d'usage et insights.
- Parametres et notifications.

### Espace cabinet / recruteur

- Tableau de bord cabinet.
- Gestion candidats, missions, clients, recruteurs et entretiens.
- Matching candidats/missions.
- Pipeline de recrutement, timeline candidat, emails et activite.
- Licences, facturation, rapports, RGPD et parametres.
- Page publique cabinet.

## Architecture

Le projet est une application monorepo dans `career-web-react/` :

```text
.
|-- README.md
|-- DEPLOYMENT.md
|-- render.yaml
`-- career-web-react/
    |-- frontend/
    |   |-- index.html
    |   |-- public/
    |   `-- src/
    |       |-- App.jsx
    |       |-- main.jsx
    |       |-- styles.css
    |       |-- components/
    |       |-- data/
    |       |-- lib/
    |       `-- features/
    |           |-- account/
    |           |-- admin/
    |           |-- applications/
    |           |-- cabinet/
    |           |-- coding/
    |           |-- coverLetter/
    |           |-- cv/
    |           |-- emailScout/
    |           |-- home/
    |           |-- interviews/
    |           |-- landing/
    |           |-- legal/
    |           |-- negotiation/
    |           |-- pricing/
    |           |-- profile/
    |           `-- school/
    |-- backend/
    |   |-- index.js
    |   |-- routes/
    |   |   |-- admin/
    |   |   |-- cabinet/
    |   |   |-- school/
    |   |   |-- auth.js
    |   |   |-- billing.js
    |   |   |-- coding.js
    |   |   |-- coverLetter.js
    |   |   |-- cv.js
    |   |   |-- emailFinder.js
    |   |   |-- interview.js
    |   |   |-- matching.js
    |   |   |-- mfa.js
    |   |   |-- negotiation.js
    |   |   |-- premium.js
    |   |   `-- profile.js
    |   |-- database/
    |   |-- stripeService.js
    |   `-- salaryDataService.js
    |-- package.json
    |-- vite.config.js
    `-- dist/
```

Le frontend React/Vite et l'API Node/Express partagent le meme `package.json`. Certains modules frontend partagent aussi de la logique avec le backend, notamment les plans et le matching, pour eviter les divergences entre client et serveur.

## Stack technique

- React + Vite.
- Node.js + Express.
- PostgreSQL via Supabase en production.
- PGlite/PostgreSQL embarque en repli local.
- Stripe pour paiements et abonnements.
- SMTP pour emails transactionnels.
- Fournisseur IA configurable via variables d'environnement.
- Auth email/mot de passe, Google OAuth, OTP, MFA/TOTP, passkeys.
- Frontend de production sur Vercel.
- Backend de production sur Render.

## Prerequis

- Node.js 18 ou plus recent.
- npm.
- Une base PostgreSQL/Supabase pour la production.
- Comptes/API keys selon les modules actives : IA, Stripe, Google OAuth, SMTP.

## Installation

```bash
cd career-web-react
npm install
```

Creer ensuite un fichier `.env` dans `career-web-react/` ou configurer les variables directement dans Vercel/Render.

## Developpement local

```bash
cd career-web-react
npm run dev
```

Services locaux :

- Frontend : `http://127.0.0.1:5174`
- API : `http://127.0.0.1:8787`

## Scripts npm

Depuis `career-web-react/` :

- `npm run dev` : lance API + frontend en parallele.
- `npm run dev:api` : lance seulement l'API Express.
- `npm run dev:client` : lance seulement Vite.
- `npm run build` : genere le build frontend dans `dist/`.
- `npm run preview` : sert le build frontend localement.
- `npm start` : lance l'API en mode production (`backend/index.js`).

## Variables d'environnement importantes

### Frontend Vercel

- `VITE_API_URL` : URL API publique, par exemple `https://career-app-api-mlk9.onrender.com/api`.
- `VITE_GOOGLE_CLIENT_ID` : client ID Google OAuth.

### Backend Render

- `NODE_ENV=production`
- `PORT` : fourni par Render.
- `DATABASE_URL` : URL PostgreSQL/Supabase.
- `APP_URL=https://www.careercv.fr`
- `CORS_ORIGINS=https://www.careercv.fr,https://careercv.fr,https://career-cv-henna.vercel.app`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`
- Variables Stripe : cles API, webhook secret, price IDs.
- Variables IA : provider, modele, cle API, timeouts.

## Deploiement

### Frontend

Le frontend est deploye sur Vercel. Le domaine principal est :

```text
https://www.careercv.fr
```

Le domaine apex `careercv.fr` redirige en `308` vers `www.careercv.fr`.

### Backend

L'API est deployee sur Render :

```text
https://career-app-api-mlk9.onrender.com
```

Apres modification des variables Render, redeployer le service pour que l'API prenne les nouvelles valeurs.

## Securite

- Authentification email/mot de passe et Google OAuth.
- Verification par code OTP selon les parcours de connexion et d'inscription.
- MFA/TOTP, cles de securite et gestion des appareils actifs.
- Controle des roles pour les espaces candidat, administrateur, ecole et cabinet.

## Workflow Git

Branches habituelles :

```text
feature_oumar -> develop -> main
```

`main` alimente la production. Avant chaque commit, verifier :

```bash
git status --short
npm run build
```

Ne committer que les fichiers lies a la correction ou a la fonctionnalite en cours.
