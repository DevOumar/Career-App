import { downloadBlob } from "./pdfDownload.js";

// Génère la facture PDF (moteur chargé à la demande) et la télécharge.
export async function downloadInvoicePdf(invoice) {
  const { renderInvoicePdf } = await import("../pdf/InvoicePdf.jsx");
  const blob = await renderInvoicePdf(invoice);
  downloadBlob(blob, `Facture-${invoice.number}.pdf`);
}

// Statut lisible d'une opération : jamais « offert » pour un compte créé par
// l'admin (réglé hors application) ; les étudiants/recruteurs rattachés par
// code sont « inclus dans la licence ».
export function transactionStatus(item, t) {
  if (item.refunded) return { id: "refunded", label: t("Remboursé", "Refunded"), tone: "tag-danger" };
  if (item.source === "license_redeem") return { id: "included", label: t("Inclus dans la licence", "Included in license"), tone: "" };
  if (Number(item.amountCollected || 0) > 0) {
    return item.source === "stripe"
      ? { id: "paid", label: t("Payé", "Paid"), tone: "tag-success" }
      : { id: "paid", label: t("Payé hors application", "Paid offline"), tone: "tag-success" };
  }
  return { id: "unbilled", label: t("Non facturé", "Not billed"), tone: "tag-warning" };
}

export function hasInvoice(item) {
  return ["stripe", "admin_created", "admin_manual"].includes(item.source) && Number(item.listedAmount || 0) > 0;
}
