import React, { useEffect, useState } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { PLANS, getPlanById } from "../../../data/plans.js";
import { formatDateTime, formatPlanPrice } from "../../../lib/format.js";
import { getPlanOverrides, getSchoolLicense } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, formatEur } from "../../admin/AdminApp.jsx";

// Module "Tarifs" côté École : lecture seule des grilles école/établissement
// (les écoles ne peuvent pas éditer les prix, seul l'Admin le peut via
// AdminPricingPage — on lit les mêmes overrides pour afficher le prix
// réellement facturé).
export default function SchoolPricingPage({ user, language, currency = "EUR", onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [overrides, setOverrides] = useState({});
  const [licenses, setLicenses] = useState(null);

  useEffect(() => {
    getPlanOverrides()
      .then((data) => setOverrides(data?.overrides || {}))
      .catch(() => setOverrides({}));
    getSchoolLicense(user.id)
      .then((items) => setLicenses(items || []))
      .catch(() => setLicenses([]));
  }, [user.id]);

  const copy =
    language === "en"
      ? {
          title: "Pricing",
          subtitle: "Plans available for your school or institution.",
          features: "Included",
          annualLabel: "Per student / year",
          contactSales: "Contact sales",
          seatsHint: (min, max) => (max ? `${min} to ${max} students` : `${min}+ students`)
        }
      : {
          title: "Tarifs",
          subtitle: "Grilles disponibles pour votre école ou établissement.",
          features: "Inclus",
          annualLabel: "Par étudiant / an",
          contactSales: "Nous contacter",
          seatsHint: (min, max) => (max ? `${min} à ${max} étudiants` : `${min}+ étudiants`)
        };

  const schoolPlans = PLANS.filter((plan) => plan.segment === "school");
  const annualPriceOf = (plan) => {
    const override = overrides[plan.id];
    return override && override.annualPrice != null ? Number(override.annualPrice) : plan.annualPrice;
  };

  // Offre actuelle : la licence active la plus récente de l'établissement.
  const activeLicenses = (licenses || []).filter((item) => !item.revoked);
  const current = [...activeLicenses].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  const currentPlan = current ? getPlanById(current.planId) : null;
  const seatsTotal = activeLicenses.reduce((sum, item) => sum + Number(item.seatsTotal || 0), 0);
  const seatsUsed = activeLicenses.reduce((sum, item) => sum + Number(item.seatsUsed || 0), 0);
  const usage = seatsTotal ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0;
  const perSeat = currentPlan ? annualPriceOf(currentPlan) : null;
  const yearlyCost = perSeat != null && seatsTotal ? perSeat * seatsTotal : null;
  const currentIndex = currentPlan ? schoolPlans.findIndex((plan) => plan.id === currentPlan.id) : -1;
  const nextPlan = currentIndex >= 0 ? schoolPlans[currentIndex + 1] || null : null;
  const nearTierLimit = currentPlan?.seatsMax ? seatsTotal >= currentPlan.seatsMax * 0.8 : false;
  const showUpgrade = Boolean(nextPlan) && (usage >= 80 || nearTierLimit);

  return (
    <section className="admin-pricing school-pricing">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {licenses === null ? null : currentPlan ? (
        <div className="jy-current-plan">
          <div className="jy-current-plan-main">
            <span className="jy-license-icon">
              <AdminLineIcon name="licenses" />
            </span>
            <div className="jy-current-plan-title">
              <small>{t("Votre offre actuelle", "Your current plan")}</small>
              <strong>{currentPlan.name[language] || currentPlan.name.fr}</strong>
              <span>{currentPlan.tagline[language] || currentPlan.tagline.fr}</span>
            </div>
            <span className="tag tag-success">{t("Active", "Active")}</span>
          </div>

          <div className="jy-current-plan-facts">
            <span>
              <small>{t("Tarif", "Price")}</small>
              <strong>{perSeat != null ? `${formatEur(perSeat, currency)} ${t("/ étudiant / an", "/ student / year")}` : t("Sur devis", "On quote")}</strong>
            </span>
            <span>
              <small>{t("Coût annuel de la licence", "Annual license cost")}</small>
              <strong>{yearlyCost != null ? formatEur(yearlyCost, currency) : "-"}</strong>
            </span>
            <span>
              <small>{t("Active depuis", "Active since")}</small>
              <strong>{formatDateTime(current.createdAt, language)}</strong>
            </span>
            <span className="jy-current-plan-seats">
              <small>
                {t("Sièges utilisés", "Seats used")}
                <b>
                  {seatsUsed} / {seatsTotal}
                </b>
              </small>
              <span className="jy-current-plan-bar">
                <span className={usage >= 90 ? "danger" : usage >= 80 ? "warn" : ""} style={{ width: `${usage}%` }} />
              </span>
            </span>
          </div>

          {showUpgrade ? (
            <div className="jy-idea">
              <AdminLineIcon name="trend" />
              <span>
                {t("Vous approchez de la limite de votre offre. Le palier ", "You're nearing your plan's limit. The ")}
                <strong>{nextPlan.name[language] || nextPlan.name.fr}</strong>
                {t(" permet d'accueillir plus d'étudiants à un meilleur prix par siège.", " tier fits more students at a better price per seat.")}
              </span>
            </div>
          ) : null}

          {onGoToTab ? (
            <div className="jy-current-plan-actions">
              <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => onGoToTab("license")}>
                <AdminLineIcon name="licenses" />
                {t("Gérer ma licence", "Manage my license")}
              </button>
              <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => onGoToTab("billing")}>
                <AdminLineIcon name="card" />
                {t("Voir la facturation", "View billing")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="jy-current-plan is-empty">
          <div className="jy-current-plan-main">
            <span className="jy-license-icon">
              <AdminLineIcon name="licenses" />
            </span>
            <div className="jy-current-plan-title">
              <small>{t("Votre offre actuelle", "Your current plan")}</small>
              <strong>{t("Aucune offre active", "No active plan")}</strong>
              <span>{t("Choisissez une offre ci-dessous ou contactez Career CV pour obtenir une licence.", "Pick a plan below or contact Career CV to get a license.")}</span>
            </div>
          </div>
        </div>
      )}

      <div className="admin-pricing-grid">
        {schoolPlans.map((plan) => {
          const effective = overrides[plan.id] || {
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
            isSinglePrice: plan.monthlyPrice == null
          };
          const price = formatPlanPrice(
            { ...plan, monthlyPrice: effective.monthlyPrice, annualPrice: effective.annualPrice },
            "monthly",
            language,
            currency
          );
          return (
            <article key={plan.id} className={`admin-pricing-card ${plan.highlighted ? "recommended" : ""} ${currentPlan?.id === plan.id ? "is-current" : ""}`}>
              <div className="admin-pricing-card-head">
                <div>
                  <div className="admin-pricing-badges">
                    {currentPlan?.id === plan.id ? <span className="jy-current-badge">{t("Offre actuelle", "Current plan")}</span> : null}
                    {plan.badge ? <span>{plan.badge[language] || plan.badge.fr}</span> : null}
                  </div>
                  <h4>{plan.name[language] || plan.name.fr}</h4>
                  <p>{plan.tagline[language] || plan.tagline.fr}</p>
                </div>
                <span className="admin-pricing-icon">
                  <UiIcon name="pricetag" />
                </span>
              </div>

              {plan.contactSalesOnly ? (
                <div className="admin-pricing-price-row">
                  <div className="admin-pricing-price">
                    <strong>{copy.contactSales}</strong>
                  </div>
                </div>
              ) : (
                <div className="admin-pricing-price-row">
                  <div className="admin-pricing-price">
                    <strong>{price.amount}</strong>
                    <small>{copy.annualLabel}</small>
                  </div>
                </div>
              )}

              {plan.seats ? (
                <p className="pricing-seats-hint">{copy.seatsHint(plan.seats, plan.seatsMax)}</p>
              ) : null}

              <div className="admin-pricing-features-title">{copy.features}</div>
              <ul className="admin-pricing-feature-list">
                {(plan.features[language] || plan.features.fr).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
