// Vocabulaire multi-domaines : Tech/Data/IA (couverture d'origine), + Marketing,
// Finance, Vente/Business, RH/Management, Design, Juridique, pour que le matching
// reste pertinent sur un CV qui n'est pas orienté data/IA (cf. mémoire §2.4.4,
// limite assumée : dictionnaire de mots-clés, pas de NER — un vocabulaire plus
// large réduit le problème sans le résoudre complètement).

export const SKILL_KEYWORDS = [
  // --- Tech / Data / IA ---
  "python", "sql", "r", "scala", "javascript", "typescript", "react", "node",
  "java", "c++", "c#", "php", "ruby", "go", "swift", "kotlin",
  "ml", "machine learning", "deep learning", "nlp", "computer vision",
  "genai", "llm", "rag", "langchain", "langgraph", "autogen", "openai api",
  "mistral", "hugging face", "pytorch", "tensorflow", "spark", "hadoop",
  "docker", "kubernetes", "mlflow", "fastapi", "ci/cd", "terraform",
  "azure", "azure openai", "gcp", "vertex ai", "aws", "power bi", "tableau",
  "qlik", "looker", "streamlit", "git", "github", "gitlab", "data engineering",
  "etl", "airflow", "dbt", "snowflake", "postgresql", "mongodb", "linux",

  // --- Marketing & Communication ---
  "seo", "sea", "sem", "growth hacking", "content marketing", "copywriting",
  "réseaux sociaux", "social media", "community management", "brand management",
  "google analytics", "google ads", "meta ads", "email marketing", "crm",
  "hubspot", "mailchimp", "adobe creative suite", "marketing automation",
  "relations presse", "événementiel", "storytelling",

  // --- Finance & Comptabilité ---
  "comptabilité", "contrôle de gestion", "audit", "fiscalité", "trésorerie",
  "consolidation", "ifrs", "sap", "excel", "modélisation financière",
  "analyse financière", "budget", "reporting financier", "sage", "cegid",

  // --- Vente & Business ---
  "négociation", "prospection", "vente b2b", "vente b2c", "account management",
  "business development", "salesforce", "pipeline commercial", "closing",
  "relation client", "fidélisation",

  // --- RH & Management ---
  "recrutement", "gestion de projet", "gestion d'équipe", "onboarding",
  "sirh", "paie", "droit du travail", "formation professionnelle",
  "leadership", "management d'équipe", "scrum", "kanban",

  // --- Design & Créativité ---
  "ui design", "ux design", "figma", "sketch", "photoshop", "illustrator",
  "indesign", "prototypage", "design thinking", "identité visuelle",

  // --- Juridique ---
  "droit des affaires", "droit social", "rgpd", "contrats", "propriété intellectuelle",

  // --- Transverses / méthodologies ---
  "agile", "scrum", "jira", "confluence", "power point", "communication",
  "presentation", "stakeholder", "consulting", "anglais courant", "gestion de projet"
];

// Synonymes fréquents : une variante détectée compte comme le mot-clé canonique.
// Limite l'effet "faux négatif" quand le CV utilise un synonyme au lieu du terme
// exact présent dans SKILL_KEYWORDS.
export const SKILL_SYNONYMS = {
  "js": "javascript",
  "ts": "typescript",
  "k8s": "kubernetes",
  "ia générative": "genai",
  "intelligence artificielle générative": "genai",
  "gestion de la relation client": "crm",
  "référencement naturel": "seo",
  "référencement payant": "sea",
  "développement commercial": "business development",
  "chef de projet": "gestion de projet",
  "ressources humaines": "recrutement",
  "expérience utilisateur": "ux design",
  "interface utilisateur": "ui design"
};

export const DOMAIN_MAP = {
  "Python & Data Science": ["python", "sql", "r", "scala", "data engineering", "postgresql", "mongodb"],
  "Machine Learning & NLP": ["ml", "machine learning", "deep learning", "nlp", "computer vision", "pytorch", "tensorflow"],
  "LLM & IA Générative": ["genai", "llm", "rag", "langchain", "langgraph", "autogen", "openai api"],
  "Cloud & Infra": ["azure", "azure openai", "gcp", "vertex ai", "aws", "docker", "kubernetes", "terraform"],
  "MLOps & Dev": ["docker", "kubernetes", "mlflow", "ci/cd", "fastapi", "git", "github", "gitlab"],
  "Marketing & Growth": ["seo", "sea", "sem", "growth hacking", "content marketing", "google analytics", "google ads", "meta ads", "marketing automation"],
  "Finance & Gestion": ["comptabilité", "contrôle de gestion", "audit", "fiscalité", "analyse financière", "excel", "budget"],
  "Vente & Business": ["négociation", "prospection", "vente b2b", "vente b2c", "business development", "salesforce", "relation client"],
  "RH & Management": ["recrutement", "gestion de projet", "gestion d'équipe", "sirh", "leadership", "management d'équipe"],
  "Design & UX": ["ui design", "ux design", "figma", "sketch", "photoshop", "prototypage", "design thinking"],
  "Reporting & BI": ["power bi", "tableau", "qlik", "looker", "reporting financier"],
  "Communication client": ["communication", "presentation", "stakeholder", "consulting", "relations presse", "storytelling"]
};

export const EDUCATION_LEVELS = [
  "bac",
  "bac+2",
  "bac+3",
  "bac+4",
  "bac+5",
  "master",
  "ingenieur",
  "doctorat"
];

// En-têtes de section usuels dans un CV francophone, utilisés pour une extraction
// plus contextuelle (ex. prioriser les compétences trouvées dans la section
// "Compétences" plutôt que n'importe où dans le document).
export const SECTION_HEADERS = {
  experience: ["experience professionnelle", "experiences professionnelles", "experience", "parcours professionnel"],
  education: ["formation", "formations", "diplomes", "parcours academique", "education"],
  skills: ["competences", "competences techniques", "skills", "savoir-faire"],
  languages: ["langues", "languages"],
  contact: ["coordonnees", "contact"]
};
