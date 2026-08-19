import React from "react";
// Module Sondage de satisfaction (CSAT 1-10, périodique).
import { useState } from "react";
import Swal from "sweetalert2";
import { dismissSatisfactionSurvey, submitSatisfactionSurvey } from "../../lib/inMemoryDb.js";
import { SATISFACTION_COPY } from "./satisfactionCopy.js";

const SATISFACTION_TIERS = [
  { max: 2, emoji: "😡", tone: "tier-1" },
  { max: 4, emoji: "🙁", tone: "tier-2" },
  { max: 6, emoji: "😐", tone: "tier-3" },
  { max: 8, emoji: "🙂", tone: "tier-4" },
  { max: 10, emoji: "😍", tone: "tier-5" }
];

function satisfactionTierFor(score) {
  return SATISFACTION_TIERS.find((tier) => score <= tier.max) || SATISFACTION_TIERS[SATISFACTION_TIERS.length - 1];
}

function SatisfactionSurveyModal({ userId, language, onClose }) {
  const copy = SATISFACTION_COPY[language] || SATISFACTION_COPY.fr;
  const [score, setScore] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const displayScore = hovered ?? score;
  const tier = displayScore ? satisfactionTierFor(displayScore) : null;
  const tierLabel = displayScore ? copy.tierLabels[SATISFACTION_TIERS.findIndex((t) => t.max >= displayScore)] : "";

  async function handleDismiss() {
    onClose();
    try {
      await dismissSatisfactionSurvey(userId);
    } catch (_error) {
      // Non bloquant : au pire, l'utilisateur sera resollicité un peu plus tôt.
    }
  }

  async function handleSubmit() {
    if (!score || status === "saving") return;
    setStatus("saving");
    setError("");
    try {
      await submitSatisfactionSurvey({ userId, score, comment: comment.trim() });
      setStatus("done");
      setTimeout(onClose, 2200);
    } catch (err) {
      setStatus("idle");
      setError(copy.error);
    }
  }

  return (
    <div className="satisfaction-overlay">
      <div className={`satisfaction-card ${tier ? tier.tone : ""}`}>
        <button type="button" className="satisfaction-close" onClick={handleDismiss} aria-label={copy.later}>
          ×
        </button>

        {status === "done" ? (
          <div className="satisfaction-thanks">
            <span className="satisfaction-thanks-emoji">🎉</span>
            <h3>{copy.thanksTitle}</h3>
            <p>{copy.thanksText}</p>
          </div>
        ) : (
          <>
            <span className="satisfaction-eyebrow">{copy.eyebrow}</span>
            <h3>{copy.title}</h3>
            <p className="satisfaction-text">{copy.question}</p>

            <div className="satisfaction-emoji-stage">
              <span className="satisfaction-big-emoji">{tier ? tier.emoji : "🤔"}</span>
              <span className="satisfaction-tier-label">{tierLabel || " "}</span>
            </div>

            <div className="satisfaction-scale">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`satisfaction-score-btn ${satisfactionTierFor(value).tone} ${score === value ? "selected" : ""}`}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setScore(value)}
                >
                  {value}
                </button>
              ))}
            </div>

            {score ? (
              <div className="satisfaction-comment">
                <label>{copy.commentLabel}</label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={copy.commentPlaceholder}
                />
              </div>
            ) : null}

            {error ? <p className="field-error">{error}</p> : null}

            <div className="satisfaction-actions">
              <button type="button" className="satisfaction-later-btn" onClick={handleDismiss}>
                {copy.later}
              </button>
              <button type="button" className="btn-main ready" disabled={!score || status === "saving"} onClick={handleSubmit}>
                {status === "saving" ? copy.submitting : copy.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { SatisfactionSurveyModal, satisfactionTierFor };
