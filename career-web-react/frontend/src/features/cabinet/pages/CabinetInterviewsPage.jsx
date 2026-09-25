import React, { useEffect, useState } from "react";
// Espace Cabinet › Entretiens : agenda des entretiens planifiés avec les
// candidats (par jour), compte rendu, statut et export vers un agenda (.ics).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import {
  createCabinetInterview,
  deleteCabinetInterview,
  getCabinetCandidates,
  getCabinetInterviews,
  getCabinetMissions,
  updateCabinetInterview
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { StatusPill, candidateName, useConfirm } from "./cabinetUi.jsx";

export const INTERVIEW_MODES = {
  visio: { fr: "Visioconférence", en: "Video call", icon: "send" },
  phone: { fr: "Téléphone", en: "Phone", icon: "phone" },
  onsite: { fr: "Sur place", en: "On site", icon: "cabinets" }
};
export const INTERVIEW_STATUS = {
  planned: { fr: "Planifié", en: "Planned", tone: "blue" },
  done: { fr: "Réalisé", en: "Done", tone: "green" },
  cancelled: { fr: "Annulé", en: "Cancelled", tone: "neutral" },
  no_show: { fr: "Absent", en: "No-show", tone: "danger" }
};
const lang = (language) => (language === "en" ? "en" : "fr");

// Valeur pour <input type="datetime-local"> dans le fuseau du navigateur.
function toLocalInput(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

// Fichier .ics standard (importable dans Google Agenda, Outlook, Apple).
export function downloadInterviewIcs(interview, language) {
  const stamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(interview.scheduledAt);
  const end = new Date(start.getTime() + Number(interview.durationMinutes || 60) * 60000);
  const escape = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const name = `${interview.candidateFirstName || ""} ${interview.candidateLastName || ""}`.trim();
  const title = language === "en" ? `Interview · ${name}` : `Entretien · ${name}`;
  const description = [interview.missionTitle ? `${language === "en" ? "Mission" : "Mission"} : ${interview.missionTitle}` : "", interview.clientName ? `Client : ${interview.clientName}` : "", interview.notes || ""]
    .filter(Boolean)
    .join("\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career CV//Cabinet//FR",
    "BEGIN:VEVENT",
    `UID:${interview.id}@career-cv`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    interview.location ? `LOCATION:${escape(interview.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `entretien-${name.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "candidat"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Planifier / modifier un entretien (réutilisé depuis la fiche candidat).
export function InterviewFormDialog({ language, userId, interview = null, presetCandidate = null, presetMissionId = "", candidates, missions, onClose, onSaved }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const defaultStart = () => {
    const date = new Date(Date.now() + 24 * 3600000);
    date.setMinutes(0, 0, 0);
    date.setHours(10);
    return toLocalInput(date.toISOString());
  };
  const [form, setForm] = useState(() => ({
    candidateId: interview?.candidateId || presetCandidate?.id || "",
    missionId: interview?.missionId || presetMissionId || "",
    scheduledAt: interview ? toLocalInput(interview.scheduledAt) : defaultStart(),
    durationMinutes: String(interview?.durationMinutes || 60),
    mode: interview?.mode || "visio",
    location: interview?.location || "",
    interviewer: interview?.interviewer || "",
    notes: interview?.notes || ""
  }));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const candidateError = !form.candidateId ? t("Choisissez un candidat.", "Pick a candidate.") : "";
  const dateError = !form.scheduledAt ? t("Indiquez la date et l'heure.", "Enter date and time.") : "";
  const durationError = !(Number(form.durationMinutes) >= 10 && Number(form.durationMinutes) <= 480) ? t("Entre 10 et 480 minutes.", "Between 10 and 480 minutes.") : "";
  const pool = (candidates || []).filter((item) => !item.anonymizedAt);

  async function submit(event) {
    event?.preventDefault();
    setTouched(true);
    if (candidateError || dateError || durationError) return;
    setSaving(true);
    setError("");
    const payload = { ...form, scheduledAt: new Date(form.scheduledAt).toISOString(), durationMinutes: Number(form.durationMinutes) };
    try {
      if (interview) await updateCabinetInterview(userId, interview.id, payload);
      else await createCabinetInterview(userId, payload);
      await onSaved?.();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MfaDialog
      open
      onClose={() => !saving && onClose()}
      icon={interview ? "edit" : "plus"}
      title={interview ? t("Modifier l'entretien", "Edit interview") : t("Planifier un entretien", "Schedule an interview")}
      description={t("Le candidat passe automatiquement à l'étape « En entretien ».", "The candidate automatically moves to the “Interviewing” stage.")}
      width={600}
      footer={
        <>
          <button type="button" className="mfa-btn ghost" onClick={onClose} disabled={saving}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="button" className="mfa-btn primary" onClick={submit} disabled={saving}>
            {saving ? <span className="mfa-spinner" /> : null}
            {interview ? t("Enregistrer", "Save") : t("Planifier", "Schedule")}
          </button>
        </>
      }
    >
      <MfaError message={error} />
      <form className="jy-promo-form" onSubmit={submit} noValidate>
        <label className={`mfa-field wide ${touched && candidateError ? "has-error" : ""}`}>
          <span>{t("Candidat", "Candidate")} *</span>
          <select value={form.candidateId} disabled={Boolean(interview || presetCandidate)} onChange={(event) => update("candidateId", event.target.value)}>
            <option value="">{t("Choisir un candidat…", "Choose a candidate…")}</option>
            {(presetCandidate && !pool.some((item) => item.id === presetCandidate.id) ? [presetCandidate, ...pool] : pool).map((item) => (
              <option key={item.id} value={item.id}>
                {candidateName(item)}
                {item.headline ? ` · ${item.headline}` : ""}
              </option>
            ))}
          </select>
          {touched && candidateError ? <small className="jy-field-error">{candidateError}</small> : null}
        </label>
        <label className="mfa-field wide">
          <span>{t("Mission (facultatif)", "Mission (optional)")}</span>
          <select value={form.missionId} onChange={(event) => update("missionId", event.target.value)}>
            <option value="">{t("Aucune mission", "No mission")}</option>
            {(missions || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.clientName ? ` · ${item.clientName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={`mfa-field ${touched && dateError ? "has-error" : ""}`}>
          <span>{t("Date et heure", "Date and time")} *</span>
          <input type="datetime-local" value={form.scheduledAt} onChange={(event) => update("scheduledAt", event.target.value)} />
          {touched && dateError ? <small className="jy-field-error">{dateError}</small> : null}
        </label>
        <label className={`mfa-field ${touched && durationError ? "has-error" : ""}`}>
          <span>{t("Durée (minutes)", "Duration (minutes)")}</span>
          <input type="number" min="10" max="480" step="5" inputMode="numeric" value={form.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value.replace(/[^0-9]/g, ""))} />
          {touched && durationError ? <small className="jy-field-error">{durationError}</small> : null}
        </label>
        <label className="mfa-field">
          <span>{t("Format", "Format")}</span>
          <select value={form.mode} onChange={(event) => update("mode", event.target.value)}>
            {Object.entries(INTERVIEW_MODES).map(([key, value]) => (
              <option key={key} value={key}>
                {value[lang(language)]}
              </option>
            ))}
          </select>
        </label>
        <label className="mfa-field">
          <span>{form.mode === "onsite" ? t("Adresse", "Address") : form.mode === "phone" ? t("Numéro à appeler", "Number to call") : t("Lien de visio", "Video link")}</span>
          <input value={form.location} maxLength={300} placeholder={form.mode === "visio" ? "https://meet…" : ""} onChange={(event) => update("location", event.target.value)} />
        </label>
        <label className="mfa-field wide">
          <span>{t("Recruteur(s) présent(s)", "Interviewer(s)")}</span>
          <input value={form.interviewer} maxLength={160} onChange={(event) => update("interviewer", event.target.value)} />
        </label>
        <label className="mfa-field wide">
          <span>{t("Notes de préparation", "Preparation notes")}</span>
          <textarea rows={3} className="jy-textarea" maxLength={3000} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
        </label>
      </form>
    </MfaDialog>
  );
}

export default function CabinetInterviewsPage({ user, language, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [missions, setMissions] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [formState, setFormState] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState("");
  const [confirm, confirmDialog] = useConfirm(language);

  function reload() {
    return getCabinetInterviews(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetCandidates(user.id, {})
      .then((data) => setCandidates(data.items || []))
      .catch(() => setCandidates([]));
    getCabinetMissions(user.id)
      .then(setMissions)
      .catch(() => setMissions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const selected = items?.find((item) => item.id === selectedId) || null;
  useEffect(() => setFeedback(selected?.feedback || ""), [selectedId, selected?.feedback]);

  async function setStatus(item, status, extra = {}) {
    setBusy(status);
    try {
      await updateCabinetInterview(user.id, item.id, { status, ...extra });
      await reload();
      cabinetToast({ title: t("Entretien mis à jour.", "Interview updated.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy("");
    }
  }

  async function remove(item) {
    const ok = await confirm({
      title: t("Supprimer cet entretien ?", "Delete this interview?"),
      description: `${candidateName({ firstName: item.candidateFirstName, lastName: item.candidateLastName })} · ${formatDateTime(item.scheduledAt, language)}`,
      confirmLabel: t("Supprimer", "Delete")
    });
    if (!ok) return;
    try {
      await deleteCabinetInterview(user.id, item.id);
      setSelectedId("");
      await reload();
      cabinetToast({ title: t("Entretien supprimé.", "Interview deleted.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  if (error && !items) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const now = Date.now();
  const time = (item) => new Date(item.scheduledAt).getTime();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = startOfDay.getTime() + 86400000;
  const monthStart = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1).getTime();
  const upcoming = items.filter((item) => item.status === "planned" && time(item) >= startOfDay.getTime());
  const needle = search.trim().toLowerCase();
  const matches = (item) => !needle || `${item.candidateFirstName} ${item.candidateLastName} ${item.missionTitle} ${item.clientName} ${item.interviewer}`.toLowerCase().includes(needle);
  const visible = (view === "upcoming" ? upcoming.sort((a, b) => time(a) - time(b)) : view === "past" ? items.filter((item) => !upcoming.includes(item)) : items).filter(matches);

  const cards = [
    { icon: "calendar", label: t("Aujourd'hui", "Today"), value: upcoming.filter((item) => time(item) < endOfDay).length, tone: "gold" },
    { icon: "clock", label: t("À venir (7 jours)", "Upcoming (7 days)"), value: upcoming.filter((item) => time(item) < now + 7 * 86400000).length, tone: "" },
    { icon: "quality", label: t("Réalisés ce mois-ci", "Done this month"), value: items.filter((item) => item.status === "done" && time(item) >= monthStart).length, tone: "green" },
    {
      icon: "alert",
      label: t("Taux d'absence", "No-show rate"),
      value: (() => {
        const closed = items.filter((item) => item.status === "done" || item.status === "no_show");
        return closed.length ? `${Math.round((items.filter((item) => item.status === "no_show").length / closed.length) * 100)} %` : "-";
      })(),
      tone: ""
    }
  ];

  // Regroupement par jour pour l'affichage agenda.
  const dayKey = (item) => new Date(item.scheduledAt).toDateString();
  const groups = [];
  for (const item of visible) {
    const key = dayKey(item);
    const group = groups.find((entry) => entry.key === key);
    if (group) group.items.push(item);
    else groups.push({ key, date: new Date(item.scheduledAt), items: [item] });
  }
  const dayLabel = (date) => {
    const diff = Math.round((new Date(date).setHours(0, 0, 0, 0) - startOfDay.getTime()) / 86400000);
    const formatted = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
    if (diff === 0) return `${t("Aujourd'hui", "Today")} · ${formatted}`;
    if (diff === 1) return `${t("Demain", "Tomorrow")} · ${formatted}`;
    return formatted;
  };
  const hour = (value) => new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const person = (item) => ({ firstName: item.candidateFirstName, lastName: item.candidateLastName, email: item.candidateEmail });

  const exportColumns = [
    { key: "date", label: t("Date", "Date"), exportValue: (item) => formatDateTime(item.scheduledAt, language) },
    { key: "candidate", label: t("Candidat", "Candidate"), exportValue: (item) => candidateName(person(item)) },
    { key: "mission", label: t("Mission", "Mission"), exportValue: (item) => item.missionTitle || "" },
    { key: "client", label: t("Client", "Client"), exportValue: (item) => item.clientName || "" },
    { key: "mode", label: t("Format", "Format"), exportValue: (item) => INTERVIEW_MODES[item.mode]?.[lang(language)] || item.mode },
    { key: "duration", label: t("Durée (min)", "Duration (min)"), exportValue: (item) => item.durationMinutes },
    { key: "interviewer", label: t("Recruteur", "Interviewer"), exportValue: (item) => item.interviewer || "" },
    { key: "status", label: t("Statut", "Status"), exportValue: (item) => INTERVIEW_STATUS[item.status]?.[lang(language)] || item.status },
    { key: "feedback", label: t("Compte rendu", "Feedback"), exportValue: (item) => item.feedback || "" }
  ];

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Entretiens", "Interviews")}</h2>
          <p>{t("L'agenda des entretiens avec vos candidats, leurs comptes rendus et leur suivi.", "The schedule of interviews with your candidates, their feedback and follow-up.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => setFormState({})}>
            <AdminLineIcon name="plus" />
            {t("Planifier un entretien", "Schedule an interview")}
          </button>
        </div>
      </header>

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher un candidat, une mission, un recruteur…", "Search a candidate, a mission, a recruiter…")} />
        <div className="jy-seg jy-seg-counts">
          {[
            { id: "upcoming", label: t("À venir", "Upcoming"), n: upcoming.length },
            { id: "past", label: t("Passés et clos", "Past and closed"), n: items.length - upcoming.length },
            { id: "all", label: t("Tous", "All"), n: items.length }
          ].map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              {item.label}
              <span>({item.n})</span>
            </button>
          ))}
        </div>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Entretiens", "Interviews")} fileBase="entretiens" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {groups.length ? (
        <div className="jy-agenda">
          {groups.map((group) => (
            <div key={group.key} className="jy-agenda-day">
              <p className="jy-agenda-date">{dayLabel(group.date)}</p>
              {group.items.map((item) => {
                const status = INTERVIEW_STATUS[item.status] || INTERVIEW_STATUS.planned;
                return (
                  <button type="button" key={item.id} className={`jy-agenda-item ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                    <span className="jy-agenda-time">
                      <strong>{hour(item.scheduledAt)}</strong>
                      <small>{item.durationMinutes} min</small>
                    </span>
                    <AvatarCircle user={person(item)} />
                    <span className="jy-agenda-text">
                      <strong>{candidateName(person(item))}</strong>
                      <small>{[item.missionTitle, item.clientName].filter(Boolean).join(" · ") || t("Sans mission", "No mission")}</small>
                    </span>
                    <span className="jy-agenda-mode">
                      <AdminLineIcon name={INTERVIEW_MODES[item.mode]?.icon || "calendar"} />
                      {INTERVIEW_MODES[item.mode]?.[lang(language)]}
                    </span>
                    <StatusPill tone={status.tone}>{status[lang(language)]}</StatusPill>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="calendar" />
          </span>
          <strong>{view === "upcoming" ? t("Aucun entretien à venir", "No upcoming interview") : t("Aucun entretien", "No interview")}</strong>
          <span>{t("Planifiez un entretien depuis cette page ou depuis la fiche d'un candidat.", "Schedule an interview from this page or from a candidate's profile.")}</span>
          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => setFormState({})}>
            <AdminLineIcon name="plus" />
            {t("Planifier un entretien", "Schedule an interview")}
          </button>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={selected ? <AvatarCircle user={person(selected)} /> : null}
        title={selected ? candidateName(person(selected)) : ""}
        subtitle={selected ? `${formatDateTime(selected.scheduledAt, language)} · ${selected.durationMinutes} min` : ""}
        badges={selected ? <StatusPill tone={(INTERVIEW_STATUS[selected.status] || INTERVIEW_STATUS.planned).tone}>{(INTERVIEW_STATUS[selected.status] || INTERVIEW_STATUS.planned)[lang(language)]}</StatusPill> : null}
        sections={
          selected
            ? [
                {
                  title: t("Entretien", "Interview"),
                  rows: [
                    [t("Format", "Format"), INTERVIEW_MODES[selected.mode]?.[lang(language)] || selected.mode],
                    [selected.mode === "onsite" ? t("Adresse", "Address") : selected.mode === "phone" ? t("Téléphone", "Phone") : t("Lien", "Link"), selected.location],
                    [t("Recruteur(s)", "Interviewer(s)"), selected.interviewer],
                    [t("Mission", "Mission"), selected.missionTitle],
                    [t("Client", "Client"), selected.clientName],
                    ["E-mail", selected.candidateEmail]
                  ]
                },
                selected.notes ? { title: t("Préparation", "Preparation"), content: <p className="jy-drawer-text">{selected.notes}</p> } : null,
                {
                  title: t("Compte rendu", "Feedback"),
                  content: (
                    <div className="jy-notes">
                      <textarea className="jy-textarea jy-drawer-textarea" rows={4} maxLength={3000} value={feedback} placeholder={t("Impressions, points forts, points de vigilance, suite à donner…", "Impressions, strengths, concerns, next steps…")} onChange={(event) => setFeedback(event.target.value)} />
                      <div className="jy-drawer-inline-actions">
                        <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" disabled={busy !== "" || feedback === (selected.feedback || "")} onClick={() => setStatus(selected, selected.status, { feedback })}>
                          {t("Enregistrer le compte rendu", "Save feedback")}
                        </button>
                        {selected.status === "planned" ? (
                          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" disabled={busy !== ""} onClick={() => setStatus(selected, "done", { feedback })}>
                            <AdminLineIcon name="quality" />
                            {t("Marquer comme réalisé", "Mark as done")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                }
              ].filter(Boolean)
            : []
        }
        footer={
          selected ? (
            <>
              <button type="button" className="jy-btn jy-btn-outline" onClick={() => downloadInterviewIcs(selected, language)}>
                <AdminLineIcon name="calendar" />
                {t("Ajouter à mon agenda", "Add to my calendar")}
              </button>
              <button type="button" className="jy-btn jy-btn-outline" onClick={() => setFormState({ interview: selected })}>
                <AdminLineIcon name="edit" />
                {t("Modifier", "Edit")}
              </button>
              {selected.status === "planned" ? (
                <>
                  <button type="button" className="jy-btn jy-btn-outline" disabled={busy !== ""} onClick={() => setStatus(selected, "no_show")}>
                    {t("Absent", "No-show")}
                  </button>
                  <button type="button" className="jy-btn jy-btn-outline" disabled={busy !== ""} onClick={() => setStatus(selected, "cancelled")}>
                    {t("Annuler l'entretien", "Cancel interview")}
                  </button>
                </>
              ) : null}
              <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
                <AdminLineIcon name="trash" />
                {t("Supprimer", "Delete")}
              </button>
            </>
          ) : null
        }
      />

      {formState ? (
        <InterviewFormDialog
          language={language}
          userId={user.id}
          interview={formState.interview || null}
          candidates={candidates}
          missions={missions}
          onClose={() => setFormState(null)}
          onSaved={async () => {
            setFormState(null);
            await reload();
            cabinetToast({ title: t("Entretien enregistré.", "Interview saved.") });
          }}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
