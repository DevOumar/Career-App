import React from "react";
// Module École : shell + toutes les pages du dashboard école (étudiants,
// invitations, promotions, licence, statistiques, rapports, paramètres).
import { useState, useEffect, useRef } from "react";
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
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../admin/AdminApp.jsx";
import AccountDrawer from "../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../App.jsx";

const SCHOOL_MODULE_DEFS = [
  { id: "dashboard", icon: "chart" },
  { id: "students", icon: "profile" },
  { id: "promotions", icon: "network" },
  { id: "invitations", icon: "mail" },
  { id: "license", icon: "save" },
  { id: "insights", icon: "chart" },
  { id: "reports", icon: "file" },
  { id: "settings", icon: "settings" }
];

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
  onDeleteAccount
}) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("career_app_school_tab") || "dashboard";
    } catch (_error) {
      return "dashboard";
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState("account");
  const [searchInput, setSearchInput] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchCopy =
    language === "en" ? { placeholder: "Search students…" } : { placeholder: "Rechercher des étudiants…" };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      getSchoolStudents(user.id, { search: searchInput.trim() })
        .then((items) => setSearchSuggestions(items.slice(0, 5)))
        .catch(() => setSearchSuggestions([]));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (!SCHOOL_MODULE_DEFS.some((item) => item.id === tab)) {
      setTab("dashboard");
      return;
    }
    try {
      localStorage.setItem("career_app_school_tab", tab);
    } catch (_error) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [tab]);

  function goToStudent(item) {
    setStudentsSearch(item.email);
    setSearchInput(item.email);
    setShowSuggestions(false);
    setTab("students");
  }

  function submitSearch(event) {
    event.preventDefault();
    if (!searchInput.trim()) return;
    setStudentsSearch(searchInput.trim());
    setShowSuggestions(false);
    setTab("students");
  }
  const copy =
    language === "en"
      ? {
          dashboard: "Dashboard",
          students: "Students",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "My license",
          insights: "Tracking & employability",
          reports: "Reports",
          settings: "Institution settings",
          accountSettings: "My profile",
          logout: "Log out",
          role: "School administrator",
          secured: "Secured by"
        }
      : {
          dashboard: "Dashboard",
          students: "Étudiants",
          promotions: "Promotions",
          invitations: "Invitations",
          license: "Ma licence",
          insights: "Suivi & employabilité",
          reports: "Rapports",
          settings: "Paramètres de l'établissement",
          accountSettings: "Mon profil",
          logout: "Déconnexion",
          role: "Administrateur école",
          secured: "Sécurisé par"
        };

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    getSchoolNotifications(user.id, language).then((data) => setNotifications(data.items || [])).catch(() => setNotifications([]));
  }, [user.id, language, tab]);

  function openAccountSettings() {
    setAccountPanel("account");
    setAccountDrawerOpen(true);
    setUserMenuOpen(false);
  }

  return (
    <div className="app-shell school-shell-root">
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            className="topbar-menu-toggle"
            aria-label={language === "en" ? "Toggle sidebar" : "Afficher/masquer le menu"}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          Career App <span className="admin-badge school-badge">École</span>
        </div>

        <div className="topbar-search-box" ref={searchBoxRef}>
          <form className="topbar-search" onSubmit={submitSearch}>
            <span className="topbar-search-icon" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={searchCopy.placeholder}
            />
          </form>
          {showSuggestions && searchSuggestions.length ? (
            <div className="topbar-suggestions">
              {searchSuggestions.map((item) => (
                <button type="button" key={item.id} className="topbar-suggestion-row" onClick={() => goToStudent(item)}>
                  <AvatarCircle user={item} />
                  <div>
                    <strong>
                      {item.firstName} {item.lastName}
                    </strong>
                    <span className="muted">{item.email}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="topbar-user" ref={userMenuRef}>
          <div className="topbar-notif" ref={notifRef}>
            <button
              type="button"
              className="topbar-icon-btn"
              title={language === "en" ? "Notifications" : "Notifications"}
              onClick={() => setNotifOpen((prev) => !prev)}
            >
              <UiIcon name="bell" />
              {notifications.filter((item) => !item.readAt).length ? (
                <span className="topbar-notif-badge">
                  {notifications.filter((item) => !item.readAt).length > 9 ? "9+" : notifications.filter((item) => !item.readAt).length}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="topbar-notif-panel">
                <div className="topbar-notif-panel-head">
                  <strong>{language === "en" ? "Notifications" : "Notifications"}</strong>
                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => {
                      markSchoolNotificationsRead(user.id).finally(() =>
                        setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })))
                      );
                    }}
                  >
                    {language === "en" ? "Mark as read" : "Tout marquer lu"}
                  </button>
                </div>
                {notifications.length ? (
                  <div className="topbar-notif-list">
                    {notifications.slice(0, 8).map((item) => (
                      <div key={item.id} className="topbar-notif-row">
                        <span className="topbar-notif-icon">
                          <UiIcon name={item.type === "license_capacity" ? "save" : item.type === "low_match_score" ? "alert" : "profile"} />
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <span className="muted">{item.body}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted topbar-notif-empty">
                    {language === "en" ? "No notification yet." : "Aucune notification pour le moment."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <button type="button" className="topbar-icon-btn" title={copy.insights} onClick={() => setTab("insights")}>
            <UiIcon name="history" />
          </button>
          <button
            type="button"
            className="topbar-icon-btn"
            title={copy.invitations}
            onClick={() => setTab("invitations")}
          >
            <UiIcon name="mail" />
          </button>
          <LanguageSwitch language={language} setLanguage={setLanguage} compact />
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>{copy.role}</span>
            </div>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <div className="user-dropdown-head">
                <AvatarCircle user={user} />
                <div>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <span>{user.username || user.email.split("@")[0]}</span>
                </div>
              </div>
              <button onClick={openAccountSettings}>
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                {copy.accountSettings}
              </button>
              <button onClick={onLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                {copy.logout}
              </button>
              <div className="user-dropdown-secured">
                {copy.secured} <strong>Career App</strong>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="admin-body">
        <aside className={`admin-sidebar-vertical ${sidebarOpen ? "" : "collapsed"}`}>
          <div className="admin-sidebar-user">
            <AvatarCircle user={user} />
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <span>{copy.role}</span>
            <div className="admin-sidebar-user-actions">
              <button type="button" title={copy.accountSettings} onClick={openAccountSettings}>
                <UiIcon name="profile" />
              </button>
              <button type="button" title={copy.invitations} onClick={() => setTab("invitations")}>
                <UiIcon name="mail" />
              </button>
              <button type="button" title={copy.logout} onClick={onLogout}>
                <UiIcon name="logout" />
              </button>
            </div>
          </div>
          <nav className="admin-sidebar-nav">
            <span className="admin-sidebar-section-label">MENU</span>
            {SCHOOL_MODULE_DEFS.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
                <UiIcon name={item.icon} /> <span>{copy[item.id]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="main-wrap admin-main">
          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            <span>{language === "en" ? "Home" : "Accueil"}</span>
            <UiIcon name="chevron" className="admin-breadcrumb-sep" />
            <span className="active">{copy[tab]}</span>
          </nav>

          {tab === "dashboard" ? <SchoolDashboardPage user={user} language={language} /> : null}
          {tab === "students" ? (
            <SchoolStudentsPage user={user} language={language} initialSearch={studentsSearch} />
          ) : null}
          {tab === "promotions" ? <SchoolPromotionsPage user={user} language={language} /> : null}
          {tab === "invitations" ? <SchoolInvitationsPage user={user} language={language} /> : null}
          {tab === "license" ? <SchoolLicensePage user={user} language={language} currency={currency} /> : null}
          {tab === "insights" ? <SchoolInsightsPage user={user} language={language} /> : null}
          {tab === "reports" ? <SchoolReportsPage user={user} language={language} /> : null}
          {tab === "settings" ? <SchoolSettingsPage user={user} language={language} /> : null}
        </main>
      </div>

      <ConnectedFooter copy={landingCopy} />

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
          onDeleteAccount={onDeleteAccount}
        />
      ) : null}
    </div>
  );
}

function SchoolExportCsvButton({ userId, language }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const base = await getApiBase();
      window.open(`${base}/school/students/export?userId=${encodeURIComponent(userId)}`, "_blank");
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

function SchoolDashboardPage({ user, language }) {
  const [overview, setOverview] = useState(null);
  const [recentStudents, setRecentStudents] = useState(null);
  const [error, setError] = useState("");
  const copy =
    language === "en"
      ? {
          title: "Dashboard",
          subtitle: "Real-time indicators for your students on Career App.",
          students: "Associated students",
          seats: "Seats used",
          activation: "Activation rate",
          cvs: "CVs imported",
          matches: "Matches run",
          avgScore: "Average match score",
          inactive: "Inactive 30+ days",
          trend: "New students — last 8 weeks",
          noTrendTitle: "No recent signup",
          noTrendHint: "New students linked to your license will appear here week by week.",
          noScore: "No data yet",
          recentStudents: "Recently joined",
          noStudents: "No student linked to your license yet.",
          joinedOn: "Joined",
          activityBreakdown: "Activity breakdown",
          activeLabel: "Active (30d)",
          inactiveLabel: "Inactive",
          noActivityTitle: "No activity yet",
          noActivityHint: "Activity starts when students import a CV or launch a match analysis."
        }
      : {
          title: "Dashboard",
          subtitle: "Indicateurs en temps réel de vos étudiants sur Career App.",
          students: "Étudiants associés",
          seats: "Sièges utilisés",
          activation: "Taux d'activation",
          cvs: "CV importés",
          matches: "Analyses réalisées",
          avgScore: "Score de matching moyen",
          inactive: "Inactifs depuis 30j+",
          trend: "Nouveaux étudiants — 8 dernières semaines",
          noTrendTitle: "Aucune inscription récente",
          noTrendHint: "Les nouveaux étudiants rattachés à votre licence apparaîtront ici semaine par semaine.",
          noScore: "Pas encore de données",
          recentStudents: "Derniers inscrits",
          noStudents: "Aucun étudiant rattaché à votre licence pour l'instant.",
          joinedOn: "Inscrit le",
          activityBreakdown: "Répartition de l'activité",
          activeLabel: "Actifs (30j)",
          inactiveLabel: "Inactifs",
          noActivityTitle: "Aucune activité pour le moment",
          noActivityHint: "L'activité démarre quand les étudiants importent un CV ou lancent une analyse de matching."
        };

  useEffect(() => {
    getSchoolOverview(user.id)
      .then(setOverview)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolStudents(user.id)
      .then((items) =>
        setRecentStudents([...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))
      )
      .catch(() => setRecentStudents([]));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!overview) return <AdminPageLoader language={language} />;

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-kpi-grid">
        <AdminKpiCard tone="primary" icon="profile" value={overview.totalStudents} label={copy.students} />
        <AdminKpiCard
          tone="warning"
          icon="save"
          value={`${overview.seatsUsed}/${overview.seatsTotal}`}
          label={copy.seats}
        />
        <AdminKpiCard tone="success" icon="chart" value={`${overview.activationRate}%`} label={copy.activation} />
        <AdminKpiCard tone="primary" icon="upload" value={overview.totalCvs} label={copy.cvs} />
        <AdminKpiCard tone="warning" icon="chart" value={overview.totalMatchRuns} label={copy.matches} />
        <AdminKpiCard
          tone="success"
          icon="scale"
          value={overview.avgScore != null ? `${overview.avgScore}%` : "—"}
          label={copy.avgScore}
        />
        <AdminKpiCard tone="danger" icon="alert" value={overview.inactiveStudents} label={copy.inactive} />
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel admin-trend-panel">
          <h3>{copy.trend}</h3>
          {overview.signupsTrend?.some((point) => point.count > 0) ? (
            <AdminTrendChart trend={overview.signupsTrend} language={language} />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noTrendTitle} hint={copy.noTrendHint} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.recentStudents}</h3>
          {recentStudents?.length ? (
            <div className="admin-recent-activity">
              {recentStudents.map((student) => (
                <div key={student.id} className="admin-recent-activity-row">
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="admin-recent-activity-time">
                    {copy.joinedOn} {formatDate(student.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : recentStudents ? (
            <SchoolEmptyState icon="profile" title={copy.recentStudents} hint={copy.noStudents} />
          ) : (
            <AdminPageLoader language={language} />
          )}
        </div>

        <div className="admin-panel admin-trend-panel">
          <h3>{copy.activityBreakdown}</h3>
          {overview.totalStudents ? (
            <AdminDonutChart
              segments={[
                {
                  label: copy.activeLabel,
                  value: overview.totalStudents - overview.inactiveStudents,
                  color: "var(--success)"
                },
                { label: copy.inactiveLabel, value: overview.inactiveStudents, color: "var(--danger)" }
              ]}
              emptyLabel={copy.noStudents}
            />
          ) : (
            <SchoolEmptyState icon="chart" title={copy.noActivityTitle} hint={copy.noActivityHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolStudentsPage({ user, language, initialSearch }) {
  const copy =
    language === "en"
      ? {
          title: "Students",
          subtitle: "Students linked to your school's license.",
          search: "Search by name or email…",
          colName: "Name",
          colJoined: "Joined on",
          colActivity: "Last activity",
          colScore: "Latest score",
          colStatus: "Status",
          colActions: "Actions",
          active: "Active",
          inactive: "Inactive",
          never: "No activity yet",
          totalLabel: "Students",
          activeLabel: "Active accounts",
          scoredLabel: "With match score",
          remove: "Remove",
          removeTitle: "Remove this student",
          removeWarning: "This frees up a seat on your license. The student switches back to the free plan and keeps their data.",
          removeConfirm: "Remove",
          cancel: "Cancel",
          empty: "No student found."
        }
      : {
          title: "Étudiants",
          subtitle: "Étudiants rattachés à la licence de votre établissement.",
          search: "Rechercher par nom ou email…",
          colName: "Nom",
          colJoined: "Inscrit le",
          colActivity: "Dernière activité",
          colScore: "Dernier score",
          colStatus: "Statut",
          colActions: "Actions",
          active: "Actif",
          inactive: "Inactif",
          never: "Aucune activité",
          totalLabel: "Étudiants",
          activeLabel: "Comptes actifs",
          scoredLabel: "Avec score",
          remove: "Retirer",
          removeTitle: "Retirer cet étudiant",
          removeWarning: "Cela libère un siège sur votre licence. L'étudiant repasse au plan gratuit et conserve ses données.",
          removeConfirm: "Retirer",
          cancel: "Annuler",
          empty: "Aucun étudiant trouvé."
        };

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  function reload() {
    getSchoolStudents(user.id, { search })
      .then(setStudents)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setPage(1);
    setError("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(students.length / ADMIN_PAGE_SIZE));
  const pagedStudents = students.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const activeCount = students.filter((student) => student.active).length;
  const scoredCount = students.filter((student) => student.latestScore != null).length;

  async function handleRemove(student) {
    const result = await Swal.fire({
      icon: "warning",
      title: copy.removeTitle,
      html: `<p style="text-align:left;margin-bottom:0.6rem;">${copy.removeWarning}</p><p style="text-align:left;font-weight:700;">${student.firstName} ${student.lastName} · ${student.email}</p>`,
      showCancelButton: true,
      confirmButtonText: copy.removeConfirm,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#b91c1c",
      focusCancel: true
    });

    if (!result.isConfirmed) return;

    try {
      await removeSchoolStudent(user.id, student.id);
      reload();
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: language === "en" ? "Student removed." : "Étudiant retiré.",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <SchoolExportCsvButton userId={user.id} language={language} />
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalLabel} value={students.length} tone="primary" />
        <AdminMiniMetric icon="chart" label={copy.activeLabel} value={activeCount} tone="success" />
        <AdminMiniMetric icon="scale" label={copy.scoredLabel} value={scoredCount} tone="warning" />
      </div>

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} />
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colName}</th>
              <th>{copy.colJoined}</th>
              <th>{copy.colActivity}</th>
              <th>{copy.colScore}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedStudents.length ? (
              pagedStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="admin-table-name">
                      <AvatarCircle user={student} />
                      <div>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <span className="muted">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{formatDate(student.createdAt)}</td>
                  <td className="muted">{student.lastActivity ? formatDate(student.lastActivity) : copy.never}</td>
                  <td>
                    {student.latestScore != null ? (
                      <span className="tag">{student.latestScore}%</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`tag ${student.active ? "tag-success" : ""}`}>
                      {student.active ? copy.active : copy.inactive}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-row-action danger" onClick={() => handleRemove(student)}>
                        <UiIcon name="alert" /> {copy.remove}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={students.length} />
    </section>
  );
}

function SchoolInvitationsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Invitations",
          subtitle: "Invite a student by email — a license seat is reserved automatically.",
          emailLabel: "Student email",
          send: "Send invitation",
          sending: "Sending…",
          colEmail: "Email",
          colCode: "License code",
          colStatus: "Status",
          colSent: "Sent on",
          statusPending: "Pending",
          statusRedeemed: "Accepted",
          sentLabel: "Invitations",
          pendingLabel: "Pending",
          acceptedLabel: "Accepted",
          empty: "No invitation sent yet."
        }
      : {
          title: "Invitations",
          subtitle: "Invitez un étudiant par email — un siège de licence est réservé automatiquement.",
          emailLabel: "Email de l'étudiant",
          send: "Envoyer l'invitation",
          sending: "Envoi…",
          colEmail: "Email",
          colCode: "Code de licence",
          colStatus: "Statut",
          colSent: "Envoyée le",
          statusPending: "En attente",
          statusRedeemed: "Acceptée",
          sentLabel: "Invitations",
          pendingLabel: "En attente",
          acceptedLabel: "Acceptées",
          empty: "Aucune invitation envoyée pour l'instant."
        };

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState([]);

  function reload() {
    getSchoolInvitations(user.id)
      .then(setInvitations)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSending(true);
    try {
      await sendSchoolInvitation(user.id, email);
      setMessage(language === "en" ? "Invitation sent." : "Invitation envoyée.");
      setEmail("");
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSending(false);
    }
  }

  const pendingCount = invitations.filter((invite) => invite.status !== "redeemed").length;
  const redeemedCount = invitations.filter((invite) => invite.status === "redeemed").length;

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-module-metrics">
        <AdminMiniMetric icon="mail" label={copy.sentLabel} value={invitations.length} tone="primary" />
        <AdminMiniMetric icon="history" label={copy.pendingLabel} value={pendingCount} tone="warning" />
        <AdminMiniMetric icon="shield" label={copy.acceptedLabel} value={redeemedCount} tone="success" />
      </div>

      <form className="admin-inline-form" onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailLabel}
          required
        />
        <button type="submit" className="btn-main ready" disabled={sending}>
          {sending ? <span className="btn-spinner" /> : null} {sending ? copy.sending : copy.send}
        </button>
      </form>

      {error ? <p className="field-error">{error}</p> : null}
      {message ? <p className="field-hint success">{message}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{copy.colEmail}</th>
              <th>{copy.colCode}</th>
              <th>{copy.colStatus}</th>
              <th>{copy.colSent}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length ? (
              invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td className="admin-license-code">{invite.licenseCode}</td>
                  <td>
                    <span className={`tag ${invite.status === "redeemed" ? "tag-success" : ""}`}>
                      {invite.status === "redeemed" ? copy.statusRedeemed : copy.statusPending}
                    </span>
                  </td>
                  <td className="muted">{formatDate(invite.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="admin-table-empty muted">
                  {copy.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchoolPromotionsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Promotions",
        subtitle: "Organize students by program, campus and academic year.",
        name: "Promotion name",
        program: "Program",
        level: "Level",
        campus: "Campus",
        year: "Academic year",
        create: "Create promotion",
        assign: "Assign a student",
        addStudent: "Add",
        removeStudent: "Remove",
        students: "students",
        empty: "No promotion created yet.",
        delete: "Delete"
      }
    : {
        title: "Promotions",
        subtitle: "Organisez les étudiants par programme, campus et année académique.",
        name: "Nom de la promotion",
        program: "Programme",
        level: "Niveau",
        campus: "Campus",
        year: "Année académique",
        create: "Créer la promotion",
        assign: "Affecter un étudiant",
        addStudent: "Ajouter",
        removeStudent: "Retirer",
        students: "étudiants",
        empty: "Aucune promotion créée pour le moment.",
        delete: "Supprimer"
      };
  const [data, setData] = useState({ items: [], students: [] });
  const [form, setForm] = useState({ name: "", program: "", level: "", campus: "", academicYear: "" });
  const [selectedStudents, setSelectedStudents] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getSchoolPromotions(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createSchoolPromotion(user.id, form);
      setForm({ name: "", program: "", level: "", campus: "", academicYear: "" });
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Promotion created." : "Promotion créée.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: language === "en" ? "Delete this promotion?" : "Supprimer cette promotion ?",
      text: item.name,
      showCancelButton: true,
      confirmButtonText: copy.delete,
      cancelButtonText: language === "en" ? "Cancel" : "Annuler",
      confirmButtonColor: "#dc2626"
    });
    if (!result.isConfirmed) return;
    await deleteSchoolPromotion(user.id, item.id);
    reload();
  }

  async function updateStudent(item, action, studentId) {
    const id = studentId || selectedStudents[item.id];
    if (!id) return;
    setError("");
    try {
      await updateSchoolPromotionStudent(user.id, item.id, id, action);
      setSelectedStudents((current) => ({ ...current, [item.id]: "" }));
      reload();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    }
  }

  return (
    <section className="school-promotions">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <form className="school-settings-form school-promotion-form" onSubmit={submit}>
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={copy.name} />
        <input value={form.program} onChange={(event) => setForm({ ...form, program: event.target.value })} placeholder={copy.program} />
        <input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} placeholder={copy.level} />
        <input value={form.campus} onChange={(event) => setForm({ ...form, campus: event.target.value })} placeholder={copy.campus} />
        <input value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder={copy.year} />
        <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.create}</button>
      </form>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="school-card-grid">
        {data.items.length ? data.items.map((item) => {
          const assignedIds = new Set(item.studentIds || []);
          const assigned = data.students.filter((student) => assignedIds.has(student.id));
          const available = data.students.filter((student) => !assignedIds.has(student.id));
          return (
            <article key={item.id} className="school-data-card">
              <div>
                <strong>{item.name}</strong>
                <span>{[item.program, item.level, item.campus, item.academicYear].filter(Boolean).join(" · ") || "—"}</span>
              </div>
              <small>{item.studentCount} {copy.students}</small>
              <div className="school-promotion-assign">
                <select
                  value={selectedStudents[item.id] || ""}
                  onChange={(event) => setSelectedStudents((current) => ({ ...current, [item.id]: event.target.value }))}
                >
                  <option value="">{copy.assign}</option>
                  {available.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {student.email}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-ghost" onClick={() => updateStudent(item, "add")} disabled={!selectedStudents[item.id]}>
                  <UiIcon name="plus" /> {copy.addStudent}
                </button>
              </div>
              {assigned.length ? (
                <div className="school-promotion-students">
                  {assigned.map((student) => (
                    <span key={student.id} className="school-promotion-student-pill">
                      <AvatarCircle user={student} />
                      {student.firstName} {student.lastName}
                      <button type="button" onClick={() => updateStudent(item, "remove", student.id)} title={copy.removeStudent}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <button type="button" className="admin-row-action danger" onClick={() => remove(item)}>
                <UiIcon name="trash" /> {copy.delete}
              </button>
            </article>
          );
        }) : <SchoolEmptyState icon="network" title={copy.title} hint={copy.empty} />}
      </div>
    </section>
  );
}

function maskLicenseCode(code) {
  if (!code) return code;
  const parts = code.split("-");
  if (parts.length < 3) return code.replace(/[A-Z0-9]/g, "•");
  return `${parts[0]}-••••-${parts[parts.length - 1]}`;
}

function SchoolLicenseCard({ item, language, currency, copy }) {
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

function SchoolLicensePage({ user, language, currency }) {
  const copy =
    language === "en"
      ? {
          title: "My license",
          subtitle: "Seats granted by Career App for your institution.",
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
          empty: "Contact Career App to get a license for your institution."
        }
      : {
          title: "Ma licence",
          subtitle: "Sièges accordés par Career App pour votre établissement.",
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
          empty: "Contactez Career App pour obtenir une licence pour votre établissement."
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

function SchoolInsightsPage({ user, language }) {
  const copy =
    language === "en"
      ? {
          title: "Tracking & employability",
          subtitle: "Aggregated view of your students' match performance.",
          distribution: "Score distribution",
          missing: "Most common missing keywords",
          ranking: "Student ranking by score",
          emptyDistribution: "No score data yet",
          emptyDistributionHint: "This chart fills in as soon as your students run their first CV/offer matches.",
          emptyMissing: "No missing keywords yet",
          emptyMissingHint: "Recurring skill gaps across your students will show up here.",
          emptyRanking: "No ranking yet",
          emptyRankingHint: "Once students have a match score, they'll appear here ranked from best to worst fit."
        }
      : {
          title: "Suivi & employabilité",
          subtitle: "Vue agrégée de la performance de matching de vos étudiants.",
          distribution: "Répartition des scores",
          missing: "Mots-clés manquants les plus fréquents",
          ranking: "Classement des étudiants par score",
          emptyDistribution: "Pas encore de score",
          emptyDistributionHint: "Ce graphique se remplit dès que vos étudiants lancent leurs premières analyses CV/offre.",
          emptyMissing: "Pas encore de mots-clés",
          emptyMissingHint: "Les manques récurrents de compétences chez vos étudiants apparaîtront ici.",
          emptyRanking: "Pas encore de classement",
          emptyRankingHint: "Dès qu'un étudiant obtient un score de matching, il apparaît ici classé du meilleur au moins bon."
        };

  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolInsights(user.id)
      .then(setInsights)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  if (error) return <p className="field-error">{error}</p>;
  if (!insights) return <p className="muted">…</p>;

  const bucketEntries = Object.entries(insights.scoreBuckets || {});
  const maxBucket = Math.max(1, ...bucketEntries.map(([, count]) => count));
  const hasData = bucketEntries.some(([, count]) => count > 0);

  return (
    <section className="admin-dashboard">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="admin-panel school-insight-panel">
        <h3>
          <span className="school-panel-icon">
            <UiIcon name="chart" />
          </span>
          {copy.distribution}
        </h3>
        {hasData ? (
          <div className="admin-trend-chart school-score-chart">
            {bucketEntries.map(([label, count]) => (
              <div key={label} className="admin-trend-bar-col">
                <div className="admin-trend-bar-track">
                  <div className="admin-trend-bar" style={{ height: `${Math.max(4, (count / maxBucket) * 100)}%` }}>
                    {count > 0 ? <span>{count}</span> : null}
                  </div>
                </div>
                <span className="admin-trend-label">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="chart" title={copy.emptyDistribution} hint={copy.emptyDistributionHint} />
        )}
      </div>

      <div className="admin-panel-grid">
        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="network" />
            </span>
            {copy.missing}
          </h3>
          {insights.topMissingKeywords?.length ? (
            <div className="admin-permission-tags">
              {insights.topMissingKeywords.map((item) => (
                <span key={item.keyword} className="tag">
                  {item.keyword} · {item.count}
                </span>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="network" title={copy.emptyMissing} hint={copy.emptyMissingHint} />
          )}
        </div>

        <div className="admin-panel school-insight-panel">
          <h3>
            <span className="school-panel-icon">
              <UiIcon name="profile" />
            </span>
            {copy.ranking}
          </h3>
          {insights.ranking?.length ? (
            <div className="school-ranking-list">
              {insights.ranking.slice(0, 10).map((student, index) => (
                <div key={student.id} className="school-ranking-row">
                  <span className={`school-ranking-index ${index < 3 ? "top" : ""}`}>{index + 1}</span>
                  <AvatarCircle user={student} />
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <span className="muted">{student.email}</span>
                  </div>
                  <span className="tag tag-success">{student.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <SchoolEmptyState icon="profile" title={copy.emptyRanking} hint={copy.emptyRankingHint} />
          )}
        </div>
      </div>
    </section>
  );
}

function SchoolReportsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Reports",
        subtitle: "Generate employability reports for management and academic teams.",
        generateMonthly: "Generate monthly report",
        generateWeekly: "Generate weekly report",
        totalStudents: "Students",
        activeStudents: "Active",
        withoutCv: "Without CV",
        lowScores: "Low scores",
        avgScore: "Average score",
        history: "Generated reports",
        empty: "No report generated yet."
      }
    : {
        title: "Rapports",
        subtitle: "Générez des rapports d'employabilité pour la direction et les équipes pédagogiques.",
        generateMonthly: "Générer le rapport mensuel",
        generateWeekly: "Générer le rapport hebdomadaire",
        totalStudents: "Étudiants",
        activeStudents: "Actifs",
        withoutCv: "Sans CV",
        lowScores: "Scores faibles",
        avgScore: "Score moyen",
        history: "Rapports générés",
        empty: "Aucun rapport généré pour le moment."
      };
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function reload() {
    getSchoolReports(user.id).then(setData).catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function generate(period) {
    setBusy(period);
    try {
      await generateSchoolReport(user.id, period);
      reload();
      Swal.fire({ icon: "success", title: language === "en" ? "Report generated." : "Rapport généré.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setBusy("");
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-reports">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="admin-module-metrics">
        <AdminMiniMetric icon="profile" label={copy.totalStudents} value={data.snapshot.totalStudents} />
        <AdminMiniMetric icon="chart" label={copy.activeStudents} value={data.snapshot.activeStudents} tone="success" />
        <AdminMiniMetric icon="upload" label={copy.withoutCv} value={data.snapshot.withoutCv} tone="warning" />
        <AdminMiniMetric icon="alert" label={copy.lowScores} value={data.snapshot.lowScores} tone="danger" />
        <AdminMiniMetric icon="scale" label={copy.avgScore} value={data.snapshot.avgScore != null ? `${data.snapshot.avgScore}%` : "—"} />
      </div>
      <div className="school-report-actions">
        <button className="btn-main ready" onClick={() => generate("monthly")} disabled={Boolean(busy)}>
          {busy === "monthly" ? <span className="btn-spinner" /> : <UiIcon name="file" />} {copy.generateMonthly}
        </button>
        <button className="btn-ghost" onClick={() => generate("weekly")} disabled={Boolean(busy)}>
          {busy === "weekly" ? <span className="btn-spinner dark" /> : <UiIcon name="history" />} {copy.generateWeekly}
        </button>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <div className="admin-panel school-insight-panel">
        <h3>{copy.history}</h3>
        {data.items.length ? (
          <div className="school-report-list">
            {data.items.map((item) => (
              <article key={item.id} className="school-report-row">
                <div>
                  <strong>{item.title}</strong>
                  <span className="muted">{formatDate(item.createdAt)} · {item.period}</span>
                </div>
                <span className="tag">{item.payload?.avgScore != null ? `${item.payload.avgScore}%` : "—"}</span>
              </article>
            ))}
          </div>
        ) : (
          <SchoolEmptyState icon="file" title={copy.history} hint={copy.empty} />
        )}
      </div>
    </section>
  );
}

function SchoolSettingsPage({ user, language }) {
  const copy = language === "en"
    ? {
        title: "Institution settings",
        subtitle: "Manage the institution identity separately from the administrator account.",
        adminBlock: "Administrator",
        schoolBlock: "Institution",
        save: "Save settings",
        orgName: "Official institution name",
        acronym: "Acronym / short name",
        orgType: "Type",
        website: "Website",
        emailDomain: "Email domain",
        address: "Address",
        city: "City",
        country: "Country",
        contactName: "Primary contact",
        contactEmail: "Contact email",
        contactPhone: "Contact phone",
        notes: "Internal notes"
      }
    : {
        title: "Paramètres de l'établissement",
        subtitle: "Gérez l'identité de l'établissement séparément du compte administrateur.",
        adminBlock: "Administrateur",
        schoolBlock: "Établissement",
        save: "Enregistrer les paramètres",
        orgName: "Nom officiel de l'établissement",
        acronym: "Sigle",
        orgType: "Type",
        website: "Site web",
        emailDomain: "Domaine email",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        contactName: "Contact principal",
        contactEmail: "Email de contact",
        contactPhone: "Téléphone de contact",
        notes: "Notes internes"
      };
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchoolProfile(user.id)
      .then((payload) => {
        setData(payload);
        setForm(payload.profile || {});
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(language === "en" ? "Please select an image file." : "Veuillez sélectionner une image.");
      event.target.value = "";
      return;
    }
    try {
      // fileToBase64 renvoie le base64 brut sans préfixe "data:" (pensé pour
      // l'upload de CV, où le mimeType part séparément côté serveur) — pour
      // un <img src>, il faut reconstruire une vraie data URL avec son type MIME.
      const content = await fileToBase64(file);
      update("logoDataUrl", `data:${file.type};base64,${content}`);
    } catch (_error) {
      setError(language === "en" ? "Unable to read this image." : "Impossible de lire cette image.");
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = await updateSchoolProfile(user.id, form);
      setForm(payload.profile || form);
      Swal.fire({ icon: "success", title: language === "en" ? "Settings saved." : "Paramètres enregistrés.", timer: 1800, showConfirmButton: false });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <AdminPageLoader language={language} />;

  return (
    <section className="school-settings">
      <header className="module-header">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>
      <div className="school-settings-grid">
        <article className="admin-panel">
          <h3>{copy.adminBlock}</h3>
          <div className="school-admin-identity">
            <AvatarCircle user={data.admin} />
            <div>
              <strong>{data.admin.firstName} {data.admin.lastName}</strong>
              <span className="muted">{data.admin.email}</span>
            </div>
          </div>
        </article>
        <form className="admin-panel school-settings-form" onSubmit={submit}>
          <h3>{copy.schoolBlock}</h3>
          <div className="school-logo-editor">
            <span className="school-logo-preview">
              {form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <UiIcon name="briefcase" />}
            </span>
            <label className="btn-ghost">
              <UiIcon name="upload" />
              {language === "en" ? "Upload logo" : "Télécharger le logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoUpload} />
            </label>
            {form.logoDataUrl ? (
              <button type="button" className="admin-row-action danger" onClick={() => update("logoDataUrl", "")}>
                {language === "en" ? "Remove logo" : "Supprimer le logo"}
              </button>
            ) : null}
          </div>
          <input value={form.organizationName || ""} onChange={(event) => update("organizationName", event.target.value)} placeholder={copy.orgName} />
          <input value={form.acronym || ""} onChange={(event) => update("acronym", event.target.value)} placeholder={copy.acronym} />
          <input value={form.organizationType || ""} onChange={(event) => update("organizationType", event.target.value)} placeholder={copy.orgType} />
          <input value={form.website || ""} onChange={(event) => update("website", event.target.value)} placeholder={copy.website} />
          <input value={form.emailDomain || ""} onChange={(event) => update("emailDomain", event.target.value)} placeholder={copy.emailDomain} />
          <input value={form.address || ""} onChange={(event) => update("address", event.target.value)} placeholder={copy.address} />
          <input value={form.city || ""} onChange={(event) => update("city", event.target.value)} placeholder={copy.city} />
          <input value={form.country || ""} onChange={(event) => update("country", event.target.value)} placeholder={copy.country} />
          <input value={form.primaryContactName || ""} onChange={(event) => update("primaryContactName", event.target.value)} placeholder={copy.contactName} />
          <input value={form.contactEmail || ""} onChange={(event) => update("contactEmail", event.target.value)} placeholder={copy.contactEmail} />
          <input value={form.contactPhone || ""} onChange={(event) => update("contactPhone", event.target.value)} placeholder={copy.contactPhone} />
          <textarea value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder={copy.notes} />
          {error ? <p className="field-error">{error}</p> : null}
          <button className="btn-main ready" disabled={saving}>{saving ? <span className="btn-spinner" /> : null} {copy.save}</button>
        </form>
      </div>
    </section>
  );
}

export { SchoolApp as default, SchoolEmptyState };
