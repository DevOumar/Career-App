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

export default function AdminAiMonitoringPage({ user, language }) {
  const copy = language === "en"
    ? { title: "AI monitoring", subtitle: "Operational view of extraction and matching reliability.", success: "Successful extractions", failed: "Needs review", partial: "Partial", runs: "Match analyses", cost: "Estimated cost", avg: "Average score", invalid: "Invalid responses / weak extractions" }
    : { title: "Monitoring IA", subtitle: "Vue opérationnelle de la fiabilité extraction et matching.", success: "Extractions réussies", failed: "À revoir", partial: "Partielles", runs: "Analyses matching", cost: "Coût estimé", avg: "Score moyen", invalid: "Réponses invalides / extractions faibles" };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getAdminAiMonitoring(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);
  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;
  return (
    <section className="admin-ai-monitoring admin-module-pro">
      <header className="module-header"><h2>{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="admin-module-metrics wide">
        <AdminMiniMetric icon="shield" label={copy.success} value={data.successfulExtractions} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.partialExtractions} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.failed} value={data.failedExtractions} tone="danger" />
        <AdminMiniMetric icon="chart" label={copy.runs} value={data.totalMatchRuns} />
        <AdminMiniMetric icon="scale" label={copy.cost} value={`${data.estimatedCost.amount} ${data.estimatedCost.currency}`} />
        <AdminMiniMetric icon="matchmark" label={copy.avg} value={data.averageMatchScore == null ? "—" : `${data.averageMatchScore}/100`} />
      </div>
      <div className="admin-signal-card">
        <h3>{copy.invalid}</h3>
        <div className="admin-quality-feed">
          {data.invalidResponses.length ? data.invalidResponses.map((item) => (
            <article key={item.id}>
              <span className="tag tag-danger">{item.score}/100</span>
              <div><strong>{item.id}</strong><small>{[...item.missing, ...item.suspicious].join(", ") || "—"}</small></div>
            </article>
          )) : <p className="muted">Aucune anomalie détectée.</p>}
        </div>
      </div>
    </section>
  );
}
