# assistant-entretiens-rag

Assistant RAG (Retrieval-Augmented Generation) de préparation aux entretiens
d'embauche — RH, technique, direction. Projet académique : chaque brique
(chunking, embeddings, base vectorielle, prompt, appel LLM) est implémentée
à la main, sans LangChain ni LlamaIndex.

## Avertissement

Chaque réponse générée par l'assistant inclut la mention suivante :

> Cet assistant propose des conseils génériques de préparation et ne
> remplace pas un accompagnement RH ou un coach carrière personnalisé.

## Démarrage rapide

```bash
# 1. Environnement + dépendances
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 2. Configuration (clé Groq)
copy .env.example .env         # puis renseigner GROQ_API_KEY dans .env

# 3. Indexation du corpus (nécessaire une seule fois, sauf modification du corpus)
python -m src.indexing.build_index

# 4. Lancement — au choix
python -m src.web.server       # interface web -> http://127.0.0.1:8000
python -m src.cli.main         # ou version terminal
```

| Étape | Commande |
|---|---|
| Créer l'environnement | `python -m venv venv` puis `venv\Scripts\activate` |
| Installer les dépendances | `pip install -r requirements.txt` |
| Configurer la clé API | `copy .env.example .env` puis éditer `.env` |
| Indexer le corpus | `python -m src.indexing.build_index` |
| Lancer en web | `python -m src.web.server` → http://127.0.0.1:8000 |
| Lancer en terminal | `python -m src.cli.main` |

Au premier lancement (web ou CLI), le chargement du modèle d'embedding en
mémoire prend ~15-20 secondes : c'est normal, patiente avant la première
requête.

## Structure du projet

```
data/raw/               Sources brutes non traitées
data/processed/          corpus.jsonl : corpus indexable (1 document JSON par ligne)
vectordb/                 Base vectorielle ChromaDB persistée (+ meta.json)
src/ingestion/            Chargement et nettoyage des sources
src/chunking/              Découpage des documents en chunks
src/indexing/                Embeddings + construction de l'index vectoriel
src/retrieval/               Recherche sémantique dans l'index
src/generation/               Construction du prompt + appel au LLM (Groq) + logique d'entretien
src/cli/                        Point d'entrée en ligne de commande
src/web/                        Petite plateforme web locale de test (http.server + page de chat)
tests/eval_questions.json        Jeu de questions d'évaluation
```

## Modèle de données

Chaque document du corpus possède les champs :

| Champ            | Description                                              |
|-------------------|-----------------------------------------------------------|
| `id`              | Identifiant unique du document                            |
| `texte`           | Contenu du conseil / de la réponse type                   |
| `type_entretien`  | `RH` \| `technique` \| `direction`                         |
| `sous_theme`      | Thème précis (ex: `methode_star`, `pretentions_salariales`)|
| `domaine`         | `générique` \| `tech` \| `commerce` \| `finance` \| `industrie` \| ... |
| `source`          | Origine du document                                        |

## Installation

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # puis renseigner GROQ_API_KEY
```

## Utilisation

```bash
# Construire l'index vectoriel à partir de data/processed/corpus.jsonl
python -m src.indexing.build_index

# Rechercher dans l'index (rechargé depuis le disque, sans réindexation)
python -m src.retrieval.search "Comment répondre à la question sur mes défauts ?"

# Évaluer la qualité de la recherche sur tests/eval_questions.json
python -m tests.run_eval
```

Le modèle d'embedding utilisé par défaut est `paraphrase-multilingual-MiniLM-L12-v2`
(sentence-transformers, multilingue). Son nom est enregistré dans
`vectordb/meta.json` lors de l'indexation et relu automatiquement lors de la
recherche, afin que la requête soit toujours encodée avec le même modèle que
le corpus indexé.

## État d'avancement

- [x] Ingestion / chunking / indexation / recherche (structure + corpus RH initial)
- [x] Génération de prompt et appel LLM (Groq)
- [x] CLI interactive

## Utilisation (assistant complet)

```bash
python -m src.cli.main
```

Pose une question, choisis éventuellement un type d'entretien (RH / technique
/ direction) et un domaine, et l'assistant renvoie une réponse construite à
partir des chunks les plus pertinents du corpus, générée par Groq, avec la
mention de non-substitution systématiquement ajoutée à la fin.

## Plateforme de test web

```bash
python -m src.web.server
# puis ouvrir http://127.0.0.1:8000
```

Petite interface de chat locale pour tester la simulation d'entretien sans
passer par le terminal : choix du type d'entretien, du domaine et,
optionnellement, collage du texte d'une offre d'emploi réelle pour que le
recruteur simulé se mette dans la peau de l'entreprise et ancre ses
questions sur ce poste précis (intitulé, missions, stack, contexte).
Implémentée uniquement avec la bibliothèque standard Python (`http.server`)
côté serveur et une page HTML/CSS/JS statique côté client, sans nouvelle
dépendance. Usage local mono-utilisateur (une seule session en mémoire à la
fois). Le CLI (`python -m src.cli.main`) propose la même option.
