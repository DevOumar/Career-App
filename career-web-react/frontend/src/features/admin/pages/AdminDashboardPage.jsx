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
import AdminInvestorMetrics from "./AdminInvestorMetrics.jsx";
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
  getAdminSchools,
  getAdminCabinets,
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
import { AdminLineIcon, JyBarChart, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

// Section « membres » d'une carte de rôle : pour chaque école / cabinet, ses
// étudiants ou candidats (3 visibles, puis « +N »). `orgs === null` tant que
// la liste n'est pas chargée (ou si le module n'est pas accessible).
const ROLE_MEMBERS_VISIBLE = 3;

function RoleMembers({ orgs, title, emptyLabel, memberWord, orgIcon, onOpen, language }) {
  if (!orgs) return null;
  const total = orgs.reduce((sum, org) => sum + org.members.length, 0);
  const fullName = (member) => `${member.firstName} ${member.lastName}`.trim() || member.email;

  return (
    <div className="jy-role-members">
      <div className="jy-role-members-head">
        <span>{title}</span>
        <strong>{total}</strong>
      </div>
      {total ? (
        orgs
          .filter((org) => org.members.length)
          .map((org) => (
            <div key={org.id} className="jy-role-org">
              <button type="button" className="jy-role-org-name" onClick={onOpen || undefined} disabled={!onOpen}>
                <span className="jy-role-org-logo">
                  {org.logoDataUrl ? <img src={org.logoDataUrl} alt="" /> : <AdminLineIcon name={orgIcon} />}
                </span>
                <span className="jy-role-org-label">{org.name}</span>
                <small>
                  {org.members.length} {memberWord}
                </small>
              </button>
              <ul>
                {org.members.slice(0, ROLE_MEMBERS_VISIBLE).map((member) => (
                  <li key={member.id}>
                    <AvatarCircle user={member} />
                    <span>{fullName(member)}</span>
                  </li>
                ))}
                {org.members.length > ROLE_MEMBERS_VISIBLE ? (
                  <li className="jy-role-more">
                    +{org.members.length - ROLE_MEMBERS_VISIBLE} {language === "en" ? "more" : "autre(s)"}
                  </li>
                ) : null}
              </ul>
            </div>
          ))
      ) : (
        <p className="jy-role-members-empty">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function AdminDashboardPage({ user, language, allowedModules = [], onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [recentUsers, setRecentUsers] = useState(null);
  // Membres rattachés à chaque organisation (étudiants d'une école,
  // candidats du vivier d'un cabinet), pour les cartes « Comptes par rôle ».
  const [orgMembers, setOrgMembers] = useState({ school: null, recruiter_firm: null });
  const [error, setError] = useState("");
  const [trendWeeks, setTrendWeeks] = useState(8);
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
          trend: "New signups, last 8 weeks",
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
          segmentBreakdown: "Candidates by origin",
          segmentSolo: "Solo candidates",
          segmentSchool: "School-linked",
          segmentAgency: "Agency-linked",
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
          trend: "Nouvelles inscriptions, 8 dernières semaines",
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
          segmentBreakdown: "Candidats par origine",
          segmentSolo: "Candidats solo",
          segmentSchool: "Rattachés à une école",
          segmentAgency: "Rattachés à un cabinet",
          latestUsers: "10 dernières inscriptions",
          colUser: "Utilisateur",
          colRole: "Rôle",
          colPlan: "Plan",
          colDate: "Inscription",
          noRecentUsers: "Aucune inscription pour le moment.",
          planFocus: "Vue des plans",
          activeSubscribers: "abonné(s) actif(s)"
        };

  // Teintes nettement distinctes (l'orange de la marque en tête) : deux plans
  // voisins dans l'anneau ne doivent jamais se confondre.
  const DONUT_COLORS = ["#b83309", "#3d5a80", "#a8792f", "#2f7a4f", "#7b4f9d", "#e08a5b", "#5f7f8f", "#b5485d"];

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
    // Chaque liste n'est chargée que si l'admin a accès au module concerné
    // (sinon le serveur refuserait) ; un échec laisse simplement la carte
    // sans la section membres.
    const hasModule = (id) => !allowedModules.length || allowedModules.includes(id);
    const toOrgs = (items, membersKey) =>
      (items || []).map((org) => ({
        id: org.id,
        name: org.name,
        logoDataUrl: org.logoDataUrl || "",
        members: (org[membersKey] || []).map((member) => ({
          id: member.id,
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          email: member.email || "",
          avatarDataUrl: member.avatarDataUrl || ""
        }))
      }));
    if (hasModule("schools")) {
      getAdminSchools(user.id, language)
        .then((data) => setOrgMembers((prev) => ({ ...prev, school: toOrgs(data?.items, "students") })))
        .catch(() => {});
    }
    if (hasModule("cabinets")) {
      getAdminCabinets(user.id, language)
        .then((data) => setOrgMembers((prev) => ({ ...prev, recruiter_firm: toOrgs(data?.items, "candidates") })))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <AdminPageLoader language={language} />;

  // Regroupe par plan RÉSOLU : un ancien identifiant (ex. school_license,
  // alias d'Institut) ne doit pas créer une deuxième ligne « Institut ».
  const planEntries = Object.entries(mergeByResolvedPlan(overview.planCounts)).sort((a, b) => b[1] - a[1]);
  const planSegments = planEntries.map(([planId, count], index) => ({
    label: getPlanById(planId)?.name?.[language] || planId,
    value: count,
    color: DONUT_COLORS[index % DONUT_COLORS.length]
  }));
  const activePlanTotal = planEntries.reduce((total, [, count]) => total + Number(count || 0), 0);



  const t = (fr, en) => (language === "en" ? en : fr);
  const can = (id) => !allowedModules.length || allowedModules.includes(id);
  const go = (id) => can(id) && onNavigate?.(id);
  const totalUsers =
    overview.totalUsers || Object.values(overview.usersByRole || {}).reduce((sum, count) => sum + Number(count || 0), 0);
  const conversion = Math.round((overview.conversionRate || 0) * 100);
  const revenueGrowth = overview.revenueGrowth == null ? null : Math.round(overview.revenueGrowth * 100);
  const seatsLabel = overview.licenseSeatsTotal ? `${overview.licenseSeatsUsed}/${overview.licenseSeatsTotal}` : "0/0";
  const seatsFull = overview.licenseSeatsTotal > 0 && overview.licenseSeatsUsed >= overview.licenseSeatsTotal;
  const today = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

  // Mini courbe des inscriptions (8 semaines) affichée dans la première carte.
  const trendValues = (overview.signupsTrend || []).map((point) => Number(point.count || 0));
  const trendMax = Math.max(1, ...trendValues);
  const sparkPoints = trendValues
    .map((value, index) => {
      const x = trendValues.length > 1 ? (index / (trendValues.length - 1)) * 320 : 0;
      const y = 44 - (value / trendMax) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const planMax = Math.max(1, ...planEntries.map(([, count]) => Number(count || 0)));

  const stats = [
    {
      id: "accounts",
      icon: "accounts",
      tone: "green",
      value: totalUsers,
      label: t("Comptes inscrits", "Registered accounts"),
      hint: t(`dont ${overview.signupsLast30Days || 0} ces 30 derniers jours`, `${overview.signupsLast30Days || 0} in the last 30 days`),
      viz: sparkPoints ? (
        <svg className="jy-stat-spark" viewBox="0 0 320 48" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={sparkPoints} />
        </svg>
      ) : null
    },
    {
      id: "adminCvs",
      icon: "adminCvs",
      tone: "blue",
      value: overview.totalCvs || 0,
      label: copy.cvs,
      hint: t(`${overview.totalMatchRuns || 0} analyses réalisées`, `${overview.totalMatchRuns || 0} matches run`)
    },
    {
      id: "pricing",
      icon: "pricing",
      tone: "gold",
      value: activePlanTotal,
      label: t("Abonnements actifs", "Active subscriptions"),
      hint: t(`conversion ${conversion} %`, `${conversion}% conversion`),
      viz: planEntries.length ? (
        <div className="jy-stat-bars" aria-hidden="true">
          {planEntries.map(([planId, count]) => (
            <span key={planId} style={{ height: `${Math.max(10, (Number(count || 0) / planMax) * 100)}%` }} />
          ))}
        </div>
      ) : null
    },
    {
      id: "finance",
      icon: "finance",
      tone: "gold",
      value: formatEur(overview.revenueThisMonth || 0, "EUR"),
      label: copy.revenueThisMonth,
      hint:
        revenueGrowth == null
          ? copy.revenueNoData
          : t(
              `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth} % vs mois dernier`,
              `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs last month`
            )
    }
  ];

  const figures = [
    { label: copy.conversionRate, value: `${conversion} %`, tone: "" },
    { label: copy.licenseUsage, value: seatsLabel, tone: "green" },
    { label: copy.pendingInvitations, value: overview.pendingInvitations || 0, tone: "gold" },
    { label: copy.inactiveAccounts, value: overview.inactiveAccounts || 0, tone: "" }
  ];

  return (
    <section className="admin-dashboard jy-dashboard">
      <header className="jy-hero">
        <div>
          <h1>
            {t("Bonjour", "Hello")} {user.firstName} {user.lastName}
          </h1>
          <p>{t("Voici l'activité de la plateforme aujourd'hui.", "Here is today's platform activity.")}</p>
        </div>
        {/* Simple repère de page, pas un lien. */}
        <span className="jy-page-tag">{t("Tableau de bord", "Dashboard")}</span>
      </header>

      <button type="button" className="jy-status" onClick={() => go("finance")} disabled={!can("finance")}>
        <span className="jy-status-main">
          <AdminLineIcon name="card" />
          <span>
            <strong>Career CV · {t("Plateforme en ligne", "Platform online")}</strong>
            <small>{today}</small>
          </span>
        </span>
        <span className="jy-status-meta">
          <span className="jy-status-item">
            <AdminLineIcon name="accounts" /> {totalUsers}
          </span>
          <span className="jy-status-item">
            <AdminLineIcon name="seat" /> {seatsLabel} {t("sièges", "seats")}
          </span>
          <span className={`jy-status-link ${seatsFull ? "warn" : ""}`}>
            {seatsFull ? t("Licences épuisées", "Licenses full") : t("Voir la finance", "View finance")}
          </span>
          <AdminLineIcon name="chevronRight" />
        </span>
      </button>

      <div className="jy-stats">
        {stats.map((stat) => (
          <button type="button" key={stat.id} className="jy-stat" onClick={() => go(stat.id)} disabled={!can(stat.id)}>
            <span className={`jy-stat-icon ${stat.tone}`}>
              <AdminLineIcon name={stat.icon} />
            </span>
            <strong className="jy-stat-value">{stat.value}</strong>
            <span className="jy-stat-label">{stat.label}</span>
            <small className="jy-stat-hint">{stat.hint}</small>
            {stat.viz ? <span className="jy-stat-viz">{stat.viz}</span> : null}
          </button>
        ))}
      </div>

      <div className="jy-card jy-growth">
        <div className="jy-card-head">
          <h3>{t("Croissance de la plateforme", "Platform growth")}</h3>
          <select
            className="jy-select"
            value={trendWeeks}
            onChange={(event) => setTrendWeeks(Number(event.target.value))}
            aria-label={t("Période", "Period")}
          >
            <option value={4}>{t("4 semaines", "4 weeks")}</option>
            <option value={8}>{t("8 semaines", "8 weeks")}</option>
          </select>
        </div>
        <div className="jy-figures">
          {figures.map((figure) => (
            <div key={figure.label} className="jy-figure">
              <span>{figure.label}</span>
              <strong className={figure.tone}>{figure.value}</strong>
            </div>
          ))}
        </div>
        <JyBarChart
          trend={(overview.signupsTrend || []).slice(-trendWeeks)}
          language={language}
          series={[
            { key: "count", label: t("Inscriptions", "Signups"), tone: "green" },
            { key: "paidCount", label: t("Comptes payants", "Paid accounts"), tone: "gold" }
          ]}
        />
        <p className="jy-card-foot">
          {copy.emailScoutSearches} : <strong>{overview.emailScoutSearches || 0}</strong>
        </p>
      </div>

      <AdminInvestorMetrics user={user} language={language} />

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.recentActivity}</h3>
            {can("activity") ? (
              <button type="button" className="jy-link" onClick={() => go("activity")}>
                {t("Tout voir", "See all")}
              </button>
            ) : null}
          </div>
          {recentActivity?.length ? (
            <div className="jy-feed">
              {recentActivity.map((event) => {
                const eventName = `${event.userFirstName || ""} ${event.userLastName || ""}`.trim();
                return (
                <div key={event.id} className="jy-feed-row">
                  {eventName || event.userAvatarDataUrl ? (
                    <AvatarCircle user={{ firstName: event.userFirstName, lastName: event.userLastName, avatarDataUrl: event.userAvatarDataUrl }} />
                  ) : (
                    <span className="jy-feed-ghost" aria-hidden="true">
                      <AdminLineIcon name="profile" />
                    </span>
                  )}
                  <div>
                    <strong>{eventName || t("Utilisateur supprimé", "Deleted user")}</strong>
                    <span>{eventTypeLabel(event.eventType, language)}</span>
                  </div>
                  <time>{formatDateTime(event.createdAt, language)}</time>
                </div>
                );
              })}
            </div>
          ) : (
            <p className="jy-empty">{recentActivity ? copy.noActivity : "…"}</p>
          )}
        </div>

        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.planDistribution}</h3>
            {can("pricing") ? (
              <button type="button" className="jy-link" onClick={() => go("pricing")}>
                {t("Tarifs", "Pricing")}
              </button>
            ) : null}
          </div>
          <AdminDonutChart segments={planSegments} emptyLabel={copy.noPlanData} />
        </div>
      </div>

      <div className="jy-card">
        <div className="jy-card-head">
          <h3>{copy.byRole}</h3>
          {can("accounts") ? (
            <button type="button" className="jy-link" onClick={() => go("accounts")}>
              {t("Gérer les comptes", "Manage accounts")}
            </button>
          ) : null}
        </div>
        <div className="jy-roles">
          {ADMIN_DASHBOARD_ROLES.map((role) => {
            const count = overview.usersByRole?.[role.id] || 0;
            const rolePlans = Object.entries(mergeByResolvedPlan(overview.planCountsByRole?.[role.id]));
            const roleIcon = role.id === "student" ? "profile" : role.id === "school" ? "schools" : "cabinets";
            return (
              <div key={role.id} className="jy-role">
                <div className="jy-role-head">
                  <span className="jy-stat-icon green">
                    <AdminLineIcon name={roleIcon} />
                  </span>
                  <div>
                    <strong>{count}</strong>
                    <span>{getAccountLabel(role.id, language)}</span>
                  </div>
                </div>
                <ul>
                  {rolePlans.length ? (
                    rolePlans.map(([planId, planCount]) => (
                      <li key={planId}>
                        <span>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</span>
                        <strong>{planCount}</strong>
                      </li>
                    ))
                  ) : (
                    <li className="jy-empty">{copy.noPlan}</li>
                  )}
                </ul>
                {role.id === "school" || role.id === "recruiter_firm" ? (
                  <RoleMembers
                    orgs={orgMembers[role.id]}
                    title={role.id === "school" ? t("Étudiants rattachés", "Linked students") : t("Candidats du vivier", "Talent pool")}
                    emptyLabel={role.id === "school" ? t("Aucun étudiant rattaché.", "No linked student.") : t("Aucun candidat dans le vivier.", "No candidate in the pool.")}
                    memberWord={role.id === "school" ? t("étudiant(s)", "student(s)") : t("candidat(s)", "candidate(s)")}
                    orgIcon={roleIcon}
                    onOpen={can(role.id === "school" ? "schools" : "cabinets") ? () => go(role.id === "school" ? "schools" : "cabinets") : null}
                    language={language}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="jy-grid-2 jy-grid-wide-left">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.latestUsers}</h3>
            <span className="jy-pill">{totalUsers}</span>
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
                        <td>{formatDateTime(item.createdAt, language)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="jy-empty">{recentUsers ? copy.noRecentUsers : "…"}</p>
          )}
        </div>

        <div className="jy-side-stack">
          <div className="jy-card">
            <div className="jy-card-head">
              <h3>{copy.segmentBreakdown}</h3>
            </div>
            <div className="jy-segments">
              {[
                { label: copy.segmentSolo, value: overview.candidateSegmentCounts?.solo || 0, icon: "profile" },
                { label: copy.segmentSchool, value: overview.candidateSegmentCounts?.school || 0, icon: "schools" },
                { label: copy.segmentAgency, value: overview.candidateSegmentCounts?.agency || 0, icon: "cabinets" }
              ].map((segment) => (
                <div key={segment.label} className="jy-segment">
                  <AdminLineIcon name={segment.icon} />
                  <span>{segment.label}</span>
                  <strong>{segment.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <h3>{copy.planFocus}</h3>
              <span className="jy-pill">{activePlanTotal}</span>
            </div>
            <div className="jy-plan-list">
              {planEntries.length ? (
                planEntries.map(([planId, count]) => {
                  const percent = activePlanTotal ? Math.round((Number(count || 0) / activePlanTotal) * 100) : 0;
                  return (
                    <div key={planId} className="jy-plan">
                      <div>
                        <strong>{getPlanById(planId)?.name?.[language] || getPlanById(planId)?.name?.fr || planId}</strong>
                        <em>{percent} %</em>
                      </div>
                      <span className="jy-meter-bar">
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <small>
                        {count} {copy.activeSubscribers}
                      </small>
                    </div>
                  );
                })
              ) : (
                <p className="jy-empty">{copy.noPlanData}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
