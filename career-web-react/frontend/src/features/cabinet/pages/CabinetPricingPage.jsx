import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { PLANS } from "../../../data/plans.js";
import { formatPlanPrice } from "../../../lib/format.js";
import { getPlanOverrides } from "../../../lib/inMemoryDb.js";

export default function CabinetPricingPage({ user, language, currency = "EUR" }) {
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    getPlanOverrides()
      .then((data) => setOverrides(data?.overrides || {}))
      .catch(() => setOverrides({}));
  }, [user.id]);

  const copy =
    language === "en"
      ? { title: "Pricing", subtitle: "Plans available for your recruitment firm." }
      : { title: "Tarifs", subtitle: "Grilles disponibles pour votre cabinet." };

  const agencyPlans = PLANS.filter((plan) => plan.segment === "agency");

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="pricetag" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="pricing-grid">
        {agencyPlans.map((plan) => {
          const effective = overrides[plan.id] || { monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice };
          const price = formatPlanPrice({ ...plan, monthlyPrice: effective.monthlyPrice, annualPrice: effective.annualPrice }, "monthly", language, currency);
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
  );
}
