export const INTERVIEW_SCRIPTS = {
  rh: {
    label: "RH · Motivation",
    meta: {
      avatar: "SO",
      name: "Sophie · RH Senior · Accenture France",
      subtitle: "Entretien RH · Motivation & soft skills"
    },
    feedback: {
      positive: [
        "Relier tes expériences à des résultats concrets.",
        "Montrer une motivation claire pour la GenAI et l'impact business.",
        "Illustrer ta communication avec des équipes non techniques."
      ],
      improve: [
        "Préparer un exemple de situation difficile et ta résolution.",
        "Terminer l'entretien avec 2 questions à valeur (culture, formation, mission).",
        "Clarifier ta disponibilité et ta mobilité géographique."
      ],
      key: "Ancre chaque réponse avec Situation, Action, Résultat."
    },
    steps: [
      {
        question:
          "Bonjour ! Présente ton parcours en 2 minutes, avec un focus sur ce qui te rend pertinente pour ce poste.",
        hint: "Structure : formation -> expériences -> impact -> pourquoi ce rôle.",
        model:
          "Je suis data scientist avec un socle ML fort, et j'ai livré des projets utilisés en production. Je vise ce rôle pour accélérer sur la GenAI en contexte business exigeant."
      },
      {
        question: "Pourquoi la GenAI t'intéresse plus qu'un poste data classique ?",
        hint: "Évite l'effet de mode, parle impact produit et usage métier.",
        model:
          "La GenAI crée un impact direct pour les équipes métier. Je veux construire des assistants utiles, avec évaluation et garde-fous, pas seulement des POC."
      },
      {
        question: "Comment gères-tu la pression et les deadlines ?",
        hint: "Donne un exemple réel avec priorisation et communication.",
        model:
          "Je sécurise d'abord le livrable minimal, puis j'itère. Je communique les risques tôt et je propose des plans B pour tenir les délais."
      }
    ]
  },
  tech: {
    label: "Manager · Technique",
    meta: {
      avatar: "TH",
      name: "Thomas · Manager Data & AI",
      subtitle: "Entretien technique · Architecture & exécution"
    },
    feedback: {
      positive: [
        "Approche claire du pipeline RAG de bout en bout.",
        "Capacité à justifier les choix techniques par le contexte.",
        "Bonne posture cloud-agnostic."
      ],
      improve: [
        "Approfondir les métriques d'évaluation RAG (faithfulness, relevance).",
        "Donner un exemple concret de prompt engineering industrialisable.",
        "Montrer un retour d'expérience sur les coûts et la latence."
      ],
      key: "Parle toujours en trade-offs : qualité, coût, latence, gouvernance."
    },
    steps: [
      {
        question: "Explique comment tu construirais un RAG pour des documents internes.",
        hint: "Ingestion -> chunking -> embeddings -> retrieval -> génération -> évaluation.",
        model:
          "Je structure le pipeline en étapes mesurables et j'ajoute une boucle d'évaluation continue avec un golden dataset."
      },
      {
        question: "Fine-tuning vs prompt engineering : comment choisis-tu ?",
        hint: "Prompt+RAG d'abord ; fine-tuning si besoin de style ou contraintes fortes.",
        model:
          "Je commence par prompt engineering + RAG, plus rapide et moins cher. Je garde le fine-tuning pour les cas où la valeur justifie le coût."
      },
      {
        question: "Comment évalues-tu un système GenAI en production ?",
        hint: "Combiner métriques automatiques + revue humaine + monitoring.",
        model:
          "Je suis la qualité par métriques, erreurs critiques, coût/token, latence et satisfaction utilisateur, avec alertes en cas de régression."
      }
    ]
  },
  code: {
    label: "Live Coding",
    meta: {
      avatar: "SA",
      name: "Sarah · Lead Data Scientist",
      subtitle: "Python · GenAI · fiabilité du code"
    },
    feedback: {
      positive: [
        "Code Python lisible et défendable.",
        "Bonne prise en compte de la robustesse API.",
        "Vision pragmatique des outils LLM."
      ],
      improve: [
        "Prévoir plus de tests unitaires sur les prompts critiques.",
        "Ajouter une politique de retry/circuit breaker détaillée.",
        "Mieux expliciter la gestion de la sécurité des données."
      ],
      key: "Une bonne solution de live coding est simple, testable et robuste."
    },
    steps: [
      {
        question: "Écris une fonction Python qui garde les phrases de plus de 5 mots.",
        hint: "Utilise une compréhension de liste.",
        model:
          "def keep_long(texts):\n    return [t for t in texts if len(t.split()) > 5]"
      },
      {
        question: "Comment gères-tu les retries sur un appel OpenAI en prod ?",
        hint: "Backoff exponentiel + logs + timeout + limite de retries.",
        model:
          "Je combine retry borné, backoff exponentiel, timeout strict et journalisation pour audit et debugging."
      },
      {
        question: "Donne les 3 risques majeurs d'un assistant RAG en entreprise.",
        hint: "Hallucinations, fuite d'info, retrieval de faible qualité.",
        model:
          "Je traite ces risques avec gouvernance d'accès, évaluation continue et prompts contraints par des sources citées."
      }
    ]
  }
};
