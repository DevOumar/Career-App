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

export default function AdminDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [recentUsers, setRecentUsers] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators across the platform.",
          byRole: "Accounts by role",
          cvs: "CVs imported",
          matches: "Matches run",
          signups: "Signups (last 30 days)",
          plans: "Active plans",
          trend: "New signups — last 8 weeks",
          noPlan: "No active plan",
          recentActivity: "Recent activity",
          noActivity: "No activity recorded yet.",
          planDistribution: "Active plans breakdown",
          noPlanData: "No active plan yet.",
          conversionRate: "Free to paid conversion",
          revenueThisMonth: "Revenue this month",
          revenueNoData: "No revenue last month to compare",
          licenseUsage: "License seats used",
          licenseNoSeats: "No license sold yet",
          pendingInvitations: "Pending school invitations",
          emailScoutSearches: "Email Scout searches",
          inactiveAccounts: "Inactive accounts (30d+)",
          latestUsers: "Last 10 signups",
          colUser: "User",
          colRole: "Role",
          colPlan: "Plan",
          colDate: "Signup date",
          noRecentUsers: "No signup yet.",
          planFocus: "Plan overview",
          activeSubscribers: "active subscriber(s)"
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de la plateforme.",
          byRole: "Comptes par rôle",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          signups: "Inscriptions (30 derniers jours)",
          plans: "Plans actifs",
          trend: "Nouvelles inscriptions — 8 dernières semaines",
          noPlan: "Aucun plan actif",
          recentActivity: "Activité récente",
          noActivity: "Aucune activité enregistrée pour l'instant.",
          planDistribution: "Répartition des plans actifs",
          noPlanData: "Aucun plan actif pour l'instant.",
          conversionRate: "Conversion gratuit vers payant",
          revenueThisMonth: "Revenu ce mois-ci",
          revenueNoData: "Aucun revenu le mois dernier pour comparer",
          licenseUsage: "Sièges de licence utilisés",
          licenseNoSeats: "Aucune licence vendue pour l'instant",
          pendingInvitations: "Invitations école en attente",
          emailScoutSearches: "Recherches Email Scout",
          inactiveAccounts: "Comptes inactifs (30j+)",
          latestUsers: "10 dernières inscriptions",
          colUser: "Utilisateur",
          colRole: "Rôle",
          colPlan: "Plan",
          colDate: "Inscription",
          noRecentUsers: "Aucune inscription pour le moment.",
          planFocus: "Vue des plans",
          activeSubscribers: "abonné(s) actif(s)"
        };

  const DONUT_COLORS = [
    "var(--primary)",
    "var(--success)",
    "var(--warning)",
    "var(--danger)",
    "var(--primary-2)"
  ];

  useEffect(() => {
    getAdminOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminActivityLog(user.id)
      .then((data) => setRecentActivity(data.items.slice(0, 5)))
      .catch(() => setRecentActivity([]));
    listAdminUsers(user.id)
      .then((items) => {
        const latest = [...items]
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
        setRecentUsers(latest);
      })
      .catch(() => setRecentUsers([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <p className="muted">…</p>;

  const planEntries = Object.entries(overview.planCounts || {});
  const planSegments = planEntries.map(([planId, count], index) => ({
    label: getPlanById(planId)?.name?.[language] || planId,
    value: count,
    color: DONUT_COLORS[index % DONUT_COLORS.length]
  }));
  const activePlanTotal = planEntries.reduce((total, [, count]) => total + Number(count || 0), 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard tone="success" icon="profile" value={overview.signupsLast30Days} label={copy.signups} />
        <AdminKpiCard tone="danger" icon="pricetag" value={activePlanTotal} label={copy.plans} />
      </div>

      <div className="admin-kpi-grid admin-kpi-grid-secondary">
        <AdminKpiCard
          tone="primary"
          icon="scale"
          value={`${Math.round((overview.conversionRate || 0) * 100)}%`}
          label={copy.conversionRate}
        />
        <AdminKpiCard
          tone="success"
          icon="pricetag"
          value={formatEur(overview.revenueThisMonth, "EUR")}
          label={
            overview.revenueGrowth == null
              ? copy.revenueThisMonth
              : `${copy.revenueThisMonth} (${overview.revenueGrowth >= 0 ? "+" : ""}${Math.round(overview.revenueGrowth * 100)}%)`
          }
        />
        <AdminKpiCard
          tone="warning"
          icon="shield"
          value={overview.licenseSeatsTotal ? `${overview.licenseSeatsUsed}/${overview.licenseSeatsTotal}` : "—"}
          label={copy.licenseUsage}
        />
        <AdminKpiCard tone="primary" icon="mail" value={overview.pendingInvitations} label={copy.pendingInvitations} />
        <AdminKpiCard tone="success" icon="network" value={overview.emailScoutSearches} label={copy.emailScoutSearches} />
        <AdminKpiCard tone="warning" icon="alert" value={overview.inactiveAccounts} label={copy.inactiveAccounts} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          <AdminTrendChart trend={overview.signupsTrend} language={language} />
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentActivity}</h3>
          {recentActivity?.length ? (
            <div className="admin-recent-activity">
              {recentActivity.map((event) => (
                <div key={event.id} className="admin-recent-activity-row">
                  <AvatarCircle user={{ firstName: event.userFirstName, lastName: event.userLastName, avatarDataUrl: event.userAvatarDataUrl }} />
                  <div>
                    <strong>
                      {event.userFirstName} {event.userLastName}
                    </strong>
                    <span className="muted">{eventTypeLabel(event.eventType, language)}</span>
                  </div>
                  <span className="admin-recent-activity-time">{formatDate(event.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : recentActivity ? (
            <p className="muted">{copy.noActivity}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.planDistribution}</h3>
          <AdminDonutChart segments={planSegments} emptyLabel={copy.noPlanData} />
        </div>
      </div>

      <div className="admin-role-grid">
        {ADMIN_DASHBOARD_ROLES.map((role) => {
          const count = overview.usersByRole?.[role.id] || 0;
          const rolePlans = Object.entries(overview.planCountsByRole?.[role.id] || {});
          return (
            <div key={role.id} className="admin-role-card" style={{ "--role-color": role.color }}>
              <div className="admin-role-card-head">
                <span className="admin-role-icon">
                  <UiIcon name={role.icon} />
                </span>
                <div>
                  <span className="admin-role-count">{count}</span>
                  <span className="admin-role-label">{getAccountLabel(role.id, language)}</span>
                </div>
              </div>
              <ul className="admin-role-plan-list">
                {rolePlans.length ? (
                  rolePlans.map(([planId, planCount]) => (
                    <li key={planId}>
                      <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                      <strong>{planCount}</strong>
                    </li>
                  ))
                ) : (
                  <li className="muted">{copy.noPlan}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="admin-dashboard-insights">
        <div className="admin-panel admin-latest-users-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.latestUsers}</h3>
            <span>{overview.totalUsers || recentUsers?.length || 0}</span>
          </div>
          {recentUsers?.length ? (
            <div className="admin-table-wrap compact">
              <table className="admin-table admin-latest-users-table">
                <thead>
                  <tr>
                    <th>{copy.colUser}</th>
                    <th>{copy.colRole}</th>
                    <th>{copy.colPlan}</th>
                    <th>{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((item) => {
                    const plan = item.planId ? getPlanById(item.planId) : null;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="admin-latest-user-cell">
                            <AvatarCircle user={item} />
                            <div>
                              <strong>
                                {item.firstName} {item.lastName}
                              </strong>
                              <span>{item.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{getAccountLabel(item.roleType, language)}</td>
                        <td>
                          <span className={`status-pill ${plan ? "active" : "neutral"}`}>
                            {plan?.name?.[language] || plan?.name?.fr || copy.noPlan}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : recentUsers ? (
            <p className="muted">{copy.noRecentUsers}</p>
          ) : (
            <p className="muted">…</p>
          )}
        </div>

        <div className="admin-panel admin-plan-focus-panel">
          <div className="admin-panel-title-row">
            <h3>{copy.planFocus}</h3>
            <span>{activePlanTotal} {copy.activeSubscribers}</span>
          </div>
          <div className="admin-plan-focus-list">
            {planEntries.length ? (
              planEntries.map(([planId, count]) => {
                const percent = activePlanTotal ? Math.round((Number(count || 0) / activePlanTotal) * 100) : 0;
                return (
                  <div key={planId} className="admin-plan-focus-item">
                    <div>
                      <strong>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</strong>
                      <span>{count} {copy.activeSubscribers}</span>
                    </div>
                    <div className="admin-plan-focus-meter" style={{ "--pct": `${percent}%` }}>
                      <span />
                    </div>
                    <em>{percent}%</em>
                  </div>
                );
              })
            ) : (
              <p className="muted">{copy.noPlanData}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
