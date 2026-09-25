import React from "react";
// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...).
// Le dashboard École vit désormais séparément dans features/school/ ; les
// deux modules continuent de partager quelques composants (AdminKpiCard,
// AdminTrendChart, AdminPagination...) exportés d'ici et importés par
// features/school/SchoolApp.jsx.
//
// NOTE : ce fichier reste volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) — un découpage en un fichier par page admin est une
// suite possible, pas un prérequis pour que ce module soit isolé du reste
// de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AdminAdvancedFilters, AdminColumnSelector, AdminExportMenu, useAdminColumns, inAdminDateRange } from "../AdminListTools.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById, resolvePlanId, mergeByResolvedPlan } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatDateTime, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { getAccountLabel } from "../../../lib/accounts.js";
import { satisfactionTierFor } from "../../satisfaction/SatisfactionSurveyModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  listAdminUsers,
  getAdminSatisfaction,
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
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer, JyBarChart, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

// Périodicité de facturation, stockée en anglais côté base.
const BILLING_CYCLE_LABELS = {
  monthly: { fr: "Mensuel", en: "Monthly" },
  annual: { fr: "Annuel", en: "Annual" },
  yearly: { fr: "Annuel", en: "Annual" },
  one_time: { fr: "Paiement unique", en: "One-time" },
  once: { fr: "Paiement unique", en: "One-time" }
};

function billingCycleLabel(cycle, language) {
  if (!cycle) return "-";
  return BILLING_CYCLE_LABELS[cycle]?.[language] || BILLING_CYCLE_LABELS[cycle]?.fr || cycle;
}

const FINANCE_COLUMN_KEYS = [
  { key: "date" },
  { key: "user", required: true },
  { key: "plan" },
  { key: "listed" },
  { key: "collected" },
  { key: "source" },
  { key: "status" }
];

export default function AdminFinancePage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Finance",
          subtitle: "Platform financial overview: transactions, collected revenue and refunds.",
          revenueCollected: "Real revenue collected",
          listedValue: "Total listed value (all sources)",
          transactionCount: "Transactions",
          trend: "Real revenue collected over the last 8 weeks",
          bySource: "Transactions by source",
          byPlan: "Revenue collected by plan",
          bySegment: "Revenue by segment",
          segmentCandidate: "Candidate / Student",
          segmentAgency: "Recruitment firm",
          segmentSchool: "School / Institution",
          segmentOther: "Other",
          search: "Search by user, email or plan…",
          colDate: "Date",
          colUser: "User",
          colPlan: "Plan",
          colCycle: "Billing",
          colListed: "Listed price",
          colCollected: "Amount collected",
          colSource: "Source",
          colActions: "Actions",
          empty: "No transaction found.",
          refund: "Refund",
          refunded: "Refunded",
          refunding: "Refunding…",
          confirmRefundTitle: "Refund this transaction?",
          confirmRefundText: "This immediately refunds the customer via Stripe. This cannot be undone.",
          confirmRefundBtn: "Refund",
          cancel: "Cancel",
          disclaimer:
            "\"Listed price\" is the plan's catalog price at the time of the transaction. \"Amount collected\" is only non-zero for real Stripe payments: instant, admin and license activations are free or already covered by a license seat."
        }
      : {
          title: "Finance",
          subtitle: "Vue financière de la plateforme : transactions, revenus encaissés et remboursements.",
          revenueCollected: "Revenu réel encaissé",
          listedValue: "Valeur catalogue totale (toutes sources)",
          transactionCount: "Transactions",
          trend: "Revenu réel encaissé sur les 8 dernières semaines",
          bySource: "Transactions par source",
          byPlan: "Revenu encaissé par plan",
          bySegment: "Revenu par segment",
          segmentCandidate: "Candidat / Étudiant",
          segmentAgency: "Cabinet de recrutement",
          segmentSchool: "École / Établissement",
          segmentOther: "Autre",
          search: "Rechercher par utilisateur, email ou plan…",
          colDate: "Date",
          colUser: "Utilisateur",
          colPlan: "Plan",
          colCycle: "Facturation",
          colListed: "Prix catalogue",
          colCollected: "Montant encaissé",
          colSource: "Source",
          colActions: "Actions",
          empty: "Aucune transaction trouvée.",
          refund: "Rembourser",
          refunded: "Remboursé",
          refunding: "Remboursement…",
          confirmRefundTitle: "Rembourser cette transaction ?",
          confirmRefundText: "Cela rembourse immédiatement le client via Stripe. Action irréversible.",
          confirmRefundBtn: "Rembourser",
          cancel: "Annuler",
          disclaimer:
            "Le \"prix catalogue\" est le tarif du plan au moment de la transaction. Le \"montant encaissé\" n'est non nul que pour les vrais paiements Stripe : les activations instantanées, admin ou par licence sont gratuites ou déjà couvertes par un siège de licence."
        };

  const sourceLabels =
    language === "en"
      ? {
          stripe: "Stripe",
          instant: "Instant activation",
          license_redeem: "License code",
          admin_created: "Created by admin"
        }
      : {
          stripe: "Stripe",
          instant: "Activation instantanée",
          license_redeem: "Code de licence",
          admin_created: "Créé par l'admin"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initialSearch || "");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState("");
  const [section, setSection] = useState("transactions");
  const [selectedTx, setSelectedTx] = useState(null);
  const [filters, setFilters] = useState(() => ({ status: "", plan: "", cycle: "", dateFrom: "", dateTo: "" }));
  const cols = useAdminColumns("career_app_admin_cols_finance", FINANCE_COLUMN_KEYS);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function load() {
    getAdminFinance(user.id, { search, source })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, search, source]);

  async function handleRefund(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.confirmRefundTitle,
      text: copy.confirmRefundText,
      showCancelButton: true,
      confirmButtonText: copy.confirmRefundBtn,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#cf1322"
    });
    if (!result.isConfirmed) return;
    setRefundingId(item.id);
    try {
      await refundAdminTransaction({ adminUserId: user.id, transactionId: item.id });
      load();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Refunded." : "Remboursé.",
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setRefundingId("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const tt = (fr, en) => (language === "en" ? en : fr);
  const txStatus = (item) =>
    item.refunded
      ? { id: "refunded", label: copy.refunded, tone: "tag-danger" }
      : Number(item.amountCollected || 0) > 0
      ? { id: "paid", label: tt("Payé", "Paid"), tone: "tag-success" }
      : { id: "free", label: tt("Offert", "Free"), tone: "tag-warning" };
  const txPlanName = (planId) => getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId || "";
  const txUserName = (item) => `${item.userFirstName || ""} ${item.userLastName || ""}`.trim() || tt("Compte supprimé", "Deleted account");

  const columnDefs = [
    { key: "date", label: copy.colDate, exportValue: (item) => formatDateTime(item.createdAt, language) },
    {
      key: "user",
      label: copy.colUser,
      required: true,
      exportColumns: [
        { label: copy.colUser, value: txUserName },
        { label: "E-mail", value: (item) => item.userEmail || "" }
      ]
    },
    {
      key: "plan",
      label: copy.colPlan,
      exportColumns: [
        { label: copy.colPlan, value: (item) => txPlanName(item.planId) },
        { label: tt("Facturation", "Billing"), value: (item) => billingCycleLabel(item.billingCycle, language) }
      ]
    },
    { key: "listed", label: copy.colListed, exportValue: (item) => Number(item.listedAmount || 0) },
    { key: "collected", label: tt("Encaissé", "Collected"), exportValue: (item) => Number(item.amountCollected || 0) },
    { key: "source", label: copy.colSource, exportValue: (item) => sourceLabels[item.source] || item.source },
    { key: "status", label: tt("Statut", "Status"), exportValue: (item) => txStatus(item).label }
  ];
  const visibleColumnDefs = columnDefs.filter((column) => cols.isVisible(column.key));

  const planIds = [...new Set((data.items || []).map((item) => resolvePlanId(item.planId)).filter(Boolean))];
  const cycleIds = [...new Set((data.items || []).map((item) => item.billingCycle).filter(Boolean))];
  const filterFields = [
    {
      key: "status",
      label: tt("Statut", "Status"),
      allLabel: tt("Tous les statuts", "All statuses"),
      options: [
        { value: "paid", label: tt("Payé", "Paid") },
        { value: "free", label: tt("Offert", "Free") },
        { value: "refunded", label: copy.refunded }
      ]
    },
    { key: "plan", label: copy.colPlan, allLabel: tt("Tous les plans", "All plans"), options: planIds.map((id) => ({ value: id, label: txPlanName(id) })) },
    {
      key: "cycle",
      label: tt("Facturation", "Billing"),
      allLabel: tt("Toutes", "All"),
      options: cycleIds.map((id) => ({ value: id, label: billingCycleLabel(id, language) }))
    },
    { key: "date", label: tt("Transaction entre le", "Transaction between"), type: "dateRange" }
  ];
  const filteredItems = (data.items || []).filter(
    (item) =>
      (!filters.status || txStatus(item).id === filters.status) &&
      (!filters.plan || resolvePlanId(item.planId) === filters.plan) &&
      (!filters.cycle || item.billingCycle === filters.cycle) &&
      inAdminDateRange(item.createdAt, filters.dateFrom, filters.dateTo)
  );
  const filterSummary = [
    search ? `${tt("Recherche", "Search")} : ${search}` : "",
    source ? `${copy.colSource} : ${sourceLabels[source] || source}` : "",
    ...filterFields.flatMap((field) => {
      if (field.type === "dateRange") {
        const from = filters[`${field.key}From`];
        const to = filters[`${field.key}To`];
        return from || to ? [`${field.label} ${from || "…"} / ${to || "…"}`] : [];
      }
      const option = field.options.find((item) => item.value === filters[field.key]);
      return option ? [`${field.label} : ${option.label}`] : [];
    })
  ].filter(Boolean);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ADMIN_PAGE_SIZE));
  const pagedItems = filteredItems.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const planEntries = Object.entries(mergeByResolvedPlan(data.revenueByPlan)).filter(([, amount]) => amount > 0);
  const sourceEntries = Object.entries(data.countBySource || {});
  const segmentLabels = {
    candidate: copy.segmentCandidate,
    agency: copy.segmentAgency,
    school: copy.segmentSchool,
    other: copy.segmentOther
  };
  const segmentEntries = Object.entries(data.revenueBySegment || {}).filter(([, amount]) => amount > 0);

  const t = (fr, en) => (language === "en" ? en : fr);
  const items = data.items || [];
  const totalListed = Number(data.totalListedValue || 0);
  const totalCollected = Number(data.totalRevenueCollected || 0);
  const refundedCount = items.filter((item) => item.refunded).length;
  const allSourcesCount = Object.values(data.countBySource || {}).reduce((sum, count) => sum + Number(count || 0), 0);
  const sourceIcon = { stripe: "finance", instant: "trend", license_redeem: "licenses", admin_created: "settings" };

  const cards = [
    { icon: "pricing", label: t("Valeur catalogue", "Listed value"), value: formatEur(totalListed, currency), tone: "" },
    { icon: "trend", label: t("Encaissé", "Collected"), value: formatEur(totalCollected, currency), tone: "green" },
    { icon: "finance", label: t("Non encaissé", "Not collected"), value: formatEur(Math.max(0, totalListed - totalCollected), currency), tone: "gold" },
    { icon: "alert", label: t("Remboursements", "Refunds"), value: refundedCount, tone: "danger" }
  ];

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="jy-seg" role="tablist">
        {[
          { id: "transactions", label: t("Transactions", "Transactions") },
          { id: "analyses", label: t("Analyses", "Analytics") }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            className={section === tab.id ? "active" : ""}
            onClick={() => setSection(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {section === "analyses" ? (
        <>
          <div className="admin-panel admin-trend-panel">
            <h3>{copy.trend}</h3>
            <JyBarChart
              trend={data.revenueTrend}
              language={language}
              series={[{ key: "amount", label: copy.trend, tone: "green" }]}
              formatValue={(amount) => formatEur(amount, currency)}
            />
          </div>

          <div className="jy-breakdowns">
            {[
              {
                key: "source",
                title: copy.bySource,
                total: `${sourceEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0)} ${t("transactions", "transactions")}`,
                tone: "",
                rows: sourceEntries.map(([sourceId, count]) => ({
                  key: sourceId,
                  icon: sourceIcon[sourceId] || "finance",
                  label: sourceLabels[sourceId] || sourceId,
                  value: Number(count || 0),
                  display: String(count)
                }))
              },
              {
                key: "plan",
                title: copy.byPlan,
                total: formatEur(planEntries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0), currency),
                tone: "gold",
                rows: planEntries.map(([planId, amount]) => ({
                  key: planId,
                  icon: "pricing",
                  label: getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId,
                  value: Number(amount || 0),
                  display: formatEur(amount, currency)
                }))
              },
              {
                key: "segment",
                title: copy.bySegment,
                total: formatEur(segmentEntries.reduce((sum, [, amount]) => sum + Number(amount || 0), 0), currency),
                tone: "gold",
                rows: segmentEntries.map(([segmentId, amount]) => ({
                  key: segmentId,
                  icon: segmentId === "school" ? "schools" : segmentId === "agency" ? "cabinets" : "profile",
                  label: segmentLabels[segmentId] || segmentId,
                  value: Number(amount || 0),
                  display: formatEur(amount, currency)
                }))
              }
            ].map((block) => {
              const sum = block.rows.reduce((acc, row) => acc + row.value, 0);
              const rows = [...block.rows].sort((a, b) => b.value - a.value);
              return (
                <div key={block.key} className="jy-card">
                  <div className="jy-card-head">
                    <h3>{block.title}</h3>
                    <span className="jy-pill">{block.total}</span>
                  </div>
                  {rows.length ? (
                    <ul className="jy-share-list">
                      {rows.map((row) => {
                        const share = sum > 0 ? Math.round((row.value / sum) * 100) : 0;
                        return (
                          <li key={row.key}>
                            <div className="jy-share-top">
                              <span className="jy-share-label">
                                <AdminLineIcon name={row.icon} />
                                {row.label}
                              </span>
                              <strong>{row.display}</strong>
                            </div>
                            <div className="jy-share-bottom">
                              <span className="jy-bar-track">
                                <span className={block.tone} style={{ width: `${Math.max(share, row.value > 0 ? 3 : 0)}%` }} />
                              </span>
                              <small>{share} %</small>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="jy-share-empty">
                      <AdminLineIcon name="finance" />
                      <span>{t("Aucun revenu encaissé pour l'instant.", "No revenue collected yet.")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="admin-finance-disclaimer">{copy.disclaimer}</p>
        </>
      ) : (
        <>
          <div className="jy-seg jy-seg-counts">
            {ADMIN_FINANCE_SOURCES.map((item) => {
              const count = item.id ? Number(data.countBySource?.[item.id] || 0) : allSourcesCount;
              return (
                <button
                  key={item.id || "all"}
                  type="button"
                  className={source === item.id ? "active" : ""}
                  onClick={() => setSource(item.id)}
                >
                  {item.id ? sourceLabels[item.id] || item.label[language] || item.label.fr : t("Toutes", "All")}
                  <span>({count})</span>
                </button>
              );
            })}
          </div>

          <div className="admin-table-toolbar admin-finance-toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
            <div className="jy-list-tools">
              <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
              <AdminColumnSelector columns={columnDefs} visible={cols.visible} onToggle={cols.toggle} onReset={cols.reset} language={language} />
              <AdminExportMenu
                language={language}
                title={tt("Transactions", "Transactions")}
                fileBase="transactions"
                columns={visibleColumnDefs}
                rows={filteredItems}
                filters={filterSummary}
              />
            </div>
          </div>

          <div className="admin-table-wrap jy-finance-table">
            <table className="admin-table">
              <thead>
                <tr>
                  {visibleColumnDefs.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedItems.length ? (
                  pagedItems.map((item) => {
                    const listed = Number(item.listedAmount || 0);
                    const collected = Number(item.amountCollected || 0);
                    const ratio = listed > 0 ? Math.min(100, (collected / listed) * 100) : 0;
                    const status = txStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className={`jy-row-click ${selectedTx?.id === item.id ? "is-selected" : ""}`}
                        onClick={() => setSelectedTx(item)}
                      >
                        {cols.isVisible("date") ? <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td> : null}
                        <td>
                          <div className="admin-table-name">
                            {item.userFirstName || item.userLastName || item.userAvatarDataUrl ? (
                              <AvatarCircle
                                user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                              />
                            ) : (
                              <span className="jy-feed-ghost" aria-hidden="true">
                                <AdminLineIcon name="profile" />
                              </span>
                            )}
                            <div>
                              <strong>
                                {`${item.userFirstName || ""} ${item.userLastName || ""}`.trim() || t("Compte supprimé", "Deleted account")}
                              </strong>
                              {item.userEmail ? <span className="muted">{item.userEmail}</span> : null}
                            </div>
                          </div>
                        </td>
                        {cols.isVisible("plan") ? (
                          <td>
                            <strong className="jy-cell-title">{txPlanName(item.planId)}</strong>
                            <span className="admin-block-muted">{billingCycleLabel(item.billingCycle, language)}</span>
                          </td>
                        ) : null}
                        {cols.isVisible("listed") ? <td className="jy-amount">{formatEur(listed, currency)}</td> : null}
                        {cols.isVisible("collected") ? (
                          <td className="jy-paid-cell">
                            <span className="jy-amount">{formatEur(collected, currency)}</span>
                            <span className="jy-progress-row">
                              <span className="jy-progress">
                                <span style={{ width: `${ratio}%` }} />
                              </span>
                              <small>{Math.round(ratio)} %</small>
                            </span>
                          </td>
                        ) : null}
                        {cols.isVisible("source") ? (
                          <td>
                            <span className="jy-source">
                              <AdminLineIcon name={sourceIcon[item.source] || "finance"} />
                              {sourceLabels[item.source] || item.source}
                            </span>
                          </td>
                        ) : null}
                        {cols.isVisible("status") ? (
                          <td>
                            <span className={`tag ${status.tone}`}>{status.label}</span>
                          </td>
                        ) : null}
                        <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                          {!item.refunded && item.refundable ? (
                            <button
                              type="button"
                              className="admin-row-action danger"
                              disabled={refundingId === item.id}
                              onClick={() => handleRefund(item)}
                            >
                              <AdminLineIcon name="logout" />
                              {refundingId === item.id ? copy.refunding : copy.refund}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={visibleColumnDefs.length + 1} className="admin-table-empty muted">
                      {copy.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


          <JyDrawer
            open={Boolean(selectedTx)}
            onClose={() => setSelectedTx(null)}
            language={language}
            avatar={
              selectedTx && (selectedTx.userFirstName || selectedTx.userLastName || selectedTx.userAvatarDataUrl) ? (
                <AvatarCircle
                  user={{ firstName: selectedTx.userFirstName, lastName: selectedTx.userLastName, avatarDataUrl: selectedTx.userAvatarDataUrl }}
                />
              ) : (
                <span className="jy-feed-ghost" aria-hidden="true">
                  <AdminLineIcon name="profile" />
                </span>
              )
            }
            title={
              selectedTx
                ? `${selectedTx.userFirstName || ""} ${selectedTx.userLastName || ""}`.trim() || t("Compte supprimé", "Deleted account")
                : ""
            }
            subtitle={selectedTx?.userEmail || t("Transaction", "Transaction")}
            badges={
              selectedTx ? (
                <>
                  <span className={`tag ${selectedTx.refunded ? "tag-danger" : Number(selectedTx.amountCollected || 0) > 0 ? "tag-success" : "tag-warning"}`}>
                    {selectedTx.refunded ? copy.refunded : Number(selectedTx.amountCollected || 0) > 0 ? t("Payé", "Paid") : t("Offert", "Free")}
                  </span>
                  <span className="tag">{sourceLabels[selectedTx.source] || selectedTx.source}</span>
                </>
              ) : null
            }
            sections={
              selectedTx
                ? [
                    {
                      title: t("Transaction", "Transaction"),
                      rows: [
                        [copy.colDate, formatDateTime(selectedTx.createdAt, language)],
                        [copy.colPlan, getPlanById(selectedTx.planId)?.name?.[language] || getPlanById(selectedTx.planId)?.name?.fr || selectedTx.planId],
                        [copy.colCycle, billingCycleLabel(selectedTx.billingCycle, language)],
                        [copy.colSource, sourceLabels[selectedTx.source] || selectedTx.source]
                      ]
                    },
                    {
                      title: t("Montants", "Amounts"),
                      rows: [
                        [copy.colListed, formatEur(selectedTx.listedAmount, currency)],
                        [t("Encaissé", "Collected"), formatEur(selectedTx.amountCollected, currency)],
                        [
                          t("Taux encaissé", "Collected rate"),
                          `${Number(selectedTx.listedAmount || 0) > 0 ? Math.round((Number(selectedTx.amountCollected || 0) / Number(selectedTx.listedAmount)) * 100) : 0} %`
                        ]
                      ]
                    },
                    { title: t("À savoir", "Good to know"), content: <p className="admin-finance-disclaimer">{copy.disclaimer}</p> }
                  ]
                : []
            }
            footer={
              selectedTx && !selectedTx.refunded && selectedTx.refundable ? (
                <button
                  type="button"
                  className="admin-row-action danger"
                  disabled={refundingId === selectedTx.id}
                  onClick={() => {
                    const target = selectedTx;
                    setSelectedTx(null);
                    handleRefund(target);
                  }}
                >
                  <AdminLineIcon name="logout" /> {copy.refund}
                </button>
              ) : null
            }
          />

          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filteredItems.length} />
        </>
      )}
    </section>
  );
}
