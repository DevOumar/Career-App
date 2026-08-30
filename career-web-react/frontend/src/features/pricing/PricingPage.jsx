import React from "react";
// Module Tarifs : grille publique (pré-connexion) et grille connectée avec
// activation de plan, jetons, codes de licence.
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { CURRENCY_OPTIONS, getCurrencyOption, formatAmountInCurrency, formatPlanPrice } from "../../lib/format.js";
import { InfoPage } from "../landing/LandingPage.jsx";
import { PRICING_COPY } from "./pricingCopy.js";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../data/plans.js";
import { listBillingTransactions } from "../../lib/inMemoryDb.js";

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

const HISTORY_PAGE_SIZE = 10;

function BillingHistoryTab({ userId, language, currency }) {
  const copy = PRICING_COPY[language] || PRICING_COPY.fr;
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);

  // Tout changement de filtre repart à la page 1 (sinon on pourrait se
  // retrouver sur une page vide qui n'existe plus pour le nouveau filtre).
  useEffect(() => {
    setPage(1);
  }, [statusFilter, planFilter]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setStatus("loading");
    listBillingTransactions(userId, {
      status: statusFilter,
      planId: planFilter,
      page,
      pageSize: HISTORY_PAGE_SIZE
    })
      .then((data) => {
        if (cancelled) return;
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, statusFilter, planFilter, page]);

  const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const availablePlans = PLANS.filter((plan) => plan.grantsPremium || plan.credits);

  const sourceLabel = (source) => {
    if (source === "stripe") return copy.historySourceStripe;
    if (source === "license_redeem") return copy.historySourceLicenseRedeem;
    return copy.historySourceInstant;
  };

  const statusLabel = (txn) => {
    if (txn.refunded) return copy.historyStatusRefunded;
    if (txn.amountCollected > 0) return copy.historyStatusPaid;
    return copy.historyStatusFree;
  };

  return (
    <div className="billing-history">
      <div className="billing-history-filters">
        <label className="billing-history-filter">
          <span>{copy.historyFilterStatusLabel}</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{copy.historyFilterStatusAll}</option>
            <option value="paid">{copy.historyStatusPaid}</option>
            <option value="free">{copy.historyStatusFree}</option>
            <option value="refunded">{copy.historyStatusRefunded}</option>
          </select>
        </label>
        <label className="billing-history-filter">
          <span>{copy.historyFilterPlanLabel}</span>
          <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
            <option value="">{copy.historyFilterPlanAll}</option>
            {availablePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name[language] || plan.name.fr}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status === "loading" ? (
        <p className="muted">{copy.historyLoading}</p>
      ) : status === "error" ? (
        <p className="form-error">{copy.historyError}</p>
      ) : !transactions.length ? (
        <p className="muted">{total === 0 && !statusFilter && !planFilter ? copy.historyEmpty : copy.historyNoResults}</p>
      ) : (
        <>
        <div className="billing-history-table-wrap">
          <table className="billing-history-table">
            <thead>
              <tr>
                <th>{copy.historyColDate}</th>
                <th>{copy.historyColPlan}</th>
                <th>{copy.historyColAmount}</th>
                <th>{copy.historyColSource}</th>
                <th>{copy.historyColStatus}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{new Date(txn.createdAt).toLocaleDateString(language === "en" ? "en-GB" : "fr-FR")}</td>
                  <td>
                    {txn.planName}
                    {txn.billingCycle ? (
                      <span className="muted"> · {txn.billingCycle === "annual" ? copy.historyCycleAnnual : copy.historyCycleMonthly}</span>
                    ) : null}
                  </td>
                  <td>{formatAmountInCurrency(txn.amountCollected, currency)}</td>
                  <td>{sourceLabel(txn.source)}</td>
                  <td>
                    <span className={`billing-status-pill ${txn.refunded ? "refunded" : txn.amountCollected > 0 ? "paid" : "free"}`}>
                      {statusLabel(txn)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="billing-history-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              {copy.historyPagePrev}
            </button>
            <span className="muted">{copy.historyPageInfo.replace("{page}", page).replace("{totalPages}", totalPages)}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {copy.historyPageNext}
            </button>
          </div>
        ) : null}
        </>
      )}
    </div>
  );
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
  const [mainTab, setMainTab] = useState("plans");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [licenseCode, setLicenseCode] = useState("");
  const [studentSeats, setStudentSeats] = useState(30);

  useEffect(() => {
    if (!allowedSegments.includes(segment)) {
      setSegment(allowedSegments[0]);
    }
  }, [allowedSegments, segment]);

  function fillTemplate(template, values) {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
  }

  // Une fois un plan payant actif, revenir au plan gratuit effacerait les
  // jetons déjà payés (côté backend, applyPlanToUser refuse cette action) :
  // on explique pourquoi au lieu de laisser l'utilisateur cliquer dans le
  // vide. Passer à un AUTRE plan payant (upgrade) reste possible, mais on
  // prévient d'abord que les jetons restants seront conservés et additionnés.
  async function handlePlanClick(plan) {
    const isPremiumAlready = subscription.plan === "premium";
    if (!plan.grantsPremium && isPremiumAlready) {
      await Swal.fire({
        icon: "info",
        title: copy.downgradeBlockedTitle,
        text: copy.downgradeBlockedText,
        confirmButtonText: copy.downgradeBlockedOk
      });
      return;
    }

    if (plan.grantsPremium && isPremiumAlready) {
      const planName = plan.name[language] || plan.name.fr;
      const result = await Swal.fire({
        icon: "question",
        title: fillTemplate(copy.upgradeConfirmTitle, { plan: planName }),
        text: fillTemplate(copy.upgradeConfirmText, {
          credits: currentBalance,
          plan: planName,
          planCredits: plan.credits
        }),
        showCancelButton: true,
        confirmButtonText: copy.upgradeConfirmOk,
        cancelButtonText: copy.upgradeConfirmCancel
      });
      if (!result.isConfirmed) return;
    }

    if (stripeEnabled && plan.grantsPremium) {
      onStripeCheckout(plan.id, billingCycle, plan.id === "school_license" ? studentSeats : 1);
    } else {
      onActivatePlan(plan.id, billingCycle);
    }
  }

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

      {currentBalance >= 999 ? (
        <div className="pricing-balance-banner success">
          <UiIcon name="check" />
          <div>
            <strong>{copy.balanceUnlimitedTitle}</strong>
            <p>{copy.balanceUnlimitedText}</p>
          </div>
        </div>
      ) : currentBalance <= 0 ? (
        <div className="pricing-balance-banner critical">
          <UiIcon name="alert" />
          <div>
            <strong>{copy.balanceEmptyTitle}</strong>
            <p>{copy.balanceEmptyText}</p>
          </div>
        </div>
      ) : currentBalance <= 5 ? (
        <div className="pricing-balance-banner warning">
          <UiIcon name="alert" />
          <div>
            <strong>{copy.balanceLowTitle}</strong>
            <p>{copy.balanceLowText}</p>
          </div>
        </div>
      ) : null}

      <div className="pricing-main-tabs">
        <button
          type="button"
          className={`pricing-main-tab ${mainTab === "plans" ? "active" : ""}`}
          onClick={() => setMainTab("plans")}
        >
          {copy.tabPlans}
        </button>
        <button
          type="button"
          className={`pricing-main-tab ${mainTab === "history" ? "active" : ""}`}
          onClick={() => setMainTab("history")}
        >
          {copy.tabHistory}
        </button>
      </div>

      {mainTab === "history" ? (
        <BillingHistoryTab userId={user?.id} language={language} currency={currency} />
      ) : (
      <>
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
          // Un plan payant est déjà actif : revenir à Essentiel (gratuit)
          // effacerait les jetons payés, ce n'est pas une action valide ici
          // (voir applyPlanToUser côté backend) — le bouton reste grisé
          // plutôt que de laisser cliquer pour afficher une erreur.
          const isBlockedDowngrade = !plan.grantsPremium && !isCurrentPlan && subscription.plan === "premium";
          // Solde "infini" (999) : le compte est déjà couvert par une
          // licence école/cabinet distribuée par un établissement. Acheter
          // un pack de jetons personnel par-dessus n'a aucun sens (les
          // jetons ne manquent jamais) — on grise tout achat candidat et on
          // explique pourquoi plutôt que de laisser payer pour rien.
          const isAlreadyUnlimited = !isCurrentPlan && currentBalance >= 999;
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
                disabled={isCurrentPlan || isBlockedDowngrade || isAlreadyUnlimited || Boolean(pendingPlanAction)}
                onClick={() => handlePlanClick(plan)}
              >
                {pendingPlanAction === plan.id ? <span className="btn-spinner" /> : null}{" "}
                {isCurrentPlan ? copy.currentPlan : isAlreadyUnlimited ? copy.alreadyUnlimited : copy.activate}
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
      </>
      )}
    </section>
  );
}

export { PublicPricingPage, PricingPage, PRICING_SEGMENTS, allowedPricingSegmentsForRole };
