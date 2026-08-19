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
import { AdminExportCsvButton } from "../../../components/AdminExportCsvButton.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../../lib/format.js";
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
import { AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminFinancePage({ user, language, currency = "EUR", initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Finance management",
          subtitle: "Every transaction recorded on the platform, with real vs. listed amounts.",
          revenueCollected: "Real revenue collected",
          listedValue: "Total listed value (all sources)",
          transactionCount: "Transactions",
          trend: "Real revenue collected — last 8 weeks",
          bySource: "Transactions by source",
          byPlan: "Revenue collected by plan",
          search: "Search by user, email or plan…",
          colDate: "Date",
          colUser: "User",
          colPlan: "Plan",
          colCycle: "Cycle",
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
            "\"Listed price\" is the plan's catalog price at the time of the transaction. \"Amount collected\" is only non-zero for real Stripe payments — instant/admin/license activations are free or already covered by a license seat, so no money changes hands for those."
        }
      : {
          title: "Gestion de finance",
          subtitle: "Toutes les transactions de la plateforme, avec distinction montant réel / prix catalogue.",
          revenueCollected: "Revenu réel encaissé",
          listedValue: "Valeur catalogue totale (toutes sources)",
          transactionCount: "Transactions",
          trend: "Revenu réel encaissé — 8 dernières semaines",
          bySource: "Transactions par source",
          byPlan: "Revenu encaissé par plan",
          search: "Rechercher par utilisateur, email ou plan…",
          colDate: "Date",
          colUser: "Utilisateur",
          colPlan: "Plan",
          colCycle: "Cycle",
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
            "Le \"prix catalogue\" est le tarif du plan au moment de la transaction. Le \"montant encaissé\" n'est non-nul que pour les vrais paiements Stripe — les activations instantanées/admin/licence sont gratuites ou déjà couvertes par un siège de licence, donc aucun argent ne change de main pour celles-ci."
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
      confirmButtonColor: "#b91c1c"
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

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const planEntries = Object.entries(data.revenueByPlan || {}).filter(([, amount]) => amount > 0);
  const sourceEntries = Object.entries(data.countBySource || {});

  return (
    <section className="admin-finance">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <AdminExportCsvButton adminUserId={user.id} path="/admin/export/transactions" language={language} />
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={formatEur(data.totalRevenueCollected, currency)}
          label={copy.revenueCollected}
        />
        <AdminKpiCard
          tone="warning"
          icon="pricetag"
          value={formatEur(data.totalListedValue, currency)}
          label={copy.listedValue}
        />
        <AdminKpiCard tone="primary" icon="chart" value={data.totalTransactions} label={copy.transactionCount} />
      </div>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-panel admin-trend-panel">
        <h3>{copy.trend}</h3>
        <AdminTrendChart
          trend={data.revenueTrend}
          language={language}
          valueKey="amount"
          formatValue={(amount) => formatEur(amount, currency)}
        />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel">
          <h3>{copy.bySource}</h3>
          <ul className="admin-stat-list">
            {sourceEntries.map(([sourceId, count]) => (
              <li key={sourceId}>
                <span>{sourceLabels[sourceId] || sourceId}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-panel">
          <h3>{copy.byPlan}</h3>
          <ul className="admin-stat-list">
            {planEntries.length ? (
              planEntries.map(([planId, amount]) => (
                <li key={planId}>
                  <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                  <strong>{formatEur(amount, currency)}</strong>
                </li>
              ))
            ) : (
              <li className="muted">{copy.empty}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="admin-table-toolbar admin-finance-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>
      <div className="admin-subtabs">
        {ADMIN_FINANCE_SOURCES.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            className={`admin-subtab ${source === item.id ? "active" : ""}`}
            onClick={() => setSource(item.id)}
          >
            {item.label[language] || item.label.fr}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colDate}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colPlan}</th>
              <th>{copy.colCycle}</th>
              <th>{copy.colListed}</th>
              <th>{copy.colCollected}</th>
              <th>{copy.colSource}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? (
              pagedItems.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{formatDate(item.createdAt)}</td>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle
                        user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                      />
                      <div>
                        <strong>
                          {item.userFirstName} {item.userLastName}
                        </strong>
                        <span className="muted">{item.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getPlanById(item.planId)?.name?.[language] || getPlanById(item.planId)?.name?.fr || item.planId}</td>
                  <td className="muted">{item.billingCycle}</td>
                  <td>{formatEur(item.listedAmount, currency)}</td>
                  <td>
                    <strong className={item.amountCollected > 0 ? "admin-finance-real" : "muted"}>
                      {formatEur(item.amountCollected, currency)}
                    </strong>
                  </td>
                  <td>
                    <span className="tag">{sourceLabels[item.source] || item.source}</span>
                  </td>
                  <td>
                    {item.refunded ? (
                      <span className="tag tag-danger">{copy.refunded}</span>
                    ) : item.refundable ? (
                      <button
                        type="button"
                        className="admin-row-action danger"
                        disabled={refundingId === item.id}
                        onClick={() => handleRefund(item)}
                      >
                        {refundingId === item.id ? copy.refunding : copy.refund}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
