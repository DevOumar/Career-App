import React from "react";
import Swal from "sweetalert2";
// Module Lettre de motivation IA : génération multi-ton/multi-modèle,
// édition avant export, historique des lettres.
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { generateCoverLetter, listCoverLetters, saveCoverLetter, updateCoverLetter, deleteCoverLetter } from "../../lib/inMemoryDb.js";
import { loadPdfFitter, slugifyForFilename, downloadBlob } from "../../lib/pdfDownload.js";
import { themeColorsFromPresetId } from "../../lib/themeColors.js";
import { THEME_PRESETS } from "../../App.jsx";
import { COVER_LETTER_COPY } from "./coverLetterCopy.js";

function CoverLetterIllustration() {
  return (
    <svg viewBox="0 0 320 240" className="module-illustration" aria-hidden="true">
      <rect x="20" y="20" width="200" height="200" rx="18" fill="var(--surface-2)" stroke="var(--line)" />
      <rect x="40" y="46" width="160" height="10" rx="5" fill="var(--primary)" opacity="0.85" />
      <rect x="40" y="70" width="140" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="86" width="150" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="102" width="120" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="126" width="150" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="142" width="140" height="7" rx="3.5" fill="var(--line-strong)" />
      <rect x="40" y="158" width="90" height="7" rx="3.5" fill="var(--line-strong)" />
      <path d="M150 182l20 12 20-12" stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="252" cy="60" r="42" fill="#f5f3ee" />
      <path
        d="M234 58l12 12 22-24"
        stroke="var(--success, #237804)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const LETTER_TEMPLATES = [
  { id: "classic", label: { fr: "Classique", en: "Classic" }, icon: "docClassic" },
  { id: "modern", label: { fr: "Moderne", en: "Modern" }, icon: "docModern" },
  { id: "minimal", label: { fr: "Minimaliste", en: "Minimal" }, icon: "docMinimal" }
];

const LETTER_TONE_ICONS = { formal: "shield", enthusiastic: "matchmark", direct: "share" };

function CoverLetterPage({ language, userId, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy = COVER_LETTER_COPY[language] || COVER_LETTER_COPY.fr;
  const [tone, setTone] = useState("formal");
  const [template, setTemplate] = useState("classic");
  // Réglage indépendant du template (Étape C) — même mécanique que cvColor
  // dans CvPages.jsx : id THEME_PRESETS, "orange" = Corail = défaut du
  // thème actuel de l'app.
  const [letterColor, setLetterColor] = useState("orange");
  const [letter, setLetter] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLetter, setDraftLetter] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  // 999 = solde "infini" (compte associé à un cabinet/école) : dans ce cas
  // afficher "(1 jeton)" sur le bouton n'a pas de sens, rien n'est décompté
  // d'un pool personnel limité.
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;
  // Vars CSS custom scopées au seul document (pas à toute la page, qui
  // contient aussi la barre d'outils) — même principe que cvColorVars dans
  // CvPreviewCard (CvPages.jsx) : .letter-document.template-modern utilise
  // déjà var(--primary) (styles.css), donc réutiliser la couleur choisie ne
  // demande aucun changement de CSS, juste la redéfinir localement ici.
  // L'export PDF n'en dépend pas (il lit letterColor directement dans
  // handleDownload).
  const letterColorPreset = themeColorsFromPresetId(letterColor);
  const letterColorVars = {
    "--primary": letterColorPreset.primary,
    "--primary-ink": letterColorPreset.primaryInk,
    "--bg-accent": letterColorPreset.bgAccent
  };

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
    const payload = { letter: nextLetter, subject: nextSubject, tone, template, color: letterColor, offer };
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
    setIsEditing(false);
    setError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setLetter(conv.letter || "");
    setSubject(conv.subject || "");
    if (conv.tone) setTone(conv.tone);
    if (conv.template) setTemplate(conv.template);
    if (conv.color) setLetterColor(conv.color);
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

  async function handleDownload() {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setError("");
    try {
      const fitToOnePage = await loadPdfFitter("letter");
      // Étape C : theme.colors construit depuis letterColor, même mécanique
      // que handleDownloadPdf dans CvPages.jsx (theme.colors depuis
      // cvColor). `template` reste piloté par le sélecteur ton/modèle
      // déjà existant sur cette page (classic/modern/minimal), inchangé.
      const theme = { colors: themeColorsFromPresetId(letterColor) };
      const fit = await fitToOnePage({ subject, letter, template }, theme);
      const baseName = offer?.company || offer?.title || [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ");
      const fileName = `Lettre-${slugifyForFilename(baseName)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadBlob(fit.blob, fileName);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsDownloadingPdf(false);
    }
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

  if (!hasContext) {
    return (
      <section className="module-locked">
        <div className="module-locked-copy">
          <h2>{copy.title}</h2>
          <p>{copy.empty}</p>
        </div>
        <div className="module-locked-art">
          <CoverLetterIllustration />
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

  return (
    <div className="negotiation-layout">
      {historySidebar}
      <section className="cover-letter-page">
      <header className="module-header feature-page-header">
        <span className="feature-page-header-icon">
          <UiIcon name="mail" />
        </span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="cover-letter-config-card">
        <div className="tone-selector">
          <span>{copy.toneLabel}</span>
          <div className="tone-pills">
            {tones.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tone-pill ${tone === item.id ? "active" : ""}`}
                onClick={() => setTone(item.id)}
              >
                <UiIcon name={LETTER_TONE_ICONS[item.id]} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tone-selector">
          <span>{copy.templateLabel}</span>
          <div className="tone-pills">
            {LETTER_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tone-pill template-pill template-pill-${item.id} ${template === item.id ? "active" : ""}`}
                onClick={() => setTemplate(item.id)}
              >
                <UiIcon name={item.icon} />
                {item.label[language] || item.label.fr}
              </button>
            ))}
          </div>
        </div>

        <div className="tone-selector">
          <span>{copy.colorLabel}</span>
          <div className="cv-color-switch">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`cv-color-swatch ${letterColor === preset.id ? "active" : ""}`}
                style={{ "--swatch-color": preset.vars["--primary"] }}
                title={preset.label[language] || preset.label.fr}
                aria-label={preset.label[language] || preset.label.fr}
                aria-pressed={letterColor === preset.id}
                onClick={() => setLetterColor(preset.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      {!letter ? (
        <div className="cover-letter-empty">
          <CoverLetterIllustration />
          {outOfTokens ? (
            <p className="field-hint">
              {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
            </p>
          ) : null}
          <button type="button" className="btn-main ready" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <span className="btn-spinner" /> {copy.generating}
              </>
            ) : hasUnlimitedTokens ? (
              copy.generateUnlimited
            ) : (
              copy.generate
            )}
          </button>
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
                <button type="button" className="btn-main" onClick={handleDownload} disabled={isDownloadingPdf}>
                  {isDownloadingPdf ? <span className="btn-spinner" /> : <UiIcon name="download" />} {copy.download}
                </button>
              </>
            )}
          </div>
          {isEditing ? (
            <textarea
              className={`letter-document letter-document-edit template-${template}`}
              style={letterColorVars}
              value={draftLetter}
              onChange={(event) => setDraftLetter(event.target.value)}
            />
          ) : (
            <div className={`letter-document template-${template}`} style={letterColorVars} id="cover-letter-document">
              {subject ? <p className="letter-subject">{subject}</p> : null}
              {letter.split("\n\n").map((paragraph, index) => (
                <p key={`para-${index}`}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      )}
      </section>
    </div>
  );
}

export default CoverLetterPage;
