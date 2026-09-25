import React from "react";
// Module École : événements — dates clés partagées en interne (forums,
// deadlines de candidature, ateliers). Volontairement simple : une liste
// triée par date, pas de vue calendrier graphique.
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getSchoolEvents, createSchoolEvent, deleteSchoolEvent } from "../../../lib/inMemoryDb.js";
import { SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolEventsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Events",
          subtitle: "Key dates for your students: job fairs, deadlines, workshops.",
          titleLabel: "Event title",
          dateLabel: "Date",
          descriptionLabel: "Description (optional)",
          create: "Add event",
          empty: "No event scheduled yet.",
          emptyHint: "Add a date so your students know what's coming up.",
          delete: "Delete",
          past: "Past",
          upcoming: "Upcoming"
        }
      : {
          title: "Événements",
          subtitle: "Dates clés pour vos étudiants : forums emploi, deadlines, ateliers.",
          titleLabel: "Titre de l'événement",
          dateLabel: "Date",
          descriptionLabel: "Description (optionnel)",
          create: "Ajouter l'événement",
          empty: "Aucun événement programmé pour le moment.",
          emptyHint: "Ajoutez une date pour informer vos étudiants de ce qui arrive.",
          delete: "Supprimer",
          past: "Passé",
          upcoming: "À venir"
        };

  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ title: "", eventDate: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reload() {
    getSchoolEvents(user.id).then(setItems).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createSchoolEvent(user.id, form);
      setForm({ title: "", eventDate: "", description: "" });
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this event?" : "Supprimer cet événement ?",
      text: item.title,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    await deleteSchoolEvent(user.id, item.id);
    reload();
  }

  if (!items) return <AdminPageLoader language={language} />;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section className="school-promotions">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <form className="school-settings-form school-promotion-form" onSubmit={submit}>
        <input
          required
          minLength={2}
          maxLength={120}
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder={copy.titleLabel}
        />
        <input
          required
          type="date"
          value={form.eventDate}
          onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
          title={copy.dateLabel}
        />
        <input
          maxLength={240}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder={copy.descriptionLabel}
        />
        <button className="btn-main ready" disabled={saving}>
          {saving ? <span className="btn-spinner" /> : null} {copy.create}
        </button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}

      <div className="school-card-grid">
        {items.length ? (
          items.map((item) => {
            const isPast = item.eventDate < todayIso;
            return (
              <article key={item.id} className="school-data-card">
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatDate(item.eventDate)}</span>
                </div>
                {item.description ? <p className="muted">{item.description}</p> : null}
                <span className={`tag ${isPast ? "" : "tag-success"}`}>{isPast ? copy.past : copy.upcoming}</span>
                <button type="button" className="admin-row-action danger" onClick={() => remove(item)}>
                  <UiIcon name="trash" /> {copy.delete}
                </button>
              </article>
            );
          })
        ) : (
          <SchoolEmptyState icon="history" title={copy.empty} hint={copy.emptyHint} />
        )}
      </div>
    </section>
  );
}
