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

export default function AdminAiSamplesPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "AI moderation",
          subtitle: "Sample of AI-generated match analyses, for quality and abuse review.",
          disclaimer:
            "Only CV/job match analyses are stored server-side and reviewable here. Generated cover letters live only in the user's browser and are never saved. Salary negotiation transcripts are now saved so users can resume them, but they remain private to each user's account and are not reviewable in this admin panel.",
          search: "Search by user, job title or company…",
          empty: "No analysis found.",
          score: "Score",
          strengths: "Strengths",
          missing: "Missing keywords",
          recommendation: "Recommendation",
          for: "for"
        }
      : {
          title: "Modération IA",
          subtitle: "Échantillon des analyses de matching générées par l'IA, pour contrôle qualité et détection d'abus.",
          disclaimer:
            "Seules les analyses de matching CV/offre sont enregistrées côté serveur et consultables ici. Les lettres de motivation générées ne vivent que dans le navigateur de l'utilisateur et ne sont jamais sauvegardées. Les transcripts de négociation salariale sont désormais sauvegardés pour permettre de les reprendre, mais restent privés au compte de chaque utilisateur et ne sont pas consultables dans ce panneau admin.",
          search: "Rechercher par utilisateur, poste ou entreprise…",
          empty: "Aucune analyse trouvée.",
          score: "Score",
          strengths: "Points forts",
          missing: "Mots-clés manquants",
          recommendation: "Recommandation",
          for: "pour"
        };

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    getAdminAiSamples(user.id, { search })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <p className="muted">…</p>;

  const totalPages = Math.max(1, Math.ceil(data.items.length / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return (
    <section className="admin-ai-samples">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <p className="admin-finance-disclaimer muted">{copy.disclaimer}</p>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="admin-ai-sample-list">
        {pagedItems.length ? (
          pagedItems.map((item) => (
            <article key={item.id} className="admin-ai-sample-card">
              <div className="admin-ai-sample-head">
                <AvatarCircle
                  user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }}
                />
                <div>
                  <strong>
                    {item.userFirstName} {item.userLastName}
                  </strong>
                  <span className="muted">
                    {copy.for} {item.jobTitle}
                    {item.jobCompany ? ` · ${item.jobCompany}` : ""}
                  </span>
                </div>
                {item.score !== null ? (
                  <span className="admin-ai-sample-score">
                    {copy.score}: {item.score}/100
                  </span>
                ) : null}
                <span className="muted admin-ai-sample-date">{formatDate(item.createdAt)}</span>
              </div>

              {item.strengths.length ? (
                <p>
                  <strong>{copy.strengths} : </strong>
                  {item.strengths.join(", ")}
                </p>
              ) : null}
              {item.missingKeywords.length ? (
                <p>
                  <strong>{copy.missing} : </strong>
                  {item.missingKeywords.join(", ")}
                </p>
              ) : null}
              {item.recommendation ? (
                <p>
                  <strong>{copy.recommendation} : </strong>
                  {item.recommendation}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <p className="muted">{copy.empty}</p>
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={data.items.length} />
    </section>
  );
}
