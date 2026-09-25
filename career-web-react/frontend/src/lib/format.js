// Formatage de devises, partagé par plusieurs modules (Tarifs, Négociation
// salariale...). Pas de dépendance à React : utilisable côté composant comme
// côté logique pure.
export const CURRENCY_OPTIONS = [
  { id: "EUR", label: "EUR (€)", symbol: "€", rate: 1, position: "after" },
  { id: "USD", label: "USD ($)", symbol: "$", rate: 1.08, position: "before" },
  { id: "GBP", label: "GBP (£)", symbol: "£", rate: 0.85, position: "before" }
];

export function getCurrencyOption(currency) {
  return CURRENCY_OPTIONS.find((item) => item.id === currency) || CURRENCY_OPTIONS[0];
}

// Formate le prix d'un plan tarifaire (gratuit, prix annuel-only, ou
// mensuel/annuel selon le cycle choisi) — utilisé par la page Tarifs et par
// la vue Admin en lecture seule des tarifs.
export function formatPlanPrice(plan, billingCycle, language, copy, currency = "EUR") {
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) {
    return { amount: copy.free, unit: "" };
  }

  if (plan.monthlyPrice == null) {
    const unit = plan.annualPriceUnit?.[language] || plan.annualPriceUnit?.fr || copy.perYear;
    return { amount: formatAmountInCurrency(plan.annualPrice, currency), unit };
  }

  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const unit = billingCycle === "annual" ? copy.perYear : copy.perMonth;
  return { amount: formatAmountInCurrency(amount, currency), unit };
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
}

// Date + heure réelles de l'horodatage stocké en base (converti dans le
// fuseau horaire du navigateur) : « 24/09/2026 à 14:32 ». Une valeur sans
// heure (AAAA-MM-JJ) reste affichée comme une simple date.
export function formatDateTime(value, language = "fr") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const locale = language === "en" ? "en-GB" : "fr-FR";
  const day = date.toLocaleDateString(locale);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return day;
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return language === "en" ? `${day}, ${time}` : `${day} à ${time}`;
}

export function formatShortDate(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short" });
}

// Remplace les placeholders {clé} d'un texte par la valeur correspondante,
// sans rien remplacer si la valeur est vide (le placeholder reste visible
// plutôt que d'afficher une chaîne cassée).
export function fillTemplate(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (match, key) => (values[key] != null && values[key] !== "" ? values[key] : match));
}

export function formatAmountInCurrency(amountEur, currency, { decimals } = {}) {
  const option = getCurrencyOption(currency);
  const converted = Number(amountEur) * option.rate;
  const hasDecimals = decimals ?? !Number.isInteger(converted);
  const formatted = converted.toLocaleString("fr-FR", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  });
  return option.position === "before" ? `${option.symbol}${formatted}` : `${formatted} ${option.symbol}`;
}
