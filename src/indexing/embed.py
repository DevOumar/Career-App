"""
Wrapper d'embedding autour de sentence-transformers.

Fournit une interface unique pour charger le modèle d'embedding multilingue
et encoder des textes en vecteurs, utilisée à la fois par l'indexation
(build_index.py) et la recherche (search.py) afin de garantir que la même
version du modèle sert à indexer et à interroger la base vectorielle.
"""

from __future__ import annotations

import os
from functools import lru_cache

from sentence_transformers import SentenceTransformer

DEFAULT_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")


@lru_cache(maxsize=None)
def get_embedding_model(model_name: str = DEFAULT_MODEL_NAME) -> SentenceTransformer:
    """Charge (et met en cache) le modèle sentence-transformers demandé."""
    return SentenceTransformer(model_name)


def embed_texts(texts: list[str], model_name: str = DEFAULT_MODEL_NAME) -> list[list[float]]:
    """Encode une liste de textes en vecteurs d'embedding normalisés."""
    model = get_embedding_model(model_name)
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.tolist()


def embed_query(text: str, model_name: str = DEFAULT_MODEL_NAME) -> list[float]:
    """Encode un texte unique (ex: requête utilisateur) en vecteur d'embedding."""
    return embed_texts([text], model_name=model_name)[0]
