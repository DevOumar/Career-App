import React from "react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getCabinetAnnouncements, sendCabinetAnnouncement } from "../../../lib/inMemoryDb.js";

export default function CabinetAnnouncementsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Announcements",
          subtitle: "Send an email to every recruiter linked to your license.",
          subjectLabel: "Subject",
          messageLabel: "Message",
          send: "Send announcement",
          sending: "Sending…",
          empty: "No announcement sent yet.",
          recipients: (n) => `${n} recipient(s)`
        }
      : {
          title: "Annonces",
          subtitle: "Envoyez un email à tous les recruteurs rattachés à votre licence.",
          subjectLabel: "Objet",
          messageLabel: "Message",
          send: "Envoyer l'annonce",
          sending: "Envoi…",
          empty: "Aucune annonce envoyée pour l'instant.",
          recipients: (n) => `${n} destinataire(s)`
        };

  const [items, setItems] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function reload() {
    getCabinetAnnouncements(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
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
      const result = await sendCabinetAnnouncement(user.id, { subject, message });
      setSubject("");
      setMessage("");
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Announcement sent." : "Annonce envoyée.", text: copy.recipients(result.recipientCount), timer: 2200, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="cv-history-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="chat" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <form className="card block" onSubmit={submit}>
        <input required minLength={2} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={copy.subjectLabel} />
        <textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.messageLabel} />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? copy.sending : copy.send}
        </button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}

      {items?.length ? (
        <div className="history-list">
          {items.map((item) => (
            <article className="history-card" key={item.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <div>
                    <h3>{item.subject}</h3>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                </div>
                <span className="tag">{copy.recipients(item.recipientCount)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">{copy.empty}</p>
      )}
    </section>
  );
}
