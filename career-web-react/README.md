# Career_App

Plateforme d'accompagnement à la recherche d'emploi : import et analyse de CV, matching avec des offres, plan d'amélioration du CV et simulation d'entretiens. Application React + API locale, avec PostgreSQL embarqué (PGlite) — aucune installation système requise.

**Prototype MVP (Phase 1, local-first)** : le matching et l'extraction de CV reposent sur des règles heuristiques (mots-clés, regex), pas sur un pipeline NLP avancé. Cette limite est assumée — voir [Limites connues](#limites-connues) plus bas.

## Fonctionnalités

**Accueil**
- Dashboard personnalisé : dernier score, offres favorites, CV importés, statut premium.

**Importer**
- Import de CV par fichier (`.txt`, `.pdf`, `.doc`, `.docx`) ou glisser-déposer, ou collage de texte brut.
- Extraction PDF (`pdfjs-dist`) et DOCX (`mammoth`) réelle côté navigateur. Le `.doc` legacy (pré-2007) n'est pas supporté (message d'erreur explicite).
- Aperçu des données extraites (compétences, expérience, niveau d'études) avec indice de confiance, corrigible manuellement avant analyse.
- Collage de l'offre ciblée pour le matching.

**Profil**
- Authentification (inscription, connexion, déconnexion, sessions).
- Profils multi-rôles : étudiant, candidat, cabinet de recrutement, entreprise, coach, autres.
- Photo de profil, sécurité du mot de passe (PBKDF2-SHA512).
- Suppression de compte (droit à l'effacement, Article 17 RGPD) : confirmation par mot de passe requise, suppression physique en cascade de toutes les données associées (profil, CV, matching, favoris, historique d'entretiens, usage IA), action immédiate et irréversible.

**Analyse**
- Score de compatibilité CV/offre, couleurs par niveau (rouge/orange/bleu/vert).
- Compatibilité par domaine dynamique (jusqu'à 6 domaines les plus pertinents parmi ~12 secteurs couverts : tech/data, marketing, finance, vente, RH, design...).
- Points forts / points à combler.

**Offres**
- Matching pondéré (compétences avec distinction obligatoire/atout, expérience, niveau d'études, localisation, rôle/secteur visé).
- 12 offres de démonstration multi-secteurs (tech/data/IA, marketing, finance, vente, RH, design, juridique) + offres réelles France Travail fusionnées selon le profil/CV (voir [Offres réelles](#offres-réelles-france-travail)).
- Recherche et filtres (compétence, secteur, localisation), tri (score / entreprise / favoris).
- Favoris et suivi "déjà postulé", persistés par utilisateur.
- Gating premium sur certaines offres.

**CV+**
- Recommandations automatiques (accroche, quantification des résultats, verbes d'action, coordonnées manquantes, mobilité...).
- Export du CV optimisé en PDF (généré localement, `jsPDF`) ou en texte brut.
- **Réécriture du CV par IA** (premium) : reformulation ciblée sur l'offre analysée, via l'API Claude.

**Entretiens**
- Mode texte : simulation par persona (RH, Manager technique, Live coding), évaluation heuristique instantanée de chaque réponse (mots-clés, longueur, structure STAR) + bouton d'analyse approfondie par IA à la demande (3 gratuites/mois, illimité en premium — ce même compteur conditionne aussi tout l'accès premium gratuit, voir [Fonctionnalités premium](#fonctionnalités-premium)).
- **Mode live (premium)** : conversation orale avec avatar animé — reconnaissance vocale et synthèse vocale du navigateur, questions générées par IA adaptées à l'offre ciblée, avatar réactif au niveau sonore réel du micro.
- Historique complet des sessions et rapport PDF téléchargeable par entretien.

## Fonctionnalités premium

- Réécriture de CV par IA
- Mode entretien live (avatar + voix)
- Offres marquées "Premium" débloquées
- Analyses IA illimitées (au-delà de 3/mois gratuites)

Deux mécanismes d'accès premium coexistent volontairement, avec une portée différente :

1. **Activation gratuite par éligibilité** : calculée automatiquement selon la complétude du profil (aucun paiement). Bouton "Activer l'offre premium (gratuit, selon score de profil)". **Ce n'est qu'un essai plafonné** : l'accès (réécriture CV, mode live, offres Premium, analyses illimitées) reste ouvert seulement tant que les 3 analyses IA gratuites du mois ne sont pas consommées. Une fois ce quota épuisé, tout l'accès premium se reverrouille automatiquement — y compris la réécriture de CV et le mode live, pas seulement les analyses supplémentaires — jusqu'au mois suivant ou jusqu'à un abonnement Stripe réel.
2. **Abonnement payant réel via Stripe** : paiement récurrent, indépendant du score d'éligibilité et du quota d'analyses. Toujours illimité. Bouton "S'abonner premium (paiement réel via Stripe)". Voir [Paiements (Stripe)](#paiements-stripe) ci-dessous.

Les deux boutons sont visibles côte à côte dans l'onglet Profil, avec l'état du quota affiché ("X/3 utilisées ce mois-ci").

Le statut d'accès (`source`) distingue quatre cas, utilisés à la fois pour l'affichage et pour bloquer/débloquer les fonctionnalités côté serveur : `subscription` (abonnement Stripe réel, identifié par la présence d'un `stripeSubscriptionId` — condition ajoutée après un bug où l'activation gratuite, qui écrit la même forme de données `{plan, status}` sans cet identifiant, se faisait passer pour un abonnement payant et bloquait à tort le bouton Stripe), `free_activation` / `profile_unlock` (essai gratuit en cours), et leurs variantes `_exhausted` une fois le quota consommé.

## Prérequis

- Node.js 18 ou plus récent
- npm

PostgreSQL n'est pas requis : l'application utilise PGlite en local.

## Installation

```bash
npm install
```

## Configuration (fonctionnalités IA — optionnel)

Les fonctionnalités utilisant l'API Claude (analyse IA en entretien, mode live, réécriture de CV) nécessitent une clé API. Sans elle, le reste de l'application fonctionne normalement — ces boutons affichent juste un message clair au lieu de planter.

```bash
cp .env.example .env
```

Puis renseigne ta clé dans `.env` :

```
ANTHROPIC_API_KEY=sk-ant-ta-cle
```

Clé à récupérer sur [platform.claude.com](https://platform.claude.com) (Billing → penser à fixer un plafond de dépense, puis API Keys → Create Key).

## Configuration (paiements Stripe — optionnel)

Sans ces variables, l'app fonctionne normalement : le bouton "S'abonner premium (paiement réel via Stripe)" affiche un message d'indisponibilité clair au lieu de planter (l'activation gratuite par score reste utilisable dans tous les cas).

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_INDIVIDUAL=price_...   # BtoC mensuel, 4,99 €/mois
STRIPE_PRICE_ID_SCHOOL=price_...       # BtoB annuel, 990 €/an

CLIENT_URL=http://127.0.0.1:5174       # URL du front, pour les redirections post-paiement
```

Toutes ces valeurs se trouvent dans le [Dashboard Stripe](https://dashboard.stripe.com/test) (mode test) :

- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` : Developers → API keys
- `STRIPE_PRICE_ID_INDIVIDUAL` / `STRIPE_PRICE_ID_SCHOOL` : Product catalog → créer un produit avec un prix récurrent (mensuel pour l'un, annuel pour l'autre) → copier l'ID du prix (`price_...`)
- `STRIPE_WEBHOOK_SECRET` : voir la section suivante, il n'existe qu'une fois un endpoint webhook créé.

## Configuration (offres réelles France Travail — optionnel)

Sans ces variables, l'app fonctionne normalement avec uniquement les offres de démonstration (`src/data/offers.js`) — la page Offres affiche juste une liste plus courte, aucune erreur.

```
FRANCE_TRAVAIL_CLIENT_ID=ton-identifiant
FRANCE_TRAVAIL_CLIENT_SECRET=ta-cle-secrete
```

1. Crée un compte sur [francetravail.io](https://francetravail.io) (gratuit)
2. Dans le tableau de bord, crée une application → récupère l'**Identifiant** et la **Clé secrète**
3. Dans le catalogue, abonne ton application à **"API Offres d'emploi v2"** (étape distincte de la simple création de compte)

**Pourquoi France Travail et pas LinkedIn/Indeed/Welcome to the Jungle ?** Ces plateformes interdisent explicitement le scraping dans leurs CGU (contentieux documentés, ex. LinkedIn c. hiQ Labs) — les utiliser exposerait le projet à un vrai risque juridique. France Travail (ex-Pôle Emploi) propose au contraire une API officielle, gratuite et conçue pour cet usage : données publiques administratives, ~300 000 offres en temps réel, zéro souci RGPD.

## Lancer en développement

```bash
npm run dev
```

Services lancés :

- Frontend : `http://127.0.0.1:5174` (ou port suivant si occupé)
- API locale : `http://127.0.0.1:8787`
- Données locales PGlite : `server/postgres-data/` ou `server/postgres-runtime/`

Les dossiers de données locales sont ignorés par Git (données utilisateur, fichiers volumineux générés au runtime).

## Paiements (Stripe)

### Installer le CLI Stripe (une seule fois)

Nécessaire pour recevoir les webhooks en local (Stripe ne peut pas appeler `localhost` directement).

```bash
scoop bucket add extras
scoop install stripe-cli
```

(macOS : `brew install stripe/stripe-cli/stripe`. Sans scoop/brew : télécharger le binaire sur la [page de releases GitHub](https://github.com/stripe/stripe-cli/releases/latest).)

Puis connecter le CLI au compte Stripe :

```bash
stripe login
```

### Lancer le forwarding des webhooks

Dans un terminal séparé, à laisser ouvert pendant les tests de paiement :

```bash
stripe listen --forward-to localhost:8787/api/stripe/webhook
```

Affiche un secret `whsec_...` — à copier dans `.env` (`STRIPE_WEBHOOK_SECRET`). **Ce secret change à chaque relance de la commande** : il faut le remettre à jour dans `.env` si le terminal a été fermé puis rouvert.

### Tester un paiement de bout en bout

1. `npm run dev` (API + front)
2. `stripe listen --forward-to localhost:8787/api/stripe/webhook` (terminal séparé)
3. Se connecter dans l'app → onglet Profil → "S'abonner premium (paiement réel via Stripe)"
4. Sur la page Stripe Checkout, utiliser une carte de test : `4242 4242 4242 4242`, n'importe quelle date d'expiration future, n'importe quel CVC
5. Après paiement, redirection vers l'app (`?checkout=success` dans l'URL, nettoyé automatiquement) et statut premium mis à jour après réception du webhook (l'app retente la lecture du statut pendant quelques secondes si besoin)

### Tarification

Deux prix Stripe distincts, sélectionnés automatiquement selon le type de compte (`role_type`) :

| Type de compte | Tarif | Fréquence | Variable `.env` |
|---|---|---|---|
| `school` | 990 € | Annuel (BtoB) | `STRIPE_PRICE_ID_SCHOOL` |
| Tous les autres (`candidate`, `student`, `recruiter_firm`, `recruiter_internal`, `company`, `coach`, `other`) | 4,99 € | Mensuel (BtoC) | `STRIPE_PRICE_ID_INDIVIDUAL` |

La date de renouvellement affichée dans l'app est lue directement depuis Stripe (`current_period_end`) au moment du webhook, plutôt que recalculée côté app — nécessaire pour distinguer correctement un renouvellement mensuel d'un renouvellement annuel.

### Endpoints

- `POST /api/stripe/create-checkout-session` : crée une session Stripe Checkout pour l'utilisateur, redirige vers la page de paiement Stripe.
- `POST /api/stripe/webhook` : reçoit les événements Stripe (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`), signature vérifiée via `STRIPE_WEBHOOK_SECRET`, met à jour `subscription_json` en base.

La logique métier (sélection du prix, construction des paramètres Checkout, traitement des événements webhook) est isolée dans `server/stripeService.js`, testée unitairement sans avoir besoin d'un vrai serveur ni d'une vraie connexion Stripe (voir [Tests](#scripts-npm)).

### Fiscalité (TVA OSS)

`automatic_tax: { enabled: true }` est activé sur la session Checkout, ce qui prépare le calcul automatique de la TVA due selon le pays du client (particulier UE en B2C ; les écoles en B2B relèvent normalement de l'autoliquidation, hors OSS). **Ce paramètre reste sans effet tant qu'aucune inscription fiscale réelle n'est ajoutée dans le Dashboard Stripe (Tax → Registrations)** — Stripe ne collecte la taxe que sur les juridictions où une inscription active existe. L'inscription au guichet unique OSS auprès de l'administration fiscale française (via impots.gouv.fr) est un préalable administratif réel, non technique, volontairement non engagé tant que l'app reste en mode test sans client facturé.

## Offres réelles (France Travail)

En complément des offres de démonstration (`src/data/offers.js`), la page Analyse interroge l'[API Offres d'emploi v2 de France Travail](https://francetravail.io) (ex-Pôle Emploi) pour proposer de vraies offres, filtrées par mots-clés dérivés du rôle visé ou des compétences détectées dans le CV.

### Endpoint

`GET /api/offers/live?motsCles=...&commune=...` — authentification OAuth2 (client_credentials) auprès de France Travail, résultats mis en cache 10 minutes côté serveur (la recherche n'a pas besoin d'être seconde-fraîche, et ça évite de dépasser la limite de débit de l'API : 3 requêtes/seconde). Si `FRANCE_TRAVAIL_CLIENT_ID`/`SECRET` sont absents ou que l'appel échoue, retourne une liste vide plutôt qu'une erreur bloquante — le front se rabat silencieusement sur les offres de démonstration.

### Mapping des données

Les offres renvoyées par l'API n'ont pas la même forme que notre schéma interne (`skills` comme dictionnaire de mots-clés comparables, pas les phrases longues renvoyées par le champ `competences` de l'API). `server/franceTravailService.js` retraite chaque offre :

- **Compétences** : ré-extraites du texte libre (intitulé + description) avec le même dictionnaire `SKILL_KEYWORDS`/`SKILL_SYNONYMS` que le parsing de CV, pour rester comparables par `matchingService`.
- **Expérience minimale** et **niveau d'études** : estimation heuristique depuis les champs libres de l'API (`experienceLibelle`, `formations`) — best-effort assumé, moins fin que le parsing de CV (pas d'analyse de plages de dates).
- **Missions** : découpées depuis la description libre (l'API ne renvoie pas de liste structurée).

Chaque offre réelle porte un tag "📡 Offre réelle · France Travail" et, si disponible, un lien vers l'annonce d'origine pour postuler.

### Pourquoi pas LinkedIn/Indeed/Welcome to the Jungle ?

Ces plateformes interdisent explicitement la collecte automatisée dans leurs CGU — contentieux documentés (LinkedIn c. hiQ Labs), rupture de contrat, bannissement possible même sur des données publiques. France Travail propose à l'inverse une API officielle et gratuite, conçue pour ce cas d'usage précis, sans les risques juridiques du scraping.

## Scripts npm

- `npm run dev` : lance l'API locale et le frontend en parallèle.
- `npm run dev:api` : lance seulement l'API Express.
- `npm run dev:client` : lance seulement Vite.
- `npm run build` : génère le build frontend.
- `npm run preview` : sert le build localement.
- `npm test` : lance la suite de tests (vitest, une fois, sans watch).
- `npm run test:watch` : lance vitest en mode watch.
- `npm run test:coverage` : lance les tests avec rapport de couverture.

## CI/CD

Un workflow GitHub Actions (`.github/workflows/tests.yml`) s'exécute automatiquement à chaque `push` et chaque `pull request` vers `main`/`master` :

1. Installation des dépendances (`npm ci`)
2. Suite de tests (`npm test`) — le workflow échoue si un test échoue
3. Rapport de couverture (`npm run test:coverage`), publié comme artefact téléchargeable depuis l'onglet Actions (non bloquant, aucun seuil minimal configuré pour l'instant)
4. Vérification que le build frontend passe (`npm run build`)

Point d'attention si tu déplaces les fichiers : le workflow suppose que `package.json` est dans `career-web-react/` (pas à la racine du dépôt GitHub) via `defaults.run.working-directory`. Si tu changes cette arborescence, adapte aussi `cache-dependency-path` et le `path` de l'étape de publication de couverture dans le workflow, qui ne suivent pas ce défaut automatiquement (il ne s'applique qu'aux étapes `run:`, pas aux étapes `uses:`).

## Build de production

```bash
npm run build
```

Le build est généré dans `dist/` (non versionné). Pour tester localement : `npm run preview` (`http://127.0.0.1:4174`).

## Architecture

```text
.
|-- .github/
|   `-- workflows/
|       `-- tests.yml      # CI/CD : tests + build à chaque push/PR
|-- server/
|   |-- index.js          # API Express + PGlite + endpoints IA (Claude) + Stripe
|   |-- stripeService.js  # Logique métier Stripe (Checkout, webhook) — testable en isolation
|   |-- franceTravailService.js  # Client France Travail (auth, recherche, mapping) — testable en isolation
|   `-- __tests__/
|       |-- stripeService.test.js
|       `-- franceTravailService.test.js
|-- src/
|   |-- App.jsx            # Composant racine et toutes les pages
|   |-- data/
|   |   |-- offers.js       # Offres de démonstration (12, multi-secteurs : tech/data/IA, marketing, finance, vente, RH, design, juridique)
|   |   `-- skills.js       # Vocabulaire de compétences multi-secteurs, domaines, synonymes
|   |-- lib/
|   |   |-- cvService.js         # Extraction CV (PDF/DOCX/texte), export PDF/txt
|   |   |-- matchingService.js   # Scoring CV/offre, filtres, pondération
|   |   |-- interviewScripts.js  # Scripts de questions par persona
|   |   |-- interviewEvaluation.js # Évaluation heuristique + rapport PDF
|   |   |-- liveInterview.js     # Reconnaissance/synthèse vocale, niveau micro
|   |   `-- inMemoryDb.js        # Client API (malgré son nom, appelle le serveur)
|   `-- styles.css
`-- .env.example           # Modèle de configuration (clés API, Stripe)
```

Le frontend ne parle qu'à l'API locale (`inMemoryDb.js`), qui elle-même persiste dans PGlite et, pour les fonctionnalités IA, appelle l'API Claude côté serveur (la clé n'est jamais exposée au navigateur).

### Suppression de compte (droit à l'effacement)

`POST /api/account/delete` (ré-authentification par mot de passe requise) supprime physiquement les lignes de l'utilisateur dans toutes les tables qui le concernent, avant de supprimer la ligne `users` elle-même :

```text
ai_usage_log → interview_attempts → offer_status → match_runs → cvs
→ sessions → user_org_profiles → user_recruiter_profiles
→ user_candidate_profiles → user_accounts → users
```

Aucune contrainte de clé étrangère n'étant appliquée par PGlite, la suppression est faite explicitement table par table côté serveur plutôt que par une cascade SQL automatique.

## Limites connues

Assumées comme trajectoire de MVP plutôt que dissimulées :

- **Extraction et matching heuristiques** : dictionnaire de mots-clés + regex, pas de NER ni d'embeddings sémantiques. Un CV ou une offre avec un vocabulaire non couvert peut être mal évalué.
- **Extraction PDF/DOCX** : fonctionne pour du texte natif ; un PDF scanné (image) ne donnera rien d'exploitable.
- **Mode entretien live** : reconnaissance et synthèse vocales fiables sur Chrome/Edge uniquement (support partiel/absent sur Firefox/Safari selon versions).
- **Paiement Stripe : deux tarifs seulement** : distinction école (annuel, BtoB) vs tout le reste (mensuel, BtoC). Les 3 formules particulier évoquées pour une segmentation plus fine restent une évolution future non implémentée.
- **Quota gratuit aligné sur le mois calendaire, pas sur la date d'activation** : les 3 analyses gratuites (et donc l'accès premium gratuit qui en dépend) se réinitialisent au 1er de chaque mois, pas 30 jours après le clic sur "Activer l'offre premium" — un utilisateur qui active tardivement dans le mois peut voir son quota se réinitialiser plus vite qu'attendu.
- **Offres de démonstration seedées une seule fois** : `src/data/offers.js` n'est chargé dans PGlite qu'au tout premier démarrage (table vide). Modifier ce fichier sur une installation déjà lancée n'a aucun effet tant que `server/postgres-data/` (ou `postgres-runtime/`) n'est pas supprimé pour forcer un nouveau seed.
- **Fonctionnalités IA à coût réel** : chaque appel (analyse approfondie, mode live, réécriture CV) consomme l'API Claude ; sans clé configurée, ces boutons restent inactifs avec un message explicite plutôt que de planter.
- **Conformité fiscale (TVA OSS) non traitée** : le calcul automatique est prêt côté code (`automatic_tax: { enabled: true }` sur la session Checkout, cf. [Paiements (Stripe)](#paiements-stripe)), mais reste sans effet tant que l'inscription réelle au guichet unique OSS n'est pas faite auprès de l'administration fiscale (Stripe ne collecte la taxe que sur les juridictions où une inscription active est enregistrée dans son dashboard). Mis de côté volontairement tant qu'aucun client n'est facturé réellement — à traiter avant toute sortie du mode test. (Le DPA Stripe, vérifié en parallèle, s'est avéré déjà couvert par défaut : il fait partie intégrante du Stripe Services Agreement accepté à la création du compte, aucune signature séparée n'est nécessaire — cf. [stripe.com/legal/dpa/faqs](https://stripe.com/legal/dpa/faqs).)
- **CI/CD limité aux tests + build** : le pipeline (voir [CI/CD](#cicd)) vérifie que les tests passent et que le build fonctionne, mais ne déploie rien automatiquement (pas de CD à proprement parler) et ne couvre que la logique métier déjà testée (`server/stripeService.js`, `server/franceTravailService.js` + `src/lib/`), pas l'ensemble de l'application.
- **Mapping France Travail best-effort** : expérience minimale et niveau d'études des offres réelles sont estimés heuristiquement depuis des champs texte libre, moins fiable que le parsing de CV (pas d'analyse de plages de dates). Les compétences sont ré-extraites du texte libre avec le même dictionnaire que le CV plutôt qu'utilisées telles quelles (le format natif de l'API n'est pas comparable).

## Données et fichiers sensibles

Ne pas versionner :

- `node_modules/`, `dist/`
- `.env` (contient les clés API : Anthropic, Stripe)
- logs, caches
- bases locales PGlite : `postgres-data*`, `pgdata`, `postgres-runtime`
- fichiers de secrets (certificats, clés privées, dumps de base de données)

Avant chaque commit, vérifier `git status` pour confirmer qu'aucun fichier sensible ou généré n'est ajouté.
