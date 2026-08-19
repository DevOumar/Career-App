# Architecture

Ce document explique comment le code est organisé, pour qu'un·e collaborateur·rice
puisse trouver et modifier un module sans devoir lire l'intégralité du projet.

## Vue d'ensemble

```text
career-web-react/
|-- frontend/                  Interface React (Vite)
|   `-- src/
|       |-- App.jsx            Coquille de l'app : layout, navigation, état
|       |                      global (session, langue...), pages pas encore
|       |                      extraites en module (voir "État de la migration")
|       |-- main.jsx           Point d'entrée React
|       |-- styles.css         Styles globaux
|       |-- components/        Composants UI partagés par plusieurs pages
|       |   `-- UiIcon.jsx     Icônes SVG (nav, boutons, cartes...)
|       |-- features/          Un dossier par module métier (voir ci-dessous)
|       |   `-- interviews/    Simulateur d'entretien
|       |-- lib/                Client API + logique métier partagée
|       |   |-- inMemoryDb.js  Tous les appels HTTP vers le backend
|       |   |-- matchingService.js
|       |   `-- cvService.js
|       `-- data/               Données statiques de référence (offres, plans, compétences)
|-- backend/                    API Express
|   |-- index.js               Serveur, routes, base de données, IA
|   |-- stripeService.js
|   |-- salaryDataService.js
|   `-- database/schema.sql
`-- vite.config.js
```

## La convention `features/<module>/`

Chaque module métier (Entretiens, CV, Candidatures, Négociation, Lettre IA,
Admin...) a vocation à vivre dans son propre dossier sous `frontend/src/features/`,
avec **tout ce qui lui appartient en propre** :

- le(s) composant(s) de page (`XxxPage.jsx`)
- ses textes FR/EN (`xxxCopy.js`)
- ses données/logique spécifiques (scripts, templates, calculs propres au module)

Un module importe depuis :
- `../../components/` pour l'UI partagée (icônes, etc.)
- `../../lib/` pour le client API et la logique métier partagée entre plusieurs modules (ex. `matchingService.js`, utilisé à la fois par le matching CV/offre et par l'optimisation ATS)
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

`App.jsx` contient encore la majorité des pages (CV, Candidatures, Lettre IA,
Négociation, Admin, École, Tarifs...) : c'est un héritage historique, pas une
architecture cible. Le module **Entretiens** a été extrait en premier comme
exemple à suivre. Les autres modules seront extraits progressivement, un par
un, en suivant exactement le même schéma que ci-dessus, sans réécrire leur
logique — uniquement déplacer le code existant dans un dossier dédié.

Pour extraire un module existant d'`App.jsx` :

1. Repérer son composant de page et les composants qui ne sont utilisés que
   par lui (illustrations, sous-composants locaux).
2. Repérer son bloc de textes dans `APP_COPY` (clés FR et EN).
3. Créer `features/<module>/` avec `XxxPage.jsx` + `xxxCopy.js` (+ toute
   donnée spécifique déjà dans `lib/` ou `data/` si elle n'est utilisée que
   par ce module).
4. Remplacer la définition dans `App.jsx` par un `import XxxPage from
   "./features/<module>/XxxPage.jsx";`, sans changer les props passées au
   composant.
5. Vérifier `npm run build` — le bundle final généré doit être strictement
   identique (même contenu, éventuellement même hash) puisqu'il s'agit d'un
   déplacement de code, pas d'une réécriture.

## Backend

`backend/index.js` est aujourd'hui un fichier unique regroupant toutes les
routes (auth, CV, matching, candidatures, admin, Stripe...). Une découpe en
`backend/routes/<domaine>.js` suivrait la même logique que côté frontend,
mais n'a pas encore été faite.
