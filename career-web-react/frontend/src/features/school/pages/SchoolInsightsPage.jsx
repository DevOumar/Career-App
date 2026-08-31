import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  getApiBase,
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
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolInsightsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Tracking & employability",
          subtitle: "Aggregated view of your students' match performance.",
          distribution: "Score distribution",
          missing: "Most common missing keywords",
          ranking: "Student ranking by score",
          emptyDistribution: "No score data yet",
          emptyDistributionHint: "This chart fills in as soon as your students run their first CV/offer matches.",
          emptyMissing: "No missing keywords yet",
          emptyMissingHint: "Recurring skill gaps across your students will show up here.",
          emptyRanking: "No ranking yet",
          emptyRankingHint: "Once students have a match score, they'll appear here ranked from best to worst fit.",
          allPromotions: "All promotions"
        }
      : {
          title: "Suivi & employabilité",
          subtitle: "Vue agrégée de la performance de matching de vos étudiants.",
          distribution: "Répartition des scores",
          missing: "Mots-clés manquants les plus fréquents",
          ranking: "Classement des étudiants par score",
          emptyDistribution: "Pas encore de score",
          emptyDistributionHint: "Ce graphique se remplit dès que vos étudiants lancent leurs premières analyses CV/offre.",
          emptyMissing: "Pas encore de mots-clés",
          emptyMissingHint: "Les manques récurrents de compétences chez vos étudiants apparaîtront ici.",
          emptyRanking: "Pas encore de classement",
          emptyRankingHint: "Dès qu'un étudiant obtient un score de matching, il apparaît ici classé du meilleur au moins bon.",
          allPromotions: "Toutes les promotions"
        };

  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [promotionId, setPromotionId] = useState("");

  useEffect(() => {
    getSchoolInsights(user.id, { promotionId })
      .then(setInsights)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, promotionId]);

  if (error) return <p className="field-error">{error}</p>;
  if (!insights) return <p className="muted">…</p>;

  const bucketEntries = Object.entries(insights.scoreBuckets || {});
  const maxBucket = Math.max(1, ...bucketEntries.map(([, count]) => count));
  const hasData = bucketEntries.some(([, count]) => count > 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        {insights.promotions?.length ? (
          <select
            className="school-insight-promotion-filter"
            value={promotionId}
            onChange={(event) => setPromotionId(event.target.value)}
          >
            <option value="">{copy.allPromotions}</option>
            {insights.promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>{promo.name}</option>
            ))}
          </select>
        ) : null}
      </header>

      <div className="admin-panel school-insight-panel">
        <h3>
          <span className="school-panel-icon">
            <UiIcon name="chart" />
          </span>
          {copy.distribution}
        </h3>
        {hasData ? (
          <div className="admin-trend-chart school-score-chart">
            {bucketEntries.map(([label, count]) => (
              <div key={label} className="admin-trend-bar-col">
                <div className="admin-trend-bar-track">
                  {count > 0 ? (
                    <div className="admin-trend-bar" style={{ height: `${Math.max(6, (count / maxBucket) * 100)}%` }}>
                      <span>{count}</span>
                    </div>
                  ) : null}
                </div>
                <span className="admin-trend-label">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="chart" title={copy.emptyDistribution} hint={copy.emptyDistributionHint} />
        )}
      </div>

      <div className="admin-panel-grid school-insight-grid">
        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="network" />
            </span>
            {copy.missing}
          </h3>
          {insights.topMissingKeywords?.length ? (
            <div className="admin-permission-tags">
              {insights.topMissingKeywords.map((item) => (
                <span key={item.keyword} className="tag">
                  {item.keyword} · {item.count}
                </span>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="network" title={copy.emptyMissing} hint={copy.emptyMissingHint} />
          )}
        </div>

        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="profile" />
            </span>
            {copy.ranking}
          </h3>
          {insights.ranking?.length ? (
            <div className="school-ranking-list">
              {insights.ranking.slice(0, 10).map((student, index) => (
                <div key={student.id} className="school-ranking-row">
                  <span className={`school-ranking-index ${index < 3 ? "top" : ""}`}>{index + 1}</span>
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="tag tag-success">{student.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="profile" title={copy.emptyRanking} hint={copy.emptyRankingHint} />
          )}
        </div>
      </div>
    </section>
  );
}
