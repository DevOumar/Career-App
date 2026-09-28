import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPUS_PATH = path.join(__dirname, "..", "data", "interviewCorpus.json");

let corpusData = [];
try {
  if (fs.existsSync(CORPUS_PATH)) {
    corpusData = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
  }
} catch (err) {
  console.warn("Impossible de charger interviewCorpus.json:", err.message);
}

const DISCLAIMER = "Cet assistant propose des conseils génériques de préparation et ne remplace pas un accompagnement RH ou un coach carrière personnalisé.";

const INTERVIEWER_SYSTEM_PROMPT = `Tu incarnes un(e) RH senior, très expérimenté(e), qui fait passer un entretien d'embauche{scenario} à un(e) candidat(e). Tu restes dans ce rôle du début à la fin de la conversation : c'est TOI qui mènes l'entretien.
Règles :
- Note essentielle : les entretiens RH et les entretiens techniques sont de nature différente. Un entretien RH se concentre sur le parcours, les compétences comportementales (soft skills), la motivation, la culture d'entreprise et la prétention salariale, tandis qu'un entretien technique évalue les compétences d'ingénierie, la résolution de problèmes, la maîtrise des outils/langages et l'architecture logicielle. Adapte strictement tes questions et ton évaluation au type d'entretien sélectionné.
- Pose UNE seule question à la fois, jamais plusieurs d'un coup.
- Pendant l'entretien, après chaque réponse du candidat, réagis de manière courte, naturelle et professionnelle (ex: 'Très bien', 'D'accord', 'Merci pour ces précisions'), SANS donner de correction détaillée ni d'évaluation intermédiaire. Enchaîne directement avec la question suivante.
- Varie les thèmes classiques d'entretien (présentation, motivation, parcours, qualités/défauts, gestion de situations difficiles, prétentions salariales, questions techniques ou de mise en situation selon le poste, etc.) au fil de la conversation.
- L'entretien comporte 10 questions posées successivement : ne propose jamais toi-même de conclure avant la 10e réponse du candidat. Si le candidat indique vouloir clore l'entretien, si le message contient une demande de bilan, ou après sa 10e réponse, tu dois impérativement clore l'entretien et fournir la CORRECTION ET LE BILAN GLOBAL FINAL.
- La correction finale / bilan de fin d'entretien doit être structuré(e) clairement ainsi :
  1. **Points forts** : Mentionne et détaille ce que le candidat a bien réussi au cours de l'entretien (pertinence des exemples, clarté, posture, structure des réponses, adéquation avec le poste visé).
  2. **Axes d'amélioration & Corrections** : Analyse les réponses plus faibles ou maladroites (réponses trop vagues, manque d'exemples concrets, faux défauts, etc.) et propose des reformulations et pistes concrètes d'amélioration en t'appuyant sur les bonnes pratiques du corpus RAG.
  3. **Synthèse & Conseil global** : Donne un bilan général sur la prestation et les derniers conseils pour réussir son entretien réel.
- Tes messages sont lus à voix haute par une synthèse vocale : pendant l'entretien, écris uniquement du texte parlé naturel, en phrases complètes. N'utilise JAMAIS de Markdown ni de symboles de mise en forme (#, *, _, \`, |, >, puces, tableaux), ni de balises HTML (<br> ou autres), ni d'emojis, ni de barres obliques ou d'esperluettes à la place des mots.
- Seul le bilan final peut utiliser des titres en gras (**Titre**) et des listes à tirets simples ; jamais de tableaux, de titres avec # ni de balises HTML, même dans le bilan.
- Reste exigeant(e) mais professionnel(le) et constructif(ve), jamais hors du rôle du RH senior.
- N'invente et ne formule jamais toi-même de clause de non-responsabilité, de confidentialité ou d'avertissement légal, sous quelque forme que ce soit : une mention officielle est ajoutée automatiquement après ta réponse, il ne faut pas la doubler ni l'anticiper.
- Si une offre d'emploi est fournie, mets-toi dans la peau de l'entreprise qui recrute pour CE poste précis : ancre tes questions et tes retours dans son contenu réel.`;

function retrieveChunks(queryText, type_entretien, domaine, topK = 4) {
  if (!corpusData || corpusData.length === 0) return [];
  const normalizedQuery = (queryText || "").toLowerCase();
  
  const scored = corpusData.map((item) => {
    let score = 0;
    if (type_entretien && item.type_entretien?.toLowerCase() === type_entretien.toLowerCase()) score += 3;
    if (domaine && item.domaine?.toLowerCase() === domaine.toLowerCase()) score += 2;
    
    const words = (item.texte || "").toLowerCase().split(/\W+/);
    for (const w of words) {
      if (w.length > 3 && normalizedQuery.includes(w)) {
        score += 1;
      }
    }
    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function formatContext(chunks) {
  if (!chunks || chunks.length === 0) return "(aucun contexte spécifique trouvé)";
  return chunks
    .map((chunk, idx) => `[Extrait ${idx + 1} — ${chunk.sous_theme || "?"} / ${chunk.domaine || "?"}]\n${chunk.texte}`)
    .join("\n\n");
}

export function registerInterviewRoutes(app) {
  const {
    requireMatchingSession,
    express,
    aiActionRateLimiter,
    aiConversationRateLimiter,
    AI_PROVIDER,
    AI_MODEL,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    XAI_API_KEY,
    db,
    crypto,
    nowIso,
    coerceString,
    getUserRowById,
    getEffectivePlanById,
    parseJsonField,
    INTERVIEW_DAILY_LIMIT,
    INTERVIEW_MAX_ANSWERS,
    INTERVIEW_TOKEN_COST,
    CODING_DAILY_LIMIT,
    consumeDailyQuota,
    releaseDailyQuota,
    getDailyQuotaUsage,
    sendDailyQuotaReached,
    nextQuotaReset,
    adjustUserTokens,
    getPublicUserById,
    computePremiumAccess,
    affectedRowCount,
    resolveSubscriptionCredits,
    callAiChat,
    LICENSE_SUSPENDED_ERROR
  } = app.locals.ctx;

  // Le simulateur d'entretiens n'est inclus que dans le plan Trajectoire Pro
  // (voir frontend/src/data/plans.js : unlocksInterviews). Le front bloque
  // déjà l'accès visuellement, mais rien n'empêchait un appel direct à
  // l'API (curl/devtools) de le contourner — cette vérification est le vrai
  // verrou. Retourne true si l'accès est autorisé (et a déjà répondu à la
  // requête avec une erreur sinon).
  async function requireInterviewAccess(req, res, userId) {
    if (!requireMatchingSession(req, res, userId)) return false;
    const user = await getUserRowById(userId);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return false;
    }
    if (parseJsonField(user.subscription_json, {}).licenseSuspended) {
      res.status(403).json(LICENSE_SUSPENDED_ERROR);
      return false;
    }
    const subscription = parseJsonField(user.subscription_json, {});
    const plan = await getEffectivePlanById(subscription.planId);
    if (!plan?.unlocksInterviews) {
      res.status(403).json({ error: "Le simulateur d'entretiens n'est pas inclus dans le plan gratuit. Inclus dans les plans Élan et Trajectoire Pro, ainsi que dans les licences école et cabinet.", code: "PLAN_REQUIRED" });
      return false;
    }
    return true;
  }

  // Jusqu'à 3 essais espacés : une saturation passagère du fournisseur IA
  // ne doit pas interrompre l'entretien.
  async function callLlmMessages(messages) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      try {
        return await callLlmMessagesOnce(messages);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  // Modèle payant (OpenAI) en priorité, repli automatique sur Groq.
  async function callLlmMessagesOnce(messages) {
    try {
      return await callAiChat({ messages, temperature: 0.7, maxTokens: 1500 });
    } catch (_error) {
      // Aucune réponse inventée : sans réponse réelle du modèle, l'échange
      // s'interrompt avec une erreur explicite (le candidat peut réessayer).
      throw Object.assign(new Error("Le recruteur IA est momentanément indisponible. Réessayez dans un instant."), { statusCode: 503 });
    }
  }

  // Quotas du jour (entretiens et test technique) pour l'affichage.
  app.get("/api/interview/quotas", async (req, res) => {
    try {
      const userId = coerceString(req.query?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const user = await getUserRowById(userId);
      const subscription = parseJsonField(user?.subscription_json, {});
      const credits = resolveSubscriptionCredits(subscription);
      res.json({
        interview: { used: await getDailyQuotaUsage(userId, "interview_session"), limit: INTERVIEW_DAILY_LIMIT, maxAnswers: INTERVIEW_MAX_ANSWERS },
        coding: { used: await getDailyQuotaUsage(userId, "coding_generate"), limit: CODING_DAILY_LIMIT },
        tokens: { unlimited: credits >= 999, credits, interviewCost: INTERVIEW_TOKEN_COST },
        resetAt: nextQuotaReset()
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  // Démarrer la simulation
  app.post("/api/interview/start", aiConversationRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!(await requireInterviewAccess(req, res, userId))) return;
      const { type_entretien = "RH", domaine = "générique", offre = "" } = req.body || {};

      // 5 séances par jour, puis 2 jetons par séance (sauf accès illimité
      // école / cabinet). Rien n'est consommé si l'IA ne répond pas.
      if (!(await consumeDailyQuota(userId, "interview_session", INTERVIEW_DAILY_LIMIT))) {
        return sendDailyQuotaReached(res, { limit: INTERVIEW_DAILY_LIMIT, what: "entretiens" });
      }
      const debit = await adjustUserTokens(userId, -INTERVIEW_TOKEN_COST);
      if (!debit.ok) {
        await releaseDailyQuota(userId, "interview_session");
        return res.status(402).json({
          code: "NO_TOKENS",
          error: `Il vous faut ${INTERVIEW_TOKEN_COST} jetons pour démarrer un entretien. Rechargez vos jetons depuis la page Tarifs.`
        });
      }
      const refundStart = async () => {
        await releaseDailyQuota(userId, "interview_session");
        if (debit.charged) await adjustUserTokens(userId, debit.charged);
      };
      const chunks = retrieveChunks("présentation motivation parcours", type_entretien, domaine);
      const context = formatContext(chunks);

      let scenarioStr = "";
      if (type_entretien) scenarioStr += ` de type ${type_entretien}`;
      if (domaine) scenarioStr += ` dans le domaine ${domaine}`;

      const systemPrompt = INTERVIEWER_SYSTEM_PROMPT.replace("{scenario}", scenarioStr) +
        `\n\nBonnes pratiques RAG (pour le recruteur) :\n${context}` +
        (offre ? `\n\nOffre d'emploi visée :\n${offre.trim()}` : "");

      const kickoffMessage = "[Le candidat vient de s'asseoir face à toi. Commence l'entretien par un accueil bref et la première question.]";
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: kickoffMessage }
      ];

      let rawAnswer;
      try {
        rawAnswer = await callLlmMessages(messages);
      } catch (aiError) {
        await refundStart();
        throw aiError;
      }
      const answer = `${rawAnswer}\n\n_${DISCLAIMER}_`;

      const sessionId = `ivs-${crypto.randomUUID()}`;
      await db.query("INSERT INTO interview_sessions (id, user_id, created_at, answers) VALUES ($1, $2, $3, 0)", [sessionId, userId, nowIso()]);
      const updatedUser = await getUserRowById(userId);

      res.json({
        ok: true,
        message: answer,
        sessionId,
        maxAnswers: INTERVIEW_MAX_ANSWERS,
        answersUsed: 0,
        tokenCharged: debit.charged || 0,
        interviewsLeftToday: Math.max(0, INTERVIEW_DAILY_LIMIT - (await getDailyQuotaUsage(userId, "interview_session"))),
        user: await getPublicUserById(userId),
        premium: await computePremiumAccess(updatedUser),
        history: [
          { role: "assistant", content: rawAnswer }
        ]
      });
    } catch (error) {
      console.error("Erreur API start interview:", error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Envoyer un message candidat
  app.post("/api/interview/message", aiConversationRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!(await requireInterviewAccess(req, res, userId))) return;
      const {
        message = "",
        history = [],
        type_entretien = "RH",
        domaine = "générique",
        offre = "",
        finishSession = false
      } = req.body || {};

      const userText = String(message || "").trim().slice(0, 4000);
      if (!userText && !finishSession) {
        return res.status(400).json({ error: "Message vide." });
      }

      const sessionId = coerceString(req.body?.sessionId);
      const { rows: sessionRows } = sessionId
        ? await db.query("SELECT id, answers, finished_at FROM interview_sessions WHERE id = $1 AND user_id = $2", [sessionId, userId])
        : { rows: [] };
      const session = sessionRows[0];
      if (!session) {
        return res.status(409).json({ code: "INTERVIEW_SESSION_REQUIRED", error: "Cette séance n'est plus active. Démarrez un nouvel entretien." });
      }
      if (session.finished_at) {
        return res.status(409).json({ code: "INTERVIEW_SESSION_FINISHED", error: "Cette séance est terminée. Démarrez un nouvel entretien." });
      }

      // Une réponse de plus ; à la 10e, le recruteur conclut avec le bilan.
      let answersUsed = Number(session.answers || 0);
      let lastAnswer = false;
      if (!finishSession) {
        const counted = await db.query(
          "UPDATE interview_sessions SET answers = answers + 1 WHERE id = $1 AND user_id = $2 AND finished_at IS NULL AND answers < $3 RETURNING answers",
          [sessionId, userId, INTERVIEW_MAX_ANSWERS]
        );
        if (!(counted.rows || []).length) {
          return res.status(409).json({ code: "INTERVIEW_SESSION_FINISHED", error: "Cette séance est terminée. Démarrez un nouvel entretien." });
        }
        answersUsed = Number(counted.rows[0].answers);
        lastAnswer = answersUsed >= INTERVIEW_MAX_ANSWERS;
      }
      const concluding = finishSession || lastAnswer;

      const promptInput = finishSession
        ? "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis le bilan complet et la correction finale en détaillant ses points forts et ses axes d'amélioration.]"
        : lastAnswer
        ? `${userText}\n\n[C'était la ${INTERVIEW_MAX_ANSWERS}e et dernière réponse de la séance. Réagis en une phrase à cette réponse, puis conclus l'entretien et fournis le bilan complet et la correction finale en détaillant ses points forts et ses axes d'amélioration.]`
        : userText;

      const chunks = retrieveChunks(promptInput, type_entretien, domaine);
      const context = formatContext(chunks);

      let scenarioStr = "";
      if (type_entretien) scenarioStr += ` de type ${type_entretien}`;
      if (domaine) scenarioStr += ` dans le domaine ${domaine}`;

      const systemPrompt = INTERVIEWER_SYSTEM_PROMPT.replace("{scenario}", scenarioStr) +
        `\n\nBonnes pratiques RAG (pour le recruteur) :\n${context}` +
        (offre ? `\n\nOffre d'emploi visée :\n${offre.trim()}` : "");

      const formattedHistory = Array.isArray(history)
        ? history.map((item) => ({ role: item.role || (item.type === "user" ? "user" : "assistant"), content: item.content || item.text || "" }))
        : [];

      const messages = [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: promptInput }
      ];

      let rawAnswer;
      try {
        rawAnswer = await callLlmMessages(messages);
      } catch (aiError) {
        if (!finishSession) {
          await db.query("UPDATE interview_sessions SET answers = GREATEST(answers - 1, 0) WHERE id = $1 AND user_id = $2", [sessionId, userId]);
        }
        throw aiError;
      }
      const answer = `${rawAnswer}\n\n_${DISCLAIMER}_`;
      if (concluding) {
        await db.query("UPDATE interview_sessions SET finished_at = $1 WHERE id = $2 AND user_id = $3", [nowIso(), sessionId, userId]);
      }

      const updatedHistory = [
        ...formattedHistory,
        { role: "user", content: promptInput },
        { role: "assistant", content: rawAnswer }
      ];

      res.json({
        ok: true,
        message: answer,
        rawAnswer,
        history: updatedHistory,
        answersUsed,
        maxAnswers: INTERVIEW_MAX_ANSWERS,
        sessionComplete: concluding,
        isBilan: concluding || rawAnswer.toLowerCase().includes("points forts") || rawAnswer.toLowerCase().includes("bilan")
      });
    } catch (error) {
      console.error("Erreur API interview message:", error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Message Audio (Whisper transcription + Turn)
  app.post("/api/interview/audio-message", aiConversationRateLimiter, express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
    try {
      const userId = coerceString(req.query?.userId);
      if (!(await requireInterviewAccess(req, res, userId))) return;
      const audioSessionId = coerceString(req.query?.sessionId);
      const { rows: audioSession } = audioSessionId
        ? await db.query("SELECT id FROM interview_sessions WHERE id = $1 AND user_id = $2 AND finished_at IS NULL", [audioSessionId, userId])
        : { rows: [] };
      if (!audioSession[0]) {
        return res.status(409).json({ code: "INTERVIEW_SESSION_REQUIRED", error: "Cette séance n'est plus active. Démarrez un nouvel entretien." });
      }
      const audioBuffer = req.body;
      let transcribedText = "";

      if (GROQ_API_KEY && audioBuffer && audioBuffer.length > 0) {
        try {
          const blob = new Blob([audioBuffer], { type: req.headers["content-type"] || "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          formData.append("model", "whisper-large-v3-turbo");
          formData.append("language", "fr");
          // verbose_json : le fournisseur renvoie la durée audio réellement facturée.
          formData.append("response_format", "verbose_json");

          const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`
            },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            transcribedText = (data.text || "").trim();
          }
        } catch (err) {
          console.warn("Erreur transcription Whisper Groq:", err.message);
        }
      }

      // Jamais de réponse inventée à la place du candidat.
      if (!transcribedText) {
        return res.status(422).json({ error: "Votre réponse vocale n'a pas pu être transcrite. Réessayez, ou répondez par écrit." });
      }

      // Transcription seule : la réponse est ensuite envoyée à /message, avec
      // l'historique complet et le décompte des 10 questions de la séance.
      res.json({ ok: true, transcribed_text: transcribedText.slice(0, 4000) });
    } catch (error) {
      console.error("Erreur API audio interview:", error);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  // Historique des entretiens sauvegardés (même schéma que
  // negotiation_conversations / cover_letters : payload_json libre).
  app.get("/api/interview/conversations", async (req, res) => {
    try {
      const userId = coerceString(req.query.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      if (!userId) return res.status(400).json({ error: "userId requis." });

      const { rows } = await db.query(
        "SELECT id, title, created_at, updated_at, payload_json FROM interview_conversations WHERE user_id = $1 ORDER BY updated_at DESC",
        [userId]
      );

      const items = rows.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...parseJsonField(row.payload_json, {})
      }));

      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.post("/api/interview/conversations", async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const payload = req.body?.payload;
      const title = coerceString(req.body?.title) || "Entretien";

      if (!userId || !payload) {
        return res.status(400).json({ error: "userId et payload requis." });
      }

      const user = await getUserRowById(userId);
      if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

      const id = `int-${crypto.randomUUID()}`;
      const createdAt = nowIso();

      await db.query(
        `INSERT INTO interview_conversations (id, user_id, title, created_at, updated_at, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, userId, title, createdAt, createdAt, JSON.stringify(payload)]
      );

      return res.status(201).json({
        conversation: { id, userId, title, createdAt, updatedAt: createdAt, ...payload }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.put("/api/interview/conversations/:id", async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const conversationId = coerceString(req.params.id);
      const payload = req.body?.payload;
      const title = coerceString(req.body?.title);

      if (!userId || !conversationId || !payload) {
        return res.status(400).json({ error: "userId, id et payload requis." });
      }

      const { rows } = await db.query(
        "SELECT id FROM interview_conversations WHERE id = $1 AND user_id = $2",
        [conversationId, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: "Conversation introuvable." });

      const updatedAt = nowIso();
      if (title) {
        await db.query(
          "UPDATE interview_conversations SET payload_json = $1, updated_at = $2, title = $3 WHERE id = $4",
          [JSON.stringify(payload), updatedAt, title, conversationId]
        );
      } else {
        await db.query(
          "UPDATE interview_conversations SET payload_json = $1, updated_at = $2 WHERE id = $3",
          [JSON.stringify(payload), updatedAt, conversationId]
        );
      }

      return res.json({ ok: true, updatedAt });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.delete("/api/interview/conversations/:id", async (req, res) => {
    try {
      const userId = coerceString(req.query.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const conversationId = coerceString(req.params.id);
      if (!userId || !conversationId) {
        return res.status(400).json({ error: "userId et id requis." });
      }

      await db.query("DELETE FROM interview_conversations WHERE id = $1 AND user_id = $2", [conversationId, userId]);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });
}

