import express from "express";
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

const DISCLAIMER =
  "Cet assistant propose des conseils génériques de préparation et ne remplace pas un accompagnement RH ou un coach carrière personnalisé.";

const INTERVIEWER_SYSTEM_PROMPT =
  "Tu incarnes un(e) RH senior, très expérimenté(e), qui fait passer un " +
  "entretien d'embauche{scenario} à un(e) candidat(e). Tu restes dans ce " +
  "rôle du début à la fin de la conversation : c'est TOI qui mènes " +
  "l'entretien. Règles :\n" +
  "- Pose UNE seule question à la fois, jamais plusieurs d'un coup.\n" +
  "- Pendant l'entretien, après chaque réponse du candidat, réagis de manière " +
  "courte, naturelle et professionnelle (ex: 'Très bien', 'D'accord', 'Merci " +
  "pour ces précisions'), SANS donner de correction détaillée ni d'évaluation " +
  "intermédiaire. Enchaîne directement avec la question suivante.\n" +
  "- Varie les thèmes classiques d'entretien (présentation, motivation, " +
  "parcours, qualités/défauts, gestion de situations difficiles, " +
  "prétentions salariales, questions techniques ou de mise en situation " +
  "selon le poste, etc.) au fil de la conversation.\n" +
  "- L'entretien comporte environ 4 à 5 questions posées successivement. " +
  "Une fois toutes les questions posées ou si le candidat indique vouloir " +
  "clore l'entretien (ou si le message contient une demande de bilan), tu " +
  "dois impérativement clore l'entretien et fournir la CORRECTION ET LE " +
  "BILAN GLOBAL FINAL.\n" +
  "- La correction finale / bilan de fin d'entretien doit être structuré(e) " +
  "clairement ainsi :\n" +
  "  1. **Points forts** : Mentionne et détaille ce que le candidat a bien " +
  "réussi au cours de l'entretien (pertinence des exemples, clarté, posture, " +
  "structure des réponses, adéquation avec le poste visé).\n" +
  "  2. **Axes d'amélioration & Corrections** : Analyse les réponses plus " +
  "faibles ou maladroites (réponses trop vagues, manque d'exemples concrets, " +
  "faux défauts, etc.) et propose des reformulations et pistes concrètes d'amélioration " +
  "en t'appuyant sur les bonnes pratiques du corpus RAG ci-dessous.\n" +
  "  3. **Synthèse & Conseil global** : Donne un bilan général sur la prestation " +
  "et les derniers conseils pour réussir son entretien réel.\n" +
  "- Reste exigeant(e) mais professionnel(le) et constructif(ve), jamais " +
  "hors du rôle du RH senior.\n" +
  "- N'invente et ne formule jamais toi-même de clause de " +
  "non-responsabilité, de confidentialité ou d'avertissement légal, sous " +
  "quelque forme que ce soit : une mention officielle est ajoutée " +
  "automatiquement après ta réponse, il ne faut pas la doubler ni " +
  "l'anticiper.\n" +
  "- Si une offre d'emploi est fournie ci-dessous, mets-toi dans la peau " +
  "de l'entreprise qui recrute pour CE poste précis : ancre tes questions " +
  "et tes retours dans son contenu réel (intitulé, missions, compétences " +
  "demandées, contexte de l'entreprise), au lieu de questions " +
  "génériques.";

const KICKOFF_MESSAGE =
  "[Le candidat vient de s'asseoir face à toi. Commence l'entretien par un accueil bref et la première question.]";

const END_INTERVIEW_MESSAGE =
  "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis le bilan complet et la correction finale en détaillant ses points forts et ses axes d'amélioration.]";

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
  if (!chunks || chunks.length === 0) return "(aucun contexte pertinent trouvé)";
  return chunks
    .map((chunk, idx) => `[Extrait ${idx + 1} — ${chunk.metadata?.sous_theme || chunk.sous_theme || "?"} / ${chunk.metadata?.domaine || chunk.domaine || "?"}]\n${chunk.texte}`)
    .join("\n\n");
}

function buildInterviewPrompt(candidateMessage, chunks, type_entretien, domaine, offre) {
  const scenarioBits = [];
  if (type_entretien) scenarioBits.push(`de type ${type_entretien}`);
  if (domaine) scenarioBits.push(`pour un poste dans le domaine ${domaine}`);
  const scenario = scenarioBits.length > 0 ? ` ${scenarioBits.join(" ")}` : "";

  const context = formatContext(chunks);
  let systemContent =
    `${INTERVIEWER_SYSTEM_PROMPT.replace("{scenario}", scenario)}\n\n` +
    `Bonnes pratiques (pour toi, recruteur — ne pas réciter telles quelles) :\n${context}`;

  if (offre && offre.trim()) {
    systemContent += `\n\nOffre d'emploi visée par le candidat :\n${offre.trim()}`;
  }

  return {
    systemMessage: { role: "system", content: systemContent },
    userMessage: { role: "user", content: candidateMessage }
  };
}

export function registerInterviewRoutes(app) {
  async function callLlmMessages(messages, temperature = 0.4) {
    const groqKey = process.env.GROQ_API_KEY || app.locals.ctx?.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || app.locals.ctx?.OPENAI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY || app.locals.ctx?.XAI_API_KEY;
    const groqModel = process.env.GROQ_MODEL || process.env.AI_MODEL || "llama-3.3-70b-versatile";

    if (groqKey) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: groqModel,
            messages,
            temperature
          })
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content?.trim() || "";
          content = content.replace(DISCLAIMER, "").trim();
          return `${content}\n\n${DISCLAIMER}`;
        } else {
          const errData = await response.text();
          console.warn("Groq API warning/error status:", response.status, errData);
        }
      } catch (err) {
        console.warn("Erreur Groq LLM:", err.message);
      }
    }

    if (openaiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature
          })
        });
        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content?.trim() || "";
          content = content.replace(DISCLAIMER, "").trim();
          return `${content}\n\n${DISCLAIMER}`;
        }
      } catch (err) {
        console.warn("Erreur OpenAI LLM:", err.message);
      }
    }

    // Fallback simulation when no API key is provided
    const lastUser = messages.filter((m) => m.role === "user").pop()?.content || "";
    let content = "";
    if (lastUser.includes("[Le candidat vient de s'asseoir") || lastUser.includes("kickoff")) {
      content = "Bonjour et bienvenue ! Je suis ravi(e) de vous recevoir aujourd'hui pour cet entretien. Pour commencer, pouvez-vous vous présenter brièvement et m'expliquer ce qui motive votre candidature ?";
    } else if (lastUser.includes("[Le candidat souhaite clore") || lastUser.toLowerCase().includes("bilan")) {
      content = `Merci beaucoup pour cet échange. Voici votre bilan d'entretien complet :\n\n1. **Points forts** : Présentation claire et structurée de votre parcours, motivation bien articulée.\n2. **Axes d'amélioration & Corrections** : Développez davantage vos exemples en utilisant la méthode STAR (Situation, Tâche, Action, Résultat) avec des chiffres précis.\n3. **Synthèse & Conseil global** : Prestation solide et prometteuse. Continuez à vous entraîner !`;
    } else {
      content = "C'est très intéressant. Pouvez-vous me donner un exemple concret d'une situation complexe que vous avez dû gérer dans votre précédent poste, et comment vous l'avez surmontée ?";
    }
    return `${content}\n\n${DISCLAIMER}`;
  }

  // POST /api/interview/start
  app.post("/api/interview/start", async (req, res) => {
    try {
      const { type_entretien = "RH", domaine = "générique", offre = "" } = req.body || {};
      const chunks = retrieveChunks(KICKOFF_MESSAGE, type_entretien, domaine);
      const { systemMessage, userMessage } = buildInterviewPrompt(
        KICKOFF_MESSAGE,
        chunks,
        type_entretien,
        domaine,
        offre
      );

      const messages = [systemMessage, userMessage];
      const answer = await callLlmMessages(messages);
      const cleanAnswer = answer.replace(DISCLAIMER, "").trim();

      res.json({
        ok: true,
        message: answer,
        rawAnswer: cleanAnswer,
        history: [
          { role: "assistant", content: cleanAnswer }
        ]
      });
    } catch (error) {
      console.error("Erreur API start interview:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/interview/message
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

      const candidateMessage = finishSession ? END_INTERVIEW_MESSAGE : (message || "").trim();
      if (!candidateMessage) {
        return res.status(400).json({ error: "Message vide." });
      }

      // Format past history without disclaimer text
      const cleanHistory = Array.isArray(history)
        ? history
            .filter((h) => h.content || h.text)
            .map((h) => ({
              role: h.role === "user" || h.type === "user" ? "user" : "assistant",
              content: String(h.content || h.text || "").replace(DISCLAIMER, "").trim()
            }))
        : [];

      const chunks = retrieveChunks(candidateMessage, type_entretien, domaine);
      const { systemMessage, userMessage } = buildInterviewPrompt(
        candidateMessage,
        chunks,
        type_entretien,
        domaine,
        offre
      );

      // Format messages array: [ system, ...cleanHistory, userMessage ]
      const messages = [systemMessage, ...cleanHistory, userMessage];

      const answer = await callLlmMessages(messages);
      const cleanAnswer = answer.replace(DISCLAIMER, "").trim();

      const updatedHistory = [
        ...cleanHistory,
        userMessage,
        { role: "assistant", content: cleanAnswer }
      ];

      res.json({
        ok: true,
        message: answer,
        rawAnswer: cleanAnswer,
        history: updatedHistory,
        isBilan: finishSession || cleanAnswer.toLowerCase().includes("points forts") || cleanAnswer.toLowerCase().includes("bilan")
      });
    } catch (error) {
      console.error("Erreur API interview message:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/interview/audio-message
  app.post("/api/interview/audio-message", express.raw({ type: "*/*", limit: "15mb" }), async (req, res) => {
    try {
      const audioBuffer = req.body;
      let transcribedText = "";
      const groqKey = process.env.GROQ_API_KEY || app.locals.ctx?.GROQ_API_KEY;

      if (groqKey && audioBuffer && audioBuffer.length > 0) {
        try {
          const blob = new Blob([audioBuffer], { type: req.headers["content-type"] || "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          formData.append("model", "whisper-large-v3-turbo");
          formData.append("language", "fr");

          const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`
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
        transcribedText = "J'ai plusieurs expériences clés dans ce domaine et je souhaite vous présenter ma démarche.";
      }

      const type_entretien = req.query.type_entretien || "RH";
      const domaine = req.query.domaine || "générique";
      const offre = req.query.offre || "";

      const chunks = retrieveChunks(transcribedText, type_entretien, domaine);
      const { systemMessage, userMessage } = buildInterviewPrompt(
        transcribedText,
        chunks,
        type_entretien,
        domaine,
        offre
      );

      const messages = [systemMessage, userMessage];
      const answer = await callLlmMessages(messages);
      const cleanAnswer = answer.replace(DISCLAIMER, "").trim();

      res.json({
        ok: true,
        transcribed_text: transcribedText,
        message: answer,
        rawAnswer: cleanAnswer
      });
    } catch (error) {
      console.error("Erreur API audio interview:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
