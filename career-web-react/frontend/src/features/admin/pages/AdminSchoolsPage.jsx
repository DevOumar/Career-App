import React from "react";
// Module Admin : vue plateforme des établissements — inexistante jusqu'ici,
// l'Admin ne pouvait piloter les écoles qu'une par une via Comptes/Licences.
import { AdminLineIcon, JyDrawer } from "../AdminApp.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { formatDateTime } from "../../../lib/format.js";
import { useState, useEffect } from "react";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { getAdminSchools, getAdminSchoolAnnouncements } from "../../../lib/inMemoryDb.js";

export default function AdminSchoolsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Schools",
          subtitle: "Platform-wide view of every institution: seats, students, alerts.",
          totalSchools: "Institutions",
          totalSeats: "Seats sold",
          totalStudents: "Students",
          colSchool: "Institution",
          colSeats: "Seats used",
          colStudents: "Students",
          colActivation: "Activation",
          colAvgScore: "Average score",
          colAlerts: "Alerts",
          colJoined: "Joined",
          empty: "No school account yet.",
          nearCapacity: "Near capacity",
          announcementsTitle: "Announcements sent (all schools)",
          announcementsEmpty: "No announcement sent by any school yet.",
          recipients: (n) => `${n} recipient(s)`
        }
      : {
          title: "Écoles",
          subtitle: "Vue plateforme de tous les établissements : sièges, étudiants, alertes.",
          totalSchools: "Établissements",
          totalSeats: "Sièges vendus",
          totalStudents: "Étudiants",
          colSchool: "Établissement",
          colSeats: "Sièges utilisés",
          colStudents: "Étudiants",
          colActivation: "Activation",
          colAvgScore: "Score moyen",
          colAlerts: "Alertes",
          colJoined: "Inscrit le",
          empty: "Aucun compte école pour le moment.",
          nearCapacity: "Proche saturation",
          announcementsTitle: "Annonces envoyées (toutes écoles)",
          announcementsEmpty: "Aucune annonce envoyée par une école pour le moment.",
          recipients: (n) => `${n} destinataire(s)`
        };

  const [data, setData] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSchools(user.id, language)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getAdminSchoolAnnouncements(user.id)
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
        <AdminKpiCard tone="primary" icon="profile" value={data.totalSchools} label={copy.totalSchools} />
        <AdminKpiCard tone="warning" icon="save" value={`${data.totalSeatsUsed}/${data.totalSeats}`} label={copy.totalSeats} />
        <AdminKpiCard tone="success" icon="chart" value={data.totalStudents} label={copy.totalStudents} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colSchool}</th>
              <th>{copy.colSeats}</th>
              <th>{copy.colStudents}</th>
              <th>{copy.colActivation}</th>
              <th>{copy.colAvgScore}</th>
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
                          {item.logoDataUrl ? <img src={item.logoDataUrl} alt="" /> : <AdminLineIcon name="schools" />}
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
                    <td>{item.studentCount}</td>
                    <td>{item.studentCount ? `${item.activationRate}%` : "-"}</td>
                    <td>{item.avgScore != null ? `${item.avgScore}%` : "-"}</td>
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
                    {item.schoolName} · {formatDateTime(item.createdAt, language)}
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
            {selectedOrg?.logoDataUrl ? <img src={selectedOrg.logoDataUrl} alt="" /> : <AdminLineIcon name="schools" />}
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
                    [language === "en" ? "Students" : "Étudiants", String(selectedOrg.studentCount ?? 0)],
                    [language === "en" ? "Activation rate" : "Taux d'activation", selectedOrg.studentCount ? `${selectedOrg.activationRate} %` : "-"],
                    [language === "en" ? "Average match score" : "Score moyen de matching", selectedOrg.avgScore != null ? `${selectedOrg.avgScore} %` : "-"]
                  ]
                },
                {
                  title: language === "en" ? "Organization" : "Établissement",
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
                {
                  title: `${language === "en" ? "Linked students" : "Étudiants rattachés"} (${selectedOrg.students?.length || 0})`,
                  content: selectedOrg.students?.length ? (
                    <ul className="jy-drawer-people">
                      {selectedOrg.students.map((student) => (
                        <li key={student.id}>
                          <AvatarCircle user={student} />
                          <div>
                            <strong>{`${student.firstName} ${student.lastName}`.trim() || student.email}</strong>
                            <span>{student.email}</span>
                            <small className="jy-person-meta">
                              {student.cvCount} CV · {student.matchCount} {language === "en" ? "analyses" : "analyses"}
                              {student.joinedAt ? ` · ${language === "en" ? "since" : "depuis le"} ${formatDateTime(student.joinedAt, language)}` : ""}
                            </small>
                          </div>
                          <span className="jy-person-tags">
                            {student.latestScore != null ? (
                              <span className={`tag ${student.latestScore >= 75 ? "tag-success" : student.latestScore < 50 ? "tag-danger" : "tag-warning"}`}>
                                {student.latestScore}/100
                              </span>
                            ) : null}
                            {student.inactive ? <span className="tag tag-danger">{language === "en" ? "Inactive" : "Inactif"}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="jy-drawer-empty">
                      {language === "en"
                        ? "No student yet. Students appear here once they redeem one of the school's license codes."
                        : "Aucun étudiant pour l'instant. Ils apparaissent ici dès qu'ils utilisent un code de licence de l'école."}
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
