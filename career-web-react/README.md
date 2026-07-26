# Career Web React

Application React + API locale avec PostgreSQL embarqué (PGlite), sans installation système.

Fonctionnalités :
- authentification (inscription onboarding/connexion/déconnexion)
- persistance des comptes et sessions
- profils multi-rôles (étudiant, candidat, cabinet de recrutement, entreprise, etc.)
- photo de profil et sécurité mot de passe
- gestion premium selon profil
- import CV
- matching CV/offres
- recommandations et simulation d'entretiens

## Lancer en local

```bash
npm install
npm run dev
```

- Frontend : `http://127.0.0.1:5174` (ou port suivant si occupé)
- API locale : `http://127.0.0.1:8787`
- Données PostgreSQL embarquées : `server/postgres-data/`

Aucune installation PostgreSQL n'est requise sur la machine.
