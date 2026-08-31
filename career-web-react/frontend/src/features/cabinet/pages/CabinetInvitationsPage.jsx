import React from "react";
import { useState, useEffect, useRef } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetInvitations, sendCabinetInvitation, sendCabinetInvitationsBulk } from "../../../lib/inMemoryDb.js";
import { CabinetEmptyState } from "./CabinetEmptyState.jsx";

export default function CabinetInvitationsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Invitations",
          subtitle: "Invite a recruiter by email — a license seat is reserved automatically.",
          emailLabel: "Recruiter email",
          send: "Send invitation",
          sending: "Sending…",
          colEmail: "Email",
          colStatus: "Status",
          colSent: "Sent on",
          statusPending: "Pending",
          statusRedeemed: "Accepted",
          empty: "No invitation sent yet.",
          emptyHint: "Invite your first recruiter above.",
          bulkTitle: "Bulk import (CSV)",
          bulkHint: "One email per line, or a CSV with an email column.",
          bulkPlaceholder: "jane.doe@firm.com\njohn.smith@firm.com\n…",
          bulkUpload: "Upload a .csv file",
          bulkSend: "Send invitations",
          bulkResult: (n) => `${n} invitation(s) sent`
        }
      : {
          title: "Invitations",
          subtitle: "Invitez un recruteur par email — un siège de licence est réservé automatiquement.",
          emailLabel: "Email du recruteur",
          send: "Envoyer l'invitation",
          sending: "Envoi…",
          colEmail: "Email",
          colStatus: "Statut",
          colSent: "Envoyée le",
          statusPending: "En attente",
          statusRedeemed: "Acceptée",
          empty: "Aucune invitation envoyée pour l'instant.",
          emptyHint: "Invitez votre premier recruteur ci-dessus.",
          bulkTitle: "Import en masse (CSV)",
          bulkHint: "Un email par ligne, ou un CSV avec une colonne email.",
          bulkPlaceholder: "jean.dupont@cabinet.fr\nmarie.martin@cabinet.fr\n…",
          bulkUpload: "Charger un fichier .csv",
          bulkSend: "Envoyer les invitations",
          bulkResult: (n) => `${n} invitation(s) envoyée(s)`
        };

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileRef = useRef(null);

  function reload() {
    getCabinetInvitations(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      await sendCabinetInvitation(user.id, email);
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
    setBulkSending(true);
    setBulkResult(null);
    try {
      const result = await sendCabinetInvitationsBulk(user.id, emails);
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

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="mail" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <form className="card block application-form" onSubmit={submit}>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.emailLabel} />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? copy.sending : copy.send}
        </button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}

      <div className="card block">
        <h3>{copy.bulkTitle}</h3>
        <p className="muted">{copy.bulkHint}</p>
        <textarea rows={5} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={copy.bulkPlaceholder} />
        <div className="cabinet-quick-actions">
          <input ref={bulkFileRef} type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={(event) => handleBulkFile(event.target.files?.[0])} />
          <button type="button" className="btn-secondary" onClick={() => bulkFileRef.current?.click()}>
            <UiIcon name="download" /> {copy.bulkUpload}
          </button>
          <button type="button" className="btn-main ready" disabled={bulkSending || !bulkEmailCount} onClick={submitBulk}>
            {bulkSending ? copy.sending : `${copy.bulkSend} (${bulkEmailCount})`}
          </button>
        </div>
        {bulkResult ? <p className="field-hint success">{copy.bulkResult(bulkResult.sent?.length || 0)}</p> : null}
      </div>

      {items.length ? (
        <div className="history-list">
          {items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <span className="history-card-icon">
                    <UiIcon name="mail" />
                  </span>
                  <div>
                    <h3>{item.email}</h3>
                    <p>{copy.colSent} {formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <span className={`tag ${item.status === "redeemed" ? "tag-success" : ""}`}>
                  {item.status === "redeemed" ? copy.statusRedeemed : copy.statusPending}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <CabinetEmptyState icon="mail" title={copy.empty} hint={copy.emptyHint} />
      )}
    </section>
  );
}
