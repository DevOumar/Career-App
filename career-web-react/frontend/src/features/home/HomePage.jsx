import React from "react";
// Module Page d'accueil (dashboard connecté) : résumé du profil, dernier
// score de matching, plan actif, actualités personnalisées défilantes.
import { UiIcon } from "../../components/UiIcon.jsx";
import { getPlanById } from "../../data/plans.js";
import { getAccountLabel } from "../../lib/accounts.js";
import { HOME_COPY } from "./homeCopy.js";

function HomePage({ onStart, onSeeTarifs, user, premium, profileCompleteness, latestMatch, cvCount, language }) {
  const copy = HOME_COPY[language] || HOME_COPY.fr;
  const userLabel = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || copy.userFallback;
  const roleLabel = getAccountLabel(user?.roleType, language);
  const profileLabel =
    profileCompleteness >= 100 ? copy.profileDone : `${copy.profilePct} ${profileCompleteness}%`;
  const scoreLabel = latestMatch?.summary?.globalScore
    ? `${copy.latestMatch} : ${latestMatch.summary.globalScore}/100`
    : copy.noMatch;
  const objectiveLabel = user?.profile?.targetRole
    ? `${copy.objective}: ${user.profile.targetRole}`
    : copy.addTarget;
  const subscription = user?.subscription || {};
  const activePlan = subscription.planId ? getPlanById(subscription.planId) : null;
  const planName = activePlan ? activePlan.name[language] || activePlan.name.fr : language === "en" ? "Essential" : "Essentiel";
  const tokensLabel =
    typeof subscription.credits === "number" && subscription.credits < 999
      ? `${subscription.credits} ${copy.tokens}`
      : copy.unlimitedTokens;
  const planLabel = `${copy.planLabel}: ${planName} · ${tokensLabel}`;
  const cvLabel = cvCount > 0 ? `${cvCount} ${copy.importedCv}` : copy.noCv;
  const schoolLicense = user?.schoolLicense;
  const schoolLabel =
    schoolLicense && !schoolLicense.revoked && schoolLicense.organizationName
      ? `${copy.schoolMember} ${schoolLicense.organizationName}`
      : null;
  const tickerItems = [
    `${copy.welcome} ${userLabel}`,
    `${copy.accountType}: ${roleLabel}`,
    profileLabel,
    cvLabel,
    scoreLabel,
    planLabel,
    ...(schoolLabel ? [schoolLabel] : []),
    objectiveLabel
  ];

  return (
    <section className="home-page">
      <div className="hero-eyebrow">{copy.eyebrow}</div>
      <h2>
        {copy.titleA}
        <br />
        {copy.titleB} <em>{copy.titleAccent}</em>
      </h2>
      <p>{copy.intro}</p>

      <div className="workflow-strip">
        {copy.workflow.map((item) => (
          <article key={item.number}>
            <strong>{item.number}</strong>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="home-cta-row">
        <button className="home-primary-cta" onClick={onStart}>
          {copy.start} <UiIcon name="chevron" className="btn-chevron" />
        </button>
        <button type="button" className="home-secondary-cta" onClick={onSeeTarifs}>
          {copy.seeTarifs}
        </button>
      </div>

      <div className="home-ticker" aria-label={copy.tickerLabel}>
        <div className="home-ticker-track">
          {[0, 1].map((copyIndex) => (
            <div className="home-ticker-row" key={copyIndex} aria-hidden={copyIndex === 1}>
              {tickerItems.map((item) => (
                <span className="home-ticker-item" key={`${copyIndex}-${item}`}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomePage;
