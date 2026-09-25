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
  const [view, setView] = useState("people");
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  useEffect(() => {
    setPage(1);
    getAdminAiSamples(user.id, { search })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, search]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const t = (fr, en) => (language === "en" ? en : fr);
  const scoreTone = (score) => (score == null ? "" : Number(score) >= 75 ? "tag-success" : Number(score) < 50 ? "tag-danger" : "tag-warning");

  // Une entrée par candidat, et pour chacun ses analyses regroupées par offre
  // (même poste + même entreprise) : on voit d'un coup d'œil les relances
  // successives sur la même offre au lieu de cartes répétées.
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
        runs: [],
        jobs: []
      };
      people.push(personById[key]);
    }
    const person = personById[key];
    person.runs.push(item);
    const jobKey = `${(item.jobTitle || "").trim().toLowerCase()}|${(item.jobCompany || "").trim().toLowerCase()}`;
    let job = person.jobs.find((entry) => entry.key === jobKey);
    if (!job) {
      job = { key: jobKey, title: item.jobTitle || t("Poste non précisé", "Unspecified job"), company: item.jobCompany || "", runs: [] };
      person.jobs.push(job);
    }
    job.runs.push(item);
  }
  const personName = (person) => `${person.firstName} ${person.lastName}`.trim() || person.email || t("Compte supprimé", "Deleted account");
  const scoresOf = (runs) => runs.map((run) => Number(run.score)).filter((score) => Number.isFinite(score));
  const average = (runs) => {
    const scores = scoresOf(runs);
    return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  };
  const selectedPerson = selectedPersonId ? personById[selectedPersonId] || null : null;
  const listLength = view === "people" ? people.length : data.items.length;
  const totalPages = Math.max(1, Math.ceil(listLength / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const pagedPeople = people.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const analysisDetail = (run) => (
    <div className="jy-analysis-detail">
      {run.strengths.length ? (
        <p>
          <strong>{copy.strengths}</strong>
          {run.strengths.join(" · ")}
        </p>
      ) : null}
      {run.missingKeywords.length ? (
        <div className="admin-chip-cloud compact is-missing">
          {run.missingKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      ) : null}
      {run.recommendation ? (
        <p className="jy-analysis-reco">
          <AdminLineIcon name="help" />
          <span>{run.recommendation}</span>
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="admin-ai-samples">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="jy-notice">
        <AdminLineIcon name="help" />
        <p>{copy.disclaimer}</p>
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      <div className="jy-seg jy-seg-counts" role="tablist">
        <button type="button" role="tab" aria-selected={view === "people"} className={view === "people" ? "active" : ""} onClick={() => { setView("people"); setPage(1); }}>
          <AdminLineIcon name="accounts" /> {t("Par candidat", "By candidate")} <span>({people.length})</span>
        </button>
        <button type="button" role="tab" aria-selected={view === "all"} className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setPage(1); }}>
          <AdminLineIcon name="aiSamples" /> {t("Toutes les analyses", "All analyses")} <span>({data.items.length})</span>
        </button>
      </div>

      {view === "people" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Candidat", "Candidate")}</th>
                <th>{t("Analyses", "Analyses")}</th>
                <th>{t("Offres distinctes", "Distinct jobs")}</th>
                <th>{t("Score moyen", "Average score")}</th>
                <th>{t("Dernière analyse", "Latest analysis")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedPeople.length ? (
                pagedPeople.map((person) => {
                  const latest = person.runs[0];
                  const avg = average(person.runs);
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
                          <AdminLineIcon name="aiSamples" /> {person.runs.length}
                        </span>
                      </td>
                      <td>
                        <div className="admin-extract-preview">
                          <strong>
                            {person.jobs.length} {t("offre(s)", "job(s)")}
                          </strong>
                          <span>{person.jobs.slice(0, 2).map((job) => [job.title, job.company].filter(Boolean).join(" · ")).join(", ")}{person.jobs.length > 2 ? "…" : ""}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`tag ${scoreTone(avg)}`}>{avg == null ? "-" : `${avg}/100`}</span>
                      </td>
                      <td className="muted jy-nowrap">{formatDateTime(latest.createdAt, language)}</td>
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
      ) : (
        <div className="admin-ai-sample-list">
          {pagedItems.length ? (
            pagedItems.map((item) => (
              <article key={item.id} className="admin-ai-sample-card jy-row-click" onClick={() => setSelectedPersonId(item.userId || item.userEmail || item.id)}>
                <div className="admin-ai-sample-head">
                  <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                  <div>
                    <strong>
                      {item.userFirstName} {item.userLastName}
                    </strong>
                    <span className="muted">
                      {copy.for} {item.jobTitle}
                      {item.jobCompany ? ` · ${item.jobCompany}` : ""}
                    </span>
                  </div>
                  {item.score !== null ? <span className={`tag ${scoreTone(item.score)}`}>{item.score}/100</span> : null}
                  <span className="muted admin-ai-sample-date">{formatDateTime(item.createdAt, language)}</span>
                </div>
                {analysisDetail(item)}
              </article>
            ))
          ) : (
            <p className="muted">{copy.empty}</p>
          )}
        </div>
      )}

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
              <span className="tag tag-success">
                {selectedPerson.runs.length} {t("analyse(s)", "analysis(es)")}
              </span>
              <span className="tag">
                {selectedPerson.jobs.length} {t("offre(s)", "job(s)")}
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
                        {average(selectedPerson.runs) ?? "-"}
                        <em className="jy-score-total">/100 · {t("score moyen", "average score")}</em>
                      </strong>
                      <span className="jy-progress jy-progress-wide">
                        <span style={{ width: `${average(selectedPerson.runs) || 0}%` }} />
                      </span>
                      <small>
                        {t("Première analyse", "First analysis")} : {formatDateTime(selectedPerson.runs[selectedPerson.runs.length - 1].createdAt, language)} · {t("dernière", "latest")} :{" "}
                        {formatDateTime(selectedPerson.runs[0].createdAt, language)}
                      </small>
                    </div>
                  )
                },
                ...selectedPerson.jobs.map((job) => {
                  const scores = scoresOf(job.runs);
                  const best = scores.length ? Math.max(...scores) : null;
                  return {
                    title: `${[job.title, job.company].filter(Boolean).join(" · ")} (${job.runs.length})`,
                    content: (
                      <ol className="jy-cv-history">
                        {job.runs.map((run, index) => (
                          <li key={run.id}>
                            <div className="jy-cv-history-head">
                              <span className="jy-cv-history-icon">
                                <AdminLineIcon name="aiSamples" />
                              </span>
                              <div>
                                <strong>
                                  {job.runs.length > 1 ? `${t("Analyse", "Analysis")} ${job.runs.length - index}` : t("Analyse", "Analysis")}
                                  {index === 0 && job.runs.length > 1 ? ` · ${t("la plus récente", "latest")}` : ""}
                                </strong>
                                <small>{formatDateTime(run.createdAt, language)}</small>
                              </div>
                              <span className={`tag ${scoreTone(run.score)}`}>
                                {run.score == null ? "-" : `${run.score}/100`}
                                {best != null && run.score === best && job.runs.length > 1 ? " ★" : ""}
                              </span>
                            </div>
                            {analysisDetail(run)}
                          </li>
                        ))}
                      </ol>
                    )
                  };
                })
              ]
            : []
        }
      />
    </section>
  );
}
