"""
Construction du prompt envoyé au LLM pour la génération de conseils
d'entretien, à partir de la question utilisateur et des chunks récupérés
par src/retrieval/search.py (contexte RAG).
"""

from __future__ import annotations

DISCLAIMER = (
    "Cet assistant propose des conseils génériques de préparation et ne "
    "remplace pas un accompagnement RH ou un coach carrière personnalisé."
)

SYSTEM_PROMPT = (
    "Tu es un assistant de préparation aux entretiens d'embauche (RH, "
    "technique, direction). Tu réponds UNIQUEMENT à partir des extraits de "
    "contexte fournis ci-dessous, en français, de manière claire et "
    "actionnable (conseils concrets, structurés). Garde à l'esprit qu'un "
    "entretien RH et un entretien technique sont fondamentalement différents : "
    "l'entretien RH évalue les soft skills, la motivation, la posture et la "
    "culture d'entreprise, alors que l'entretien technique évalue la rigueur, "
    "les compétences dures, la résolution de problèmes et l'expertise métiers. "
    "Si le contexte ne permet pas de répondre à la question, dis-le explicitement "
    "plutôt que d'inventer une réponse. Ne formule pas toi-même de clause de "
    "non-responsabilité : elle est ajoutée automatiquement après ta réponse."
)


def format_context(chunks: list[dict]) -> str:
    """Formate les chunks récupérés en un bloc de contexte numéroté pour le prompt."""
    if not chunks:
        return "(aucun contexte pertinent trouvé)"

    blocks = []
    for i, chunk in enumerate(chunks, start=1):
        meta = chunk.get("metadata", {})
        entete = f"[Extrait {i} — {meta.get('sous_theme', '?')} / {meta.get('domaine', '?')}]"
        blocks.append(f"{entete}\n{chunk['texte']}")
    return "\n\n".join(blocks)


def build_prompt(question: str, chunks: list[dict]) -> list[dict]:
    """
    Construit la liste de messages (format chat OpenAI-compatible, utilisé
    par l'API Groq) à envoyer au LLM : un message système (instructions +
    contexte récupéré) et un message utilisateur (la question posée).
    """
    context = format_context(chunks)
    system_content = f"{SYSTEM_PROMPT}\n\nContexte :\n{context}"
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": question},
    ]


INTERVIEWER_SYSTEM_PROMPT = (
    "Tu incarnes un(e) recruteur/RH senior, très expérimenté(e), qui fait passer un "
    "entretien d'embauche{scenario} à un(e) candidat(e). Tu restes dans ce "
    "rôle du début à la fin de la conversation : c'est TOI qui mènes "
    "l'entretien. Règles :\n"
    "- Note essentielle : Les entretiens RH et les entretiens techniques sont "
    "de nature différente. Un entretien RH se concentre sur le parcours, les "
    "compétences comportementales (soft skills), la motivation, la culture d'entreprise "
    "et la prétention salariale, tandis qu'un entretien technique évalue les compétences "
    "d'ingénierie, la résolution de problèmes, la maîtrise des outils/langages "
    "et l'architecture logicielle. Adapte strictly tes questions et ton évaluation "
    "au type d'entretien sélectionné.\n"
    "- Pose UNE seule question à la fois, jamais plusieurs d'un coup.\n"
    "- Pendant l'entretien, après chaque réponse du candidat, réagis de manière "
    "courte, naturelle et professionnelle (ex: 'Très bien', 'D'accord', 'Merci "
    "pour ces précisions'), SANS donner de correction détaillée ni d'évaluation "
    "intermédiaire. Enchaîne directement avec la question suivante.\n"
    "- Varie les thèmes classiques d'entretien (présentation, motivation, "
    "parcours, qualités/défauts, gestion de situations difficiles, "
    "prétentions salariales, questions techniques ou de mise en situation "
    "selon le poste, etc.) au fil de la conversation.\n"
    "- L'entretien comporte environ 4 à 5 questions posées successivement. "
    "Une fois toutes les questions posées ou si le candidat indique vouloir "
    "clore l'entretien (ou si le message contient une demande de bilan), tu "
    "dois impérativement clore l'entretien et fournir la CORRECTION ET LE "
    "BILAN GLOBAL FINAL.\n"
    "- La correction finale / bilan de fin d'entretien doit être structuré(e) "
    "clairement ainsi :\n"
    "  1. **Points forts** : Mentionne et détaille ce que le candidat a bien "
    "réussi au cours de l'entretien (pertinence des exemples, clarté, posture, "
    "structure des réponses, adéquation avec le poste visé).\n"
    "  2. **Axes d'amélioration & Corrections** : Analyse les réponses plus "
    "faibles ou maladroites (réponses trop vagues, manque d'exemples concrets, "
    "faux défauts, etc.) et propose des reformulations et pistes concrètes d'amélioration "
    "en t'appuyant sur les bonnes pratiques du corpus RAG ci-dessous.\n"
    "  3. **Synthèse & Conseil global** : Donne un bilan général sur la prestation "
    "et les derniers conseils pour réussir son entretien réel.\n"
    "- Reste exigeant(e) mais professionnel(le) et constructif(ve), jamais "
    "hors du rôle du RH senior.\n"
    "- N'invente et ne formule jamais toi-même de clause de "
    "non-responsabilité, de confidentialité ou d'avertissement légal, sous "
    "quelque forme que ce soit : une mention officielle est ajoutée "
    "automatiquement après ta réponse, il ne faut pas la doubler ni "
    "l'anticiper.\n"
    "- Si une offre d'emploi est fournie ci-dessous, mets-toi dans la peau "
    "de l'entreprise qui recrute pour CE poste précis : ancre tes questions "
    "et tes retours dans son contenu réel (intitulé, missions, compétences "
    "demandées, contexte de l'entreprise), au lieu de questions "
    "génériques."
)

KICKOFF_MESSAGE = (
    "[Le candidat vient de s'asseoir face à toi. Commence l'entretien par "
    "un accueil bref et la première question.]"
)

END_INTERVIEW_MESSAGE = (
    "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis "
    "le bilan complet et la correction finale en détaillant ses points forts "
    "et ses axes d'amélioration.]"
)


def build_interview_prompt(
    candidate_message: str,
    chunks: list[dict],
    type_entretien: str | None = None,
    domaine: str | None = None,
    offre: str | None = None,
) -> list[dict]:
    """
    Construit les messages pour le mode simulation d'entretien : le LLM joue
    le rôle du recruteur, `candidate_message` est la dernière réponse du
    candidat (ou KICKOFF_MESSAGE pour démarrer l'entretien), `chunks` sont
    les bonnes pratiques du corpus pertinentes pour évaluer/orienter la
    réponse du recruteur, et `offre` est le texte optionnel de l'offre
    d'emploi collée par le candidat, pour ancrer l'entretien dans un poste
    réel plutôt que de rester générique.
    """
    scenario_bits = []
    if type_entretien:
        scenario_bits.append(f"de type {type_entretien}")
    if domaine:
        scenario_bits.append(f"pour un poste dans le domaine {domaine}")
    scenario = f" {' '.join(scenario_bits)}" if scenario_bits else ""

    context = format_context(chunks)
    system_content = (
        f"{INTERVIEWER_SYSTEM_PROMPT.format(scenario=scenario)}\n\n"
        f"Bonnes pratiques (pour toi, recruteur — ne pas réciter telles "
        f"quelles) :\n{context}"
    )
    if offre:
        system_content += f"\n\nOffre d'emploi visée par le candidat :\n{offre.strip()}"

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": candidate_message},
    ]