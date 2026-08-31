import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { formatDate } from "../../../lib/format.js";
import { getPublicCabinetPage } from "../../../lib/inMemoryDb.js";

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
            <a href={data.website} target="_blank" rel="noreferrer">{data.website}</a>
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
                      <p>{mission.location || "—"} · {formatDate(mission.createdAt)}</p>
                    </div>
                  </div>
                </div>
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
