"""
Wrapper d'embedding autour de sentence-transformers.

Fournit une interface unique pour charger le modèle d'embedding multilingue
et encoder des textes en vecteurs, utilisée à la fois par l'indexation
(build_index.py) et la recherche (search.py) afin de garantir que la même
version du modèle sert à indexer et à interroger la base vectorielle.
"""

from __future__ import annotations

import os
import sys
import warnings
import logging
from functools import lru_cache

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN_WARNING"] = "1"
os.environ["PYTHONWARNINGS"] = "ignore"
warnings.filterwarnings("ignore")

logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

import torch
torch.set_num_threads(1)
try:
    torch.set_num_interop_threads(1)
except Exception:
    pass

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
