"""
Transcription audio (Speech-to-Text) utilisant le modèle Whisper via l'API Groq.
"""

from __future__ import annotations

import io
import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# Charge le fichier .env de career-web-react si présent
env_path = Path(__file__).resolve().parents[3] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
load_dotenv()

DEFAULT_WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")


def get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "recording.webm",
    model: str = DEFAULT_WHISPER_MODEL,
    language: str = "fr",
) -> str:
    """
    Transcrit un flux audio (bytes) en texte en français en utilisant le modèle
    Whisper de Groq.
    """
    api_key = get_groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY manquant : renseignez-le dans votre fichier .env")

    if not audio_bytes or len(audio_bytes) < 100:
        return ""

    client = Groq(api_key=api_key)
    audio_file = (filename, io.BytesIO(audio_bytes))

    try:
        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model=model,
            language=language,
            response_format="json",
        )
        return transcription.text.strip()
    except Exception as exc:
        print(f"[Whisper STT Warning] Erreur transcription: {exc}")
        return ""
