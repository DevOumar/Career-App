"""
Logique d'un tour de simulation d'entretien, partagée entre le CLI
(src/cli/main.py) et la plateforme web (src/web/server.py) : récupère le
contexte RAG pertinent pour la réponse du candidat, construit le prompt
recruteur et appelle le LLM.
"""

from __future__ import annotations

from src.generation.llm import call_llm
from src.generation.prompt import DISCLAIMER, KICKOFF_MESSAGE, build_interview_prompt
from src.retrieval.search import search

__all__ = ["KICKOFF_MESSAGE", "run_turn"]


def run_turn(
    candidate_message: str,
    history: list[dict],
    type_entretien: str | None = None,
    domaine: str | None = None,
    offre: str | None = None,
) -> str:
    """
    Joue un tour de l'entretien simulé et renvoie la réponse du recruteur
    (avec le disclaimer). Modifie `history` en place en y ajoutant le tour
    candidat/recruteur, sans le disclaimer, pour éviter que le modèle ne
    l'imite aux tours suivants. `offre` est le texte optionnel de l'offre
    d'emploi collée par le candidat, pour ancrer l'entretien dans un poste
    réel.
    """
    chunks = search(candidate_message, type_entretien=type_entretien, domaine=domaine)
    system_message, user_message = build_interview_prompt(
        candidate_message, chunks, type_entretien=type_entretien, domaine=domaine, offre=offre
    )
    messages = [system_message, *history, user_message]
    answer = call_llm(messages)

    clean_answer = answer.replace(DISCLAIMER, "").strip()
    history.append(user_message)
    history.append({"role": "assistant", "content": clean_answer})
    return answer
