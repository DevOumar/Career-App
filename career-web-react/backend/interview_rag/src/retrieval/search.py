"""
Recherche sémantique dans l'index ChromaDB persisté.

Recharge la collection depuis vectordb/ (sans réindexation), lit le modèle
d'embedding enregistré dans meta.json au moment de l'indexation pour encoder
la requête avec exactement le même modèle, puis renvoie les chunks les plus
proches avec un filtrage optionnel sur les métadonnées (type_entretien,
domaine, sous_theme).

Usage :
    python -m src.retrieval.search "Comment répondre à la question sur mes défauts ?"
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import chromadb

from src.indexing.embed import embed_query

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_VECTORDB = BASE_DIR / "vectordb" if (BASE_DIR / "vectordb").exists() else Path("vectordb")
VECTORDB_PATH = DEFAULT_VECTORDB


def load_meta(vectordb_path: Path = VECTORDB_PATH) -> dict:
    """Charge le meta.json associé à la base vectorielle persistée."""
    meta_path = vectordb_path / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError(
            f"{meta_path} introuvable : lancez d'abord `python -m src.indexing.build_index`."
        )
    return json.loads(meta_path.read_text(encoding="utf-8"))


def get_collection(vectordb_path: Path = VECTORDB_PATH, collection_name: str | None = None):
    """Recharge la collection ChromaDB persistée sur disque, sans réindexation."""
    meta = load_meta(vectordb_path)
    client = chromadb.PersistentClient(path=str(vectordb_path))
    collection = client.get_collection(collection_name or meta["collection_name"])
    return collection, meta


def _build_where(
    type_entretien: str | None,
    domaine: str | None,
    sous_theme: str | None,
) -> dict | None:
    """Construit la clause `where` ChromaDB à partir des filtres de métadonnées fournis."""
    clauses = []
    if type_entretien:
        clauses.append({"type_entretien": type_entretien})
    if domaine:
        clauses.append({"domaine": domaine})
    if sous_theme:
        clauses.append({"sous_theme": sous_theme})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def search(
    query: str,
    top_k: int = 5,
    type_entretien: str | None = None,
    domaine: str | None = None,
    sous_theme: str | None = None,
    vectordb_path: Path = VECTORDB_PATH,
) -> list[dict]:
    """
    Recherche les chunks les plus pertinents pour une requête.

    Filtre optionnellement sur les métadonnées type_entretien / domaine /
    sous_theme avant de calculer la similarité, pour affiner la recherche
    sur un axe métier précis (ex: uniquement domaine="tech").
    """
    collection, meta = get_collection(vectordb_path)
    query_embedding = embed_query(query, model_name=meta["embedding_model"])
    where = _build_where(type_entretien, domaine, sous_theme)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
    )

    hits = []
    for doc_id, texte, metadata, distance in zip(
        results["ids"][0],
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({"id": doc_id, "texte": texte, "metadata": metadata, "distance": distance})
    return hits


if __name__ == "__main__":
    query_text = " ".join(sys.argv[1:]) or "Comment me présenter en entretien ?"
    for hit in search(query_text):
        print(f"[{hit['distance']:.3f}] ({hit['metadata']['sous_theme']}) {hit['texte']}")
