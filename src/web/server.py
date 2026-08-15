"""
Petite plateforme web locale pour tester la simulation d'entretien.

Sert la page de chat statique (src/web/static/) et expose deux routes API
qui pilotent la simulation (src/generation/interview.py) :
- POST /api/start   : démarre un nouvel entretien (type_entretien, domaine)
- POST /api/message : envoie la réponse du candidat, renvoie la relance du
                       recruteur

L'état de la conversation est gardé en mémoire côté serveur (une seule
session active à la fois : cet outil est prévu pour un usage de test local
en solo, pas pour du multi-utilisateur). Le serveur HTTP repose uniquement
sur la bibliothèque standard Python (http.server), sans nouvelle dépendance.

Usage :
    python -m src.web.server
    puis ouvrir http://127.0.0.1:8000
"""

from __future__ import annotations

import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from src.generation.interview import KICKOFF_MESSAGE, run_turn

STATIC_DIR = Path(__file__).parent / "static"
HOST = "127.0.0.1"
PORT = 8000

# Session unique en mémoire (usage local mono-utilisateur).
SESSION: dict = {"history": [], "type_entretien": None, "domaine": None, "offre": None}


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def _serve_static(self, path: str) -> None:
        rel_path = (path.lstrip("/") or "index.html").split("?", 1)[0]
        file_path = (STATIC_DIR / rel_path).resolve()
        if STATIC_DIR.resolve() not in file_path.parents or not file_path.is_file():
            self.send_error(404)
            return
        content_type, _ = mimetypes.guess_type(str(file_path))
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if not self.path.startswith("/api/"):
            self._serve_static(self.path)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        try:
            if self.path == "/api/start":
                self._handle_start()
            elif self.path == "/api/message":
                self._handle_message()
            else:
                self.send_error(404)
        except Exception as exc:  # garde-fou : ne jamais planter le serveur
            self._send_json({"error": str(exc)}, status=500)

    def _handle_start(self) -> None:
        payload = self._read_json()
        SESSION["history"] = []
        SESSION["type_entretien"] = payload.get("type_entretien") or None
        SESSION["domaine"] = payload.get("domaine") or None
        SESSION["offre"] = (payload.get("offre") or "").strip() or None

        answer = run_turn(
            KICKOFF_MESSAGE,
            SESSION["history"],
            SESSION["type_entretien"],
            SESSION["domaine"],
            SESSION["offre"],
        )
        self._send_json({"message": answer})

    def _handle_message(self) -> None:
        payload = self._read_json()
        candidate_message = (payload.get("message") or "").strip()
        if not candidate_message:
            self._send_json({"error": "Message vide."}, status=400)
            return

        answer = run_turn(
            candidate_message,
            SESSION["history"],
            SESSION["type_entretien"],
            SESSION["domaine"],
            SESSION["offre"],
        )
        self._send_json({"message": answer})

    def log_message(self, format: str, *args) -> None:
        pass  # silence les logs par défaut de http.server


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Plateforme de test disponible sur http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
