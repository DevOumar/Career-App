import React from "react";
// Module Tarifs : grille publique (pré-connexion) et grille connectée avec
// activation de plan, jetons, codes de licence.
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { CURRENCY_OPTIONS, getCurrencyOption, formatAmountInCurrency, formatPlanPrice } from "../../lib/format.js";
import { InfoPage } from "../landing/LandingPage.jsx";
import { PRICING_COPY } from "./pricingCopy.js";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../data/plans.js";

function PublicPricingPage({ language, setLanguage, onBack, onLoginClick, onSignupClick, onNavigateLegal, landingCopy, currency = "EUR" }) {
  const isEn = language === "en";
  const copy = isEn
    ? { eyebrow: "Pricing", title: "Plans & pricing", subtitle: "Every plan currently in effect on Career CV — no surprises." }
    : { eyebrow: "Tarifs", title: "Plans & tarifs", subtitle: "Toutes les grilles tarifaires en vigueur sur Career CV — sans surprise." };
  const pricingCopy = PRICING_COPY[language] || PRICING_COPY.fr;

  return (
    <InfoPage
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      language={language}
      setLanguage={setLanguage}
      onBack={onBack}
      onLoginClick={onLoginClick}
      onSignupClick={onSignupClick}
      landingCopy={landingCopy}
      onPrivacyClick={() => onNavigateLegal?.("privacy")}
      onTermsClick={() => onNavigateLegal?.("terms")}
      onCookiesClick={() => onNavigateLegal?.("cookies")}
      onAboutClick={() => onNavigateLegal?.("about")}
      onContactClick={() => onNavigateLegal?.("contact")}
      onPricingClick={() => onNavigateLegal?.("pricing")}
      onSecurityClick={() => onNavigateLegal?.("security")}
    >
      {PLAN_SEGMENTS.map((segment) => (
        <section key={segment} className="info-section">
          <h2>
            {segment === "candidate"
              ? pricingCopy.segmentCandidate
              : segment === "agency"
              ? pricingCopy.segmentAgency
              : pricingCopy.segmentSchool}
          </h2>
          <div className="pricing-grid">
            {PLANS.filter((plan) => plan.segment === segment).map((plan) => {
              const price = formatPlanPrice(plan, "monthly", language, pricingCopy, currency);
              return (
                <article key={plan.id} className={`pricing-card ${plan.highlighted ? "recommended" : ""}`}>
                  {plan.badge ? <span className="pricing-badge">{plan.badge[language] || plan.badge.fr}</span> : null}
                  <h3>{plan.name[language] || plan.name.fr}</h3>
                  <p className="muted">{plan.tagline[language] || plan.tagline.fr}</p>
                  <div className="pricing-price">
                    <strong>{price.amount}</strong>
                    <span>{price.unit}</span>
                  </div>
                  <ul className="pricing-feature-list">
                    {(plan.features[language] || plan.features.fr).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="info-cta">
        <div>
          <h2>{isEn ? "Ready to start?" : "Prêt à commencer ?"}</h2>
          <p>
            {isEn
              ? "Create a free account, no card required."
              : "Crée un compte gratuit, sans carte bancaire."}
          </p>
        </div>
        <button type="button" className="landing-signup" onClick={onSignupClick}>
          {isEn ? "Sign up for free" : "S'inscrire gratuitement"}
        </button>
      </section>
    </InfoPage>
  );
}

const PRICING_SEGMENTS = [
  { id: "candidate", labelKey: "segmentCandidate" },
  { id: "agency", labelKey: "segmentAgency" },
  { id: "school", labelKey: "segmentSchool" }
];

function allowedPricingSegmentsForRole(roleType) {
  if (roleType === "recruiter_firm" || roleType === "recruiter_internal" || roleType === "company") return ["agency"];
  if (roleType === "school") return ["school"];
  return ["candidate"];
}

function PricingPage({
  user,
  premium,
  language,
  currency,
  stripeEnabled,
  planOverrides = {},
  onActivatePlan,
  onStripeCheckout,
  onRedeemCode,
  pendingPlanAction
}) {
  const copy = PRICING_COPY[language] || PRICING_COPY.fr;
  const allowedSegments = allowedPricingSegmentsForRole(user?.roleType);
  const visibleSegments = PRICING_SEGMENTS.filter((item) => allowedSegments.includes(item.id));
  const [segment, setSegment] = useState(allowedSegments[0]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [licenseCode, setLicenseCode] = useState("");
  const [studentSeats, setStudentSeats] = useState(30);

  useEffect(() => {
    if (!allowedSegments.includes(segment)) {
      setSegment(allowedSegments[0]);
    }
  }, [allowedSegments, segment]);

  const subscription = user?.subscription || {};
  const currentBalance = Number(subscription.credits || 0);
  // Un admin a pu modifier un tarif depuis Tarifs (admin) — l'affichage
  // candidat/cabinet/école doit refléter le prix réellement facturé, pas la
  // valeur par défaut figée dans plans.js.
  const segmentPlans = PLANS.filter((plan) => plan.segment === segment).map((plan) => {
    const override = planOverrides[plan.id];
    if (!override) return plan;
    return {
      ...plan,
      monthlyPrice: override.monthlyPrice != null ? override.monthlyPrice : plan.monthlyPrice,
      annualPrice: override.annualPrice != null ? override.annualPrice : plan.annualPrice
    };
  });
  const hasRecurringPlans = segmentPlans.some((plan) => plan.monthlyPrice > 0);

  return (
    <section className="pricing-page">
      <header className="pricing-header">
        <h2>{copy.title}</h2>
        <p className="muted">{copy.text}</p>
        <div className="pricing-balance-pill">
          <UiIcon name="pricetag" />
          <span>
            {copy.currentBalance} : {currentBalance} {copy.credits}
          </span>
        </div>
      </header>

      {visibleSegments.length > 1 ? (
      <div className="pricing-segment-tabs">
        {visibleSegments.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pricing-segment-tab ${segment === item.id ? "active" : ""}`}
            onClick={() => setSegment(item.id)}
          >
            {copy[item.labelKey]}
          </button>
        ))}
      </div>
      ) : null}

      {hasRecurringPlans ? (
        <div className="pricing-toggle">
          <button
            type="button"
            className={billingCycle === "monthly" ? "active" : ""}
            onClick={() => setBillingCycle("monthly")}
          >
            {copy.billingMonthly}
          </button>
          <button
            type="button"
            className={billingCycle === "annual" ? "active" : ""}
            onClick={() => setBillingCycle("annual")}
          >
            {copy.billingAnnual} <span className="pricing-toggle-save">{copy.billingSave}</span>
          </button>
        </div>
      ) : null}

      <div className="pricing-grid">
        {segmentPlans.map((plan) => {
          const price = formatPlanPrice(plan, billingCycle, language, copy, currency);
          const isDefaultFreePlan = !subscription.planId && plan.monthlyPrice === 0 && plan.annualPrice === 0;
          const isCurrentPlan = subscription.planId === plan.id || isDefaultFreePlan;
          return (
            <article key={plan.id} className={`pricing-card ${plan.highlighted ? "recommended" : ""}`}>
              {plan.badge ? <span className="pricing-badge">{plan.badge[language] || plan.badge.fr}</span> : null}
              <div className="pricing-card-icon">
                <UiIcon name={plan.segment === "candidate" ? "pricetag" : plan.segment === "agency" ? "briefcase" : "profile"} />
              </div>
              <h3>{plan.name[language] || plan.name.fr}</h3>
              <p className="muted">{plan.tagline[language] || plan.tagline.fr}</p>
              <div className="pricing-price">
                <strong>{price.amount}</strong>
                {price.unit ? <span>{price.unit}</span> : null}
              </div>
              {plan.seats ? (
                <span className="tag">
                  {plan.seats} {copy.seatsIncluded}
                </span>
              ) : plan.credits < 999 ? (
                <span className="tag">
                  {plan.monthlyPrice === 0 && plan.annualPrice === 0 ? "" : "+"}
                  {plan.credits} {copy.creditsIncluded}
                </span>
              ) : null}
              <ul className="pricing-feature-list">
                {(plan.features[language] || plan.features.fr).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.id === "school_license" ? (
                <label className="pricing-seats-input">
                  <span>{copy.studentSeatsLabel}</span>
                  <input
                    type="number"
                    min={plan.seats}
                    step={1}
                    value={studentSeats}
                    onChange={(event) => {
                      const next = Number(event.target.value.replace(/\D/g, "")) || plan.seats;
                      setStudentSeats(Math.max(plan.seats, next));
                    }}
                  />
                  <span className="pricing-seats-total">
                    {copy.studentSeatsTotal}{" "}
                    <strong>{formatAmountInCurrency(plan.annualPrice * studentSeats, currency)}</strong>
                  </span>
                </label>
              ) : null}
              <button
                type="button"
                className={`btn-main ${plan.highlighted ? "ready" : ""}`}
                disabled={isCurrentPlan || Boolean(pendingPlanAction)}
                onClick={() =>
                  stripeEnabled && plan.grantsPremium
                    ? onStripeCheckout(plan.id, billingCycle, plan.id === "school_license" ? studentSeats : 1)
                    : onActivatePlan(plan.id, billingCycle)
                }
              >
                {pendingPlanAction === plan.id ? <span className="btn-spinner" /> : null}{" "}
                {isCurrentPlan ? copy.currentPlan : copy.activate}
              </button>
            </article>
          );
        })}
      </div>

      <div className="pricing-license-block">
        <h3>{copy.licenseCodeTitle}</h3>
        <p className="muted">{copy.licenseCodeHint}</p>
        <div className="pricing-license-form">
          <input
            value={licenseCode}
            onChange={(event) => setLicenseCode(event.target.value)}
            placeholder={copy.licenseCodePlaceholder}
          />
          <button
            type="button"
            className="btn-main ready"
            disabled={!licenseCode.trim() || Boolean(pendingPlanAction)}
            onClick={() => {
              onRedeemCode(licenseCode);
              setLicenseCode("");
            }}
          >
            {pendingPlanAction === "license" ? <span className="btn-spinner" /> : null} {copy.licenseCodeSubmit}
          </button>
        </div>
      </div>
    </section>
  );
}

export { PublicPricingPage, PricingPage, PRICING_SEGMENTS, allowedPricingSegmentsForRole };
