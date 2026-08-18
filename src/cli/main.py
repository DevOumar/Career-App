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

from src.generation.interview import KICKOFF_MESSAGE, run_turn

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


def ask_offre() -> str | None:
    """Lit un texte multi-lignes optionnel (offre d'emploi) jusqu'à une ligne vide."""
    print("Colle l'offre d'emploi visée (optionnel). Termine par une ligne vide :")
    lines: list[str] = []
    while True:
        line = input()
        if not line:
            break
        lines.append(line)
    return "\n".join(lines) or None


def main() -> None:
    print("=== Simulation d'entretien d'embauche ===")
    print("L'assistant joue le rôle du recruteur. Réponds comme si tu y étais.")
    print("Tape 'quit' pour arrêter l'entretien.\n")

    type_entretien = ask_type_entretien()
    domaine = ask_optional("Domaine du poste visé (ex: tech, commerce ; vide = générique) : ")
    offre = ask_offre()
    print()

    history: list[dict] = []

    try:
        answer = run_turn(KICKOFF_MESSAGE, history, type_entretien, domaine, offre)
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
            answer = run_turn(candidate_message, history, type_entretien, domaine, offre)
        except RuntimeError as exc:
            print(f"\nErreur : {exc}\n")
            continue

        print(f"\nRecruteur > {answer}\n")


if __name__ == "__main__":
    main()
