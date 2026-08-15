"""
Appel au LLM (Groq) pour générer la réponse finale.

Ce module enverra le prompt construit par generation/prompt.py à l'API Groq
(via le SDK groq) et renverra la réponse générée, en s'assurant que la
mention de non-substitution à un accompagnement RH/coach carrière est bien
présente dans la sortie finale.

Non implémenté pour l'instant.
"""

# TODO: implémenter call_llm(prompt) -> str, avec lecture de GROQ_API_KEY
# depuis les variables d'environnement (python-dotenv).
