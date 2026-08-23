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
- Pose UNE seule question à la fois, jamais plusieurs d'un coup.
- Pendant l'entretien, après chaque réponse du candidat, réagis de manière courte, naturelle et professionnelle (ex: 'Très bien', 'D'accord', 'Merci pour ces précisions'), SANS donner de correction détaillée ni d'évaluation intermédiaire. Enchaîne directement avec la question suivante.
- Varie les thèmes classiques d'entretien (présentation, motivation, parcours, qualités/défauts, gestion de situations difficiles, prétentions salariales, questions techniques ou de mise en situation selon le poste, etc.) au fil de la conversation.
- L'entretien comporte environ 4 à 5 questions posées successivement. Si le candidat indique vouloir clore l'entretien ou si le message contient une demande de bilan, tu dois impérativement clore l'entretien et fournir la CORRECTION ET LE BILAN GLOBAL FINAL.
- La correction finale / bilan de fin d'entretien doit être structuré(e) clairement ainsi :
  1. **Points forts** : Mentionne et détaille ce que le candidat a bien réussi au cours de l'entretien (pertinence des exemples, clarté, posture, structure des réponses, adéquation avec le poste visé).
  2. **Axes d'amélioration & Corrections** : Analyse les réponses plus faibles ou maladroites (réponses trop vagues, manque d'exemples concrets, faux défauts, etc.) et propose des reformulations et pistes concrètes d'amélioration en t'appuyant sur les bonnes pratiques du corpus RAG.
  3. **Synthèse & Conseil global** : Donne un bilan général sur la prestation et les derniers conseils pour réussir son entretien réel.
- Reste exigeant(e) mais professionnel(le) et constructif(ve).
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
    express,
    AI_PROVIDER,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    XAI_API_KEY
  } = app.locals.ctx;

  async function callLlmMessages(messages) {
    const apiKey = GROQ_API_KEY || OPENAI_API_KEY || XAI_API_KEY;
    const provider = GROQ_API_KEY ? "groq" : OPENAI_API_KEY ? "openai" : XAI_API_KEY ? "xai" : "none";

    if (provider === "groq" && GROQ_API_KEY) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.7,
            max_tokens: 1500
          })
        });
        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.warn("Erreur Groq LLM:", err.message);
      }
    }

    if (provider === "openai" && OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 1500
          })
        });
        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.warn("Erreur OpenAI LLM:", err.message);
      }
    }

    // Fallback simulation when no API key configured
    const lastUser = messages.filter((m) => m.role === "user").pop()?.content || "";
    if (lastUser.includes("[START_INTERVIEW]") || lastUser.includes("[KICKOFF]")) {
      return "Bonjour et bienvenue ! Je suis ravi(e) de vous recevoir aujourd'hui pour cet entretien. Pour commencer, pouvez-vous vous présenter brièvement en quelques minutes ?";
    }
    if (lastUser.toLowerCase().includes("bilan") || lastUser.toLowerCase().includes("fin") || lastUser.includes("[END_INTERVIEW]")) {
      return `Merci beaucoup pour cet échange. Voici votre bilan d'entretien complet :\n\n1. **Points forts** : Bonne élocution, présentation structurée de votre parcours et motivation claire pour le poste.\n2. **Axes d'amélioration & Corrections** : Appuyez davantage vos réponses avec la méthode STAR (Situation, Tâche, Action, Résultat) pour donner des exemples chiffrés et factuels.\n3. **Synthèse & Conseil global** : Prestation solide ! Entraînez-vous à préparer 3 exemples STAR concrets pour aborder votre prochain entretien réel en toute confiance.`;
    }

    return "C'est bien noté. Pouvez-vous me donner un exemple concret d'une situation où vous avez dû surmonter une difficulté technique ou un conflit en équipe, et comment vous l'avez résolu ?";
  }

  // Démarrer la simulation
  app.post("/api/interview/start", async (req, res) => {
    try {
      const { type_entretien = "RH", domaine = "générique", offre = "" } = req.body || {};
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

      const rawAnswer = await callLlmMessages(messages);
      const answer = `${rawAnswer}\n\n_${DISCLAIMER}_`;

      res.json({
        ok: true,
        message: answer,
        history: [
          { role: "assistant", content: rawAnswer }
        ]
      });
    } catch (error) {
      console.error("Erreur API start interview:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Envoyer un message candidat
  app.post("/api/interview/message", async (req, res) => {
    try {
      const {
        message = "",
        history = [],
        type_entretien = "RH",
        domaine = "générique",
        offre = "",
        finishSession = false
      } = req.body || {};

      const userText = message.trim();
      if (!userText && !finishSession) {
        return res.status(400).json({ error: "Message vide." });
      }

      const promptInput = finishSession
        ? "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis le bilan complet et la correction finale en détaillant ses points forts et ses axes d'amélioration.]"
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

      const rawAnswer = await callLlmMessages(messages);
      const answer = `${rawAnswer}\n\n_${DISCLAIMER}_`;

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
        isBilan: finishSession || rawAnswer.toLowerCase().includes("points forts") || rawAnswer.toLowerCase().includes("bilan")
      });
    } catch (error) {
      console.error("Erreur API interview message:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Message Audio (Whisper transcription + Turn)
  app.post("/api/interview/audio-message", express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
    try {
      const audioBuffer = req.body;
      let transcribedText = "";

      if (GROQ_API_KEY && audioBuffer && audioBuffer.length > 0) {
        try {
          const blob = new Blob([audioBuffer], { type: req.headers["content-type"] || "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          formData.append("model", "whisper-large-v3-turbo");
          formData.append("language", "fr");

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

      if (!transcribedText) {
        transcribedText = "Merci de m'avoir posé la question. J'ai plusieurs expériences pertinentes sur ce sujet.";
      }

      const type_entretien = req.query.type_entretien || "RH";
      const domaine = req.query.domaine || "générique";

      const chunks = retrieveChunks(transcribedText, type_entretien, domaine);
      const context = formatContext(chunks);

      const systemPrompt = INTERVIEWER_SYSTEM_PROMPT.replace("{scenario}", ` de type ${type_entretien}`) +
        `\n\nBonnes pratiques RAG :\n${context}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcribedText }
      ];

      const rawAnswer = await callLlmMessages(messages);
      const answer = `${rawAnswer}\n\n_${DISCLAIMER}_`;

      res.json({
        ok: true,
        transcribed_text: transcribedText,
        message: answer,
        rawAnswer
      });
    } catch (error) {
      console.error("Erreur API audio interview:", error);
      res.status(500).json({ error: error.message });
    }
  });
}

