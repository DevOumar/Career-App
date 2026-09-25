import React, { useEffect, useState } from "react";
// Espace Cabinet › Clients : fiches des entreprises clientes (contact,
// secteur, missions, placements, montants facturés et encaissés).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { createCabinetClient, deleteCabinetClient, getCabinetClients, updateCabinetClient } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { MISSION_STATUS_TONES, StatusPill, compactMoney, missionStatusLabel, useConfirm } from "./cabinetUi.jsx";

const EMPTY = { name: "", sector: "", website: "", contactName: "", contactEmail: "", contactPhone: "", address: "", notes: "" };
const initials = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "C";

export default function CabinetClientsPage({ user, language, currency, isCabinetOwner = true, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [serverField, setServerField] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, confirmDialog] = useConfirm(language);

  function reload() {
    return getCabinetClients(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function openForm(item = null) {
    setEditingId(item?.id || "");
    setForm(item ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, item[key] || ""])) } : EMPTY);
    setTouched(false);
    setFormError("");
    setServerField("");
    setFormOpen(true);
  }

  const update = (key, value) => {
    if (key === "contactPhone") value = value.replace(/[^0-9+ ]/g, "").replace(/(?!^)\+/g, "");
    setForm((prev) => ({ ...prev, [key]: value }));
    if (serverField === key) setServerField("");
  };
  const errors = {
    name: form.name.trim().length < 2 ? t("Au moins 2 caractères.", "At least 2 characters.") : "",
    contactEmail: form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.contactEmail) ? t("Adresse e-mail invalide.", "Invalid email.") : "",
    contactPhone: form.contactPhone && !/^\+?[0-9 ]{6,20}$/.test(form.contactPhone) ? t("6 à 20 chiffres.", "6 to 20 digits.") : "",
    website: form.website && !/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(form.website) ? t("Adresse de site invalide.", "Invalid website.") : ""
  };
  const fieldError = (key) => (touched && errors[key]) || (serverField === key ? formError : "");

  async function submit(event) {
    event?.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    setFormError("");
    try {
      if (editingId) await updateCabinetClient(user.id, editingId, form);
      else {
        const result = await createCabinetClient(user.id, form);
        if (result?.id) setSelectedId(result.id);
      }
      setFormOpen(false);
      await reload();
      cabinetToast({ title: editingId ? t("Client mis à jour.", "Client updated.") : t("Client ajouté.", "Client added.") });
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, language));
      if (String(err.code || "").startsWith("field:")) setServerField(err.code.slice(6));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const ok = await confirm({ title: t("Supprimer ce client ?", "Delete this client?"), description: item.name, confirmLabel: t("Supprimer", "Delete") });
    if (!ok) return;
    try {
      await deleteCabinetClient(user.id, item.id);
      setSelectedId("");
      await reload();
      cabinetToast({ title: t("Client supprimé.", "Client deleted.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  if (error && !items) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const needle = search.trim().toLowerCase();
  const visible = items.filter((item) => !needle || `${item.name} ${item.sector} ${item.contactName} ${item.contactEmail}`.toLowerCase().includes(needle));
  const selected = items.find((item) => item.id === selectedId) || null;
  const money = (value) => compactMoney(value, language, currency);
  const totals = items.reduce((acc, item) => ({ open: acc.open + item.openMissionCount, placed: acc.placed + item.placedCount, paid: acc.paid + item.paidTtc }), { open: 0, placed: 0, paid: 0 });
  const activeClients = items.filter((item) => item.openMissionCount > 0).length;

  const cards = [
    { icon: "cabinets", label: t("Clients", "Clients"), value: items.length, tone: "" },
    { icon: "briefcase", label: t("Clients avec mission en cours", "Clients with an active mission"), value: activeClients, tone: "green" },
    { icon: "quality", label: t("Placements réalisés", "Placements made"), value: totals.placed, tone: "gold" },
    ...(isCabinetOwner ? [{ icon: "finance", label: t("Encaissé (TTC)", "Collected (incl. VAT)"), value: money(totals.paid), tone: "green" }] : [])
  ];

  const exportColumns = [
    { key: "name", label: t("Client", "Client"), exportValue: (item) => item.name },
    { key: "sector", label: t("Secteur", "Sector"), exportValue: (item) => item.sector },
    { key: "contact", label: t("Contact", "Contact"), exportValue: (item) => item.contactName },
    { key: "email", label: "E-mail", exportValue: (item) => item.contactEmail },
    { key: "phone", label: t("Téléphone", "Phone"), exportValue: (item) => item.contactPhone },
    { key: "missions", label: t("Missions", "Missions"), exportValue: (item) => item.missionCount },
    { key: "open", label: t("En cours", "Active"), exportValue: (item) => item.openMissionCount },
    { key: "placed", label: t("Placés", "Placed"), exportValue: (item) => item.placedCount },
    ...(isCabinetOwner
      ? [
          { key: "invoiced", label: t("Facturé TTC (€)", "Invoiced incl. VAT (€)"), exportValue: (item) => item.invoicedTtc },
          { key: "paid", label: t("Encaissé TTC (€)", "Collected incl. VAT (€)"), exportValue: (item) => item.paidTtc }
        ]
      : [])
  ];

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Clients", "Clients")}</h2>
          <p>{t("Les entreprises pour lesquelles votre cabinet recrute, leurs contacts et leurs missions.", "The companies your firm recruits for, their contacts and missions.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => openForm()}>
            <AdminLineIcon name="plus" />
            {t("Nouveau client", "New client")}
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
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher un client, un secteur, un contact…", "Search a client, a sector, a contact…")} />
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Clients", "Clients")} fileBase="clients" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Client", "Client")}</th>
                <th>{t("Contact", "Contact")}</th>
                <th>{t("Missions", "Missions")}</th>
                <th>{t("Placés", "Placed")}</th>
                {isCabinetOwner ? <th>{t("Facturé / encaissé (TTC)", "Invoiced / collected (incl. VAT)")}</th> : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => (
                  <tr key={item.id} className={`jy-row-click ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                    <td>
                      <div className="admin-table-name">
                        <span className="jy-promo-badge">{initials(item.name)}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <span className="muted">{item.sector || t("Secteur non renseigné", "No sector")}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.contactName || item.contactEmail ? (
                        <div className="jy-cell-stack">
                          <strong>{item.contactName || "-"}</strong>
                          <span className="muted">{item.contactEmail || item.contactPhone}</span>
                        </div>
                      ) : (
                        <span className="muted">{t("À compléter", "To fill in")}</span>
                      )}
                    </td>
                    <td className="jy-nowrap">
                      <strong>{item.missionCount}</strong> <span className="muted">· {item.openMissionCount} {t("en cours", "active")}</span>
                    </td>
                    <td>{item.placedCount}</td>
                    {isCabinetOwner ? (
                      <td className="jy-nowrap">
                        {money(item.invoicedTtc)} <span className="muted">/ {money(item.paidTtc)}</span>
                      </td>
                    ) : null}
                    <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                      <button type="button" className="admin-row-action icon-only" title={t("Modifier", "Edit")} aria-label={t("Modifier", "Edit")} onClick={() => openForm(item)}>
                        <AdminLineIcon name="edit" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isCabinetOwner ? 6 : 5} className="admin-table-empty muted">
                    {t("Aucun client ne correspond.", "No client matches.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="cabinets" />
          </span>
          <strong>{t("Aucun client pour le moment", "No client yet")}</strong>
          <span>{t("Ajoutez vos clients, ou choisissez-en un en créant une mission.", "Add your clients, or pick one when creating a mission.")}</span>
          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => openForm()}>
            <AdminLineIcon name="plus" />
            {t("Nouveau client", "New client")}
          </button>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={selected ? <span className="jy-promo-badge large">{initials(selected.name)}</span> : null}
        title={selected?.name || ""}
        subtitle={selected?.sector || ""}
        sections={
          selected
            ? [
                {
                  title: t("Contact", "Contact"),
                  rows: [
                    [t("Interlocuteur", "Contact person"), selected.contactName],
                    ["E-mail", selected.contactEmail],
                    [t("Téléphone", "Phone"), selected.contactPhone],
                    [t("Site web", "Website"), selected.website],
                    [t("Adresse", "Address"), selected.address]
                  ]
                },
                {
                  title: t("Activité", "Activity"),
                  rows: [
                    [t("Missions", "Missions"), `${selected.missionCount} (${selected.openMissionCount} ${t("en cours", "active")})`],
                    [t("Candidats placés", "Candidates placed"), String(selected.placedCount)],
                    [t("Honoraires saisis sur les missions", "Fees entered on missions"), money(selected.feesRecorded)],
                    ...(isCabinetOwner
                      ? [
                          [t("Facturé (TTC)", "Invoiced (incl. VAT)"), money(selected.invoicedTtc)],
                          [t("Encaissé (TTC)", "Collected (incl. VAT)"), money(selected.paidTtc)]
                        ]
                      : []),
                    [t("Client depuis", "Client since"), formatDateTime(selected.createdAt, language)]
                  ]
                },
                {
                  title: t("Missions", "Missions"),
                  content: selected.missions.length ? (
                    <ul className="jy-mission-people">
                      {selected.missions.map((mission) => (
                        <li key={mission.id}>
                          <span className="jy-mission-person">
                            <strong>{mission.title}</strong>
                            <small>{formatDateTime(mission.createdAt, language)}</small>
                          </span>
                          <StatusPill tone={MISSION_STATUS_TONES[mission.status]}>{missionStatusLabel(mission.status, language)}</StatusPill>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="jy-drawer-empty">{t("Aucune mission pour ce client.", "No mission for this client.")}</p>
                  )
                },
                selected.notes ? { title: t("Notes", "Notes"), content: <p className="jy-drawer-text">{selected.notes}</p> } : null
              ].filter(Boolean)
            : []
        }
        footer={
          selected ? (
            <>
              {onGoToTab ? (
                <button type="button" className="jy-btn jy-btn-outline" onClick={() => onGoToTab("missions")}>
                  <AdminLineIcon name="briefcase" />
                  {t("Missions", "Missions")}
                </button>
              ) : null}
              <button type="button" className="jy-btn jy-btn-outline" onClick={() => openForm(selected)}>
                <AdminLineIcon name="edit" />
                {t("Modifier", "Edit")}
              </button>
              <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
                <AdminLineIcon name="trash" />
                {t("Supprimer", "Delete")}
              </button>
            </>
          ) : null
        }
      />

      <MfaDialog
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        icon={editingId ? "edit" : "plus"}
        title={editingId ? t("Modifier le client", "Edit client") : t("Nouveau client", "New client")}
        description={t("L'entreprise pour laquelle vous recrutez, et votre interlocuteur chez elle.", "The company you recruit for, and your contact there.")}
        width={600}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={submit} disabled={saving}>
              {saving ? <span className="mfa-spinner" /> : null}
              {t("Enregistrer", "Save")}
            </button>
          </>
        }
      >
        <MfaError message={serverField ? "" : formError} />
        <form className="jy-promo-form" onSubmit={submit} noValidate>
          <label className={`mfa-field ${fieldError("name") ? "has-error" : ""}`}>
            <span>{t("Nom de l'entreprise", "Company name")} *</span>
            <input autoFocus maxLength={160} value={form.name} onChange={(event) => update("name", event.target.value)} />
            {fieldError("name") ? <small className="jy-field-error">{fieldError("name")}</small> : null}
          </label>
          <label className="mfa-field">
            <span>{t("Secteur", "Sector")}</span>
            <input maxLength={120} value={form.sector} placeholder={t("Ex. Banque, Retail, Industrie", "e.g. Banking, Retail")} onChange={(event) => update("sector", event.target.value)} />
          </label>
          <label className="mfa-field">
            <span>{t("Interlocuteur", "Contact person")}</span>
            <input maxLength={120} value={form.contactName} onChange={(event) => update("contactName", event.target.value)} />
          </label>
          <label className={`mfa-field ${fieldError("contactEmail") ? "has-error" : ""}`}>
            <span>{t("E-mail du contact", "Contact email")}</span>
            <input type="email" maxLength={160} value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} />
            {fieldError("contactEmail") ? <small className="jy-field-error">{fieldError("contactEmail")}</small> : null}
          </label>
          <label className={`mfa-field ${fieldError("contactPhone") ? "has-error" : ""}`}>
            <span>{t("Téléphone", "Phone")}</span>
            <input inputMode="tel" maxLength={20} value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} />
            {fieldError("contactPhone") ? <small className="jy-field-error">{fieldError("contactPhone")}</small> : null}
          </label>
          <label className={`mfa-field ${fieldError("website") ? "has-error" : ""}`}>
            <span>{t("Site web", "Website")}</span>
            <input maxLength={200} value={form.website} onChange={(event) => update("website", event.target.value)} />
            {fieldError("website") ? <small className="jy-field-error">{fieldError("website")}</small> : null}
          </label>
          <label className="mfa-field wide">
            <span>{t("Adresse de facturation", "Billing address")}</span>
            <input maxLength={300} value={form.address} onChange={(event) => update("address", event.target.value)} />
          </label>
          <label className="mfa-field wide">
            <span>{t("Notes", "Notes")}</span>
            <textarea rows={3} className="jy-textarea" maxLength={3000} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </form>
      </MfaDialog>
      {confirmDialog}
    </section>
  );
}
