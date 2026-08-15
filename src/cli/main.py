"""
Point d'entrée en ligne de commande de l'assistant entretiens RAG.

Simule un entretien d'embauche : le LLM joue le rôle du recruteur, pose les
questions une par une, réagit aux réponses du candidat (l'utilisateur) et
enchaîne, comme dans un vrai entretien. Les chunks pertinents du corpus
(src/retrieval/search.py) sont récupérés à chaque tour à partir de la
réponse du candidat pour informer les relances du recruteur
(src/generation/prompt.py, src/generation/llm.py).

Usage :
    python -m src.cli.main
"""

from __future__ import annotations

from src.generation.llm import call_llm
from src.generation.prompt import DISCLAIMER, KICKOFF_MESSAGE, build_interview_prompt
from src.retrieval.search import search

TYPES_ENTRETIEN = {"1": "RH", "2": "technique", "3": "direction"}


def ask_optional(prompt_text: str) -> str | None:
    """Demande une entrée optionnelle à l'utilisateur ; renvoie None si vide."""
    value = input(prompt_text).strip()
    return value or None


def ask_type_entretien() -> str | None:
    print("Quel type d'entretien veux-tu simuler ? (laisse vide = indifférent)")
    print("  1) RH   2) technique   3) direction")
    choice = input("Choix : ").strip()
    return TYPES_ENTRETIEN.get(choice)


def run_turn(candidate_message: str, type_entretien: str | None, domaine: str | None, history: list[dict]) -> str:
    chunks = search(candidate_message, type_entretien=type_entretien, domaine=domaine)
    system_message, user_message = build_interview_prompt(
        candidate_message, chunks, type_entretien=type_entretien, domaine=domaine
    )
    messages = [system_message, *history, user_message]
    answer = call_llm(messages)

    clean_answer = answer.replace(DISCLAIMER, "").strip()
    history.append(user_message)
    history.append({"role": "assistant", "content": clean_answer})
    return answer


def main() -> None:
    print("=== Simulation d'entretien d'embauche ===")
    print("L'assistant joue le rôle du recruteur. Réponds comme si tu y étais.")
    print("Tape 'quit' pour arrêter l'entretien.\n")

    type_entretien = ask_type_entretien()
    domaine = ask_optional("Domaine du poste visé (ex: tech, commerce ; vide = générique) : ")
    print()

    history: list[dict] = []

    try:
        answer = run_turn(KICKOFF_MESSAGE, type_entretien, domaine, history)
    except FileNotFoundError as exc:
        print(f"\nErreur : {exc}\n")
        return
    print(f"Recruteur > {answer}\n")

    while True:
        candidate_message = input("Toi > ").strip()
        if not candidate_message:
            continue
        if candidate_message.lower() in {"quit", "exit"}:
            break

        try:
            answer = run_turn(candidate_message, type_entretien, domaine, history)
        except RuntimeError as exc:
            print(f"\nErreur : {exc}\n")
            continue

        print(f"\nRecruteur > {answer}\n")


if __name__ == "__main__":
    main()
