"""
Appel au LLM (Groq) pour générer la réponse finale à partir du prompt
construit par generation/prompt.py.

La mention "Cet assistant propose des conseils génériques de préparation et
ne remplace pas un accompagnement RH ou un coach carrière personnalisé." est
ajoutée systématiquement après la réponse du modèle, pour garantir sa
présence indépendamment de ce que le LLM a généré.
"""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

from src.generation.prompt import DISCLAIMER

# Charge le fichier .env de career-web-react si présent
env_path = Path(__file__).resolve().parents[3] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
load_dotenv()

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
RAG_GROQ_KEY = "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"


def get_groq_api_key() -> str:
    """Récupère la clé Groq depuis l'environnement ou utilise la clé RAG par défaut."""
    key = os.getenv("GROQ_API_KEY")
    if not key or "abSXBBZhW64ofhEruN" in key:
        return RAG_GROQ_KEY
    return key


def call_llm(messages: list[dict], model: str = DEFAULT_MODEL, temperature: float = 0.4) -> str:
    """
    Envoie les messages au LLM Groq et renvoie la réponse générée, avec le disclaimer.
    Inclut un fallback automatique si le modèle spécifié rencontre un problème.
    """
    api_key = get_groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY manquant : renseignez-le dans votre fichier .env")

    target_model = model or DEFAULT_MODEL
    # Si le modèle passé est déprécié ou invalide, utiliser le modèle par défaut actif
    if "llama" in target_model.lower():
        target_model = "openai/gpt-oss-120b"

    client = Groq(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model=target_model,
            messages=messages,
            temperature=temperature,
        )
    except Exception as exc:
        print(f"[Groq LLM Warning] Erreur avec {target_model}: {exc}. Bascule sur openai/gpt-oss-20b...")
        if target_model != "openai/gpt-oss-20b":
            response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=messages,
                temperature=temperature,
            )
        else:
            raise exc

    content = response.choices[0].message.content.strip()
    # Évite de dupliquer le disclaimer si le modèle l'a répété dans sa réponse
    content = content.replace(DISCLAIMER, "").strip()
    return f"{content}\n\n{DISCLAIMER}"
