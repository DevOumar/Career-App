import React from "react";
import Swal from "sweetalert2";
// Module Lettre de motivation IA : génération multi-ton/multi-modèle,
// édition avant export, historique des lettres.
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import {
  generateCoverLetter,
  generateApplicationEmail,
  listCoverLetters,
  saveCoverLetter,
  updateCoverLetter,
  deleteCoverLetter
} from "../../lib/inMemoryDb.js";
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

const EMAIL_TYPES = [
  { id: "offer_reply", icon: "briefcase" },
  { id: "spontaneous", icon: "matchmark" },
  { id: "follow_up", icon: "share" }
];

const EMAIL_LENGTHS = [
  { id: "short", icon: "docMinimal" },
  { id: "long", icon: "docClassic" }
];

// Extrait pour être rendu à 2 endroits : empilé sous les réglages lettre
// avant toute génération (une seule colonne), et dans la colonne email une
// fois la lettre générée (vue 2 colonnes) — mêmes champs, même state, pas
// de duplication de JSX.
function EmailSettingsFields({
  copy,
  tones,
  recipientName,
  setRecipientName,
  recipientEmail,
  setRecipientEmail,
  emailType,
  setEmailType,
  emailLength,
  setEmailLength,
  emailTone,
  setEmailTone,
  emailError
}) {
  return (
    <>
      <div className="cover-letter-recipient-row">
        <label>
          {copy.recipientNameLabel}
          <input
            type="text"
            value={recipientName}
            placeholder={copy.recipientNamePlaceholder}
            onChange={(event) => setRecipientName(event.target.value)}
          />
        </label>
        <label>
          {copy.recipientEmailLabel}
          <input
            type="email"
            value={recipientEmail}
            placeholder={copy.recipientEmailPlaceholder}
            onChange={(event) => setRecipientEmail(event.target.value)}
          />
        </label>
      </div>

      <div className="tone-selector">
        <span>{copy.emailTypeLabel}</span>
        <div className="tone-pills">
          {EMAIL_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tone-pill ${emailType === item.id ? "active" : ""}`}
              onClick={() => setEmailType(item.id)}
            >
              <UiIcon name={item.icon} />
              {copy[`emailType_${item.id}`]}
            </button>
          ))}
        </div>
      </div>

      <div className="tone-selector">
        <span>{copy.emailLengthLabel}</span>
        <div className="tone-pills">
          {EMAIL_LENGTHS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tone-pill ${emailLength === item.id ? "active" : ""}`}
              onClick={() => setEmailLength(item.id)}
            >
              <UiIcon name={item.icon} />
              {copy[`emailLength_${item.id}`]}
            </button>
          ))}
        </div>
      </div>

      <div className="tone-selector">
        <span>{copy.toneLabel}</span>
        <div className="tone-pills">
          {tones.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tone-pill ${emailTone === item.id ? "active" : ""}`}
              onClick={() => setEmailTone(item.id)}
            >
              <UiIcon name={LETTER_TONE_ICONS[item.id]} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {emailError ? <p className="field-error">{emailError}</p> : null}
    </>
  );
}

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
  // Étape D : email d'accompagnement, distinct de la lettre (génération,
  // stockage et boutons séparés — cf. persistConversation plus bas).
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  // Réglages indépendants de l'email (distincts de tone/template/letterColor
  // ci-dessus, qui pilotent la lettre) — emailTone réutilise exactement les
  // mêmes valeurs formal/enthusiastic/direct que tone, via son propre state.
  const [emailType, setEmailType] = useState("offer_reply");
  const [emailLength, setEmailLength] = useState("short");
  const [emailTone, setEmailTone] = useState("formal");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [copiedEmailField, setCopiedEmailField] = useState("");

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  // 999 = solde "infini" (compte associé à un cabinet/école) : dans ce cas
  // afficher "(1 jeton)" sur le bouton n'a pas de sens, rien n'est décompté
  // d'un pool personnel limité.
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;
  // La toute première génération (avant que lettre ET email n'existent)
  // enchaîne les 2 actions payantes déjà existantes (1 jeton la lettre +
  // 1 jeton l'email, cf. handleGenerateBoth) : il faut donc 2 jetons, pas 1,
  // pour pouvoir la déclencher.
  const missingTokensForBoth = !hasUnlimitedTokens && tokensBalance < 2;
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

  // Pré-remplissage depuis l'offre (contactName/contactEmail, extraits par
  // /api/jobs/extract UNIQUEMENT s'ils sont explicitement mentionnés) —
  // seulement si le champ est encore vide, pour ne jamais écraser une
  // saisie utilisateur ou une reprise d'historique (handleResumeConversation
  // s'exécute après ce mount et applique ses propres valeurs). Dépend des
  // champs eux-mêmes (primitifs), pas de l'objet offer entier, qui est
  // recréé à chaque render côté App.jsx (extractOfferSummary(offerText)).
  useEffect(() => {
    if (offer?.contactName && !recipientName) setRecipientName(offer.contactName);
    if (offer?.contactEmail && !recipientEmail) setRecipientEmail(offer.contactEmail);
    // recipientName/recipientEmail volontairement absents des deps : ne
    // doit tourner qu'à l'apparition d'un contact dans l'offre, jamais à
    // chaque frappe utilisateur dans les champs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer?.contactName, offer?.contactEmail]);

  const tones = [
    { id: "formal", label: copy.toneFormal },
    { id: "enthusiastic", label: copy.toneEnthusiastic },
    { id: "direct", label: copy.toneDirect }
  ];

  function conversationTitle() {
    return offer?.title ? `${offer.title}${offer.company ? ` · ${offer.company}` : ""}` : copy.untitled;
  }

  async function persistConversation(nextLetter, nextSubject, nextEmail) {
    if (!userId) return;
    // nextEmail : passé explicitement par handleGenerateEmail (valeur
    // fraîche, pas encore en state) ; sinon retombe sur l'email déjà en
    // state (cas handleGenerate/saveEditing, qui ne touchent pas à l'email
    // — régénérer la lettre ne doit pas effacer un email déjà généré).
    const email = nextEmail !== undefined ? nextEmail : emailSubject || emailBody ? { subject: emailSubject, body: emailBody } : null;
    const payload = {
      letter: nextLetter,
      subject: nextSubject,
      tone,
      template,
      color: letterColor,
      offer,
      recipientName,
      recipientEmail,
      emailType,
      emailLength,
      emailTone,
      email
    };
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
    // Repart des contacts connus de l'offre (pas juste vidé) : l'effet de
    // pré-remplissage au montage ne se redéclenche pas ici puisque offer
    // n'a pas changé.
    setRecipientName(offer?.contactName || "");
    setRecipientEmail(offer?.contactEmail || "");
    setEmailType("offer_reply");
    setEmailLength("short");
    setEmailTone("formal");
    setEmailSubject("");
    setEmailBody("");
    setEmailError("");
  }

  function handleResumeConversation(conv) {
    setConversationId(conv.id);
    setLetter(conv.letter || "");
    setSubject(conv.subject || "");
    if (conv.tone) setTone(conv.tone);
    if (conv.template) setTemplate(conv.template);
    if (conv.color) setLetterColor(conv.color);
    setRecipientName(conv.recipientName || "");
    setRecipientEmail(conv.recipientEmail || "");
    if (conv.emailType) setEmailType(conv.emailType);
    if (conv.emailLength) setEmailLength(conv.emailLength);
    if (conv.emailTone) setEmailTone(conv.emailTone);
    setEmailSubject(conv.email?.subject || "");
    setEmailBody(conv.email?.body || "");
    setIsEditing(false);
    setError("");
    setEmailError("");
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

  // Génération initiale combinée (lettre + email, 2 jetons) : enchaîne les
  // 2 actions déjà existantes et déjà validées séparément (generateCoverLetter
  // + 1 jeton, puis generateApplicationEmail + 1 jeton) — pas un nouvel appel
  // IA unique, cf. décision prise avec l'utilisateur. Si la lettre réussit
  // mais que l'email échoue ensuite, la lettre (déjà payée et générée) est
  // conservée et persistée quand même : l'utilisateur ne perd que le jeton
  // de l'étape qui a réellement échoué, pas les deux.
  async function handleGenerateBoth() {
    if (!hasContext || isGenerating || isGeneratingEmail) return;
    if (missingTokensForBoth) {
      onGoToTarifs();
      return;
    }
    setError("");
    setEmailError("");
    setIsGenerating(true);
    setIsEditing(false);

    let letterResult;
    try {
      letterResult = await generateCoverLetter({ candidate, offer, tone, language });
      setLetter(letterResult.letter);
      setSubject(letterResult.subject || "");
      await onConsumeToken();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
      setIsGenerating(false);
      return;
    }
    setIsGenerating(false);

    setIsGeneratingEmail(true);
    try {
      const emailResult = await generateApplicationEmail({
        candidate,
        offer,
        recipientName: recipientName.trim(),
        tone: emailTone,
        type: emailType,
        length: emailLength,
        language
      });
      setEmailSubject(emailResult.subject);
      setEmailBody(emailResult.body);
      await onConsumeToken();
      await persistConversation(letterResult.letter, letterResult.subject || "", { subject: emailResult.subject, body: emailResult.body });
    } catch (err) {
      setEmailError(getFriendlyErrorMessage(err, language));
      await persistConversation(letterResult.letter, letterResult.subject || "", null);
    } finally {
      setIsGeneratingEmail(false);
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

  async function handleGenerateEmail() {
    if (!hasContext || isGeneratingEmail) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setEmailError("");
    setIsGeneratingEmail(true);
    try {
      const result = await generateApplicationEmail({
        candidate,
        offer,
        recipientName: recipientName.trim(),
        tone: emailTone,
        type: emailType,
        length: emailLength,
        language
      });
      setEmailSubject(result.subject);
      setEmailBody(result.body);
      await onConsumeToken();
      await persistConversation(letter, subject, { subject: result.subject, body: result.body });
    } catch (err) {
      setEmailError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  function handleCopyEmail(part) {
    const text = part === "subject" ? emailSubject : part === "body" ? emailBody : `${emailSubject}\n\n${emailBody}`;
    navigator.clipboard?.writeText(text);
    setCopiedEmailField(part);
    setTimeout(() => setCopiedEmailField(""), 1800);
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
              <span className="negotiation-history-main">
                <span className="negotiation-history-title">{conv.title || copy.untitled}</span>
                <span className="negotiation-history-badges">
                  <span className="history-badge history-badge-letter">{copy.historyBadgeLetter}</span>
                  {conv.email?.body ? <span className="history-badge history-badge-email">{copy.historyBadgeEmail}</span> : null}
                </span>
              </span>
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
