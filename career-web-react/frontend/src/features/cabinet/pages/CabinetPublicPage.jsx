import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { formatDate } from "../../../lib/format.js";
import { getPublicCabinetPage } from "../../../lib/inMemoryDb.js";

const CONTRACTS = { cdi: { fr: "CDI", en: "Permanent" }, cdd: { fr: "CDD", en: "Fixed-term" }, freelance: { fr: "Freelance", en: "Freelance" }, interim: { fr: "Intérim", en: "Temp" }, stage: { fr: "Stage", en: "Internship" }, alternance: { fr: "Alternance", en: "Work-study" } };
const REMOTE = { onsite: { fr: "Sur site", en: "On site" }, hybrid: { fr: "Hybride", en: "Hybrid" }, remote: { fr: "Télétravail", en: "Remote" } };

// Vitrine publique d'un cabinet (visiteur non connecté) — opt-in
// (public_page_enabled), montée directement depuis main.jsx sans passer par
// l'App authentifiée : aucune session requise, aucune donnée sensible
// exposée (missions ouvertes uniquement, pas le vivier ni les recruteurs).
export default function CabinetPublicPage({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const language = (navigator.language || "fr").startsWith("en") ? "en" : "fr";

  const copy =
    language === "en"
      ? {
          openMissions: "Open positions",
          empty: "No open position published right now.",
          notFound: "This page doesn't exist or isn't public.",
          poweredBy: "Recruitment page powered by Career CV"
        }
      : {
          openMissions: "Postes ouverts",
          empty: "Aucun poste ouvert publié pour l'instant.",
          notFound: "Cette page n'existe pas ou n'est pas publique.",
          poweredBy: "Page recrutement propulsée par Career CV"
        };

  useEffect(() => {
    getPublicCabinetPage(slug)
      .then(setData)
      .catch(() => setError(copy.notFound));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (error) {
    return (
      <div className="public-cabinet-page">
        <div className="card block">
          <p className="field-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="public-cabinet-page">
        <div className="extracting-state"><div className="loader-ring" /></div>
      </div>
    );
  }

  return (
    <div className="public-cabinet-page">
      <header className="public-cabinet-header">
        {data.logoDataUrl ? <img src={data.logoDataUrl} alt={data.organizationName} className="public-cabinet-logo" /> : null}
        <div>
          <h1>{data.organizationName}</h1>
          <p className="muted">{[data.city, data.country].filter(Boolean).join(", ")}</p>
          {data.website ? (
            <a href={/^https?:\/\//i.test(data.website) ? data.website : `https://${data.website}`} target="_blank" rel="noreferrer">
              {data.website}
            </a>
          ) : null}
        </div>
      </header>

      {data.description ? <p className="public-cabinet-description">{data.description}</p> : null}

      <section className="card block">
        <h2>{copy.openMissions}</h2>
        {data.openMissions.length ? (
          <div className="history-list">
            {data.openMissions.map((mission) => (
              <article className="history-card" key={mission.id}>
                <div className="history-card-top">
                  <div className="history-card-main">
                    <span className="history-card-icon"><UiIcon name="briefcase" /></span>
                    <div>
                      <h3>{mission.title}</h3>
                      <p>{[mission.location, CONTRACTS[mission.contractType]?.[language], REMOTE[mission.remotePolicy]?.[language], formatDate(mission.createdAt)].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                </div>
                {mission.salaryMin != null || mission.salaryMax != null ? (
                  <p className="public-mission-salary">
                    {language === "en" ? "Annual gross salary: " : "Salaire annuel brut : "}
                    {[mission.salaryMin, mission.salaryMax]
                      .filter((value) => value != null)
                      .map((value) => new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value))
                      .join(" – ")}
                  </p>
                ) : null}
                {mission.skills?.length ? (
                  <div className="job-chip-row history-skill-row">
                    {mission.skills.slice(0, 10).map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>
                ) : null}
                {mission.description ? (
                  <details className="public-mission-details">
                    <summary>{language === "en" ? "See the job description" : "Voir la description du poste"}</summary>
                    <p>{mission.description}</p>
                  </details>
                ) : null}
                {mission.deadline ? (
                  <p className="public-mission-deadline">
                    {language === "en" ? "Apply before " : "Candidater avant le "}
                    {formatDate(mission.deadline)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">{copy.empty}</p>
        )}
      </section>

      <p className="public-cabinet-footer muted">{copy.poweredBy}</p>
    </div>
  );
}
