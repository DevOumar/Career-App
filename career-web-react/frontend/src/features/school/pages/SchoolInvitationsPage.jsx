import React, { useEffect, useRef, useState } from "react";
// Espace École › Invitations : inviter des étudiants (une adresse ou import en
// masse), suivre les invitations et les sièges de licence disponibles.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getSchoolInvitations, getSchoolOverview, sendSchoolInvitation, sendSchoolInvitationsBulk } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, AdminPagination, JyDrawer, ADMIN_PAGE_SIZE } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BULK = 500;

function extractEmails(text) {
  const matches = String(text || "").match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(matches.map((value) => value.toLowerCase()))];
}

export default function SchoolInvitationsPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [invitations, setInvitations] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [mode, setMode] = useState("single");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [sending, setSending] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  function reload() {
    getSchoolInvitations(user.id)
      .then(setInvitations)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch(() => {});
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => setPage(1), [query, status]);

  function toast(title) {
    import("sweetalert2").then(({ default: Swal }) =>
      Swal.fire({ toast: true, position: "top-end", icon: "success", title, showConfirmButton: false, timer: 2400, customClass: { popup: "career-toast", title: "career-toast-title" } })
    );
  }

  function openInvite(nextMode = "single") {
    setMode(nextMode);
    setEmail("");
    setEmailTouched(false);
    setBulkText("");
    setBulkResult(null);
    setDialogError("");
    setInviteOpen(true);
  }

  const seatsLeft = overview ? Math.max(0, Number(overview.seatsTotal || 0) - Number(overview.seatsUsed || 0)) : null;
  const emailError = !email.trim() ? t("Saisissez une adresse e-mail.", "Enter an email address.") : !EMAIL_PATTERN.test(email.trim()) ? t("Adresse e-mail invalide.", "Invalid email address.") : "";
  const alreadyInvited = invitations?.some((invite) => invite.email.toLowerCase() === email.trim().toLowerCase());
  const bulkEmails = extractEmails(bulkText);
  const bulkTooMany = bulkEmails.length > MAX_BULK;

  async function submitSingle() {
    setEmailTouched(true);
    if (emailError) return;
    setSending(true);
    setDialogError("");
    try {
      await sendSchoolInvitation(user.id, email.trim());
      setInviteOpen(false);
      reload();
      toast(t("Invitation envoyée.", "Invitation sent."));
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  async function submitBulk() {
    if (!bulkEmails.length || bulkTooMany) return;
    setSending(true);
    setDialogError("");
    setBulkResult(null);
    try {
      const result = await sendSchoolInvitationsBulk(user.id, bulkEmails);
      setBulkResult(result);
      setBulkText("");
      reload();
    } catch (err) {
      setDialogError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  async function readFile(file) {
    if (!file) return;
    const text = await file.text();
    setBulkText((current) => (current ? `${current}\n${text}` : text));
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!invitations) return <AdminPageLoader language={language} />;

  const isAccepted = (invite) => invite.status === "redeemed";
  const accepted = invitations.filter(isAccepted).length;
  const pending = invitations.length - accepted;
  const acceptance = invitations.length ? Math.round((accepted / invitations.length) * 100) : 0;
  const statusLabel = (invite) => (isAccepted(invite) ? t("Acceptée", "Accepted") : t("En attente", "Pending"));

  const term = query.trim().toLowerCase();
  const filtered = invitations
    .filter((invite) => status === "all" || (status === "accepted" ? isAccepted(invite) : !isAccepted(invite)))
    .filter((invite) => !term || invite.email.toLowerCase().includes(term) || String(invite.licenseCode || "").toLowerCase().includes(term))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const cards = [
    { icon: "send", label: t("Invitations envoyées", "Invitations sent"), value: invitations.length, tone: "" },
    { icon: "clock", label: t("En attente", "Pending"), value: pending, tone: pending ? "gold" : "" },
    { icon: "quality", label: t("Acceptées", "Accepted"), value: accepted, tone: "green" },
    { icon: "trend", label: t("Taux d'acceptation", "Acceptance rate"), value: `${acceptance} %`, tone: "green" },
    { icon: "seat", label: t("Sièges disponibles", "Seats available"), value: seatsLeft ?? "-", tone: seatsLeft === 0 ? "danger" : "" }
  ];

  const exportColumns = [
    { key: "email", label: "E-mail", exportValue: (invite) => invite.email },
    { key: "code", label: t("Code de licence", "License code"), exportValue: (invite) => invite.licenseCode || "" },
    { key: "status", label: t("Statut", "Status"), exportValue: statusLabel },
    { key: "sent", label: t("Envoyée le", "Sent on"), exportValue: (invite) => formatDateTime(invite.createdAt, language) },
    { key: "accepted", label: t("Acceptée le", "Accepted on"), exportValue: (invite) => (invite.redeemedAt ? formatDateTime(invite.redeemedAt, language) : "") }
  ];

  return (
    <section className="admin-accounts jy-invitations">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Invitations", "Invitations")}</h2>
          <p>{t("Invitez vos étudiants par e-mail : un siège de votre licence leur est réservé automatiquement.", "Invite your students by email: a seat on your license is reserved automatically.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-outline" onClick={() => openInvite("bulk")}>
            <AdminLineIcon name="upload" />
            {t("Import en masse", "Bulk import")}
          </button>
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => openInvite("single")}>
            <AdminLineIcon name="plus" />
            {t("Inviter un étudiant", "Invite a student")}
          </button>
        </div>
      </header>

      <div className="jy-mini-cards jy-mini-cards-5">
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

      {overview ? (
        <div className={`jy-seat-banner ${seatsLeft === 0 ? "is-full" : ""}`}>
          <span className="jy-seat-banner-icon">
            <AdminLineIcon name="licenses" />
          </span>
          <span className="jy-seat-banner-text">
            <strong>
              {overview.seatsUsed} / {overview.seatsTotal} {t("sièges utilisés", "seats used")}
            </strong>
            <small>
              {seatsLeft === 0
                ? t("Licence complète : les nouvelles invitations seront refusées. Contactez Career CV pour ajouter des sièges.", "License full: new invitations will be refused. Contact Career CV to add seats.")
                : t(`${seatsLeft} siège(s) encore disponible(s) pour de nouveaux étudiants.`, `${seatsLeft} seat(s) still available for new students.`)}
            </small>
          </span>
          <span className="jy-seat-banner-bar">
            <span style={{ width: `${overview.seatsTotal ? Math.min(100, (overview.seatsUsed / overview.seatsTotal) * 100) : 0}%` }} />
          </span>
        </div>
      ) : null}

      <div className="admin-table-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher un e-mail ou un code…", "Search an email or a code…")} />
        <div className="jy-seg jy-seg-counts">
          {[
            { id: "all", label: t("Toutes", "All"), count: invitations.length },
            { id: "pending", label: t("En attente", "Pending"), count: pending },
            { id: "accepted", label: t("Acceptées", "Accepted"), count: accepted }
          ].map((item) => (
            <button key={item.id} type="button" className={status === item.id ? "active" : ""} onClick={() => setStatus(item.id)}>
              {item.label}
              <span>({item.count})</span>
            </button>
          ))}
        </div>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Invitations", "Invitations")} fileBase="invitations" columns={exportColumns} rows={filtered} />
        </div>
      </div>

      {invitations.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Étudiant invité", "Invited student")}</th>
                  <th>{t("Code de licence", "License code")}</th>
                  <th>{t("Statut", "Status")}</th>
                  <th>{t("Envoyée le", "Sent on")}</th>
                  <th>{t("Acceptée le", "Accepted on")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((invite) => (
                    <tr key={invite.id} className={`jy-row-click ${selected?.id === invite.id ? "is-selected" : ""}`} onClick={() => setSelected(invite)}>
                      <td>
                        <div className="admin-table-name">
                          <span className={`jy-invite-avatar ${isAccepted(invite) ? "on" : ""}`}>
                            <AdminLineIcon name={isAccepted(invite) ? "quality" : "send"} />
                          </span>
                          <strong>{invite.email}</strong>
                        </div>
                      </td>
                      <td>
                        <code className="admin-license-code">{invite.licenseCode}</code>
                      </td>
                      <td>
                        <span className={`jy-dot-status ${isAccepted(invite) ? "on" : "pending"}`}>{statusLabel(invite)}</span>
                      </td>
                      <td className="muted jy-nowrap">{formatDateTime(invite.createdAt, language)}</td>
                      <td className="muted jy-nowrap">{invite.redeemedAt ? formatDateTime(invite.redeemedAt, language) : t("Pas encore", "Not yet")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="admin-table-empty muted">
                      {t("Aucune invitation ne correspond.", "No invitation matches.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filtered.length} />
        </>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="send" />
          </span>
          <strong>{t("Aucune invitation envoyée pour l'instant", "No invitation sent yet")}</strong>
          <span>{t("Invitez vos étudiants un par un, ou toute une classe d'un coup avec l'import en masse.", "Invite students one by one, or a whole class at once with bulk import.")}</span>
          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => openInvite("single")}>
            <AdminLineIcon name="plus" />
            {t("Inviter un étudiant", "Invite a student")}
          </button>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={
          selected ? (
            <span className={`jy-invite-avatar large ${isAccepted(selected) ? "on" : ""}`}>
              <AdminLineIcon name={isAccepted(selected) ? "quality" : "send"} />
            </span>
          ) : null
        }
        title={selected?.email || ""}
        subtitle={t("Invitation étudiant", "Student invitation")}
        badges={selected ? <span className={`tag ${isAccepted(selected) ? "tag-success" : "tag-warning"}`}>{statusLabel(selected)}</span> : null}
        sections={
          selected
            ? [
                {
                  title: t("Suivi", "Tracking"),
                  rows: [
                    [t("Envoyée le", "Sent on"), formatDateTime(selected.createdAt, language)],
                    [t("Acceptée le", "Accepted on"), selected.redeemedAt ? formatDateTime(selected.redeemedAt, language) : t("Pas encore", "Not yet")],
                    [t("Code de licence", "License code"), selected.licenseCode || ""]
                  ]
                },
                {
                  title: t("Comment ça marche", "How it works"),
                  content: (
                    <p className="jy-drawer-empty">
                      {isAccepted(selected)
                        ? t("L'étudiant a créé son compte avec ce code : il apparaît dans le module Étudiants.", "The student created their account with this code: they appear in the Students module.")
                        : t("L'étudiant a reçu un e-mail avec le code de licence. Dès qu'il crée son compte avec ce code, il est rattaché à votre établissement.", "The student received an email with the license code. As soon as they sign up with it, they're linked to your institution.")}
                    </p>
                  )
                }
              ]
            : []
        }
      />

      <MfaDialog
        open={inviteOpen}
        onClose={() => !sending && setInviteOpen(false)}
        icon="send"
        title={t("Inviter des étudiants", "Invite students")}
        description={
          seatsLeft != null
            ? t(`${seatsLeft} siège(s) disponible(s) sur votre licence.`, `${seatsLeft} seat(s) available on your license.`)
            : t("Un siège de licence est réservé pour chaque invitation.", "A license seat is reserved for each invitation.")
        }
        width={560}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setInviteOpen(false)} disabled={sending}>
              {bulkResult ? t("Fermer", "Close") : t("Annuler", "Cancel")}
            </button>
            {mode === "single" ? (
              <button type="button" className="mfa-btn primary" onClick={submitSingle} disabled={sending}>
                {sending ? <span className="mfa-spinner" /> : null}
                {t("Envoyer l'invitation", "Send invitation")}
              </button>
            ) : (
              <button type="button" className="mfa-btn primary" onClick={submitBulk} disabled={sending || !bulkEmails.length || bulkTooMany}>
                {sending ? <span className="mfa-spinner" /> : null}
                {t(`Envoyer ${bulkEmails.length} invitation(s)`, `Send ${bulkEmails.length} invitation(s)`)}
              </button>
            )}
          </>
        }
      >
        <div className="mfa-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "single"} className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
            {t("Une adresse", "One address")}
          </button>
          <button type="button" role="tab" aria-selected={mode === "bulk"} className={mode === "bulk" ? "active" : ""} onClick={() => setMode("bulk")}>
            {t("Import en masse", "Bulk import")}
          </button>
        </div>
        <MfaError message={dialogError} />

        {mode === "single" ? (
          <label className={`mfa-field ${emailTouched && emailError ? "has-error" : ""}`}>
            <span>{t("E-mail de l'étudiant", "Student email")}</span>
            <input
              type="email"
              autoFocus
              value={email}
              placeholder="prenom.nom@ecole.fr"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSingle();
              }}
            />
            {emailTouched && emailError ? (
              <small className="jy-field-error">{emailError}</small>
            ) : alreadyInvited ? (
              <small className="jy-field-warn">{t("Cette adresse a déjà reçu une invitation.", "This address was already invited.")}</small>
            ) : (
              <small>{t("L'étudiant reçoit un e-mail avec le code de licence de votre établissement.", "The student receives an email with your institution's license code.")}</small>
            )}
          </label>
        ) : bulkResult ? (
          <div className="jy-bulk-result">
            <div className="jy-bulk-stat ok">
              <strong>{bulkResult.sent?.length || 0}</strong>
              <span>{t("invitation(s) envoyée(s)", "invitation(s) sent")}</span>
            </div>
            <div className="jy-bulk-stat">
              <strong>{bulkResult.skippedExisting?.length || 0}</strong>
              <span>{t("déjà inscrit(s)", "already registered")}</span>
            </div>
            <div className="jy-bulk-stat">
              <strong>{bulkResult.skippedPending?.length || 0}</strong>
              <span>{t("déjà invité(s), non renvoyé(s)", "already invited, not resent")}</span>
            </div>
            <div className="jy-bulk-stat warn">
              <strong>{bulkResult.skippedNoSeat?.length || 0}</strong>
              <span>{t("ignorée(s) : plus de siège", "skipped: no seat left")}</span>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`jy-dropzone ${dragOver ? "is-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                readFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <AdminLineIcon name="upload" />
              <strong>{t("Déposez un fichier .csv ou cliquez pour le choisir", "Drop a .csv file or click to choose one")}</strong>
              <small>{t("Une colonne « email », ou une adresse par ligne.", "An “email” column, or one address per line.")}</small>
              <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(event) => readFile(event.target.files?.[0])} />
            </div>
            <label className="mfa-field">
              <span>{t("Ou collez les adresses", "Or paste the addresses")}</span>
              <textarea rows={5} value={bulkText} placeholder={"jean.dupont@ecole.fr\nmarie.martin@ecole.fr"} onChange={(event) => setBulkText(event.target.value)} className="jy-textarea" />
              <small className={bulkTooMany ? "jy-field-error" : ""}>
                {bulkTooMany
                  ? t(`${bulkEmails.length} adresses : 500 maximum par envoi.`, `${bulkEmails.length} addresses: 500 max per send.`)
                  : t(`${bulkEmails.length} adresse(s) valide(s) détectée(s), sans doublon.`, `${bulkEmails.length} valid address(es) detected, no duplicates.`)}
              </small>
            </label>
            {bulkEmails.length ? (
              <div className="jy-chip-cloud">
                {bulkEmails.slice(0, 8).map((value) => (
                  <span key={value} className="jy-chip small">
                    {value}
                  </span>
                ))}
                {bulkEmails.length > 8 ? <span className="jy-chip small">+{bulkEmails.length - 8}</span> : null}
              </div>
            ) : null}
            {seatsLeft != null && bulkEmails.length > seatsLeft ? (
              <div className="jy-callout">
                <AdminLineIcon name="alert" />
                <span>
                  {t(
                    `Seuls ${seatsLeft} siège(s) restent : les adresses au-delà seront ignorées.`,
                    `Only ${seatsLeft} seat(s) left: extra addresses will be skipped.`
                  )}
                </span>
              </div>
            ) : null}
          </>
        )}
      </MfaDialog>
    </section>
  );
}
