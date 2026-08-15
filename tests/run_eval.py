"""
Évaluation de la brique de recherche (src/retrieval/search.py) sur le jeu de
questions tests/eval_questions.json.

Pour chaque question de type "retrieval", on vérifie que le sous_theme
attendu (et, s'il est précisé, le domaine attendu) apparaît bien parmi les
top-k chunks renvoyés par la recherche sémantique. Les questions de type
"out_of_scope" n'ont pas de réponse attendue dans le corpus : leur distance
est simplement affichée à titre indicatif (le corpus étant restreint,
`search` renvoie toujours les chunks les plus proches, même peu pertinents ;
il n'y a pas de seuil de coupure implémenté).

Usage :
    python -m tests.run_eval
"""

from __future__ import annotations

import json
from pathlib import Path

from src.retrieval.search import search

EVAL_PATH = Path(__file__).parent / "eval_questions.json"
TOP_K = 3


def load_eval_questions(path: Path = EVAL_PATH) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def evaluate_retrieval(item: dict) -> tuple[bool, str]:
    hits = search(item["question"], top_k=TOP_K)
    expected_sous_theme = item["expected_sous_theme"]
    expected_domaine = item.get("expected_domaine")

    for hit in hits:
        meta = hit["metadata"]
        if meta["sous_theme"] != expected_sous_theme:
            continue
        if expected_domaine and meta["domaine"] != expected_domaine:
            continue
        return True, f"trouvé au rang {hits.index(hit) + 1} (distance {hit['distance']:.3f})"

    got = ", ".join(f"{h['metadata']['sous_theme']}/{h['metadata']['domaine']}" for h in hits)
    return False, f"attendu {expected_sous_theme}/{expected_domaine or '*'}, obtenu [{got}]"


def evaluate_out_of_scope(item: dict) -> str:
    hits = search(item["question"], top_k=1)
    top = hits[0]
    return f"top-1 : {top['metadata']['sous_theme']} (distance {top['distance']:.3f})"


def run() -> None:
    questions = load_eval_questions()
    total_retrieval = 0
    passed_retrieval = 0

    print(f"=== Évaluation de la recherche sur {len(questions)} questions ===\n")

    for item in questions:
        if item["type"] == "retrieval":
            total_retrieval += 1
            ok, detail = evaluate_retrieval(item)
            passed_retrieval += ok
            status = "OK  " if ok else "FAIL"
            print(f"[{status}] {item['id']} — {item['question']}\n        {detail}")
        elif item["type"] == "out_of_scope":
            detail = evaluate_out_of_scope(item)
            print(f"[INFO] {item['id']} — {item['question']}\n        {detail}")
        else:
            raise ValueError(f"Type de question inconnu dans {item['id']} : {item['type']}")

    print(f"\nRecherche : {passed_retrieval}/{total_retrieval} questions correctement retrouvées.")


if __name__ == "__main__":
    run()
