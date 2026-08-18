"""
Construction de l'index vectoriel ChromaDB à partir du corpus traité.

Lit data/processed/corpus.jsonl, découpe chaque document en chunks
(src/chunking/chunker.py), calcule les embeddings avec sentence-transformers
(src/indexing/embed.py), puis persiste le tout dans une collection ChromaDB
sur disque (vectordb/). Le nom du modèle d'embedding utilisé est enregistré
dans vectordb/meta.json afin de pouvoir recharger la base sans réindexation
et de détecter le modèle à utiliser pour les requêtes de recherche.

Usage :
    python -m src.indexing.build_index
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import chromadb

from src.chunking.chunker import chunk_documents
from src.indexing.embed import DEFAULT_MODEL_NAME, embed_texts

CORPUS_PATH = Path(os.getenv("CORPUS_PATH", "data/processed/corpus.jsonl"))
VECTORDB_PATH = Path(os.getenv("VECTORDB_PATH", "vectordb"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "entretiens")


def load_corpus(corpus_path: Path = CORPUS_PATH) -> list[dict]:
    """Charge le corpus JSONL (un document JSON par ligne) en mémoire."""
    documents = []
    with corpus_path.open("r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                documents.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Ligne {line_number} invalide dans {corpus_path}: {exc}") from exc
    return documents


def build_index(
    corpus_path: Path = CORPUS_PATH,
    vectordb_path: Path = VECTORDB_PATH,
    collection_name: str = COLLECTION_NAME,
    model_name: str = DEFAULT_MODEL_NAME,
) -> None:
    """Construit (ou reconstruit) la collection ChromaDB persistée sur disque."""
    documents = load_corpus(corpus_path)
    if not documents:
        raise ValueError(f"Aucun document trouvé dans {corpus_path}")

    chunks = chunk_documents(documents)
    texts = [chunk["texte"] for chunk in chunks]
    ids = [chunk["chunk_id"] for chunk in chunks]
    metadatas = [chunk["metadata"] for chunk in chunks]

    embeddings = embed_texts(texts, model_name=model_name)

    vectordb_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(vectordb_path))

    # On repart d'une collection propre pour éviter les doublons entre deux exécutions.
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
    collection = client.create_collection(name=collection_name)

    collection.add(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)

    meta_path = vectordb_path / "meta.json"
    meta_path.write_text(
        json.dumps(
            {
                "embedding_model": model_name,
                "collection_name": collection_name,
                "num_documents": len(documents),
                "num_chunks": len(chunks),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Index construit : {len(chunks)} chunks indexés dans '{collection_name}' ({vectordb_path}).")


if __name__ == "__main__":
    build_index()
