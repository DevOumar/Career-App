# Architecture

Ce document explique comment le code est organisé, pour qu'un·e collaborateur·rice
puisse trouver et modifier un module sans devoir lire l'intégralité du projet.

## Vue d'ensemble

```text
career-web-react/
|-- frontend/                     Interface React (Vite)
|   `-- src/
|       |-- App.jsx               Coquille de l'app : layout, navigation,
|       |                         état global (session, langue...),
|       |                         écran de connexion (AuthScreen)
|       |-- main.jsx              Point d'entrée React
|       |-- styles.css            Styles globaux
|       |-- components/           Composants UI partagés par plusieurs modules
|       |   |-- UiIcon.jsx
|       |   |-- AvatarCircle.jsx
|       |   |-- LanguageSwitch.jsx
|       |   |-- Placeholder.jsx
|       |   |-- AdminPageLoader.jsx
|       |   |-- AdminKpiCard.jsx
|       |   `-- AdminExportCsvButton.jsx
|       |-- features/             Un dossier par module métier (voir tableau)
|       |-- lib/                  Client API + logique/utilitaires partagés
|       |   |-- inMemoryDb.js     Tous les appels HTTP vers le backend
|       |   |-- matchingService.js
|       |   |-- cvService.js
|       |   |-- format.js         Devises, dates, templates de texte
|       |   |-- errors.js         Messages d'erreur conviviaux
|       |   |-- accounts.js       Libellés + formulaires de compte
|       |   `-- images.js         Lecture/redimensionnement d'avatar
|       `-- data/                 Données statiques de référence (offres, plans, compétences)
|-- backend/                       API Express
|   |-- index.js                  Serveur, routes, base de données, IA
|   |-- stripeService.js
|   |-- salaryDataService.js
|   `-- database/schema.sql
`-- vite.config.js
```

## La convention `features/<module>/`

Chaque module métier vit dans son propre dossier sous `frontend/src/features/`,
avec **tout ce qui lui appartient en propre** : composant(s) de page
(`XxxPage.jsx`), textes FR/EN (`xxxCopy.js`), données/logique spécifiques.

Un module importe depuis `../../components/` (UI partagée), `../../lib/`
(client API + utilitaires partagés) et `../../data/` (données de référence).

Un module est monté depuis `App.jsx` avec des props explicites — `App.jsx`
reste le seul endroit qui connaît l'état global de la session ; les modules
restent des composants "bêtes" pilotés par leurs props.

## Modules extraits

| Module | Dossier |
|---|---|
| Entretiens | `features/interviews/` |
| Négociation | `features/negotiation/` |
| Candidatures | `features/applications/` |
| Admin | `features/admin/` |
| École | `features/school/` |
| CV | `features/cv/` |
| Satisfaction (CSAT) | `features/satisfaction/` |
| Compte | `features/account/` |
| Landing / public | `features/landing/` |
| Pages légales | `features/legal/` |
| Tarifs | `features/pricing/` |
| Page d'accueil (connecté) | `features/home/` |
| Profil | `features/profile/` |
| Lettre IA | `features/coverLetter/` |
| Email Scout | `features/emailScout/` |

`App.jsx` (≈2900 lignes) ne contient plus que : la coquille de l'app
(navigation, état de session, thème/langue/devise), l'écran de connexion
(`AuthScreen`), et une poignée de composants réellement transverses gardés là
faute d'un meilleur point d'ancrage (`GoogleSignInButton`/`GoogleLogo`,
`ConnectedFooter`, `RoleQuizModal`).

### Imports "arrière" (feature -> App.jsx)

Quelques composants restent dans `App.jsx` mais sont utilisés par des
modules extraits (ex. `GoogleSignInButton` par `features/account/`,
`ConnectedFooter` par `features/landing/` et `features/legal/`). Dans ce cas,
`App.jsx` les exporte (`export function ...`) et le module fait un import
"arrière" (`import { X } from "../../App.jsx"`). C'est sûr ici car ces
composants ne sont utilisés qu'au rendu (jamais à l'évaluation du module),
bien après la résolution du cycle ESM — mais ça n'a été fait qu'en
one-directionnel (feature -> App.jsx) : **deux modules de même niveau ne
doivent pas s'importer mutuellement** (import circulaire A↔B), voir
l'exemple `AdminKpiCard`/`AdminExportCsvButton` ci-dessous.

### Exemple concret : le module Entretiens

```text
features/interviews/
|-- InterviewPage.jsx       Composant de page (chat, pistes RH/technique/code, bilan)
|-- interviewCopy.js        Textes FR/EN
`-- interviewScripts.js     Questions, indices, réponses modèles par piste
```

## Pièges rencontrés pendant l'extraction (à connaître avant d'en faire une nouvelle)

1. **Un composant au nom trompeur peut être partagé.** `Placeholder`,
   `AdminPageLoader`, `AdminKpiCard`, `AdminExportCsvButton` semblaient
   propres à une page mais étaient en fait utilisés par plusieurs pages (y
   compris dans des modules différents, ex. Admin et École). Le build seul
   ne détecte pas une référence à un composant supprimé/déplacé sans import
   — c'est une `ReferenceError` silencieuse au runtime. **Toujours grep
   `<NomDuComposant` dans tout `frontend/src/` avant de déplacer un
   composant**, pas seulement dans le fichier qu'on extrait.
2. **Ne jamais créer d'import circulaire entre deux modules `features/`.**
   Quand Admin et École ont été séparés, `AdminExportCsvButton` était utilisé
   par les deux : le réflexe naturel (l'exporter depuis École et l'importer
   dans Admin, sachant qu'Admin exporte déjà des choses vers École) aurait
   créé un cycle A→B→A. La solution : si un composant est utilisé par deux
   modules de même niveau, il n'est pas "à eux", il est partagé — il va dans
   `components/`.
3. **Vérifier les copies de textes avec les bonnes bornes.** En extrayant un
   bloc `APP_COPY[language]?.xxx`, une erreur de ligne de fin a une fois
   entraîné la capture d'un bloc de textes voisin (`roleQuiz`) en trop dans
   `pricingCopy.js`. Après extraction, toujours vérifier qu'un fichier
   `xxxCopy.js` ne contient qu'une seule clé de premier niveau par langue.
4. **Ce projet n'a pas de plugin JSX automatique** (`@vitejs/plugin-react`
   n'est pas installé) : le JSX est compilé par esbuild en mode *classique*
   (`<div/>` devient `React.createElement("div")`), ce qui veut dire que
   **tout fichier utilisant du JSX doit importer `React` explicitement**
   (`import React from "react";`), même si aucun `React.xxx` n'apparaît
   littéralement dans le code source. Oublier cet import compile très bien
   (`npm run build` ne voit rien d'anormal) mais casse au premier rendu avec
   `React is not defined` — un script d'analyse du code source ne peut pas
   le détecter puisque la dépendance à `React` n'existe qu'après la
   transformation JSX, invisible dans le texte source. C'est arrivé sur les
   22 fichiers créés lors de cette extraction, corrigé après coup.
5. **Un simple `npm run build` ne suffit pas.** Une référence à un composant
   non importé compile très bien (JS ne fait pas de vérification statique
   des JSX) et casse seulement au rendu. La vérification fiable : lancer
   `npm run dev`, ouvrir chaque page concernée dans le navigateur, et/ou
   `curl` chaque module transformé par Vite pour confirmer qu'il n'y a pas
   d'erreur de transformation.

6. **Un script maison de vérification statique a des angles morts.** Un
   script basé sur des regex (recherche de balises JSX `<Tag` et d'appels
   `nom(`) ne détecte pas une référence à une constante utilisée en
   `NOM.map(...)` ou `NOM.property` — exactement le cas de `CAREER_CARDS`
   (tableau resté dans `App.jsx` alors que son seul utilisateur avait
   déménagé dans `features/landing/`) ou de `PLANS`/`ADMIN_ACCOUNT_TYPES`
   utilisés sans import après une extraction. `npm run build` ne le voit
   pas non plus (JSX classique compile sans vérifier les références). La
   vérification fiable : un vrai linter avec la règle `no-undef` (ESLint,
   règle `react/jsx-no-undef` pour le JSX) sur `frontend/src/**/*.jsx` —
   ça a permis de retrouver 44 références non importées en une seule
   passe après l'extraction des modules. Recommandé pour toute future
   extraction, y compris celle du backend ci-dessous.

## Backend

`backend/index.js` est aujourd'hui un fichier unique regroupant toutes les
routes (auth, CV, matching, candidatures, admin, Stripe...). Une découpe en
`backend/routes/<domaine>.js` suivrait la même logique que côté frontend,
mais n'a pas encore été faite.
