import React from "react";
// Module École : annonces — diffuser un message par email à tous les
// étudiants rattachés à la licence, ou seulement à une promotion. Même
// principe que les annonces Admin (AdminAnnouncementsPage), mais l'audience
// est toujours "mes étudiants" — pas de sélecteur d'audience plateforme.
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { formatDate } from "../../../lib/format.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getSchoolAnnouncements, sendSchoolAnnouncement, getSchoolPromotions } from "../../../lib/inMemoryDb.js";

export default function SchoolAnnouncementsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Announcements",
          subtitle: "Send an email to all your students, or just one promotion.",
          subjectLabel: "Subject",
          messageLabel: "Message",
          promotionLabel: "Recipients",
          allStudents: "All students",
          send: "Send announcement",
          sending: "Sending…",
          history: "Sent announcements",
          empty: "No announcement sent yet.",
          recipients: (n) => `${n} recipient(s)`,
          failed: (n) => `${n} failed`
        }
      : {
          title: "Annonces",
          subtitle: "Envoyez un email à tous vos étudiants, ou seulement à une promotion.",
          subjectLabel: "Objet",
          messageLabel: "Message",
          promotionLabel: "Destinataires",
          allStudents: "Tous les étudiants",
          send: "Envoyer l'annonce",
          sending: "Envoi…",
          history: "Annonces envoyées",
          empty: "Aucune annonce envoyée pour l'instant.",
          recipients: (n) => `${n} destinataire(s)`,
          failed: (n) => `${n} échec(s)`
        };

  const [items, setItems] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function reload() {
    getSchoolAnnouncements(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getSchoolPromotions(user.id).then((data) => setPromotions(data.items || [])).catch(() => setPromotions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const result = await sendSchoolAnnouncement(user.id, { subject, message, promotionId });
      setSubject("");
      setMessage("");
      setPromotionId("");
      reload();
      Swal.fire({
        icon: "success",
        title: language === "en" ? "Announcement sent." : "Annonce envoyée.",
        text: `${copy.recipients(result.recipientCount)}${result.failedCount ? ` · ${copy.failed(result.failedCount)}` : ""}`,
        timer: 2400,
        showConfirmButton: false
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  if (!items) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-accounts school-announcements">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <form className="school-announcement-form" onSubmit={submit}>
        <input
          required
          minLength={2}
          maxLength={140}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={copy.subjectLabel}
        />
        <textarea
          required
          minLength={2}
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={copy.messageLabel}
        />
        <div className="school-announcement-actions">
          <select value={promotionId} onChange={(event) => setPromotionId(event.target.value)}>
            <option value="">{copy.allStudents}</option>
            {promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>{promo.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-main ready" disabled={sending}>
            {sending ? <span className="btn-spinner" /> : <UiIcon name="mail" />}
            {sending ? copy.sending : copy.send}
          </button>
        </div>
      </form>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-panel school-insight-panel">
        <h3>{copy.history}</h3>
        {items.length ? (
          <div className="school-report-list">
            {items.map((item) => (
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.subject}</strong>
                  <span className="muted">{formatDate(item.createdAt)}</span>
                </div>
                <span className="tag">{copy.recipients(item.recipientCount)}</span>
                {item.failedCount ? <span className="tag tag-danger">{copy.failed(item.failedCount)}</span> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.empty}</p>
        )}
      </div>
    </section>
  );
}
