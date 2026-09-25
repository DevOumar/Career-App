import React from "react";
// Module Cabinet : espace des cabinets de recrutement / cellules RH, avec la
// même charpente que l'administration de la plateforme et l'espace École
// (menu latéral à groupes repliables, barre du haut, palette Ctrl K,
// notifications, centre d'aide). La logique métier (licence, sièges, vivier
// partagé, missions) est inchangée.
import { useState, useEffect, useRef } from "react";
import { AdminPageLoader } from "../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getCabinetCandidates, getCabinetNotifications, getCabinetOverview } from "../../lib/inMemoryDb.js";
import { AdminLineIcon, adminNotifRelativeLabel } from "../admin/AdminApp.jsx";
import AdminHelpPage from "../admin/pages/AdminHelpPage.jsx";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";
import { CABINET_HELP_ARTICLES, CABINET_HELP_CATEGORIES } from "./cabinetHelpArticles.js";
import CabinetHomePage from "./pages/CabinetHomePage.jsx";
import CabinetRecruitersPage from "./pages/CabinetRecruitersPage.jsx";
import CabinetInvitationsPage from "./pages/CabinetInvitationsPage.jsx";
import CabinetCandidatesPage from "./pages/CabinetCandidatesPage.jsx";
import CabinetMissionsPage from "./pages/CabinetMissionsPage.jsx";
import CabinetComparePage from "./pages/CabinetComparePage.jsx";
import CabinetReportsPage from "./pages/CabinetReportsPage.jsx";
import CabinetAnnouncementsPage from "./pages/CabinetAnnouncementsPage.jsx";
import CabinetLicensePage from "./pages/CabinetLicensePage.jsx";
import CabinetBillingPage from "./pages/CabinetBillingPage.jsx";
import CabinetPricingPage from "./pages/CabinetPricingPage.jsx";
import CabinetSettingsPage from "./pages/CabinetSettingsPage.jsx";
import CabinetInterviewsPage from "./pages/CabinetInterviewsPage.jsx";
import CabinetClientsPage from "./pages/CabinetClientsPage.jsx";
import CabinetInvoicesPage from "./pages/CabinetInvoicesPage.jsx";
import CabinetActivityPage from "./pages/CabinetActivityPage.jsx";

const CABINET_MODULES = ["home", "candidates", "missions", "interviews", "compare", "reports", "clients", "invoices", "recruiters", "invitations", "announcements", "activity", "license", "billing", "pricing", "settings"];
// Modules réservés au titulaire du cabinet (recruiter_firm) : un recruteur
// invité (recruiter_internal) ne les voit pas, cohérent avec le 403 renvoyé
// côté backend.
const OWNER_ONLY_MODULES = ["invitations", "license", "billing", "invoices"];

const CABINET_NAV_HOME = "home";
const CABINET_NAV_GROUPS = [
  { id: "pipeline", label: { fr: "Recrutement", en: "Recruitment" }, modules: ["candidates", "missions", "interviews", "compare", "reports"] },
  { id: "business", label: { fr: "Clients", en: "Clients" }, modules: ["clients", "invoices"] },
  { id: "team", label: { fr: "Équipe", en: "Team" }, modules: ["recruiters", "invitations", "announcements", "activity"] },
  { id: "subscription", label: { fr: "Abonnement", en: "Subscription" }, modules: ["license", "billing", "pricing"] }
];
const CABINET_NAV_FOOTER = ["settings"];
const CABINET_NAV_ICONS = {
  home: "dashboard",
  candidates: "accounts",
  missions: "briefcase",
  interviews: "calendar",
  clients: "cabinets",
  invoices: "fileText",
  activity: "activity",
  compare: "compare",
  reports: "report",
  recruiters: "profile",
  invitations: "send",
  announcements: "announcements",
  license: "licenses",
  billing: "card",
  pricing: "pricing",
  settings: "settings"
};
// Pages hors menu (ouvertes depuis la barre du haut).
const CABINET_EXTRA_TABS = ["notifications", "helpCenter"];
const CABINET_TAB_SESSION_KEY = "career_app_cabinet_tab";

// Module ouvert par une notification, selon son type.
function cabinetNotificationTab(item) {
  const type = String(item.type || "");
  if (type.includes("license") || type.includes("seat")) return "license";
  if (type.includes("interview")) return "interviews";
  if (type.includes("invoice")) return "invoices";
  if (type.includes("rgpd")) return "settings";
  if (type.includes("recruiter")) return "recruiters";
  if (type.includes("mission")) return "missions";
  if (type.includes("follow_up") || type.includes("candidate")) return "candidates";
  return "home";
}

// Lu / non lu : les notifications du cabinet sont calculées à la volée
// (ids stables), l'état lu est donc suivi localement, par compte.
const cabinetReadKey = (userId) => `career_app_cabinet_read_notifications_${userId}`;
function readCabinetNotifIds(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(cabinetReadKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}
function saveCabinetNotifIds(userId, ids) {
  try {
    localStorage.setItem(cabinetReadKey(userId), JSON.stringify(ids));
  } catch (_error) {
    // stockage indisponible : l'état lu ne survivra pas au rechargement
  }
}

export default function CabinetApp({
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
  const isCabinetOwner = user.roleType !== "recruiter_internal";
  const allowed = (id) => isCabinetOwner || !OWNER_ONLY_MODULES.includes(id);
  const validTab = (id) => (CABINET_MODULES.includes(id) && allowed(id)) || CABINET_EXTRA_TABS.includes(id);

  // Accueil à chaque connexion ; le module courant n'est gardé que pour la
  // session de l'onglet (un simple rafraîchissement ne ramène pas à l'Accueil).
  const [tab, setTab] = useState(() => {
    try {
      localStorage.removeItem("career_app_cabinet_tab");
      const saved = sessionStorage.getItem(CABINET_TAB_SESSION_KEY);
      return saved && validTab(saved) ? saved : "home";
    } catch (_error) {
      return "home";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("career_app_cabinet_sidebar") === "collapsed";
    } catch (_error) {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState([]);
  const [moduleQuery, setModuleQuery] = useState("");
  // Recherche transmise au vivier depuis la palette, et demande d'ouverture
  // du formulaire « Ajouter un candidat » depuis la barre du haut / l'accueil.
  const [candidateSearch, setCandidateSearch] = useState("");
  const [pendingCreate, setPendingCreate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("career_app_cabinet_recent_searches") || "[]").slice(0, 5);
    } catch (_error) {
      return [];
    }
  });
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifReadIds, setNotifReadIds] = useState(() => readCabinetNotifIds(user.id));
  const [notifFilter, setNotifFilter] = useState("all");
  const [overview, setOverview] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const copy =
    language === "en"
      ? {
          home: "Home",
          candidates: "Candidate pool",
          missions: "Missions",
          interviews: "Interviews",
          clients: "Clients",
          invoices: "Client invoices",
          activity: "Activity log",
          compare: "Compare missions",
          reports: "Reports",
          recruiters: "Recruiters",
          invitations: "Invitations",
          announcements: "Team announcements",
          license: "My license",
          billing: "Billing",
          pricing: "Pricing",
          settings: "Firm settings",
          notifications: "Notifications",
          helpCenter: "Help center",
          accountSettings: "My profile",
          logout: "Log out",
          roleOwner: "Recruitment firm",
          roleMember: "Recruiter",
          secured: "Secured by",
          tagline: "Recruitment firm",
          searchModule: "Search a module…",
          noModule: "No module matches.",
          seats: "Recruiter seats",
          collapse: "Collapse",
          expand: "Expand",
          addCandidate: "Add a candidate",
          search: "Search a candidate, a module…"
        }
      : {
          home: "Accueil",
          candidates: "Vivier de candidats",
          missions: "Missions",
          interviews: "Entretiens",
          clients: "Clients",
          invoices: "Factures clients",
          activity: "Journal d'activité",
          compare: "Comparer les missions",
          reports: "Rapports",
          recruiters: "Recruteurs",
          invitations: "Invitations",
          announcements: "Annonces à l'équipe",
          license: "Ma licence",
          billing: "Facturation",
          pricing: "Tarifs",
          settings: "Paramètres du cabinet",
          notifications: "Notifications",
          helpCenter: "Centre d'aide",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          roleOwner: "Cabinet de recrutement",
          roleMember: "Recruteur",
          secured: "Sécurisé par",
          tagline: "Espace cabinet",
          searchModule: "Rechercher un module…",
          noModule: "Aucun module ne correspond.",
          seats: "Sièges recruteurs",
          collapse: "Réduire",
          expand: "Déplier",
          addCandidate: "Ajouter un candidat",
          search: "Rechercher un candidat, un module…"
        };
  const t = (fr, en) => (language === "en" ? en : fr);
  const moduleLabel = (id) => copy[id] || id;
  const roleLabel = isCabinetOwner ? copy.roleOwner : copy.roleMember;

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
      getCabinetCandidates(user.id, { search: term })
        .then((data) => setSearchSuggestions((data.items || []).slice(0, 6).map((item) => ({ kind: "candidate", ...item }))))
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

  // Notifications (et sièges pour la jauge du menu) : au chargement, à
  // chaque changement de module, puis toutes les minutes.
  useEffect(() => {
    let cancelled = false;
    function load() {
      getCabinetNotifications(user.id, language)
        .then((items) => !cancelled && setNotifications(items || []))
        .catch(() => {});
      getCabinetOverview(user.id, language)
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
      setTab("home");
      return;
    }
    try {
      sessionStorage.setItem(CABINET_TAB_SESSION_KEY, tab);
    } catch (_error) {
      // stockage indisponible
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    try {
      localStorage.setItem("career_app_cabinet_sidebar", sidebarCollapsed ? "collapsed" : "open");
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

  function goTo(id) {
    if (id !== "candidates") setCandidateSearch("");
    setTab(id);
  }

  // Ouvre un module et y déclenche le formulaire de création (la page
  // consomme la demande via onAutoCreateDone, une seule fois).
  function openCreate(module) {
    setPendingCreate(module);
    goTo(module);
  }

  function rememberSearch(term) {
    const value = String(term || "").trim();
    if (!value) return;
    setRecentSearches((prev) => {
      const next = [value, ...prev.filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("career_app_cabinet_recent_searches", JSON.stringify(next));
      } catch (_error) {
        // ignore
      }
      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try {
      localStorage.removeItem("career_app_cabinet_recent_searches");
    } catch (_error) {
      // ignore
    }
  }

  function goToResult(item) {
    rememberSearch(searchInput);
    setPaletteOpen(false);
    if (item.kind === "module") {
      goTo(item.id);
    } else {
      setCandidateSearch(item.email || `${item.firstName || ""} ${item.lastName || ""}`.trim());
      setTab("candidates");
    }
  }

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  function handleLogout() {
    try {
      sessionStorage.removeItem(CABINET_TAB_SESSION_KEY);
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
  const notifEvents = notifications;
  const isUnread = (item) => !notifReadIds.includes(item.id);
  const unreadCount = notifEvents.filter(isUnread).length;

  function markNotifsRead(ids) {
    setNotifReadIds((prev) => {
      const current = new Set(notifications.map((item) => item.id));
      const next = [...new Set([...prev, ...ids])].filter((id) => current.has(id));
      saveCabinetNotifIds(user.id, next);
      return next;
    });
  }

  function markAllRead() {
    markNotifsRead(notifEvents.map((item) => item.id));
  }

  function openNotification(item) {
    markNotifsRead([item.id]);
    setNotifOpen(false);
    const target = cabinetNotificationTab(item);
    goTo(allowed(target) ? target : "home");
  }

  const notifTime = (item) => (item.createdAt ? adminNotifRelativeLabel(item.createdAt, language) : t("À surveiller", "Needs attention"));

  function renderNotifEvent(item, large = false) {
    const unread = isUnread(item);
    return (
      <button key={item.id} type="button" className={`jy-notif-event ${large ? "is-large" : ""} ${unread ? "is-unread" : ""}`} onClick={() => openNotification(item)}>
        <span className="jy-notif-event-icon">
          <AdminLineIcon name={CABINET_NAV_ICONS[cabinetNotificationTab(item)] || "bell"} />
        </span>
        <span className="jy-notif-event-body">
          <strong>{item.title}</strong>
          {item.body ? <span>{item.body}</span> : null}
          <small>{notifTime(item)}</small>
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
            <p>{t("Nouveaux recruteurs, missions sans candidat, relances à faire et alertes de licence.", "New recruiters, missions without candidates, due follow-ups and license alerts.")}</p>
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
  const visibleNavGroups = CABINET_NAV_GROUPS.map((group) => ({ ...group, modules: group.modules.filter((id) => allowed(id) && matchesQuery(id)) })).filter((group) => group.modules.length);
  const showHome = matchesQuery(CABINET_NAV_HOME);
  const footerModules = CABINET_NAV_FOOTER.filter(matchesQuery);
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
        onClick={() => goTo(id)}
        title={sidebarCollapsed ? label : undefined}
        aria-current={tab === id ? "page" : undefined}
      >
        <AdminLineIcon name={CABINET_NAV_ICONS[id]} />
        <span className="jy-nav-label">{label}</span>
      </button>
    );
  }

  function renderCabinetPage() {
    const common = { user, language, isCabinetOwner, onGoToTab: goTo };
    switch (tab) {
      case "home":
        return <CabinetHomePage {...common} onCreate={openCreate} />;
      case "candidates":
        return <CabinetCandidatesPage {...common} initialSearch={candidateSearch} autoCreate={pendingCreate === "candidates"} onAutoCreateDone={() => setPendingCreate("")} />;
      case "missions":
        return <CabinetMissionsPage {...common} currency={currency} autoCreate={pendingCreate === "missions"} onAutoCreateDone={() => setPendingCreate("")} />;
      case "interviews":
        return <CabinetInterviewsPage {...common} />;
      case "clients":
        return <CabinetClientsPage {...common} currency={currency} />;
      case "invoices":
        return <CabinetInvoicesPage {...common} currency={currency} />;
      case "activity":
        return <CabinetActivityPage {...common} />;
      case "compare":
        return <CabinetComparePage {...common} />;
      case "reports":
        return <CabinetReportsPage {...common} />;
      case "recruiters":
        return <CabinetRecruitersPage {...common} />;
      case "invitations":
        return <CabinetInvitationsPage {...common} />;
      case "announcements":
        return <CabinetAnnouncementsPage {...common} />;
      case "license":
        return <CabinetLicensePage {...common} currency={currency} />;
      case "billing":
        return <CabinetBillingPage {...common} currency={currency} />;
      case "pricing":
        return <CabinetPricingPage {...common} currency={currency} />;
      case "settings":
        return <CabinetSettingsPage {...common} />;
      case "notifications":
        return renderNotificationsPage();
      case "helpCenter":
        return (
          <AdminHelpPage
            language={language}
            articles={CABINET_HELP_ARTICLES}
            categories={CABINET_HELP_CATEGORIES}
            intro={{
              fr: "{count} articles sur l'utilisation de l'espace Cabinet, et un accès direct au contact.",
              en: "{count} articles about using the Firm space, and direct access to contact."
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
    ? CABINET_MODULES.filter(allowed)
        .filter((id) => moduleLabel(id).toLowerCase().includes(paletteTerm))
        .slice(0, 4)
        .map((id) => ({ kind: "module", id }))
    : [];
  const paletteItems = [...moduleResults, ...searchSuggestions];
  const paletteGroups = [
    { key: "module", title: t("Modules", "Modules"), items: paletteItems.filter((item) => item.kind === "module") },
    { key: "candidate", title: t("Candidats", "Candidates"), items: paletteItems.filter((item) => item.kind === "candidate") }
  ].filter((group) => group.items.length);

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className={`admin-shell-root jy-admin cabinet-jy ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileNavOpen ? "is-mobile-open" : ""}`}>
      <aside className="jy-sidebar" aria-label={t("Navigation de l'espace cabinet", "Firm navigation")}>
        <button type="button" className="jy-brand" onClick={() => goTo("home")}>
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
          {showHome ? renderNavItem(CABINET_NAV_HOME) : null}
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

          <button
            type="button"
            className="jy-meter jy-meter-link"
            onClick={() => goTo(isCabinetOwner ? "license" : "recruiters")}
            title={isCabinetOwner ? copy.license : copy.recruiters}
          >
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
              <small>{roleLabel}</small>
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
            <button type="button" className="jy-btn jy-btn-outline jy-hide-sm" onClick={() => goTo("missions")}>
              <AdminLineIcon name="briefcase" />
              <span>{copy.missions}</span>
            </button>
            <button type="button" className="jy-btn jy-btn-primary" onClick={() => openCreate("candidates")}>
              <AdminLineIcon name="plus" />
              <span className="jy-hide-xs">{copy.addCandidate}</span>
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
                        goTo("notifications");
                      }}
                    >
                      {t("Voir toutes les notifications", "View all notifications")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button type="button" className="jy-icon-btn jy-hide-sm" title={copy.helpCenter} aria-label={copy.helpCenter} onClick={() => goTo("helpCenter")}>
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
                  <small>{roleLabel}</small>
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
                      goTo("settings");
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
          {tab !== "home" ? (
            <nav className="jy-breadcrumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => goTo("home")}>
                {copy.home}
              </button>
              <AdminLineIcon name="chevronRight" />
              <span>{moduleLabel(tab)}</span>
            </nav>
          ) : null}

          {routeLoading ? <AdminPageLoader language={language} /> : renderCabinetPage()}
        </main>

        <ConnectedFooter
          copy={landingCopy}
          onBrandClick={() => goTo("home")}
          onHomeClick={() => goTo("home")}
          onPricingClick={() => goTo("pricing")}
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
                placeholder={t("Rechercher un candidat (nom, e-mail, compétence) ou un module…", "Search a candidate (name, email, skill) or a module…")}
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
                  <p className="jy-palette-hint">{t("Commencez à taper pour rechercher un candidat ou un module.", "Start typing to search a candidate or a module.")}</p>
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
                          {item.kind === "candidate" ? (
                            <AvatarCircle user={item} />
                          ) : (
                            <span className="jy-palette-icon">
                              <AdminLineIcon name={CABINET_NAV_ICONS[item.id]} />
                            </span>
                          )}
                          <span className="jy-palette-text">
                            <strong>{item.kind === "module" ? moduleLabel(item.id) : `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}</strong>
                            <small>{item.kind === "module" ? t("Ouvrir le module", "Open the module") : item.headline || item.email}</small>
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
