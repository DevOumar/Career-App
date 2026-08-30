import React, { useEffect, useState, useRef } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";
import { INTERVIEW_COPY } from "./interviewCopy.js";
import { VoiceInterviewCall } from "./VoiceInterviewCall.jsx";

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
      <rect x="216" y="42" width="84" height="84" rx="18" fill="#f5f3ee" />
      <rect x="240" y="66" width="36" height="30" rx="10" fill="#1a0dab" />
      <circle cx="251" cy="80" r="3" fill="#fff" />
      <circle cx="265" cy="80" r="3" fill="#fff" />
      <rect x="255" y="58" width="6" height="8" rx="3" fill="#1a0dab" />
      <path
        d="M122 70h34a8 8 0 018 8v6a8 8 0 01-8 8h-20l-8 8v-8h-6a8 8 0 01-8-8v-6a8 8 0 018-8z"
        fill="var(--primary)"
        opacity="0.9"
      />
      <path
        d="M186 96h30a7 7 0 017 7v5a7 7 0 01-7 7h-6v7l-9-7h-15a7 7 0 01-7-7v-5a7 7 0 017-7z"
        fill="#1a0dab"
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
  const copy = INTERVIEW_COPY[language] || INTERVIEW_COPY.fr;
  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

  const [mode, setMode] = useState("setup"); // 'setup' | 'chat' | 'voice' | 'bilan'
  const [typeEntretien, setTypeEntretien] = useState("RH");
  const [domaine, setDomaine] = useState("générique");
  const [offre, setOffre] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bilanContent, setBilanContent] = useState("");
  const chatStreamRef = useRef(null);

  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function startSimulation(selectedMode = "chat") {
    setLoading(true);
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_entretien: typeEntretien,
          domaine,
          offre
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([{ role: "assistant", content: data.message }]);
        setMode(selectedMode);
      }
    } catch (err) {
      console.error("Erreur start simulation:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(forceFinish = false) {
    const text = input.trim();
    if (!text && !forceFinish) return;

    const userMessage = { role: "user", content: text || "[Demande de bilan d'entretien]" };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages,
          type_entretien: typeEntretien,
          domaine,
          offre,
          finishSession: forceFinish
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = { role: "assistant", content: data.message };
        setMessages((prev) => [...prev, aiMessage]);

        if (data.isBilan || forceFinish) {
          setBilanContent(data.message);
          setMode("bilan");
        }
      }
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEndVoiceCall() {
    setLoading(true);
    try {
      const response = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Clore l'entretien et fournir le bilan final",
          history: messages,
          type_entretien: typeEntretien,
          domaine,
          offre,
          finishSession: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBilanContent(data.message);
        setMode("bilan");
      }
    } catch (err) {
      console.error("Erreur fin d'appel:", err);
    } finally {
      setLoading(false);
    }
  }

  if (isFreePlan) {
    return (
      <section className="interview-locked">
        <div className="interview-locked-copy">
          <span className="interview-locked-badge">
            <UiIcon name="chart" /> Trajectoire Pro
          </span>
          <h2>{copy.lockedTitle}</h2>
          <p>{copy.lockedText}</p>
          <ul className="interview-locked-features">
            {copy.lockedFeatures.map((feature, index) => (
              <li key={feature}>
                <span className={`interview-locked-feature-icon icon-${index}`}>
                  <UiIcon name={["chat", "shield", "network"][index] || "shield"} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <button type="button" className="btn-main ready" onClick={onGoToTarifs}>
            {copy.lockedCta} <UiIcon name="chevron" className="btn-chevron" />
          </button>
        </div>
        <div className="interview-locked-art">
          <InterviewAssistantIllustration />
        </div>
      </section>
    );
  }

  if (mode === "setup") {
    return (
      <section className="interview-page">
        <div className="card setup-card">
          <div className="setup-header">
            <div className="setup-header-icon">
              <UiIcon name="matchmark" />
            </div>
            <div>
              <h3>Assistant RAG &amp; Simulateur d'Entretien IA</h3>
              <p>
                Entraînez-vous face à un recruteur senior IA alimenté par notre base de connaissances RAG (méthode STAR, conseils RH, questions techniques).
              </p>
            </div>
          </div>

          <div className="setup-form">
            <div className="form-group">
              <label>Type d'entretien</label>
              <div className="interview-type-group">
                {[
                  { id: "RH", icon: "profile", label: "RH / Soft Skills" },
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
              <label htmlFor="interview-domaine">Domaine professionnel</label>
              <select
                id="interview-domaine"
                value={domaine}
                onChange={(e) => setDomaine(e.target.value)}
              >
                <option value="générique">Générique / Tous secteurs</option>
                <option value="tech">Tech / IT / Data / Software</option>
                <option value="commerce">Commerce / Vente / Business Development</option>
                <option value="finance">Finance / Gestion / Comptabilité</option>
                <option value="industrie">Industrie / Ingénierie / Logistique</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="interview-offre">Offre d'emploi visée <span className="muted">(optionnel)</span></label>
              <textarea
                id="interview-offre"
                value={offre}
                onChange={(e) => setOffre(e.target.value)}
                placeholder="Collez ici l'intitulé ou la description de l'offre pour que le recruteur ancre ses questions dans ce poste réel…"
                rows={4}
              />
            </div>

            <div className="setup-actions">
              <button
                type="button"
                className="btn-main"
                onClick={() => startSimulation("chat")}
                disabled={loading}
              >
                <UiIcon name="chat" />
                Démarrer l'entretien écrit
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => startSimulation("voice")}
                disabled={loading}
              >
                <UiIcon name="phone" />
                Démarrer l'appel vocal
                <span className="setup-actions-hint">Whisper + Voice</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "voice") {
    return (
      <section className="interview-page">
        <VoiceInterviewCall
          typeEntretien={typeEntretien}
          domaine={domaine}
          onEndCall={handleEndVoiceCall}
        />
      </section>
    );
  }

  if (mode === "bilan") {
    return (
      <section className="interview-page">
        <div className="card bilan-card">
          <div className="bilan-header">
            <h3>📊 Bilan Global & Evaluation d'Entretien</h3>
            <p>Voici l'analyse détaillée générée par le Recruteur IA et le moteur RAG.</p>
          </div>

          <div className="bilan-body">
            <div className="markdown-content">
              {bilanContent.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="bilan-actions">
            <button type="button" className="btn-main" onClick={() => setMode("setup")}>
              🔄 Relancer un nouvel entretien
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="interview-page">
      <div className="chat card">
        <div className="chat-top">
          <div className="avatar">👔</div>
          <div>
            <h3>Recruteur Senior IA</h3>
            <p>Entretien {typeEntretien} — Domaine {domaine}</p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => sendMessage(true)}>
            🏁 Clore & Obtenir Bilan
          </button>
        </div>

        <div className="chat-stream" ref={chatStreamRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`msg ${msg.role === "user" ? "user" : "ai"}`}>
              <p>{msg.content}</p>
            </div>
          ))}
          {loading ? (
            <div className="msg ai loading">
              <p>Le recruteur prépare sa réponse...</p>
            </div>
          ) : null}
        </div>

        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(false);
              }
            }}
            placeholder="Répondez à la question du recruteur..."
            rows={2}
          />
          <button type="button" className="btn-main" onClick={() => sendMessage(false)} disabled={loading}>
            Envoyer
          </button>
        </div>
      </div>
    </section>
  );
}

export default InterviewPage;
