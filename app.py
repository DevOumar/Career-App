import streamlit as st

st.set_page_config(page_title="LaunchMe · Accenture GenAI", page_icon="🚀", layout="wide")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
* { font-family: 'DM Sans', sans-serif; }
.stApp { background: #08080c; color: #f0eee8; }
[data-testid="stSidebar"] { background: #0f0f15 !important; border-right: 1px solid #1e1e2e; }
#MainMenu, footer, header { visibility: hidden; }

.title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.7rem;
         letter-spacing: -0.03em; margin-bottom: 0.2rem; }
.title span { color: #6c47ff; }
.sub { color: #7a7890; font-size: 0.88rem; margin-bottom: 1.5rem; }

.q-box { background: #0f0f15; border: 1px solid #2a2a3d; border-left: 3px solid #6c47ff;
         border-radius: 0 10px 10px 0; padding: 1rem 1.2rem; margin-bottom: 0.8rem;
         font-size: 0.88rem; line-height: 1.6; }
.q-who { font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
         letter-spacing: 0.06em; color: #7a7890; margin-bottom: 0.4rem; }

.a-box { background: #13131a; border: 1px solid #2a2a3d; border-left: 3px solid #22c55e;
         border-radius: 0 10px 10px 0; padding: 1rem 1.2rem; margin-bottom: 0.5rem;
         font-size: 0.85rem; line-height: 1.65; color: #d4d0c8; }
.a-who { font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
         letter-spacing: 0.06em; color: #4ade80; margin-bottom: 0.4rem; }

.tip-box { background: rgba(108,71,255,0.08); border: 1px solid rgba(108,71,255,0.25);
           border-radius: 10px; padding: 0.9rem 1.1rem; font-size: 0.81rem;
           color: #c4b5fd; line-height: 1.55; margin-top: 0.3rem; }

.bilan-box { background: #0a140a; border: 1px solid rgba(34,197,94,0.3);
             border-radius: 12px; padding: 1.3rem; margin-top: 0.5rem; }

.tag { display: inline-block; font-size: 0.68rem; font-weight: 600;
       padding: 0.18rem 0.55rem; border-radius: 100px; margin: 0.1rem; }
.tp { background: rgba(108,71,255,0.2); color: #a78bfa; border: 1px solid rgba(108,71,255,0.3); }
.tg { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.to { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
.tr { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
</style>
""", unsafe_allow_html=True)

# ── DATA ───────────────────────────────────────────────────────────────────

INTERVIEWS = {

  "🤝 RH · Motivation": {
    "who": "Camille · RH Accenture France",
    "duree": "20 min",
    "color": "#14b8a6",
    "tags": ["Motivation", "Soft skills", "Projet pro"],
    "questions": [
      {
        "q": "Bonjour Lina ! Pouvez-vous vous présenter en 2-3 minutes — votre parcours et pourquoi Accenture ?",
        "reponse": """Je suis Lina Benzemma, diplômée d'un Master 2 Data Science & Big Data MOSEF à Paris 1 Sorbonne avec mention Très Bien. J'ai eu deux expériences complémentaires : un stage à l'IFPEN sur des pipelines ML géospatiaux, puis une alternance d'un an chez Sanofi où j'ai développé une application R Shiny pour automatiser des analyses statistiques réglementaires GxP.

Ce qui m'attire chez Accenture, c'est l'échelle des projets : intervenir du PoC à l'industrialisation sur des cas GenAI pour des grands comptes, c'est exactement le type d'impact que je cherche. Je veux sortir du contexte mono-entreprise et me confronter à des problématiques sectorielles variées.""",
        "tip": "💡 Structure : parcours → lien direct avec le poste → pourquoi Accenture spécifiquement (pas juste 'cabinet de conseil'). Mentionner l'alternance Sanofi en premier car c'est la plus récente et la plus longue."
      },
      {
        "q": "Pourquoi la GenAI ? Vous avez un profil ML classique — qu'est-ce qui vous a amenée vers les LLM et l'IA générative ?",
        "reponse": """C'est une évolution naturelle de mon parcours. En master, j'ai travaillé sur du NLP et du Deep Learning. À Sanofi, j'ai commencé à explorer les LLM pour automatiser des rapports analytiques — même si ce n'était pas la mission principale, j'ai vu concrètement ce que ça pouvait apporter.

Ce qui me passionne dans la GenAI, c'est que ça rend la data accessible à des utilisateurs non techniques. Un RAG bien conçu peut transformer le rapport d'un analyste métier à ses données. C'est un levier d'impact direct que le ML classique n'a pas.""",
        "tip": "💡 Ne pas dire 'c'est la tendance'. Montrer un intérêt genuein avec un exemple concret de curiosité personnelle (side project, veille, expérimentation). Mentionner l'IA générative dans les skills du CV est un bon ancrage."
      },
      {
        "q": "Accenture c'est du conseil — vous serez chez les clients, avec des contraintes de livrables et de deadlines. Comment vous positionnez-vous par rapport à ça ?",
        "reponse": """J'ai déjà travaillé dans deux environnements très contraints : Sanofi avec les standards GxP (réglementation pharmaceutique stricte, documentation obligatoire) et l'IFPEN avec des livrables pour des équipes pluridisciplinaires. Dans les deux cas, j'ai appris à cadrer mes deliverables, à communiquer régulièrement sur l'avancement et à adapter mon niveau de détail selon l'interlocuteur — géologue, pharmacien ou manager.

Le conseil, ça me correspond : j'aime les nouveaux contextes, apprendre vite sur un nouveau domaine métier et avoir un impact visible.""",
        "tip": "💡 Le RH veut tester ta résilience face au rythme conseil. Montre que tu sais gérer des contraintes et t'adapter — les exemples Sanofi (GxP) et IFPEN (inter-équipes) sont parfaits pour ça."
      },
      {
        "q": "Où vous voyez-vous dans 3 ans ? Quelles sont vos ambitions de carrière ?",
        "reponse": """À 3 ans, je me vois en tant que Data Scientist confirmée spécialisée GenAI, avec des certifications cloud (Azure, GCP) et une vraie expertise sur des architectures RAG et agents IA. Accenture me permettrait d'acquérir cette expertise sur des projets variés — industrie, finance, santé — ce qu'aucune entreprise seule ne peut offrir.

À terme, j'aimerais évoluer vers un rôle de lead technique ou d'architecte IA — concevoir les patterns de solutions plutôt qu'uniquement les implémenter.""",
        "tip": "💡 Montre une ambition alignée avec le modèle Accenture (montée en compétences, certifications, progression interne). Évite de dire 'je veux créer ma startup dans 2 ans'."
      },
    ],
    "bilan": {
      "bien": [
        "Lier l'expérience Sanofi (GxP, Shiny) à la capacité à travailler dans des contextes contraints et réglementés",
        "Montrer un intérêt genuein pour la GenAI avec des exemples concrets, pas juste 'c'est la tendance'",
        "Parler d'impact business, pas juste de technique — c'est ce qu'Accenture veut entendre",
      ],
      "ameliorer": [
        "Prépare une anecdote courte sur un moment difficile / un échec et comment tu l'as surmonté",
        "Prépare 2-3 questions pertinentes à poser au RH sur la culture équipe, les formations GenAI proposées",
        "Mentionne Blagnac / mobilité géographique si c'est pertinent — le poste est à Blagnac (Toulouse)",
      ],
      "conseil": "Ouvre avec : 'J'ai déjà livré une application data dans un cadre réglementaire chez Sanofi — chez Accenture je veux faire la même chose mais à l'échelle grands comptes.' Ça accroche immédiatement."
    }
  },

  "🧑‍💼 N+1 · Manager technique": {
    "who": "Thomas · Manager Data & AI · Accenture",
    "duree": "45 min",
    "color": "#6c47ff",
    "tags": ["Projets passés", "Méthodologie GenAI", "Architecture"],
    "questions": [
      {
        "q": "Parlez-moi d'un projet ML ou IA que vous avez mené de A à Z. Qu'est-ce qui vous a posé le plus de difficultés ?",
        "reponse": """Chez Sanofi, j'ai développé seule une application R Shiny pour automatiser les calculs statistiques de backtesting des modèles analytiques R&D. La difficulté principale était double : d'abord comprendre les calculs GxP que je ne connaissais pas du tout (j'ai dû me former rapidement avec les experts internes), ensuite rendre l'app adoptable par des utilisateurs non data — des pharmacologues.

J'ai résolu ça en faisant des sessions de travail hebdomadaires avec les utilisateurs finaux dès le départ, pas à la fin. Résultat : l'app a été adoptée par plusieurs équipes R&D au-delà de l'équipe commanditaire.""",
        "tip": "💡 Utilise STAR. Le point le plus important : montrer que tu sais livrer quelque chose qui est vraiment utilisé — pas juste un notebook. L'adoption multi-équipes chez Sanofi est ton argument le plus fort."
      },
      {
        "q": "Expliquez-moi ce qu'est un RAG et comment vous l'implémenteriez pour un cas client concret — par exemple un assistant qui répond à des questions sur des contrats.",
        "reponse": """Un RAG (Retrieval-Augmented Generation) combine deux briques : un moteur de recherche sémantique et un LLM. Au lieu de demander au LLM de tout mémoriser, on lui fournit dynamiquement les documents pertinents au moment de la question.

Pour un assistant sur des contrats : je commencerais par chunker les contrats PDF en passages de 500-1000 tokens, les encoder avec un modèle d'embedding (text-embedding-ada-002 d'OpenAI ou un modèle open source), les stocker dans une base vectorielle (Chroma, Pinecone ou Azure AI Search). À chaque question utilisateur, je récupère les k passages les plus similaires (cosine similarity) et je les injecte dans le prompt du LLM avec une instruction claire : 'Réponds uniquement à partir de ces extraits'.

Les points d'attention : la qualité du chunking (ne pas couper au milieu d'une clause), le prompt engineering pour éviter les hallucinations, et l'évaluation (est-ce que les bonnes sources sont bien retrouvées ?).""",
        "tip": "💡 C'est LA question centrale pour ce poste. Montre que tu connais le pipeline complet : chunking → embedding → vector store → retrieval → prompt → LLM. Cite des outils réels (LangChain, LlamaIndex, Azure AI Search). Ne pas se contenter de la définition."
      },
      {
        "q": "Quelle est la différence entre fine-tuning et prompt engineering ? Dans quel cas choisissez-vous l'un ou l'autre ?",
        "reponse": """Le prompt engineering, c'est guider le comportement du modèle via les instructions dans le prompt — few-shot examples, chain of thought, persona. C'est rapide, peu coûteux, et suffisant pour la majorité des cas d'usage.

Le fine-tuning, c'est réentraîner le modèle sur tes propres données pour modifier ses poids. C'est nécessaire quand : le modèle doit adopter un style très spécifique (ton d'une marque), quand le domaine est très technique (vocabulaire médical propriétaire), ou quand tu as des contraintes de latence et de coût qui ne permettent pas des prompts très longs.

Mon approche par défaut : commencer toujours par le prompt engineering + RAG. Le fine-tuning, c'est en dernier recours car il est coûteux, difficile à maintenir, et souvent le RAG suffit.""",
        "tip": "💡 Accenture veut des gens pragmatiques. La bonne réponse c'est 'prompt engineering d'abord' — montre que tu ne sur-ingénières pas. Mentionne aussi RLHF si tu le connais."
      },
      {
        "q": "Vous avez Azure et GCP dans votre CV. Comment évalueriez-vous les services GenAI d'Azure OpenAI vs Vertex AI de Google ?",
        "reponse": """Azure OpenAI est la solution enterprise la plus mature actuellement : accès aux modèles GPT-4 avec des garanties de sécurité et de conformité RGPD, intégration native dans l'écosystème Microsoft (Teams, SharePoint, Fabric), et des outils MLOps bien établis. C'est le choix naturel pour les clients qui sont déjà sur Azure.

Vertex AI de Google est très fort sur les modèles multimodaux (Gemini) et sur l'intégration avec BigQuery pour du RAG sur de gros volumes de données structurées. L'écosystème est très puissant mais la courbe d'apprentissage est plus raide.

Dans la pratique chez un client grand compte, le choix est souvent dicté par le cloud provider existant. Mon rôle c'est de connaître les deux et d'adapter mes architectures.""",
        "tip": "💡 Accenture travaille sur les deux — ne prends pas parti. Montre que tu es cloud-agnostic et que tu sais adapter ta stack au contexte client. Ta certi AZ-900 est un bon point d'ancrage."
      },
    ],
    "bilan": {
      "bien": [
        "Expliquer le RAG de façon structurée avec des outils concrets (LangChain, Pinecone, Azure AI Search)",
        "Montrer une approche pragmatique : prompt engineering avant fine-tuning",
        "Démontrer une vision cloud-agnostic Azure / GCP adaptée au contexte Accenture",
      ],
      "ameliorer": [
        "Creuse les frameworks d'agents IA (LangGraph, AutoGen, CrewAI) — c'est mentionné dans l'offre (IA Agentique)",
        "Prépare un exemple de prompt engineering réel que tu as fait — montre le prompt, explique tes choix",
        "Revoir l'évaluation des LLM : RAGAS, métriques de faithfulness, relevance — souvent demandé",
      ],
      "conseil": "Viens avec un side project GenAI sur GitHub (même petit : un RAG sur des PDFs, un agent simple). C'est la preuve la plus convaincante que tu pratiques vraiment."
    }
  },

  "💻 Technique · Live coding": {
    "who": "Sarah · Lead Data Scientist · Accenture",
    "duree": "60 min",
    "color": "#ef4444",
    "tags": ["Python", "NLP/GenAI", "Architecture LLM"],
    "questions": [
      {
        "q": "Python rapide : Écrivez une fonction qui prend une liste de textes et retourne un dictionnaire avec le texte comme clé et le nombre de mots comme valeur.",
        "reponse": """```python
def count_words(texts: list[str]) -> dict[str, int]:
    return {text: len(text.split()) for text in texts}

# Exemple
texts = ["Bonjour le monde", "Python est super", "GenAI"]
print(count_words(texts))
# {'Bonjour le monde': 3, 'Python est super': 3, 'GenAI': 1}
```

Si on veut être plus robuste (gérer les espaces multiples, la ponctuation) :

```python
import re

def count_words(texts: list[str]) -> dict[str, int]:
    return {
        text: len(re.findall(r'\\b\\w+\\b', text.lower()))
        for text in texts
    }
```""",
        "tip": "💡 Montre que tu penses directement en compréhension de dict (pythonic). Bonus : proposer la version robuste avec regex sans qu'on te le demande — ça montre ton niveau."
      },
      {
        "q": "Comment calculez-vous la similarité entre deux textes ? Codez une fonction simple.",
        "reponse": """```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

def cosine_similarity(text1: str, text2: str) -> float:
    embeddings = model.encode([text1, text2])
    a, b = embeddings[0], embeddings[1]
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

# Exemple
score = cosine_similarity(
    "Le chat mange la souris",
    "Un félin dévore un rongeur"
)
print(f"Similarité : {score:.3f}")  # ~0.82
```

Version sans librairie externe (TF-IDF basique) si on n'a pas sentence-transformers :

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

def tfidf_similarity(text1: str, text2: str) -> float:
    vect = TfidfVectorizer()
    tfidf = vect.fit_transform([text1, text2])
    return sk_cosine(tfidf[0], tfidf[1])[0][0]
```""",
        "tip": "💡 La réponse attendue pour un poste GenAI c'est les embeddings (sentence-transformers ou OpenAI embeddings). TF-IDF c'est la version basique — montre que tu connais les deux et leurs limites."
      },
      {
        "q": "Codez un appel simple à l'API OpenAI pour résumer un texte. Comment le rendriez-vous plus robuste ?",
        "reponse": """```python
from openai import OpenAI
import time

client = OpenAI()  # utilise OPENAI_API_KEY en variable d'env

def summarize(text: str, max_retries: int = 3) -> str:
    prompt = f\"\"\"Résume le texte suivant en 3 phrases maximum.
Sois factuel et concis. Ne fais pas de paraphrase inutile.

Texte :
{text}

Résumé :\"\"\"
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,   # faible pour résumé factuel
                max_tokens=200
            )
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # backoff exponentiel
    
# Usage
text = "Accenture est un cabinet de conseil mondial..."
print(summarize(text))
```

Pour le rendre encore plus robuste : ajouter un timeout, logger les appels, valider la longueur du résumé retourné.""",
        "tip": "💡 Points clés : temperature basse pour une tâche factuelle, retry avec backoff exponentiel, prompt clair avec instruction négative ('ne fais pas de paraphrase'). Montre que tu penses production, pas juste POC."
      },
      {
        "q": "Décrivez l'architecture d'un système RAG pour une entreprise qui veut interroger ses 10 000 documents internes. Quels sont les défis principaux ?",
        "reponse": """**Architecture :**

1. **Ingestion** : Parsing des docs (PDF, Word, HTML) → LangChain DocumentLoaders ou LlamaIndex. Chunking en passages de 512 tokens avec overlap de 50 tokens pour ne pas couper le contexte.

2. **Embedding** : Encodage des chunks avec text-embedding-3-small (OpenAI) ou un modèle open-source (BGE, E5). Stockage dans une base vectorielle : Pinecone ou Azure AI Search pour du cloud-managed, ChromaDB pour du local.

3. **Retrieval** : À chaque query, embedding de la question → top-k chunks (k=5) par cosine similarity. Option : hybrid search (vectoriel + BM25) pour améliorer le recall.

4. **Génération** : Injection des chunks dans le prompt avec GPT-4o. Instruction : répondre uniquement à partir des sources fournies.

**Défis principaux :**
- **Qualité du chunking** : un mauvais découpage casse le sens des passages
- **Hallucinations** : le LLM invente quand les chunks ne contiennent pas la réponse → ajouter "Si tu ne sais pas, dis-le"
- **Évaluation** : mesurer la qualité avec RAGAS (faithfulness, answer relevance, context recall)
- **Sécurité** : filtrer les documents selon les droits d'accès utilisateur avant le retrieval""",
        "tip": "💡 C'est la question architecturale centrale. Montre que tu penses aux 4 étapes (ingestion, embedding, retrieval, génération) ET aux problèmes de prod (hallucinations, évaluation, sécurité). Les candidats qui ne parlent que du 'PoC heureux' sont éliminés."
      },
    ],
    "bilan": {
      "bien": [
        "Code Python clean, pythonic, avec gestion des erreurs — c'est rare et ça se remarque",
        "Architecture RAG complète avec les 4 étapes et les challenges de production",
        "Choisir temperature=0.2 pour une tâche factuelle montre que tu comprends les paramètres LLM",
      ],
      "ameliorer": [
        "Pratique les agents IA avec LangGraph ou AutoGen — c'est dans l'offre et souvent demandé maintenant",
        "Révise l'évaluation des RAG (RAGAS, métriques) — de plus en plus testé en entretien",
        "Prépare un exemple de prompt avec chain-of-thought — demande fréquente en entretien tech GenAI",
      ],
      "conseil": "Parle toujours en termes de trade-offs : 'J'utilise X parce que Y, mais si le contexte était Z je ferais autrement.' Ça montre une vraie maturité d'ingénieur."
    }
  }
}

# ── SIDEBAR ────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("### 🚀 LaunchMe")
    st.markdown("**Lina Benzemma**")
    st.markdown("*Data Scientist GenAI*")
    st.markdown("---")
    st.markdown("**🎯 Poste cible**")
    st.markdown("Data Scientist GenAI F/H")
    st.markdown("Accenture France · CDI · Blagnac")
    st.markdown("---")
    itw_choice = st.radio(
        "Entretien",
        list(INTERVIEWS.keys()),
        label_visibility="collapsed"
    )
    st.markdown("---")
    st.markdown("**Match CV × Offre**")
    st.progress(0.72)
    st.caption("72 / 100 — Bon profil, LLM à renforcer")
    st.markdown("---")
    show_tips = st.toggle("💡 Afficher les conseils", value=True)
    show_answers = st.toggle("✅ Afficher les réponses", value=False)

# ── MAIN ───────────────────────────────────────────────────────────────────

itw = INTERVIEWS[itw_choice]

st.markdown(f'<div class="title">Entretien · <span>{itw_choice.split("·")[1].strip()}</span></div>', unsafe_allow_html=True)
st.markdown(f'<div class="sub">👤 {itw["who"]} &nbsp;·&nbsp; ⏱ {itw["duree"]} &nbsp;·&nbsp; Accenture France · CDI Blagnac</div>', unsafe_allow_html=True)

# Tags
tags_html = " ".join([f'<span class="tag tp">{t}</span>' for t in itw["tags"]])
st.markdown(tags_html, unsafe_allow_html=True)
st.markdown("<br>", unsafe_allow_html=True)

# ── QUESTIONS ─────────────────────────────────────────────────────────────

for i, step in enumerate(itw["questions"]):
    
    with st.expander(f"Question {i+1} — {step['q'][:70]}…", expanded=(i == 0)):

        # Question
        st.markdown(f"""
        <div class="q-box">
            <div class="q-who">🎙 {itw['who'].split('·')[0].strip()}</div>
            {step['q']}
        </div>""", unsafe_allow_html=True)

        col1, col2 = st.columns([1, 1])

        with col1:
            # Réponse modèle
            if show_answers or st.checkbox("Voir la réponse modèle", key=f"ans_{itw_choice}_{i}"):
                st.markdown(f"""
                <div class="a-box">
                    <div class="a-who">✅ Lina — Réponse modèle</div>
                    {step['reponse'].replace(chr(10), '<br>')}
                </div>""", unsafe_allow_html=True)

        with col2:
            # Conseil
            if show_tips or st.checkbox("Voir le conseil", key=f"tip_{itw_choice}_{i}"):
                st.markdown(f'<div class="tip-box">{step["tip"]}</div>', unsafe_allow_html=True)

    st.markdown("")

# ── BILAN ──────────────────────────────────────────────────────────────────

st.markdown("---")
st.markdown(f'<div class="title">🎯 Bilan coaching — <span>{itw_choice.split("·")[1].strip()}</span></div>', unsafe_allow_html=True)

bilan = itw["bilan"]
col_b, col_w, col_k = st.columns(3)

with col_b:
    st.markdown("**✅ Points forts**")
    for p in bilan["bien"]:
        st.markdown(f"→ {p}")

with col_w:
    st.markdown("**⚠️ À améliorer**")
    for p in bilan["ameliorer"]:
        st.markdown(f"→ {p}")

with col_k:
    st.markdown("**💡 Conseil clé**")
    st.info(bilan["conseil"])