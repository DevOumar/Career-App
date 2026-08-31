import React from "react";
// Module École : facturation — même historique de transactions que côté
// candidat (GET /api/billing/transactions, déjà générique par userId), on
// réutilise donc directement BillingHistoryTab plutôt que de dupliquer la
// logique de filtre/pagination.
import { BillingHistoryTab } from "../../pricing/PricingPage.jsx";

export default function SchoolBillingPage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "Billing",
          subtitle: "Payment history for your institution's license."
        }
      : {
          title: "Facturation",
          subtitle: "Historique des paiements pour la licence de votre établissement."
        };

  return (
    <section className="admin-accounts school-billing">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-panel">
        <BillingHistoryTab userId={user.id} language={language} currency={currency} />
      </div>
    </section>
  );
}
