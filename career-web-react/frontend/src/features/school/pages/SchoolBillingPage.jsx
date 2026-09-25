import React, { useEffect, useState } from "react";
// Espace École › Facturation : historique des paiements de la licence de
// l'établissement (GET /api/billing/transactions), dans la charte de la
// page Finance de l'administration.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { listBillingTransactions } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer, formatEur } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";

const CYCLE = { monthly: { fr: "Mensuel", en: "Monthly" }, annual: { fr: "Annuel", en: "Annual" }, yearly: { fr: "Annuel", en: "Annual" } };
const SOURCE = {
  stripe: { fr: "Carte bancaire (Stripe)", en: "Card (Stripe)", icon: "card" },
  instant: { fr: "Activation instantanée", en: "Instant activation", icon: "trend" },
  license_redeem: { fr: "Code de licence", en: "License code", icon: "licenses" },
  admin_created: { fr: "Créé par Career CV", en: "Created by Career CV", icon: "settings" }
};

export default function SchoolBillingPage({ user, language, currency }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const lang = language === "en" ? "en" : "fr";
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    listBillingTransactions(user.id, { page: 1, pageSize: 50 })
      .then((data) => setItems(data.transactions || []))
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const statusOf = (item) =>
    item.refunded
      ? { id: "refunded", label: t("Remboursé", "Refunded"), tone: "tag-danger" }
      : Number(item.amountCollected || 0) > 0
      ? { id: "paid", label: t("Payé", "Paid"), tone: "tag-success" }
      : { id: "free", label: t("Offert", "Free"), tone: "tag-warning" };
  const planName = (item) => getPlanById(item.planId)?.name?.[lang] || item.planName || item.planId;
  const money = (value, item) => formatEur(Number(value || 0), item?.currency || currency);

  const paid = items.filter((item) => statusOf(item).id === "paid");
  const refunded = items.filter((item) => item.refunded);
  const totalPaid = paid.reduce((sum, item) => sum + Number(item.amountCollected || 0), 0);
  const lastPayment = paid[0] || null;
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (status === "all" || statusOf(item).id === status) &&
      (!needle || [planName(item), SOURCE[item.source]?.[lang], item.licenseCode].some((value) => String(value || "").toLowerCase().includes(needle)))
  );

  const cards = [
    { icon: "finance", label: t("Total payé", "Total paid"), value: money(totalPaid), tone: "green" },
    { icon: "report", label: t("Opérations", "Transactions"), value: items.length, tone: "" },
    { icon: "clock", label: t("Dernier paiement", "Last payment"), value: lastPayment ? formatDateTime(lastPayment.createdAt, language).split(" ")[0] : t("Aucun", "None"), tone: "" },
    { icon: "alert", label: t("Remboursements", "Refunds"), value: refunded.length, tone: refunded.length ? "danger" : "" }
  ];

  const exportColumns = [
    { key: "date", label: t("Date", "Date"), exportValue: (item) => formatDateTime(item.createdAt, language) },
    { key: "plan", label: t("Offre", "Plan"), exportValue: planName },
    { key: "cycle", label: t("Facturation", "Billing"), exportValue: (item) => CYCLE[item.billingCycle]?.[lang] || item.billingCycle || "" },
    { key: "source", label: t("Moyen", "Method"), exportValue: (item) => SOURCE[item.source]?.[lang] || item.source || "" },
    { key: "listed", label: t("Prix catalogue", "Listed price"), exportValue: (item) => Number(item.listedAmount || 0) },
    { key: "paid", label: t("Payé", "Paid"), exportValue: (item) => Number(item.amountCollected || 0) },
    { key: "status", label: t("Statut", "Status"), exportValue: (item) => statusOf(item).label }
  ];

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Facturation", "Billing")}</h2>
          <p>{t("Historique des paiements de la licence de votre établissement.", "Payment history for your institution's license.")}</p>
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher une offre, un moyen ou un code…", "Search a plan, a method or a code…")} />
        <div className="jy-seg jy-seg-counts">
          {[
            { id: "all", label: t("Toutes", "All"), n: items.length },
            { id: "paid", label: t("Payées", "Paid"), n: paid.length },
            { id: "free", label: t("Offertes", "Free"), n: items.filter((item) => statusOf(item).id === "free").length },
            { id: "refunded", label: t("Remboursées", "Refunded"), n: refunded.length }
          ].map((item) => (
            <button key={item.id} type="button" className={status === item.id ? "active" : ""} onClick={() => setStatus(item.id)}>
              {item.label}
              <span>({item.n})</span>
            </button>
          ))}
        </div>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Facturation", "Billing")} fileBase="facturation" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Date", "Date")}</th>
                <th>{t("Offre", "Plan")}</th>
                <th>{t("Moyen", "Method")}</th>
                <th>{t("Prix catalogue", "Listed price")}</th>
                <th>{t("Payé", "Paid")}</th>
                <th>{t("Statut", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => {
                  const itemStatus = statusOf(item);
                  const source = SOURCE[item.source];
                  return (
                    <tr key={item.id} className={`jy-row-click ${selected?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelected(item)}>
                      <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td>
                      <td>
                        <strong className="jy-cell-title">{planName(item)}</strong>
                        <span className="admin-block-muted">{CYCLE[item.billingCycle]?.[lang] || ""}</span>
                      </td>
                      <td>
                        <span className="jy-source">
                          <AdminLineIcon name={source?.icon || "finance"} />
                          {source?.[lang] || item.source}
                        </span>
                      </td>
                      <td className="jy-amount">{money(item.listedAmount, item)}</td>
                      <td className="jy-amount">{money(item.amountCollected, item)}</td>
                      <td>
                        <span className={`tag ${itemStatus.tone}`}>{itemStatus.label}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="admin-table-empty muted">
                    {t("Aucune opération de ce type.", "No transaction of this type.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="finance" />
          </span>
          <strong>{t("Aucun paiement pour le moment", "No payment yet")}</strong>
          <span>{t("Les paiements de votre licence apparaîtront ici dès qu'une offre sera activée.", "Your license payments will appear here once a plan is activated.")}</span>
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={
          selected ? (
            <span className="jy-report-icon large">
              <AdminLineIcon name={SOURCE[selected.source]?.icon || "finance"} />
            </span>
          ) : null
        }
        title={selected ? planName(selected) : ""}
        subtitle={selected ? formatDateTime(selected.createdAt, language) : ""}
        badges={selected ? <span className={`tag ${statusOf(selected).tone}`}>{statusOf(selected).label}</span> : null}
        sections={
          selected
            ? [
                {
                  title: t("Paiement", "Payment"),
                  rows: [
                    [t("Prix catalogue", "Listed price"), money(selected.listedAmount, selected)],
                    [t("Montant payé", "Amount paid"), money(selected.amountCollected, selected)],
                    [t("Facturation", "Billing"), CYCLE[selected.billingCycle]?.[lang] || ""],
                    [t("Moyen", "Method"), SOURCE[selected.source]?.[lang] || selected.source || ""],
                    [t("Code de licence", "License code"), selected.licenseCode || ""],
                    [t("Remboursé le", "Refunded on"), selected.refunded && selected.refundedAt ? formatDateTime(selected.refundedAt, language) : ""]
                  ]
                }
              ]
            : []
        }
      />
    </section>
  );
}
