import React from "react";
// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...).
// Le dashboard École vit désormais séparément dans features/school/ ; les
// deux modules continuent de partager quelques composants (AdminKpiCard,
// AdminTrendChart, AdminPagination...) exportés d'ici et importés par
// features/school/SchoolApp.jsx.
//
// NOTE : ce fichier reste volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) — un découpage en un fichier par page admin est une
// suite possible, pas un prérequis pour que ce module soit isolé du reste
// de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AdminExportCsvButton } from "../../../components/AdminExportCsvButton.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatDateTime, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { getAccountLabel } from "../../../lib/accounts.js";
import { satisfactionTierFor } from "../../satisfaction/SatisfactionSurveyModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  listAdminUsers,
  getAdminSatisfaction,
  getSchoolOverview,
  getSchoolStudents,
  getSchoolLicense,
  getSchoolInsights,
  getSchoolInvitations,
  getSchoolNotifications,
  getSchoolProfile,
  updateSchoolProfile,
  getSchoolPromotions,
  createSchoolPromotion,
  deleteSchoolPromotion,
  updateSchoolPromotionStudent,
  getSchoolReports,
  sendSchoolInvitation,
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

// Icône associée à chaque public (avatar de la "conversation").
const AUDIENCE_ICONS = { "": "accounts", all: "accounts", student: "profile", school: "schools", recruiter_firm: "cabinets" };
const DRAFT_STORAGE_KEY = "career_app_admin_announcement_draft";

// Rendu léger du Markdown saisi dans l'éditeur (paragraphes, listes,
// citations, **gras**, _italique_, liens) — en éléments React, sans HTML brut.
function renderInline(text, keyPrefix) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("**")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("_")) parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    else
      parts.push(
        <a key={key} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>
      );
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function AnnouncementBody({ text }) {
  const blocks = String(text || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) {
      return (
        <ul key={blockIndex}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.slice(2), `${blockIndex}-${i}`)}</li>
          ))}
        </ul>
      );
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return (
        <ol key={blockIndex}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.replace(/^\d+\. /, ""), `${blockIndex}-${i}`)}</li>
          ))}
        </ol>
      );
    }
    if (lines.every((line) => line.startsWith(">"))) {
      return <blockquote key={blockIndex}>{renderInline(lines.map((line) => line.replace(/^>\s?/, "")).join(" "), `${blockIndex}`)}</blockquote>;
    }
    return (
      <p key={blockIndex}>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {i ? <br /> : null}
            {renderInline(line, `${blockIndex}-${i}`)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

export default function AdminAnnouncementsPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const copy = {
    title: t("Messagerie", "Messaging"),
    subtitle: t(
      "Annonces envoyées par e-mail aux utilisateurs de la plateforme via le serveur SMTP configuré.",
      "Announcements emailed to platform users via the configured SMTP server."
    ),
    newAnnouncement: t("Nouvelle annonce", "New announcement"),
    searchList: t("Rechercher une annonce…", "Search an announcement…"),
    all: t("Toutes", "All"),
    failed: t("Échecs", "Failed"),
    draft: t("Brouillon", "Draft"),
    noSubject: t("Sans objet", "No subject"),
    empty: t("Aucune annonce envoyée", "No announcement sent yet"),
    emptyHint: t(
      "Rédigez votre première annonce : elle partira par e-mail au public choisi.",
      "Write your first announcement: it will be emailed to the chosen audience."
    ),
    noMatch: t("Aucune annonce ne correspond.", "No announcement matches."),
    selectOne: t("Sélectionnez une annonce pour l'afficher.", "Select an announcement to display it."),
    me: t("Moi", "Me"),
    sentBadge: t("Envoyée", "Sent"),
    replyPlaceholder: (audienceLabel) => t(`Écrire une relance à « ${audienceLabel} »…`, `Write a follow-up to "${audienceLabel}"…`),
    replyHint: t("Entrée pour envoyer · Maj+Entrée pour un saut de ligne", "Enter to send · Shift+Enter for a new line"),
    details: t("Détails", "Details"),
    audienceSection: t("Public", "Audience"),
    delivery: t("Distribution", "Delivery"),
    recipientsLabel: t("Destinataires", "Recipients"),
    delivered: t("Délivrés", "Delivered"),
    sentOn: t("Envoyée le", "Sent on"),
    recipients: t("destinataire(s)", "recipient(s)"),
    to: t("Destinataires", "Recipients"),
    label: t("Étiquette", "Label"),
    subject: t("Objet", "Subject"),
    subjectPlaceholder: t("Objet de l'annonce", "Announcement subject"),
    message: t("Message", "Message"),
    messagePlaceholder: t(
      "Rédigez votre annonce… (laissez une ligne vide pour un nouveau paragraphe)",
      "Write your announcement… (use a blank line to start a new paragraph)"
    ),
    normalText: t("Texte normal", "Normal text"),
    attachment: t("Pièce jointe", "Attachment"),
    attachmentHint: t("PDF, image ou document bureautique (facultatif)", "PDF, image or office document (optional)"),
    attachFile: t("Joindre un fichier", "Attach file"),
    removeFile: t("Retirer", "Remove"),
    cancel: t("Annuler", "Cancel"),
    saveDraft: t("Enregistrer le brouillon", "Save draft"),
    draftSaved: t("Brouillon enregistré.", "Draft saved."),
    send: t("Envoyer", "Send"),
    sending: t("Envoi…", "Sending…"),
    confirmTitle: t("Envoyer cette annonce ?", "Send this announcement?"),
    confirmText: (count) =>
      t(
        `Cela enverra un e-mail à ${count} destinataire(s) immédiatement. Action irréversible.`,
        `This will email ${count} recipient(s) right now. This cannot be undone.`
      ),
    linkPrompt: t("Collez le lien à insérer", "Paste the link to insert"),
    important: t("Important", "Important"),
    platform: t("Plateforme", "Platform"),
    schools: t("Écoles", "Schools"),
    importantPrefix: t("[Important]", "[Important]"),
    platformPrefix: t("[Plateforme]", "[Platform]"),
    schoolPrefix: t("[Écoles]", "[Schools]"),
    followUpPrefix: t("Relance :", "Follow-up:")
  };

  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [audience, setAudience] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [audienceCount, setAudienceCount] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const messageRef = useRef(null);
  const attachmentInputRef = useRef(null);

  function loadHistory(selectFirst = false) {
    getAdminAnnouncements(user.id)
      .then((items) => {
        setHistory(items || []);
        if (selectFirst && items?.length) setActiveId(items[0].id);
      })
      .catch((err) => {
        setHistory([]);
        setError(getFriendlyErrorMessage(err, language));
      });
  }

  useEffect(() => {
    loadHistory(true);
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
      if (draft?.subject || draft?.message) {
        setSubject(draft.subject || "");
        setMessage(draft.message || "");
        setAudience(draft.audience || "");
        setAttachment(draft.attachmentMeta || null);
        setHasDraft(true);
      }
    } catch (_error) {
      // brouillon illisible : ignoré
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getAdminAnnouncementAudienceCount(user.id, audience)
      .then(setAudienceCount)
      .catch(() => setAudienceCount(null));
  }, [user.id, audience]);

  // Échap ferme la fenêtre de rédaction.
  useEffect(() => {
    if (!composeOpen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setComposeOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [composeOpen]);

  function getAudienceLabel(value) {
    return (
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === value || (a.id === "" && (value === "all" || !value)))?.label[language] ||
      value ||
      ADMIN_ANNOUNCEMENT_AUDIENCES[0].label[language]
    );
  }

  const formatDateTime = (value) =>
    new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));

  const items = history || [];
  const failedCount = items.filter((item) => Number(item.failedCount || 0) > 0).length;
  const term = search.trim().toLowerCase();
  const visible = items
    .filter((item) => filter !== "failed" || Number(item.failedCount || 0) > 0)
    .filter((item) => !term || `${item.subject} ${getAudienceLabel(item.audience)} ${item.message || ""}`.toLowerCase().includes(term));
  const active = items.find((item) => item.id === activeId) || null;

  function openCompose(prefill) {
    if (prefill) {
      setAudience(prefill.audience === "all" ? "" : prefill.audience || "");
      setSubject(prefill.subject || "");
      setMessage(prefill.message || "");
    }
    setError("");
    setComposeOpen(true);
    setTimeout(() => messageRef.current?.focus(), 50);
  }

  function insertInMessage(before, after = "", fallback = "") {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const selected = message.slice(start, end) || fallback;
    setMessage(`${message.slice(0, start)}${before}${selected}${after}${message.slice(end)}`);
    requestAnimationFrame(() => {
      messageRef.current?.focus();
      const cursorStart = start + before.length;
      messageRef.current?.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  }

  async function insertLink() {
    const result = await Swal.fire({
      title: copy.linkPrompt,
      input: "url",
      inputPlaceholder: "https://",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b83309"
    });
    if (result.isConfirmed && result.value) insertInMessage("", "", result.value);
  }

  function applyLabel(label) {
    setActiveLabel(label);
    const prefix = label === "important" ? copy.importantPrefix : label === "schools" ? copy.schoolPrefix : copy.platformPrefix;
    if (!subject.startsWith(prefix)) setSubject((prev) => `${prefix} ${prev}`.trim());
    if (label === "schools") setAudience("school");
    if (label === "platform") setAudience("");
  }

  function toast(title, icon = "success") {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 3200,
      timerProgressBar: true,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  function saveDraft() {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        subject,
        message,
        audience,
        attachmentMeta: attachment ? { name: attachment.name, size: attachment.size, type: attachment.type } : null,
        savedAt: new Date().toISOString()
      })
    );
    setHasDraft(true);
    setComposeOpen(false);
    toast(copy.draftSaved);
  }

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      setAttachment({ name: file.name, size: file.size, type: file.type || "application/octet-stream", content });
    } catch (_error) {
      setError(t("Impossible de lire cette pièce jointe. Essaie un autre fichier.", "Unable to read this attachment. Try another file."));
    } finally {
      event.target.value = "";
    }
  }

  // Envoi réel (utilisé par la fenêtre de rédaction et par la relance rapide).
  async function sendAnnouncement(payload, count) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmTitle,
      text: copy.confirmText(count ?? "?"),
      showCancelButton: true,
      confirmButtonText: copy.send,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b83309"
    });
    if (!result.isConfirmed) return false;
    setSending(true);
    setError("");
    try {
      const response = await sendAdminAnnouncement({ adminUserId: user.id, ...payload });
      loadHistory(true);
      toast(
        t(
          `Envoyé à ${response.recipientCount} destinataire(s)${response.failedCount ? `, ${response.failedCount} échec(s)` : ""}.`,
          `Sent to ${response.recipientCount} recipient(s)${response.failedCount ? `, ${response.failedCount} failed` : ""}.`
        )
      );
      return true;
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleComposeSubmit(event) {
    event.preventDefault();
    const ok = await sendAnnouncement({ subject, message, audience, attachment }, audienceCount);
    if (ok) {
      setSubject("");
      setMessage("");
      setAttachment(null);
      setActiveLabel("");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setComposeOpen(false);
    }
  }

  async function sendFollowUp() {
    if (!active || !reply.trim() || sending) return;
    const followAudience = active.audience === "all" ? "" : active.audience || "";
    const baseSubject = String(active.subject || copy.noSubject).replace(new RegExp(`^${copy.followUpPrefix}\\s*`), "");
    const count = await getAdminAnnouncementAudienceCount(user.id, followAudience).catch(() => null);
    const ok = await sendAnnouncement({ subject: `${copy.followUpPrefix} ${baseSubject}`, message: reply.trim(), audience: followAudience }, count);
    if (ok) setReply("");
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: t("Supprimer cette annonce ?", "Delete this announcement?"),
      text: t(
        "Elle sera retirée de l'historique. Les e-mails déjà envoyés ne sont pas rappelés.",
        "It will be removed from the history. Emails already sent are not recalled."
      ),
      showCancelButton: true,
      confirmButtonText: t("Supprimer", "Delete"),
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b3261e"
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAdminAnnouncement({ adminUserId: user.id, announcementId: item.id });
      const remaining = (history || []).filter((entry) => entry.id !== item.id);
      setHistory(remaining);
      setActiveId(remaining[0]?.id || null);
      toast(t("Annonce supprimée.", "Announcement deleted."));
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  if (!history) return <AdminPageLoader language={language} />;

  const header = (
    <header className="module-header">
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className="admin-header-actions">
        <button type="button" className="btn-main ready" onClick={() => openCompose()}>
          <AdminLineIcon name="plus" /> {copy.newAnnouncement}
        </button>
      </div>
    </header>
  );

  const composeDialog = composeOpen ? (
    <div className="jy-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setComposeOpen(false)}>
      <form className="jy-modal" role="dialog" aria-modal="true" aria-labelledby="jy-compose-title" onSubmit={handleComposeSubmit}>
        <div className="jy-modal-head">
          <h3 id="jy-compose-title">{copy.newAnnouncement}</h3>
          <button type="button" className="jy-icon-btn" aria-label={copy.cancel} onClick={() => setComposeOpen(false)}>
            <AdminLineIcon name="close" />
          </button>
        </div>

        <div className="jy-modal-body">
          <label className="jy-field">
            <span>{copy.to}</span>
            <div className="jy-field-row">
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                {ADMIN_ANNOUNCEMENT_AUDIENCES.map((item) => (
                  <option key={item.id || "all"} value={item.id}>
                    {item.label[language] || item.label.fr}
                  </option>
                ))}
              </select>
              <span className="tag tag-success">
                {audienceCount ?? "…"} {copy.recipients}
              </span>
            </div>
          </label>

          <div className="jy-field">
            <span>{copy.label}</span>
            <div className="jy-label-chips">
              {[
                { id: "important", text: copy.important },
                { id: "platform", text: copy.platform },
                { id: "schools", text: copy.schools }
              ].map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={`jy-label-chip ${label.id} ${activeLabel === label.id ? "active" : ""}`}
                  onClick={() => applyLabel(label.id)}
                >
                  <i aria-hidden="true" />
                  {label.text}
                </button>
              ))}
            </div>
          </div>

          <label className="jy-field">
            <span>{copy.subject}</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={copy.subjectPlaceholder} required />
          </label>

          <div className="jy-field">
            <span>{copy.message}</span>
            <div className="jy-editor">
              <div className="admin-mail-editor-toolbar" aria-label={t("Barre de mise en forme", "Formatting toolbar")}>
                {[
                  { icon: "paragraph", label: t("Nouveau paragraphe", "New paragraph"), run: () => insertInMessage("\n\n", "", t("Nouveau paragraphe", "New paragraph")), text: copy.normalText },
                  { icon: "bold", label: t("Gras", "Bold"), run: () => insertInMessage("**", "**", t("texte en gras", "bold text")) },
                  { icon: "italic", label: t("Italique", "Italic"), run: () => insertInMessage("_", "_", t("texte italique", "italic text")) },
                  { icon: "quote", label: t("Citation", "Quote"), run: () => insertInMessage("\n\n> ", "", t("Citation", "Quote")) },
                  { icon: "list", label: t("Liste à puces", "Bulleted list"), run: () => insertInMessage("\n- ", "", t("Élément de liste", "List item")) },
                  { icon: "numbered", label: t("Liste numérotée", "Numbered list"), run: () => insertInMessage("\n1. ", "", t("Premier élément", "First item")) },
                  { icon: "link", label: t("Lien", "Link"), run: insertLink }
                ].map((tool) => (
                  <button
                    key={tool.icon}
                    type="button"
                    className={tool.text ? "admin-mail-format-select" : ""}
                    title={tool.label}
                    aria-label={tool.label}
                    onClick={tool.run}
                  >
                    <AdminLineIcon name={tool.icon} />
                    {tool.text ? <span>{tool.text}</span> : null}
                  </button>
                ))}
              </div>
              <textarea
                ref={messageRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={copy.messagePlaceholder}
                rows={9}
                required
              />
            </div>
          </div>

          <div className="jy-attachment">
            <AdminLineIcon name="upload" />
            <div>
              <strong>{copy.attachment}</strong>
              <span>
                {attachment?.name
                  ? `${attachment.name} · ${Math.max(1, Math.round((attachment.size || 0) / 1024))} Ko`
                  : copy.attachmentHint}
              </span>
            </div>
            <input
              ref={attachmentInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
              onChange={handleAttachmentChange}
            />
            {attachment ? (
              <button type="button" className="admin-row-action danger" onClick={() => setAttachment(null)} disabled={sending}>
                {copy.removeFile}
              </button>
            ) : (
              <button type="button" className="admin-row-action" onClick={() => attachmentInputRef.current?.click()} disabled={sending}>
                {copy.attachFile}
              </button>
            )}
          </div>

          {error ? <p className="field-error">{error}</p> : null}
        </div>

        <div className="jy-modal-foot">
          <button type="button" className="btn-ghost" onClick={() => setComposeOpen(false)}>
            {copy.cancel}
          </button>
          <button type="button" className="btn-ghost" onClick={saveDraft} disabled={(!message && !subject) || sending}>
            {copy.saveDraft}
          </button>
          <button type="submit" className="btn-main ready" disabled={sending || !audienceCount}>
            {sending ? <span className="btn-spinner" /> : <AdminLineIcon name="send" />} {sending ? copy.sending : copy.send}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  if (!items.length && !hasDraft) {
    return (
      <section className="admin-announcements">
        {header}
        <div className="jy-empty-card">
          <span className="jy-stat-icon green">
            <AdminLineIcon name="announcements" />
          </span>
          <h3>{copy.empty}</h3>
          <p>{copy.emptyHint}</p>
          <button type="button" className="btn-main ready" onClick={() => openCompose()}>
            <AdminLineIcon name="plus" /> {copy.newAnnouncement}
          </button>
          {error ? <p className="field-error">{error}</p> : null}
        </div>
        {composeDialog}
      </section>
    );
  }

  const activeAudienceLabel = active ? getAudienceLabel(active.audience) : "";
  const activeFailed = Number(active?.failedCount || 0);
  const activeRecipients = Number(active?.recipientCount || 0);

  return (
    <section className="admin-announcements">
      {header}

      <div className="jy-inbox">
        {/* Colonne 1 : liste des annonces */}
        <div className="jy-inbox-list">
          <div className="jy-inbox-search">
            <AdminLineIcon name="search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchList} />
          </div>
          <div className="jy-inbox-filters">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              {copy.all} <strong>{items.length}</strong>
            </button>
            <button type="button" className={filter === "failed" ? "active" : ""} onClick={() => setFilter("failed")}>
              {copy.failed} <strong>{failedCount}</strong>
            </button>
          </div>
          <div className="jy-inbox-items">
            {hasDraft ? (
              <button type="button" className="jy-inbox-item is-draft" onClick={() => openCompose()}>
                <span className="jy-inbox-avatar">
                  <AdminLineIcon name="edit" />
                </span>
                <span className="jy-inbox-meta">
                  <span className="jy-inbox-top">
                    <strong>{copy.draft}</strong>
                  </span>
                  <span className="jy-inbox-subject">{subject || message || copy.noSubject}</span>
                  <small>{getAudienceLabel(audience)}</small>
                </span>
              </button>
            ) : null}
            {visible.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`jy-inbox-item ${item.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(item.id)}
              >
                <span className="jy-inbox-avatar">
                  <AdminLineIcon name={AUDIENCE_ICONS[item.audience] || "accounts"} />
                </span>
                <span className="jy-inbox-meta">
                  <span className="jy-inbox-top">
                    <strong>{getAudienceLabel(item.audience)}</strong>
                    <time>{formatDateTime(item.createdAt, language)}</time>
                  </span>
                  <span className="jy-inbox-subject">{item.subject || copy.noSubject}</span>
                  <small>
                    {item.recipientCount} {copy.recipients}
                    {Number(item.failedCount || 0) ? <em> · {item.failedCount} {copy.failed.toLowerCase()}</em> : null}
                  </small>
                </span>
              </button>
            ))}
            {!visible.length ? <p className="jy-inbox-empty">{copy.noMatch}</p> : null}
          </div>
        </div>

        {/* Colonne 2 : fil de l'annonce sélectionnée */}
        <div className="jy-thread">
          {active ? (
            <>
              <div className="jy-thread-head">
                <div>
                  <strong>{active.subject || copy.noSubject}</strong>
                  <small>
                    {copy.audienceSection} : {activeAudienceLabel}
                  </small>
                </div>
                <span className={`tag ${activeFailed ? "tag-danger" : "tag-success"}`}>
                  {activeFailed ? `${activeFailed} ${copy.failed.toLowerCase()}` : copy.sentBadge}
                </span>
              </div>

              <div className="jy-thread-body">
                <div className="jy-bubble-row is-me">
                  <AvatarCircle user={user} />
                  <div className="jy-bubble">
                    <div className="jy-bubble-text">
                      <AnnouncementBody text={active.message} />
                    </div>
                    <time>
                      {copy.me} · {formatDateTime(active.createdAt)}
                    </time>
                  </div>
                </div>
              </div>

              <div className="jy-thread-reply">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendFollowUp();
                    }
                  }}
                  placeholder={copy.replyPlaceholder(activeAudienceLabel)}
                  title={copy.replyHint}
                  rows={1}
                />
                <button
                  type="button"
                  className="jy-send-btn"
                  aria-label={copy.send}
                  disabled={!reply.trim() || sending}
                  onClick={sendFollowUp}
                >
                  {sending ? <span className="btn-spinner" /> : <AdminLineIcon name="send" />}
                </button>
              </div>
              {error && !composeOpen ? <p className="field-error jy-thread-error">{error}</p> : null}
            </>
          ) : (
            <div className="jy-thread-placeholder">{copy.selectOne}</div>
          )}
        </div>

        {/* Colonne 3 : détails */}
        <aside className="jy-thread-details">
          {active ? (
            <>
              <section>
                <h4>{copy.details}</h4>
                <strong>{active.subject || copy.noSubject}</strong>
                <small>
                  {copy.sentOn} {formatDateTime(active.createdAt)}
                </small>
              </section>
              <section>
                <h4>{copy.audienceSection}</h4>
                <div className="jy-detail-line">
                  <span className="jy-inbox-avatar">
                    <AdminLineIcon name={AUDIENCE_ICONS[active.audience] || "accounts"} />
                  </span>
                  <strong>{activeAudienceLabel}</strong>
                </div>
              </section>
              <section>
                <h4>{copy.delivery}</h4>
                <ul className="admin-stat-list">
                  <li>
                    <span>{copy.recipientsLabel}</span>
                    <strong>{activeRecipients}</strong>
                  </li>
                  <li>
                    <span>{copy.delivered}</span>
                    <strong>{Math.max(0, activeRecipients - activeFailed)}</strong>
                  </li>
                  <li>
                    <span>{copy.failed}</span>
                    <strong className={activeFailed ? "is-danger" : ""}>{activeFailed}</strong>
                  </li>
                </ul>
              </section>
              <section>
                <button type="button" className="admin-row-action danger jy-details-delete" onClick={() => handleDelete(active)}>
                  <AdminLineIcon name="trash" /> {t("Supprimer de l'historique", "Delete from history")}
                </button>
              </section>
            </>
          ) : (
            <p className="jy-inbox-empty">{copy.selectOne}</p>
          )}
        </aside>
      </div>

      {composeDialog}
    </section>
  );
}
