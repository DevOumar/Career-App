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

export default function AdminSatisfactionPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Satisfaction",
          subtitle: "CSAT survey results collected across the platform (1-10 scale).",
          average: "Average score",
          nps: "NPS",
          responses: "Total responses",
          promoters: "Promoters (9-10)",
          passives: "Passives (7-8)",
          detractors: "Detractors (1-6)",
          trendTitle: "Average score — last 8 weeks",
          recentTitle: "Recent responses",
          colUser: "User",
          colScore: "Score",
          colComment: "Comment",
          colDate: "Date",
          empty: "No response yet.",
          noComment: "—"
        }
      : {
          title: "Satisfaction",
          subtitle: "Résultats du sondage CSAT collectés sur la plateforme (échelle 1-10).",
          average: "Score moyen",
          nps: "NPS",
          responses: "Réponses totales",
          promoters: "Promoteurs (9-10)",
          passives: "Passifs (7-8)",
          detractors: "Détracteurs (1-6)",
          trendTitle: "Score moyen — 8 dernières semaines",
          recentTitle: "Réponses récentes",
          colUser: "Utilisateur",
          colScore: "Score",
          colComment: "Commentaire",
          colDate: "Date",
          empty: "Aucune réponse pour l'instant.",
          noComment: "—"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSatisfaction(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const trendForChart = data.trend.map((week) => ({ weekStart: week.weekStart, average: Math.round((week.average || 0) * 10) / 10 }));

  return (
    <section className="admin-satisfaction">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="chart" value={data.average != null ? data.average.toFixed(1) : "—"} label={copy.average} />
        <AdminKpiCard tone="success" icon="shield" value={data.nps != null ? data.nps : "—"} label={copy.nps} />
        <AdminKpiCard tone="primary" icon="profile" value={data.totalResponses} label={copy.responses} />
        <AdminKpiCard tone="success" icon="check" value={data.promoters} label={copy.promoters} />
        <AdminKpiCard tone="warning" icon="chat" value={data.passives} label={copy.passives} />
        <AdminKpiCard tone="danger" icon="alert" value={data.detractors} label={copy.detractors} />
      </div>

      <article className="card block admin-satisfaction-trend">
        <h3>{copy.trendTitle}</h3>
        <AdminTrendChart trend={trendForChart} language={language} valueKey="average" />
      </article>

      <article className="card block">
        <h3>{copy.recentTitle}</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colUser}</th>
                <th>{copy.colScore}</th>
                <th>{copy.colComment}</th>
                <th>{copy.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.length ? (
                data.responses.map((item) => (
                  <tr key={item.id}>
                    <td>{item.userName}</td>
                    <td>
                      <span className={`satisfaction-score-pill ${satisfactionTierFor(item.score).tone}`}>{item.score}</span>
                    </td>
                    <td>{item.comment || copy.noComment}</td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-table-empty muted">
                    {copy.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
