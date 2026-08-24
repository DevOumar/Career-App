import React, { useState, useEffect, useRef } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";
import {
  startInterviewSession,
  sendInterviewMessage,
  sendInterviewAudioMessage,
} from "../../lib/inMemoryDb.js";

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
          setCallStatus("Clique sur 'Parler au micro' pour répondre");
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
    setStatusText("Le recruteur analyse ta réponse...");

    try {
      const res = await sendInterviewMessage(text);
      const recruiterMsg = {
        id: (Date.now() + 1).toString(),
        role: "recruiter",
        text: res.message,
      };
      setMessages((prev) => [...prev, recruiterMsg]);

      if (mode === "call") {
        setLastCaption({ role: "recruiter", text: res.message });
        speakText(res.message, () => {
          setCallStatus("Clique sur 'Parler au micro' pour ta prochaine réplique");
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
            const res = await sendInterviewAudioMessage(audioBlob);
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

          setCallStatus("Whisper analyse ta réponse orale...");
          setLoading(true);

          try {
            const res = await sendInterviewAudioMessage(audioBlob);
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
              setCallStatus("Clique sur 'Parler' pour ta prochaine réplique");
            });
          } catch (err) {
            setCallStatus(`Erreur : ${err.message}`);
          } finally {
            setLoading(false);
          }
        };

        mr.start();
        setIsRecordingCall(true);
        setCallStatus("🔴 Enregistrement vocal en cours... Parle à voix haute !");
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
      const res = await sendInterviewMessage(END_INTERVIEW_MESSAGE);
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
  function renderMessageText(text) {
    const cleanText = text.replace(DISCLAIMER, "").trim();
    const hasDisclaimer = text.includes(DISCLAIMER);

    // Format paragraphs & linebreaks nicely
    const paragraphs = cleanText.split("\n\n").map((p, i) => (
      <p key={i} style={{ margin: "0 0 0.5rem 0", lineHeight: "1.55" }}>
        {p.split("\n").map((line, j) => (
          <React.Fragment key={j}>
            {line}
            {j < p.split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    ));

    return (
      <>
        {paragraphs}
        {hasDisclaimer && (
          <span
            className="disclaimer"
            style={{
              display: "block",
              marginTop: "0.6rem",
              fontSize: "0.75rem",
              color: "var(--text-muted, #718096)",
              fontStyle: "italic",
              borderTop: "1px dashed var(--line, #e2e8f0)",
              paddingTop: "0.4rem",
            }}
          >
            {DISCLAIMER}
          </span>
        )}
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
      <section className="interview-page card" style={{ maxWidth: "860px", margin: "1.5rem auto", padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "700", marginBottom: "0.4rem" }}>
            🎯 Simulateur d'Entretien IA (RAG Groq & Speech)
          </h2>
          <p style={{ color: "var(--text-2, #64748b)", fontSize: "0.95rem" }}>
            Configurez votre session pour commencer la simulation avec le recruteur virtuel.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "0.8rem 1rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              borderRadius: "10px",
              marginBottom: "1.2rem",
              fontSize: "0.9rem",
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: "grid", gap: "1.2rem" }}>
          <div>
            <label style={{ fontWeight: "600", display: "block", marginBottom: "0.4rem" }}>
              Type d'entretien :
            </label>
            <select
              value={typeEntretien}
              onChange={(e) => setTypeEntretien(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "10px",
                border: "1px solid var(--line, #cbd5e1)",
                background: "var(--surface, #fff)",
                fontSize: "0.95rem",
              }}
            >
              <option value="rh">Entretien RH (Soft Skills, Parcours & Culture Fit)</option>
              <option value="technique">Entretien Technique (Compétences dures & Problem Solving)</option>
              <option value="direction">Entretien Direction (Management & Vision)</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: "600", display: "block", marginBottom: "0.4rem" }}>
              Domaine / Poste ciblé :
            </label>
            <input
              type="text"
              placeholder="Ex: Développeur Fullstack React / Python, Chef de Projet Digital..."
              value={domaine}
              onChange={(e) => setDomaine(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "10px",
                border: "1px solid var(--line, #cbd5e1)",
                background: "var(--surface, #fff)",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: "600", display: "block", marginBottom: "0.4rem" }}>
              Offre d'emploi (Optionnel - collez le texte de l'annonce) :
            </label>
            <textarea
              rows={4}
              placeholder="Collez ici le descriptif du poste pour ancrer l'entretien dans un rôle précis..."
              value={offre}
              onChange={(e) => setOffre(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "10px",
                border: "1px solid var(--line, #cbd5e1)",
                background: "var(--surface, #fff)",
                fontSize: "0.95rem",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="btn-main"
              onClick={() => handleStartSession("chat")}
              disabled={loading}
              style={{
                padding: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "1rem",
              }}
            >
              💬 Démarrer par Écrit (Chat)
            </button>

            <button
              type="button"
              className="btn-main"
              onClick={() => handleStartSession("call")}
              disabled={loading}
              style={{
                padding: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
            >
              📞 Démarrer en Appel (Vocal)
            </button>
          </div>

          {loading && (
            <p style={{ textAlign: "center", color: "var(--primary)", fontWeight: "600", margin: "0.5rem 0 0 0" }}>
              ⏳ {statusText}
            </p>
          )}
        </div>
      </section>
    );
  }

  // --- ACTIVE SESSION SCREEN ---
  return (
    <section className="interview-page" style={{ maxWidth: "1000px", margin: "1rem auto" }}>
      {/* Top Header Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          padding: "0.8rem 1.2rem",
          background: "var(--surface, #fff)",
          borderRadius: "12px",
          border: "1px solid var(--line, #e2e8f0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: "20px",
              background: typeEntretien === "technique" ? "#dbeafe" : "#dcfce7",
              color: typeEntretien === "technique" ? "#1e40af" : "#166534",
              fontWeight: "700",
              fontSize: "0.82rem",
              textTransform: "uppercase",
            }}
          >
            {typeEntretien === "technique" ? "Entretien Technique" : typeEntretien === "direction" ? "Entretien Direction" : "Entretien RH"}
          </span>
          {domaine && (
            <span style={{ fontSize: "0.9rem", color: "var(--text-2, #64748b)", fontWeight: "500" }}>
              • {domaine}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            className="btn-main"
            onClick={handleEndInterview}
            disabled={loading}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              background: "#ea580c",
            }}
          >
            🏁 Terminer & Bilan
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "8px",
              border: "1px solid var(--line, #cbd5e1)",
              background: "transparent",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🔄 Recommencer
          </button>
        </div>
      </div>

      {/* CALL MODE SCREEN */}
      {mode === "call" ? (
        <div
          className="card"
          style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            background: "linear-gradient(180deg, #0f172a, #1e293b)",
            color: "#fff",
            borderRadius: "20px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "800", letterSpacing: "2px", color: "#38bdf8" }}>
            ⏱️ {formatTime(callSeconds)}
          </div>

          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: isRecordingCall ? "#ef4444" : "#3b82f6",
              display: "grid",
              placeItems: "center",
              boxShadow: isRecordingCall ? "0 0 0 15px rgba(239, 68, 68, 0.3)" : "0 0 0 10px rgba(59, 130, 246, 0.2)",
              transition: "all 0.3s ease",
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>{isRecordingCall ? "🎙️" : "👔"}</span>
          </div>

          <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "#e2e8f0", maxWidth: "500px" }}>
            {callStatus}
          </p>

          {/* Last Caption display */}
          {lastCaption.text && (
            <div
              style={{
                maxWidth: "650px",
                width: "100%",
                padding: "1rem 1.2rem",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(6px)",
                textAlign: "left",
                fontSize: "0.95rem",
                lineHeight: "1.5",
                color: "#cbd5e1",
              }}
            >
              <strong style={{ color: "#38bdf8", display: "block", marginBottom: "0.3rem" }}>
                {lastCaption.role === "recruiter" ? "Recruteur RH :" : "Vous :"}
              </strong>
              {lastCaption.text.replace(DISCLAIMER, "").trim()}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={toggleCallRecording}
              disabled={loading}
              style={{
                padding: "0.85rem 1.8rem",
                borderRadius: "30px",
                border: "none",
                background: isRecordingCall ? "#ef4444" : "#2563eb",
                color: "#fff",
                fontWeight: "700",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              }}
            >
              {isRecordingCall ? "⏹️ Stop / Envoyer" : "🎤 Parler au micro"}
            </button>

            <button
              type="button"
              onClick={() => setMode("chat")}
              style={{
                padding: "0.85rem 1.5rem",
                borderRadius: "30px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                fontWeight: "600",
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              💬 Basculer en Chat
            </button>
          </div>
        </div>
      ) : (
        /* CHAT MODE SCREEN */
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "650px",
            borderRadius: "16px",
            padding: "0",
            overflow: "hidden",
          }}
        >
          {/* Chat Messages Stream */}
          <div
            style={{
              flex: "1",
              overflowY: "auto",
              padding: "1.2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              background: "var(--bg-accent, #f8fafc)",
            }}
          >
            {messages.map((msg) => {
              const isRecruiter = msg.role === "recruiter";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isRecruiter ? "flex-start" : "flex-end",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--text-muted, #64748b)",
                      marginBottom: "0.25rem",
                      marginRight: isRecruiter ? "0" : "0.4rem",
                      marginLeft: isRecruiter ? "0.4rem" : "0",
                    }}
                  >
                    {isRecruiter ? "Recruteur IA" : "Vous"}
                  </span>

                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "0.85rem 1.1rem",
                      borderRadius: isRecruiter ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                      background: isRecruiter ? "var(--surface, #ffffff)" : "var(--primary, #2563eb)",
                      color: isRecruiter ? "var(--text, #0f172a)" : "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                      border: isRecruiter ? "1px solid var(--line, #e2e8f0)" : "none",
                      fontSize: "0.95rem",
                    }}
                  >
                    {renderMessageText(msg.text)}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ alignSelf: "flex-start", padding: "0.6rem 1rem", background: "#e2e8f0", borderRadius: "12px" }}>
                <small style={{ color: "#475569", fontWeight: "600" }}>⏳ {statusText || "Réflexion en cours..."}</small>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div
            style={{
              padding: "0.8rem 1rem",
              background: "var(--surface, #fff)",
              borderTop: "1px solid var(--line, #e2e8f0)",
              display: "flex",
              gap: "0.6rem",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={toggleChatRecording}
              disabled={loading}
              title="Enregistrer un message vocal"
              style={{
                padding: "0.7rem",
                borderRadius: "50%",
                border: "none",
                background: isRecordingChat ? "#ef4444" : "#f1f5f9",
                color: isRecordingChat ? "#fff" : "#475569",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                transition: "all 0.2s",
              }}
            >
              🎙️
            </button>

            <textarea
              rows={2}
              placeholder="Saisissez votre réponse au recruteur (Entrée pour envoyer)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              disabled={loading}
              style={{
                flex: "1",
                padding: "0.65rem 0.85rem",
                borderRadius: "10px",
                border: "1px solid var(--line, #cbd5e1)",
                fontSize: "0.95rem",
                resize: "none",
                fontFamily: "inherit",
              }}
            />

            <button
              type="button"
              className="btn-main"
              onClick={handleSendText}
              disabled={loading || !inputText.trim()}
              style={{
                padding: "0.7rem 1.2rem",
                borderRadius: "10px",
                fontSize: "0.95rem",
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default InterviewPage;
