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

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
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
