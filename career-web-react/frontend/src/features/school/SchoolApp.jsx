import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AdminKpiCard } from "../../components/AdminKpiCard.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getPlanById } from "../../data/plans.js";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate } from "../../lib/format.js";
import { fileToBase64 } from "../../lib/cvService.js";
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
} from "../../lib/inMemoryDb.js";
// Composants partagés avec le module Admin (déplacement mécanique en
// attendant une extraction complète des composants réellement génériques) —
// import "arrière" volontaire, sûr au rendu uniquement.
import {
  AdminTrendChart,
  AdminDonutChart,
  AdminMiniMetric,
  AdminPagination,
  AdminLineIcon,
  adminNotifRelativeLabel,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../admin/AdminApp.jsx";
import AdminHelpPage from "../admin/pages/AdminHelpPage.jsx";
import { SCHOOL_HELP_ARTICLES, SCHOOL_HELP_CATEGORIES } from "./schoolHelpArticles.js";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";
import SchoolDashboardPage from "./pages/SchoolDashboardPage.jsx";
import SchoolStudentsPage from "./pages/SchoolStudentsPage.jsx";
import SchoolInvitationsPage from "./pages/SchoolInvitationsPage.jsx";
import SchoolPromotionsPage from "./pages/SchoolPromotionsPage.jsx";
import SchoolLicensePage from "./pages/SchoolLicensePage.jsx";
import SchoolPricingPage from "./pages/SchoolPricingPage.jsx";
import SchoolBillingPage from "./pages/SchoolBillingPage.jsx";
import SchoolAnnouncementsPage from "./pages/SchoolAnnouncementsPage.jsx";
import SchoolComparePage from "./pages/SchoolComparePage.jsx";
import SchoolEventsPage from "./pages/SchoolEventsPage.jsx";
import SchoolCommunicationPage from "./pages/SchoolCommunicationPage.jsx";
import SchoolInsightsPage from "./pages/SchoolInsightsPage.jsx";
import SchoolReportsPage from "./pages/SchoolReportsPage.jsx";
import SchoolSettingsPage from "./pages/SchoolSettingsPage.jsx";

const SCHOOL_MODULE_DEFS = [
  { id: "dashboard" },
  { id: "students" },
  { id: "promotions" },
  { id: "compare" },
  { id: "invitations" },
  { id: "announcements" },
  { id: "insights" },
  { id: "reports" },
  { id: "license" },
  { id: "billing" },
  { id: "pricing" },
  { id: "settings" }
];

// Navigation façon Jurysia (même charpente que l'administration de la
// plateforme) : Accueil, puis groupes repliables, Paramètres en bas.
const SCHOOL_NAV_HOME = "dashboard";
const SCHOOL_NAV_GROUPS = [
  { id: "students", label: { fr: "Étudiants", en: "Students" }, modules: ["students", "promotions", "compare"] },
  { id: "communication", label: { fr: "Communication", en: "Communication" }, modules: ["invitations", "announcements"] },
  { id: "tracking", label: { fr: "Suivi", en: "Tracking" }, modules: ["insights", "reports"] },
  { id: "subscription", label: { fr: "Abonnement", en: "Subscription" }, modules: ["license", "billing", "pricing"] }
];
const SCHOOL_NAV_FOOTER = ["settings"];
const SCHOOL_NAV_ICONS = {
  dashboard: "dashboard",
  students: "accounts",
  promotions: "layers",
  compare: "compare",
  invitations: "send",
  announcements: "announcements",
  events: "calendar",
  insights: "trend",
  reports: "report",
  license: "licenses",
  billing: "card",
  pricing: "pricing",
  settings: "settings"
};
// Pages hors menu (ouvertes depuis la barre du haut).
// « events » : ancien module, désormais un onglet de « Annonces & événements ».
const SCHOOL_EXTRA_TABS = ["notifications", "helpCenter", "events"];
const SCHOOL_TAB_SESSION_KEY = "career_app_school_tab";

// Module ouvert par une notification, selon son type.
function schoolNotificationTab(item) {
  const type = String(item.type || "");
  if (type.includes("license") || type.includes("seat")) return "license";
  if (type.includes("score") || type.includes("match")) return "insights";
  if (type.includes("invitation")) return "invitations";
  if (type.includes("report")) return "reports";
  if (type.includes("inactive") || type.includes("cv") || type.includes("student")) return "students";
  return "dashboard";
}

function schoolNotificationIcon(item) {
  return SCHOOL_NAV_ICONS[schoolNotificationTab(item)] || "bell";
}

// Lu / non lu : les notifications enregistrées portent readAt (serveur) ;
// les alertes calculées en direct sont suivies localement, par compte.
const schoolReadKey = (userId) => `career_app_school_notif_read_${userId}`;
function readSchoolNotifIds(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(schoolReadKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}
function saveSchoolNotifIds(userId, ids) {
  try {
    localStorage.setItem(schoolReadKey(userId), JSON.stringify(ids));
  } catch (_error) {
    // stockage indisponible : l'état lu ne survivra pas au rechargement
  }
}

function SchoolApp({
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
  const validTab = (id) => SCHOOL_MODULE_DEFS.some((item) => item.id === id) || SCHOOL_EXTRA_TABS.includes(id);
  // Accueil à chaque connexion ; le module courant n'est gardé que pour la
  // session de l'onglet (un simple rafraîchissement ne ramène pas à l'Accueil).
  const [tab, setTab] = useState(() => {
    try {
      localStorage.removeItem("career_app_school_tab");
      const saved = sessionStorage.getItem(SCHOOL_TAB_SESSION_KEY);
      return saved && validTab(saved) ? saved : "dashboard";
    } catch (_error) {
      return "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("career_app_school_sidebar") === "collapsed";
    } catch (_error) {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState([]);
  const [moduleQuery, setModuleQuery] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("career_app_school_recent_searches") || "[]").slice(0, 5);
    } catch (_error) {
      return [];
    }
  });
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifReadIds, setNotifReadIds] = useState(() => readSchoolNotifIds(user.id));
  const [notifFilter, setNotifFilter] = useState("all");
  const [overview, setOverview] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const copy =
    language === "en"
      ? {
          dashboard: "Home",
          students: "Students",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "My license",
          pricing: "Pricing",
          billing: "Billing",
          announcements: "Announcements & events",
          compare: "Compare promotions",
          events: "Announcements & events",
          insights: "Tracking & employability",
          reports: "Reports",
          settings: "Institution settings",
          notifications: "Notifications",
          helpCenter: "Help center",
          accountSettings: "My profile",
          logout: "Log out",
          role: "School administrator",
          secured: "Secured by",
          tagline: "School space",
          searchModule: "Search a module…",
          noModule: "No module matches.",
          seats: "License seats",
          collapse: "Collapse",
          expand: "Expand",
          invite: "Invite",
          home: "Home",
          search: "Search a student, a module…"
        }
      : {
          dashboard: "Accueil",
          students: "Étudiants",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "Ma licence",
          pricing: "Tarifs",
          billing: "Facturation",
          announcements: "Annonces & événements",
          compare: "Comparer les promotions",
          events: "Annonces & événements",
          insights: "Suivi & employabilité",
          reports: "Rapports",
          settings: "Paramètres de l'établissement",
          notifications: "Notifications",
          helpCenter: "Centre d'aide",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur école",
          secured: "Sécurisé par",
          tagline: "Espace école",
          searchModule: "Rechercher un module…",
          noModule: "Aucun module ne correspond.",
          seats: "Sièges de licence",
          collapse: "Réduire",
          expand: "Déplier",
          invite: "Inviter",
          home: "Accueil",
          search: "Rechercher un étudiant, un module…"
        };
  const t = (fr, en) => (language === "en" ? en : fr);
  const moduleLabel = (id) => copy[id] || id;

  // Ctrl/Cmd + K ouvre (ou ferme) la palette de recherche.
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
      getSchoolStudents(user.id, { search: term })
        .then((items) => setSearchSuggestions(items.slice(0, 6).map((item) => ({ kind: "student", ...item }))))
        .catch(() => setSearchSuggestions([]))
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notifications (et sièges de la licence pour la jauge du menu) : au
  // chargement, à chaque changement de module, puis toutes les minutes.
  useEffect(() => {
    let cancelled = false;
    function load() {
      getSchoolNotifications(user.id, language)
        .then((data) => !cancelled && setNotifications(data.items || []))
        .catch(() => {});
      getSchoolOverview(user.id)
        .then((data) => !cancelled && setOverview(data))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user.id, language, tab]);

  useEffect(() => {
    if (!validTab(tab)) {
      setTab("dashboard");
      return;
    }
    try {
      sessionStorage.setItem(SCHOOL_TAB_SESSION_KEY, tab);
    } catch (_error) {
      // stockage indisponible
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    try {
      localStorage.setItem("career_app_school_sidebar", sidebarCollapsed ? "collapsed" : "open");
    } catch (_error) {
      // stockage indisponible
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    setRouteLoading(true);
    setMobileNavOpen(false);
    const timer = window.setTimeout(() => setRouteLoading(false), 360);
    return () => window.clearTimeout(timer);
  }, [tab]);

  function rememberSearch(term) {
    const value = String(term || "").trim();
    if (!value) return;
    setRecentSearches((prev) => {
      const next = [value, ...prev.filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("career_app_school_recent_searches", JSON.stringify(next));
      } catch (_error) {
        // ignore
      }
      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try {
      localStorage.removeItem("career_app_school_recent_searches");
    } catch (_error) {
      // ignore
    }
  }

  function goToResult(item) {
    rememberSearch(searchInput);
    setPaletteOpen(false);
    if (item.kind === "module") {
      setTab(item.id);
    } else {
      setStudentsSearch(item.email);
      setTab("students");
    }
  }

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem(SCHOOL_TAB_SESSION_KEY);
    } catch (_error) {
      // rien à nettoyer
    }
    onLogout?.();
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 1024px)").matches) setMobileNavOpen((prev) => !prev);
    else setSidebarCollapsed((prev) => !prev);
  }

  function toggleGroup(groupId) {
    setClosedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  }

  // ------------------------------------------------------------- notifications
  const notifEvents = [...notifications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const isUnread = (item) => !item.readAt && !notifReadIds.includes(item.id);
  const unreadCount = notifEvents.filter(isUnread).length;

  function markNotifsRead(ids) {
    setNotifReadIds((prev) => {
      const current = new Set(notifications.map((item) => item.id));
      const next = [...new Set([...prev, ...ids])].filter((id) => current.has(id));
      saveSchoolNotifIds(user.id, next);
      return next;
    });
  }

  function markAllRead() {
    markNotifsRead(notifEvents.map((item) => item.id));
    markSchoolNotificationsRead(user.id)
      .then(() => setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))))
      .catch(() => {});
  }

  function openNotification(item) {
    markNotifsRead([item.id]);
    setNotifOpen(false);
    setTab(schoolNotificationTab(item));
  }

  const notifTime = (item) => (item.generated ? t("À surveiller", "Needs attention") : item.createdAt ? adminNotifRelativeLabel(item.createdAt, language) : "");

  function renderNotifEvent(item, large = false) {
    const unread = isUnread(item);
    return (
      <button key={item.id} type="button" className={`jy-notif-event ${large ? "is-large" : ""} ${unread ? "is-unread" : ""}`} onClick={() => openNotification(item)}>
        <span className="jy-notif-event-icon">
          <AdminLineIcon name={schoolNotificationIcon(item)} />
        </span>
        <span className="jy-notif-event-body">
          <strong>{item.title}</strong>
          {item.body ? <span>{item.body}</span> : null}
          {notifTime(item) ? <small>{notifTime(item)}</small> : null}
        </span>
        {unread ? <span className="jy-notif-dot" aria-label={t("Non lue", "Unread")} /> : null}
      </button>
    );
  }

  function renderNotificationsPage() {
    const shown = notifFilter === "unread" ? notifEvents.filter(isUnread) : notifEvents;
    return (
      <section className="admin-notifications">
        <header className="module-header jy-notif-page-head">
          <div>
            <h2>{copy.notifications}</h2>
            <p>{t("Notifications de votre établissement et alertes calculées à partir de l'activité de vos étudiants.", "Your institution's notifications and alerts computed from your students' activity.")}</p>
          </div>
          {unreadCount ? (
            <button type="button" className="jy-btn jy-btn-outline" onClick={markAllRead}>
              <AdminLineIcon name="quality" />
              {t("Tout marquer comme lu", "Mark all as read")}
            </button>
          ) : null}
        </header>
        <div className="jy-notif-tabs" role="tablist">
          {["all", "unread"].map((value) => (
            <button key={value} type="button" role="tab" aria-selected={notifFilter === value} className={notifFilter === value ? "is-active" : ""} onClick={() => setNotifFilter(value)}>
              {value === "all" ? t("Toutes", "All") : t("Non lues", "Unread")}
              {value === "unread" ? <span>({unreadCount})</span> : null}
            </button>
          ))}
        </div>
        {shown.length ? (
          <div className="jy-card jy-card-flush jy-notif-page-list">{shown.map((item) => renderNotifEvent(item, true))}</div>
        ) : (
          <div className="jy-card jy-notif-page-empty">
            <AdminLineIcon name="bell" />
            <strong>{notifFilter === "unread" ? t("Aucune notification non lue", "No unread notifications") : t("Aucune notification", "No notifications")}</strong>
            <span>{t("Les nouvelles activités apparaîtront ici.", "New activity will appear here.")}</span>
          </div>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------- navigation
  const normalizedQuery = moduleQuery.trim().toLowerCase();
  const matchesQuery = (id) => !normalizedQuery || moduleLabel(id).toLowerCase().includes(normalizedQuery);
  const visibleNavGroups = SCHOOL_NAV_GROUPS.map((group) => ({ ...group, modules: group.modules.filter(matchesQuery) })).filter((group) => group.modules.length);
  const showHome = matchesQuery(SCHOOL_NAV_HOME);
  const footerModules = SCHOOL_NAV_FOOTER.filter(matchesQuery);
  const seatsTotal = Number(overview?.seatsTotal || 0);
  const seatsUsed = Number(overview?.seatsUsed || 0);
  const seatShare = seatsTotal ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0;

  function renderNavItem(id) {
    const label = moduleLabel(id);
    return (
      <button
        key={id}
        type="button"
        className={`jy-nav-item ${tab === id ? "active" : ""}`}
        onClick={() => setTab(id)}
        title={sidebarCollapsed ? label : undefined}
        aria-current={tab === id ? "page" : undefined}
      >
        <AdminLineIcon name={SCHOOL_NAV_ICONS[id]} />
        <span className="jy-nav-label">{label}</span>
      </button>
    );
  }

  function renderSchoolPage() {
    switch (tab) {
      case "dashboard":
        return <SchoolDashboardPage user={user} language={language} onGoToTab={setTab} />;
      case "students":
        return <SchoolStudentsPage user={user} language={language} initialSearch={studentsSearch} />;
      case "promotions":
        return <SchoolPromotionsPage user={user} language={language} />;
      case "invitations":
        return <SchoolInvitationsPage user={user} language={language} />;
      case "license":
        return <SchoolLicensePage user={user} language={language} currency={currency} onGoToTab={setTab} />;
      case "pricing":
        return <SchoolPricingPage user={user} language={language} currency={currency} onGoToTab={setTab} />;
      case "billing":
        return <SchoolBillingPage user={user} language={language} currency={currency} />;
      case "announcements":
        return <SchoolCommunicationPage user={user} language={language} initialTab="announcements" />;
      case "compare":
        return <SchoolComparePage user={user} language={language} onGoToTab={setTab} />;
      case "events":
        return <SchoolCommunicationPage user={user} language={language} initialTab="events" />;
      case "insights":
        return <SchoolInsightsPage user={user} language={language} onGoToTab={setTab} />;
      case "reports":
        return <SchoolReportsPage user={user} language={language} />;
      case "settings":
        return <SchoolSettingsPage user={user} language={language} />;
      case "notifications":
        return renderNotificationsPage();
      case "helpCenter":
        return (
          <AdminHelpPage
            language={language}
            articles={SCHOOL_HELP_ARTICLES}
            categories={SCHOOL_HELP_CATEGORIES}
            intro={{
              fr: "{count} articles sur l'utilisation de l'espace École, et un accès direct au contact.",
              en: "{count} articles about using the School space, and direct access to contact."
            }}
            onContact={onNavigateLegal ? () => onNavigateLegal("contact") : null}
          />
        );
      default:
        return <AdminPageLoader language={language} />;
    }
  }

  // ------------------------------------------------------------- palette (Ctrl K)
  const paletteTerm = searchInput.trim().toLowerCase();
  const moduleResults = paletteTerm
    ? SCHOOL_MODULE_DEFS.map((item) => item.id)
        .filter((id) => moduleLabel(id).toLowerCase().includes(paletteTerm))
        .slice(0, 4)
        .map((id) => ({ kind: "module", id }))
    : [];
  const paletteItems = [...moduleResults, ...searchSuggestions];
  const paletteGroups = [
    { key: "module", title: t("Modules", "Modules"), items: paletteItems.filter((item) => item.kind === "module") },
    { key: "student", title: t("Étudiants", "Students"), items: paletteItems.filter((item) => item.kind === "student") }
  ].filter((group) => group.items.length);

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className={`admin-shell-root jy-admin school-jy ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileNavOpen ? "is-mobile-open" : ""}`}>
      <aside className="jy-sidebar" aria-label={t("Navigation de l'espace école", "School navigation")}>
        <button type="button" className="jy-brand" onClick={() => setTab("dashboard")}>
          <img className="jy-brand-mark" src="/logo-mark.png" alt="" aria-hidden="true" width="46" height="46" />
          <span className="jy-brand-text">
            <strong>Career CV</strong>
            <span>{copy.tagline}</span>
          </span>
        </button>

        <label className="jy-module-search">
          <AdminLineIcon name="search" />
          <input value={moduleQuery} onChange={(event) => setModuleQuery(event.target.value)} placeholder={copy.searchModule} aria-label={copy.searchModule} />
          {moduleQuery ? (
            <button
              type="button"
              className="jy-clear"
              aria-label={t("Effacer", "Clear")}
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
          {showHome ? renderNavItem(SCHOOL_NAV_HOME) : null}
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

          <button type="button" className="jy-meter jy-meter-link" onClick={() => setTab("license")} title={copy.license}>
            <div className="jy-meter-row">
              <span>
                <AdminLineIcon name="seat" /> {copy.seats}
              </span>
              <strong>
                {seatsUsed} / {seatsTotal}
              </strong>
            </div>
            <span className="jy-meter-bar">
              <span style={{ width: `${seatShare}%` }} />
            </span>
          </button>

          <button type="button" className="jy-sidebar-user" onClick={openAccountSettings}>
            <AvatarCircle user={user} />
            <span>
              <strong>{fullName}</strong>
              <small>{copy.role}</small>
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
          <button type="button" className="jy-icon-btn jy-toggle" aria-label={t("Afficher/masquer le menu", "Toggle sidebar")} onClick={toggleSidebar}>
            <AdminLineIcon name="sidebar" />
          </button>

          <button type="button" className="jy-search jy-search-trigger" onClick={() => setPaletteOpen(true)}>
            <AdminLineIcon name="search" />
            <span>{copy.search}</span>
            <kbd>Ctrl K</kbd>
          </button>

          <div className="jy-topbar-actions">
            <button type="button" className="jy-btn jy-btn-outline jy-hide-sm" onClick={() => setTab("reports")}>
              <AdminLineIcon name="report" />
              <span>{copy.reports}</span>
            </button>
            <button type="button" className="jy-btn jy-btn-primary" onClick={() => setTab("invitations")}>
              <AdminLineIcon name="plus" />
              <span className="jy-hide-xs">{copy.invite}</span>
            </button>

            <span className="jy-divider" />

            <div className="jy-notif" ref={notifRef}>
              <button type="button" className="jy-icon-btn" title={copy.notifications} aria-label={copy.notifications} onClick={() => setNotifOpen((prev) => !prev)}>
                <AdminLineIcon name="bell" />
                {unreadCount ? <span className="jy-badge is-new">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
              </button>
              {notifOpen ? (
                <div className="jy-popover jy-notif-panel">
                  <div className="jy-notif-head">
                    <strong>{copy.notifications}</strong>
                    {unreadCount ? (
                      <button type="button" onClick={markAllRead}>
                        {t("Tout marquer comme lu", "Mark all as read")}
                      </button>
                    ) : null}
                  </div>
                  <div className="jy-notif-events">
                    {notifEvents.length ? (
                      notifEvents.slice(0, 12).map((item) => renderNotifEvent(item))
                    ) : (
                      <div className="jy-notif-none">
                        <AdminLineIcon name="bell" />
                        <span>{t("Aucune notification.", "No notifications.")}</span>
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
                      {t("Voir toutes les notifications", "View all notifications")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button type="button" className="jy-icon-btn jy-hide-sm" title={copy.helpCenter} aria-label={copy.helpCenter} onClick={() => setTab("helpCenter")}>
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
              <span>{moduleLabel(tab)}</span>
            </nav>
          ) : null}

          {routeLoading ? <AdminPageLoader language={language} /> : renderSchoolPage()}
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
          <div className="jy-palette" role="dialog" aria-modal="true" aria-label={copy.search}>
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
                placeholder={t("Rechercher un étudiant (nom, e-mail) ou un module…", "Search a student (name, email) or a module…")}
                aria-label={copy.search}
              />
              <kbd>Esc</kbd>
            </div>

            <div className="jy-palette-body">
              {!searchInput.trim() ? (
                recentSearches.length ? (
                  <>
                    <div className="jy-palette-group-head">
                      <span>{t("Recherches récentes", "Recent searches")}</span>
                      <button type="button" onClick={clearRecentSearches}>
                        {t("Effacer", "Clear")}
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
                  <p className="jy-palette-hint">{t("Commencez à taper pour rechercher un étudiant ou un module.", "Start typing to search a student or a module.")}</p>
                )
              ) : searchLoading && !paletteItems.length ? (
                <p className="jy-palette-hint">{t("Recherche…", "Searching…")}</p>
              ) : !paletteItems.length ? (
                <p className="jy-palette-hint">{t(`Aucun résultat pour « ${searchInput.trim()} ».`, `No result for "${searchInput.trim()}".`)}</p>
              ) : (
                paletteGroups.map((group) => (
                  <div key={group.key} className="jy-palette-group">
                    <p className="jy-palette-group-title">{group.title}</p>
                    {group.items.map((item) => {
                      const index = paletteItems.indexOf(item);
                      return (
                        <button
                          key={`${item.kind}-${item.id}`}
                          type="button"
                          className={`jy-palette-item ${index === paletteIndex ? "active" : ""}`}
                          onMouseEnter={() => setPaletteIndex(index)}
                          onClick={() => goToResult(item)}
                        >
                          {item.kind === "student" ? (
                            <AvatarCircle user={item} />
                          ) : (
                            <span className="jy-palette-icon">
                              <AdminLineIcon name={SCHOOL_NAV_ICONS[item.id]} />
                            </span>
                          )}
                          <span className="jy-palette-text">
                            <strong>{item.kind === "module" ? moduleLabel(item.id) : `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}</strong>
                            <small>{item.kind === "module" ? t("Ouvrir le module", "Open the module") : item.email}</small>
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

export function SchoolExportCsvButton({ userId, language, resource = "students" }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}/school/${resource}/export?userId=${encodeURIComponent(userId)}`, "_blank");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button type="button" className="btn-ghost admin-export-btn" onClick={handleClick} disabled={loading}>
      {loading ? <span className="btn-spinner" /> : <UiIcon name="download" />}
      {language === "en" ? "Export CSV" : "Exporter en CSV"}
    </button>
  );
}


function maskLicenseCode(code) {
  if (!code) return code;
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

export function SchoolLicenseCard({ item, language, currency, copy }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const pct = item.seatsTotal ? Math.min(100, Math.round((item.seatsUsed / item.seatsTotal) * 100)) : 0;
  const remaining = Math.max(0, Number(item.seatsTotal || 0) - Number(item.seatsUsed || 0));

  function handleCopy() {
    navigator.clipboard?.writeText(item.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="school-license-card">
      <div className="school-license-card-top">
        <span className="school-license-plan-icon">
          <UiIcon name="save" />
        </span>
        <div className="school-license-plan-meta">
          <strong>{getPlanById(item.planId)?.name?.[language] || item.planId}</strong>
          <span className="muted">
            {copy.created} {formatDate(item.createdAt)}
          </span>
        </div>
        <span className={`tag ${item.revoked ? "tag-danger" : "tag-success"}`}>
          {item.revoked ? copy.revoked : copy.active}
        </span>
      </div>

      <div className="school-license-code-row">
        <span className="school-license-code-pill">{revealed ? item.code : maskLicenseCode(item.code)}</span>
        <button
          type="button"
          className="school-license-reveal-btn"
          onClick={() => setRevealed((prev) => !prev)}
          aria-label={revealed ? copy.hide : copy.reveal}
          title={revealed ? copy.hide : copy.reveal}
        >
          <UiIcon name="eye" />
        </button>
        <button type="button" className="school-license-copy-btn" onClick={handleCopy}>
          {copied ? copy.copied : copy.copy}
        </button>
      </div>

      <div className="school-license-progress">
        <div className="school-license-progress-head">
          <span>{copy.seats}</span>
          <strong>
            {item.seatsUsed}/{item.seatsTotal}
          </strong>
        </div>
        <div className="school-license-bar">
          <div className="school-license-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="school-license-remaining">
          {pct}% · {remaining} {copy.remaining}
        </span>
      </div>

      <div className="school-license-price">
        <span className="muted">{copy.plan}</span>
        <strong>{planPriceLabel(item.planId, "annual", "Gratuit", currency)}</strong>
      </div>
    </div>
  );
}


function SchoolEmptyState({ icon, title, hint }) {
  return (
    <div className="school-empty-state">
      <span className="school-empty-icon">
        <UiIcon name={icon} />
      </span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}


export { SchoolApp as default, SchoolEmptyState };
