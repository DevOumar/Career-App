# Career App

Plateforme d'accompagnement à la recherche d'emploi : import et analyse de CV, matching CV/offre par IA, simulateur d'entretiens, lettre de motivation générée par IA, simulateur de négociation salariale, tarifs par jetons.

Stack : React (Vite) + API Express, base de données Postgres (Supabase, avec repli local sur PostgreSQL embarqué PGlite si non configuré).

## Fonctionnalités

**Compte**
- Inscription/connexion (mot de passe + code de vérification par e-mail), et connexion avec Google (Google Identity Services).
- Profils multi-rôles (étudiant/candidat, cabinet de recrutement, école, etc.).
- Gestion du compte : profil, nom d'utilisateur, adresses e-mail multiples, comptes connectés, sécurité (mot de passe, sessions actives).
- Préférences : langue (FR/EN) et devise d'affichage (EUR/USD/GBP).

**CV & matching**
- Import et extraction de CV (PDF/DOCX/texte) par IA, avec repli local si l'IA n'est pas configurée.
- Analyse CV/offre par IA : score de matching, points forts, mots-clés manquants, fit culturel, recommandations.
- Historique des CV importés.

**Modules IA (jetons)**
- Simulateur d'entretiens (réservé au plan Trajectoire Pro).
- Lettre de motivation générée par IA (plusieurs tons et modèles visuels, éditable avant export).
- Simulateur de négociation salariale (chat avec un recruteur IA + conseils de coaching, bilan de fin de session).

**Tarifs & paiement**
- Plans Candidat/Étudiant, Cabinet de recrutement, École, avec système de jetons.
- Codes de licence pour les sièges cabinet/école.
- Paiement Stripe réel (Checkout + webhook) pour l'activation des plans payants, avec repli sur activation instantanée tant que Stripe n'est pas configuré.

## Lancer en local

```bash
cd career-web-react
npm install
npm run dev
```

- Frontend : `http://127.0.0.1:5174` (ou le port suivant si occupé)
- API locale : `http://127.0.0.1:8787`

`npm run dev` démarre l'API et le frontend en parallèle. `npm run build` génère le build de production dans `dist/`.

## Configuration (`.env`)

Copier `.env.example` vers `.env` à la racine de `career-web-react/` et renseigner :

- **SMTP** (obligatoire pour l'envoi des codes de vérification) : `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (mot de passe d'application Google, pas le mot de passe Gmail normal).
- **Base de données** : `DATABASE_URL` (connexion Supabase Postgres). Si absent, l'app utilise automatiquement une base PostgreSQL embarquée locale (PGlite, aucune installation système requise).
- **Google Sign-In** : `GOOGLE_CLIENT_ID` (serveur) et `VITE_GOOGLE_CLIENT_ID` (front, même valeur) depuis Google Cloud Console.
- **IA** (CV, matching, lettre, négociation) : `AI_PROVIDER` (`groq`, `xai`, `openai` ou `none`) + la clé API correspondante. Sans clé configurée, chaque fonctionnalité IA retombe sur un repli local plutôt que d'échouer.
- **Stripe** (optionnel) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, un `STRIPE_PRICE_ID_*` par plan payant. Sans clé, le bouton "Activer" utilise l'activation instantanée (mock) à la place du vrai paiement.

Voir `.env.example` pour la liste complète et les commentaires détaillés.
