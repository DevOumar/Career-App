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
import { AdminLineIcon, JyDrawer, AdminTrendChart, AdminDonutChart, AdminPagination, AdminOrgCard, AdminMiniMetric, formatEur, planPriceLabel, getPaginationRange, eventTypeLabel, adminNotificationText, getAllowedAdminModules, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS, ADMIN_DASHBOARD_ROLES, ADMIN_ACCOUNT_SUBTABS, ADMIN_PAGE_SIZE, ADMIN_FINANCE_SOURCES, ADMIN_EVENT_LABELS, ADMIN_ANNOUNCEMENT_AUDIENCES } from "../AdminApp.jsx";

export default function AdminMatchesPage({ user, language }) {
  const copy = language === "en"
    ? { title: "Analyzed jobs", subtitle: "CV/job matching history and market signals from real user analyses.", search: "Search by user, job, company…", avg: "Average score", skills: "Top skills", sectors: "Top sectors", colJob: "Job", colUser: "User", colAccount: "Account", colScore: "Score", colSignals: "Signals", empty: "No analyzed job yet.", allSegments: "All accounts", segmentSolo: "Solo candidate", segmentSchool: "School-linked", segmentAgency: "Agency-linked" }
    : { title: "Offres analysées", subtitle: "Historique des matchings CV/offres et signaux métier issus des vraies analyses.", search: "Rechercher par utilisateur, poste, entreprise…", avg: "Score moyen", skills: "Compétences demandées", sectors: "Secteurs fréquents", colJob: "Offre", colUser: "Utilisateur", colAccount: "Compte", colScore: "Score", colSignals: "Signaux", empty: "Aucune offre analysée.", allSegments: "Tous les comptes", segmentSolo: "Candidat solo", segmentSchool: "Rattaché école", segmentAgency: "Rattaché cabinet" };
  const [data, setData] = useState({ items: [], topSkills: [], topSectors: [], averageScore: null, segmentCounts: {} });
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  useEffect(() => {
    setPage(1);
    setLoading(true);
    getAdminMatches(user.id, { search, segment }).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language))).finally(() => setLoading(false));
  }, [user.id, search, segment, language]);
  const t = (fr, en) => (language === "en" ? en : fr);
  const [view, setView] = useState("people");
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const segmentLabel = (value) => (value === "school" ? copy.segmentSchool : value === "agency" ? copy.segmentAgency : copy.segmentSolo);
  const scoreTone = (score) => (score == null ? "" : Number(score) >= 75 ? "tag-success" : Number(score) < 50 ? "tag-danger" : "tag-warning");

  // Une ligne par candidat : ses analyses de la plus récente à la plus ancienne.
  const people = [];
  const personById = {};
  for (const item of [...data.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
    const key = item.userId || item.userEmail || item.id;
    if (!personById[key]) {
      personById[key] = {
        id: key,
        firstName: item.userFirstName || "",
        lastName: item.userLastName || "",
        email: item.userEmail || "",
        avatarDataUrl: item.userAvatarDataUrl || "",
        accountSegment: item.accountSegment,
        runs: []
      };
      people.push(personById[key]);
    }
    personById[key].runs.push(item);
  }
  const personName = (person) => `${person.firstName} ${person.lastName}`.trim() || person.email || t("Compte supprimé", "Deleted account");
  const personAverage = (person) => {
    const scores = person.runs.map((run) => Number(run.score)).filter((score) => Number.isFinite(score));
    return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  };
  const selectedPerson = selectedPersonId ? personById[selectedPersonId] || null : null;
  const listLength = view === "people" ? people.length : data.items.length;
  const totalPages = Math.max(1, Math.ceil(listLength / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const pagedPeople = people.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const scored = data.items.map((item) => Number(item.score)).filter((score) => Number.isFinite(score));
  const strongShare = scored.length ? Math.round((scored.filter((score) => score >= 75).length / scored.length) * 100) : 0;
  const topSkills = (data.topSkills || []).slice(0, 8);
  const topSectors = (data.topSectors || []).slice(0, 8);
  const skillMax = Math.max(1, ...topSkills.map((item) => item.count));
  const sectorMax = Math.max(1, ...topSectors.map((item) => item.count));

  const cards = [
    { icon: "trend", label: copy.avg, value: data.averageScore == null ? "-" : `${data.averageScore}/100`, tone: data.averageScore >= 75 ? "green" : data.averageScore < 50 ? "danger" : "gold", bar: data.averageScore },
    { icon: "adminMatches", label: t("Offres analysées", "Analyzed jobs"), value: data.items.length, tone: "" },
    { icon: "accounts", label: t("Candidats distincts", "Distinct candidates"), value: people.length, tone: "" },
    { icon: "quality", label: t("Matchings solides (≥ 75)", "Strong matches (≥ 75)"), value: `${strongShare} %`, tone: "green", bar: strongShare }
  ];

  const barList = (items, max, tone) =>
    items.length ? (
      <ul className="jy-bar-list">
        {items.map((item) => (
          <li key={item.name}>
            <span className="jy-bar-label" title={item.name}>
              {item.name}
            </span>
            <span className="jy-bar-track">
              <span className={tone} style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} />
            </span>
            <strong>{item.count}</strong>
          </li>
        ))}
      </ul>
    ) : (
      <p className="jy-empty">{t("Pas encore de données.", "No data yet.")}</p>
    );

  return (
    <section className="admin-matches admin-module-pro">
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

      <div className="jy-grid-2">
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.skills}</h3>
            <span className="jy-pill">Top {topSkills.length}</span>
          </div>
          {barList(topSkills, skillMax, "")}
        </div>
        <div className="jy-card">
          <div className="jy-card-head">
            <h3>{copy.sectors}</h3>
            <span className="jy-pill">Top {topSectors.length}</span>
          </div>
          {barList(topSectors, sectorMax, "gold")}
        </div>
      </div>

      <div className="admin-table-toolbar split">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">{copy.allSegments}</option>
          <option value="solo">{copy.segmentSolo} ({data.segmentCounts?.solo || 0})</option>
          <option value="school">{copy.segmentSchool} ({data.segmentCounts?.school || 0})</option>
          <option value="agency">{copy.segmentAgency} ({data.segmentCounts?.agency || 0})</option>
        </select>
      </div>

      <div className="jy-seg jy-seg-counts" role="tablist">
        <button type="button" role="tab" aria-selected={view === "people"} className={view === "people" ? "active" : ""} onClick={() => { setView("people"); setPage(1); }}>
          <AdminLineIcon name="accounts" /> {t("Par candidat", "By candidate")} <span>({people.length})</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "all"} className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setPage(1); }}>
          <AdminLineIcon name="adminMatches" /> {t("Toutes les analyses", "All analyses")} <span>({data.items.length})</span>
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
                <th>{copy.colAccount}</th>
                <th>{t("Analyses", "Analyses")}</th>
                <th>{t("Score moyen", "Average score")}</th>
                <th>{t("Dernière offre analysée", "Latest analyzed job")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedPeople.length ? (
                pagedPeople.map((person) => {
                  const latest = person.runs[0];
                  const average = personAverage(person);
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
                        <span className={`tag ${person.accountSegment === "school" ? "tag-success" : person.accountSegment === "agency" ? "tag-warning" : ""}`}>{segmentLabel(person.accountSegment)}</span>
                      </td>
                      <td>
                        <span className="jy-count-pill">
                          <AdminLineIcon name="adminMatches" /> {person.runs.length}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${scoreTone(average)}`}>{average == null ? "-" : `${average}/100`}</span>
                      </td>
                      <td>
                        <div className="admin-extract-preview">
                          <strong>{latest.title || "-"}</strong>
                          <span>
                            {[latest.company, latest.location].filter(Boolean).join(" · ") || t("Entreprise non précisée", "Company not specified")} · {formatDateTime(latest.createdAt, language)}
                          </span>
                        </div>
                      </td>
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
                <th>{copy.colJob}</th>
                <th>{copy.colUser}</th>
                <th>{copy.colAccount}</th>
                <th>{copy.colScore}</th>
                <th>{copy.colSignals}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length ? (
                pagedItems.map((item) => (
                  <tr key={item.id} className={`jy-row-click ${selectedMatch?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedMatch(item)}>
                    <td>
                      <strong>{item.title || "-"}</strong>
                      <span className="muted admin-block-muted">
                        {item.company || "-"} · {item.location || "-"} · {formatDateTime(item.createdAt, language)}
                      </span>
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
                      <span className={`tag ${item.accountSegment === "school" ? "tag-success" : item.accountSegment === "agency" ? "tag-warning" : ""}`}>{segmentLabel(item.accountSegment)}</span>
                    </td>
                    <td>
                      <span className={`tag ${scoreTone(item.score)}`}>{item.score == null ? "-" : `${item.score}/100`}</span>
                    </td>
                    <td>
                      <div className="admin-chip-cloud compact">
                        {[...item.technicalSkills.slice(0, 4), ...item.missingKeywords.slice(0, 3)].map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="admin-table-empty muted">{copy.empty}</td>
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
            <>
              <span className="tag">{segmentLabel(selectedPerson.accountSegment)}</span>
              <span className="tag tag-success">
                {selectedPerson.runs.length} {t("analyse(s)", "analysis(es)")}
              </span>
            </>
          ) : null
        }
        sections={
          selectedPerson
            ? [
                {
                  title: t("Synthèse", "Summary"),
                  content: (
                    <div className="jy-score-block">
                      <strong>
                        {personAverage(selectedPerson) == null ? "-" : personAverage(selectedPerson)}
                        <em className="jy-score-total">/100 · {t("score moyen", "average score")}</em>
                      </strong>
                      <span className="jy-progress jy-progress-wide">
                        <span style={{ width: `${personAverage(selectedPerson) || 0}%` }} />
                      </span>
                      <small>
                        {t("Première analyse", "First analysis")} : {formatDateTime(selectedPerson.runs[selectedPerson.runs.length - 1].createdAt, language)} ·{" "}
                        {t("dernière", "latest")} : {formatDateTime(selectedPerson.runs[0].createdAt, language)}
                      </small>
                    </div>
                  )
                },
                {
                  title: `${t("Historique des analyses", "Analysis history")} (${selectedPerson.runs.length})`,
                  content: (
                    <ol className="jy-cv-history">
                      {selectedPerson.runs.map((run) => (
                        <li key={run.id}>
                          <div className="jy-cv-history-head">
                            <span className="jy-cv-history-icon">
                              <AdminLineIcon name="adminMatches" />
                            </span>
                            <div>
                              <strong>{run.title || "-"}</strong>
                              <small>
                                {[run.company, run.location].filter(Boolean).join(" · ") || t("Entreprise non précisée", "Company not specified")} · {formatDateTime(run.createdAt, language)}
                              </small>
                            </div>
                            <span className={`tag ${scoreTone(run.score)}`}>{run.score == null ? "-" : `${run.score}/100`}</span>
                          </div>
                          {run.technicalSkills?.length ? (
                            <div className="admin-chip-cloud compact">
                              {run.technicalSkills.slice(0, 8).map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                            </div>
                          ) : null}
                          {run.missingKeywords?.length ? (
                            <div className="admin-chip-cloud compact is-missing">
                              {run.missingKeywords.slice(0, 6).map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )
                }
              ]
            : []
        }
      />

      <JyDrawer
        open={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        language={language}
        avatar={
          <span className="jy-inbox-avatar">
            <AdminLineIcon name="adminMatches" />
          </span>
        }
        title={selectedMatch?.title || "-"}
        subtitle={selectedMatch ? [selectedMatch.company, selectedMatch.location].filter(Boolean).join(" · ") : ""}
        badges={
          selectedMatch ? (
            <>
              <span className={`tag ${Number(selectedMatch.score) >= 75 ? "tag-success" : Number(selectedMatch.score) < 50 ? "tag-danger" : "tag-warning"}`}>
                {selectedMatch.score == null ? "-" : `${selectedMatch.score}/100`}
              </span>
              <span className="tag">
                {selectedMatch.accountSegment === "school" ? copy.segmentSchool : selectedMatch.accountSegment === "agency" ? copy.segmentAgency : copy.segmentSolo}
              </span>
            </>
          ) : null
        }
        sections={
          selectedMatch
            ? [
                {
                  title: copy.colScore,
                  content: (
                    <div className="jy-score-block">
                      <strong>{selectedMatch.score == null ? "-" : `${selectedMatch.score}/100`}</strong>
                      <span className="jy-progress jy-progress-wide">
                        <span style={{ width: `${Math.max(0, Math.min(100, Number(selectedMatch.score) || 0))}%` }} />
                      </span>
                    </div>
                  )
                },
                {
                  title: copy.colUser,
                  rows: [
                    [language === "en" ? "Name" : "Nom", `${selectedMatch.userFirstName || ""} ${selectedMatch.userLastName || ""}`.trim() || (language === "en" ? "Deleted account" : "Compte supprimé")],
                    [language === "en" ? "Email" : "E-mail", selectedMatch.userEmail],
                    [language === "en" ? "Analyzed on" : "Analysée le", formatDateTime(selectedMatch.createdAt, language)]
                  ]
                },
                selectedMatch.technicalSkills?.length
                  ? {
                      title: language === "en" ? "Matching skills" : "Compétences en phase",
                      content: (
                        <div className="admin-chip-cloud">
                          {selectedMatch.technicalSkills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      )
                    }
                  : null,
                selectedMatch.missingKeywords?.length
                  ? {
                      title: language === "en" ? "Missing keywords" : "Mots-clés manquants",
                      content: (
                        <div className="admin-chip-cloud is-missing">
                          {selectedMatch.missingKeywords.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      )
                    }
                  : null
              ]
            : []
        }
      />
    </section>
  );
}
