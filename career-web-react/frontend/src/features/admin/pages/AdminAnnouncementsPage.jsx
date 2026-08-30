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
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
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
import { AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminAnnouncementsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Announcement emails",
          subtitle: "Send a real email to a segment of users via the configured SMTP server.",
          audience: "Audience",
          subject: "Subject",
          message: "Message",
          messagePlaceholder: "Write your announcement… (use a blank line to start a new paragraph)",
          recipients: "recipient(s)",
          send: "Send announcement",
          sending: "Sending…",
          confirmTitle: "Send this announcement?",
          confirmText: (count) => `This will email ${count} recipient(s) right now. This cannot be undone.`,
          confirmBtn: "Send",
          cancel: "Cancel",
          history: "Sent history",
          noHistory: "No announcement sent yet.",
          colDate: "Date",
          colSubject: "Subject",
          colAudience: "Audience",
          colRecipients: "Recipients",
          colFailed: "Failed",
          compose: "Compose",
          composeTitle: "Compose new message",
          folders: "Folders",
          inbox: "Audience",
          sent: "Sent",
          drafts: "Draft",
          failed: "Failed",
          labels: "Labels",
          important: "Important",
          platform: "Platform",
          schools: "Schools",
          to: "To:",
          subjectLine: "Subject:",
          normalText: "Normal text",
          attachment: "Attachment",
          attachmentHint: "Add a PDF, image or office document to this campaign.",
          attachFile: "Attach file",
          removeFile: "Remove file",
          draftSaved: "Draft saved.",
          linkPrompt: "Paste the link to insert",
          importantPrefix: "[Important]",
          platformPrefix: "[Platform]",
          schoolPrefix: "[Schools]"
        }
      : {
          title: "Emails d'annonce",
          subtitle: "Envoyez un vrai email à un segment d'utilisateurs via le serveur SMTP configuré.",
          audience: "Audience",
          subject: "Objet",
          message: "Message",
          messagePlaceholder: "Rédigez votre annonce… (laissez une ligne vide pour un nouveau paragraphe)",
          recipients: "destinataire(s)",
          send: "Envoyer l'annonce",
          sending: "Envoi en cours…",
          confirmTitle: "Envoyer cette annonce ?",
          confirmText: (count) => `Cela enverra un email à ${count} destinataire(s) immédiatement. Action irréversible.`,
          confirmBtn: "Envoyer",
          cancel: "Annuler",
          history: "Historique des envois",
          noHistory: "Aucune annonce envoyée pour l'instant.",
          colDate: "Date",
          colSubject: "Objet",
          colAudience: "Audience",
          colRecipients: "Destinataires",
          colFailed: "Échecs",
          compose: "Composer",
          composeTitle: "Nouveau message",
          folders: "Dossiers",
          inbox: "Audience",
          sent: "Envoyés",
          drafts: "Brouillon",
          failed: "Échecs",
          labels: "Labels",
          important: "Important",
          platform: "Plateforme",
          schools: "Écoles",
          to: "À :",
          subjectLine: "Objet :",
          normalText: "Texte normal",
          attachment: "Pièce jointe",
          attachmentHint: "Ajoutez un PDF, une image ou un document bureautique à cette campagne.",
          attachFile: "Joindre un fichier",
          removeFile: "Retirer le fichier",
          draftSaved: "Brouillon enregistré.",
          linkPrompt: "Collez le lien à insérer",
          importantPrefix: "[Important]",
          platformPrefix: "[Plateforme]",
          schoolPrefix: "[Écoles]"
        };

  const [audience, setAudience] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audienceCount, setAudienceCount] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeFolder, setActiveFolder] = useState("compose");
  const [activeLabel, setActiveLabel] = useState("");
  const [mailSearch, setMailSearch] = useState("");
  const [attachment, setAttachment] = useState(null);
  const messageRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const failedTotal = history.reduce((total, item) => total + Number(item.failedCount || 0), 0);
  const folderHistory = activeFolder === "failed" ? history.filter((item) => Number(item.failedCount || 0) > 0) : history;
  const visibleHistory = folderHistory.filter((item) => {
    const term = mailSearch.trim().toLowerCase();
    if (!term) return true;
    const audienceLabel =
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === item.audience || (a.id === "" && item.audience === "all"))
        ?.label[language] || item.audience;
    return `${item.subject} ${audienceLabel}`.toLowerCase().includes(term);
  });
  const showMailbox = activeFolder === "sent" || activeFolder === "failed";

  function loadHistory() {
    getAdminAnnouncements(user.id)
      .then(setHistory)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getAdminAnnouncementAudienceCount(user.id, audience)
      .then(setAudienceCount)
      .catch(() => setAudienceCount(null));
  }, [user.id, audience]);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem("career_app_admin_announcement_draft") || "null");
      if (draft?.subject || draft?.message) {
        setSubject(draft.subject || "");
        setMessage(draft.message || "");
        setAudience(draft.audience || "");
        setAttachment(draft.attachmentMeta || null);
      }
    } catch (_error) {
      // ignore malformed draft
    }
  }, []);

  function focusMessage() {
    setTimeout(() => messageRef.current?.focus(), 0);
  }

  function handleFolderClick(folder) {
    setActiveFolder(folder);
    if (folder === "compose" || folder === "audience" || folder === "draft") {
      focusMessage();
    }
  }

  function getAudienceLabel(value) {
    return (
      ADMIN_ANNOUNCEMENT_AUDIENCES.find((a) => a.id === value || (a.id === "" && value === "all"))?.label[language] ||
      value ||
      ADMIN_ANNOUNCEMENT_AUDIENCES[0].label[language]
    );
  }

  function insertInMessage(before, after = "", fallback = "") {
    const textarea = messageRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const selected = message.slice(start, end) || fallback;
    const next = `${message.slice(0, start)}${before}${selected}${after}${message.slice(end)}`;
    setMessage(next);
    requestAnimationFrame(() => {
      messageRef.current?.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      messageRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function applyLabel(label) {
    setActiveLabel(label);
    const prefix = label === "important" ? copy.importantPrefix : label === "schools" ? copy.schoolPrefix : copy.platformPrefix;
    if (!subject.startsWith(prefix)) {
      setSubject((prev) => `${prefix} ${prev}`.trim());
    }
    if (label === "schools") setAudience("school");
    if (label === "platform") setAudience("");
    focusMessage();
  }

  async function insertLink() {
    const result = await Swal.fire({
      title: copy.linkPrompt,
      input: "url",
      inputPlaceholder: "https://",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#1a0dab"
    });
    if (result.isConfirmed && result.value) {
      insertInMessage("", "", result.value);
    }
  }

  function saveDraft() {
    localStorage.setItem(
      "career_app_admin_announcement_draft",
      JSON.stringify({
        subject,
        message,
        audience,
        attachmentMeta: attachment ? { name: attachment.name, size: attachment.size, type: attachment.type } : null,
        savedAt: new Date().toISOString()
      })
    );
    setActiveFolder("draft");
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: copy.draftSaved,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await fileToBase64(file);
      setAttachment({ name: file.name, size: file.size, type: file.type || "application/octet-stream", content });
    } catch (_error) {
      setError(
        language === "en"
          ? "Unable to read this attachment. Try another file."
          : "Impossible de lire cette pièce jointe. Essaie un autre fichier."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    setError("");

    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmTitle,
      text: copy.confirmText(audienceCount ?? "?"),
      showCancelButton: true,
      confirmButtonText: copy.confirmBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#1a0dab"
    });
    if (!result.isConfirmed) return;

    setSending(true);
    try {
      const response = await sendAdminAnnouncement({ adminUserId: user.id, subject, message, audience, attachment });
      setSubject("");
      setMessage("");
      setAttachment(null);
      localStorage.removeItem("career_app_admin_announcement_draft");
      setActiveFolder("sent");
      loadHistory();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title:
          language === "en"
            ? `Sent to ${response.recipientCount} recipient(s)${response.failedCount ? `, ${response.failedCount} failed` : ""}.`
            : `Envoyé à ${response.recipientCount} destinataire(s)${response.failedCount ? `, ${response.failedCount} échec(s)` : ""}.`,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-announcements">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-mail-layout">
        <aside className="admin-mail-sidebar">
          <button type="button" className="admin-mail-compose-btn" onClick={() => handleFolderClick("compose")}>
            <UiIcon name="mail" /> {copy.compose}
          </button>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.folders}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "audience" || activeFolder === "compose" ? "active" : ""}`}
              onClick={() => handleFolderClick("audience")}
            >
              <UiIcon name="profile" />
              <span>{copy.inbox}</span>
              <strong>{audienceCount ?? "…"}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "sent" ? "active" : ""}`}
              onClick={() => handleFolderClick("sent")}
            >
              <UiIcon name="mail" />
              <span>{copy.sent}</span>
              <strong>{history.length}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "draft" ? "active" : ""}`}
              onClick={() => handleFolderClick("draft")}
            >
              <UiIcon name="docModern" />
              <span>{copy.drafts}</span>
              <strong>{subject || message ? 1 : 0}</strong>
            </button>
            <button
              type="button"
              className={`admin-mail-folder ${activeFolder === "failed" ? "active" : ""}`}
              onClick={() => handleFolderClick("failed")}
            >
              <UiIcon name="alert" />
              <span>{copy.failed}</span>
              <strong>{failedTotal}</strong>
            </button>
          </div>

          <div className="admin-mail-card">
            <div className="admin-mail-card-title">
              <span>{copy.labels}</span>
              <strong>-</strong>
            </div>
            <button
              type="button"
              className={`admin-mail-label important ${activeLabel === "important" ? "active" : ""}`}
              onClick={() => applyLabel("important")}
            >
              {copy.important}
            </button>
            <button
              type="button"
              className={`admin-mail-label platform ${activeLabel === "platform" ? "active" : ""}`}
              onClick={() => applyLabel("platform")}
            >
              {copy.platform}
            </button>
            <button
              type="button"
              className={`admin-mail-label schools ${activeLabel === "schools" ? "active" : ""}`}
              onClick={() => applyLabel("schools")}
            >
              {copy.schools}
            </button>
          </div>
        </aside>

        <div className="admin-mail-main">
          {showMailbox ? (
            <div className="admin-mail-inbox">
              <div className="admin-mail-inbox-toolbar">
                <div className="admin-mail-inbox-actions">
                  <button type="button" title={language === "en" ? "Select" : "Sélectionner"}>
                    ?
                  </button>
                  <button type="button" title={language === "en" ? "Refresh" : "Actualiser"} onClick={loadHistory}>
                    <UiIcon name="history" />
                  </button>
                  <button type="button" title={language === "en" ? "More" : "Plus"}>
                    ?
                  </button>
                </div>
                <input
                  value={mailSearch}
                  onChange={(event) => setMailSearch(event.target.value)}
                  placeholder={language === "en" ? "Search sent announcements" : "Rechercher dans les annonces envoyées"}
                />
                <span className="admin-mail-range">
                  {visibleHistory.length ? `1-${visibleHistory.length}` : "0"} / {folderHistory.length}
                </span>
              </div>

              <div className="admin-mail-tabs">
                <button type="button" className="active">
                  <UiIcon name="mail" />
                  {language === "en" ? "Primary" : "Principal"}
                </button>
                <button type="button">
                  <UiIcon name="pricetag" />
                  {copy.platform}
                </button>
                <button type="button">
                  <UiIcon name="profile" />
                  {copy.schools}
                </button>
              </div>

              <div className="admin-mail-list">
                {visibleHistory.length ? (
                  visibleHistory.map((item) => (
                    <button type="button" key={item.id} className="admin-mail-row">
                      <span className="admin-mail-check">?</span>
                      <span className="admin-mail-star">?</span>
                      <strong>{getAudienceLabel(item.audience)}</strong>
                      <span className="admin-mail-row-subject">{item.subject}</span>
                      <span className={item.failedCount ? "admin-mail-row-failed" : "admin-mail-row-count"}>
                        {item.failedCount ? `${item.failedCount} ${copy.failed}` : `${item.recipientCount} ${copy.recipients}`}
                      </span>
                      <time>{formatDate(item.createdAt)}</time>
                    </button>
                  ))
                ) : (
                  <div className="admin-mail-empty">
                    {activeFolder === "failed"
                      ? language === "en"
                        ? "No failed send."
                        : "Aucun échec d'envoi."
                      : copy.noHistory}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form className="admin-create-form admin-announcement-form admin-mail-compose" onSubmit={handleSend}>
            <div className="admin-mail-compose-head">
              <h3>{copy.composeTitle}</h3>
              {audienceCount !== null ? (
                <span className="admin-mail-recipient-badge">
                  {audienceCount} {copy.recipients}
                </span>
              ) : null}
            </div>

            <label className="admin-mail-line">
              <span>{copy.to}</span>
              <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                {ADMIN_ANNOUNCEMENT_AUDIENCES.map((item) => (
                  <option key={item.id || "all"} value={item.id}>
                    {item.label[language] || item.label.fr}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-mail-line">
              <span>{copy.subjectLine}</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
            </label>

            <div className="admin-mail-editor-toolbar" aria-label={language === "en" ? "Formatting toolbar" : "Barre de mise en forme"}>
              <button type="button" className="admin-mail-format-select" onClick={() => insertInMessage("\n\n", "", language === "en" ? "New paragraph" : "Nouveau paragraphe")}>
                A {copy.normalText} ?
              </button>
              <button type="button" onClick={() => insertInMessage("**", "**", language === "en" ? "bold text" : "texte en gras")}>
                <strong>B</strong>
              </button>
              <button type="button" onClick={() => insertInMessage("_", "_", language === "en" ? "italic text" : "texte italique")}>
                <em>I</em>
              </button>
              <button type="button" onClick={() => insertInMessage("\n\n> ", "", language === "en" ? "Quote" : "Citation")}>
                “
              </button>
              <button type="button" onClick={() => insertInMessage("\n- ", "", language === "en" ? "List item" : "Élément de liste")}>
                ?
              </button>
              <button type="button" onClick={() => insertInMessage("\n1. ", "", language === "en" ? "First item" : "Premier élément")}>
                =
              </button>
              <button type="button" onClick={insertLink}>
                ?
              </button>
            </div>

            <textarea
              ref={messageRef}
              className="admin-mail-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={copy.messagePlaceholder}
              rows={12}
              required
            />

            <div className="admin-mail-attachment">
              <UiIcon name="upload" />
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
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={handleAttachmentChange}
              />
              <div className="admin-mail-attachment-actions">
                <button type="button" className="btn-ghost" onClick={() => attachmentInputRef.current?.click()} disabled={sending}>
                  <UiIcon name="upload" /> {copy.attachFile}
                </button>
                {attachment ? (
                  <button type="button" className="btn-ghost danger" onClick={() => setAttachment(null)} disabled={sending}>
                    {copy.removeFile}
                  </button>
                ) : null}
              </div>
            </div>

            {error ? <p className="field-error">{error}</p> : null}

            <div className="admin-mail-actions">
              <button type="button" className="btn-ghost" onClick={saveDraft} disabled={(!message && !subject) || sending}>
                <UiIcon name="docModern" /> {copy.drafts}
              </button>
              <button type="submit" className="btn-main ready" disabled={sending || !audienceCount}>
                {sending ? <span className="btn-spinner" /> : <UiIcon name="mail" />} {sending ? copy.sending : copy.send}
              </button>
            </div>
            </form>
          )}

        </div>
      </div>
    </section>
  );
}
