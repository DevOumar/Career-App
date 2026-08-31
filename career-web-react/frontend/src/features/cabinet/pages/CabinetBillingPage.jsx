import React from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { BillingHistoryTab } from "../../pricing/PricingPage.jsx";

export default function CabinetBillingPage({ user, language, currency }) {
  const copy =
    language === "en"
      ? { title: "Billing", subtitle: "Payment history for your firm's license." }
      : { title: "Facturation", subtitle: "Historique des paiements pour la licence de votre cabinet." };

  return (
    <section className="cv-history-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="scale" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="card block">
        <BillingHistoryTab userId={user.id} language={language} currency={currency} />
      </div>
    </section>
  );
}
