import React from "react";
// Module Admin : interface d'administration de la plateforme (dashboard,
// comptes, finance, licences, modération IA, paramètres, annonces...).
// Le dashboard École vit désormais séparément dans features/school/ ; les
// deux modules continuent de partager quelques composants (AdminKpiCard,
// AdminTrendChart, AdminPagination...) exportés d'ici et importés par
// features/school/SchoolApp.jsx.
//
// NOTE : ce fichier reste volumineux (déplacement mécanique depuis App.jsx,
// pas une réécriture) — un découpage en un fichier par page admin est une
// suite possible, pas un prérequis pour que ce module soit isolé du reste
// de l'app.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../components/AdminKpiCard.jsx";
import { AdminExportCsvButton } from "../../components/AdminExportCsvButton.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
// AccountDrawer/ConnectedFooter restent définis dans App.jsx (composants
// d'app-shell partagés avec le candidat) — import "arrière" volontaire, sûr
// ici car ces composants ne sont utilisés qu'au rendu (jamais à
// l'évaluation du module), bien après la résolution du cycle ESM.
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter, ADMIN_ACCOUNT_TYPES } from "../../App.jsx";
import { PLANS, PLAN_SEGMENTS, getPlanById } from "../../data/plans.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate, formatDateTime, formatShortDate, formatAmountInCurrency, formatPlanPrice } from "../../lib/format.js";
import { fileToBase64 } from "../../lib/cvService.js";
import { getAccountLabel } from "../../lib/accounts.js";
import { satisfactionTierFor } from "../satisfaction/SatisfactionSurveyModal.jsx";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminActivityLog,
  getAdminAiMonitoring,
  getAdminAiSamples,
  getAdminCvs,
  getAdminFinance,
  getAdminLicenseCodes,
  getAdminMatches,
  getAdminOrgAccounts,
  getAdminOverview,
  getAdminNotifications,
  getAdminQuality,
  getPlanOverrides,
  getAdminPlans,
  updateAdminPlan,
  resetAdminPlan,
  refundAdminTransaction,
  getAdminSettings,
  revokeAdminLicenseCode,
  restoreAdminLicenseCode,
  getAdminAnnouncementAudienceCount,
  getAdminAnnouncements,
  sendAdminAnnouncement,
  deleteAdminCv,
  reanalyzeAdminCv,
  updateAdminSetting,
  updateAdminUser,
  updateAdminUserStatus,
  listAdminUsers,
  getAdminSatisfaction,
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
} from "../../lib/inMemoryDb.js";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminPricingPage from "./pages/AdminPricingPage.jsx";
import AdminAccountsPage from "./pages/AdminAccountsPage.jsx";
import AdminSchoolsPage from "./pages/AdminSchoolsPage.jsx";
import AdminCabinetsPage from "./pages/AdminCabinetsPage.jsx";
import AdminCvsPage from "./pages/AdminCvsPage.jsx";
import AdminMatchesPage from "./pages/AdminMatchesPage.jsx";
import AdminQualityPage from "./pages/AdminQualityPage.jsx";
import AdminAiMonitoringPage from "./pages/AdminAiMonitoringPage.jsx";
import AdminFinancePage from "./pages/AdminFinancePage.jsx";
import AdminActivityLogPage from "./pages/AdminActivityLogPage.jsx";
import AdminSatisfactionPage from "./pages/AdminSatisfactionPage.jsx";
import AdminLicenseCodesPage from "./pages/AdminLicenseCodesPage.jsx";
import AdminAiSamplesPage from "./pages/AdminAiSamplesPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage.jsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.jsx";
import AdminHelpPage from "./pages/AdminHelpPage.jsx";

export const ADMIN_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "accounts", icon: "profile" },
  { id: "schools", icon: "network" },
  { id: "cabinets", icon: "briefcase" },
  { id: "adminCvs", icon: "save" },
  { id: "adminMatches", icon: "matchmark" },
  { id: "quality", icon: "shield" },
  { id: "aiMonitoring", icon: "chart" },
  { id: "finance", icon: "scale" },
  { id: "licenses", icon: "save" },
  { id: "aiSamples", icon: "shield" },
  { id: "settings", icon: "globe" },
  { id: "announcements", icon: "mail" },
  { id: "activity", icon: "history" },
  { id: "pricing", icon: "pricetag" },
  { id: "satisfaction", icon: "chat" }
];

export function getAllowedAdminModules(user) {
  const modules = Array.isArray(user?.adminModules) ? user.adminModules : [];
  if (!modules.length) return ADMIN_MODULE_DEFS.map((item) => item.id);
  return ADMIN_MODULE_DEFS.map((item) => item.id).filter((id) => modules.includes(id));
}

export const ADMIN_MODULE_LABELS = {
  dashboard: { fr: "Accueil", en: "Home" },
  accounts: { fr: "Comptes", en: "Accounts" },
  schools: { fr: "Écoles", en: "Schools" },
  cabinets: { fr: "Cabinets", en: "Cabinets" },
  adminCvs: { fr: "CV importés", en: "Uploaded CVs" },
  adminMatches: { fr: "Offres analysées", en: "Analyzed jobs" },
  quality: { fr: "Qualité extraction", en: "Extraction quality" },
  aiMonitoring: { fr: "Monitoring IA", en: "AI monitoring" },
  finance: { fr: "Finance", en: "Finance" },
  activity: { fr: "Journal d'activité", en: "Activity log" },
  licenses: { fr: "Codes de licence", en: "License codes" },
  aiSamples: { fr: "Modération IA", en: "AI moderation" },
  settings: { fr: "Paramètres", en: "Settings" },
  announcements: { fr: "Messagerie", en: "Messaging" },
  pricing: { fr: "Tarifs", en: "Pricing" },
  satisfaction: { fr: "Satisfaction", en: "Satisfaction" }
};

// Navigation de l'espace administrateur, inspirée de l'espace avocat Jurysia :
// "Accueil" épinglé en tête, groupes repliables, "Paramètres" épinglé en pied.
const ADMIN_NAV_HOME = "dashboard";
const ADMIN_NAV_FOOTER = ["settings"];
const ADMIN_NAV_GROUPS = [
  { id: "pilotage", label: { fr: "Pilotage", en: "Monitoring" }, modules: ["activity", "satisfaction"] },
  { id: "users", label: { fr: "Utilisateurs", en: "Users" }, modules: ["accounts", "schools", "cabinets", "licenses"] },
  { id: "content", label: { fr: "Contenus & IA", en: "Content & AI" }, modules: ["adminCvs", "adminMatches", "quality", "aiMonitoring", "aiSamples"] },
  { id: "revenue", label: { fr: "Revenus", en: "Revenue" }, modules: ["finance", "pricing"] },
  { id: "communication", label: { fr: "Communication", en: "Communication" }, modules: ["announcements"] }
];

// Icônes au trait (style Jurysia), partagées avec les pages admin.
export function AdminLineIcon({ name, className = "" }) {
  const paths = {
    dashboard: (
      <>
        <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
        <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
        <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
        <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
      </>
    ),
    accounts: (
      <>
        <circle cx="8" cy="7" r="3" />
        <path d="M3 17a5 5 0 0 1 10 0" />
        <path d="M13.5 4.3a3 3 0 0 1 0 5.4" />
        <path d="M15.5 12.5A4.8 4.8 0 0 1 17.5 17" />
      </>
    ),
    schools: (
      <>
        <path d="M2.5 8 10 4l7.5 4-7.5 4-7.5-4Z" />
        <path d="M5 9.4v4.2c1.4 1.2 3 1.8 5 1.8s3.6-.6 5-1.8V9.4" />
      </>
    ),
    cabinets: (
      <>
        <rect x="3" y="6" width="14" height="10.5" rx="1.8" />
        <path d="M7.5 6V4.6A1.6 1.6 0 0 1 9.1 3h1.8a1.6 1.6 0 0 1 1.6 1.6V6" />
        <path d="M3 10.5h14" />
      </>
    ),
    adminCvs: (
      <>
        <path d="M5.5 2.8h6l3.5 3.6v10.8h-9.5z" />
        <path d="M11.2 3v3.7h3.7" />
        <path d="M8 11h5M8 14h3.5" />
      </>
    ),
    adminMatches: (
      <>
        <circle cx="7" cy="10" r="4" />
        <circle cx="13" cy="10" r="4" />
      </>
    ),
    quality: (
      <>
        <path d="M10 2.8 16 5.3v4.4c0 3.3-2.3 5.9-6 7.5-3.7-1.6-6-4.2-6-7.5V5.3l6-2.5Z" />
        <path d="m7.3 10 1.9 1.9 3.6-3.8" />
      </>
    ),
    aiMonitoring: (
      <>
        <path d="M2.5 10h3l2-4.5 3 9 2-4.5h5" />
      </>
    ),
    finance: (
      <>
        <rect x="2.5" y="5" width="15" height="10.5" rx="1.8" />
        <path d="M2.5 8.5h15" />
        <path d="M6 12.5h3" />
      </>
    ),
    licenses: (
      <>
        <circle cx="7" cy="12.5" r="3.2" />
        <path d="m9.3 10.2 6.2-6.2M13.2 6.3l1.8 1.8M11.6 7.9l1.4 1.4" />
      </>
    ),
    aiSamples: (
      <>
        <rect x="4" y="6" width="12" height="9.5" rx="2.2" />
        <path d="M10 3v3M7.5 10.2h.01M12.5 10.2h.01M8 13h4" />
      </>
    ),
    settings: (
      <>
        <circle cx="10" cy="10" r="2.5" />
        <path d="M10 2.5v2M10 15.5v2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M2.5 10h2M15.5 10h2M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
      </>
    ),
    announcements: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="m3.5 6 6.5 4.8L16.5 6" />
      </>
    ),
    activity: (
      <>
        <path d="M3.5 10a6.5 6.5 0 1 0 1.9-4.6" />
        <path d="M3.5 3.5v3h3" />
        <path d="M10 6.8V10l2.4 1.6" />
      </>
    ),
    pricing: (
      <>
        <path d="M3 4.8V9.6l7.2 7.2a1.8 1.8 0 0 0 2.5 0l4.1-4.1a1.8 1.8 0 0 0 0-2.5L9.6 3H4.8A1.8 1.8 0 0 0 3 4.8Z" />
        <circle cx="6.8" cy="6.8" r="1.1" />
      </>
    ),
    satisfaction: (
      <>
        <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h8a2.5 2.5 0 0 1 2.5 2.5v5.5A2.5 2.5 0 0 1 14 13.5H9l-4 3.2v-3.3a2.5 2.5 0 0 1-1.5-2.3V5.5Z" />
        <path d="M7.3 7.5h5.4M7.3 10h3.4" />
      </>
    ),
    search: (
      <>
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.2 13.2 3.8 3.8" />
      </>
    ),
    bell: (
      <>
        <path d="M5 13.5V9a5 5 0 0 1 10 0v4.5l1.5 1.5h-13L5 13.5Z" />
        <path d="M8.3 17.3a1.9 1.9 0 0 0 3.4 0" />
      </>
    ),
    help: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7.8 7.8a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.5v.4" />
        <path d="M10 14.4h.01" />
      </>
    ),
    chevronDown: <path d="m5.5 8 4.5 4.5L14.5 8" />,
    chevronRight: <path d="m8 5.5 4.5 4.5L8 14.5" />,
    plus: <path d="M10 4v12M4 10h12" />,
    close: <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />,
    eye: (
      <>
        <path d="M1.8 10S4.8 4.5 10 4.5 18.2 10 18.2 10 15.2 15.5 10 15.5 1.8 10 1.8 10Z" />
        <circle cx="10" cy="10" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M8.2 4.7A8 8 0 0 1 10 4.5c5.2 0 8.2 5.5 8.2 5.5a14 14 0 0 1-2.2 2.9M5.6 5.9C3.1 7.5 1.8 10 1.8 10s3 5.5 8.2 5.5a7.8 7.8 0 0 0 3.6-.9" />
        <path d="M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5M2.5 2.5l15 15" />
      </>
    ),
    enter: <path d="M15.5 4.5v6a2 2 0 0 1-2 2h-9M7.5 9.5l-3 3 3 3" />,
    smile: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7 11.8a3.6 3.6 0 0 0 6 0M7.5 8h.01M12.5 8h.01" />
      </>
    ),
    meh: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7 12.5h6M7.5 8h.01M12.5 8h.01" />
      </>
    ),
    frown: (
      <>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7 13.2a3.6 3.6 0 0 1 6 0M7.5 8h.01M12.5 8h.01" />
      </>
    ),
    trash: (
      <>
        <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
        <path d="M5 5.5 6 16a1.5 1.5 0 0 0 1.5 1.4h5A1.5 1.5 0 0 0 14 16l1-10.5" />
        <path d="M8.5 9v5M11.5 9v5" />
      </>
    ),
    edit: (
      <>
        <path d="M12.5 4.5 15.5 7.5 7 16H4v-3l8.5-8.5Z" />
        <path d="m11 6 3 3" />
      </>
    ),
    send: (
      <>
        <path d="M17 3 8.5 11.5" />
        <path d="M17 3 11.5 17 8.5 11.5 3 8.5 17 3Z" />
      </>
    ),
    key: (
      <>
        <circle cx="7" cy="12.5" r="3.2" />
        <path d="m9.3 10.2 6.2-6.2M13.2 6.3l1.8 1.8" />
      </>
    ),
    alert: (
      <>
        <path d="M10 3 17.5 16h-15L10 3Z" />
        <path d="M10 8v3.5M10 13.8h.01" />
      </>
    ),
    paragraph: <path d="M4 5h12M4 10h12M4 15h7" />,
    bold: <path d="M6 4h5a3 3 0 0 1 0 6H6zM6 10h6a3 3 0 0 1 0 6H6z" />,
    italic: <path d="M9 4h6M5 16h6M12 4 8 16" />,
    quote: (
      <>
        <path d="M4 12.5c0-3 1.3-5 4-6.5M11 12.5c0-3 1.3-5 4-6.5" />
        <circle cx="6" cy="13" r="2" />
        <circle cx="13" cy="13" r="2" />
      </>
    ),
    list: <path d="M8 5.5h9M8 10h9M8 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" />,
    numbered: <path d="M8.5 5.5H17M8.5 10H17M8.5 14.5H17M3.5 4.5l1-.5v3.5M3 12.3a1.2 1.2 0 0 1 2.2.6c0 .9-2.2 1.7-2.2 2.6h2.3" />,
    link: (
      <>
        <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" />
        <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" />
      </>
    ),
    clock: (
      <>
        <circle cx="10" cy="10.5" r="6.5" />
        <path d="M10 7.2v3.3l2.2 1.4M8 2.5h4" />
      </>
    ),
    sidebar: (
      <>
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7.5 3v14" />
      </>
    ),
    profile: (
      <>
        <circle cx="10" cy="7" r="3.2" />
        <path d="M4 17a6 6 0 0 1 12 0" />
      </>
    ),
    logout: (
      <>
        <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3" />
        <path d="M13 6.5 16.5 10 13 13.5M16.5 10H8" />
      </>
    ),
    card: (
      <>
        <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
        <path d="M2.5 8h15" />
      </>
    ),
    seat: (
      <>
        <rect x="3" y="5" width="14" height="10" rx="2" />
        <path d="M6 12h.01M9 12h.01" />
      </>
    ),
    upload: (
      <>
        <path d="M10 13V3.5M6.5 7 10 3.5 13.5 7" />
        <path d="M3.5 13v2.5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V13" />
      </>
    ),
    trend: (
      <>
        <path d="m3 14 4.5-4.5 3 3L17 6" />
        <path d="M12.5 6H17v4.5" />
      </>
    ),
    phone: <path d="M6.2 3.5H4.5a1 1 0 0 0-1 1.1A13 13 0 0 0 15.4 16.5a1 1 0 0 0 1.1-1v-1.7a1 1 0 0 0-.7-.9l-2.5-.8a1 1 0 0 0-1 .3l-1 1a9.6 9.6 0 0 1-4.2-4.2l1-1a1 1 0 0 0 .3-1l-.8-2.5a1 1 0 0 0-.9-.7Z" />,
    briefcase: (
      <>
        <rect x="2.5" y="6" width="15" height="11" rx="1.8" />
        <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M2.5 10.5h15" />
      </>
    ),
    layers: (
      <>
        <path d="m10 3 7.5 3.8L10 10.6 2.5 6.8 10 3Z" />
        <path d="m2.5 10.2 7.5 3.8 7.5-3.8M2.5 13.6l7.5 3.9 7.5-3.9" />
      </>
    ),
    compare: (
      <>
        <path d="M10 3v14M6 17h8" />
        <path d="M4 6h12M4 6l-2 5a2.5 2.5 0 0 0 4 0L4 6ZM16 6l-2 5a2.5 2.5 0 0 0 4 0l-2-5Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4.5" width="14" height="12.5" rx="1.8" />
        <path d="M3 8.5h14M7 3v3M13 3v3" />
      </>
    ),
    report: (
      <>
        <path d="M11.5 3H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V7Z" />
        <path d="M11.5 3v4h4M8 14v-2.5M10.5 14v-4.5M13 14v-1.5" />
      </>
    ),
    book: (
      <>
        <path d="M10 5.5C8.6 4.4 6.6 4 3.5 4v11c3.1 0 5.1.4 6.5 1.5 1.4-1.1 3.4-1.5 6.5-1.5V4c-3.1 0-5.1.4-6.5 1.5Z" />
        <path d="M10 5.5v11" />
      </>
    ),
    info: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 9v4.5M10 6.6v.1" />
      </>
    ),
    sliders: (
      <>
        <path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6" />
        <circle cx="11.5" cy="6" r="2" />
        <circle cx="8.5" cy="14" r="2" />
      </>
    ),
    columns: (
      <>
        <rect x="3" y="3.5" width="14" height="13" rx="1.6" />
        <path d="M7.8 3.5v13M12.2 3.5v13" />
      </>
    ),
    download: (
      <>
        <path d="M10 3.5V13M6.5 9.5 10 13l3.5-3.5" />
        <path d="M3.5 13v2.5A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5V13" />
      </>
    ),
    reset: (
      <>
        <path d="M4 10a6 6 0 1 0 1.8-4.3" />
        <path d="M4 3.5v3.2h3.2" />
      </>
    ),
    sheet: (
      <>
        <path d="M11.5 3H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V7Z" />
        <path d="M11.5 3v4h4M7.5 10.5h5M7.5 13.5h5M10 9v6" />
      </>
    ),
    fileText: (
      <>
        <path d="M11.5 3H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V7Z" />
        <path d="M11.5 3v4h4M7.5 10.5h5M7.5 13.5h3.5" />
      </>
    ),
    fileType: (
      <>
        <path d="M11.5 3H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 17h8a1.5 1.5 0 0 0 1.5-1.5V7Z" />
        <path d="M11.5 3v4h4M7.5 10h5M10 10v4.5" />
      </>
    ),
    printer: (
      <>
        <path d="M6 7.5V3.5h8v4" />
        <rect x="3" y="7.5" width="14" height="6.5" rx="1.5" />
        <path d="M6 12h8v4.5H6z" />
      </>
    )
  };
  return (
    <svg className={`admin-line-icon ${className}`} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {paths[name] || paths.dashboard}
    </svg>
  );
}

const ADMIN_TAB_SESSION_KEY = "career_app_admin_tab";

function AdminApp({
  user,
  language,
  setLanguage,
  currency,
  setCurrency,
  theme,
  setTheme,
  mode,
  setMode,
  density,
  setDensity,
  onLogout,
  landingCopy,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onRequestSecondaryEmail,
  onVerifySecondaryEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
  onRemoveConnectedAccount,
  onLinkGoogleAccount,
  securityForm,
  setSecurityForm,
  securitySaving,
  onSubmitPassword,
  onRevokeSession,
  onRevokeOtherSessions,
  currentSessionId,
  onExportData,
  onExportSummary,
  onDeleteAccount,
  onNavigateLegal
}) {
  const allowedModules = getAllowedAdminModules(user);
  // Module ouvert : Accueil à chaque connexion. Le dernier module n'est gardé
  // que pour la session de l'onglet (sessionStorage), afin qu'un simple
  // rafraîchissement (F5) ne ramène pas l'admin à l'Accueil.
  const homeTab = allowedModules.includes("dashboard") ? "dashboard" : allowedModules[0] || "dashboard";
  const [tab, setTab] = useState(() => {
    try {
      localStorage.removeItem("career_app_admin_tab");
      const saved = sessionStorage.getItem(ADMIN_TAB_SESSION_KEY);
      return saved && (allowedModules.includes(saved) || saved === "notifications" || saved === "helpCenter") ? saved : homeTab;
    } catch (_error) {
      return homeTab;
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  // Desktop : barre latérale réduite (icônes seules). Mobile : tiroir ouvert/fermé.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("career_app_admin_sidebar") === "collapsed";
    } catch (_error) {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState([]);
  const [moduleQuery, setModuleQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [accountsSearch, setAccountsSearch] = useState("");
  const [licenseSearch, setLicenseSearch] = useState("");
  const [financeSearch, setFinanceSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("career_app_admin_recent_searches") || "[]").slice(0, 5);
    } catch (_error) {
      return [];
    }
  });
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifReadIds, setNotifReadIds] = useState(() => readAdminNotifIds(user.id));
  const [routeLoading, setRouteLoading] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchCopy =
    language === "en"
      ? { placeholder: "Search an account, a license…" }
      : { placeholder: "Rechercher un compte, une licence…" };

  // Ctrl/Cmd + K ouvre (ou ferme) la palette de recherche, comme dans Jurysia.
  useEffect(() => {
    function handleShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      setPaletteIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 30);
    } else {
      setSearchInput("");
    }
  }, [paletteOpen]);

  useEffect(() => {
    const term = searchInput.trim();
    setPaletteIndex(0);
    if (!term) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return undefined;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      const lookups = [];
      if (allowedModules.includes("accounts")) {
        lookups.push(
          listAdminUsers(user.id, { search: term })
            .then((items) => items.slice(0, 5).map((item) => ({ kind: "account", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("licenses")) {
        lookups.push(
          getAdminLicenseCodes(user.id, { search: term })
            .then((items) => items.slice(0, 3).map((item) => ({ kind: "license", ...item })))
            .catch(() => [])
        );
      }
      if (allowedModules.includes("finance")) {
        lookups.push(
          getAdminFinance(user.id, { search: term })
            .then((data) => (data.items || []).slice(0, 3).map((item) => ({ kind: "transaction", ...item })))
            .catch(() => [])
        );
      }
      Promise.all(lookups).then((groups) => {
        setSearchSuggestions(groups.flat());
        setSearchLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    function handleClickOutsideNotif(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideNotif);
    return () => document.removeEventListener("mousedown", handleClickOutsideNotif);
  }, []);

  useEffect(() => {
    let cancelled = false;
    function load() {
      getAdminNotifications(user.id)
        .then((items) => {
          if (!cancelled) setNotifications(items || []);
        })
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user.id]);

  function rememberSearch(term) {
    const value = String(term || "").trim();
    if (!value) return;
    setRecentSearches((prev) => {
      const next = [value, ...prev.filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("career_app_admin_recent_searches", JSON.stringify(next));
      } catch (_error) {
        // stockage indisponible : historique non conservé
      }
      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try {
      localStorage.removeItem("career_app_admin_recent_searches");
    } catch (_error) {
      // ignore
    }
  }

  function goToResult(item) {
    rememberSearch(searchInput);
    setPaletteOpen(false);
    if (item.kind === "module") {
      setTab(item.id);
    } else if (item.kind === "license") {
      setLicenseSearch(item.code);
      setTab("licenses");
    } else if (item.kind === "transaction") {
      setFinanceSearch(item.userEmail || item.id);
      setTab("finance");
    } else {
      setAccountsSearch(item.email);
      setTab("accounts");
    }
  }

  const copy =
    language === "en"
      ? {
          dashboard: "Home",
          pricing: "Pricing",
          accounts: "Accounts",
          adminCvs: "Uploaded CVs",
          adminMatches: "Analyzed jobs",
          quality: "Extraction quality",
          aiMonitoring: "AI monitoring",
          finance: "Finance",
          activity: "Activity log",
          licenses: "License codes",
          aiSamples: "AI moderation",
          settings: "Settings",
          announcements: "Messaging",
          accountSettings: "My profile",
          logout: "Log out",
          role: "Administrator",
          mainRole: "Platform administrator",
          secured: "Secured by",
          platform: "Platform",
          platformTagline: "Platform administration",
          searchModule: "Search a module…",
          noModule: "No module matches.",
          modulesAccess: "Module access",
          collapse: "Collapse",
          expand: "Expand",
          newAnnouncement: "New",
          help: "Help center",
          home: "Home",
          notifications: "Notifications",
          helpCenter: "Help center"
        }
      : {
          dashboard: "Accueil",
          pricing: "Tarifs",
          accounts: "Comptes",
          adminCvs: "CV importés",
          adminMatches: "Offres analysées",
          quality: "Qualité extraction",
          aiMonitoring: "Monitoring IA",
          finance: "Finance",
          activity: "Journal d'activité",
          licenses: "Codes de licence",
          aiSamples: "Modération IA",
          settings: "Paramètres",
          announcements: "Messagerie",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur",
          mainRole: "Administrateur principal",
          secured: "Sécurisé par",
          platform: "Plateforme",
          platformTagline: "Administration de la plateforme",
          searchModule: "Rechercher un module…",
          noModule: "Aucun module ne correspond.",
          modulesAccess: "Accès modules",
          collapse: "Réduire",
          expand: "Déplier",
          newAnnouncement: "Nouveau",
          help: "Centre d'aide",
          home: "Accueil",
          notifications: "Notifications",
          helpCenter: "Centre d'aide"
        };
  const getAdminModuleLabel = (id) => copy[id] || ADMIN_MODULE_LABELS[id]?.[language] || ADMIN_MODULE_LABELS[id]?.fr || id;
  const normalizedQuery = moduleQuery.trim().toLowerCase();
  const matchesQuery = (id) => !normalizedQuery || getAdminModuleLabel(id).toLowerCase().includes(normalizedQuery);
  const visibleNavGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    modules: group.modules.filter((id) => allowedModules.includes(id) && matchesQuery(id))
  })).filter((group) => group.modules.length);
  const showHome = allowedModules.includes(ADMIN_NAV_HOME) && matchesQuery(ADMIN_NAV_HOME);
  const footerModules = ADMIN_NAV_FOOTER.filter((id) => allowedModules.includes(id) && matchesQuery(id));
  const moduleShare = Math.round((allowedModules.length / ADMIN_MODULE_DEFS.length) * 100);

  // Palette de recherche (Ctrl K) : modules + comptes + licences + transactions.
  const paletteCopy =
    language === "en"
      ? {
          placeholder: "Search a module, an account, a license, a transaction…",
          hint: "Start typing to search the platform.",
          loading: "Searching…",
          noResult: (term) => `No result for "${term}".`,
          recent: "Recent searches",
          clear: "Clear",
          groups: { module: "Modules", account: "Accounts", license: "License codes", transaction: "Transactions" }
        }
      : {
          placeholder: "Rechercher un module, un compte, une licence, une transaction…",
          hint: "Commencez à taper pour rechercher dans la plateforme.",
          loading: "Recherche…",
          noResult: (term) => `Aucun résultat pour « ${term} ».`,
          recent: "Recherches récentes",
          clear: "Effacer",
          groups: { module: "Modules", account: "Comptes", license: "Codes de licence", transaction: "Transactions" }
        };
  const paletteTerm = searchInput.trim().toLowerCase();
  const moduleResults = paletteTerm
    ? allowedModules
        .filter((id) => getAdminModuleLabel(id).toLowerCase().includes(paletteTerm))
        .slice(0, 4)
        .map((id) => ({ kind: "module", id }))
    : [];
  const paletteItems = [...moduleResults, ...searchSuggestions];
  const paletteGroups = ["module", "account", "license", "transaction"]
    .map((kind) => ({ key: kind, title: paletteCopy.groups[kind], items: paletteItems.filter((item) => item.kind === kind) }))
    .filter((group) => group.items.length);
  const paletteLabel = (item) => {
    if (item.kind === "module") return getAdminModuleLabel(item.id);
    if (item.kind === "license") return item.code;
    if (item.kind === "transaction") return `${item.userFirstName || ""} ${item.userLastName || ""}`.trim() || item.userEmail || "-";
    return `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email;
  };
  const paletteSublabel = (item) => {
    if (item.kind === "module") return language === "en" ? "Open the module" : "Ouvrir le module";
    if (item.kind === "license") return `${item.ownerFirstName || ""} ${item.ownerLastName || ""}`.trim() + ` · ${item.seatsUsed}/${item.seatsTotal}`;
    if (item.kind === "transaction") return `${formatEur(item.amountCollected, item.currency)} · ${item.planId}`;
    return item.email;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (tab !== "notifications" && tab !== "helpCenter" && !allowedModules.includes(tab)) {
      setTab(allowedModules[0] || "dashboard");
    }
  }, [tab, allowedModules]);

  useEffect(() => {
    try {
      sessionStorage.setItem(ADMIN_TAB_SESSION_KEY, tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  useEffect(() => {
    try {
      localStorage.setItem("career_app_admin_sidebar", sidebarCollapsed ? "collapsed" : "open");
    } catch (_error) {
      // ignore storage errors
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    setRouteLoading(true);
    setMobileNavOpen(false);
    const timer = window.setTimeout(() => setRouteLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [tab]);

  // À la déconnexion, on oublie le module courant : la prochaine connexion
  // (même dans le même onglet) repart sur l'Accueil.
  function handleLogout() {
    try {
      sessionStorage.removeItem(ADMIN_TAB_SESSION_KEY);
    } catch (_error) {
      // stockage indisponible : rien à nettoyer
    }
    onLogout?.();
  }

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 1024px)").matches) {
      setMobileNavOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  }

  function toggleGroup(groupId) {
    setClosedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  }

  function renderNavItem(id) {
    const label = getAdminModuleLabel(id);
    return (
      <button
        key={id}
        type="button"
        className={`jy-nav-item ${tab === id ? "active" : ""}`}
        onClick={() => setTab(id)}
        title={sidebarCollapsed ? label : undefined}
        aria-current={tab === id ? "page" : undefined}
      >
        <AdminLineIcon name={id} />
        <span className="jy-nav-label">{label}</span>
      </button>
    );
  }

  function renderAdminPage() {
    if (tab === "dashboard" && allowedModules.includes("dashboard")) {
      return <AdminDashboardPage user={user} language={language} allowedModules={allowedModules} onNavigate={setTab} />;
    }
    if (tab === "accounts" && allowedModules.includes("accounts")) {
      return <AdminAccountsPage user={user} language={language} currency={currency} initialSearch={accountsSearch} />;
    }
    if (tab === "schools" && allowedModules.includes("schools")) return <AdminSchoolsPage user={user} language={language} />;
    if (tab === "cabinets" && allowedModules.includes("cabinets")) return <AdminCabinetsPage user={user} language={language} />;
    if (tab === "adminCvs" && allowedModules.includes("adminCvs")) return <AdminCvsPage user={user} language={language} />;
    if (tab === "adminMatches" && allowedModules.includes("adminMatches")) return <AdminMatchesPage user={user} language={language} />;
    if (tab === "quality" && allowedModules.includes("quality")) return <AdminQualityPage user={user} language={language} />;
    if (tab === "aiMonitoring" && allowedModules.includes("aiMonitoring")) return <AdminAiMonitoringPage user={user} language={language} />;
    if (tab === "finance" && allowedModules.includes("finance")) {
      return <AdminFinancePage user={user} language={language} currency={currency} initialSearch={financeSearch} />;
    }
    if (tab === "activity" && allowedModules.includes("activity")) return <AdminActivityLogPage user={user} language={language} currency={currency} />;
    if (tab === "licenses" && allowedModules.includes("licenses")) {
      return <AdminLicenseCodesPage user={user} language={language} initialSearch={licenseSearch} />;
    }
    if (tab === "aiSamples" && allowedModules.includes("aiSamples")) return <AdminAiSamplesPage user={user} language={language} />;
    if (tab === "settings" && allowedModules.includes("settings")) return <AdminSettingsPage user={user} language={language} />;
    if (tab === "announcements" && allowedModules.includes("announcements")) return <AdminAnnouncementsPage user={user} language={language} />;
    if (tab === "pricing" && allowedModules.includes("pricing")) return <AdminPricingPage user={user} language={language} currency={currency} />;
    if (tab === "satisfaction" && allowedModules.includes("satisfaction")) return <AdminSatisfactionPage user={user} language={language} />;
    if (tab === "helpCenter") return <AdminHelpPage language={language} onContact={onNavigateLegal ? () => onNavigateLegal("contact") : null} />;
    if (tab === "notifications")
      return (
        <AdminNotificationsPage
          language={language}
          notifications={notifications}
          readIds={notifReadIds}
          onOpen={openNotification}
          onMarkAllRead={() => markNotifsRead(notifications.map((item) => item.id))}
        />
      );
    return <AdminPageLoader language={language} />;
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const notifEvents = [...notifications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const unreadCount = notifEvents.filter((item) => !notifReadIds.includes(item.id)).length;
  // Les ids lus sont restreints aux événements encore présents : la liste
  // stockée ne grossit jamais indéfiniment.
  function markNotifsRead(ids) {
    setNotifReadIds((prev) => {
      const current = new Set(notifications.map((item) => item.id));
      const next = [...new Set([...prev, ...ids])].filter((id) => current.has(id));
      saveAdminNotifIds(user.id, next);
      return next;
    });
  }
  function openNotification(item) {
    markNotifsRead([item.id]);
    setNotifOpen(false);
    const target = adminNotificationTab(item);
    if (allowedModules.includes(target)) setTab(target);
  }

  return (
    <div
      className={`admin-shell-root jy-admin ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileNavOpen ? "is-mobile-open" : ""}`}
    >
      <aside className="jy-sidebar" aria-label={language === "en" ? "Admin navigation" : "Navigation administrateur"}>
        <button type="button" className="jy-brand" onClick={() => setTab("dashboard")}>
          <img className="jy-brand-mark" src="/logo-mark.png" alt="" aria-hidden="true" width="46" height="46" />
          <span className="jy-brand-text">
            <strong>Career CV</strong>
            <span>{copy.platformTagline}</span>
          </span>
        </button>

        <label className="jy-module-search">
          <AdminLineIcon name="search" />
          <input
            value={moduleQuery}
            onChange={(event) => setModuleQuery(event.target.value)}
            placeholder={copy.searchModule}
            aria-label={copy.searchModule}
          />
          {moduleQuery ? (
            <button
              type="button"
              className="jy-clear"
              aria-label={language === "en" ? "Clear" : "Effacer"}
              onClick={(event) => {
                event.preventDefault();
                setModuleQuery("");
              }}
            >
              <AdminLineIcon name="close" />
            </button>
          ) : null}
        </label>

        <nav className="jy-nav">
          {showHome ? renderNavItem(ADMIN_NAV_HOME) : null}
          {visibleNavGroups.map((group) => {
            const isOpen = normalizedQuery || !closedGroups.includes(group.id);
            return (
              <div key={group.id} className={`jy-nav-group ${isOpen ? "open" : ""}`}>
                <button type="button" className="jy-nav-group-head" onClick={() => toggleGroup(group.id)} aria-expanded={Boolean(isOpen)}>
                  <span>{group.label[language] || group.label.fr}</span>
                  <AdminLineIcon name="chevronDown" />
                </button>
                {isOpen ? <div className="jy-nav-group-items">{group.modules.map(renderNavItem)}</div> : null}
              </div>
            );
          })}
          {!showHome && !visibleNavGroups.length && !footerModules.length ? <p className="jy-nav-empty">{copy.noModule}</p> : null}
        </nav>

        <div className="jy-sidebar-foot">
          {footerModules.map(renderNavItem)}

          <div className="jy-meter">
            <div className="jy-meter-row">
              <span>
                <AdminLineIcon name="seat" /> {copy.modulesAccess}
              </span>
              <strong>
                {allowedModules.length} / {ADMIN_MODULE_DEFS.length}
              </strong>
            </div>
            <span className="jy-meter-bar">
              <span style={{ width: `${moduleShare}%` }} />
            </span>
          </div>

          <button type="button" className="jy-sidebar-user" onClick={openAccountSettings}>
            <AvatarCircle user={user} />
            <span>
              <strong>{fullName}</strong>
              <small>{copy.mainRole}</small>
            </span>
          </button>

          <button type="button" className="jy-collapse" onClick={toggleSidebar}>
            <AdminLineIcon name="sidebar" />
            <span className="jy-nav-label">{sidebarCollapsed ? copy.expand : copy.collapse}</span>
          </button>
        </div>
      </aside>

      <button type="button" className="jy-scrim" aria-label={copy.collapse} onClick={() => setMobileNavOpen(false)} />

      <div className="jy-main">
        <header className="jy-topbar">
          <button
            type="button"
            className="jy-icon-btn jy-toggle"
            aria-label={language === "en" ? "Toggle sidebar" : "Afficher/masquer le menu"}
            onClick={toggleSidebar}
          >
            <AdminLineIcon name="sidebar" />
          </button>

          <button type="button" className="jy-search jy-search-trigger" onClick={() => setPaletteOpen(true)}>
            <AdminLineIcon name="search" />
            <span>{searchCopy.placeholder}</span>
            <kbd>Ctrl K</kbd>
          </button>

          <div className="jy-topbar-actions">
            {allowedModules.includes("activity") ? (
              <button type="button" className="jy-btn jy-btn-outline jy-hide-sm" onClick={() => setTab("activity")}>
                <AdminLineIcon name="clock" />
                <span>{copy.activity}</span>
              </button>
            ) : null}
            {allowedModules.includes("announcements") ? (
              <button type="button" className="jy-btn jy-btn-primary" onClick={() => setTab("announcements")}>
                <AdminLineIcon name="plus" />
                <span className="jy-hide-xs">{copy.newAnnouncement}</span>
              </button>
            ) : null}

            <span className="jy-divider" />

            <div className="jy-notif" ref={notifRef}>
              <button
                type="button"
                className="jy-icon-btn"
                title={copy.notifications}
                aria-label={copy.notifications}
                onClick={() => setNotifOpen((prev) => !prev)}
              >
                <AdminLineIcon name="bell" />
                {unreadCount ? <span className="jy-badge is-new">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
              </button>
              {notifOpen ? (
                <div className="jy-popover jy-notif-panel">
                  <div className="jy-notif-head">
                    <strong>{copy.notifications}</strong>
                    {unreadCount ? (
                      <button type="button" onClick={() => markNotifsRead(notifEvents.map((item) => item.id))}>
                        {language === "en" ? "Mark all as read" : "Tout marquer comme lu"}
                      </button>
                    ) : null}
                  </div>
                  <div className="jy-notif-events">
                    {notifEvents.length ? (
                      notifEvents.map((item) => {
                        const text = adminNotificationText(item, language);
                        const unread = !notifReadIds.includes(item.id);
                        return (
                          <button key={item.id} type="button" className={`jy-notif-event ${unread ? "is-unread" : ""}`} onClick={() => openNotification(item)}>
                            <span className="jy-notif-event-icon">
                              <AdminLineIcon name={adminNotificationIcon(item)} />
                            </span>
                            <span className="jy-notif-event-body">
                              <strong>{text.title}</strong>
                              {text.detail ? <span>{text.detail}</span> : null}
                              {item.createdAt ? <small>{adminNotifRelativeLabel(item.createdAt, language)}</small> : null}
                            </span>
                            {unread ? <span className="jy-notif-dot" aria-label={language === "en" ? "Unread" : "Non lue"} /> : null}
                          </button>
                        );
                      })
                    ) : (
                      <div className="jy-notif-none">
                        <AdminLineIcon name="bell" />
                        <span>{language === "en" ? "No notifications." : "Aucune notification."}</span>
                      </div>
                    )}
                  </div>
                  <div className="jy-popover-foot">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setTab("notifications");
                      }}
                    >
                      {language === "en" ? "View all notifications" : "Voir toutes les notifications"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="jy-icon-btn jy-hide-sm"
              title={copy.help}
              aria-label={copy.help}
              onClick={() => setTab("helpCenter")}
            >
              <AdminLineIcon name="help" />
            </button>

            <span className="jy-hide-sm">
              <LanguageSwitch language={language} setLanguage={setLanguage} variant="menu" />
            </span>

            <span className="jy-divider jy-hide-sm" />

            <div className="jy-user" ref={userMenuRef}>
              <button type="button" className="jy-user-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
                <span className="jy-user-avatar">
                  <AvatarCircle user={user} />
                  <i aria-hidden="true" />
                </span>
                <span className="jy-user-meta" title={fullName}>
                  <strong>{fullName}</strong>
                  <small>{copy.role}</small>
                </span>
                <AdminLineIcon name="chevronDown" className="jy-user-chevron" />
              </button>

              {userMenuOpen ? (
                <div className="jy-popover jy-user-menu">
                  <div className="jy-user-menu-head">
                    <AvatarCircle user={user} />
                    <div>
                      <strong>{fullName}</strong>
                      <span>{user.username || user.email.split("@")[0]}</span>
                    </div>
                  </div>
                  <button type="button" onClick={openAccountSettings}>
                    <AdminLineIcon name="profile" />
                    {copy.accountSettings}
                  </button>
                  {allowedModules.includes("settings") ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("settings");
                        setUserMenuOpen(false);
                      }}
                    >
                      <AdminLineIcon name="settings" />
                      {copy.settings}
                    </button>
                  ) : null}
                  <button type="button" className="danger" onClick={handleLogout}>
                    <AdminLineIcon name="logout" />
                    {copy.logout}
                  </button>
                  <div className="jy-user-menu-foot">
                    {copy.secured} <strong>Career CV</strong>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="jy-content">
          {tab !== "dashboard" ? (
            <nav className="jy-breadcrumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => setTab("dashboard")}>
                {copy.home}
              </button>
              <AdminLineIcon name="chevronRight" />
              <span>{getAdminModuleLabel(tab)}</span>
            </nav>
          ) : null}

          {routeLoading ? <AdminPageLoader language={language} /> : renderAdminPage()}
        </main>

        <ConnectedFooter
          copy={landingCopy}
          onBrandClick={() => setTab("dashboard")}
          onHomeClick={() => setTab("dashboard")}
          onPricingClick={() => setTab("pricing")}
          onAboutClick={() => onNavigateLegal?.("about")}
          onContactClick={() => onNavigateLegal?.("contact")}
          onPrivacyClick={() => onNavigateLegal?.("privacy")}
          onTermsClick={() => onNavigateLegal?.("terms")}
          onCookiesClick={() => onNavigateLegal?.("cookies")}
          onSecurityClick={() => onNavigateLegal?.("security")}
        />
      </div>


      {paletteOpen ? (
        <div className="jy-palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPaletteOpen(false)}>
          <div className="jy-palette" role="dialog" aria-modal="true" aria-label={searchCopy.placeholder}>
            <div className="jy-palette-input">
              <AdminLineIcon name="search" />
              <input
                ref={searchInputRef}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setPaletteIndex((prev) => Math.min(prev + 1, Math.max(0, paletteItems.length - 1)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setPaletteIndex((prev) => Math.max(prev - 1, 0));
                  } else if (event.key === "Enter" && paletteItems[paletteIndex]) {
                    event.preventDefault();
                    goToResult(paletteItems[paletteIndex]);
                  }
                }}
                placeholder={paletteCopy.placeholder}
                aria-label={paletteCopy.placeholder}
              />
              <kbd>Esc</kbd>
            </div>

            <div className="jy-palette-body">
              {!searchInput.trim() ? (
                recentSearches.length ? (
                  <>
                    <div className="jy-palette-group-head">
                      <span>{paletteCopy.recent}</span>
                      <button type="button" onClick={clearRecentSearches}>
                        {paletteCopy.clear}
                      </button>
                    </div>
                    {recentSearches.map((term) => (
                      <button key={term} type="button" className="jy-palette-recent" onClick={() => setSearchInput(term)}>
                        <AdminLineIcon name="clock" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="jy-palette-hint">{paletteCopy.hint}</p>
                )
              ) : searchLoading && !paletteItems.length ? (
                <p className="jy-palette-hint">{paletteCopy.loading}</p>
              ) : !paletteItems.length ? (
                <p className="jy-palette-hint">{paletteCopy.noResult(searchInput.trim())}</p>
              ) : (
                paletteGroups.map((group) => (
                  <div key={group.key} className="jy-palette-group">
                    <p className="jy-palette-group-title">{group.title}</p>
                    {group.items.map((item) => {
                      const index = paletteItems.indexOf(item);
                      return (
                        <button
                          key={`${item.kind}-${item.id || item.code}`}
                          type="button"
                          className={`jy-palette-item ${index === paletteIndex ? "active" : ""}`}
                          onMouseEnter={() => setPaletteIndex(index)}
                          onClick={() => goToResult(item)}
                        >
                          {item.kind === "account" ? (
                            <AvatarCircle user={item} />
                          ) : (
                            <span className="jy-palette-icon">
                              <AdminLineIcon name={item.kind === "module" ? item.id : item.kind === "license" ? "licenses" : "finance"} />
                            </span>
                          )}
                          <span className="jy-palette-text">
                            <strong>{paletteLabel(item)}</strong>
                            <small>{paletteSublabel(item)}</small>
                          </span>
                          <AdminLineIcon name="enter" className="jy-palette-enter" />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {accountDrawerOpen ? (
        <AccountDrawer
          user={user}
          language={language}
          setLanguage={setLanguage}
          currency={currency}
          setCurrency={setCurrency}
          theme={theme}
          setTheme={setTheme}
          mode={mode}
          setMode={setMode}
          density={density}
          setDensity={setDensity}
          activePanel={accountPanel}
          setActivePanel={setAccountPanel}
          onClose={() => setAccountDrawerOpen(false)}
          onSaveAccount={onSaveAccount}
          onAvatarUpload={onAvatarUpload}
          avatarUploading={avatarUploading}
          onRequestSecondaryEmail={onRequestSecondaryEmail}
          onVerifySecondaryEmail={onVerifySecondaryEmail}
          onSetPrimaryEmail={onSetPrimaryEmail}
          onRemoveEmail={onRemoveEmail}
          onRemoveConnectedAccount={onRemoveConnectedAccount}
          onLinkGoogleAccount={onLinkGoogleAccount}
          securityForm={securityForm}
          setSecurityForm={setSecurityForm}
          securitySaving={securitySaving}
          onSubmitPassword={onSubmitPassword}
          onRevokeSession={onRevokeSession}
          onRevokeOtherSessions={onRevokeOtherSessions}
          currentSessionId={currentSessionId}
          onExportData={onExportData}
          onExportSummary={onExportSummary}
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

// Maximum "rond" de l'axe Y, découpé en 4 graduations entières
// (ex. 10 -> 12 avec des pas de 3), comme sur le graphique Jurysia.
function niceAxisMax(value) {
  const rawStep = Math.max(1, value / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rawStep && Number.isInteger(candidate)) || 10 * magnitude;
  return step * 4;
}

// Histogramme façon Jurysia ("Activité financière") : axe Y gradué, lignes
// pointillées, une barre par série et par semaine (vert, or…).
// series = [{ key, label, tone: "green" | "gold" }] ; fixedMax force l'axe
// (ex. 10 pour un score sur 10) ; formatValue formate valeurs et graduations.
export function JyBarChart({ trend, series, language, formatValue, fixedMax }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  if (!trend?.length) return <p className="jy-empty">{t("Pas encore de données.", "No data yet.")}</p>;
  const axisMax =
    fixedMax || niceAxisMax(Math.max(...trend.flatMap((point) => series.map((item) => Number(point[item.key] || 0)))));
  const ticks = [4, 3, 2, 1, 0].map((index) => (axisMax / 4) * index);
  const display = formatValue || ((value) => (Number.isInteger(value) ? value : value.toFixed(1)));
  const axisWidth = `${Math.max(2.2, Math.max(...ticks.map((tick) => String(display(tick)).length)) * 0.5 + 0.4)}rem`;
  const weekFormatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short" });

  return (
    <div className="jy-chart">
      {series.length > 1 ? (
      <div className="jy-chart-legend">
        {series.map((item) => (
          <span key={item.key}>
            <i className={item.tone} /> {item.label}
          </span>
        ))}
      </div>
      ) : null}
      <div className="jy-chart-body" style={{ "--jy-axis-w": axisWidth }}>
        <div className="jy-chart-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{display(tick)}</span>
          ))}
        </div>
        <div className="jy-chart-plot">
          <div className="jy-chart-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} />
            ))}
          </div>
          <div className="jy-chart-cols">
            {trend.map((point) => (
              <div key={point.weekStart} className="jy-chart-col">
                <div className="jy-chart-bars">
                  {series.map((item) => {
                    const value = Number(point[item.key] || 0);
                    return (
                      <span
                        key={item.key}
                        className={`jy-chart-bar ${item.tone}`}
                        style={{ height: `${(value / axisMax) * 100}%` }}
                        title={`${item.label} : ${display(value)}`}
                      >
                        <em>{display(value)}</em>
                      </span>
                    );
                  })}
                </div>
                <span className="jy-chart-label">{weekFormatter.format(new Date(point.weekStart))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Panneau latéral droit de détails (comme les fiches de Jurysia) : s'ouvre au
// clic sur une ligne de tableau. sections = [{ title, rows: [[libellé, valeur]] }
// ou { title, content }] ; footer = boutons d'action.
export function JyDrawer({ open, onClose, title, subtitle, avatar, badges, sections = [], footer, language }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="jy-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <aside className="jy-drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="jy-drawer-head">
          <div className="jy-drawer-identity">
            {avatar}
            <div>
              <h3>{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="jy-icon-btn" aria-label={language === "en" ? "Close" : "Fermer"} onClick={onClose}>
            <AdminLineIcon name="close" />
          </button>
        </div>
        {badges ? <div className="jy-drawer-badges">{badges}</div> : null}
        <div className="jy-drawer-body">
          {sections
            .filter(Boolean)
            .map((section) => (
              <section key={section.title} className="jy-drawer-section">
                <h4>{section.title}</h4>
                {section.rows ? (
                  <dl>
                    {section.rows
                      .filter((row) => row && row[1] != null && row[1] !== "")
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                ) : (
                  section.content
                )}
              </section>
            ))}
        </div>
        {footer ? <div className="jy-drawer-foot">{footer}</div> : null}
      </aside>
    </div>
  );
}

// Codes techniques de l'extraction de CV -> libellés lisibles (Qualité
// extraction, Monitoring IA).
export const CV_ISSUE_LABELS = {
  email: { fr: "E-mail manquant", en: "Missing email" },
  skills: { fr: "Compétences manquantes", en: "Missing skills" },
  experiences: { fr: "Expériences manquantes", en: "Missing experiences" },
  education: { fr: "Formation manquante", en: "Missing education" },
  short_skill: { fr: "Compétence trop courte", en: "Skill too short" },
  experience_incomplete: { fr: "Expérience incomplète", en: "Incomplete experience" },
  education_incomplete: { fr: "Formation incomplète", en: "Incomplete education" },
  linkedin_incomplete: { fr: "Lien LinkedIn incomplet", en: "Incomplete LinkedIn link" }
};

export function cvIssueLabel(code, language) {
  return (
    CV_ISSUE_LABELS[code]?.[language] ||
    CV_ISSUE_LABELS[code]?.fr ||
    String(code || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
  );
}

export const ADMIN_DASHBOARD_ROLES = [
  { id: "student", icon: "profile", color: "#1a0dab" },
  { id: "school", icon: "shield", color: "#237804" },
  { id: "recruiter_firm", icon: "briefcase", color: "#fa8c16" }
];

export function AdminTrendChart({ trend, language, valueKey = "count", formatValue }) {
  if (!trend?.length) return null;
  const max = Math.max(1, ...trend.map((point) => point[valueKey]));
  const weekFormatter = new Intl.DateTimeFormat(language === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "2-digit"
  });
  const display = formatValue || ((value) => value);

  return (
    <div className="admin-trend-chart">
      {trend.map((point) => (
        <div key={point.weekStart} className="admin-trend-bar-col">
          <div className="admin-trend-bar-track">
            <div
              className="admin-trend-bar"
              style={{ height: `${Math.max(4, (point[valueKey] / max) * 100)}%` }}
              title={`${display(point[valueKey])}`}
            >
              {point[valueKey] > 0 ? <span>{display(point[valueKey])}</span> : null}
            </div>
          </div>
          <span className="admin-trend-label">{weekFormatter.format(new Date(point.weekStart))}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDonutChart({ segments, emptyLabel }) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return <p className="muted">{emptyLabel}</p>;

  let cumulative = 0;
  const stops = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const start = (cumulative / total) * 360;
      cumulative += seg.value;
      const end = (cumulative / total) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="admin-donut-wrap">
      <div className="admin-donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="admin-donut-hole">
          <strong>{total}</strong>
        </div>
      </div>
      <div className="admin-donut-legend">
        {segments
          .filter((seg) => seg.value > 0)
          .map((seg) => (
            <div key={seg.label} className="admin-donut-legend-row">
              <span className="admin-donut-dot" style={{ background: seg.color }} />
              <span>{seg.label}</span>
              <strong>{seg.value}</strong>
            </div>
          ))}
      </div>
    </div>
  );
}


export const ADMIN_ACCOUNT_SUBTABS = [
  { id: "all", label: { fr: "Tous les comptes", en: "All accounts" } },
  { id: "student", label: { fr: "Étudiants", en: "Students" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets", en: "Agencies" } },
  { id: "admin", label: { fr: "Administrateurs", en: "Administrators" } }
];

export const ADMIN_PAGE_SIZE = 8;

export function getPaginationRange(current, total, delta = 1) {
  const range = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots = [];
  let last = 0;
  for (const num of range) {
    if (last) {
      if (num - last === 2) withDots.push(last + 1);
      else if (num - last > 2) withDots.push("…");
    }
    withDots.push(num);
    last = num;
  }
  return withDots;
}

export function AdminPagination({ page, totalPages, onChange, language, totalItems, pageSize = ADMIN_PAGE_SIZE }) {
  if (totalPages <= 1) return null;

  const copy =
    language === "en"
      ? {
          previous: "Previous",
          next: "Next",
          showing: (from, to, total) => `Showing ${from} to ${to} of ${total} entries`
        }
      : {
          previous: "Précédent",
          next: "Suivant",
          showing: (from, to, total) => `Affichage de ${from} à ${to} sur ${total} entrées`
        };

  const from = totalItems ? (page - 1) * pageSize + 1 : null;
  const to = totalItems ? Math.min(page * pageSize, totalItems) : null;
  const pageNumbers = getPaginationRange(page, totalPages);

  return (
    <div className="admin-pagination-bar">
      <span className="admin-pagination-info">{totalItems ? copy.showing(from, to, totalItems) : ""}</span>
      <div className="admin-pagination">
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {copy.previous}
        </button>
        {pageNumbers.map((num, index) =>
          num === "…" ? (
            <span key={`dots-${index}`} className="admin-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={num}
              type="button"
              className={`admin-pagination-num ${num === page ? "active" : ""}`}
              onClick={() => onChange(num)}
            >
              {num}
            </button>
          )
        )}
        <button
          type="button"
          className="admin-pagination-textbtn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {copy.next}
        </button>
      </div>
    </div>
  );
}

export function AdminOrgCard({ org, language, roleType }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const isSchool = roleType === "school";
  const totalSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsTotal || 0), 0);
  const usedSeats = org.licenseCodes.reduce((sum, code) => sum + Number(code.seatsUsed || 0), 0);
  const seatRatio = totalSeats ? Math.min(100, Math.round((usedSeats / totalSeats) * 100)) : 0;
  const nearFull = totalSeats > 0 && seatRatio >= 90;
  const contactName = `${org.firstName || ""} ${org.lastName || ""}`.trim();
  const orgName = org.organizationName || contactName || org.email;
  // Seuls les plans connus sont affichés (jamais un identifiant technique brut).
  const plans = [...new Set(org.licenseCodes.map((code) => getPlanById(code.planId)?.name?.[language] || getPlanById(code.planId)?.name?.fr).filter(Boolean))];

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: t("Code copié.", "Code copied."),
        showConfirmButton: false,
        timer: 1800,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (_error) {
      Swal.fire({ icon: "info", title: code });
    }
  }

  return (
    <article className="jy-org-card">
      <header className="jy-org-head">
        <span className="jy-org-logo">
          {org.avatarDataUrl ? <AvatarCircle user={org} /> : <AdminLineIcon name={isSchool ? "schools" : "cabinets"} />}
        </span>
        <div className="jy-org-title">
          <h3>{orgName}</h3>
          <p>
            <AdminLineIcon name="profile" />
            {contactName ? <span>{contactName}</span> : null}
            <span className="jy-org-email">{org.email}</span>
          </p>
        </div>
        <div className="jy-org-meta">
          {plans.length ? <span className="tag tag-success">{plans.join(" · ")}</span> : null}
          <small>
            {t("Créé le", "Created on")} {formatDateTime(org.createdAt, language)}
          </small>
        </div>
      </header>

      <div className="jy-org-stats">
        <div className="jy-org-stat">
          <span className="jy-mini-card-label">
            <AdminLineIcon name="seat" />
            {t("Sièges utilisés", "Seats used")}
          </span>
          <strong className={nearFull ? "danger" : ""}>
            {usedSeats}
            <em>/{totalSeats}</em>
          </strong>
          <span className="jy-progress jy-progress-wide">
            <span className={nearFull ? "is-danger" : ""} style={{ width: `${seatRatio}%` }} />
          </span>
          <small>
            {totalSeats
              ? nearFull
                ? t("Bientôt complet", "Almost full")
                : t(`${Math.max(0, totalSeats - usedSeats)} siège(s) disponible(s)`, `${Math.max(0, totalSeats - usedSeats)} seat(s) left`)
              : t("Aucune licence achetée", "No license purchased")}
          </small>
        </div>

        <div className="jy-org-stat">
          <span className="jy-mini-card-label">
            <AdminLineIcon name="accounts" />
            {isSchool ? t("Étudiants inscrits", "Enrolled students") : t("Membres", "Members")}
          </span>
          <strong>{org.members.length}</strong>
          <small>{t("liés à un code de licence", "linked to a license code")}</small>
        </div>

        <div className="jy-org-stat">
          <span className="jy-mini-card-label">
            <AdminLineIcon name="licenses" />
            {t("Codes de licence", "License codes")}
          </span>
          {org.licenseCodes.length ? (
            <div className="jy-org-codes">
              {org.licenseCodes.map((code) => (
                <button
                  key={code.code}
                  type="button"
                  className="jy-org-code"
                  title={t("Copier le code", "Copy code")}
                  onClick={() => copyCode(code.code)}
                >
                  <code>{code.code}</code>
                  <span>
                    {code.seatsUsed}/{code.seatsTotal}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <small>{t("Aucun code généré", "No code generated")}</small>
          )}
        </div>
      </div>

      <div className="jy-org-members">
        <h4>
          {isSchool ? t("Étudiants", "Students") : t("Membres", "Members")}
          <span>{org.members.length}</span>
        </h4>
        {org.members.length ? (
          <ul>
            {org.members.map((member) => (
              <li key={member.id}>
                <AvatarCircle user={member} />
                <div>
                  <strong>
                    {`${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email}
                  </strong>
                  <span>{member.email}</span>
                </div>
                {member.createdAt ? (
                  <small>
                    {t("Inscrit le", "Joined")} {formatDateTime(member.createdAt, language)}
                  </small>
                ) : null}
                <span className="tag">{getAccountLabel(member.roleType, language)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="jy-org-empty">
            <AdminLineIcon name="accounts" />
            <div>
              <strong>{isSchool ? t("Aucun étudiant pour l'instant", "No student yet") : t("Aucun membre pour l'instant", "No member yet")}</strong>
              <span>
                {isSchool
                  ? t("Les étudiants apparaîtront ici dès qu'ils utiliseront un code de licence de l'école.", "Students will appear here as soon as they redeem one of the school's license codes.")
                  : t("Les recruteurs apparaîtront ici dès qu'ils utiliseront un code de licence du cabinet.", "Recruiters will appear here as soon as they redeem one of the firm's license codes.")}
              </span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}


export const ADMIN_FINANCE_SOURCES = [
  { id: "", label: { fr: "Toutes les sources", en: "All sources" } },
  { id: "stripe", label: { fr: "Stripe (paiement réel)", en: "Stripe (real payment)" } },
  { id: "instant", label: { fr: "Activation instantanée", en: "Instant activation" } },
  { id: "license_redeem", label: { fr: "Code de licence", en: "License code" } },
  { id: "admin_created", label: { fr: "Créé par l'admin", en: "Created by admin" } }
];

export function formatEur(amount, currency = "EUR") {
  return formatAmountInCurrency(amount, currency, { decimals: true });
}

export function planPriceLabel(planId, billingCycle, freeLabel, currency = "EUR") {
  const plan = getPlanById(planId);
  if (!plan) return "-";
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) return freeLabel || "Gratuit";
  if (plan.monthlyPrice == null) {
    const amount = formatEur(plan.annualPrice, currency);
    return plan.pricedPerSeat ? `${amount} / étudiant / an` : amount;
  }
  const amount = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  return `${formatEur(amount, currency)} / ${billingCycle === "annual" ? "an" : "mois"}`;
}

export function AdminMiniMetric({ label, value, icon = "chart", tone = "" }) {
  return (
    <article className={`admin-mini-metric ${tone}`}>
      <span>
        <UiIcon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}


export const ADMIN_EVENT_LABELS = {
  login_password: { fr: "Connexion (mot de passe)", en: "Login (password)" },
  login_google: { fr: "Connexion (Google)", en: "Login (Google)" },
  login_email_code: { fr: "Connexion (code e-mail)", en: "Login (email code)" },
  signup_email_code: { fr: "Inscription (code e-mail)", en: "Signup (email code)" },
  login_locked: { fr: "Connexion bloquée", en: "Login locked" },
  password_changed: { fr: "Mot de passe modifié", en: "Password changed" },
  cv_trashed: { fr: "CV placé(s) en corbeille", en: "CV(s) moved to trash" },
  cv_restored: { fr: "CV restauré(s)", en: "CV(s) restored" },
  cv_purged: { fr: "CV supprimé(s) définitivement", en: "CV(s) permanently deleted" },
  password_set: { fr: "Mot de passe créé (compte Google)", en: "Password created (Google account)" },
  mfa_challenge_started: { fr: "Double authentification demandée", en: "Two-factor check requested" },
  mfa_failed: { fr: "Échec de la double authentification", en: "Two-factor check failed" },
  mfa_totp_enabled: { fr: "Application d'authentification activée", en: "Authenticator app enabled" },
  mfa_totp_disabled: { fr: "Application d'authentification désactivée", en: "Authenticator app disabled" },
  mfa_key_added: { fr: "Clé de sécurité ajoutée", en: "Security key added" },
  mfa_key_revoked: { fr: "Clé de sécurité révoquée", en: "Security key revoked" },
  mfa_recovery_regenerated: { fr: "Codes de récupération régénérés", en: "Recovery codes regenerated" },
  mfa_recovery_code_used: { fr: "Code de récupération utilisé", en: "Recovery code used" },
  password_reset_requested: { fr: "Réinitialisation demandée", en: "Password reset requested" },
  password_reset_completed: { fr: "Mot de passe réinitialisé", en: "Password reset completed" },
  session_revoked: { fr: "Session révoquée", en: "Session revoked" },
  email_finder_search: { fr: "Recherche Email Scout", en: "Email Scout search" },
  cabinet_candidate_created: { fr: "Candidat ajouté (cabinet)", en: "Candidate added (agency)" },
  cabinet_candidate_deleted: { fr: "Candidat supprimé (cabinet)", en: "Candidate deleted (agency)" },
  cabinet_invitation_sent: { fr: "Invitation recruteur envoyée", en: "Recruiter invitation sent" },
  cabinet_invitation_bulk_sent: { fr: "Invitations recruteurs en masse", en: "Bulk recruiter invitations" },
  cabinet_profile_updated: { fr: "Profil cabinet modifié", en: "Agency profile updated" },
  cabinet_recruiter_removed: { fr: "Recruteur retiré (cabinet)", en: "Recruiter removed (agency)" },
  school_profile_updated: { fr: "Profil école modifié", en: "School profile updated" },
  school_promotion_student_added: { fr: "Étudiant ajouté à une promotion", en: "Student added to a class" },
  school_promotion_student_removed: { fr: "Étudiant retiré d'une promotion", en: "Student removed from a class" },
  school_student_removed: { fr: "Étudiant retiré (école)", en: "Student removed (school)" },
  connected_account_linked: { fr: "Compte Google lié", en: "Google account linked" },
  connected_account_removed: { fr: "Compte Google délié", en: "Google account unlinked" },
  account_deleted: { fr: "Compte supprimé (par l'utilisateur)", en: "Account deleted (by user)" },
  admin_user_updated: { fr: "Compte modifié par l'admin", en: "Account edited by admin" },
  admin_user_deleted: { fr: "Compte supprimé par l'admin", en: "Account deleted by admin" },
  admin_user_suspended: { fr: "Compte suspendu par l'admin", en: "Account suspended by admin" },
  admin_user_reactivated: { fr: "Compte réactivé par l'admin", en: "Account reactivated by admin" },
  admin_cv_reanalyzed: { fr: "CV réanalysé par l'admin", en: "CV reanalyzed by admin" },
  admin_cv_deleted: { fr: "CV supprimé par l'admin", en: "CV deleted by admin" },
  admin_license_code_revoked: { fr: "Code de licence révoqué", en: "License code revoked" },
  admin_license_code_restored: { fr: "Code de licence restauré", en: "License code restored" },
  admin_setting_changed: { fr: "Paramètre plateforme modifié", en: "Platform setting changed" },
  admin_transaction_refunded: { fr: "Transaction remboursée par l'admin", en: "Transaction refunded by admin" },
  admin_plan_price_changed: { fr: "Prix d'un plan modifié", en: "Plan price changed" },
  admin_plan_price_reset: { fr: "Prix d'un plan réinitialisé", en: "Plan price reset" },
  admin_announcement_sent: { fr: "Annonce plateforme envoyée", en: "Platform announcement sent" },
  admin_announcement_deleted: { fr: "Annonce supprimée de l'historique", en: "Announcement removed from history" },
  school_promotion_created: { fr: "Promotion créée (école)", en: "Promotion created (school)" },
  school_promotion_deleted: { fr: "Promotion supprimée (école)", en: "Promotion deleted (school)" },
  school_invitation_sent: { fr: "Invitation étudiant envoyée", en: "Student invitation sent" },
  school_invitation_bulk_sent: { fr: "Invitations en masse envoyées", en: "Bulk invitations sent" },
  school_announcement_sent: { fr: "Annonce école envoyée", en: "School announcement sent" },
  school_event_created: { fr: "Événement école créé", en: "School event created" },
  school_event_deleted: { fr: "Événement école supprimé", en: "School event deleted" },
  school_report_generated: { fr: "Rapport école généré", en: "School report generated" }
};

export function eventTypeLabel(eventType, language) {
  return ADMIN_EVENT_LABELS[eventType]?.[language] || ADMIN_EVENT_LABELS[eventType]?.fr || eventType;
}

// Traduit chaque type de notification admin en texte affichable. Chaque type
// correspond à un événement réel détecté côté serveur (nouvelle inscription,
// paiement Stripe encaissé, licence épuisée, échec d'envoi d'annonce) — pas
// de contenu fabriqué.
export function adminNotificationText(item, language) {
  const name = [item.data?.firstName, item.data?.lastName].filter(Boolean).join(" ") || "-";
  const planName = item.data?.planId ? getPlanById(item.data.planId)?.name?.[language] || getPlanById(item.data.planId)?.name?.fr || item.data.planId : "";
  switch (item.type) {
    case "new_signup":
      return {
        icon: "profile",
        title: language === "en" ? "New account" : "Nouveau compte",
        detail: `${name} · ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_org":
      return {
        icon: "briefcase",
        title: language === "en" ? "New organization" : "Nouvelle organisation",
        detail: `${name} · ${getAccountLabel(item.data?.roleType, language)}`
      };
    case "new_payment":
      return {
        icon: "scale",
        title: language === "en" ? "Payment received" : "Paiement encaissé",
        detail: `${name} · ${formatEur(item.data?.amount, item.data?.currency || "EUR")}${planName ? ` (${planName})` : ""}`
      };
    case "license_full":
      return {
        icon: "shield",
        title: language === "en" ? "License fully used" : "Licence épuisée",
        detail: `${item.data?.code} · ${name} (${item.data?.seatsTotal} ${language === "en" ? "seats" : "sièges"})`
      };
    case "announcement_failed":
      return {
        icon: "alert",
        title: language === "en" ? "Announcement send failures" : "Échecs d'envoi d'annonce",
        detail: `${item.data?.subject} · ${item.data?.failedCount} ${language === "en" ? "failed" : "échec(s)"}`
      };
    default:
      return { icon: "alert", title: item.type, detail: "" };
  }
}


// Lu / non lu : le serveur ne stocke pas d'état de lecture pour ces
// événements calculés, il est donc gardé localement, par administrateur.
const adminNotifReadKey = (userId) => `career_app_admin_notif_read_${userId}`;

export function readAdminNotifIds(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(adminNotifReadKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export function saveAdminNotifIds(userId, ids) {
  try {
    localStorage.setItem(adminNotifReadKey(userId), JSON.stringify(ids));
  } catch (_error) {
    // stockage indisponible : l'état lu ne survivra simplement pas au rechargement
  }
}

export function adminNotificationTab(item) {
  return ADMIN_WATCH_TYPES[item.type]?.tab || "dashboard";
}

export function adminNotificationIcon(item) {
  return ADMIN_WATCH_TYPES[item.type]?.icon || "bell";
}

// Étiquette de date d'une notification, comme Jurysia : « Aujourd'hui 15:40 »,
// « Hier 08:00 », « Il y a 3 jours · 17:53 », puis la date complète au-delà
// d'une semaine.
export function adminNotifRelativeLabel(value, language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const en = language === "en";
  const time = date.toLocaleTimeString(en ? "en-GB" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return `${en ? "Today" : "Aujourd'hui"} ${time}`;
  if (diffDays === 1) return `${en ? "Yesterday" : "Hier"} ${time}`;
  if (diffDays < 7) return `${en ? `${diffDays} days ago` : `Il y a ${diffDays} jours`} · ${time}`;
  return formatDateTime(value, language);
}

// Regroupe les événements par type de situation, comme la liste « À
// surveiller » de Jurysia : un compteur par type, lien vers le module.
const ADMIN_WATCH_TYPES = {
  new_signup: { icon: "accounts", tab: "accounts", tone: "green", fr: "Nouveaux comptes (7 derniers jours)", en: "New accounts (last 7 days)" },
  new_org: { icon: "cabinets", tab: "accounts", tone: "green", fr: "Nouvelles écoles ou cabinets (7 derniers jours)", en: "New schools or agencies (last 7 days)" },
  new_payment: { icon: "finance", tab: "finance", tone: "green", fr: "Paiements encaissés (7 derniers jours)", en: "Payments collected (last 7 days)" },
  license_full: { icon: "licenses", tab: "licenses", tone: "warning", fr: "Licences épuisées", en: "Licenses fully used" },
  announcement_failed: { icon: "announcements", tab: "announcements", tone: "danger", fr: "Annonces avec échecs d'envoi", en: "Announcements with send failures" }
};

export function buildAdminWatchItems(notifications, language) {
  const counts = {};
  for (const item of notifications || []) counts[item.type] = (counts[item.type] || 0) + 1;
  const order = ["announcement_failed", "license_full", "new_payment", "new_org", "new_signup"];
  return Object.keys(counts)
    .sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)))
    .map((type) => {
      const meta = ADMIN_WATCH_TYPES[type] || { icon: "bell", tab: "dashboard", tone: "warning", fr: type, en: type };
      return { key: type, type, icon: meta.icon, tab: meta.tab, tone: meta.tone, label: meta[language] || meta.fr, count: counts[type] };
    });
}

export const ADMIN_ANNOUNCEMENT_AUDIENCES = [
  { id: "", label: { fr: "Tous les utilisateurs", en: "All users" } },
  { id: "student", label: { fr: "Étudiants / Candidats", en: "Students / Candidates" } },
  { id: "school", label: { fr: "Écoles", en: "Schools" } },
  { id: "recruiter_firm", label: { fr: "Cabinets de recrutement", en: "Recruitment agencies" } }
];


export { AdminApp };
