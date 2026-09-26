import React from "react";
import Swal from "sweetalert2";
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
import { ModuleHero, ModuleHistorySidebar, ModuleTargetCard, ModuleTipsCard, NegotiationHeroArt } from "../../components/ModuleWorkspace.jsx";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";

function SalaryNegotiationPage({ language, currency = "EUR", userId, candidate, offer: latestOffer, tokensBalance, onGoToTarifs, onGoToImport, onConsumeToken }) {
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
  // Offre active : celle de la conversation reprise (enregistrée avec
  // elle), sinon la dernière offre analysée dans « Importer CV ». Tout le
  // module s'y réfère : affichage, appels à l'IA et sauvegarde.
  const [resumedOffer, setResumedOffer] = useState(null);
  const offer = resumedOffer || latestOffer;

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
    const hasLocation = offer?.location && offer.location !== "Non précisé";
    return offer?.title ? `${offer.title}${hasLocation ? ` · ${offer.location}` : ""}` : copy.untitled;
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
    setResumedOffer(null);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setResumedOffer(conv.offer && (conv.offer.title || conv.offer.skills?.length) ? conv.offer : null);
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
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirm,
      text: conv.title || copy.untitled,
      showCancelButton: true,
      confirmButtonText: copy.deleteConversation,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    try {
      await deleteNegotiationConversation({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  // 999 = solde "infini" (compte associé à un cabinet/école) : dans ce cas
  // afficher "(1 jeton)" sur le bouton n'a pas de sens.
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;

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
      <section className="mw-locked">
        <div className="mw-locked-art">
          <NegotiationHeroArt />
        </div>
        <span className="mw-eyebrow">{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.empty}</p>
        {onGoToImport ? (
          <button type="button" className="btn-main ready" onClick={onGoToImport}>
            <UiIcon name="upload" /> {copy.unlockCta}
          </button>
        ) : null}
      </section>
    );
  }

  const location = offer?.location && offer.location !== "Non précisé" ? offer.location : "";

  const historySidebar = (
    <ModuleHistorySidebar
      language={language}
      newLabel={copy.newConversation}
      historyLabel={copy.history}
      emptyLabel={copy.noHistory}
      deleteLabel={copy.deleteConversation}
      items={conversations.map((conv) => ({ ...conv, title: conv.title || copy.untitled }))}
      activeId={conversationId}
      icon="scale"
      onNew={handleNewConversation}
      onSelect={handleResumeConversation}
      onDelete={handleDeleteConversation}
      renderMeta={(conv) =>
        conv.summary ? (
          <span className="mw-meta-badge">{copy.reportReady}</span>
        ) : Array.isArray(conv.messages) ? (
          (() => {
            const answers = conv.messages.filter((msg) => msg.type === "user").length;
            return <span>{answers ? copy.exchanges.replace("{count}", answers) : copy.notStarted}</span>;
          })()
        ) : null
      }
    >
      <ModuleTargetCard
        language={language}
        offer={offer}
        candidate={candidate}
        title={resumedOffer ? copy.targetResumedTitle : undefined}
        note={resumedOffer ? copy.targetResumedNote : ""}
      />
      <ModuleTipsCard title={copy.tipsTitle} tips={copy.tips} />
    </ModuleHistorySidebar>
  );

  if (!started) {
    return (
      <div className="mw-layout">
        {historySidebar}
        <section className="mw-main">
          <ModuleHero
            eyebrow={copy.eyebrow}
            title={copy.title}
            subtitle={copy.subtitle}
            art={<NegotiationHeroArt />}
            chips={[
              offer?.title ? { icon: "briefcase", label: offer.title } : null,
              offer?.company || location ? { icon: "pin", label: [offer?.company, location].filter(Boolean).join(" · ") } : null,
              { icon: "pricetag", label: hasUnlimitedTokens ? copy.unlimitedChip : copy.tokenChip.replace("{count}", Math.max(0, tokensBalance)) }
            ]}
          />

          <div className="mw-split">
            <div className="mw-card mw-start">
              <div className="mw-step-head">
                <span className="mw-step-num">
                  <UiIcon name="scale" />
                </span>
                <div>
                  <h3>{copy.prepareTitle}</h3>
                  <p>{copy.prepareText}</p>
                </div>
              </div>
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
                <small className="mw-field-hint">{copy.targetHint}</small>
              </label>
              {error ? <p className="field-error">{error}</p> : null}
              {outOfTokens ? (
                <p className="field-hint">
                  {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
                </p>
              ) : null}
              <button type="button" className="btn-main ready mw-cta" onClick={handleStart} disabled={isStarting}>
                {isStarting ? (
                  <>
                    <span className="btn-spinner" /> {copy.starting}
                  </>
                ) : (
                  <>
                    <UiIcon name="chat" /> {hasUnlimitedTokens ? copy.startUnlimited : copy.start}
                  </>
                )}
              </button>
            </div>

            <div className="mw-card mw-steps">
              <h3>{copy.howTitle}</h3>
              <ol>
                {copy.howSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="mw-step-num">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mw-layout">
        {historySidebar}
        <section className="mw-main negotiation-summary">
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
          <AiDisclaimer language={language} />
          <button type="button" className="btn-main ready mw-cta" onClick={handleNewConversation}>
            <UiIcon name="plus" /> {copy.newConversation}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mw-layout">
      {historySidebar}
      <section className="mw-main negotiation-page">
        <div className="mw-chat-head">
          <span className="mw-chat-avatar">
            <UiIcon name="briefcase" />
            <i aria-hidden="true" />
          </span>
          <div>
            <strong>{copy.recruiterName}</strong>
            <small>{[offer?.title, offer?.company].filter(Boolean).join(" · ")}</small>
          </div>
          {targetSalaryLabel ? (
            <span className="mw-chat-target">
              {copy.targetShort} <strong>{targetSalaryLabel}</strong>
            </span>
          ) : null}
        </div>

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
                ? "No real market data found for this role, figures below are AI estimates only."
                : "Aucune donnée de marché réelle trouvée pour ce poste, les montants ci-dessous sont des estimations IA uniquement."}
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
          <AiDisclaimer
            language={language}
            text={
              language === "en"
                ? "AI-simulated recruiter: amounts and advice are indicative. Check them against real market data."
                : "Recruteur simulé par l'IA : montants et conseils sont indicatifs. Confrontez-les aux données réelles du marché."
            }
          />
          {error ? <p className="field-error">{error}</p> : null}
          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder={copy.placeholder}
              rows={2}
            />
            <button className="btn-main" onClick={handleSend} disabled={isSending || !input.trim()}>
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
