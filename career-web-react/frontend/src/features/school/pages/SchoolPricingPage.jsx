import React, { useEffect, useState } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { PLANS } from "../../../data/plans.js";
import { formatPlanPrice } from "../../../lib/format.js";
import { getPlanOverrides } from "../../../lib/inMemoryDb.js";

// Module "Tarifs" côté École : lecture seule des grilles école/établissement
// (les écoles ne peuvent pas éditer les prix, seul l'Admin le peut via
// AdminPricingPage — on lit les mêmes overrides pour afficher le prix
// réellement facturé).
export default function SchoolPricingPage({ user, language, currency = "EUR" }) {
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    getPlanOverrides()
      .then((data) => setOverrides(data?.overrides || {}))
      .catch(() => setOverrides({}));
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

  return (
    <section className="admin-pricing school-pricing">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

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
            <article key={plan.id} className={`admin-pricing-card ${plan.highlighted ? "recommended" : ""}`}>
              <div className="admin-pricing-card-head">
                <div>
                  <div className="admin-pricing-badges">
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
