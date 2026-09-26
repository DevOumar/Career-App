import React from "react";
import Swal from "sweetalert2";
// Module Lettre de motivation IA : génération multi-ton/multi-modèle,
// édition avant export, historique des lettres.
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { generateCoverLetter, listCoverLetters, saveCoverLetter, updateCoverLetter, deleteCoverLetter } from "../../lib/inMemoryDb.js";
import { COVER_LETTER_COPY } from "./coverLetterCopy.js";
import { ModuleHero, ModuleHistorySidebar, ModuleTargetCard, ModuleTipsCard, LetterHeroArt, LetterTemplateThumb } from "../../components/ModuleWorkspace.jsx";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";

const LETTER_TEMPLATES = [
  { id: "classic", label: { fr: "Classique", en: "Classic" }, icon: "docClassic" },
  { id: "modern", label: { fr: "Moderne", en: "Modern" }, icon: "docModern" },
  { id: "minimal", label: { fr: "Minimaliste", en: "Minimal" }, icon: "docMinimal" }
];

const LETTER_TONE_ICONS = { formal: "shield", enthusiastic: "matchmark", direct: "share" };

function CoverLetterPage({ language, userId, candidate, offer: latestOffer, tokensBalance, onGoToTarifs, onGoToImport, onConsumeToken }) {
  const copy = COVER_LETTER_COPY[language] || COVER_LETTER_COPY.fr;
  const [tone, setTone] = useState("formal");
  const [template, setTemplate] = useState("classic");
  const [letter, setLetter] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLetter, setDraftLetter] = useState("");
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  // Offre active : celle de la conversation reprise (enregistrée avec
  // elle), sinon la dernière offre analysée dans « Importer CV ». Tout le
  // module s'y réfère : affichage, appels à l'IA et sauvegarde.
  const [resumedOffer, setResumedOffer] = useState(null);
  const offer = resumedOffer || latestOffer;

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  // 999 = solde "infini" (compte associé à un cabinet/école) : dans ce cas
  // afficher "(1 jeton)" sur le bouton n'a pas de sens, rien n'est décompté
  // d'un pool personnel limité.
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listCoverLetters(userId)
      .then((items) => {
        if (!cancelled) setConversations(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const tones = [
    { id: "formal", label: copy.toneFormal },
    { id: "enthusiastic", label: copy.toneEnthusiastic },
    { id: "direct", label: copy.toneDirect }
  ];

  function conversationTitle() {
    return offer?.title ? `${offer.title}${offer.company ? ` · ${offer.company}` : ""}` : copy.untitled;
  }

  async function persistConversation(nextLetter, nextSubject) {
    if (!userId) return;
    const payload = { letter: nextLetter, subject: nextSubject, tone, template, offer };
    try {
      if (conversationId) {
        await updateCoverLetter({ userId, conversationId, payload });
        setConversations((prev) =>
          prev.map((item) => (item.id === conversationId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item))
        );
      } else {
        const created = await saveCoverLetter({ userId, title: conversationTitle(), payload });
        setConversationId(created.id);
        setConversations((prev) => [{ ...created }, ...prev]);
      }
    } catch (_err) {
      // La sauvegarde de l'historique est secondaire : la lettre reste utilisable même si elle échoue.
    }
  }

  function handleNewConversation() {
    setLetter("");
    setSubject("");
    setConversationId(null);
    setResumedOffer(null);
    setIsEditing(false);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setResumedOffer(conv.offer && (conv.offer.title || conv.offer.skills?.length) ? conv.offer : null);
    setLetter(conv.letter || "");
    setSubject(conv.subject || "");
    if (conv.tone) setTone(conv.tone);
    if (conv.template) setTemplate(conv.template);
    setIsEditing(false);
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
      await deleteCoverLetter({ userId, conversationId: conv.id });
      setConversations((prev) => prev.filter((item) => item.id !== conv.id));
      if (conversationId === conv.id) handleNewConversation();
    } catch (_err) {
      // Non bloquant.
    }
  }

  async function handleGenerate() {
    if (!hasContext || isGenerating) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsGenerating(true);
    setIsEditing(false);
    try {
      const result = await generateCoverLetter({ candidate, offer, tone, language });
      setLetter(result.letter);
      setSubject(result.subject || "");
      await onConsumeToken();
      await persistConversation(result.letter, result.subject || "");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownload() {
    window.print();
  }

  function startEditing() {
    setDraftLetter(letter);
    setIsEditing(true);
  }

  async function saveEditing() {
    setLetter(draftLetter);
    setIsEditing(false);
    await persistConversation(draftLetter, subject);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  const toneLabels = { formal: copy.toneFormal, enthusiastic: copy.toneEnthusiastic, direct: copy.toneDirect };
  const toneDescriptions = { formal: copy.toneFormalDesc, enthusiastic: copy.toneEnthusiasticDesc, direct: copy.toneDirectDesc };

  if (!hasContext) {
    return (
      <section className="mw-locked">
        <div className="mw-locked-art">
          <LetterHeroArt />
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

  return (
    <div className="mw-layout">
      <ModuleHistorySidebar
        language={language}
        newLabel={copy.newConversation}
        historyLabel={copy.history}
        emptyLabel={copy.noHistory}
        deleteLabel={copy.deleteConversation}
        items={conversations.map((conv) => ({ ...conv, title: conv.title || copy.untitled }))}
        activeId={conversationId}
        icon="mail"
        onNew={handleNewConversation}
        onSelect={handleResumeConversation}
        onDelete={handleDeleteConversation}
        renderMeta={(conv) => (conv.tone && toneLabels[conv.tone] ? <span>{toneLabels[conv.tone]}</span> : null)}
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

      <section className="mw-main">
        <ModuleHero
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
          art={<LetterHeroArt />}
          chips={[
            offer?.title ? { icon: "briefcase", label: offer.title } : null,
            offer?.company || location ? { icon: "pin", label: [offer?.company, location].filter(Boolean).join(" · ") } : null,
            { icon: "pricetag", label: hasUnlimitedTokens ? copy.unlimitedChip : copy.tokenChip.replace("{count}", Math.max(0, tokensBalance)) }
          ]}
        />

        <div className="mw-card">
          <div className="mw-step-head">
            <span className="mw-step-num">1</span>
            <div>
              <h3>{copy.toneLabel}</h3>
              <p>{copy.toneHint}</p>
            </div>
          </div>
          <div className="mw-options">
            {tones.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mw-option ${tone === item.id ? "is-active" : ""}`}
                onClick={() => setTone(item.id)}
                aria-pressed={tone === item.id}
              >
                <span className="mw-option-icon">
                  <UiIcon name={LETTER_TONE_ICONS[item.id]} />
                </span>
                <strong>{item.label}</strong>
                <small>{toneDescriptions[item.id]}</small>
              </button>
            ))}
          </div>

          <div className="mw-step-head">
            <span className="mw-step-num">2</span>
            <div>
              <h3>{copy.templateLabel}</h3>
              <p>{copy.templateHint}</p>
            </div>
          </div>
          <div className="mw-options mw-templates">
            {LETTER_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mw-template ${template === item.id ? "is-active" : ""}`}
                onClick={() => setTemplate(item.id)}
                aria-pressed={template === item.id}
              >
                <LetterTemplateThumb variant={item.id} />
                <span>
                  <UiIcon name={item.icon} />
                  {item.label[language] || item.label.fr}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="field-error">{error}</p> : null}

        {!letter ? (
          <div className="mw-card mw-generate">
            <div className={`mw-paper template-${template}`} aria-hidden="true">
              <span className="mw-paper-line is-title" />
              <span className="mw-paper-line" />
              <span className="mw-paper-line is-short" />
              <span className="mw-paper-line" />
              <span className="mw-paper-line is-mid" />
              <span className="mw-paper-line" />
              <span className="mw-paper-line is-short" />
            </div>
            <div className="mw-generate-copy">
              <span className="mw-step-num">3</span>
              <h3>{copy.generateTitle}</h3>
              <p>{copy.generateText}</p>
              {outOfTokens ? (
                <p className="field-hint">
                  {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
                </p>
              ) : null}
              <button type="button" className="btn-main ready mw-cta" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <span className="btn-spinner" /> {copy.generating}
                  </>
                ) : (
                  <>
                    <UiIcon name="edit" /> {hasUnlimitedTokens ? copy.generateUnlimited : copy.generate}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="letter-document-card">
            <div className="letter-toolbar no-print">
              {isEditing ? (
                <>
                  <button type="button" className="btn-ghost" onClick={cancelEditing}>
                    {copy.cancelEdit}
                  </button>
                  <button type="button" className="btn-main" onClick={saveEditing}>
                    {copy.saveEdit}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-ghost" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? <span className="btn-spinner" /> : null}{" "}
                    {hasUnlimitedTokens ? copy.regenerateUnlimited : copy.regenerate}
                  </button>
                  <button type="button" className="btn-ghost" onClick={startEditing}>
                    <UiIcon name="edit" /> {copy.edit}
                  </button>
                  <button type="button" className="btn-ghost" onClick={handleCopy}>
                    {copied ? copy.copied : copy.copy}
                  </button>
                  <button type="button" className="btn-main" onClick={handleDownload}>
                    <UiIcon name="download" /> {copy.download}
                  </button>
                </>
              )}
            </div>
            {isEditing ? (
              <textarea
                className={`letter-document letter-document-edit template-${template}`}
                value={draftLetter}
                onChange={(event) => setDraftLetter(event.target.value)}
              />
            ) : (
              <div className={`letter-document template-${template}`} id="cover-letter-document">
                {subject ? <p className="letter-subject">{subject}</p> : null}
                {letter.split("\n\n").map((paragraph, index) => (
                  <p key={`para-${index}`}>{paragraph}</p>
                ))}
              </div>
            )}
            <AiDisclaimer
              language={language}
              text={
                language === "en"
                  ? "AI-generated letter: check facts, dates and names, and personalise it before sending."
                  : "Lettre générée par l'IA : vérifiez les faits, les dates et les noms, et personnalisez-la avant l'envoi."
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default CoverLetterPage;
