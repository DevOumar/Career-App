import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  getApiBase,
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
  sendSchoolInvitationsBulk,
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolInvitationsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Invitations",
          subtitle: "Invite a student by email — a license seat is reserved automatically.",
          emailLabel: "Student email",
          send: "Send invitation",
          sending: "Sending…",
          colEmail: "Email",
          colCode: "License code",
          colStatus: "Status",
          colSent: "Sent on",
          statusPending: "Pending",
          statusRedeemed: "Accepted",
          sentLabel: "Invitations",
          pendingLabel: "Pending",
          acceptedLabel: "Accepted",
          empty: "No invitation sent yet.",
          bulkTitle: "Bulk import (CSV)",
          bulkHint: "One email per line, or a CSV with an email column. Up to 500 at once.",
          bulkPlaceholder: "jane.doe@school.edu\njohn.smith@school.edu\n…",
          bulkUpload: "Upload a .csv file",
          bulkSend: "Send invitations",
          bulkSending: "Sending…",
          bulkResultTitle: "Bulk import result",
          bulkSent: (count) => `${count} invitation(s) sent`,
          bulkSkippedExisting: (count) => `${count} already have an account`,
          bulkSkippedNoSeat: (count) => `${count} skipped — no seat left`
        }
      : {
          title: "Invitations",
          subtitle: "Invitez un étudiant par email — un siège de licence est réservé automatiquement.",
          emailLabel: "Email de l'étudiant",
          send: "Envoyer l'invitation",
          sending: "Envoi…",
          colEmail: "Email",
          colCode: "Code de licence",
          colStatus: "Statut",
          colSent: "Envoyée le",
          statusPending: "En attente",
          statusRedeemed: "Acceptée",
          sentLabel: "Invitations",
          pendingLabel: "En attente",
          acceptedLabel: "Acceptées",
          empty: "Aucune invitation envoyée pour l'instant.",
          bulkTitle: "Import en masse (CSV)",
          bulkHint: "Un email par ligne, ou un CSV avec une colonne email. 500 maximum d'un coup.",
          bulkPlaceholder: "jean.dupont@ecole.fr\nmarie.martin@ecole.fr\n…",
          bulkUpload: "Charger un fichier .csv",
          bulkSend: "Envoyer les invitations",
          bulkSending: "Envoi…",
          bulkResultTitle: "Résultat de l'import",
          bulkSent: (count) => `${count} invitation(s) envoyée(s)`,
          bulkSkippedExisting: (count) => `${count} ont déjà un compte`,
          bulkSkippedNoSeat: (count) => `${count} ignoré(s) — plus de siège disponible`
        };

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileRef = useRef(null);

  function reload() {
    getSchoolInvitations(user.id)
      .then(setInvitations)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    try {
      await sendSchoolInvitation(user.id, email);
      setMessage(language === "en" ? "Invitation sent." : "Invitation envoyée.");
      setEmail("");
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  function extractEmails(text) {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    return [...new Set(matches.map((value) => value.toLowerCase()))];
  }

  async function handleBulkFile(file) {
    if (!file) return;
    const text = await file.text();
    setBulkText((current) => (current ? `${current}\n${text}` : text));
  }

  async function submitBulk() {
    const emails = extractEmails(bulkText);
    if (!emails.length) return;
    setError("");
    setBulkResult(null);
    setBulkSending(true);
    try {
      const result = await sendSchoolInvitationsBulk(user.id, emails);
      setBulkResult(result);
      setBulkText("");
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setBulkSending(false);
    }
  }

  const bulkEmailCount = extractEmails(bulkText).length;
  const pendingCount = invitations.filter((invite) => invite.status !== "redeemed").length;
  const redeemedCount = invitations.filter((invite) => invite.status === "redeemed").length;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="mail" label={copy.sentLabel} value={invitations.length} tone="primary" />
        <AdminMiniMetric icon="history" label={copy.pendingLabel} value={pendingCount} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.acceptedLabel} value={redeemedCount} tone="success" />
      </div>

      <form className="admin-inline-form" onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailLabel}
          required
        />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? <span className="btn-spinner" /> : null} {sending ? copy.sending : copy.send}
        </button>
      </form>

      {error ? <p className="field-error">{error}</p> : null}
      {message ? <p className="field-hint success">{message}</p> : null}

      <div className="admin-panel school-bulk-invite-panel">
        <h3>
          <span className="school-panel-icon">
            <UiIcon name="mail" />
          </span>
          {copy.bulkTitle}
        </h3>
        <p className="muted">{copy.bulkHint}</p>
        <textarea
          rows={5}
          value={bulkText}
          onChange={(event) => setBulkText(event.target.value)}
          placeholder={copy.bulkPlaceholder}
        />
        <div className="school-bulk-invite-actions">
          <input
            ref={bulkFileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(event) => handleBulkFile(event.target.files?.[0])}
          />
          <button type="button" className="btn-ghost" onClick={() => bulkFileRef.current?.click()}>
            <UiIcon name="download" /> {copy.bulkUpload}
          </button>
          <button
            type="button"
            className="btn-main ready"
            disabled={bulkSending || !bulkEmailCount}
            onClick={submitBulk}
          >
            {bulkSending ? <span className="btn-spinner" /> : null}
            {bulkSending ? copy.bulkSending : `${copy.bulkSend} (${bulkEmailCount})`}
          </button>
        </div>
        {bulkResult ? (
          <div className="school-bulk-invite-result">
            <strong>{copy.bulkResultTitle}</strong>
            <ul>
              <li className="success">{copy.bulkSent(bulkResult.sent?.length || 0)}</li>
              {bulkResult.skippedExisting?.length ? <li className="muted">{copy.bulkSkippedExisting(bulkResult.skippedExisting.length)}</li> : null}
              {bulkResult.skippedNoSeat?.length ? <li className="warning">{copy.bulkSkippedNoSeat(bulkResult.skippedNoSeat.length)}</li> : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colEmail}</th>
              <th>{copy.colCode}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colSent}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length ? (
              invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td className="admin-license-code">{invite.licenseCode}</td>
                  <td>
                    <span className={`tag ${invite.status === "redeemed" ? "tag-success" : ""}`}>
                      {invite.status === "redeemed" ? copy.statusRedeemed : copy.statusPending}
                    </span>
                  </td>
                  <td className="muted">{formatDate(invite.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
