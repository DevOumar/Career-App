import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDate } from "../../../lib/format.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import {
  getApiBase,
  getSchoolOverview,
  getSchoolStudents,
  getSchoolLicense,
  getSchoolInsights,
  getSchoolInvitations,
  getSchoolNotifications,
  getSchoolProfile,
  updateSchoolProfile,
  getSchoolPromotions,
  createSchoolPromotion,
  deleteSchoolPromotion,
  updateSchoolPromotionStudent,
  getSchoolReports,
  sendSchoolInvitation,
  removeSchoolStudent,
  markSchoolNotificationsRead,
  generateSchoolReport
} from "../../../lib/inMemoryDb.js";
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolLicensePage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "My license",
          subtitle: "Seats granted by Career CV for your institution.",
          seats: "Seats used",
          plan: "Plan",
          created: "Issued on",
          active: "Active",
          revoked: "Revoked",
          copy: "Copy code",
          copied: "Copied!",
          reveal: "Show code",
          hide: "Hide code",
          remaining: "seats left",
          emptyTitle: "No license code yet",
          empty: "Contact Career CV to get a license for your institution."
        }
      : {
          title: "Ma licence",
          subtitle: "Sièges accordés par Career CV pour votre établissement.",
          seats: "Sièges utilisés",
          plan: "Plan",
          created: "Émise le",
          active: "Active",
          revoked: "Révoquée",
          copy: "Copier le code",
          copied: "Copié !",
          reveal: "Afficher le code",
          hide: "Masquer le code",
          remaining: "sièges restants",
          emptyTitle: "Aucun code de licence",
          empty: "Contactez Career CV pour obtenir une licence pour votre établissement."
        };

  const [codes, setCodes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolLicense(user.id)
      .then(setCodes)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {codes.length ? (
        <div className="school-license-grid">
          {codes.map((item) => (
            <SchoolLicenseCard key={item.code} item={item} language={language} currency={currency} copy={copy} />
          ))}
        </div>
      ) : (
        <SchoolEmptyState icon="save" title={copy.emptyTitle} hint={copy.empty} />
      )}
    </section>
  );
}
