import React from "react";
// Module Négociation salariale : chat avec un recruteur IA, référence de
// marché réelle quand disponible, bilan de fin de session, historique des
// conversations sauvegardées.
import { useEffect, useState } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { formatAmountInCurrency, getCurrencyOption } from "../../lib/format.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import {
  negotiationReply,
  listNegotiationConversations,
  saveNegotiationConversation,
  updateNegotiationConversation,
  deleteNegotiationConversation
} from "../../lib/inMemoryDb.js";
import { NEGOTIATION_COPY } from "./negotiationCopy.js";

function NegotiationIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="module-illustration" aria-hidden="true">
      <rect x="20" y="150" width="90" height="12" rx="6" fill="var(--line)" />
      <rect x="60" y="30" width="10" height="130" rx="5" fill="var(--line)" />
      <rect x="45" y="70" width="40" height="60" rx="8" fill="var(--primary)" opacity="0.85" />
      <circle cx="65" cy="52" r="16" fill="#f5f3ee" stroke="var(--primary)" strokeWidth="2" />
      <rect x="210" y="150" width="90" height="12" rx="6" fill="var(--line)" />
      <rect x="248" y="30" width="10" height="130" rx="5" fill="var(--line)" />
      <rect x="233" y="70" width="40" height="60" rx="8" fill="#1a0dab" opacity="0.85" />
      <circle cx="253" cy="52" r="16" fill="#f5f3ee" stroke="#1a0dab" strokeWidth="2" />
      <path
        d="M105 100h40a10 10 0 0110 10v4a10 10 0 01-10 10h-24l-10 10v-10h-6a10 10 0 01-10-10v-4a10 10 0 0110-10z"
        fill="var(--surface-2)"
        stroke="var(--line)"
      />
      <text x="150" y="122" fontSize="16" fontWeight="700" fill="var(--primary)">%</text>
      <path
        d="M175 60h40a9 9 0 019 9v4a9 9 0 01-9 9h-8v9l-11-9h-21a9 9 0 01-9-9v-4a9 9 0 019-9z"
        fill="var(--surface-2)"
        stroke="var(--line)"
      />
    </svg>
  );
}

function SalaryNegotiationPage({ language, currency = "EUR", userId, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy = NEGOTIATION_COPY[language] || NEGOTIATION_COPY.fr;
  const currencyOption = getCurrencyOption(currency);
  const [targetSalary, setTargetSalary] = useState("");
  const [started, setStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [salaryReference, setSalaryReference] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listNegotiationConversations(userId)
      .then((items) => {
        if (!cancelled) setConversations(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function conversationTitle() {
    return offer?.title ? `${offer.title}${offer.location ? ` · ${offer.location}` : ""}` : copy.untitled;
  }

  function buildPayload(nextMessages, nextSalaryReference, nextSummary) {
    return {
      messages: nextMessages,
      salaryReference: nextSalaryReference,
      targetSalary,
      offer,
      summary: nextSummary || null
    };
  }

  async function persistConversation(nextMessages, nextSalaryReference, nextSummary) {
    if (!userId) return;
    const payload = buildPayload(nextMessages, nextSalaryReference, nextSummary);
    try {
      if (conversationId) {
        await updateNegotiationConversation({ userId, conversationId, payload });
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, ...payload, updatedAt: nowIsoClient() } : item))
        );
      } else {
        const created = await saveNegotiationConversation({ userId, title: conversationTitle(), payload });
        setConversationId(created.id);
        setConversations((prev) => [{ ...created }, ...prev]);
      }
    } catch (_err) {
      // La sauvegarde de l'historique est secondaire : la négociation en cours reste utilisable même si elle échoue.
    }
  }

  function nowIsoClient() {
    return new Date().toISOString();
  }

  function handleNewConversation() {
    setStarted(false);
    setMessages([]);
    setSalaryReference(null);
    setSummary(null);
    setTargetSalary("");
    setConversationId(null);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setMessages(conv.messages || []);
    setSalaryReference(conv.salaryReference || null);
    setSummary(conv.summary || null);
    setTargetSalary(conv.targetSalary || "");
    setStarted(true);
    setError("");
  }

  async function handleDeleteConversation(event, conv) {
    event.stopPropagation();
    if (!userId) return;
    if (typeof window !== "undefined" && !window.confirm(copy.deleteConfirm)) return;
    try {
      await deleteNegotiationConversation({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  const targetSalaryDisplay = targetSalary ? Number(targetSalary).toLocaleString(language === "en" ? "en-US" : "fr-FR") : "";
  const targetSalaryFormatted = targetSalary
    ? currencyOption.position === "before"
      ? `${currencyOption.symbol}${targetSalaryDisplay}`
      : `${targetSalaryDisplay} ${currencyOption.symbol}`
    : "";
  const targetSalaryLabel = targetSalary
    ? language === "en"
      ? `${targetSalaryFormatted} / year`
      : `${targetSalaryFormatted} brut annuel`
    : "";

  function handleTargetSalaryChange(event) {
    setTargetSalary(event.target.value.replace(/\D/g, "").slice(0, 7));
  }

  function historyPayload(nextMessages) {
    return nextMessages.map((msg) => ({
      role: msg.type === "user" ? "user" : "recruiter",
      text: msg.text
    }));
  }

  async function handleStart() {
    if (!hasContext || isStarting) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsStarting(true);
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: [],
        targetSalary: targetSalaryLabel,
        finish: false,
        currencyLabel: currencyOption.label
      });
      const nextMessages = [{ type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }];
      setMessages(nextMessages);
      setSalaryReference(result.salaryReference || null);
      await onConsumeToken();
      setStarted(true);
      await persistConversation(nextMessages, result.salaryReference || null, null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    const withUser = [...messages, { type: "user", text }];
    setMessages(withUser);
    setInput("");
    setIsSending(true);
    setError("");
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: historyPayload(withUser),
        targetSalary: targetSalaryLabel,
        finish: false,
        currencyLabel: currencyOption.label,
        salaryReference
      });
      const nextMessages = [...withUser, { type: "ai", text: result.reply }, { type: "feedback", text: `${copy.tip}: ${result.tip}` }];
      setMessages(nextMessages);
      await persistConversation(nextMessages, salaryReference, null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsSending(false);
    }
  }

  async function handleFinish() {
    if (isFinishing || !messages.length) return;
    setIsFinishing(true);
    setError("");
    try {
      const result = await negotiationReply({
        candidate,
        offer,
        history: historyPayload(messages),
        targetSalary: targetSalaryLabel,
        finish: true,
        currencyLabel: currencyOption.label
      });
      setSummary(result);
      await persistConversation(messages, salaryReference, result);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsFinishing(false);
    }
  }

  if (!hasContext) {
    return (
      <section className="module-locked">
        <div className="module-locked-copy">
          <h2>{copy.title}</h2>
          <p>{copy.empty}</p>
        </div>
        <div className="module-locked-art">
          <NegotiationIllustration />
        </div>
      </section>
    );
  }

  const historySidebar = (
    <aside className="negotiation-history">
      <button type="button" className="negotiation-new-btn" onClick={handleNewConversation}>
        <UiIcon name="plus" /> {copy.newConversation}
      </button>
      <span className="negotiation-history-label">{copy.history}</span>
      {conversations.length ? (
        <ul className="negotiation-history-list">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`negotiation-history-item${conv.id === conversationId ? " active" : ""}`}
              onClick={() => handleResumeConversation(conv)}
            >
              <span className="negotiation-history-title">{conv.title || copy.untitled}</span>
              <button
                type="button"
                className="negotiation-history-delete"
                onClick={(event) => handleDeleteConversation(event, conv)}
                aria-label={copy.deleteConversation}
              >
                <UiIcon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="negotiation-history-empty">{copy.noHistory}</p>
      )}
    </aside>
  );

  if (!started) {
    return (
      <div className="negotiation-layout">
        {historySidebar}
        <section className="negotiation-start">
          <NegotiationIllustration />
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
          <label className="negotiation-target">
            <span>{copy.targetLabel}</span>
            <div className="negotiation-target-input">
              <input
                type="text"
                inputMode="numeric"
                value={targetSalaryDisplay}
                onChange={handleTargetSalaryChange}
                placeholder={copy.targetPlaceholder}
              />
              <span className="negotiation-target-suffix">
                {currencyOption.symbol} {language === "en" ? "/ yr" : "/ an"}
              </span>
            </div>
          </label>
          {error ? <p className="field-error">{error}</p> : null}
          <button type="button" className="btn-main ready" onClick={handleStart} disabled={isStarting}>
            {isStarting ? (
              <>
                <span className="btn-spinner" /> {copy.starting}
              </>
            ) : (
              copy.start
            )}
          </button>
        </section>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="negotiation-layout">
        {historySidebar}
        <section className="negotiation-summary">
          <div className="negotiation-summary-header">
            <div className="negotiation-summary-icon">
              <UiIcon name="matchmark" />
            </div>
            <div>
              <h3>{copy.summary}</h3>
              <p>{summary.summary}</p>
            </div>
          </div>

          <div className="negotiation-summary-cols">
            <div className="negotiation-summary-block strengths">
              <h5>
                <UiIcon name="thumbUp" />
                {copy.strengths}
              </h5>
              <ul>
                {(summary.strengths || []).map((point, idx) => (
                  <li key={`s-${idx}`}>
                    <UiIcon name="check" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="negotiation-summary-block improvements">
              <h5>
                <UiIcon name="chart" />
                {copy.improvements}
              </h5>
              <ul>
                {(summary.improvements || []).map((point, idx) => (
                  <li key={`i-${idx}`}>
                    <UiIcon name="chevron" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="negotiation-layout">
      {historySidebar}
      <section className="negotiation-page">
      {salaryReference ? (
        <div className="salary-reference-banner">
          <UiIcon name="chart" />
          <span>
            {language === "en" ? "Real market range: " : "Fourchette réelle de marché : "}
            <strong>
              {formatAmountInCurrency(salaryReference.min, currency)} – {formatAmountInCurrency(salaryReference.max, currency)}
            </strong>{" "}
            {language === "en" ? "based on" : "basée sur"}{" "}
            {salaryReference.sources.map((source) => source.name).join(" + ")}
            {language === "en" ? " listings." : "."}
          </span>
        </div>
      ) : (
        <div className="salary-reference-banner muted">
          <UiIcon name="alert" />
          <span>
            {language === "en"
              ? "No real market data found for this role — figures below are AI estimates only."
              : "Aucune donnée de marché réelle trouvée pour ce poste — les montants ci-dessous sont des estimations IA uniquement."}
          </span>
        </div>
      )}

      <div className="chat card">
        <div className="chat-stream negotiation-stream">
          {messages.map((msg, idx) => {
            if (msg.type === "feedback") {
              return (
                <div key={`${msg.type}-${idx}`} className={`msg ${msg.type}`}>
                  <p>{msg.text}</p>
                </div>
              );
            }
            return (
              <div key={`${msg.type}-${idx}`} className={`msg-row msg-row-${msg.type}`}>
                {msg.type === "ai" ? (
                  <span className="msg-avatar msg-avatar-ai">
                    <UiIcon name="briefcase" />
                  </span>
                ) : null}
                <div className={`msg ${msg.type}`}>
                  <p>{msg.text}</p>
                </div>
                {msg.type === "user" ? (
                  <span className="msg-avatar msg-avatar-user">
                    <UiIcon name="profile" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={copy.placeholder}
            rows={2}
          />
          <button className="btn-main" onClick={handleSend} disabled={isSending}>
            {isSending ? <span className="btn-spinner" /> : copy.send}
          </button>
        </div>
        <button type="button" className="btn-ghost negotiation-finish" onClick={handleFinish} disabled={isFinishing}>
          {isFinishing ? (
            <>
              <span className="btn-spinner" /> {copy.finishing}
            </>
          ) : (
            copy.finish
          )}
        </button>
      </div>
      </section>
    </div>
  );
}

export default SalaryNegotiationPage;
