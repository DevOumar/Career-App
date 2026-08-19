# Architecture

Ce document explique comment le code est organisé, pour qu'un·e collaborateur·rice
puisse trouver et modifier un module sans devoir lire l'intégralité du projet.

## Vue d'ensemble

```text
career-web-react/
|-- frontend/                     Interface React (Vite)
|   `-- src/
|       |-- App.jsx               Coquille de l'app : layout, navigation, état
|       |                         global (session, langue...) + pages pas
|       |                         encore extraites (voir "État de la migration")
|       |-- main.jsx              Point d'entrée React
|       |-- styles.css            Styles globaux
|       |-- components/           Composants UI partagés par plusieurs modules
|       |   |-- UiIcon.jsx        Icônes SVG
|       |   |-- AvatarCircle.jsx
|       |   |-- LanguageSwitch.jsx
|       |   |-- AdminPageLoader.jsx
|       |   `-- Placeholder.jsx   État vide générique
|       |-- features/             Un dossier par module métier
|       |   |-- interviews/       Simulateur d'entretien
|       |   |-- negotiation/      Simulateur de négociation salariale
|       |   |-- applications/     Suivi de candidatures (kanban)
|       |   |-- admin/            Admin plateforme + dashboard École
|       |   `-- cv/               Import CV, matching, ATS, aperçu/export, historique
|       |-- lib/                  Client API + logique/utilitaires partagés
|       |   |-- inMemoryDb.js     Tous les appels HTTP vers le backend
|       |   |-- matchingService.js
|       |   |-- cvService.js
|       |   |-- format.js         Devises, dates, templates de texte
|       |   |-- errors.js         Messages d'erreur conviviaux
|       |   `-- accounts.js       Libellés des types de compte
|       `-- data/                 Données statiques de référence (offres, plans, compétences)
|-- backend/                       API Express
|   |-- index.js                  Serveur, routes, base de données, IA
|   |-- stripeService.js
|   |-- salaryDataService.js
|   `-- database/schema.sql
`-- vite.config.js
```

## La convention `features/<module>/`

Chaque module métier a vocation à vivre dans son propre dossier sous
`frontend/src/features/`, avec **tout ce qui lui appartient en propre** :

- le(s) composant(s) de page (`XxxPage.jsx`)
- ses textes FR/EN (`xxxCopy.js`)
- ses données/logique spécifiques (scripts, templates, calculs propres au module)

Un module importe depuis :
- `../../components/` pour l'UI partagée (icônes, avatar, sélecteur de langue...)
- `../../lib/` pour le client API et les utilitaires partagés entre plusieurs modules (formatage, erreurs, matching...)
- `../../data/` pour les données de référence partagées (plans tarifaires, compétences...)

Un module est monté depuis `App.jsx` avec des props explicites (ex.
`<InterviewPage language={...} subscription={...} onGoToTarifs={...} />`) —
`App.jsx` reste le seul endroit qui connaît l'état global de la session ; les
modules restent des composants "bêtes" pilotés par leurs props.

### Exemple concret : le module Entretiens

```text
features/interviews/
|-- InterviewPage.jsx       Composant de page (chat, pistes RH/technique/code, bilan)
|-- interviewCopy.js        Textes FR/EN
`-- interviewScripts.js     Questions, indices, réponses modèles par piste
```

Pour ajouter une nouvelle piste d'entretien (ex. "Entretien Produit") : tout se
passe dans `interviewScripts.js` (ajouter une entrée) et éventuellement
`interviewCopy.js` si un nouveau texte est nécessaire — aucun besoin de
toucher à `App.jsx` ni à un autre module.

## État de la migration

Modules déjà extraits de `App.jsx` :

| Module | Dossier | Contenu |
|---|---|---|
| Entretiens | `features/interviews/` | Page, copie FR/EN, scripts de questions |
| Négociation | `features/negotiation/` | Page, illustration, copie FR/EN |
| Candidatures | `features/applications/` | Kanban, formulaire, copie FR/EN |
| Admin (+ École) | `features/admin/` | Shell admin, toutes les pages admin, dashboard école |
| CV | `features/cv/` | Import, matching, ATS, aperçu/export, historique, copie FR/EN |

`App.jsx` contient encore : Profil, Tarifs, Lettre IA, page d'accueil/landing,
Compte (drawer), pages légales, Email Scout, sondage de satisfaction — un
héritage historique, pas une architecture cible. Ils seront extraits au même
rythme, un par un, en suivant exactement le schéma ci-dessus.

Pour extraire un module existant d'`App.jsx` :

1. Repérer son composant de page et les composants qui ne sont utilisés que
   par lui (illustrations, sous-composants locaux) — attention aux
   composants "génériques dans leur nom mais partagés dans les faits"
   (ex. `Placeholder`, `AdminPageLoader`) : vérifier tous les appelants avant
   de déplacer, sinon une autre page qui l'utilisait se retrouve avec une
   référence cassée au runtime (le build seul ne le détecte pas toujours).
2. Repérer son bloc de textes dans `APP_COPY` (clés FR et EN).
3. Créer `features/<module>/` avec `XxxPage.jsx` + `xxxCopy.js` (+ toute
   donnée spécifique déjà dans `lib/` ou `data/` si elle n'est utilisée que
   par ce module).
4. Remplacer la définition dans `App.jsx` par un `import XxxPage from
   "./features/<module>/XxxPage.jsx";`, sans changer les props passées au
   composant.
5. Vérifier `npm run build`, puis lancer `npm run dev` et vérifier dans le
   navigateur (le build seul ne détecte pas une référence à un composant
   supprimé/déplacé sans import — c'est une ReferenceError au runtime).

## Backend

`backend/index.js` est aujourd'hui un fichier unique regroupant toutes les
routes (auth, CV, matching, candidatures, admin, Stripe...). Une découpe en
`backend/routes/<domaine>.js` suivrait la même logique que côté frontend,
mais n'a pas encore été faite.
