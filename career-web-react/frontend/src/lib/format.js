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
