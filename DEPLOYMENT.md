# Deploiement gratuit pour soutenance

Architecture recommandee :

- Frontend React/Vite : Vercel
- Backend Express : Render
- Base de donnees : Supabase PostgreSQL deja configuree

## Backend Render

Depuis Render, creez un Web Service depuis le depot GitHub.

Parametres :

- Root Directory : `career-web-react`
- Build Command : `npm install`
- Start Command : `npm start`
- Health Check Path : `/api/health`
- Plan : Free

Variables a ajouter dans Render, sans les exposer dans Git :

- `NODE_ENV=production`
- `PORT_RETRY_COUNT=0`
- `APP_URL=https://URL_FRONTEND_VERCEL`
- `CORS_ORIGINS=https://URL_FRONTEND_VERCEL`
- `DATABASE_URL=...`
- `GOOGLE_CLIENT_ID=...`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `MAIL_FROM=...`
- `AI_PROVIDER=groq`
- `AI_MODEL=...`
- `GROQ_API_KEY=...`
- `AI_TIMEOUT_MS=45000`
- Variables Stripe si les paiements doivent fonctionner en production.

## Frontend Vercel

Depuis Vercel, importez le meme depot GitHub.

Parametres :

- Root Directory : `career-web-react`
- Framework Preset : Vite
- Install Command : `npm install`
- Build Command : `npm run build`
- Output Directory : `dist`

Variables a ajouter dans Vercel :

- `VITE_API_URL=https://URL_BACKEND_RENDER/api`
- `VITE_GOOGLE_CLIENT_ID=...`

## Google OAuth

Dans Google Cloud Console, ajoutez l'URL Vercel dans les origines JavaScript autorisees.

Exemple :

- `https://URL_FRONTEND_VERCEL`

## Avant la soutenance

- Ouvrir l'URL Render `/api/health` quelques minutes avant la demo pour reveiller le backend gratuit.
- Verifier un login email/mot de passe.
- Verifier un login Google si utilise.
- Tester une extraction CV.
- Tester l'envoi email si la demo doit montrer les annonces ou les codes OTP.
