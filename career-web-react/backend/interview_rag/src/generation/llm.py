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
    return RAG_GROQ_KEY


def call_llm(messages: list[dict], model: str = DEFAULT_MODEL, temperature: float = 0.4) -> str:
    """
    Envoie les messages (format chat, voir prompt.build_prompt) au LLM Groq
    et renvoie la réponse générée, avec la mention obligatoire ajoutée à la
    fin.
    """
    api_key = get_groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY manquant : renseignez-le dans votre fichier .env")

    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    content = response.choices[0].message.content.strip()
    # Le modèle imite parfois le disclaimer déjà présent dans l'historique de
    # conversation malgré la consigne : on évite de le dupliquer.
    content = content.replace(DISCLAIMER, "").strip()
    return f"{content}\n\n{DISCLAIMER}"
