export const CODING_LANGUAGES = [
  { id: "python", name: "Python", badge: "Py", color: "#3776ab", ink: "#ffd43b", defaultExt: "py", desc: { fr: "Algorithmes, Data, Scripts", en: "Algorithms, Data, Scripting" } },
  { id: "javascript", name: "JavaScript", badge: "JS", color: "#f7df1e", ink: "#1e1e1e", defaultExt: "js", desc: { fr: "Frontend, DOM, Node.js", en: "Frontend, DOM, Node.js" } },
  { id: "html_css", name: "HTML / CSS", badge: "</>", color: "#e34f26", ink: "#ffffff", defaultExt: "html", desc: { fr: "Mise en page, UI, Styles", en: "Layout, UI, Styles" } },
  { id: "java", name: "Java", badge: "Jv", color: "#e76f00", ink: "#ffffff", defaultExt: "java", desc: { fr: "POO, Backend d'entreprise", en: "OOP, Enterprise Backend" } },
  { id: "cpp", name: "C++", badge: "C++", color: "#00599c", ink: "#ffffff", defaultExt: "cpp", desc: { fr: "Performance, Structures de données", en: "Performance, Data Structures" } },
  { id: "sql", name: "SQL", badge: "SQL", color: "#336791", ink: "#ffffff", defaultExt: "sql", desc: { fr: "Requêtes, Jointures, Données", en: "Queries, Joins, Relational Data" } },
  { id: "typescript", name: "TypeScript", badge: "TS", color: "#3178c6", ink: "#ffffff", defaultExt: "ts", desc: { fr: "Typage statique, Web moderne", en: "Static Typing, Modern Web" } },
  { id: "custom", name: "Autre / Personnalisé", badge: "···", color: "#48464d", ink: "#ffffff", defaultExt: "txt", desc: { fr: "Go, Rust, PHP, C#, React...", en: "Go, Rust, PHP, C#, React..." } }
];

export const CODING_LEVELS = [
  { id: "beginner", label: { fr: "Débutant", en: "Beginner" }, tag: { fr: "Junior & Fondations", en: "Junior & Basics" } },
  { id: "intermediate", label: { fr: "Intermédiaire", en: "Intermediate" }, tag: { fr: "Standard d'entretien", en: "Standard Interview" } },
  { id: "advanced", label: { fr: "Avancé", en: "Advanced" }, tag: { fr: "Cas complexes & Optimisation", en: "Complex & Optimization" } }
];

export const CODING_TOPICS = [
  { id: "algorithms", label: { fr: "Algorithmes & Logique", en: "Algorithms & Logic" }, icon: "matchmark" },
  { id: "web_dom", label: { fr: "Web, DOM & Interface", en: "Web, DOM & UI" }, icon: "globe" },
  { id: "oop", label: { fr: "POO & Architecture", en: "OOP & Architecture" }, icon: "network" },
  { id: "data_manipulation", label: { fr: "Manipulation de Données", en: "Data Processing & Parsing" }, icon: "chart" },
  { id: "sql_queries", label: { fr: "Requêtes & Bases SQL", en: "SQL Queries & DB" }, icon: "docClassic" },
  { id: "debugging", label: { fr: "Debugging & Refactoring", en: "Debugging & Refactoring" }, icon: "settings" },
  { id: "custom", label: { fr: "Sujet libre / Sur-mesure", en: "Custom Topic" }, icon: "edit" }
];

export const CODING_COPY = {
  fr: {
    configTitle: "Paramètres de l'exercice",
    configText: "Choisissez le langage, le niveau et le thème : l'IA génère un exercice sur mesure.",
    customLanguageName: "Autre langage",
    regenerateBtn: "Générer un autre exercice",
    emptyTitle: "Prêt pour votre test technique ?",
    emptyText: "Réglez vos paramètres puis générez votre premier exercice.",
    emptyGeneratingText: "L'IA prépare un exercice adapté à votre niveau.",
    emptySteps: [
      "Lisez l'énoncé, les exemples et, si besoin, les indices.",
      "Codez votre solution dans l'éditeur.",
      "Soumettez-la : l'IA la corrige avec une note, les bugs et une solution de référence."
    ],
    heroBadge: "Espace Technique & Recrutement",
    heroTitle: "Entraînement au Code & Tests Techniques",
    heroSubtitle:
      "Préparez sereinement vos tests d'embauche. Choisissez un langage (Python, JavaScript, HTML, Java, SQL...), recevez un défi calibré par IA, codez dans l'éditeur et obtenez une évaluation détaillée avec conseils d'optimisation.",
    
    configSectionTitle: "1. Paramètres de l'exercice",
    languageLabel: "Langage de programmation",
    customLanguagePlaceholder: "Ex: Rust, Go, PHP, React, Kotlin...",
    levelLabel: "Niveau de difficulté",
    topicLabel: "Thématique / Objectif",
    customTopicLabel: "Consigne ou sujet spécifique (optionnel)",
    customTopicPlaceholder: "Ex: Algorithme de deux pointeurs, formulaire de connexion accessible, requête avec agrégation...",
    generateBtn: "Générer un défi technique",
    generatingBtn: "Génération par l'IA en cours...",

    workspaceSectionTitle: "2. Espace de code & Résolution",
    problemTab: "Énoncé du problème",
    examplesTab: "Exemples & Cas tests",
    hintsTab: "Indices progressifs",
    hintsEmpty: "Cliquez sur 'Afficher un indice' pour vous débloquer sans voir la solution.",
    showHintBtn: "Afficher un indice",
    allHintsRevealed: "Tous les indices ont été révélés.",

    editorHeader: "Éditeur de code",
    resetCodeBtn: "Réinitialiser",
    copyCodeBtn: "Copier le code",
    codeCopied: "Code copié !",
    evaluateBtn: "Évaluer & Tester mon code",
    evaluatingBtn: "Analyse et revue IA...",
    htmlPreviewTab: "Aperçu en direct",

    evaluationTitle: "Correction de l'IA",
    reviewEyebrow: "Correction de l'IA",
    scoreLabel: "Score d'évaluation",
    verdictLabel: "Verdict",
    verdicts: {
      success: "Excellente solution, prête pour l'entretien",
      partial: "Solution partielle : quelques optimisations à apporter",
      needs_work: "À retravailler : la logique doit être corrigée"
    },
    correctnessTitle: "Exactitude & Gestion des cas limites",
    complexityTitle: "Complexité algorithmique (Big-O)",
    timeComplexity: "Temps",
    spaceComplexity: "Mémoire",
    qualityTitle: "Bonnes pratiques & Qualité du code",
    bugsTitle: "Points d'attention & Erreurs détectées",
    solutionTitle: "Solution optimale de référence",
    explanationTitle: "Explication de la démarche",
    saveSessionBtn: "Sauvegarder cet entraînement",
    sessionSaved: "Entraînement enregistré avec succès dans votre historique !",

    historyTitle: "Historique de vos entraînements",
    historyEmpty: "Aucun exercice sauvegardé pour l'instant. Terminez un défi pour le retrouver ici.",
    deleteHistoryBtn: "Supprimer",
    loadHistoryBtn: "Recharger cet exercice",
    dateLabel: "Date",
    historyClose: "Fermer l'historique",
    historyOpenBtn: "Mon historique de code"
  },
  en: {
    configTitle: "Exercise settings",
    configText: "Pick the language, level and topic: the AI generates a tailored exercise.",
    customLanguageName: "Other language",
    regenerateBtn: "Generate another exercise",
    emptyTitle: "Ready for your technical test?",
    emptyText: "Set your options, then generate your first exercise.",
    emptyGeneratingText: "The AI is preparing an exercise suited to your level.",
    emptySteps: [
      "Read the statement, the examples and, if needed, the hints.",
      "Write your solution in the editor.",
      "Submit it: the AI reviews it with a score, the bugs and a reference solution."
    ],
    heroBadge: "Tech & Hiring Space",
    heroTitle: "Coding Practice & Technical Interview Prep",
    heroSubtitle:
      "Prepare with confidence for technical assessments. Pick your preferred language (Python, JavaScript, HTML, Java, SQL...), get an AI-generated challenge, solve it in the editor, and receive instant in-depth feedback with complexity analysis.",

    configSectionTitle: "1. Exercise Settings",
    languageLabel: "Programming Language",
    customLanguagePlaceholder: "E.g. Rust, Go, PHP, React, Kotlin...",
    levelLabel: "Difficulty Level",
    topicLabel: "Topic / Track",
    customTopicLabel: "Specific challenge or focus (optional)",
    customTopicPlaceholder: "E.g. Two-pointers algorithm, responsive accessible login form, grouped SQL aggregation...",
    generateBtn: "Generate Tech Challenge",
    generatingBtn: "AI generation in progress...",

    workspaceSectionTitle: "2. Coding Workspace & Solution",
    problemTab: "Problem Statement",
    examplesTab: "Examples & Test Cases",
    hintsTab: "Step-by-step Hints",
    hintsEmpty: "Click 'Show hint' if you need guidance without spoiling the solution.",
    showHintBtn: "Show a hint",
    allHintsRevealed: "All available hints revealed.",

    editorHeader: "Code Editor",
    resetCodeBtn: "Reset Starter Code",
    copyCodeBtn: "Copy Code",
    codeCopied: "Code copied!",
    evaluateBtn: "Evaluate & Review My Code",
    evaluatingBtn: "AI analysis in progress...",
    htmlPreviewTab: "Live Preview",

    evaluationTitle: "AI review",
    reviewEyebrow: "AI review",
    scoreLabel: "Evaluation Score",
    verdictLabel: "Verdict",
    verdicts: {
      success: "Great Solution — Interview Ready",
      partial: "Partially Solved — Optimization Suggested",
      needs_work: "Needs Revision — Logic or Syntax Issues"
    },
    correctnessTitle: "Correctness & Edge Cases",
    complexityTitle: "Algorithmic Complexity (Big-O)",
    timeComplexity: "Time",
    spaceComplexity: "Space",
    qualityTitle: "Clean Code & Best Practices",
    bugsTitle: "Issues & Edge Case Pitfalls",
    solutionTitle: "Optimal Reference Solution",
    explanationTitle: "Solution Breakdown",
    saveSessionBtn: "Save this Training Session",
    sessionSaved: "Training session successfully saved to your history!",

    historyTitle: "Your Practice History",
    historyEmpty: "No practice sessions saved yet. Complete a challenge to see it here.",
    deleteHistoryBtn: "Delete",
    loadHistoryBtn: "Reload Challenge",
    dateLabel: "Date",
    historyClose: "Close History",
    historyOpenBtn: "My Coding History"
  }
};

