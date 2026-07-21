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

**Analyse**
- Score de compatibilité CV/offre, couleurs par niveau (rouge/orange/bleu/vert).
- Compatibilité par domaine dynamique (jusqu'à 6 domaines les plus pertinents parmi ~12 secteurs couverts : tech/data, marketing, finance, vente, RH, design...).
- Points forts / points à combler.

**Offres**
- Matching pondéré (compétences avec distinction obligatoire/atout, expérience, niveau d'études, localisation, rôle/secteur visé).
- Recherche et filtres (compétence, secteur, localisation), tri (score / entreprise / favoris).
- Favoris et suivi "déjà postulé", persistés par utilisateur.
- Gating premium sur certaines offres.

**CV+**
- Recommandations automatiques (accroche, quantification des résultats, verbes d'action, coordonnées manquantes, mobilité...).
- Export du CV optimisé en PDF (généré localement, `jsPDF`) ou en texte brut.
- **Réécriture du CV par IA** (premium) : reformulation ciblée sur l'offre analysée, via l'API Claude.

**Entretiens**
- Mode texte : simulation par persona (RH, Manager technique, Live coding), évaluation heuristique instantanée de chaque réponse (mots-clés, longueur, structure STAR) + bouton d'analyse approfondie par IA à la demande (3 gratuites/mois, illimité en premium).
- **Mode live (premium)** : conversation orale avec avatar animé — reconnaissance vocale et synthèse vocale du navigateur, questions générées par IA adaptées à l'offre ciblée, avatar réactif au niveau sonore réel du micro.
- Historique complet des sessions et rapport PDF téléchargeable par entretien.

## Fonctionnalités premium

- Réécriture de CV par IA
- Mode entretien live (avatar + voix)
- Offres marquées "Premium" débloquées
- Analyses IA illimitées (au-delà de 3/mois gratuites)

L'éligibilité premium est calculée automatiquement selon la complétude du profil (aucune intégration de paiement à ce stade — voir Limites connues).

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

## Lancer en développement

```bash
npm run dev
```

Services lancés :

- Frontend : `http://127.0.0.1:5174` (ou port suivant si occupé)
- API locale : `http://127.0.0.1:8787`
- Données locales PGlite : `server/postgres-data/` ou `server/postgres-runtime/`

Les dossiers de données locales sont ignorés par Git (données utilisateur, fichiers volumineux générés au runtime).

## Scripts npm

- `npm run dev` : lance l'API locale et le frontend en parallèle.
- `npm run dev:api` : lance seulement l'API Express.
- `npm run dev:client` : lance seulement Vite.
- `npm run build` : génère le build frontend.
- `npm run preview` : sert le build localement.

## Build de production

```bash
npm run build
```

Le build est généré dans `dist/` (non versionné). Pour tester localement : `npm run preview` (`http://127.0.0.1:4174`).

## Architecture

```text
.
|-- server/
|   `-- index.js          # API Express + PGlite + endpoints IA (Claude)
|-- src/
|   |-- App.jsx            # Composant racine et toutes les pages
|   |-- data/
|   |   |-- offers.js       # Offres de démonstration
|   |   `-- skills.js       # Vocabulaire de compétences multi-secteurs, domaines, synonymes
|   |-- lib/
|   |   |-- cvService.js         # Extraction CV (PDF/DOCX/texte), export PDF/txt
|   |   |-- matchingService.js   # Scoring CV/offre, filtres, pondération
|   |   |-- interviewScripts.js  # Scripts de questions par persona
|   |   |-- interviewEvaluation.js # Évaluation heuristique + rapport PDF
|   |   |-- liveInterview.js     # Reconnaissance/synthèse vocale, niveau micro
|   |   `-- inMemoryDb.js        # Client API (malgré son nom, appelle le serveur)
|   `-- styles.css
`-- .env.example           # Modèle de configuration (clé API)
```

Le frontend ne parle qu'à l'API locale (`inMemoryDb.js`), qui elle-même persiste dans PGlite et, pour les fonctionnalités IA, appelle l'API Claude côté serveur (la clé n'est jamais exposée au navigateur).

## Limites connues

Assumées comme trajectoire de MVP plutôt que dissimulées :

- **Extraction et matching heuristiques** : dictionnaire de mots-clés + regex, pas de NER ni d'embeddings sémantiques. Un CV ou une offre avec un vocabulaire non couvert peut être mal évalué.
- **Extraction PDF/DOCX** : fonctionne pour du texte natif ; un PDF scanné (image) ne donnera rien d'exploitable.
- **Mode entretien live** : reconnaissance et synthèse vocales fiables sur Chrome/Edge uniquement (support partiel/absent sur Firefox/Safari selon versions).
- **Pas d'intégration de paiement** : le statut premium est calculé par règle métier (complétude du profil), pas par un abonnement payant réel.
- **Fonctionnalités IA à coût réel** : chaque appel (analyse approfondie, mode live, réécriture CV) consomme l'API Claude ; sans clé configurée, ces boutons restent inactifs avec un message explicite plutôt que de planter.

## Données et fichiers sensibles

Ne pas versionner :

- `node_modules/`, `dist/`
- `.env` (contient la clé API)
- logs, caches
- bases locales PGlite : `postgres-data*`, `pgdata`, `postgres-runtime`
- fichiers de secrets (certificats, clés privées, dumps de base de données)

Avant chaque commit, vérifier `git status` pour confirmer qu'aucun fichier sensible ou généré n'est ajouté.
