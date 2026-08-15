"""
Construction du prompt envoyé au LLM pour la génération de conseils.

Ce module assemblera le prompt final à partir de la question utilisateur et
des chunks récupérés par src/retrieval/search.py (contexte RAG), en
respectant la contrainte projet : chaque réponse générée doit inclure la
mention "Cet assistant propose des conseils génériques de préparation et
ne remplace pas un accompagnement RH ou un coach carrière personnalisé."

Non implémenté pour l'instant.
"""

# TODO: implémenter build_prompt(question, chunks) -> str
