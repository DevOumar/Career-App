import React, { useEffect, useState } from "react";
// Espace Cabinet › Factures clients : factures d'honoraires de placement
// (brouillon → émise → payée / annulée), numérotation continue et version
// imprimable / PDF avec les mentions obligatoires.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { createCabinetInvoice, deleteCabinetInvoice, getCabinetClients, getCabinetInvoices, getCabinetMissions, updateCabinetInvoice } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { StatusPill, useConfirm } from "./cabinetUi.jsx";

const STATUS = {
  draft: { fr: "Brouillon", en: "Draft", tone: "neutral" },
  sent: { fr: "Émise", en: "Issued", tone: "blue" },
  paid: { fr: "Payée", en: "Paid", tone: "green" },
  cancelled: { fr: "Annulée", en: "Cancelled", tone: "danger" }
};
const VAT_RATES = [20, 10, 5.5, 0];
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export default function CabinetInvoicesPage({ user, language, currency = "EUR", onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const lang = language === "en" ? "en" : "fr";
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [missions, setMissions] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(null);
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [confirm, confirmDialog] = useConfirm(language);

  const money = (value, digits = 2) =>
    new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: currency || "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
  const day = (value) => (value ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "-");

  function reload() {
    return getCabinetInvoices(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    getCabinetClients(user.id)
      .then(setClients)
      .catch(() => setClients([]));
    getCabinetMissions(user.id)
      .then(setMissions)
      .catch(() => setMissions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  function openForm(item = null, preset = {}) {
    const today = new Date();
    const due = new Date(today.getTime() + 30 * 86400000);
    setEditingId(item?.id || "");
    setForm(
      item
        ? { clientId: item.clientId, missionId: item.missionId, label: item.label, amountHt: String(item.amountHt), vatRate: String(item.vatRate), issuedAt: dateInput(item.issuedAt), dueAt: dateInput(item.dueAt) }
        : { clientId: "", missionId: "", label: "", amountHt: "", vatRate: "20", issuedAt: dateInput(today), dueAt: dateInput(due), ...preset }
    );
    setTouched(false);
    setFormError("");
    setFormOpen(true);
  }

  function pickMission(missionId) {
    const mission = missions.find((item) => item.id === missionId);
    setForm((prev) => ({
      ...prev,
      missionId,
      clientId: mission?.clientId || prev.clientId,
      label: prev.label || (mission ? t(`Honoraires de recrutement · ${mission.title}`, `Recruitment fees · ${mission.title}`) : ""),
      amountHt: prev.amountHt || (mission?.placementAmount != null ? String(mission.placementAmount) : "")
    }));
  }

  const errors = form
    ? {
        clientId: !form.clientId ? t("Choisissez le client facturé.", "Pick the billed client.") : "",
        label: form.label.trim().length < 2 ? t("Indiquez l'objet de la facture.", "Enter the invoice subject.") : "",
        amountHt: !(Number(form.amountHt) > 0) ? t("Montant HT supérieur à 0.", "Amount must be above 0.") : "",
        dueAt: form.issuedAt && form.dueAt && form.dueAt < form.issuedAt ? t("L'échéance doit suivre la date d'émission.", "Due date must follow the issue date.") : ""
      }
    : {};

  async function submit(nextStatus) {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    setFormError("");
    const payload = { ...form, amountHt: Number(form.amountHt), vatRate: Number(form.vatRate) };
    try {
      if (editingId) {
        await updateCabinetInvoice(user.id, editingId, payload);
        if (nextStatus === "sent") await updateCabinetInvoice(user.id, editingId, { status: "sent" });
      } else {
        const result = await createCabinetInvoice(user.id, { ...payload, status: nextStatus });
        if (result?.id) setSelectedId(result.id);
      }
      setFormOpen(false);
      await reload();
      cabinetToast({ title: nextStatus === "sent" ? t("Facture émise.", "Invoice issued.") : t("Brouillon enregistré.", "Draft saved.") });
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, nextStatus) {
    if (nextStatus === "cancelled") {
      const ok = await confirm({
        title: t("Annuler cette facture ?", "Cancel this invoice?"),
        description: `${item.number} · ${item.clientName}`,
        detail: t("Une facture émise n'est jamais supprimée : elle reste dans la numérotation avec le statut « Annulée ». Émettez ensuite un avoir si nécessaire.", "An issued invoice is never deleted: it stays in the sequence as “Cancelled”."),
        confirmLabel: t("Annuler la facture", "Cancel invoice")
      });
      if (!ok) return;
    }
    setBusy(nextStatus);
    try {
      await updateCabinetInvoice(user.id, item.id, { status: nextStatus });
      await reload();
      cabinetToast({ title: t("Facture mise à jour.", "Invoice updated.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy("");
    }
  }

  async function removeDraft(item) {
    const ok = await confirm({ title: t("Supprimer ce brouillon ?", "Delete this draft?"), description: `${item.number} · ${item.clientName}`, confirmLabel: t("Supprimer", "Delete") });
    if (!ok) return;
    try {
      await deleteCabinetInvoice(user.id, item.id);
      setSelectedId("");
      await reload();
      cabinetToast({ title: t("Brouillon supprimé.", "Draft deleted.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  // Facture imprimable / PDF avec les mentions obligatoires.
  function printInvoice(item) {
    const issuer = data?.issuer || {};
    const client = clients.find((entry) => entry.id === item.clientId) || {};
    const lines = [issuer.address, [issuer.city, issuer.country].filter(Boolean).join(", ")].filter(Boolean);
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(item.number)}</title>
<style>
@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:#1c211d;font-size:12px}
header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #b83309}
.issuer strong{font-size:16px}.issuer img{max-height:48px;margin-bottom:8px}.muted{color:#6d7269}
h1{margin:0;font-family:Georgia,serif;font-size:24px;text-align:right}.meta{text-align:right;line-height:1.6}
.parties{display:flex;justify-content:flex-end;margin:22px 0}.client{min-width:45%;padding:12px 14px;border:1px solid #e7e4dc;border-radius:8px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#f3f1ec;text-align:left;padding:8px;font-size:11px}td{padding:10px 8px;border-bottom:1px solid #ece8df}
.num{text-align:right;white-space:nowrap}.totals{margin-left:auto;width:45%;margin-top:14px}.totals td{padding:6px 8px}.totals tr:last-child td{font-weight:700;font-size:14px;border-top:2px solid #1c211d}
.status{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;font-weight:700;font-size:11px;background:#eef6f1;color:#257148}
footer{margin-top:34px;padding-top:12px;border-top:1px solid #e7e4dc;color:#6d7269;font-size:10px;line-height:1.6}
</style></head><body>
<header><div class="issuer">${issuer.logoDataUrl ? `<img src="${esc(issuer.logoDataUrl)}" alt="">` : ""}<br><strong>${esc(issuer.legalName || issuer.organizationName || "")}</strong><br>
${lines.map((line) => `${esc(line)}<br>`).join("")}${issuer.siret ? `SIRET : ${esc(issuer.siret)}<br>` : ""}${issuer.vatNumber ? `TVA intracommunautaire : ${esc(issuer.vatNumber)}<br>` : ""}${issuer.contactEmail ? `${esc(issuer.contactEmail)}<br>` : ""}${issuer.contactPhone ? esc(issuer.contactPhone) : ""}</div>
<div><h1>Facture</h1><div class="meta">N° <strong>${esc(item.number)}</strong><br>Date d'émission : ${esc(day(item.issuedAt))}<br>Échéance : ${esc(day(item.dueAt))}${item.status === "paid" ? `<br><span class="status">Payée le ${esc(day(item.paidAt))}</span>` : ""}${item.status === "cancelled" ? `<br><span class="status" style="background:#fdecea;color:#b3261e">Annulée</span>` : ""}</div></div></header>
<div class="parties"><div class="client"><span class="muted">Facturé à</span><br><strong>${esc(item.clientName)}</strong><br>${client.contactName ? `À l'attention de ${esc(client.contactName)}<br>` : ""}${client.address ? `${esc(client.address)}<br>` : ""}${client.contactEmail ? esc(client.contactEmail) : ""}</div></div>
<table><thead><tr><th>Désignation</th><th class="num">Montant HT</th></tr></thead><tbody><tr><td>${esc(item.label)}${item.missionTitle ? `<br><span class="muted">Mission : ${esc(item.missionTitle)}</span>` : ""}</td><td class="num">${esc(money(item.amountHt))}</td></tr></tbody></table>
<table class="totals"><tr><td>Total HT</td><td class="num">${esc(money(item.amountHt))}</td></tr><tr><td>TVA (${esc(String(item.vatRate).replace(".", ","))} %)</td><td class="num">${esc(money(item.vatAmount))}</td></tr><tr><td>Total TTC</td><td class="num">${esc(money(item.amountTtc))}</td></tr></table>
${Number(item.vatRate) === 0 ? `<p class="muted">TVA non applicable, article 293 B du CGI.</p>` : ""}
<footer>Paiement à réception, au plus tard le ${esc(day(item.dueAt))}. En cas de retard de paiement, des pénalités calculées au taux d'intérêt légal majoré de 10 points seront exigibles, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L441-10 et D441-5 du Code de commerce). Pas d'escompte pour paiement anticipé.${issuer.invoiceFooter ? `<br>${esc(issuer.invoiceFooter)}` : ""}</footer>
<script>window.onload=function(){window.focus();window.print();};</script></body></html>`;
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
      cabinetToast({ title: t("Autorisez les fenêtres pop-up pour imprimer la facture.", "Allow pop-ups to print the invoice."), icon: "info" });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  if (error && !data) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const items = data.items || [];
  const issuer = data.issuer || {};
  const legalMissing = !issuer.siret || !(issuer.legalName || issuer.organizationName) || !issuer.address;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const inMonth = (value) => value && new Date(value).getTime() >= monthStart;
  const issued = items.filter((item) => item.status === "sent" || item.status === "paid");
  const sumHt = (list) => list.reduce((sum, item) => sum + item.amountHt, 0);
  const sumTtc = (list) => list.reduce((sum, item) => sum + item.amountTtc, 0);
  const overdue = items.filter((item) => item.overdue);
  const cards = [
    { icon: "fileText", label: t("Facturé ce mois-ci (HT)", "Invoiced this month (excl. VAT)"), value: money(sumHt(issued.filter((item) => inMonth(item.issuedAt))), 0), tone: "" },
    { icon: "finance", label: t("Encaissé ce mois-ci (TTC)", "Collected this month (incl. VAT)"), value: money(sumTtc(items.filter((item) => item.status === "paid" && inMonth(item.paidAt))), 0), tone: "green" },
    { icon: "clock", label: t("En attente de paiement (TTC)", "Awaiting payment (incl. VAT)"), value: money(sumTtc(items.filter((item) => item.status === "sent")), 0), tone: "gold" },
    { icon: "alert", label: t("Factures en retard", "Overdue invoices"), value: overdue.length, tone: overdue.length ? "danger" : "" }
  ];

  const statusOf = (item) => (item.overdue ? { fr: "En retard", en: "Overdue", tone: "danger" } : STATUS[item.status] || STATUS.draft);
  const needle = search.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (status === "all" || (status === "overdue" ? item.overdue : item.status === status)) &&
      (!needle || `${item.number} ${item.clientName} ${item.label} ${item.missionTitle}`.toLowerCase().includes(needle))
  );
  const selected = items.find((item) => item.id === selectedId) || null;
  const closedMissionsToBill = missions.filter((mission) => mission.status === "closed" && mission.placementAmount > 0 && !items.some((item) => item.missionId === mission.id && item.status !== "cancelled"));

  const exportColumns = [
    { key: "number", label: t("Numéro", "Number"), exportValue: (item) => item.number },
    { key: "client", label: t("Client", "Client"), exportValue: (item) => item.clientName },
    { key: "label", label: t("Objet", "Subject"), exportValue: (item) => item.label },
    { key: "issued", label: t("Émise le", "Issued on"), exportValue: (item) => (item.issuedAt ? day(item.issuedAt) : "") },
    { key: "due", label: t("Échéance", "Due date"), exportValue: (item) => (item.dueAt ? day(item.dueAt) : "") },
    { key: "ht", label: t("Montant HT (€)", "Amount excl. VAT (€)"), exportValue: (item) => item.amountHt },
    { key: "vat", label: t("TVA (€)", "VAT (€)"), exportValue: (item) => item.vatAmount },
    { key: "ttc", label: t("Montant TTC (€)", "Amount incl. VAT (€)"), exportValue: (item) => item.amountTtc },
    { key: "status", label: t("Statut", "Status"), exportValue: (item) => statusOf(item)[lang] },
    { key: "paid", label: t("Payée le", "Paid on"), exportValue: (item) => (item.paidAt ? day(item.paidAt) : "") }
  ];

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Factures clients", "Client invoices")}</h2>
          <p>{t("Vos factures d'honoraires de placement, de l'émission à l'encaissement.", "Your placement fee invoices, from issuing to payment.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={() => openForm()}>
            <AdminLineIcon name="plus" />
            {t("Nouvelle facture", "New invoice")}
          </button>
        </div>
      </header>

      {legalMissing ? (
        <div className="jy-callout">
          <AdminLineIcon name="alert" />
          <span>
            {t("Complétez la raison sociale, l'adresse et le SIRET de votre cabinet pour que vos factures portent les mentions obligatoires.", "Fill in your firm's legal name, address and SIRET so invoices carry the mandatory mentions.")}{" "}
            {onGoToTab ? (
              <button type="button" className="jy-link" onClick={() => onGoToTab("settings")}>
                {t("Paramètres du cabinet", "Firm settings")}
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

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

      {closedMissionsToBill.length ? (
        <div className="jy-card jy-to-bill">
          <div className="jy-card-head">
            <div>
              <h3>{t("Missions clôturées à facturer", "Closed missions to invoice")}</h3>
              <p className="jy-card-sub">{t("Des honoraires sont saisis sur ces missions, sans facture émise.", "Fees are entered on these missions, with no invoice issued.")}</p>
            </div>
          </div>
          <ul className="jy-mission-people">
            {closedMissionsToBill.map((mission) => (
              <li key={mission.id}>
                <span className="jy-mission-person">
                  <strong>{mission.title}</strong>
                  <small>
                    {mission.clientName || t("Client non renseigné", "No client")} · {money(mission.placementAmount, 0)} HT
                  </small>
                </span>
                <button
                  type="button"
                  className="jy-btn jy-btn-outline jy-btn-sm"
                  onClick={() =>
                    openForm(null, {
                      missionId: mission.id,
                      clientId: mission.clientId || "",
                      label: t(`Honoraires de recrutement · ${mission.title}`, `Recruitment fees · ${mission.title}`),
                      amountHt: String(mission.placementAmount)
                    })
                  }
                >
                  <AdminLineIcon name="fileText" />
                  {t("Facturer", "Invoice")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher un numéro, un client, une mission…", "Search a number, a client, a mission…")} />
        <div className="jy-seg jy-seg-counts">
          {[
            { id: "all", label: t("Toutes", "All"), n: items.length },
            { id: "draft", label: t("Brouillons", "Drafts"), n: items.filter((item) => item.status === "draft").length },
            { id: "sent", label: t("Émises", "Issued"), n: items.filter((item) => item.status === "sent").length },
            { id: "overdue", label: t("En retard", "Overdue"), n: overdue.length },
            { id: "paid", label: t("Payées", "Paid"), n: items.filter((item) => item.status === "paid").length }
          ].map((item) => (
            <button key={item.id} type="button" className={status === item.id ? "active" : ""} onClick={() => setStatus(item.id)}>
              {item.label}
              <span>({item.n})</span>
            </button>
          ))}
        </div>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Factures clients", "Client invoices")} fileBase="factures-clients" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Numéro", "Number")}</th>
                <th>{t("Client", "Client")}</th>
                <th>{t("Émise le", "Issued on")}</th>
                <th>{t("Échéance", "Due date")}</th>
                <th>{t("HT", "Excl. VAT")}</th>
                <th>{t("TTC", "Incl. VAT")}</th>
                <th>{t("Statut", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => {
                  const itemStatus = statusOf(item);
                  return (
                    <tr key={item.id} className={`jy-row-click ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                      <td>
                        <strong className="jy-mono">{item.number}</strong>
                      </td>
                      <td>
                        <div className="jy-cell-stack">
                          <strong>{item.clientName}</strong>
                          <span className="muted">{item.missionTitle || item.label}</span>
                        </div>
                      </td>
                      <td className="muted jy-nowrap">{day(item.issuedAt)}</td>
                      <td className={`jy-nowrap ${item.overdue ? "jy-danger-text" : "muted"}`}>{day(item.dueAt)}</td>
                      <td className="jy-amount">{money(item.amountHt)}</td>
                      <td className="jy-amount">{money(item.amountTtc)}</td>
                      <td>
                        <StatusPill tone={itemStatus.tone}>{itemStatus[lang]}</StatusPill>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="admin-table-empty muted">
                    {t("Aucune facture ne correspond.", "No invoice matches.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="fileText" />
          </span>
          <strong>{t("Aucune facture pour le moment", "No invoice yet")}</strong>
          <span>{t("Facturez vos honoraires dès qu'un candidat est placé.", "Invoice your fees as soon as a candidate is placed.")}</span>
          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={() => openForm()}>
            <AdminLineIcon name="plus" />
            {t("Nouvelle facture", "New invoice")}
          </button>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={
          <span className="jy-report-icon large">
            <AdminLineIcon name="fileText" />
          </span>
        }
        title={selected?.number || ""}
        subtitle={selected ? `${selected.clientName} · ${money(selected.amountTtc)} TTC` : ""}
        badges={selected ? <StatusPill tone={statusOf(selected).tone}>{statusOf(selected)[lang]}</StatusPill> : null}
        sections={
          selected
            ? [
                {
                  title: t("Facture", "Invoice"),
                  rows: [
                    [t("Objet", "Subject"), selected.label],
                    [t("Mission", "Mission"), selected.missionTitle],
                    [t("Montant HT", "Amount excl. VAT"), money(selected.amountHt)],
                    [t(`TVA (${selected.vatRate} %)`, `VAT (${selected.vatRate}%)`), money(selected.vatAmount)],
                    [t("Montant TTC", "Amount incl. VAT"), money(selected.amountTtc)]
                  ]
                },
                {
                  title: t("Suivi", "Tracking"),
                  rows: [
                    [t("Créée le", "Created on"), formatDateTime(selected.createdAt, language)],
                    [t("Émise le", "Issued on"), selected.issuedAt ? day(selected.issuedAt) : ""],
                    [t("Échéance", "Due date"), selected.dueAt ? day(selected.dueAt) : ""],
                    [t("Payée le", "Paid on"), selected.paidAt ? day(selected.paidAt) : ""]
                  ]
                }
              ]
            : []
        }
        footer={
          selected ? (
            <>
              <button type="button" className="jy-btn jy-btn-outline" onClick={() => printInvoice(selected)}>
                <AdminLineIcon name="printer" />
                {t("Imprimer / PDF", "Print / PDF")}
              </button>
              {selected.status === "draft" ? (
                <>
                  <button type="button" className="jy-btn jy-btn-outline" onClick={() => openForm(selected)}>
                    <AdminLineIcon name="edit" />
                    {t("Modifier", "Edit")}
                  </button>
                  <button type="button" className="jy-btn jy-btn-primary" disabled={busy !== ""} onClick={() => changeStatus(selected, "sent")}>
                    <AdminLineIcon name="send" />
                    {t("Émettre", "Issue")}
                  </button>
                  <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => removeDraft(selected)}>
                    <AdminLineIcon name="trash" />
                    {t("Supprimer", "Delete")}
                  </button>
                </>
              ) : null}
              {selected.status === "sent" ? (
                <>
                  <button type="button" className="jy-btn jy-btn-primary" disabled={busy !== ""} onClick={() => changeStatus(selected, "paid")}>
                    <AdminLineIcon name="quality" />
                    {t("Marquer comme payée", "Mark as paid")}
                  </button>
                  <button type="button" className="jy-btn jy-btn-danger-outline" disabled={busy !== ""} onClick={() => changeStatus(selected, "cancelled")}>
                    {t("Annuler", "Cancel")}
                  </button>
                </>
              ) : null}
              {selected.status === "paid" ? (
                <button type="button" className="jy-btn jy-btn-outline" disabled={busy !== ""} onClick={() => changeStatus(selected, "sent")}>
                  {t("Annuler l'encaissement", "Undo payment")}
                </button>
              ) : null}
            </>
          ) : null
        }
      />

      {formOpen && form ? (
        <MfaDialog
          open
          onClose={() => !saving && setFormOpen(false)}
          icon={editingId ? "edit" : "plus"}
          title={editingId ? t("Modifier le brouillon", "Edit draft") : t("Nouvelle facture", "New invoice")}
          description={t("Le numéro est attribué automatiquement, dans l'ordre. Une facture émise n'est plus modifiable.", "The number is assigned automatically, in order. An issued invoice can no longer be edited.")}
          width={600}
          footer={
            <>
              <button type="button" className="mfa-btn ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                {t("Annuler", "Cancel")}
              </button>
              <button type="button" className="mfa-btn secondary" onClick={() => submit("draft")} disabled={saving}>
                {t("Enregistrer en brouillon", "Save as draft")}
              </button>
              <button type="button" className="mfa-btn primary" onClick={() => submit("sent")} disabled={saving}>
                {saving ? <span className="mfa-spinner" /> : null}
                {t("Émettre la facture", "Issue invoice")}
              </button>
            </>
          }
        >
          <MfaError message={formError} />
          <form className="jy-promo-form" onSubmit={(event) => event.preventDefault()} noValidate>
            <label className="mfa-field wide">
              <span>{t("Mission (facultatif)", "Mission (optional)")}</span>
              <select value={form.missionId} onChange={(event) => pickMission(event.target.value)}>
                <option value="">{t("Sans mission", "No mission")}</option>
                {missions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.title}
                    {mission.clientName ? ` · ${mission.clientName}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={`mfa-field wide ${touched && errors.clientId ? "has-error" : ""}`}>
              <span>{t("Client facturé", "Billed client")} *</span>
              <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
                <option value="">{t("Choisir un client…", "Choose a client…")}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {touched && errors.clientId ? <small className="jy-field-error">{errors.clientId}</small> : null}
            </label>
            <label className={`mfa-field wide ${touched && errors.label ? "has-error" : ""}`}>
              <span>{t("Objet", "Subject")} *</span>
              <input maxLength={300} value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
              {touched && errors.label ? <small className="jy-field-error">{errors.label}</small> : null}
            </label>
            <label className={`mfa-field ${touched && errors.amountHt ? "has-error" : ""}`}>
              <span>{t("Montant HT (€)", "Amount excl. VAT (€)")} *</span>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amountHt} onChange={(event) => setForm({ ...form, amountHt: event.target.value })} />
              {touched && errors.amountHt ? <small className="jy-field-error">{errors.amountHt}</small> : null}
            </label>
            <label className="mfa-field">
              <span>{t("TVA", "VAT")}</span>
              <select value={form.vatRate} onChange={(event) => setForm({ ...form, vatRate: event.target.value })}>
                {VAT_RATES.map((rate) => (
                  <option key={rate} value={String(rate)}>
                    {String(rate).replace(".", language === "en" ? "." : ",")} %{rate === 0 ? ` · ${t("non applicable (293 B)", "not applicable")}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="mfa-field">
              <span>{t("Date d'émission", "Issue date")}</span>
              <input type="date" value={form.issuedAt} onChange={(event) => setForm({ ...form, issuedAt: event.target.value })} />
            </label>
            <label className={`mfa-field ${touched && errors.dueAt ? "has-error" : ""}`}>
              <span>{t("Échéance", "Due date")}</span>
              <input type="date" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
              {touched && errors.dueAt ? <small className="jy-field-error">{errors.dueAt}</small> : null}
            </label>
            {Number(form.amountHt) > 0 ? (
              <div className="mfa-field wide jy-invoice-total">
                <span>{t("Total TTC", "Total incl. VAT")}</span>
                <strong>{money(Number(form.amountHt) * (1 + Number(form.vatRate) / 100))}</strong>
              </div>
            ) : null}
          </form>
        </MfaDialog>
      ) : null}
      {confirmDialog}
    </section>
  );
}
