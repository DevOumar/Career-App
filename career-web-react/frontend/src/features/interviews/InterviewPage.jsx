import React from "react";
// Module Entretiens : simulateur d'entretien IA (questions RH/technique/live
// coding par piste, feedback en direct, bilan de fin de session).
//
// Tout ce qui concerne ce module vit dans ce dossier :
//   - InterviewPage.jsx      composant de page + ses illustrations locales
//   - interviewCopy.js       textes FR/EN
//   - interviewScripts.js    questions/réponses modèles par piste
//
// Il est monté depuis App.jsx sous l'onglet "Entretiens" avec les props
// { language, subscription, onGoToTarifs } — le contrat de props n'a pas
// changé lors de cette extraction, seul l'emplacement du code a bougé.
import { useEffect, useState } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";
import { INTERVIEW_SCRIPTS } from "./interviewScripts.js";
import { INTERVIEW_COPY } from "./interviewCopy.js";

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

function InterviewPage({ language, subscription, onGoToTarifs }) {
  const copy = INTERVIEW_COPY[language] || INTERVIEW_COPY.fr;
  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

  const [track, setTrack] = useState("rh");
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [doneTracks, setDoneTracks] = useState({});

  const config = INTERVIEW_SCRIPTS[track];
  const currentQuestion = config.steps[step];
  const progress = Math.round((step / config.steps.length) * 100);

  useEffect(() => {
    resetTrack(track);
  }, [track]);

  function resetTrack(trackKey) {
    const first = INTERVIEW_SCRIPTS[trackKey].steps[0];
    setMessages([{ type: "ai", text: first.question }]);
    setStep(0);
    setInput("");
    setHintOpen(false);
  }

  function submitReply() {
    const text = input.trim();
    if (!text || step >= config.steps.length) return;

    const reply = config.steps[step];
    const nextMessages = [
      ...messages,
      { type: "user", text },
      { type: "feedback", text: `${copy.modelAnswer}: ${reply.model}` }
    ];

    const nextStep = step + 1;
    if (nextStep < config.steps.length) {
      nextMessages.push({ type: "ai", text: config.steps[nextStep].question });
    } else {
      setDoneTracks((prev) => ({ ...prev, [track]: true }));
    }

    setMessages(nextMessages);
    setStep(nextStep);
    setInput("");
    setHintOpen(false);
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

  return (
    <section className="interview-page">
      <div className="tabs">
        {Object.entries(INTERVIEW_SCRIPTS).map(([key, value]) => (
          <button
            key={key}
            className={`tab-btn ${track === key ? "active" : ""} ${doneTracks[key] ? "done" : ""}`}
            onClick={() => setTrack(key)}
          >
            <small>{value.label}</small>
            <strong>{value.meta.name}</strong>
          </button>
        ))}
      </div>

      <div className="chat card">
        <div className="chat-top">
          <div className="avatar">{config.meta.avatar}</div>
          <div>
            <h3>{config.meta.name}</h3>
            <p>{config.meta.subtitle}</p>
          </div>
          <div className="progress">{progress}%</div>
        </div>

        <div className="chat-stream">
          {messages.map((msg, idx) => (
            <div key={`${msg.type}-${idx}`} className={`msg ${msg.type}`}>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>

        {step < config.steps.length ? (
          <>
            <button className="hint" onClick={() => setHintOpen((prev) => !prev)}>
              {copy.hint}
            </button>
            {hintOpen ? <p className="hint-body">{currentQuestion?.hint}</p> : null}

            <div className="chat-input-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={copy.placeholder}
                rows={2}
              />
              <button className="btn-main" onClick={submitReply}>
                {copy.send}
              </button>
            </div>
          </>
        ) : (
          <div className="coaching-bilan">
            <h4>{copy.report}</h4>
            <div className="three-cols">
              <div>
                <h5>{copy.good}</h5>
                <ul>
                  {config.feedback.positive.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>{copy.improve}</h5>
                <ul>
                  {config.feedback.improve.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>{copy.keyAdvice}</h5>
                <p>{config.feedback.key}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


export default InterviewPage;
