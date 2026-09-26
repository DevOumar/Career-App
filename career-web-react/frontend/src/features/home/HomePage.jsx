import React, { useEffect, useState } from "react";
// Module Page d'accueil (tableau de bord connecté) : accueil personnalisé,
// indicateurs réels du compte, parcours en 4 étapes avec leur état réel,
// dernière analyse et accès rapide aux outils IA.
import { UiIcon } from "../../components/UiIcon.jsx";
import { HomeHeroArt } from "../../components/ModuleWorkspace.jsx";
import { listJobApplications } from "../../lib/inMemoryDb.js";
import { HOME_COPY } from "./homeCopy.js";

// Compteur animé (0 → valeur) à l'arrivée sur la page ; désactivé si
// l'utilisateur a demandé moins d'animations.
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = Number(target) || 0;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !end) {
      setValue(end);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(end * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function StatValue({ value, suffix = "" }) {
  const animated = useCountUp(value);
  return (
    <>
      {animated}
      {suffix}
    </>
  );
}

function HomePage({ onStart, onSeeTarifs, onNavigate, user, profileCompleteness, latestMatch, cvCount, language }) {
  const copy = HOME_COPY[language] || HOME_COPY.fr;
  const [applicationsCount, setApplicationsCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return undefined;
    listJobApplications(user.id)
      .then((items) => {
        if (!cancelled) setApplicationsCount((items || []).length);
      })
      .catch(() => {
        if (!cancelled) setApplicationsCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const firstName = user?.firstName || copy.userFallback;
  const greeting = new Date().getHours() >= 18 ? copy.greetingEvening : copy.greetingMorning;
  const score = typeof latestMatch?.matchInsights?.score === "number" ? latestMatch.matchInsights.score : latestMatch?.summary?.globalScore ?? null;
  const hasScore = typeof score === "number";
  const job = latestMatch?.jobReview || null;
  const subscription = user?.subscription || {};
  const unlimited = !(typeof subscription.credits === "number" && subscription.credits < 999);
  const schoolLicense = user?.schoolLicense;
  const schoolName = schoolLicense && !schoolLicense.revoked ? schoolLicense.organizationName : "";
  const go = (page) => (onNavigate ? onNavigate(page) : onStart());

  const primaryCta = !cvCount
    ? { label: copy.ctaImport, icon: "upload" }
    : hasScore
    ? { label: copy.ctaResults, icon: "chart" }
    : { label: copy.ctaAnalyse, icon: "matchmark" };

  const stepDone = {
    cv: cvCount > 0,
    match: hasScore,
    track: Number(applicationsCount) > 0,
    train: false
  };
  const currentStep = copy.steps.find((step) => !stepDone[step.key])?.key;
  const scoreTier = !hasScore ? "none" : score >= 75 ? "high" : score >= 50 ? "mid" : "low";

  const stats = [
    {
      id: "score",
      icon: "chart",
      label: copy.statScore,
      value: hasScore ? score : null,
      suffix: "/100",
      empty: copy.statScoreNone
    },
    { id: "cv", icon: "file", label: copy.statCv, value: cvCount },
    { id: "apps", icon: "briefcase", label: copy.statApplications, value: applicationsCount ?? 0 },
    { id: "profile", icon: "profile", label: copy.statProfile, value: profileCompleteness || 0, suffix: " %" }
  ];

  return (
    <section className="hm-page">
      <header className="hm-hero">
        <div className="hm-hero-glow" aria-hidden="true" />
        <div className="hm-hero-copy">
          <p className="hm-greeting">
            {greeting} {firstName},
          </p>
          <span className="mw-eyebrow">{copy.eyebrow}</span>
          <h2>
            {copy.titleA} <span>{copy.titleB}</span> <em>{copy.titleAccent}</em>
          </h2>
          <p className="hm-intro">{copy.intro}</p>
          <div className="hm-cta">
            <button type="button" className="hm-cta-primary" onClick={() => go("import")}>
              <UiIcon name={primaryCta.icon} />
              {primaryCta.label}
              <UiIcon name="chevron" />
            </button>
            <button type="button" className="hm-cta-secondary" onClick={onSeeTarifs}>
              <UiIcon name="pricetag" />
              {unlimited ? copy.unlimited : `${subscription.credits} ${copy.statTokens.toLowerCase()}`}
              <span>· {copy.seeTarifs}</span>
            </button>
          </div>
          {schoolName ? (
            <p className="hm-school">
              <UiIcon name="shield" />
              {copy.schoolMember} <strong>{schoolName}</strong>
            </p>
          ) : null}
        </div>
        <div className="hm-hero-art">
          <HomeHeroArt score={hasScore ? score : null} />
        </div>
      </header>

      <div className="hm-stats">
        {stats.map((stat, index) => (
          <div key={stat.id} className={`hm-stat stat-${stat.id} ${stat.id === "score" ? `tier-${scoreTier}` : ""}`} style={{ "--delay": `${0.15 + index * 0.08}s` }}>
            <span className="hm-stat-icon">
              <UiIcon name={stat.icon} />
            </span>
            <div>
              <strong>{stat.value === null ? "—" : <StatValue value={stat.value} suffix={stat.suffix} />}</strong>
              <small>{stat.value === null ? stat.empty : stat.label}</small>
            </div>
            {stat.id === "profile" ? (
              <div className="hm-stat-bar" aria-hidden="true">
                <i style={{ width: `${Math.min(100, stat.value)}%` }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hm-grid">
        <section className="hm-card hm-journey">
          <div className="hm-card-head">
            <h3>{copy.journeyTitle}</h3>
            <p>{copy.journeyText}</p>
          </div>
          <ol>
            {copy.steps.map((step, index) => {
              const done = stepDone[step.key];
              const current = step.key === currentStep;
              return (
                <li key={step.key}>
                  <button type="button" className={`hm-step ${done ? "is-done" : ""} ${current ? "is-current" : ""}`} onClick={() => go(step.page)}>
                    <span className="hm-step-num">{done ? <UiIcon name="check" /> : index + 1}</span>
                    <span className="hm-step-body">
                      <strong>{step.title}</strong>
                      <small>{step.text}</small>
                    </span>
                    <span className={`hm-step-state ${done ? "done" : ""}`}>{done ? copy.stepDone : copy.stepTodo}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={`hm-card hm-last tier-${scoreTier}`}>
          <div className="hm-card-head">
            <h3>{copy.lastAnalysisTitle}</h3>
          </div>
          {hasScore ? (
            <>
              <div className="hm-last-score">
                <div className="hm-ring" style={{ "--pct": `${score}%` }}>
                  <strong>
                    <StatValue value={score} />
                  </strong>
                  <span>/100</span>
                </div>
                <div className="hm-last-job">
                  <strong>{job?.title || "—"}</strong>
                  {job?.company ? <small>{job.company}</small> : null}
                  {latestMatch?.matchInsights?.verdict ? <span className="hm-verdict">{latestMatch.matchInsights.verdict}</span> : null}
                </div>
              </div>
              <button type="button" className="hm-link-btn" onClick={() => go("import")}>
                {copy.lastAnalysisOpen} <UiIcon name="chevron" />
              </button>
            </>
          ) : (
            <div className="hm-last-empty">
              <UiIcon name="matchmark" />
              <p>{copy.statScoreNone}</p>
              <button type="button" className="hm-link-btn" onClick={() => go("import")}>
                {cvCount ? copy.ctaAnalyse : copy.ctaImport} <UiIcon name="chevron" />
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="hm-modules">
        <h3>{copy.modulesTitle}</h3>
        <div className="hm-modules-grid">
          {copy.modules.map((module, index) => (
            <button key={module.page} type="button" className={`hm-module m-${index}`} onClick={() => go(module.page)}>
              <span className="hm-module-icon">
                <UiIcon name={module.icon} />
              </span>
              <strong>{module.title}</strong>
              <small>{module.text}</small>
              <span className="hm-module-go">
                {copy.moduleGo} <UiIcon name="chevron" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

export default HomePage;
