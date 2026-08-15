"""
Point d'entrée en ligne de commande de l'assistant entretiens RAG.

Ce module orchestrera le pipeline complet : saisie de la question par
l'utilisateur (et éventuellement du type_entretien / domaine ciblés),
recherche des chunks pertinents (src/retrieval/search.py), construction du
prompt (src/generation/prompt.py) et appel au LLM (src/generation/llm.py)
pour afficher la réponse finale.

Non implémenté pour l'instant.

Usage prévu :
    python -m src.cli.main
"""

# TODO: implémenter une boucle interactive (input utilisateur -> recherche
# -> génération -> affichage de la réponse).
