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

export default function AdminQualityPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Extraction quality", subtitle: "CVs that deserve manual review before they damage matching quality.", search: "Search suspicious CVs…", needs: "Needs review", partial: "Partial", colCv: "CV", colUser: "User", colIssues: "Issues", colScore: "Quality", empty: "No quality issue detected." }
    : { title: "Qualité extraction", subtitle: "CV à contrôler manuellement avant qu'ils dégradent la qualité du matching.", search: "Rechercher les CV suspects…", needs: "À revoir", partial: "Partiels", colCv: "CV", colUser: "Utilisateur", colIssues: "Points à corriger", colScore: "Qualité", empty: "Aucun problème qualité détecté." };
  const [data, setData] = useState({ items: [], totals: {} });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminQuality(user.id, { search }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, language]);
  const t = (fr, en) => (language === "en" ? en : fr);
  const [view, setView] = useState("people");
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [selectedCv, setSelectedCv] = useState(null);
  const [busyId, setBusyId] = useState("");

  const issueLabel = (code) => cvIssueLabel(code, language);
  const issuesOf = (item) => [
    ...(item.missing || []).map((code) => ({ code, kind: "missing" })),
    ...(item.suspicious || []).map((code) => ({ code, kind: "suspicious" }))
  ];
  const scoreTone = (score) => (Number(score) >= 75 ? "tag-success" : Number(score) < 55 ? "tag-danger" : "tag-warning");

  function reload() {
    setLoading(true);
    getAdminQuality(user.id, { search })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)))
      .finally(() => setLoading(false));
  }

  async function handleReanalyze(item) {
    setBusyId(item.id);
    try {
      await reanalyzeAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: t("Supprimer ce CV ?", "Delete this CV?"),
      text: item.fileName,
      showCancelButton: true,
      confirmButtonText: t("Supprimer", "Delete"),
      cancelButtonText: t("Annuler", "Cancel"),
      confirmButtonColor: "#b3261e"
    });
    if (!result.isConfirmed) return;
    setBusyId(item.id);
    try {
      await deleteAdminCv({ adminUserId: user.id, cvId: item.id });
      setSelectedCv(null);
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  // Une ligne par candidat : ses CV à contrôler, du plus récent au plus ancien.
  const people = [];
  const personById = {};
  for (const item of [...data.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
    const key = item.userId || item.userEmail || item.id;
    if (!personById[key]) {
      personById[key] = { id: key, firstName: item.userFirstName || "", lastName: item.userLastName || "", email: item.userEmail || "", avatarDataUrl: item.userAvatarDataUrl || "", cvs: [] };
      people.push(personById[key]);
    }
    personById[key].cvs.push(item);
  }
  const personName = (person) => `${person.firstName} ${person.lastName}`.trim() || person.email || t("Compte supprimé", "Deleted account");
  const personIssues = (person) => {
    const counts = {};
    for (const cv of person.cvs) for (const issue of issuesOf(cv)) counts[issue.code] = (counts[issue.code] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };
  const selectedPerson = selectedPersonId ? personById[selectedPersonId] || null : null;
  const listLength = view === "people" ? people.length : data.items.length;
  const totalPages = Math.max(1, Math.ceil(listLength / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const pagedPeople = people.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  // Problèmes les plus fréquents, toutes personnes confondues.
  const globalIssues = {};
  for (const item of data.items) for (const issue of issuesOf(item)) globalIssues[issue.code] = (globalIssues[issue.code] || 0) + 1;
  const topIssues = Object.entries(globalIssues).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const issueMax = Math.max(1, ...topIssues.map(([, count]) => count));
  const averageQuality = data.items.length ? Math.round(data.items.reduce((sum, item) => sum + Number(item.score || 0), 0) / data.items.length) : null;

  const cards = [
    { icon: "alert", label: copy.needs, value: data.totals?.needsReview || 0, tone: "danger" },
    { icon: "quality", label: copy.partial, value: data.totals?.partial || 0, tone: "gold" },
    { icon: "accounts", label: t("Candidats concernés", "Candidates affected"), value: people.length, tone: "" },
    { icon: "trend", label: t("Qualité moyenne", "Average quality"), value: averageQuality == null ? "-" : `${averageQuality}/100`, tone: "green", bar: averageQuality }
  ];

  const cvCard = (cv, withActions) => (
    <li key={cv.id}>
      <div className="jy-cv-history-head">
        <span className="jy-cv-history-icon">
          <AdminLineIcon name="adminCvs" />
        </span>
        <div>
          <strong>{cv.fileName}</strong>
          <small>{formatDateTime(cv.createdAt, language)}</small>
        </div>
        <span className={`tag ${scoreTone(cv.score)}`}>{cv.score}/100</span>
      </div>
      {issuesOf(cv).length ? (
        <div className="jy-issue-list">
          {issuesOf(cv).map((issue) => (
            <span key={`${issue.kind}-${issue.code}`} className={`jy-issue ${issue.kind}`}>
              <AdminLineIcon name={issue.kind === "missing" ? "alert" : "help"} />
              {issueLabel(issue.code)}
            </span>
          ))}
        </div>
      ) : null}
      {withActions ? (
        <div className="jy-cv-history-actions">
          <button type="button" className="admin-row-action" disabled={busyId === cv.id} onClick={() => handleReanalyze(cv)}>
            <AdminLineIcon name="activity" /> {t("Réanalyser", "Reanalyze")}
          </button>
          <button type="button" className="admin-row-action danger" disabled={busyId === cv.id} onClick={() => handleDelete(cv)}>
            <AdminLineIcon name="trash" /> {t("Supprimer", "Delete")}
          </button>
        </div>
      ) : null}
    </li>
  );

  return (
    <section className="admin-quality admin-module-pro">
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
                <span style={{ width: `${Math.max(0, Math.min(100, Number(card.bar) || 0))}%` }} />
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {topIssues.length ? (
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{t("Problèmes les plus fréquents", "Most frequent issues")}</h3>
            <span className="jy-pill">{data.items.length} CV</span>
          </div>
          <ul className="jy-bar-list">
            {topIssues.map(([code, count]) => (
              <li key={code}>
                <span className="jy-bar-label">{issueLabel(code)}</span>
                <span className="jy-bar-track">
                  <span className="gold" style={{ width: `${Math.max(4, (count / issueMax) * 100)}%` }} />
                </span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="jy-seg jy-seg-counts" role="tablist">
        <button type="button" role="tab" aria-selected={view === "people"} className={view === "people" ? "active" : ""} onClick={() => { setView("people"); setPage(1); }}>
          <AdminLineIcon name="accounts" /> {t("Par candidat", "By candidate")} <span>({people.length})</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "all"} className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setPage(1); }}>
          <AdminLineIcon name="adminCvs" /> {t("Tous les CV", "All CVs")} <span>({data.items.length})</span>
        </button>
      </div>

      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}

      {!loading && view === "people" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colUser}</th>
                <th>{t("CV à contrôler", "CVs to check")}</th>
                <th>{t("Problèmes principaux", "Main issues")}</th>
                <th>{t("Pire qualité", "Lowest quality")}</th>
                <th>{t("Dernier import", "Latest import")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedPeople.length ? (
                pagedPeople.map((person) => {
                  const worst = Math.min(...person.cvs.map((cv) => Number(cv.score || 0)));
                  return (
                    <tr key={person.id} className={`jy-row-click ${selectedPersonId === person.id ? "is-selected" : ""}`} onClick={() => setSelectedPersonId(person.id)}>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={person} />
                          <div>
                            <strong>{personName(person)}</strong>
                            <span className="muted">{person.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="jy-count-pill">
                          <AdminLineIcon name="adminCvs" /> {person.cvs.length}
                        </span>
                      </td>
                      <td>
                        <div className="jy-issue-list">
                          {personIssues(person).slice(0, 3).map(([code, count]) => (
                            <span key={code} className="jy-issue suspicious">
                              {issueLabel(code)}
                              {count > 1 ? <em>×{count}</em> : null}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`tag ${scoreTone(worst)}`}>{worst}/100</span>
                      </td>
                      <td className="muted jy-nowrap">{formatDateTime(person.cvs[0].createdAt, language)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="admin-table-empty muted">{copy.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && view === "all" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{copy.colCv}</th>
                <th>{copy.colUser}</th>
                <th>{copy.colIssues}</th>
                <th>{copy.colScore}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length ? (
                pagedItems.map((item) => (
                  <tr key={item.id} className={`jy-row-click ${selectedCv?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedCv(item)}>
                    <td>
                      <strong>{item.fileName}</strong>
                      <span className="muted admin-block-muted">{formatDateTime(item.createdAt, language)}</span>
                    </td>
                    <td>
                      <div className="admin-table-name">
                        <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                        <div>
                          <strong>
                            {item.userFirstName} {item.userLastName}
                          </strong>
                          <span className="muted">{item.userEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="jy-issue-list">
                        {issuesOf(item).map((issue) => (
                          <span key={`${issue.kind}-${issue.code}`} className={`jy-issue ${issue.kind}`}>
                            {issueLabel(issue.code)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${scoreTone(item.score)}`}>{item.score}/100</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-table-empty muted">{copy.empty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={listLength} />

      <JyDrawer
        open={Boolean(selectedPerson)}
        onClose={() => setSelectedPersonId(null)}
        language={language}
        avatar={selectedPerson ? <AvatarCircle user={selectedPerson} /> : null}
        title={selectedPerson ? personName(selectedPerson) : ""}
        subtitle={selectedPerson?.email}
        badges={
          selectedPerson ? (
            <span className="tag tag-warning">
              {selectedPerson.cvs.length} {t("CV à contrôler", "CV(s) to check")}
            </span>
          ) : null
        }
        sections={
          selectedPerson
            ? [
                {
                  title: t("Problèmes relevés", "Issues found"),
                  content: (
                    <div className="jy-issue-list">
                      {personIssues(selectedPerson).map(([code, count]) => (
                        <span key={code} className="jy-issue suspicious">
                          {issueLabel(code)}
                          {count > 1 ? <em>×{count}</em> : null}
                        </span>
                      ))}
                    </div>
                  )
                },
                {
                  title: `${t("CV concernés", "Affected CVs")} (${selectedPerson.cvs.length})`,
                  content: <ol className="jy-cv-history">{selectedPerson.cvs.map((cv) => cvCard(cv, true))}</ol>
                }
              ]
            : []
        }
      />

      <JyDrawer
        open={Boolean(selectedCv)}
        onClose={() => setSelectedCv(null)}
        language={language}
        avatar={
          <span className="jy-inbox-avatar">
            <AdminLineIcon name="adminCvs" />
          </span>
        }
        title={selectedCv?.fileName || ""}
        subtitle={selectedCv ? `${`${selectedCv.userFirstName || ""} ${selectedCv.userLastName || ""}`.trim()} · ${formatDateTime(selectedCv.createdAt, language)}` : ""}
        badges={selectedCv ? <span className={`tag ${scoreTone(selectedCv.score)}`}>{selectedCv.score}/100</span> : null}
        sections={
          selectedCv
            ? [
                {
                  title: t("Points à corriger", "Issues to fix"),
                  content: <ol className="jy-cv-history">{cvCard(selectedCv, true)}</ol>
                },
                {
                  title: copy.colUser,
                  rows: [
                    [t("Nom", "Name"), `${selectedCv.userFirstName || ""} ${selectedCv.userLastName || ""}`.trim() || t("Compte supprimé", "Deleted account")],
                    [t("E-mail", "Email"), selectedCv.userEmail]
                  ]
                }
              ]
            : []
        }
      />
    </section>
  );
}
