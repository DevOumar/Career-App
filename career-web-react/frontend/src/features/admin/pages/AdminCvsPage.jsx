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

export default function AdminCvsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Uploaded CVs",
          subtitle: "Every CV saved in the platform, with extraction status and quick actions.",
          search: "Search by user, file, skill…",
          all: "All statuses",
          extracted: "Extracted",
          partial: "Partial",
          needsReview: "Needs review",
          allSegments: "All accounts",
          segmentSolo: "Solo candidate",
          segmentSchool: "School-linked student",
          segmentAgency: "Agency-linked",
          colCv: "CV",
          colUser: "User",
          colAccount: "Account",
          colStatus: "Status",
          colData: "Extracted data",
          colActions: "Actions",
          reanalyze: "Reanalyze",
          delete: "Delete",
          empty: "No CV found."
        }
      : {
          title: "CV importés",
          subtitle: "Tous les CV enregistrés dans la plateforme, avec statut d'extraction et actions rapides.",
          search: "Rechercher par utilisateur, fichier, compétence…",
          all: "Tous les statuts",
          extracted: "Extrait",
          partial: "Partiel",
          needsReview: "À revoir",
          allSegments: "Tous les comptes",
          segmentSolo: "Candidat solo",
          segmentSchool: "Étudiant rattaché à une école",
          segmentAgency: "Rattaché à un cabinet",
          colCv: "CV",
          colUser: "Utilisateur",
          colAccount: "Compte",
          colStatus: "Statut",
          colData: "Données extraites",
          colActions: "Actions",
          reanalyze: "Réanalyser",
          delete: "Supprimer",
          empty: "Aucun CV trouvé."
        };
  const [data, setData] = useState({ items: [], statusCounts: {}, segmentCounts: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCv, setSelectedCv] = useState(null);
  // Vue « Par candidat » (une ligne par personne) ou « Tous les imports ».
  const [view, setView] = useState("people");
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  function reload() {
    setLoading(true);
    getAdminCvs(user.id, { search, status, segment })
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(1);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, segment]);

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
      title: language === "en" ? "Delete this CV?" : "Supprimer ce CV ?",
      text: item.fileName,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    setBusyId(item.id);
    try {
      await deleteAdminCv({ adminUserId: user.id, cvId: item.id });
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusyId("");
    }
  }

  const statusCopy = { extracted: copy.extracted, partial: copy.partial, needs_review: copy.needsReview };
  const segmentLabel = (value) => (value === "school" ? copy.segmentSchool : value === "agency" ? copy.segmentAgency : copy.segmentSolo);
  // Un groupe par personne : ses CV du plus récent au plus ancien.
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
        cvs: []
      };
      people.push(personById[key]);
    }
    personById[key].cvs.push(item);
  }
  const selectedPerson = selectedPersonId ? personById[selectedPersonId] || null : null;
  const listLength = view === "people" ? people.length : data.items.length;
  const totalPages = Math.max(1, Math.ceil(listLength / ADMIN_PAGE_SIZE));
  const pagedItems = data.items.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const pagedPeople = people.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const statusTone = (value) => (value === "extracted" ? "tag-success" : value === "needs_review" ? "tag-danger" : "tag-warning");
  const personName = (person) => `${person.firstName} ${person.lastName}`.trim() || person.email || (language === "en" ? "Deleted account" : "Compte supprimé");

  return (
    <section className="admin-cvs admin-module-pro">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="save" label={copy.extracted} value={data.statusCounts?.extracted || 0} tone="success" />
        <AdminMiniMetric icon="alert" label={copy.partial} value={data.statusCounts?.partial || 0} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.needsReview} value={data.statusCounts?.needs_review || 0} tone="danger" />
      </div>
      <div className="admin-table-toolbar split triple">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{copy.all}</option>
          <option value="extracted">{copy.extracted}</option>
          <option value="partial">{copy.partial}</option>
          <option value="needs_review">{copy.needsReview}</option>
        </select>
        <select value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">{copy.allSegments}</option>
          <option value="solo">{copy.segmentSolo} ({data.segmentCounts?.solo || 0})</option>
          <option value="school">{copy.segmentSchool} ({data.segmentCounts?.school || 0})</option>
          <option value="agency">{copy.segmentAgency} ({data.segmentCounts?.agency || 0})</option>
        </select>
      </div>
      <div className="jy-seg jy-seg-counts" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "people"}
          className={view === "people" ? "active" : ""}
          onClick={() => {
            setView("people");
            setPage(1);
          }}
        >
          <AdminLineIcon name="accounts" /> {language === "en" ? "By candidate" : "Par candidat"} <span>({people.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "all"}
          className={view === "all" ? "active" : ""}
          onClick={() => {
            setView("all");
            setPage(1);
          }}
        >
          <AdminLineIcon name="adminCvs" /> {language === "en" ? "All imports" : "Tous les imports"} <span>({data.items.length})</span>
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {loading ? <AdminPageLoader language={language} /> : null}
      {!loading && !error && view === "people" ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colUser}</th>
              <th>{copy.colAccount}</th>
              <th>{language === "en" ? "CVs" : "CV importés"}</th>
              <th>{language === "en" ? "Latest import" : "Dernier import"}</th>
              <th>{language === "en" ? "Latest CV" : "Dernier CV"}</th>
            </tr>
          </thead>
          <tbody>
            {pagedPeople.length ? pagedPeople.map((person) => {
              const latest = person.cvs[0];
              const toReview = person.cvs.filter((cv) => cv.status === "needs_review").length;
              return (
                <tr
                  key={person.id}
                  className={`jy-row-click ${selectedPersonId === person.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedPersonId(person.id)}
                >
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
                    <span className={`tag ${person.accountSegment === "school" ? "tag-success" : person.accountSegment === "agency" ? "tag-warning" : ""}`}>
                      {segmentLabel(person.accountSegment)}
                    </span>
                  </td>
                  <td>
                    <span className="jy-count-pill">
                      <AdminLineIcon name="adminCvs" /> {person.cvs.length}
                    </span>
                    {toReview ? (
                      <span className="tag tag-danger jy-inline-tag">
                        {toReview} {language === "en" ? "to review" : "à revoir"}
                      </span>
                    ) : null}
                  </td>
                  <td className="muted jy-nowrap">{formatDateTime(latest.createdAt, language)}</td>
                  <td>
                    <div className="admin-extract-preview">
                      <strong>{latest.preview.headline || latest.fileName}</strong>
                      <span>
                        <span className={`tag ${statusTone(latest.status)} jy-inline-tag`}>{statusCopy[latest.status] || latest.status}</span>{" "}
                        {latest.extraction.counts.skills} {language === "en" ? "skills" : "compétences"} · {latest.extraction.counts.experiences} exp.
                      </span>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="admin-table-empty muted">{copy.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
      {!loading && !error && view === "all" ? (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCv}</th>
              <th>{copy.colUser}</th>
              <th>{copy.colAccount}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colData}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pagedItems.length ? pagedItems.map((item) => (
              <tr
                key={item.id}
                className={`jy-row-click ${selectedCv?.id === item.id ? "is-selected" : ""}`}
                onClick={() => setSelectedCv(item)}
              >
                <td>
                  <strong>{item.fileName}</strong>
                  <span className="muted admin-block-muted">{formatDateTime(item.createdAt, language)} · {item.characterCount} car.</span>
                </td>
                <td>
                  <div className="admin-table-name">
                    <AvatarCircle user={{ firstName: item.userFirstName, lastName: item.userLastName, avatarDataUrl: item.userAvatarDataUrl }} />
                    <div>
                      <strong>{item.userFirstName} {item.userLastName}</strong>
                      <span className="muted">{item.userEmail}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`tag ${item.accountSegment === "school" ? "tag-success" : item.accountSegment === "agency" ? "tag-warning" : ""}`}>
                    {item.accountSegment === "school" ? copy.segmentSchool : item.accountSegment === "agency" ? copy.segmentAgency : copy.segmentSolo}
                  </span>
                </td>
                <td><span className={`tag ${item.status === "extracted" ? "tag-success" : item.status === "needs_review" ? "tag-danger" : ""}`}>{statusCopy[item.status] || item.status}</span></td>
                <td>
                  <div className="admin-extract-preview">
                    <strong>{item.preview.headline || `${item.preview.firstName} ${item.preview.lastName}`.trim() || "-"}</strong>
                    <span>{item.extraction.counts.skills} skills · {item.extraction.counts.experiences} exp. · {item.extraction.counts.education} formations</span>
                    <small>{item.preview.skills.slice(0, 5).join(", ")}</small>
                  </div>
                </td>
                <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                  <div className="admin-row-actions" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="admin-row-action icon-only" title={copy.reanalyze} aria-label={copy.reanalyze} disabled={busyId === item.id} onClick={() => handleReanalyze(item)}>
                      <AdminLineIcon name="activity" />
                    </button>
                    <button type="button" className="admin-row-action danger icon-only" title={copy.delete} aria-label={copy.delete} disabled={busyId === item.id} onClick={() => handleDelete(item)}>
                      <AdminLineIcon name="trash" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="admin-table-empty muted">{copy.empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}
      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={listLength} />

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
        subtitle={selectedCv ? `${formatDateTime(selectedCv.createdAt, language)} · ${selectedCv.characterCount} ${language === "en" ? "characters" : "caractères"}` : ""}
        badges={
          selectedCv ? (
            <>
              <span className={`tag ${selectedCv.status === "extracted" ? "tag-success" : selectedCv.status === "needs_review" ? "tag-danger" : "tag-warning"}`}>
                {statusCopy[selectedCv.status] || selectedCv.status}
              </span>
              <span className="tag">{segmentLabel(selectedCv.accountSegment)}</span>
            </>
          ) : null
        }
        sections={
          selectedCv
            ? [
                {
                  title: copy.colUser,
                  rows: [
                    [language === "en" ? "Name" : "Nom", `${selectedCv.userFirstName || ""} ${selectedCv.userLastName || ""}`.trim() || (language === "en" ? "Deleted account" : "Compte supprimé")],
                    [language === "en" ? "Email" : "E-mail", selectedCv.userEmail],
                    [copy.colAccount, segmentLabel(selectedCv.accountSegment)]
                  ]
                },
                {
                  title: copy.colData,
                  rows: [
                    [language === "en" ? "Headline" : "Titre", selectedCv.preview?.headline || "-"],
                    [language === "en" ? "Skills" : "Compétences", String(selectedCv.extraction?.counts?.skills ?? 0)],
                    [language === "en" ? "Experiences" : "Expériences", String(selectedCv.extraction?.counts?.experiences ?? 0)],
                    [language === "en" ? "Education" : "Formations", String(selectedCv.extraction?.counts?.education ?? 0)]
                  ]
                },
                selectedCv.preview?.skills?.length
                  ? {
                      title: language === "en" ? "Detected skills" : "Compétences détectées",
                      content: (
                        <div className="admin-chip-cloud">
                          {selectedCv.preview.skills.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      )
                    }
                  : null
              ]
            : []
        }
        footer={
          selectedCv ? (
            <>
              <button
                type="button"
                className="admin-row-action"
                disabled={busyId === selectedCv.id}
                onClick={() => {
                  const target = selectedCv;
                  setSelectedCv(null);
                  handleReanalyze(target);
                }}
              >
                <AdminLineIcon name="activity" /> {copy.reanalyze}
              </button>
              <button
                type="button"
                className="admin-row-action danger"
                disabled={busyId === selectedCv.id}
                onClick={() => {
                  const target = selectedCv;
                  setSelectedCv(null);
                  handleDelete(target);
                }}
              >
                <AdminLineIcon name="trash" /> {copy.delete}
              </button>
            </>
          ) : null
        }
      />

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
                {selectedPerson.cvs.length} {language === "en" ? "CV(s) imported" : "CV importé(s)"}
              </span>
            </>
          ) : null
        }
        sections={
          selectedPerson
            ? [
                {
                  title: language === "en" ? "Summary" : "Synthèse",
                  rows: [
                    [language === "en" ? "First import" : "Premier import", formatDateTime(selectedPerson.cvs[selectedPerson.cvs.length - 1].createdAt, language)],
                    [language === "en" ? "Latest import" : "Dernier import", formatDateTime(selectedPerson.cvs[0].createdAt, language)],
                    [language === "en" ? "Extracted" : "Extraits", String(selectedPerson.cvs.filter((cv) => cv.status === "extracted").length)],
                    [language === "en" ? "Partial" : "Partiels", String(selectedPerson.cvs.filter((cv) => cv.status === "partial").length)],
                    [language === "en" ? "To review" : "À revoir", String(selectedPerson.cvs.filter((cv) => cv.status === "needs_review").length)]
                  ]
                },
                {
                  title: `${language === "en" ? "CV history" : "Historique des CV"} (${selectedPerson.cvs.length})`,
                  content: (
                    <ol className="jy-cv-history">
                      {selectedPerson.cvs.map((cv, index) => (
                        <li key={cv.id}>
                          <div className="jy-cv-history-head">
                            <span className="jy-cv-history-icon">
                              <AdminLineIcon name="adminCvs" />
                            </span>
                            <div>
                              <strong>{cv.fileName}</strong>
                              <small>
                                {formatDateTime(cv.createdAt, language)} · {cv.characterCount} {language === "en" ? "characters" : "caractères"}
                                {index === 0 ? ` · ${language === "en" ? "latest" : "le plus récent"}` : ""}
                              </small>
                            </div>
                            <span className={`tag ${statusTone(cv.status)}`}>{statusCopy[cv.status] || cv.status}</span>
                          </div>
                          <p className="jy-cv-history-data">
                            {cv.preview.headline ? <strong>{cv.preview.headline}</strong> : null}
                            <span>
                              {cv.extraction.counts.skills} {language === "en" ? "skills" : "compétences"} · {cv.extraction.counts.experiences}{" "}
                              {language === "en" ? "experiences" : "expériences"} · {cv.extraction.counts.education} {language === "en" ? "education" : "formations"}
                            </span>
                          </p>
                          {cv.preview.skills?.length ? (
                            <div className="admin-chip-cloud compact">
                              {cv.preview.skills.slice(0, 8).map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                            </div>
                          ) : null}
                          <div className="jy-cv-history-actions">
                            <button type="button" className="admin-row-action" disabled={busyId === cv.id} onClick={() => handleReanalyze(cv)}>
                              <AdminLineIcon name="activity" /> {copy.reanalyze}
                            </button>
                            <button type="button" className="admin-row-action danger" disabled={busyId === cv.id} onClick={() => handleDelete(cv)}>
                              <AdminLineIcon name="trash" /> {copy.delete}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )
                }
              ]
            : []
        }
      />
    </section>
  );
}
