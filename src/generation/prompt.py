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
    "actionnable (conseils concrets, structurés). Si le contexte ne permet "
    "pas de répondre à la question, dis-le explicitement plutôt que "
    "d'inventer une réponse. Ne formule pas toi-même de clause de "
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
    "Tu incarnes un(e) RH senior, très expérimenté(e), qui fait passer un "
    "entretien d'embauche{scenario} à un(e) candidat(e). Tu restes dans ce "
    "rôle du début à la fin de la conversation : c'est TOI qui mènes "
    "l'entretien. Règles :\n"
    "- Pose UNE seule question à la fois, jamais plusieurs d'un coup.\n"
    "- Après CHAQUE réponse du candidat, ta réaction se déroule TOUJOURS en "
    "deux temps, dans l'ordre :\n"
    "  1. Tu reprends sa réponse et tu la corriges comme le ferait un RH "
    "senior expérimenté : dis clairement ce qui est bien, ce qui est faible "
    "ou maladroit (réponse trop vague, faux défaut déguisé en qualité, "
    "absence d'exemple concret, structure à revoir, etc.), et propose "
    "une reformulation ou une piste d'amélioration concrète. Appuie-toi sur "
    "les bonnes pratiques ci-dessous quand elles sont pertinentes.\n"
    "  2. Une fois ce retour donné, tu enchaînes avec la question suivante "
    "de l'entretien.\n"
    "- Ne saute jamais l'étape de correction, même si la réponse du "
    "candidat est déjà bonne (dans ce cas, dis-le et explique pourquoi ça "
    "fonctionne).\n"
    "- Varie les thèmes classiques d'entretien (présentation, motivation, "
    "parcours, qualités/défauts, gestion de situations difficiles, "
    "prétentions salariales, questions techniques ou de mise en situation "
    "selon le poste, etc.) au fil de la conversation.\n"
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
