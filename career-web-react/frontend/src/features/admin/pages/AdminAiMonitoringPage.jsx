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
import { AdminLineIcon, JyDrawer, cvIssueLabel, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminAiMonitoringPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "AI monitoring",
        subtitle: "Operational view of extraction and matching reliability.",
        success: "Successful extractions",
        failed: "Needs review",
        partial: "Partial",
        runs: "Match analyses",
        cost: "Estimated cost",
        avg: "Average score",
        invalid: "Invalid responses / weak extractions",
        costVsRevenue: "AI cost vs revenue",
        costByModule: "Estimated cost by module",
        totalRevenue: "Total revenue collected",
        totalCost: "Total estimated AI cost",
        margin: "Estimated margin",
        marginRate: "Margin rate",
        moduleCv: "CV extraction",
        moduleMatching: "Job matching",
        moduleCoverLetter: "Cover letters",
        moduleNegotiation: "Salary negotiation",
        moduleInterview: "Interview simulator",
        moduleEmailScout: "Email Scout"
      }
    : {
        title: "Monitoring IA",
        subtitle: "Vue opérationnelle de la fiabilité extraction et matching.",
        success: "Extractions réussies",
        failed: "À revoir",
        partial: "Partielles",
        runs: "Analyses matching",
        cost: "Coût estimé",
        avg: "Score moyen",
        invalid: "Réponses invalides / extractions faibles",
        costVsRevenue: "Coût IA vs revenu",
        costByModule: "Coût estimé par module",
        totalRevenue: "Revenu total encaissé",
        totalCost: "Coût IA total estimé",
        margin: "Marge estimée",
        marginRate: "Taux de marge",
        moduleCv: "Extraction CV",
        moduleMatching: "Matching offres",
        moduleCoverLetter: "Lettres de motivation",
        moduleNegotiation: "Négociation salariale",
        moduleInterview: "Simulateur d'entretiens",
        moduleEmailScout: "Email Scout"
      };
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getAdminAiMonitoring(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const t = (fr, en) => (language === "en" ? en : fr);
  const euro = (value, digits = 2) => `${Number(value || 0).toLocaleString(language === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`;
  const totalExtractions = Number(data.successfulExtractions || 0) + Number(data.partialExtractions || 0) + Number(data.failedExtractions || 0);
  const successRate = totalExtractions ? Math.round((Number(data.successfulExtractions || 0) / totalExtractions) * 100) : 0;
  const revenue = Number(data.totalRevenueCollected || 0);
  const cost = Number(data.estimatedCost?.amount || 0);
  const margin = Number(data.estimatedMargin || 0);
  const costShare = revenue > 0 ? Math.min(100, (cost / revenue) * 100) : cost > 0 ? 100 : 0;

  const modules = [
    { key: "cv", label: copy.moduleCv, icon: "adminCvs" },
    { key: "matching", label: copy.moduleMatching, icon: "adminMatches" },
    { key: "interview", label: copy.moduleInterview, icon: "satisfaction" },
    { key: "coverLetter", label: copy.moduleCoverLetter, icon: "edit" },
    { key: "negotiation", label: copy.moduleNegotiation, icon: "finance" },
    { key: "emailScout", label: copy.moduleEmailScout, icon: "search" }
  ]
    .map((module) => ({ ...module, value: Number(data.costByModule?.[module.key] || 0) }))
    .sort((a, b) => b.value - a.value);
  const moduleMax = Math.max(0.0001, ...modules.map((module) => module.value));
  const moduleTotal = modules.reduce((sum, module) => sum + module.value, 0);

  const cards = [
    { icon: "quality", label: t("Taux de réussite", "Success rate"), value: `${successRate} %`, tone: "green", bar: successRate, hint: t(`${data.successfulExtractions} extractions réussies`, `${data.successfulExtractions} successful extractions`) },
    { icon: "alert", label: t("Extractions à surveiller", "Extractions to watch"), value: Number(data.partialExtractions || 0) + Number(data.failedExtractions || 0), tone: "danger", hint: t(`${data.partialExtractions} partielles · ${data.failedExtractions} à revoir`, `${data.partialExtractions} partial · ${data.failedExtractions} to review`) },
    { icon: "adminMatches", label: copy.runs, value: data.totalMatchRuns, tone: "", hint: t(`score moyen ${data.averageMatchScore == null ? "-" : `${data.averageMatchScore}/100`}`, `average score ${data.averageMatchScore == null ? "-" : `${data.averageMatchScore}/100`}`) },
    { icon: "finance", label: copy.cost, value: euro(cost, 3), tone: "gold", hint: t("tous modules confondus", "all modules combined") }
  ];

  const issuesOf = (item) => [
    ...(item.missing || []).map((code) => ({ code, kind: "missing" })),
    ...(item.suspicious || []).map((code) => ({ code, kind: "suspicious" }))
  ];
  const ownerName = (item) => `${item.userFirstName || ""} ${item.userLastName || ""}`.trim() || item.userEmail || t("Compte supprimé", "Deleted account");
  const qualityTone = (score) => (Number(score) >= 75 ? "tag-success" : Number(score) < 55 ? "tag-danger" : "tag-warning");
  // Regroupement par personne : un propriétaire = une ligne, ses CV dans le panneau.
  const owners = [];
  const ownerByKey = {};
  for (const item of [...(data.invalidResponses || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
    const key = item.userId || item.userEmail || item.id;
    if (!ownerByKey[key]) {
      ownerByKey[key] = { key, sample: item, cvs: [] };
      owners.push(ownerByKey[key]);
    }
    ownerByKey[key].cvs.push(item);
  }
  const ownerIssues = (owner) => {
    const counts = {};
    for (const cv of owner.cvs) for (const issue of issuesOf(cv)) counts[`${issue.kind}|${issue.code}`] = (counts[`${issue.kind}|${issue.code}`] || 0) + 1;
    return Object.entries(counts)
      .map(([key, count]) => ({ kind: key.split("|")[0], code: key.split("|")[1], count }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <section className="admin-ai-monitoring admin-module-pro">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
            {card.bar != null ? (
              <span className="jy-progress jy-progress-wide">
                <span style={{ width: `${card.bar}%` }} />
              </span>
            ) : null}
            <small className="jy-mini-card-hint">{card.hint}</small>
          </div>
        ))}
      </div>

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.costVsRevenue}</h3>
          </div>
          <div className="jy-figures jy-figures-3">
            <div className="jy-figure">
              <span>{t("Revenu encaissé", "Revenue collected")}</span>
              <strong>{euro(revenue)}</strong>
            </div>
            <div className="jy-figure">
              <span>{t("Coût IA", "AI cost")}</span>
              <strong className="gold">{euro(cost, 3)}</strong>
            </div>
            <div className="jy-figure">
              <span>{copy.margin}</span>
              <strong className={margin >= 0 ? "green" : "danger"}>{euro(margin)}</strong>
            </div>
          </div>
          <div className="jy-split-bar" aria-hidden="true">
            <span className="cost" style={{ width: `${Math.max(costShare, cost > 0 ? 1.5 : 0)}%` }} />
            <span className="margin" />
          </div>
          <div className="jy-split-legend">
            <span>
              <i className="cost" /> {t("Coût IA", "AI cost")} · {revenue > 0 ? `${costShare.toFixed(1)} %` : "-"}
            </span>
            <span>
              <i className="margin" /> {copy.margin} · {data.marginRate != null ? `${Math.round(data.marginRate * 100)} %` : "-"}
            </span>
          </div>
          <p className="jy-card-foot">
            {t(
              "Estimation : nombre d'appels IA enregistrés × coût moyen par appel, tous modules confondus.",
              "Estimate: recorded AI calls × average cost per call, all modules combined."
            )}
          </p>
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.costByModule}</h3>
            <span className="jy-pill">{euro(moduleTotal, 3)}</span>
          </div>
          <ul className="jy-bar-list jy-bar-list-icons">
            {modules.map((module) => (
              <li key={module.key}>
                <span className="jy-bar-label">
                  <AdminLineIcon name={module.icon} />
                  {module.label}
                </span>
                <span className="jy-bar-track">
                  <span className="gold" style={{ width: `${module.value > 0 ? Math.max(3, (module.value / moduleMax) * 100) : 0}%` }} />
                </span>
                <strong>{euro(module.value, 3)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="jy-card">
        <div className="jy-card-head">
          <h3>{copy.invalid}</h3>
          <span className="jy-pill">
            {owners.length} {t("personne(s)", "person(s)")} · {data.invalidResponses.length} CV
          </span>
        </div>
        {data.invalidResponses.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Utilisateur", "User")}</th>
                  <th>{t("CV concernés", "Affected CVs")}</th>
                  <th>{t("Points relevés", "Issues found")}</th>
                  <th>{t("Pire qualité", "Lowest quality")}</th>
                  <th>{t("Dernier import", "Latest import")}</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => {
                  const item = owner.sample;
                  const worst = Math.min(...owner.cvs.map((cv) => Number(cv.score || 0)));
                  return (
                    <tr key={owner.key} className={`jy-row-click ${selectedIssue?.key === owner.key ? "is-selected" : ""}`} onClick={() => setSelectedIssue(owner)}>
                      <td>
                        <div className="admin-table-name">
                          {item.userFirstName || item.userLastName || item.userAvatarDataUrl ? (
                            <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                          ) : (
                            <span className="jy-feed-ghost" aria-hidden="true">
                              <AdminLineIcon name="profile" />
                            </span>
                          )}
                          <div>
                            <strong>{ownerName(item)}</strong>
                            {item.userEmail ? <span className="muted">{item.userEmail}</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="jy-count-pill">
                          <AdminLineIcon name="adminCvs" /> {owner.cvs.length}
                        </span>
                      </td>
                      <td>
                        <div className="jy-issue-list">
                          {ownerIssues(owner).slice(0, 3).map((issue) => (
                            <span key={`${issue.kind}-${issue.code}`} className={`jy-issue ${issue.kind}`}>
                              {cvIssueLabel(issue.code, language)}
                              {issue.count > 1 ? <em>×{issue.count}</em> : null}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`tag ${qualityTone(worst)}`}>{worst}/100</span>
                      </td>
                      <td className="muted jy-nowrap">{formatDateTime(owner.cvs[0].createdAt, language)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="jy-empty">{t("Aucune anomalie détectée.", "No anomaly detected.")}</p>
        )}
      </div>

      <JyDrawer
        open={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
        language={language}
        avatar={
          selectedIssue && (selectedIssue.sample.userFirstName || selectedIssue.sample.userLastName || selectedIssue.sample.userAvatarDataUrl) ? (
            <AvatarCircle
              user={{ firstName: selectedIssue.sample.userFirstName, lastName: selectedIssue.sample.userLastName, avatarDataUrl: selectedIssue.sample.userAvatarDataUrl }}
            />
          ) : (
            <span className="jy-feed-ghost" aria-hidden="true">
              <AdminLineIcon name="profile" />
            </span>
          )
        }
        title={selectedIssue ? ownerName(selectedIssue.sample) : ""}
        subtitle={selectedIssue?.sample.userEmail}
        badges={
          selectedIssue ? (
            <span className="tag tag-warning">
              {selectedIssue.cvs.length} {t("CV à contrôler", "CV(s) to check")}
            </span>
          ) : null
        }
        sections={
          selectedIssue
            ? [
                {
                  title: t("Points relevés", "Issues found"),
                  content: (
                    <div className="jy-issue-list">
                      {ownerIssues(selectedIssue).map((issue) => (
                        <span key={`${issue.kind}-${issue.code}`} className={`jy-issue ${issue.kind}`}>
                          <AdminLineIcon name={issue.kind === "missing" ? "alert" : "help"} />
                          {cvIssueLabel(issue.code, language)}
                          {issue.count > 1 ? <em>×{issue.count}</em> : null}
                        </span>
                      ))}
                    </div>
                  )
                },
                {
                  title: `${t("CV concernés", "Affected CVs")} (${selectedIssue.cvs.length})`,
                  content: (
                    <ol className="jy-cv-history">
                      {selectedIssue.cvs.map((cv) => (
                        <li key={cv.id}>
                          <div className="jy-cv-history-head">
                            <span className="jy-cv-history-icon">
                              <AdminLineIcon name="adminCvs" />
                            </span>
                            <div>
                              <strong>{cv.fileName || t("CV sans nom", "Unnamed CV")}</strong>
                              <small>{formatDateTime(cv.createdAt, language)}</small>
                            </div>
                            <span className={`tag ${qualityTone(cv.score)}`}>{cv.score}/100</span>
                          </div>
                          <div className="jy-issue-list">
                            {issuesOf(cv).map((issue) => (
                              <span key={`${issue.kind}-${issue.code}`} className={`jy-issue ${issue.kind}`}>
                                {cvIssueLabel(issue.code, language)}
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )
                },
                {
                  title: t("Que faire ?", "What to do?"),
                  content: (
                    <p className="jy-drawer-empty">
                      {t(
                        "Ouvrez « Qualité extraction » pour réanalyser ou supprimer ces CV. Les éléments manquants (en rouge) empêchent un bon matching ; les éléments suspects (en or) sont à vérifier.",
                        "Open \"Extraction quality\" to reanalyze or delete these CVs. Missing items (red) prevent good matching; suspicious items (gold) should be checked."
                      )}
                    </p>
                  )
                }
              ]
            : []
        }
      />
    </section>
  );
}
