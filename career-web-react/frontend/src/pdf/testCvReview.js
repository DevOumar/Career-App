// Données de CV factices pour tester CvDocumentClassicPdf isolément —
// même forme que le cvReview réel (voir CV_EXTRACTION_SCHEMA côté
// backend/index.js et profileToForm côté frontend).
export const testCvReview = {
  firstName: "Camille",
  lastName: "Bertrand",
  email: "camille.bertrand@example.com",
  phone: "06 12 34 56 78",
  location: "Lyon, France",
  linkedinUrl: "https://www.linkedin.com/in/camille-bertrand",
  headline: "Data Scientist — Spécialiste GenAI & RAG",
  summary:
    "Data Scientist avec 4 ans d'expérience en machine learning et data engineering, spécialisée dans la conception de systèmes RAG en production. À l'aise sur l'ensemble du cycle : ingestion, embeddings, évaluation, mise en production.",
  experiences: [
    {
      role: "Data Scientist Senior",
      company: "Acme Corp",
      dates: "2023 — Aujourd'hui",
      description:
        "Conception d'un système RAG pour la recherche documentaire interne, 50 000 documents indexés. Réduction du temps de recherche moyen de 40%. Encadrement de deux alternants sur la partie évaluation (RAGAS)."
    },
    {
      role: "Data Scientist",
      company: "DataWave",
      dates: "2021 — 2023",
      description:
        "Développement de modèles de scoring crédit (scikit-learn, XGBoost) déployés en production sur AWS. Mise en place du pipeline MLOps (CI/CD, monitoring de drift)."
    },
    {
      role: "Stagiaire Data Science",
      company: "IFPEN",
      dates: "2020",
      description: "Pipelines ML géospatiaux pour l'analyse de données de forage."
    }
  ],
  educationItems: [
    {
      school: "Université Paris 1 Panthéon-Sorbonne",
      degree: "Master 2 Data Science & Big Data (MOSEF), mention Très Bien",
      dates: "2019 — 2021"
    },
    {
      school: "Université Lyon 2",
      degree: "Licence MIASHS",
      dates: "2016 — 2019"
    }
  ],
  skills: ["Python", "SQL", "PyTorch", "LangChain", "Azure", "Docker", "Kubernetes"],
  softSkills: ["Communication", "Autonomie", "Esprit critique", "Pédagogie"],
  languages: ["Français (natif)", "Anglais (courant)", "Espagnol (intermédiaire)"],
  certifications: [
    { name: "Azure AI Engineer Associate", issuer: "Microsoft" },
    { name: "Deep Learning Specialization", issuer: "DeepLearning.AI" }
  ],
  interests: ["Course à pied", "Photographie", "Bénévolat associatif"]
};

// Variante volontairement longue — même profil, mais avec 6 expériences à
// description étoffée (le maximum affiché par les deux templates,
// slice(0, 6)), 4 formations (slice(0, 4)) et des listes de compétences
// plus fournies. Sert à observer, sans aucune protection "1 page",
// comment CvDocumentClassicPdf et CvDocumentSidebarPdf débordent
// aujourd'hui (Étape 4 : conception de la garantie 1 page A4).
export const testCvReviewLong = {
  ...testCvReview,
  summary:
    "Data Scientist avec 8 ans d'expérience en machine learning, data engineering et IA générative, spécialisée dans la conception de systèmes RAG et d'agents en production à grande échelle. À l'aise sur l'ensemble du cycle : ingestion, embeddings, évaluation, mise en production, monitoring et amélioration continue. Habituée à travailler avec des équipes pluridisciplinaires (produit, ingénierie, sécurité) sur des projets à fort enjeu réglementaire (secteur bancaire et assurance).",
  experiences: [
    {
      role: "Lead Data Scientist",
      company: "Acme Corp",
      dates: "2023 — Aujourd'hui",
      description:
        "Pilotage de l'équipe IA générative (5 personnes) en charge du système RAG pour la recherche documentaire interne, 50 000 documents indexés et mis à jour quotidiennement. Réduction du temps de recherche moyen de 40% et du taux d'escalade support de 25%. Encadrement de deux alternants sur la partie évaluation (RAGAS, métriques de fidélité et de pertinence). Mise en place d'un pipeline d'ingestion incrémental avec déduplication sémantique. Animation d'ateliers de sensibilisation à l'IA générative pour les équipes métier. Rédaction de la politique interne d'usage responsable de l'IA."
    },
    {
      role: "Data Scientist Senior",
      company: "DataWave",
      dates: "2021 — 2023",
      description:
        "Développement de modèles de scoring crédit (scikit-learn, XGBoost) déployés en production sur AWS et servant plus de 2 millions de décisions par mois. Mise en place du pipeline MLOps (CI/CD, monitoring de drift, ré-entraînement automatique déclenché sur seuil). Collaboration étroite avec les équipes conformité pour garantir l'explicabilité des modèles (SHAP) exigée par le régulateur. Réduction du taux de faux positifs de 18% grâce à un ré-échantillonnage ciblé."
    },
    {
      role: "Data Scientist",
      company: "FinSight Analytics",
      dates: "2019 — 2021",
      description:
        "Conception de tableaux de bord prédictifs pour la détection de fraude en temps réel (Kafka, Spark Streaming). Réduction du délai moyen de détection de 6h à 12 minutes. Mise en place de tests A/B pour valider l'impact des nouveaux modèles avant mise en production généralisée."
    },
    {
      role: "Data Analyst",
      company: "RetailNow",
      dates: "2018 — 2019",
      description:
        "Analyse des parcours clients omnicanal pour optimiser les campagnes marketing. Construction d'un modèle de scoring d'appétence produit ayant généré une hausse de 12% du taux de conversion sur les campagnes ciblées."
    },
    {
      role: "Stagiaire Data Science",
      company: "IFPEN",
      dates: "2020",
      description:
        "Pipelines ML géospatiaux pour l'analyse de données de forage. Développement d'un modèle de détection d'anomalies sur séries temporelles de capteurs industriels."
    },
    {
      role: "Assistante de recherche",
      company: "Laboratoire MIASHS, Université Lyon 2",
      dates: "2017 — 2018",
      description:
        "Participation à un projet de recherche sur le traitement automatique du langage naturel appliqué aux avis clients. Co-rédaction d'un article présenté lors d'une conférence étudiante nationale."
    }
  ],
  educationItems: [
    {
      school: "Université Paris 1 Panthéon-Sorbonne",
      degree: "Master 2 Data Science & Big Data (MOSEF), mention Très Bien",
      dates: "2019 — 2021",
      description:
        "Spécialisation en machine learning statistique et big data. Mémoire de fin d'études sur la détection de fraude par apprentissage semi-supervisé, encadré par un laboratoire partenaire d'une grande banque française."
    },
    {
      school: "Université Lyon 2",
      degree: "Licence MIASHS, mention Bien",
      dates: "2016 — 2019",
      description: "Mathématiques, informatique appliquée aux sciences humaines et sociales, statistiques."
    },
    {
      school: "École Polytechnique Fédérale de Lausanne (échange)",
      degree: "Semestre d'échange — Machine Learning avancé",
      dates: "Printemps 2018"
    },
    {
      school: "OpenClassrooms",
      degree: "Certification Ingénieur IA",
      dates: "2022"
    }
  ],
  skills: [
    "Python",
    "SQL",
    "PyTorch",
    "TensorFlow",
    "LangChain",
    "LlamaIndex",
    "Azure",
    "AWS",
    "GCP",
    "Docker",
    "Kubernetes",
    "Spark",
    "Kafka",
    "Airflow",
    "MLflow",
    "dbt",
    "FastAPI",
    "PostgreSQL",
    "Elasticsearch",
    "Terraform"
  ],
  softSkills: [
    "Communication",
    "Autonomie",
    "Esprit critique",
    "Pédagogie",
    "Gestion de projet",
    "Leadership",
    "Rigueur",
    "Adaptabilité"
  ],
  languages: ["Français (natif)", "Anglais (courant)", "Espagnol (intermédiaire)", "Allemand (notions)"],
  certifications: [
    { name: "Azure AI Engineer Associate", issuer: "Microsoft" },
    { name: "Deep Learning Specialization", issuer: "DeepLearning.AI" },
    { name: "AWS Certified Machine Learning – Specialty", issuer: "Amazon Web Services" },
    { name: "Certified Kubernetes Administrator", issuer: "CNCF" }
  ],
  interests: ["Course à pied", "Photographie", "Bénévolat associatif", "Escalade", "Cuisine", "Lecture (essais)"]
};

// Variante extrême — construite spécifiquement pour forcer, sur
// CvDocumentSidebarPdf, la chaîne complète mécanisme A (réduction) ->
// mécanisme C (troncature) -> filet `fixed` (Étape 4). Le point clé :
// on gonfle la colonne PRINCIPALE (compétences techniques/comportementales,
// qui ne sont PAS tronquées) plutôt que la colonne latérale — si c'était
// l'aside qui débordait d'une page, `fixed` la reproduirait telle quelle
// mais tronquée/coupée sur chaque page, ce qui ne serait pas un vrai test
// du filet de sécurité. Ici l'aside reste modeste (comme testCvReviewLong)
// et c'est le contenu principal, structurellement impossible à faire
// tenir même avec 1 seule expérience et 1 seule formation affichées, qui
// pousse jusqu'au dernier recours.
const MANY_TECHNICAL_SKILLS = [
  "Python", "SQL", "PyTorch", "TensorFlow", "LangChain", "LlamaIndex", "Azure", "AWS", "GCP",
  "Docker", "Kubernetes", "Spark", "Kafka", "Airflow", "MLflow", "dbt", "FastAPI", "PostgreSQL",
  "Elasticsearch", "Terraform", "Redis", "RabbitMQ", "GraphQL", "gRPC", "Scala", "Java", "Go",
  "Rust", "Jenkins", "GitLab CI", "ArgoCD", "Prometheus", "Grafana", "Snowflake", "BigQuery",
  "Databricks", "Ray", "Triton Inference Server", "ONNX", "Weights & Biases", "Optuna", "DVC",
  "Feast", "Kubeflow", "Istio", "Helm", "Vault", "OpenTelemetry", "Presto", "Trino", "Hadoop",
  "Hive", "NiFi", "Cassandra", "Neo4j", "MongoDB", "DynamoDB", "Pandas", "NumPy", "scikit-learn",
  "XGBoost", "LightGBM"
];
const MANY_SOFT_SKILLS = [
  "Communication", "Autonomie", "Esprit critique", "Pédagogie", "Gestion de projet", "Leadership",
  "Rigueur", "Adaptabilité", "Négociation", "Écoute active", "Créativité", "Résolution de problèmes",
  "Prise de décision", "Gestion du stress", "Esprit d'équipe", "Sens du client", "Curiosité",
  "Persévérance", "Organisation", "Ouverture d'esprit", "Diplomatie", "Empathie", "Proactivité",
  "Vulgarisation technique"
];

// Un premier essai (skills/softSkills seuls, ~85 items au total) a
// suffi à faire tenir CvDocumentSidebarPdf sur 1 page via A+C sans
// jamais atteindre le filet `fixed` (maxExperiences tombé à 1, mais
// maxEducation jamais touché) — donc pas encore assez extrême pour
// tester le dernier recours. On pousse plus loin : listes de
// compétences ~3x plus longues (variantes suffixées, pour ne pas tout
// retaper à la main) + résumé professionnel très long (paragraphe
// répété), toujours dans la colonne principale, jamais tronquée.
const SKILL_VARIANTS = ["", " (avancé)", " (legacy)"];
const EXTREME_TECHNICAL_SKILLS = SKILL_VARIANTS.flatMap((suffix) =>
  MANY_TECHNICAL_SKILLS.map((skill) => `${skill}${suffix}`)
);
const EXTREME_SOFT_SKILLS = SKILL_VARIANTS.flatMap((suffix) => MANY_SOFT_SKILLS.map((skill) => `${skill}${suffix}`));

const EXTREME_SUMMARY = Array.from({ length: 4 })
  .map(
    () =>
      "Data Scientist avec 8 ans d'expérience en machine learning, data engineering et IA générative, spécialisée dans la conception de systèmes RAG et d'agents en production à grande échelle. À l'aise sur l'ensemble du cycle : ingestion, embeddings, évaluation, mise en production, monitoring et amélioration continue. Habituée à travailler avec des équipes pluridisciplinaires (produit, ingénierie, sécurité) sur des projets à fort enjeu réglementaire (secteur bancaire et assurance)."
  )
  .join(" ");

export const testCvReviewExtreme = {
  ...testCvReviewLong,
  summary: EXTREME_SUMMARY,
  skills: EXTREME_TECHNICAL_SKILLS,
  softSkills: EXTREME_SOFT_SKILLS
};
