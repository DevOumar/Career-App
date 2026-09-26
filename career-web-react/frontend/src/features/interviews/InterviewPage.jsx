import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";
import {
  listInterviewConversations,
  saveInterviewConversation,
  updateInterviewConversation,
  deleteInterviewConversation,
  startInterviewSession,
  sendInterviewMessage,
  getApiBase,
  getSessionToken
} from "../../lib/inMemoryDb.js";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";
import { ModuleHistorySidebar, ModuleTargetCard, ModuleTipsCard } from "../../components/ModuleWorkspace.jsx";

// L'upload audio envoie un corps binaire brut (pas du JSON), donc il ne
// passe pas par le client request() générique — mais il doit quand même
// porter le même token de session (le backend vérifie l'accès Pro avant de
// transcrire) et userId pour l'identifier.
async function sendInterviewAudioMessage(audioBlob, { userId, type_entretien, domaine } = {}) {
  const apiBase = await getApiBase();
  const token = getSessionToken();
  const params = new URLSearchParams({ userId: userId || "", type_entretien: type_entretien || "RH", domaine: domaine || "générique" });
  const response = await fetch(`${apiBase}/interview/audio-message?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": audioBlob.type || "audio/webm",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: audioBlob
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erreur lors de la transcription audio.");
  return { transcribed_text: data.transcribed_text, message: data.message };
}

const DISCLAIMER =
  "Cet assistant propose des conseils génériques de préparation et ne remplace pas un accompagnement RH ou un coach carrière personnalisé.";

const END_INTERVIEW_MESSAGE =
  "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis le bilan complet et la correction finale en détaillant ses points forts et ses axes d'amélioration.]";

function LockBadge({ cx, cy }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="28" fill="var(--primary)" />
      <path
        d={`M${cx} ${cy - 12}a6.5 6.5 0 00-6.5 6.5v3.5h-1a2.5 2.5 0 00-2.5 2.5v13a2.5 2.5 0 002.5 2.5h15a2.5 2.5 0 002.5-2.5v-13a2.5 2.5 0 00-2.5-2.5h-1v-3.5A6.5 6.5 0 00${cx} ${cy - 12}zm0 3.5a3 3 0 013 3v3.5h-6v-3.5a3 3 0 013-3z`}
        fill="#fff"
      />
    </>
  );
}

function InterviewAssistantIllustration() {
  return (
    <svg viewBox="0 0 340 300" className="interview-locked-svg" aria-hidden="true" focusable="false">
      <rect x="14" y="18" width="290" height="230" rx="22" fill="var(--surface)" stroke="var(--line)" />
      <rect x="38" y="42" width="84" height="84" rx="18" fill="var(--bg-accent)" />
      <circle cx="80" cy="78" r="15" fill="none" stroke="var(--primary)" strokeWidth="3" />
      <path
        d="M56 112c2-14 12-22 24-22s22 8 24 22"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="216" y="42" width="84" height="84" rx="18" fill="#eef0ff" />
      <rect x="240" y="66" width="36" height="30" rx="10" fill="#4f46e5" />
      <circle cx="251" cy="80" r="3" fill="#fff" />
      <circle cx="265" cy="80" r="3" fill="#fff" />
      <rect x="255" y="58" width="6" height="8" rx="3" fill="#4f46e5" />
      <path
        d="M122 70h34a8 8 0 018 8v6a8 8 0 01-8 8h-20l-8 8v-8h-6a8 8 0 01-8-8v-6a8 8 0 018-8z"
        fill="var(--primary)"
        opacity="0.9"
      />
      <path
        d="M186 96h30a7 7 0 017 7v5a7 7 0 01-7 7h-6v7l-9-7h-15a7 7 0 01-7-7v-5a7 7 0 017-7z"
        fill="#4f46e5"
        opacity="0.9"
      />
      <rect x="38" y="150" width="262" height="60" rx="16" fill="var(--bg-accent)" />
      <rect x="58" y="164" width="200" height="9" rx="4.5" fill="#fff" opacity="0.75" />
      <rect x="58" y="184" width="150" height="9" rx="4.5" fill="#fff" opacity="0.75" />
      <g opacity="0.5">
        <rect x="38" y="220" width="160" height="34" rx="14" fill="var(--surface-2)" stroke="var(--line)" strokeDasharray="4 5" />
        <rect x="56" y="232" width="120" height="8" rx="4" fill="var(--line-strong)" />
      </g>
      <LockBadge cx={284} cy={222} />
    </svg>
  );
}

function InterviewPage({ language = "fr", subscription, onGoToTarifs, userId, avatarDataUrl, analyzedOffer = null }) {
  // Élan et Trajectoire Pro débloquent le simulateur d'entretiens (voir
  // data/plans.js) — seul Essentiel (gratuit) en est exclu.
  const isFreePlan = !getPlanById(subscription?.planId)?.unlocksInterviews;

  // Setup form states
  const [typeEntretien, setTypeEntretien] = useState("rh");
  const [domaine, setDomaine] = useState("");
  const [offre, setOffre] = useState("");

  // Session state
  const [inSession, setInSession] = useState(false);
  const [mode, setMode] = useState("chat"); // "chat" | "call"
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Historique des entretiens sauvegardés
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  // Inputs & Media states
  const [inputText, setInputText] = useState("");
  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [isRecordingCall, setIsRecordingCall] = useState(false);

  // Call mode timers and captions
  const [callSeconds, setCallSeconds] = useState(0);
  const [callStatus, setCallStatus] = useState("En attente...");
  const [lastCaption, setLastCaption] = useState({ role: "", text: "" });

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const callTimerRef = useRef(null);
  // Historique de conversation pour le backend (stateless : renvoyé à
  // chaque appel, mis à jour avec la réponse de chaque tour).
  const conversationHistoryRef = useRef([]);

  useEffect(() => {
    return () => {
      stopCallTimer();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listInterviewConversations(userId)
      .then((items) => {
        if (!cancelled) setConversations(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function conversationTitle() {
    const typeLabel = typeEntretien === "technique" ? "Technique" : typeEntretien === "direction" ? "Direction" : "RH";
    return domaine ? `${typeLabel} · ${domaine}` : typeLabel;
  }

  function buildConversationPayload(nextMessages) {
    return { typeEntretien, domaine, offre, messages: nextMessages };
  }

  async function persistConversation(nextMessages) {
    if (!userId) return;
    const payload = buildConversationPayload(nextMessages);
    try {
      if (conversationId) {
        await updateInterviewConversation({ userId, conversationId, payload });
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item))
        );
      } else {
        const created = await saveInterviewConversation({ userId, title: conversationTitle(), payload });
        setConversationId(created.id);
        setConversations((prev) => [{ ...created }, ...prev]);
      }
    } catch (_err) {
      // La sauvegarde de l'historique est secondaire : l'entretien en cours reste utilisable même si elle échoue.
    }
  }

  function handleNewConversation() {
    setInSession(false);
    setMessages([]);
    setConversationId(null);
    setErrorMsg("");
    conversationHistoryRef.current = [];
    setMode("chat");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setTypeEntretien(conv.typeEntretien || "rh");
    setDomaine(conv.domaine || "");
    setOffre(conv.offre || "");
    setMessages(conv.messages || []);
    conversationHistoryRef.current = [];
    setMode("chat");
    setInSession(true);
    setErrorMsg("");
  }

  async function handleDeleteConversation(event, conv) {
    event.stopPropagation();
    if (!userId) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Supprimer cet entretien ?",
      text: conv.title || "Entretien",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    try {
      await deleteInterviewConversation({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  useEffect(() => {
    if (inSession && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // --- Speech Synthesis ---
  function speakText(text, onEnd) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(DISCLAIMER, "").trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "fr-FR";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("fr"));
    if (frVoice) {
      utterance.voice = frVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  // --- Call Timer ---
  function startCallTimer() {
    setCallSeconds(0);
    clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
  }

  function stopCallTimer() {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }

  function formatTime(totalSecs) {
    const mins = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSecs % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  // --- Start Session ---
  async function handleStartSession(selectedMode) {
    setErrorMsg("");
    setLoading(true);
    setStatusText("Initialisation du simulateur IA Groq RAG...");
    setMode(selectedMode);

    try {
      const res = await startInterviewSession({
        userId,
        type_entretien: typeEntretien,
        domaine: domaine.trim(),
        offre: offre.trim(),
      });
      conversationHistoryRef.current = res.history || [];

      const firstMsg = {
        id: Date.now().toString(),
        role: "recruiter",
        text: res.message || "Bonjour, nous allons démarrer l'entretien.",
      };

      setMessages([firstMsg]);
      setInSession(true);
      persistConversation([firstMsg]);

      if (selectedMode === "call") {
        startCallTimer();
        setCallStatus("En entretien téléphonique...");
        setLastCaption({ role: "recruiter", text: firstMsg.text });
        speakText(firstMsg.text, () => {
          setCallStatus("Cliquez sur 'Parler au micro' pour répondre");
        });
      }
    } catch (err) {
      setErrorMsg(err.message || "Impossible de démarrer la session.");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  }

  // --- Send Text Message ---
  async function handleSendText() {
    const text = inputText.trim();
    if (!text || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "candidate",
      text,
    };

    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInputText("");
    setLoading(true);
    setStatusText("Le recruteur analyse votre réponse...");

    try {
      const res = await sendInterviewMessage({
        userId,
        text,
        history: conversationHistoryRef.current,
        type_entretien: typeEntretien,
        domaine: domaine.trim(),
        offre: offre.trim(),
      });
      conversationHistoryRef.current = res.history || conversationHistoryRef.current;
      const recruiterMsg = {
        id: (Date.now() + 1).toString(),
        role: "recruiter",
        text: res.message,
      };
      const withReply = [...withUser, recruiterMsg];
      setMessages(withReply);
      persistConversation(withReply);

      if (mode === "call") {
        setLastCaption({ role: "recruiter", text: res.message });
        speakText(res.message, () => {
          setCallStatus("Cliquez sur 'Parler au micro' pour votre prochaine réplique");
        });
      }
    } catch (err) {
      setMessages([
        ...withUser,
        {
          id: (Date.now() + 1).toString(),
          role: "recruiter",
          text: `Erreur : ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  }

  // --- Record Audio in Chat ---
  async function toggleChatRecording() {
    if (isRecordingChat) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingChat(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size === 0) return;

          setLoading(true);
          setStatusText("Whisper transcrit votre message vocal...");

          try {
            const res = await sendInterviewAudioMessage(audioBlob, {
              userId,
              type_entretien: typeEntretien,
              domaine: domaine.trim(),
            });
            const userMsg = {
              id: Date.now().toString(),
              role: "candidate",
              text: `[Vocal] ${res.transcribed_text}`,
            };
            const recruiterMsg = {
              id: (Date.now() + 1).toString(),
              role: "recruiter",
              text: res.message,
            };
            const nextMessages = [...messages, userMsg, recruiterMsg];
            setMessages(nextMessages);
            persistConversation(nextMessages);
          } catch (err) {
            setErrorMsg(err.message);
          } finally {
            setLoading(false);
            setStatusText("");
          }
        };

        mr.start();
        setIsRecordingChat(true);
      } catch (err) {
        alert("Accès au microphone refusé ou non supporté.");
      }
    }
  }

  // --- Record Audio in Call Mode ---
  async function toggleCallRecording() {
    if (isRecordingCall) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingCall(false);
    } else {
      try {
        stopSpeaking();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mr.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size === 0) return;

          setCallStatus("Whisper analyse votre réponse orale...");
          setLoading(true);

          try {
            const res = await sendInterviewAudioMessage(audioBlob, {
              userId,
              type_entretien: typeEntretien,
              domaine: domaine.trim(),
            });
            const userMsg = {
              id: Date.now().toString(),
              role: "candidate",
              text: `[Vocal] ${res.transcribed_text}`,
            };
            const recruiterMsg = {
              id: (Date.now() + 1).toString(),
              role: "recruiter",
              text: res.message,
            };

            const nextMessages = [...messages, userMsg, recruiterMsg];
            setMessages(nextMessages);
            persistConversation(nextMessages);
            setLastCaption({ role: "recruiter", text: res.message });

            setCallStatus("Le recruteur vous répond...");
            speakText(res.message, () => {
              setCallStatus("Cliquez sur 'Parler' pour votre prochaine réplique");
            });
          } catch (err) {
            setCallStatus(`Erreur : ${err.message}`);
          } finally {
            setLoading(false);
          }
        };

        mr.start();
        setIsRecordingCall(true);
        setCallStatus("Enregistrement vocal en cours… parlez à voix haute.");
      } catch (err) {
        setCallStatus("Erreur micro : Accès refusé ou microphone non disponible.");
      }
    }
  }

  // --- Conclude / End Interview ---
  async function handleEndInterview() {
    stopCallTimer();
    stopSpeaking();
    if (isRecordingCall || isRecordingChat) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingCall(false);
      setIsRecordingChat(false);
    }

    setLoading(true);
    setStatusText("Clôture de l'entretien et génération du bilan complet...");

    const endMsg = {
      id: Date.now().toString(),
      role: "candidate",
      text: "Je souhaite clore l'entretien et obtenir mon bilan complet.",
    };
    const withEndMsg = [...messages, endMsg];
    setMessages(withEndMsg);

    try {
      const res = await sendInterviewMessage({
        userId,
        text: END_INTERVIEW_MESSAGE,
        history: conversationHistoryRef.current,
        type_entretien: typeEntretien,
        domaine: domaine.trim(),
        offre: offre.trim(),
      });
      conversationHistoryRef.current = res.history || conversationHistoryRef.current;
      const reportMsg = {
        id: (Date.now() + 1).toString(),
        role: "recruiter",
        text: res.message,
      };
      const withReport = [...withEndMsg, reportMsg];
      setMessages(withReport);
      persistConversation(withReport);

      // If in call mode, switch back to chat to display full formatted report cleanly
      if (mode === "call") {
        setMode("chat");
        speakText(
          "L'entretien est terminé. Voici votre bilan complet avec vos points forts et axes d'amélioration."
        );
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  }

  // --- Reset Session ---
  function handleReset() {
    stopCallTimer();
    stopSpeaking();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingChat(false);
    setIsRecordingCall(false);
    setInSession(false);
    setMessages([]);
    setConversationId(null);
    conversationHistoryRef.current = [];
    setErrorMsg("");
    setStatusText("");
  }

  // --- Render formatted text with disclaimer handling ---
  // Convertit le markdown **gras** minimal utilisé par le LLM en <strong>.
  function parseBold(str) {
    return str.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
  }

  const BILAN_PATTERN = /1\.\s*\*\*(.+?)\*\*\s*:?\s*([\s\S]*?)\n2\.\s*\*\*(.+?)\*\*\s*:?\s*([\s\S]*?)\n3\.\s*\*\*(.+?)\*\*\s*:?\s*([\s\S]*)/;

  function renderBilanCard(cleanText) {
    const match = cleanText.match(BILAN_PATTERN);
    if (!match) return null;
    const intro = cleanText.slice(0, match.index).trim();
    const sections = [
      { title: match[1].trim(), body: match[2].trim(), icon: "thumbUp", tone: "strengths" },
      { title: match[3].trim(), body: match[4].trim(), icon: "chart", tone: "improvements" },
      { title: match[5].trim(), body: match[6].trim(), icon: "check", tone: "summary" }
    ];

    return (
      <div className="interview-bilan">
        <div className="interview-bilan-header">
          <UiIcon name="matchmark" />
          <strong>Bilan de l'entretien</strong>
        </div>
        {intro && <p className="interview-bilan-intro">{parseBold(intro)}</p>}
        <div className="interview-bilan-sections">
          {sections.map((section, i) => (
            <div key={i} className={`interview-bilan-block ${section.tone}`}>
              <h5>
                <UiIcon name={section.icon} />
                {section.title}
              </h5>
              <p>{parseBold(section.body)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rendu Markdown léger (pas de dépendance externe) — le backend RAG
  // (Python) renvoie du Markdown complet pour le bilan final (titres,
  // tableaux, citations), pas juste des **gras** : sans ce parseur, tous ces
  // symboles s'affichaient tels quels (##, |---|, etc.) au lieu d'être mis
  // en forme. Volontairement minimal : ne couvre que ce que le LLM produit
  // réellement (titres, gras, tableaux, citations, séparateurs, paragraphes).
  function isTableSeparatorLine(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
  }

  function splitTableRow(line) {
    const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return trimmed.split("|").map((cell) => cell.trim());
  }

  function renderMarkdown(text) {
    const lines = text.split("\n");
    const blocks = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === "") {
        i++;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const Tag = level <= 2 ? "h4" : "h5";
        blocks.push(
          <Tag className="interview-md-heading" key={key++}>
            {parseBold(headingMatch[2].trim())}
          </Tag>
        );
        i++;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quoteLines = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        blocks.push(
          <blockquote className="interview-md-quote" key={key++}>
            {parseBold(quoteLines.join(" "))}
          </blockquote>
        );
        continue;
      }

      if (line.includes("|") && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
        const headerCells = splitTableRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
          rows.push(splitTableRow(lines[i]));
          i++;
        }
        blocks.push(
          <div className="interview-md-table-wrap" key={key++}>
            <table className="interview-md-table">
              <thead>
                <tr>
                  {headerCells.map((cell, ci) => (
                    <th key={ci}>{parseBold(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{parseBold(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (/^\s*-{2,}\s*$/.test(line)) {
        blocks.push(<hr className="interview-md-hr" key={key++} />);
        i++;
        continue;
      }

      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^#{1,6}\s+/.test(lines[i]) &&
        !/^\s*>\s?/.test(lines[i]) &&
        !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) &&
        !/^\s*-{2,}\s*$/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <p className="interview-message-paragraph" key={key++}>
          {paraLines.map((l, li) => (
            <React.Fragment key={li}>
              {parseBold(l)}
              {li < paraLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    }

    return blocks;
  }

  function renderMessageText(text) {
    const cleanText = text.replace(DISCLAIMER, "").trim();
    const hasDisclaimer = text.includes(DISCLAIMER);
    const bilanCard = renderBilanCard(cleanText);

    const body = bilanCard || <>{renderMarkdown(cleanText)}</>;

    return (
      <>
        {body}
        {hasDisclaimer && <span className="interview-message-disclaimer">{DISCLAIMER}</span>}
      </>
    );
  }

  if (isFreePlan) {
    return (
      <section className="interview-locked">
        <div className="interview-locked-copy">
          <span className="interview-locked-badge">
            <UiIcon name="chart" /> Élan / Trajectoire Pro
          </span>
          <h2>Préparez vos entretiens avec l'IA RAG</h2>
          <p>
            Le simulateur d'entretien IA (feedback en direct, entretiens RH & techniques,
            transcription vocale Whisper, bilan détaillé) est inclus dans les plans Élan et Trajectoire Pro.
          </p>
          <ul className="interview-locked-features">
            <li>
              <span className="interview-locked-feature-icon icon-0">
                <UiIcon name="chat" />
              </span>
              Simulateur interactif RH & Technique avec RAG
            </li>
            <li>
              <span className="interview-locked-feature-icon icon-1">
                <UiIcon name="shield" />
              </span>
              Mode appel vocal avec synthèse vocale & Whisper STT
            </li>
            <li>
              <span className="interview-locked-feature-icon icon-2">
                <UiIcon name="network" />
              </span>
              Bilan global personnalisé et conseils d'amélioration
            </li>
          </ul>
          <button type="button" className="btn-main ready" onClick={onGoToTarifs}>
            Débloquer l'accès Pro <UiIcon name="chevron" className="btn-chevron" />
          </button>
        </div>
        <div className="interview-locked-art">
          <InterviewAssistantIllustration />
        </div>
      </section>
    );
  }

  const INTERVIEW_TYPES = [
    { id: "rh", icon: "profile", label: "RH / Soft skills", text: "Motivation, parcours, qualités relationnelles et questions pièges." },
    { id: "technique", icon: "settings", label: "Technique / Métier", text: "Compétences du poste, mises en situation et cas pratiques." },
    { id: "direction", icon: "briefcase", label: "Direction / Vision", text: "Leadership, stratégie et projection dans l'entreprise." }
  ];
  const TYPE_LABELS = { rh: "RH", technique: "Technique", direction: "Direction" };
  const hasAnalyzedOffer = Boolean(analyzedOffer && (analyzedOffer.title || analyzedOffer.description));

  function applyAnalyzedOffer() {
    if (!hasAnalyzedOffer) return;
    setDomaine([analyzedOffer.title, analyzedOffer.company].filter(Boolean).join(" · ").slice(0, 120));
    const parts = [
      analyzedOffer.description,
      analyzedOffer.missions?.length ? `Missions : ${analyzedOffer.missions.join(" ; ")}` : "",
      analyzedOffer.skills?.length ? `Compétences : ${analyzedOffer.skills.join(", ")}` : ""
    ].filter(Boolean);
    setOffre(parts.join("\n\n"));
  }

  const historySidebar = (
    <ModuleHistorySidebar
      language={language}
      newLabel="Nouvel entretien"
      historyLabel="Historique"
      emptyLabel="Aucun entretien enregistré pour l'instant."
      deleteLabel="Supprimer"
      items={conversations.map((conv) => ({ ...conv, title: conv.title || "Entretien" }))}
      activeId={conversationId}
      icon="chat"
      onNew={handleNewConversation}
      onSelect={handleResumeConversation}
      onDelete={handleDeleteConversation}
      renderMeta={(conv) => {
        const answers = Array.isArray(conv.messages) ? conv.messages.filter((msg) => msg.role === "candidate" || msg.role === "user").length : 0;
        return <span>{answers ? `${answers} réponse(s)` : "Non commencé"}</span>;
      }}
    >
      {hasAnalyzedOffer ? <ModuleTargetCard language={language} offer={analyzedOffer} candidate={null} /> : null}
      <ModuleTipsCard
        title="Conseils"
        tips={[
          "Répondez avec la méthode STAR : situation, tâche, action, résultat.",
          "Appuyez chaque qualité sur un exemple concret et chiffré.",
          "Préparez deux ou trois questions à poser au recruteur."
        ]}
      />
    </ModuleHistorySidebar>
  );

  // --- SETUP SCREEN ---
  if (!inSession) {
    return (
      <div className="mw-layout">
        {historySidebar}
        <section className="mw-main">
          {errorMsg && (
            <div className="interview-setup-error">
              <UiIcon name="alert" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="mw-card iv-loading">
              <span className="iv-loading-pulse" aria-hidden="true">
                <UiIcon name="aiAgent" />
              </span>
              <strong>Préparation de votre entretien</strong>
              <span>{statusText || "L'IA prépare vos premières questions…"}</span>
            </div>
          ) : (
            <>
              <div className="mw-card">
                <div className="mw-step-head">
                  <span className="mw-step-num">1</span>
                  <div>
                    <h3>Type d'entretien</h3>
                    <p>Le recruteur IA adapte ses questions au format choisi.</p>
                  </div>
                </div>
                <div className="mw-options">
                  {INTERVIEW_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`mw-option ${typeEntretien === t.id ? "is-active" : ""}`}
                      onClick={() => setTypeEntretien(t.id)}
                      aria-pressed={typeEntretien === t.id}
                    >
                      <span className="mw-option-icon">
                        <UiIcon name={t.icon} />
                      </span>
                      <strong>{t.label}</strong>
                      <small>{t.text}</small>
                    </button>
                  ))}
                </div>

                <div className="mw-step-head iv-step">
                  <span className="mw-step-num">2</span>
                  <div>
                    <h3>Poste et offre visés</h3>
                    <p>Facultatif, mais l'entretien est bien plus réaliste avec une offre précise.</p>
                  </div>
                  {hasAnalyzedOffer ? (
                    <button type="button" className="iw-mini-btn iv-use-offer" onClick={applyAnalyzedOffer}>
                      <UiIcon name="briefcase" /> Utiliser l'offre analysée
                    </button>
                  ) : null}
                </div>
                <div className="iv-fields">
                  <label className="cd-field">
                    <span>Domaine / poste ciblé</span>
                    <input
                      id="interview-domaine"
                      type="text"
                      maxLength={120}
                      placeholder="Ex : Développeur Fullstack React, Chef de projet digital…"
                      value={domaine}
                      onChange={(e) => setDomaine(e.target.value)}
                    />
                  </label>
                  <label className="cd-field">
                    <span>Offre d'emploi</span>
                    <textarea
                      id="interview-offre"
                      rows={5}
                      maxLength={8000}
                      placeholder="Collez ici le descriptif du poste pour ancrer l'entretien dans un rôle précis…"
                      value={offre}
                      onChange={(e) => setOffre(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="mw-card">
                <div className="mw-step-head">
                  <span className="mw-step-num">3</span>
                  <div>
                    <h3>Lancez la simulation</h3>
                    <p>Entretien {TYPE_LABELS[typeEntretien]}{domaine ? ` · ${domaine}` : ""}</p>
                  </div>
                </div>
                <div className="iv-modes">
                  <button type="button" className="iv-mode" onClick={() => handleStartSession("chat")} disabled={loading}>
                    <span className="iv-mode-icon">
                      <UiIcon name="chat" />
                    </span>
                    <span className="iv-mode-text">
                      <strong>Entretien écrit</strong>
                      <small>Vous répondez par écrit, à votre rythme. Idéal pour structurer vos réponses.</small>
                    </span>
                    <UiIcon name="chevron" className="iv-mode-go" />
                  </button>
                  <button type="button" className="iv-mode is-voice" onClick={() => handleStartSession("call")} disabled={loading}>
                    <span className="iv-mode-icon">
                      <UiIcon name="phone" />
                    </span>
                    <span className="iv-mode-text">
                      <strong>Appel vocal</strong>
                      <small>Le recruteur vous parle et vous répondez à voix haute, comme en vrai.</small>
                    </span>
                    <UiIcon name="chevron" className="iv-mode-go" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  // --- ACTIVE SESSION SCREEN ---
  return (
    <div className="mw-layout">
      {historySidebar}
      <section className="mw-main interview-page interview-session">
      <div className="interview-session-bar">
        <div className="interview-session-tags">
          <span className={`interview-session-tag ${typeEntretien}`}>
            {typeEntretien === "technique" ? "Entretien technique" : typeEntretien === "direction" ? "Entretien direction" : "Entretien RH"}
          </span>
          {domaine && <span className="interview-session-domain">{domaine}</span>}
        </div>

        <div className="interview-session-actions">
          <button type="button" className="btn-main" onClick={handleEndInterview} disabled={loading}>
            <UiIcon name="check" />
            Terminer &amp; bilan
          </button>
          <button type="button" className="btn-secondary" onClick={handleReset}>
            <UiIcon name="history" />
            Recommencer
          </button>
        </div>
      </div>

      {/* CALL MODE SCREEN */}
      {mode === "call" ? (
        <div className="interview-call-card">
          <div className="interview-call-timer">{formatTime(callSeconds)}</div>

          <div className={`interview-call-avatar ${isRecordingCall ? "recording" : ""}`}>
            <UiIcon name={isRecordingCall ? "chat" : "aiAgent"} className="interview-call-avatar-icon" />
          </div>

          <p className="interview-call-status">{callStatus}</p>

          {lastCaption.text && (
            <div className="interview-call-caption">
              <strong>{lastCaption.role === "recruiter" ? "Recruteur RH :" : "Vous :"}</strong>
              {lastCaption.text.replace(DISCLAIMER, "").trim()}
            </div>
          )}

          <div className="interview-call-actions">
            <button
              type="button"
              className={`interview-call-mic-btn ${isRecordingCall ? "recording" : ""}`}
              onClick={toggleCallRecording}
              disabled={loading}
            >
              <UiIcon name="phone" />
              {isRecordingCall ? "Arrêter et envoyer" : "Parler au micro"}
            </button>

            <button type="button" className="interview-call-switch-btn" onClick={() => setMode("chat")}>
              <UiIcon name="chat" />
              Basculer en chat
            </button>
          </div>
        </div>
      ) : (
        /* CHAT MODE SCREEN */
        <div className="interview-chat-card">
          <AiDisclaimer
            language={language}
            className="is-banner"
            text={
              language === "en"
                ? "AI-simulated interview: feedback and the final report are indicative. Always check them."
                : "Entretien simulé par l'IA : les retours et le bilan sont indicatifs. Vérifiez-les toujours."
            }
          />
          <div className="interview-chat-stream">
            {messages.map((msg) => {
              const isRecruiter = msg.role === "recruiter";
              return (
                <div key={msg.id} className={`interview-message ${isRecruiter ? "recruiter" : "candidate"}`}>
                  <div className="interview-message-header">
                    {isRecruiter ? (
                      <span className="interview-message-avatar recruiter">
                        <UiIcon name="aiAgent" />
                      </span>
                    ) : null}
                    <span className="interview-message-role">{isRecruiter ? "Recruteur IA" : "Vous"}</span>
                    {!isRecruiter ? (
                      <span className="interview-message-avatar candidate">
                        {avatarDataUrl ? <img src={avatarDataUrl} alt="" /> : <UiIcon name="profile" />}
                      </span>
                    ) : null}
                  </div>
                  <div className="interview-message-bubble">{renderMessageText(msg.text)}</div>
                </div>
              );
            })}

            {loading && (
              <div className="interview-typing">
                <span className="interview-typing-dots">
                  <i />
                  <i />
                  <i />
                </span>
                {statusText || "Le recruteur réfléchit…"}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="interview-chat-input-bar">
            <button
              type="button"
              className={`interview-mic-btn ${isRecordingChat ? "recording" : ""}`}
              onClick={toggleChatRecording}
              disabled={loading}
              title="Enregistrer un message vocal"
            >
              <UiIcon name="phone" />
            </button>

            <textarea
              rows={2}
              placeholder="Saisissez votre réponse au recruteur (Entrée pour envoyer)…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              disabled={loading}
            />

            <button type="button" className="btn-main" onClick={handleSendText} disabled={loading || !inputText.trim()}>
              Envoyer
            </button>
          </div>
        </div>
      )}
      </section>
    </div>
  );
}

export default InterviewPage;
