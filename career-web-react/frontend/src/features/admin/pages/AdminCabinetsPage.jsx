import React from "react";
// Module Admin : vue plateforme des cabinets de recrutement — miroir
// d'AdminSchoolsPage.jsx pour le segment agence.
import { AdminLineIcon, JyDrawer } from "../AdminApp.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { formatDateTime } from "../../../lib/format.js";
import { useState, useEffect } from "react";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getAdminCabinets, getAdminCabinetAnnouncements } from "../../../lib/inMemoryDb.js";

const CANDIDATE_STATUS_LABELS = {
  sourced: { fr: "Sourcé", en: "Sourced" },
  contacted: { fr: "Contacté", en: "Contacted" },
  interviewing: { fr: "En entretien", en: "Interviewing" },
  placed: { fr: "Placé", en: "Placed" },
  rejected: { fr: "Écarté", en: "Rejected" }
};

export default function AdminCabinetsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Cabinets",
          subtitle: "Platform-wide view of every recruitment firm: seats, pool, missions, alerts.",
          totalCabinets: "Firms",
          totalSeats: "Seats sold",
          totalCandidates: "Candidates in pools",
          totalMissions: "Missions",
          colCabinet: "Firm",
          colSeats: "Seats used",
          colRecruiters: "Recruiters",
          colCandidates: "Candidate pool",
          colMissions: "Missions",
          colAlerts: "Alerts",
          colJoined: "Joined",
          empty: "No cabinet account yet.",
          nearCapacity: "Near capacity",
          announcementsTitle: "Announcements sent (all cabinets)",
          announcementsEmpty: "No announcement sent by any cabinet yet.",
          recipients: (n) => `${n} recipient(s)`
        }
      : {
          title: "Cabinets",
          subtitle: "Vue plateforme de tous les cabinets de recrutement : sièges, vivier, missions, alertes.",
          totalCabinets: "Cabinets",
          totalSeats: "Sièges vendus",
          totalCandidates: "Candidats en vivier",
          totalMissions: "Missions",
          colCabinet: "Cabinet",
          colSeats: "Sièges utilisés",
          colRecruiters: "Recruteurs",
          colCandidates: "Vivier",
          colMissions: "Missions",
          colAlerts: "Alertes",
          colJoined: "Inscrit le",
          empty: "Aucun compte cabinet pour le moment.",
          nearCapacity: "Proche saturation",
          announcementsTitle: "Annonces envoyées (tous cabinets)",
          announcementsEmpty: "Aucune annonce envoyée par un cabinet pour le moment.",
          recipients: (n) => `${n} destinataire(s)`
        };

  const [data, setData] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminCabinets(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminCabinetAnnouncements(user.id)
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, [user.id, language]);

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard admin-schools">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="briefcase" value={data.totalCabinets} label={copy.totalCabinets} />
        <AdminKpiCard tone="warning" icon="save" value={`${data.totalSeatsUsed}/${data.totalSeats}`} label={copy.totalSeats} />
        <AdminKpiCard tone="success" icon="network" value={data.totalCandidates} label={copy.totalCandidates} />
        <AdminKpiCard tone="danger" icon="briefcase" value={data.totalMissions} label={copy.totalMissions} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colCabinet}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colRecruiters}</th>
              <th>{copy.colCandidates}</th>
              <th>{copy.colMissions}</th>
              <th>{copy.colAlerts}</th>
              <th>{copy.colJoined}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length ? (
              data.items.map((item) => {
                const remainingRatio = item.seatsTotal ? (item.seatsTotal - item.seatsUsed) / item.seatsTotal : 1;
                const nearCapacity = item.seatsTotal > 0 && remainingRatio <= 0.1;
                return (
                  <tr
                    key={item.id}
                    className={`jy-row-click ${selectedOrg?.id === item.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedOrg(item)}
                  >
                    <td>
                      <div className="jy-org-cell">
                        <span className="jy-org-cell-logo">
                          {item.logoDataUrl ? <img src={item.logoDataUrl} alt="" /> : <AdminLineIcon name="cabinets" />}
                        </span>
                        <div>
                          <strong>
                            {item.name}
                            {item.acronym ? <em> · {item.acronym}</em> : null}
                          </strong>
                          <div className="muted">{item.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.seatsUsed}/{item.seatsTotal}
                      {nearCapacity ? <span className="tag tag-danger" style={{ marginLeft: "0.5rem" }}>{copy.nearCapacity}</span> : null}
                    </td>
                    <td>{item.recruiterCount}</td>
                    <td>{item.candidateCount}</td>
                    <td>{item.openMissionCount}/{item.missionCount}</td>
                    <td>
                      {item.alertCount ? (
                        <span className="tag tag-danger">{item.alertCount}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="muted">{formatDateTime(item.createdAt, language)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-panel">
        <h3>{copy.announcementsTitle}</h3>
        {announcements?.length ? (
          <div className="school-report-list">
            {announcements.map((item) => (
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.subject}</strong>
                  <span className="muted">
                    {item.cabinetName} · {formatDateTime(item.createdAt, language)}
                  </span>
                </div>
                <span className="tag">{copy.recipients(item.recipientCount)}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.announcementsEmpty}</p>
        )}
      </div>

      <JyDrawer
        open={Boolean(selectedOrg)}
        onClose={() => setSelectedOrg(null)}
        language={language}
        avatar={
          <span className="jy-org-cell-logo is-large">
            {selectedOrg?.logoDataUrl ? <img src={selectedOrg.logoDataUrl} alt="" /> : <AdminLineIcon name="cabinets" />}
          </span>
        }
        title={selectedOrg?.name || ""}
        subtitle={selectedOrg ? [selectedOrg.acronym, selectedOrg.organizationType || selectedOrg.industry].filter(Boolean).join(" · ") || selectedOrg.email : ""}
        badges={
          selectedOrg ? (
            <>
              <span className={`tag ${selectedOrg.seatsTotal > 0 && (selectedOrg.seatsTotal - selectedOrg.seatsUsed) / selectedOrg.seatsTotal <= 0.1 ? "tag-danger" : "tag-success"}`}>
                {selectedOrg.seatsUsed}/{selectedOrg.seatsTotal} {language === "en" ? "seats" : "sièges"}
              </span>
              {selectedOrg.alertCount ? (
                <span className="tag tag-danger">
                  {selectedOrg.alertCount} {language === "en" ? "alert(s)" : "alerte(s)"}
                </span>
              ) : null}
            </>
          ) : null
        }
        sections={
          selectedOrg
            ? [
                {
                  title: language === "en" ? "Licenses" : "Licences",
                  content: (
                    <div className="jy-score-block">
                      <strong>
                        {selectedOrg.seatsUsed}
                        <em className="jy-score-total">/{selectedOrg.seatsTotal}</em>
                      </strong>
                      <span className="jy-progress jy-progress-wide">
                        <span style={{ width: `${selectedOrg.seatsTotal ? Math.min(100, (selectedOrg.seatsUsed / selectedOrg.seatsTotal) * 100) : 0}%` }} />
                      </span>
                      <small>
                        {Math.max(0, (selectedOrg.seatsTotal || 0) - (selectedOrg.seatsUsed || 0))} {language === "en" ? "seat(s) left" : "siège(s) disponible(s)"}
                      </small>
                    </div>
                  )
                },
                {
                  title: language === "en" ? "Activity" : "Activité",
                  rows: [
                    [language === "en" ? "Recruiters" : "Recruteurs", String(selectedOrg.recruiterCount ?? 0)],
                    [language === "en" ? "Candidate pool" : "Candidats en vivier", String(selectedOrg.candidateCount ?? 0)],
                    [language === "en" ? "Missions (open / total)" : "Missions (ouvertes / total)", `${selectedOrg.openMissionCount ?? 0} / ${selectedOrg.missionCount ?? 0}`]
                  ]
                },
                {
                  title: language === "en" ? "Organization" : "Cabinet",
                  rows: [
                    [language === "en" ? "Acronym" : "Sigle", selectedOrg.acronym],
                    [language === "en" ? "Type" : "Type", selectedOrg.organizationType],
                    [language === "en" ? "Industry" : "Secteur", selectedOrg.industry],
                    [
                      language === "en" ? "Website" : "Site web",
                      selectedOrg.website ? (
                        <a href={/^https?:\/\//i.test(selectedOrg.website) ? selectedOrg.website : `https://${selectedOrg.website}`} target="_blank" rel="noreferrer">
                          {selectedOrg.website.replace(/^https?:\/\//i, "")}
                        </a>
                      ) : ""
                    ],
                    [language === "en" ? "Address" : "Adresse", [selectedOrg.address, selectedOrg.city, selectedOrg.country].filter(Boolean).join(", ")],
                    [language === "en" ? "Email domain" : "Domaine e-mail", selectedOrg.emailDomain],
                    [language === "en" ? "Registered on" : "Inscrit le", formatDateTime(selectedOrg.createdAt, language)]
                  ]
                },
                {
                  title: language === "en" ? "Contact" : "Contact",
                  rows: [
                    [language === "en" ? "Main contact" : "Contact principal", selectedOrg.primaryContactName || selectedOrg.ownerName],
                    [language === "en" ? "Contact email" : "E-mail de contact", selectedOrg.contactEmail || selectedOrg.email],
                    [language === "en" ? "Phone" : "Téléphone", selectedOrg.contactPhone],
                    [language === "en" ? "Account email" : "E-mail du compte", selectedOrg.email]
                  ]
                },
                selectedOrg.recruiters?.length
                  ? {
                      title: language === "en" ? "Recruiters" : "Recruteurs",
                      content: (
                        <ul className="jy-drawer-people">
                          {selectedOrg.recruiters.map((recruiter) => (
                            <li key={recruiter.id || recruiter.email}>
                              <AvatarCircle user={{ firstName: recruiter.name.split(" ")[0], lastName: recruiter.name.split(" ").slice(1).join(" "), avatarDataUrl: recruiter.avatarDataUrl }} />
                              <div>
                                <strong>{recruiter.name || recruiter.email}</strong>
                                <span>{recruiter.email}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  : null,
                {
                  title: `${language === "en" ? "Candidate pool" : "Candidats en vivier"} (${selectedOrg.candidates?.length || 0})`,
                  content: selectedOrg.candidates?.length ? (
                    <ul className="jy-drawer-people">
                      {selectedOrg.candidates.map((candidate) => (
                        <li key={candidate.id}>
                          <AvatarCircle user={candidate} />
                          <div>
                            <strong>{`${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email || "-"}</strong>
                            <span>{[candidate.headline, candidate.email].filter(Boolean).join(" · ")}</span>
                            <small className="jy-person-meta">
                              {language === "en" ? "Added on" : "Ajouté le"} {formatDateTime(candidate.createdAt, language)}
                            </small>
                          </div>
                          <span className="jy-person-tags">
                            <span className={`tag ${candidate.status === "placed" ? "tag-success" : candidate.status === "rejected" ? "tag-danger" : candidate.status === "interviewing" ? "tag-warning" : ""}`}>
                              {CANDIDATE_STATUS_LABELS[candidate.status]?.[language] || CANDIDATE_STATUS_LABELS[candidate.status]?.fr || candidate.status}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="jy-drawer-empty">
                      {language === "en" ? "No candidate in the pool yet." : "Aucun candidat dans le vivier pour l'instant."}
                    </p>
                  )
                },
                selectedOrg.alerts?.length
                  ? {
                      title: language === "en" ? "Alerts" : "Alertes",
                      content: (
                        <ul className="jy-drawer-alerts">
                          {selectedOrg.alerts.map((alert) => (
                            <li key={alert.type || alert.title}>
                              <AdminLineIcon name="alert" />
                              <div>
                                <strong>{alert.title}</strong>
                                <span>{alert.body}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
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
