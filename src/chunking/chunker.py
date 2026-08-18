"""
Découpage des documents du corpus en chunks indexables.

Pour ce corpus (fiches de conseils courtes et déjà atomiques), la stratégie
retenue est un passthrough : chaque document de data/processed/corpus.jsonl
constitue déjà une unité sémantique autonome et devient un chunk unique.
Ce module reste le point d'entrée à faire évoluer si des documents plus
longs (retours d'expérience, transcriptions) sont ajoutés au corpus par la
suite (découpage par taille avec chevauchement, par exemple).
"""

from __future__ import annotations

from typing import Any

REQUIRED_FIELDS = ("id", "texte", "type_entretien", "sous_theme", "domaine", "source")


def chunk_document(document: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Transforme un document du corpus en une liste de chunks.

    Stratégie actuelle : 1 document = 1 chunk (passthrough). Valide la
    présence des champs obligatoires du modèle de données avant de renvoyer
    le chunk sous une forme prête à être embeddée et indexée.
    """
    missing = [field for field in REQUIRED_FIELDS if not document.get(field)]
    if missing:
        raise ValueError(f"Document {document.get('id', '?')} : champs manquants {missing}")

    return [
        {
            "chunk_id": document["id"],
            "texte": document["texte"],
            "metadata": {
                "doc_id": document["id"],
                "type_entretien": document["type_entretien"],
                "sous_theme": document["sous_theme"],
                "domaine": document["domaine"],
                "source": document["source"],
            },
        }
    ]


def chunk_documents(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Applique chunk_document à une liste de documents et aplatit le résultat."""
    chunks: list[dict[str, Any]] = []
    for document in documents:
        chunks.extend(chunk_document(document))
    return chunks
