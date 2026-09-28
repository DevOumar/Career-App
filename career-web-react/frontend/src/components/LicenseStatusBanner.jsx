import React from "react";

// Bandeau d'échéance de la licence d'une école ou d'un cabinet : rappel dans
// les 30 derniers jours, alerte une fois la licence expirée.
export function LicenseStatusBanner({ user, language }) {
  const sub = user?.subscription || {};
  if (sub.plan !== "premium" || !sub.renewalAt) return null;
  const en = language === "en";
  const due = new Date(sub.renewalAt);
  const dateLabel = due.toLocaleDateString(en ? "en-GB" : "fr-FR");
  const daysLeft = Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const expired = sub.status === "expired" || daysLeft <= 0;
  if (!expired && daysLeft > 30) return null;
  return (
    <div className={`license-status-banner ${expired ? "is-expired" : ""}`} role="status">
      <strong>
        {expired
          ? en
            ? `Your license expired on ${dateLabel}`
            : `Votre licence a expiré le ${dateLabel}`
          : en
          ? `Your license ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""} (${dateLabel})`
          : `Votre licence arrive à échéance dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""} (${dateLabel})`}
      </strong>
      <span>
        {expired
          ? en
            ? "Your linked users keep their accounts and data, but their access is paused. Contact Career CV (contact@careercv.fr) to renew."
            : "Vos utilisateurs rattachés gardent leurs comptes et leurs données, mais leur accès est suspendu. Contactez Career CV (contact@careercv.fr) pour la renouveler."
          : en
          ? "Contact Career CV (contact@careercv.fr) to renew it and avoid any interruption for your users."
          : "Contactez Career CV (contact@careercv.fr) pour la renouveler et éviter toute interruption pour vos utilisateurs."}
      </span>
    </div>
  );
}
