import React, { useState, useEffect, useRef } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";

// Client API du module Entretiens : appelle directement le backend JS
// (backend/routes/interview.js, stateless — l'historique de conversation
// est renvoyé à chaque appel et doit être repassé au tour suivant), en
// suivant le même schéma que le reste du module (fetch relatif vers
// /api/interview/*, sans dépendance externe). Pas de service Python à
// lancer en parallèle.
async function startInterviewSession({ type_entretien, domaine, offre }) {
  const response = await fetch("/api/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type_entretien, domaine, offre })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Impossible de démarrer la session.");
  return { message: data.message, history: data.history || [] };
}

async function sendInterviewMessage(text, { history = [], type_entretien, domaine, offre } = {}) {
  const response = await fetch("/api/interview/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, history, type_entretien, domaine, offre })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Erreur lors de l'envoi du message.");
  return { message: data.message, history: data.history || history };
}

async function sendInterviewAudioMessage(audioBlob, { type_entretien, domaine } = {}) {
  const params = new URLSearchParams({ type_entretien: type_entretien || "RH", domaine: domaine || "générique" });
  const response = await fetch(`/api/interview/audio-message?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": audioBlob.type || "audio/webm" },
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

function InterviewPage({ language = "fr", subscription, onGoToTarifs }) {
  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

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

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setStatusText("Le recruteur analyse votre réponse...");

    try {
      const res = await sendInterviewMessage(text, {
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
      setMessages((prev) => [...prev, recruiterMsg]);

      if (mode === "call") {
        setLastCaption({ role: "recruiter", text: res.message });
        speakText(res.message, () => {
          setCallStatus("Cliquez sur 'Parler au micro' pour votre prochaine réplique");
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
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
            setMessages((prev) => [...prev, userMsg, recruiterMsg]);
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

            setMessages((prev) => [...prev, userMsg, recruiterMsg]);
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
    setMessages((prev) => [...prev, endMsg]);

    try {
      const res = await sendInterviewMessage(END_INTERVIEW_MESSAGE, {
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
      setMessages((prev) => [...prev, reportMsg]);

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

  function renderMessageText(text) {
    const cleanText = text.replace(DISCLAIMER, "").trim();
    const hasDisclaimer = text.includes(DISCLAIMER);
    const bilanCard = renderBilanCard(cleanText);

    const body = bilanCard || (
      <>
        {cleanText.split("\n\n").map((p, i) => (
          <p className="interview-message-paragraph" key={i}>
            {p.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {parseBold(line)}
                {j < p.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ))}
      </>
    );

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
            <UiIcon name="chart" /> Trajectoire Pro
          </span>
          <h2>Préparez vos entretiens avec l'IA RAG</h2>
          <p>
            Le simulateur d'entretien IA (feedback en direct, entretiens RH & techniques,
            transcription vocale Whisper, bilan détaillé) est inclus dans le plan Pro.
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

  // --- SETUP SCREEN ---
  if (!inSession) {
    return (
      <section className="interview-page">
        <div className="card setup-card">
          <div className="setup-header">
            <div className="setup-header-icon">
              <UiIcon name="matchmark" />
            </div>
            <div>
              <h3>Simulateur d'entretien IA</h3>
              <p>Configurez votre session pour commencer la simulation avec le recruteur virtuel.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="interview-setup-error">
              <UiIcon name="alert" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="extracting-state">
              <div className="loader-ring" />
              <strong>Préparation de votre entretien</strong>
              <span>{statusText || "L'IA prépare vos premières questions…"}</span>
            </div>
          ) : (
            <div className="setup-form">
              <div className="form-group">
                <label>Type d'entretien</label>
                <div className="interview-type-group">
                  {[
                    { id: "rh", icon: "profile", label: "RH / Soft Skills" },
                    { id: "technique", icon: "settings", label: "Technique / Métier" },
                    { id: "direction", icon: "briefcase", label: "Direction / Vision" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`interview-type-option ${typeEntretien === t.id ? "active" : ""}`}
                      onClick={() => setTypeEntretien(t.id)}
                    >
                      <UiIcon name={t.icon} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="interview-domaine">Domaine / poste ciblé <span className="muted">(optionnel)</span></label>
                <input
                  id="interview-domaine"
                  type="text"
                  placeholder="Ex : Développeur Fullstack React, Chef de projet digital…"
                  value={domaine}
                  onChange={(e) => setDomaine(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="interview-offre">Offre d'emploi visée <span className="muted">(optionnel)</span></label>
                <textarea
                  id="interview-offre"
                  rows={4}
                  placeholder="Collez ici le descriptif du poste pour ancrer l'entretien dans un rôle précis…"
                  value={offre}
                  onChange={(e) => setOffre(e.target.value)}
                />
              </div>

              <div className="setup-actions">
                <button
                  type="button"
                  className="btn-main"
                  onClick={() => handleStartSession("chat")}
                  disabled={loading}
                >
                  <UiIcon name="chat" />
                  Démarrer l'entretien écrit
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleStartSession("call")}
                  disabled={loading}
                >
                  <UiIcon name="phone" />
                  Démarrer l'appel vocal
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // --- ACTIVE SESSION SCREEN ---
  return (
    <section className="interview-page interview-session">
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
            <UiIcon name={isRecordingCall ? "chat" : "profile"} className="interview-call-avatar-icon" />
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
          <div className="interview-chat-stream">
            {messages.map((msg) => {
              const isRecruiter = msg.role === "recruiter";
              return (
                <div key={msg.id} className={`interview-message ${isRecruiter ? "recruiter" : "candidate"}`}>
                  <span className="interview-message-role">{isRecruiter ? "Recruteur IA" : "Vous"}</span>
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
  );
}

export default InterviewPage;
