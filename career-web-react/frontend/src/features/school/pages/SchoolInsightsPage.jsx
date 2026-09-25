import React, { useEffect, useState } from "react";
// Espace École › Suivi & employabilité : où en sont vos étudiants face aux
// offres qu'ils visent (dernier score de matching CV / offre), quelles
// compétences manquent le plus, et le classement détaillé.
// Données : /school/insights (répartition, mots-clés manquants, classement).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getSchoolInsights } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";

// Niveaux d'employabilité (mêmes seuils que le reste de l'espace École).
const LEVELS = [
  { key: "0-39", tone: "low", fr: "À accompagner", en: "Needs support", range: "0 – 39 %" },
  { key: "40-59", tone: "mid", fr: "À consolider", en: "To consolidate", range: "40 – 59 %" },
  { key: "60-79", tone: "good", fr: "Prêt à l'emploi", en: "Job-ready", range: "60 – 79 %" },
  { key: "80-100", tone: "top", fr: "Excellent", en: "Excellent", range: "80 – 100 %" }
];
const levelOf = (score) => (score >= 80 ? LEVELS[3] : score >= 60 ? LEVELS[2] : score >= 40 ? LEVELS[1] : LEVELS[0]);
const RANKING_PREVIEW = 10;

export default function SchoolInsightsPage({ user, language, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setInsights(null);
    getSchoolInsights(user.id, { promotionId })
      .then(setInsights)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, promotionId]);

  if (error) return <p className="field-error">{error}</p>;

  const promotions = insights?.promotions || [];
  const header = (
    <header className="module-header admin-accounts-header">
      <div>
        <h2>{t("Suivi & employabilité", "Tracking & employability")}</h2>
        <p>{t("Où en sont vos étudiants face aux offres qu'ils visent, d'après leur dernier score de matching CV / offre.", "Where your students stand against the jobs they target, based on their latest CV / job match score.")}</p>
      </div>
      {promotions.length ? (
        <div className="admin-header-actions">
          <label className="jy-inline-select">
            <AdminLineIcon name="layers" />
            <select value={promotionId} onChange={(event) => setPromotionId(event.target.value)} aria-label={t("Promotion", "Promotion")}>
              <option value="">{t("Toutes les promotions", "All promotions")}</option>
              {promotions.map((promo) => (
                <option key={promo.id} value={promo.id}>
                  {promo.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </header>
  );

  if (!insights) {
    return (
      <section className="admin-dashboard">
        {header}
        <AdminPageLoader language={language} />
      </section>
    );
  }

  const ranking = [...(insights.ranking || [])].sort((a, b) => b.score - a.score);
  const buckets = insights.scoreBuckets || {};
  const assessed = ranking.length;
  const avg = assessed ? Math.round(ranking.reduce((sum, student) => sum + Number(student.score || 0), 0) / assessed) : null;
  const ready = ranking.filter((student) => student.score >= 60).length;
  const support = ranking.filter((student) => student.score < 40).length;
  const pct = (part) => (assessed ? Math.round((part / assessed) * 100) : 0);
  const missing = insights.topMissingKeywords || [];
  const maxMissing = Math.max(1, ...missing.map((item) => item.count));
  const shownRanking = showAll ? ranking : ranking.slice(0, RANKING_PREVIEW);

  const cards = [
    { icon: "accounts", label: t("Étudiants évalués", "Students assessed"), value: assessed, tone: "" },
    { icon: "trend", label: t("Score moyen", "Average score"), value: avg == null ? "-" : `${avg} %`, tone: "gold" },
    { icon: "quality", label: t("Prêts à l'emploi", "Job-ready"), value: `${ready} (${pct(ready)} %)`, tone: "green" },
    { icon: "alert", label: t("À accompagner", "Needs support"), value: support, tone: support ? "danger" : "" }
  ];

  const exportColumns = [
    { key: "rank", label: t("Rang", "Rank"), exportValue: (student) => ranking.indexOf(student) + 1 },
    { key: "name", label: t("Étudiant", "Student"), exportValue: (student) => `${student.firstName || ""} ${student.lastName || ""}`.trim() },
    { key: "email", label: "E-mail", exportValue: (student) => student.email },
    { key: "score", label: t("Score (%)", "Score (%)"), exportValue: (student) => student.score },
    { key: "level", label: t("Niveau", "Level"), exportValue: (student) => levelOf(student.score)[language === "en" ? "en" : "fr"] }
  ];
  const promotionLabel = promotions.find((promo) => promo.id === promotionId)?.name;

  return (
    <section className="admin-dashboard jy-insights">
      {header}

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      {!assessed ? (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="trend" />
          </span>
          <strong>{t("Pas encore de score", "No score yet")}</strong>
          <span>{t("Cette page se remplit dès que vos étudiants lancent leurs premières analyses CV / offre.", "This page fills in as soon as your students run their first CV / job analyses.")}</span>
        </div>
      ) : (
        <>
          <div className="jy-grid-2">
            <div className="jy-card">
              <div className="jy-card-head">
                <div>
                  <h3>{t("Niveaux d'employabilité", "Employability levels")}</h3>
                  <p className="jy-card-sub">{t("Répartition des étudiants selon leur dernier score.", "Students by their latest score.")}</p>
                </div>
              </div>
              <div className="jy-level-stack" aria-hidden="true">
                {LEVELS.map((level) =>
                  buckets[level.key] ? <span key={level.key} className={level.tone} style={{ width: `${pct(buckets[level.key])}%` }} /> : null
                )}
              </div>
              <ul className="jy-levels">
                {LEVELS.map((level) => (
                  <li key={level.key}>
                    <i className={level.tone} />
                    <span className="jy-level-name">
                      <strong>{level[language === "en" ? "en" : "fr"]}</strong>
                      <small>{level.range}</small>
                    </span>
                    <span className="jy-level-bar">
                      <span className={level.tone} style={{ width: `${Math.max(pct(buckets[level.key] || 0), buckets[level.key] ? 3 : 0)}%` }} />
                    </span>
                    <strong className="jy-level-count">{buckets[level.key] || 0}</strong>
                    <small className="jy-level-pct">{pct(buckets[level.key] || 0)} %</small>
                  </li>
                ))}
              </ul>
            </div>

            <div className="jy-card">
              <div className="jy-card-head">
                <div>
                  <h3>{t("Compétences à renforcer", "Skills to strengthen")}</h3>
                  <p className="jy-card-sub">{t("Mots-clés des offres visées absents des CV.", "Keywords from targeted jobs missing from CVs.")}</p>
                </div>
              </div>
              {missing.length ? (
                <>
                  <ul className="jy-skill-bars">
                    {missing.slice(0, 8).map((item) => (
                      <li key={item.keyword}>
                        <span>{item.keyword}</span>
                        <span className="jy-skill-track warn">
                          <span style={{ width: `${(item.count / maxMissing) * 100}%` }} />
                        </span>
                        <strong>
                          {item.count} <small>{t("étud.", "stud.")}</small>
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <div className="jy-idea">
                    <AdminLineIcon name="help" />
                    <span>
                      {t("Idée d'atelier : ", "Workshop idea: ")}
                      <strong>{missing.slice(0, 3).map((item) => item.keyword).join(", ")}</strong>
                      {t(" reviennent le plus souvent dans les offres visées par vos étudiants.", " come up most often in the jobs your students target.")}
                    </span>
                  </div>
                </>
              ) : (
                <p className="jy-empty">{t("Les manques récurrents apparaîtront dès les premières analyses.", "Recurring gaps will appear with the first analyses.")}</p>
              )}
            </div>
          </div>

          <div className="jy-card jy-card-flush">
            <div className="jy-card-head jy-card-head-padded">
              <div>
                <h3>{t("Classement des étudiants", "Student ranking")}</h3>
                <p className="jy-card-sub">
                  {promotionLabel ? `${promotionLabel} · ` : ""}
                  {t("du meilleur au plus faible score", "from best to lowest score")}
                </p>
              </div>
              <AdminExportMenu
                language={language}
                title={t("Classement employabilité", "Employability ranking")}
                fileBase="classement-employabilite"
                columns={exportColumns}
                rows={ranking}
                filters={promotionLabel ? [`${t("Promotion", "Promotion")} : ${promotionLabel}`] : []}
              />
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("Étudiant", "Student")}</th>
                    <th>{t("Dernier score", "Latest score")}</th>
                    <th>{t("Niveau", "Level")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shownRanking.map((student, index) => {
                    const level = levelOf(student.score);
                    return (
                      <tr key={student.id} className={`jy-row-click ${selected?.id === student.id ? "is-selected" : ""}`} onClick={() => setSelected(student)}>
                        <td>
                          <span className={`jy-rank ${index < 3 ? `top top-${index + 1}` : ""}`}>{index + 1}</span>
                        </td>
                        <td>
                          <div className="admin-table-name">
                            <AvatarCircle user={student} />
                            <div>
                              <strong>
                                {student.firstName} {student.lastName}
                              </strong>
                              <span className="muted">{student.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="jy-score-bar">
                            <span className={`jy-score-bar-track ${level.tone}`}>
                              <span style={{ width: `${student.score}%` }} />
                            </span>
                            <strong>{student.score} %</strong>
                          </span>
                        </td>
                        <td>
                          <span className={`jy-level-tag ${level.tone}`}>{level[language === "en" ? "en" : "fr"]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ranking.length > RANKING_PREVIEW ? (
              <div className="jy-card-foot-link">
                <button type="button" className="jy-link" onClick={() => setShowAll((value) => !value)}>
                  {showAll ? t("Afficher moins", "Show less") : t(`Afficher les ${ranking.length} étudiants`, `Show all ${ranking.length} students`)}
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        language={language}
        avatar={selected ? <AvatarCircle user={selected} /> : null}
        title={selected ? `${selected.firstName || ""} ${selected.lastName || ""}`.trim() : ""}
        subtitle={selected?.email}
        badges={selected ? <span className={`jy-level-tag ${levelOf(selected.score).tone}`}>{levelOf(selected.score)[language === "en" ? "en" : "fr"]}</span> : null}
        sections={
          selected
            ? [
                {
                  title: t("Employabilité", "Employability"),
                  rows: [
                    [t("Rang", "Rank"), `${ranking.indexOf(selected) + 1} / ${ranking.length}`],
                    [t("Dernier score", "Latest score"), `${selected.score} %`],
                    [t("Écart à la moyenne", "Gap to average"), avg == null ? "-" : `${selected.score - avg >= 0 ? "+" : ""}${selected.score - avg} pts`]
                  ]
                },
                {
                  title: t("Conseil", "Advice"),
                  content: (
                    <p className="jy-drawer-empty">
                      {selected.score >= 60
                        ? t("Profil en phase avec les offres visées : encouragez l'étudiant à candidater et à préparer ses entretiens avec le coach IA.", "Profile matches the targeted jobs: encourage the student to apply and prepare interviews with the AI coach.")
                        : selected.score >= 40
                        ? t("Profil à consolider : l'optimiseur de CV et les compétences manquantes signalées aideront à passer le cap des 60 %.", "Profile to consolidate: the CV optimizer and the flagged missing skills will help cross 60%.")
                        : t("Profil à accompagner : un point individuel et une relance ciblée depuis l'Accueil sont recommandés.", "Profile needs support: a one-to-one meeting and a targeted follow-up from Home are recommended.")}
                    </p>
                  )
                }
              ]
            : []
        }
        footer={
          selected && onGoToTab ? (
            <button type="button" className="admin-row-action" onClick={() => onGoToTab("students")}>
              <AdminLineIcon name="accounts" /> {t("Voir dans Étudiants", "View in Students")}
            </button>
          ) : null
        }
      />
    </section>
  );
}
