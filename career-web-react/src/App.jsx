import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  activatePremiumSubscription,
  addCvRecord,
  changeUserPassword,
  deleteUserAccount,
  getLatestMatchRun,
  getPremiumSnapshot,
  getUserFromSession,
  listInterviewAttempts,
  listOfferStatuses,
  listOffers,
  listUserCvs,
  loginUser,
  logoutUser,
  registerUser,
  requestAiEvaluation,
  requestCvRewrite,
  requestLiveTurn,
  saveInterviewAttempt,
  saveMatchRun,
  updateOfferStatus,
  updateUserAccount,
  updateUserAvatar,
  updateUserProfile
} from "./lib/inMemoryDb";
import { buildOptimizedCvText, createCvRecord, downloadOptimizedCvPdf, downloadTextFile, readFileAsText } from "./lib/cvService";
import { EDUCATION_LEVELS } from "./data/skills";
import { filterScoredOffers, runMatching } from "./lib/matchingService";
import { INTERVIEW_SCRIPTS } from "./lib/interviewScripts";
import {
  createMicLevelMeter,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  listenOnce,
  speak,
  stopSpeaking
} from "./lib/liveInterview";
import { downloadInterviewReportPdf, evaluateAnswer, summarizeSession } from "./lib/interviewEvaluation";

const NAV_ITEMS = [
  { id: "home", label: "Accueil", always: true, icon: "home" },
  { id: "import", label: "Importer", always: true, icon: "upload" },
  { id: "profil", label: "Profil", always: true, icon: "profile" },
  { id: "analyse", label: "Analyse", icon: "chart" },
  { id: "offres", label: "Offres", icon: "briefcase" },
  { id: "cv", label: "CV+", icon: "spark" },
  { id: "entretiens", label: "Entretiens", icon: "chat" }
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "student", label: "Étudiant", description: "Recherche de stage, alternance ou premier emploi." },
  { value: "candidate", label: "Candidat", description: "Recherche active d'opportunités professionnelles." },
  { value: "recruiter_firm", label: "Cabinet de recrutement", description: "Sourcing et placement pour des clients." },
  { value: "recruiter_internal", label: "Recruteur interne", description: "Talent acquisition au sein d'une entreprise." },
  { value: "company", label: "Entreprise", description: "Équipe RH ou manager qui publie des offres." },
  { value: "school", label: "École / Université", description: "Placement étudiants et partenariat entreprises." },
  { value: "coach", label: "Coach carrière", description: "Accompagnement CV, préparation entretien, mentoring." },
  { value: "other", label: "Autre", description: "Autre profil professionnel lié à l'emploi." }
];

const HOME_WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Importer",
    text: "Votre CV et le texte de l'offre"
  },
  {
    number: "02",
    title: "Analyser",
    text: "Score de compatibilité par domaine"
  },
  {
    number: "03",
    title: "Optimiser",
    text: "Recommandations ciblées sur le CV"
  },
  {
    number: "04",
    title: "S'entraîner",
    text: "Simulations d'entretiens avec feedback"
  }
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function levelTag(level) {
  if (level === "critique") return "crit";
  if (level === "important") return "warn";
  if (level === "premium") return "premium";
  return "good";
}

function ratingLabel(score) {
  if (score >= 80) return "Excellent fit";
  if (score >= 65) return "Bon fit";
  if (score >= 50) return "Match moyen";
  return "À renforcer";
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
}

function withInitials(user) {
  const first = user?.firstName?.[0] || "U";
  const last = user?.lastName?.[0] || "X";
  return `${first}${last}`.toUpperCase();
}

function getAvatarSource(user) {
  return user?.avatarDataUrl || user?.account?.avatarDataUrl || "";
}

function mergeProfileFromCv(currentProfile, parsedCv) {
  return {
    ...currentProfile,
    headline: currentProfile.headline || parsedCv.headline || "",
    experienceYears: Math.max(Number(currentProfile.experienceYears || 0), Number(parsedCv.experienceYears || 0)),
    education: currentProfile.education || parsedCv.education || "",
    skills: unique([...(currentProfile.skills || []), ...(parsedCv.skills || [])]),
    languages: unique([...(currentProfile.languages || []), ...(parsedCv.languages || [])])
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire cette image."));
    reader.readAsDataURL(file);
  });
}

function getAccountLabel(accountType) {
  return ACCOUNT_TYPE_OPTIONS.find((item) => item.value === accountType)?.label || "Autre";
}

function accountToForm(user) {
  const account = user?.account || {};
  const details = account.details || {};
  return {
    accountType: account.accountType || user?.roleType || "candidate",
    phone: account.phone || "",
    city: account.city || "",
    country: account.country || "",
    currentTitle: details.currentTitle || "",
    targetRole: details.targetRole || "",
    experienceYears: details.experienceYears || 0,
    schoolName: details.schoolName || "",
    studyLevel: details.studyLevel || "",
    graduationYear: details.graduationYear || "",
    contractPreference: details.contractPreference || "",
    availability: details.availability || "",
    portfolioUrl: details.portfolioUrl || "",
    linkedinUrl: details.linkedinUrl || "",
    organizationName: details.organizationName || "",
    recruiterRole: details.recruiterRole || "",
    hiringVolume: details.hiringVolume || "",
    industry: details.industry || "",
    website: details.website || "",
    organizationType: details.organizationType || "",
    department: details.department || "",
    sizeRange: details.sizeRange || "",
    contactRole: details.contactRole || "",
    notes: details.notes || ""
  };
}

function buildAccountPatch(form) {
  const accountType = form.accountType || "candidate";
  const patch = {
    accountType,
    phone: form.phone,
    city: form.city,
    country: form.country,
    onboardingCompleted: true
  };

  if (accountType === "candidate" || accountType === "student") {
    patch.details = {
      currentTitle: form.currentTitle,
      targetRole: form.targetRole,
      experienceYears: Number(form.experienceYears || 0),
      schoolName: form.schoolName,
      studyLevel: form.studyLevel,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      contractPreference: form.contractPreference,
      availability: form.availability,
      portfolioUrl: form.portfolioUrl,
      linkedinUrl: form.linkedinUrl
    };
    return patch;
  }

  if (accountType === "recruiter_firm" || accountType === "recruiter_internal") {
    patch.details = {
      organizationName: form.organizationName,
      recruiterRole: form.recruiterRole,
      hiringVolume: form.hiringVolume,
      industry: form.industry,
      website: form.website
    };
    return patch;
  }

  patch.details = {
    organizationName: form.organizationName,
    organizationType: form.organizationType || accountType,
    department: form.department,
    website: form.website,
    sizeRange: form.sizeRange,
    industry: form.industry,
    contactRole: form.contactRole,
    notes: form.notes
  };
  return patch;
}

function UiIcon({ name, className = "" }) {
  const map = {
    home: (
      <path
        d="M3.75 8.25L10 3l6.25 5.25v7a.75.75 0 01-.75.75H11.5v-4.25h-3V16H4.5a.75.75 0 01-.75-.75v-7z"
        fill="currentColor"
      />
    ),
    upload: (
      <path
        d="M10 2.75a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l1.72 1.72V3.5A.75.75 0 0110 2.75zm-6 10.5A.75.75 0 014.75 12.5h10.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z"
        fill="currentColor"
      />
    ),
    profile: (
      <path
        d="M10 3.25a3.25 3.25 0 110 6.5 3.25 3.25 0 010-6.5zM4.25 15a4.75 4.75 0 019.5 0v1h-9.5v-1z"
        fill="currentColor"
      />
    ),
    chart: (
      <path
        d="M4.5 15.5a.75.75 0 01-.75-.75v-1.5a.75.75 0 011.5 0v.75h10v-.75a.75.75 0 011.5 0v1.5a.75.75 0 01-.75.75h-11.5zm1-3.75a.75.75 0 01-.75-.75V6.5a.75.75 0 011.5 0V11a.75.75 0 01-.75.75zm4.5 0a.75.75 0 01-.75-.75V4.75a.75.75 0 011.5 0V11a.75.75 0 01-.75.75zm4.5 0a.75.75 0 01-.75-.75V8.75a.75.75 0 011.5 0V11a.75.75 0 01-.75.75z"
        fill="currentColor"
      />
    ),
    briefcase: (
      <path
        d="M7 4a2 2 0 00-2 2v1H4a1.5 1.5 0 00-1.5 1.5V14A2 2 0 004.5 16h11a2 2 0 002-2v-5.5A1.5 1.5 0 0016 7h-1V6a2 2 0 00-2-2H7zm1.5 3V6a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1h-3z"
        fill="currentColor"
      />
    ),
    spark: (
      <path
        d="M10 2.5l1.3 3.14L14.5 7l-3.2 1.36L10 11.5 8.7 8.36 5.5 7l3.2-1.36L10 2.5zm5 7l.7 1.7 1.8.8-1.8.8-.7 1.7-.7-1.7-1.8-.8 1.8-.8.7-1.7zM4.5 11l.9 2.18 2.2.95-2.2.95-.9 2.17-.9-2.17-2.2-.95 2.2-.95.9-2.18z"
        fill="currentColor"
      />
    ),
    chat: (
      <path
        d="M4.5 4h11A1.5 1.5 0 0117 5.5v7a1.5 1.5 0 01-1.5 1.5H9l-3.2 2.2a.5.5 0 01-.78-.41V14H4.5A1.5 1.5 0 013 12.5v-7A1.5 1.5 0 014.5 4z"
        fill="currentColor"
      />
    ),
    shield: (
      <path
        d="M10 2.75l6 2.1v4.4c0 3.76-2.21 6.98-6 8-3.79-1.02-6-4.24-6-8v-4.4l6-2.1zm-1.1 8.26l-1.4-1.4a.75.75 0 10-1.06 1.06l1.93 1.93a.75.75 0 001.06 0l4.18-4.18a.75.75 0 10-1.06-1.06l-3.65 3.65z"
        fill="currentColor"
      />
    ),
    logout: (
      <path
        d="M8 3.5a.75.75 0 000 1.5h4.25v10H8a.75.75 0 000 1.5h5A.75.75 0 0013.75 16V4A.75.75 0 0013 3.25H8zm-1.28 3.22a.75.75 0 010 1.06L5.56 9h6.69a.75.75 0 010 1.5H5.56l1.16 1.22a.75.75 0 11-1.08 1.04L3.2 10.22a1.75 1.75 0 010-2.44l2.44-2.44a.75.75 0 011.08 0z"
        fill="currentColor"
      />
    )
  };

  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {map[name] || map.spark}
    </svg>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("career_app_token") || "");
  const [session, setSession] = useState(null);
  const [premium, setPremium] = useState(null);
  const [activePage, setActivePage] = useState("home");

  const [authError, setAuthError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [processingError, setProcessingError] = useState("");

  const [cvDraft, setCvDraft] = useState("");
  const [offerText, setOfferText] = useState("");
  const [latestCv, setLatestCv] = useState(null);
  const [cvHistory, setCvHistory] = useState([]);
  const [latestMatch, setLatestMatch] = useState(null);
  const [offerStatuses, setOfferStatuses] = useState({}); // { [offerId]: { isFavorite, isApplied } }

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyseProgress, setAnalyseProgress] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const userMenuRef = useRef(null);

  const analysisUnlocked = Boolean(latestMatch);
  const user = session?.user;
  const canAnalyse = Boolean(latestCv && offerText.trim().length > 50 && !isAnalysing);

  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    const profile = user.profile || {};
    let score = 0;
    if (profile.targetRole) score += 20;
    if (profile.location) score += 20;
    if (profile.sector) score += 20;
    if ((profile.skills || []).length >= 5) score += 20;
    if ((profile.experienceYears || 0) >= 1) score += 20;
    return score;
  }, [user]);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("career_app_token");
      return;
    }
    localStorage.setItem("career_app_token", token);
    syncSession(token);
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function syncSession(nextToken) {
    const snapshot = await getUserFromSession(nextToken);
    if (!snapshot) {
      setToken("");
      setSession(null);
      setPremium(null);
      setLatestMatch(null);
      return;
    }
    setSession(snapshot);
    setPremium(snapshot.premium);
    setCvHistory(await listUserCvs(snapshot.user.id));
    setLatestMatch(await getLatestMatchRun(snapshot.user.id));
    const statuses = await listOfferStatuses(snapshot.user.id);
    setOfferStatuses(
      Object.fromEntries(statuses.map((s) => [s.offerId, { isFavorite: s.isFavorite, isApplied: s.isApplied }]))
    );
  }

  async function handleToggleOfferStatus(offerId, patch) {
    if (!user) return;
    const current = offerStatuses[offerId] || { isFavorite: false, isApplied: false };
    const next = { ...current, ...patch };
    setOfferStatuses((prev) => ({ ...prev, [offerId]: next })); // optimiste
    try {
      await updateOfferStatus(user.id, offerId, next);
    } catch (_error) {
      setOfferStatuses((prev) => ({ ...prev, [offerId]: current })); // rollback si échec
    }
  }

  function clearMessages() {
    setAuthError("");
    setPageMessage("");
    setProcessingError("");
  }

  async function handleLogin(credentials) {
    try {
      clearMessages();
      const result = await loginUser(credentials);
      setToken(result.token);
      await syncSession(result.token);
      setActivePage("home");
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleSignup(payload) {
    try {
      clearMessages();
      await registerUser(payload);
      const result = await loginUser({ email: payload.email, password: payload.password });
      setToken(result.token);
      await syncSession(result.token);
      setActivePage("profil");
      setPageMessage("Compte créé. Finalise ton profil et ta stratégie de candidature.");
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogout() {
    if (token) {
      try {
        await logoutUser(token);
      } catch (_error) {
        // Ignore transport errors and clear local session anyway.
      }
    }
    setToken("");
    setSession(null);
    setPremium(null);
    setLatestCv(null);
    setLatestMatch(null);
    setOfferText("");
    setCvDraft("");
    setCvHistory([]);
    setActivePage("home");
    setSecurityOpen(false);
    setUserMenuOpen(false);
    clearMessages();
  }

  async function handleDeleteAccount(password) {
    await deleteUserAccount(user.id, password); // laisse l'erreur remonter au composant (mot de passe incorrect, etc.)
    setToken("");
    setSession(null);
    setPremium(null);
    setLatestCv(null);
    setLatestMatch(null);
    setOfferText("");
    setCvDraft("");
    setCvHistory([]);
    setOfferStatuses({});
    setActivePage("home");
    setSecurityOpen(false);
    setUserMenuOpen(false);
    clearMessages();
    setPageMessage("Ton compte et toutes tes données ont été définitivement supprimés.");
  }

  async function saveCvToDb({ fileName, text }) {
    if (!user) return;

    const cvRecord = createCvRecord({ fileName, sourceText: text });
    const saved = await addCvRecord(user.id, cvRecord);
    setLatestCv(saved);
    setCvHistory(await listUserCvs(user.id));

    const mergedProfile = mergeProfileFromCv(user.profile || {}, saved.parsed || {});
    const updated = await updateUserProfile(user.id, mergedProfile);
    setSession({ user: updated.user, premium: updated.premium });
    setPremium(updated.premium);
  }

  async function handleCvFileUpload(file) {
    if (!file) return;
    try {
      clearMessages();
      const text = await readFileAsText(file);
      if (text.trim().length < 20) {
        throw new Error("Le fichier semble vide ou non lisible. Utilise la zone de texte en complément.");
      }
      await saveCvToDb({ fileName: file.name, text });
      setPageMessage(`CV importé : ${file.name}`);
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleCvDraftImport() {
    if (!cvDraft.trim()) {
      setProcessingError("Ajoute un texte CV avant l'import manuel.");
      return;
    }

    try {
      clearMessages();
      await saveCvToDb({
        fileName: `cv-manuel-${new Date().toISOString().slice(0, 10)}.txt`,
        text: cvDraft
      });
      setPageMessage("CV texte importé et profil enrichi automatiquement.");
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleCorrectExtraction(correctedFields) {
    if (!user) return;
    try {
      const updated = await updateUserProfile(user.id, correctedFields);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage("Corrections enregistrées dans ton profil.");
    } catch (error) {
      setProcessingError(error.message || "Échec de l'enregistrement des corrections.");
    }
  }

  async function handleProfileSave(profilePayload) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await updateUserProfile(user.id, profilePayload);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage("Profil mis à jour.");
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleAccountSave(accountPayload) {
    if (!user) return;
    try {
      clearMessages();
      const updated = await updateUserAccount(user.id, accountPayload);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage("Informations compte mises à jour.");
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleAvatarUpload(file) {
    if (!user || !file) return;
    try {
      clearMessages();
      if (!file.type.startsWith("image/")) {
        throw new Error("Sélectionne une image valide.");
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("Image trop lourde. Maximum 2 Mo.");
      }

      setAvatarUploading(true);
      const avatarDataUrl = await readFileAsDataUrl(file);
      const updated = await updateUserAvatar(user.id, avatarDataUrl);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage("Photo de profil mise à jour.");
    } catch (error) {
      setProcessingError(error.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handlePremiumActivation() {
    if (!user) return;
    try {
      clearMessages();
      const updated = await activatePremiumSubscription(user.id);
      setSession({ user: updated.user, premium: updated.premium });
      setPremium(updated.premium);
      setPageMessage("Offre premium activée pour 30 jours.");
    } catch (error) {
      setProcessingError(error.message);
    }
  }

  async function handleAnalyse() {
    if (!user || !latestCv || !canAnalyse) return;

    clearMessages();
    setIsAnalysing(true);
    setAnalyseProgress(0);

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(95, progress + Math.random() * 18);
      setAnalyseProgress(Math.round(progress));
    }, 120);

    try {
      await wait(1250);

      const offers = await listOffers();
      const premiumSnapshot = await getPremiumSnapshot(user.id);
      const result = runMatching({
        user,
        cvRecord: latestCv,
        offerText,
        offers,
        premiumAccess: premiumSnapshot,
        cvSignals: latestCv?.parsed?.signals
      });

      await saveMatchRun(user.id, result);
      clearInterval(timer);
      setAnalyseProgress(100);
      await wait(250);
      setLatestMatch(result);
      setActivePage("analyse");
      await syncSession(token);
      setPageMessage("Analyse terminée. Tu peux ouvrir Analyse, Offres, CV+ et Entretiens.");
    } catch (error) {
      clearInterval(timer);
      setProcessingError(error.message || "Échec de l'analyse.");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    if (!user) return;
    try {
      clearMessages();
      if (securityForm.newPassword.length < 8) {
        throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      }
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        throw new Error("La confirmation du mot de passe ne correspond pas.");
      }

      setSecuritySaving(true);
      await changeUserPassword(user.id, securityForm.currentPassword, securityForm.newPassword);
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSecurityOpen(false);
      setAuthError("Mot de passe modifié. Reconnecte-toi.");
      await handleLogout();
    } catch (error) {
      setProcessingError(error.message);
    } finally {
      setSecuritySaving(false);
    }
  }

  function goTo(pageId) {
    if (!analysisUnlocked && !NAV_ITEMS.find((item) => item.id === pageId)?.always && pageId !== "profil") {
      return;
    }
    setActivePage(pageId);
    setPageMessage("");
    setProcessingError("");
    setUserMenuOpen(false);
  }

  if (!user) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onSignup={handleSignup}
        error={authError}
        helper="Base PostgreSQL embarquée : comptes et onboarding sont stockés localement dans le dossier du projet."
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          Career_App <span className="brand-badge">Premium POC</span>
        </div>

        <nav className="topnav">
          {NAV_ITEMS.map((item) => {
            const isLocked = !item.always && !analysisUnlocked && item.id !== "profil";
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? "active" : ""}`}
                onClick={() => goTo(item.id)}
                disabled={isLocked}
              >
                <span className="nav-btn-icon">
                  <UiIcon name={item.icon} />
                </span>
                <span className="nav-btn-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="topbar-user" ref={userMenuRef}>
          <button className="user-menu-trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
            <AvatarCircle user={user} />
            <div className="topbar-user-meta">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span>
                {getAccountLabel(user.roleType)} · {user.subscription?.plan === "premium" ? "Premium" : "Free"}
              </span>
            </div>
            <span className="menu-caret">▾</span>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <button onClick={() => goTo("profil")}>
                <span className="dropdown-icon">
                  <UiIcon name="profile" />
                </span>
                Mon profil
              </button>
              <button
                onClick={() => {
                  setSecurityOpen(true);
                  setUserMenuOpen(false);
                }}
              >
                <span className="dropdown-icon">
                  <UiIcon name="shield" />
                </span>
                Sécurité / Mot de passe
              </button>
              <button onClick={handleLogout}>
                <span className="dropdown-icon danger">
                  <UiIcon name="logout" />
                </span>
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="main-wrap">
        {pageMessage ? <div className="alert ok">{pageMessage}</div> : null}
        {processingError ? <div className="alert error">{processingError}</div> : null}

        {activePage === "home" ? (
          <HomePage
            onStart={() => goTo("import")}
            onNavigate={goTo}
            user={user}
            premium={premium}
            profileCompleteness={profileCompleteness}
            latestMatch={latestMatch}
            cvCount={cvHistory.length}
            favoriteCount={Object.values(offerStatuses).filter((s) => s.isFavorite).length}
          />
        ) : null}
        {activePage === "import" ? (
          <ImportPage
            latestCv={latestCv}
            cvHistory={cvHistory}
            cvDraft={cvDraft}
            setCvDraft={setCvDraft}
            offerText={offerText}
            setOfferText={setOfferText}
            onFileUpload={handleCvFileUpload}
            onDraftImport={handleCvDraftImport}
            onAnalyse={handleAnalyse}
            canAnalyse={canAnalyse}
            isAnalysing={isAnalysing}
            analyseProgress={analyseProgress}
            onCorrectExtraction={handleCorrectExtraction}
          />
        ) : null}

        {activePage === "profil" ? (
          <ProfilePage
            user={user}
            premium={premium}
            profileCompleteness={profileCompleteness}
            onSaveProfile={handleProfileSave}
            onSaveAccount={handleAccountSave}
            onAvatarUpload={handleAvatarUpload}
            avatarUploading={avatarUploading}
            onActivatePremium={handlePremiumActivation}
            onDeleteAccount={handleDeleteAccount}
          />
        ) : null}

        {activePage === "analyse" ? <AnalysisPage matchData={latestMatch} /> : null}
        {activePage === "offres" ? (
          <OffersPage
            matchData={latestMatch}
            premium={premium}
            offerStatuses={offerStatuses}
            onToggleStatus={handleToggleOfferStatus}
          />
        ) : null}
        {activePage === "cv" ? (
          <CvAdvicePage matchData={latestMatch} latestCv={latestCv} userId={user?.id} premium={premium} />
        ) : null}
        {activePage === "entretiens" ? (
          <InterviewPage userId={user?.id} offer={latestMatch?.bestMatch?.offer} premium={premium} />
        ) : null}
      </main>

      {securityOpen ? (
        <div className="modal-backdrop" onClick={() => setSecurityOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Sécurité du compte</h3>
            <p className="muted">Change ton mot de passe de connexion.</p>
            <form onSubmit={submitPasswordChange}>
              <label>
                Mot de passe actuel
                <input
                  type="password"
                  value={securityForm.currentPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  required
                />
              </label>
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  value={securityForm.newPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirmation
                <input
                  type="password"
                  value={securityForm.confirmPassword}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  minLength={8}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSecurityOpen(false)}>
                  Annuler
                </button>
                <button className="btn-main" type="submit" disabled={securitySaving}>
                  {securitySaving ? "Mise à jour..." : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AvatarCircle({ user, large = false }) {
  const src = getAvatarSource(user);
  const initials = withInitials(user);
  const style = src
    ? {
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }
    : undefined;

  return (
    <div className={`avatar ${large ? "large" : ""} ${src ? "has-image" : ""}`} style={style}>
      {src ? null : initials}
    </div>
  );
}

function AuthScreen({ onLogin, onSignup, error, helper }) {
  const [mode, setMode] = useState("login");
  const [signupStep, setSignupStep] = useState(1);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    accountType: "student",
    phone: "",
    city: "",
    country: "France",
    currentTitle: "",
    targetRole: "",
    experienceYears: 0,
    schoolName: "",
    studyLevel: "",
    graduationYear: "",
    contractPreference: "",
    availability: "",
    portfolioUrl: "",
    linkedinUrl: "",
    organizationName: "",
    recruiterRole: "",
    hiringVolume: "",
    industry: "",
    website: "",
    organizationType: "",
    department: "",
    sizeRange: "",
    contactRole: "",
    notes: ""
  });

  function updateLoginField(key, value) {
    setLoginForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSignupField(key, value) {
    setSignupForm((prev) => ({ ...prev, [key]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setSignupStep(1);
  }

  function validateStepOne() {
    if (!signupForm.firstName || !signupForm.lastName) throw new Error("Prénom et nom sont requis.");
    if (!signupForm.email.includes("@")) throw new Error("Email invalide.");
    if (signupForm.password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    if (signupForm.password !== signupForm.passwordConfirm) throw new Error("La confirmation du mot de passe est incorrecte.");
  }

  function validateStepTwo() {
    if (!signupForm.accountType) throw new Error("Choisis un type de compte.");
    if (!signupForm.phone || !signupForm.city || !signupForm.country) {
      throw new Error("Téléphone, ville et pays sont requis.");
    }
  }

  function nextSignupStep() {
    try {
      if (signupStep === 1) validateStepOne();
      if (signupStep === 2) validateStepTwo();
      setSignupStep((prev) => Math.min(3, prev + 1));
    } catch (stepError) {
      alert(stepError.message);
    }
  }

  function buildSignupPayload() {
    return {
      firstName: signupForm.firstName,
      lastName: signupForm.lastName,
      email: signupForm.email,
      password: signupForm.password,
      accountType: signupForm.accountType,
      onboarding: buildAccountPatch(signupForm)
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (mode === "login") {
      onLogin(loginForm);
      return;
    }

    if (signupStep < 3) {
      nextSignupStep();
      return;
    }

    onSignup(buildSignupPayload());
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand-block">
        <span className="pill">Career Intelligence Platform</span>
        <h1>
          Construis un profil
          <br />
          qui débloque les <em>meilleures offres</em>
        </h1>
        <p>Onboarding intelligent, matching CV, recommandations et coaching entretien dans une vraie expérience SaaS.</p>
        <div className="auth-steps">
          <div>
            <strong>01</strong>
            <span>Créer le compte</span>
          </div>
          <div>
            <strong>02</strong>
            <span>Choisir ton rôle</span>
          </div>
          <div>
            <strong>03</strong>
            <span>Activer ton parcours</span>
          </div>
        </div>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-toggle">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
            Se connecter
          </button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
            S'inscrire
          </button>
        </div>

        {mode === "login" ? (
          <>
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => updateLoginField("email", event.target.value)}
                required
              />
            </label>

            <label>
              Mot de passe
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => updateLoginField("password", event.target.value)}
                minLength={8}
                required
              />
            </label>
          </>
        ) : (
          <>
            <div className="onboarding-steps">
              <span className={signupStep >= 1 ? "active" : ""}>1. Identité</span>
              <span className={signupStep >= 2 ? "active" : ""}>2. Type de compte</span>
              <span className={signupStep >= 3 ? "active" : ""}>3. Détails métier</span>
            </div>

            {signupStep === 1 ? (
              <>
                <div className="auth-grid">
                  <label>
                    Prénom
                    <input
                      value={signupForm.firstName}
                      onChange={(event) => updateSignupField("firstName", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      value={signupForm.lastName}
                      onChange={(event) => updateSignupField("lastName", event.target.value)}
                      required
                    />
                  </label>
                </div>

                <label>
                  Email
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(event) => updateSignupField("email", event.target.value)}
                    required
                  />
                </label>

                <div className="auth-grid">
                  <label>
                    Mot de passe
                    <input
                      type="password"
                      value={signupForm.password}
                      onChange={(event) => updateSignupField("password", event.target.value)}
                      minLength={8}
                      required
                    />
                  </label>
                  <label>
                    Confirmation
                    <input
                      type="password"
                      value={signupForm.passwordConfirm}
                      onChange={(event) => updateSignupField("passwordConfirm", event.target.value)}
                      minLength={8}
                      required
                    />
                  </label>
                </div>
              </>
            ) : null}

            {signupStep === 2 ? (
              <>
                <label>
                  Type de compte
                  <select
                    value={signupForm.accountType}
                    onChange={(event) => updateSignupField("accountType", event.target.value)}
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="auth-helper">
                  {ACCOUNT_TYPE_OPTIONS.find((item) => item.value === signupForm.accountType)?.description}
                </p>

                <div className="auth-grid">
                  <label>
                    Téléphone
                    <input
                      value={signupForm.phone}
                      onChange={(event) => updateSignupField("phone", event.target.value)}
                      placeholder="+33 6 00 00 00 00"
                    />
                  </label>
                  <label>
                    Ville
                    <input value={signupForm.city} onChange={(event) => updateSignupField("city", event.target.value)} />
                  </label>
                </div>

                <label>
                  Pays
                  <input value={signupForm.country} onChange={(event) => updateSignupField("country", event.target.value)} />
                </label>
              </>
            ) : null}

            {signupStep === 3 ? (
              <RoleSpecificFields form={signupForm} updateField={updateSignupField} />
            ) : null}
          </>
        )}

        {error ? <div className="auth-error">{error}</div> : null}
        <div className="auth-helper">{helper}</div>

        <div className="auth-actions">
          {mode === "signup" && signupStep > 1 ? (
            <button className="btn-secondary" type="button" onClick={() => setSignupStep((prev) => Math.max(1, prev - 1))}>
              Retour
            </button>
          ) : null}

          <button className="btn-main" type="submit">
            {mode === "login" ? "Connexion" : signupStep < 3 ? "Continuer" : "Créer mon compte"}
          </button>
        </div>
      </form>
    </div>
  );
}

function HomePage({ onStart, onNavigate, user, premium, profileCompleteness, latestMatch, cvCount, favoriteCount }) {
  const userLabel = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Utilisateur";
  const roleLabel = getAccountLabel(user?.roleType);
  const profileLabel =
    profileCompleteness >= 100 ? "Profil complété" : `Profil complété à ${profileCompleteness}%`;
  const scoreLabel = latestMatch?.summary?.globalScore
    ? `Dernier matching : ${latestMatch.summary.globalScore}/100`
    : "Aucun matching lancé pour le moment";
  const objectiveLabel = user?.profile?.targetRole
    ? `Objectif: ${user.profile.targetRole}`
    : "Ajoute ton rôle cible dans Profil";
  const premiumLabel = premium?.hasAccess
    ? `Premium actif jusqu'au ${formatDate(premium.expiresAt)}`
    : "Plan Free : passe en premium pour débloquer toutes les offres";
  const cvLabel = cvCount > 0 ? `${cvCount} CV importé(s)` : "Aucun CV importé";
  const tickerItems = [
    `Bienvenue ${userLabel}`,
    `Type de compte: ${roleLabel}`,
    profileLabel,
    cvLabel,
    scoreLabel,
    premiumLabel,
    objectiveLabel
  ];

  return (
    <section className="home-page">
      <div className="hero-eyebrow">Assistant carrière nouvelle génération</div>
      <h2>
        Décroche le poste qui te correspond,
        <br />
        avec un parcours <em>guidé par la data</em>
      </h2>
      <p>
        L'expérience est fluide : onboarding métier, import du CV, analyse du match, optimisation et entraînement.
      </p>

      <div className="dashboard-cards">
        <button className="dash-card" onClick={() => onNavigate("analyse")} disabled={!latestMatch}>
          <span className="dash-card-label">Dernier score</span>
          <strong className="dash-card-value">
            {latestMatch ? `${latestMatch.summary.globalScore}/100` : "—"}
          </strong>
          <span className="dash-card-sub">
            {latestMatch ? latestMatch.summary.title : "Lance une analyse"}
          </span>
        </button>

        <button className="dash-card" onClick={() => onNavigate("offres")}>
          <span className="dash-card-label">Offres suivies</span>
          <strong className="dash-card-value">{favoriteCount || 0}</strong>
          <span className="dash-card-sub">favoris enregistrés</span>
        </button>

        <button className="dash-card" onClick={() => onNavigate("import")}>
          <span className="dash-card-label">CV importés</span>
          <strong className="dash-card-value">{cvCount}</strong>
          <span className="dash-card-sub">{cvCount > 0 ? "Importer une nouvelle version" : "Commencer l'import"}</span>
        </button>

        <button
          className={`dash-card ${premium?.hasAccess ? "dash-card-premium" : ""}`}
          onClick={() => onNavigate("profil")}
        >
          <span className="dash-card-label">Statut</span>
          <strong className="dash-card-value">{premium?.hasAccess ? "Premium" : "Free"}</strong>
          <span className="dash-card-sub">
            {premium?.hasAccess ? "Accès complet débloqué" : "Complète ton profil pour débloquer"}
          </span>
        </button>
      </div>

      <div className="workflow-strip">
        {HOME_WORKFLOW_STEPS.map((item) => (
          <article key={item.number}>
            <strong>{item.number}</strong>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <button className="home-primary-cta" onClick={onStart}>
        Commencer <span>&rarr;</span>
      </button>

      <div className="home-ticker" aria-label="Informations personnalisées">
        <div className="home-ticker-track">
          {[0, 1].map((copyIndex) => (
            <div className="home-ticker-row" key={copyIndex} aria-hidden={copyIndex === 1}>
              {tickerItems.map((item) => (
                <span className="home-ticker-item" key={`${copyIndex}-${item}`}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function CvExtractionPreview({ latestCv, onCorrectExtraction }) {
  const parsed = latestCv?.parsed;
  const [skillsText, setSkillsText] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [education, setEducation] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!parsed) return;
    setSkillsText((parsed.skills || []).join(", "));
    setExperienceYears(parsed.experienceYears || 0);
    setEducation(parsed.education || "");
    setSaved(false);
  }, [latestCv?.fileName, parsed]);

  if (!parsed) return null;

  const confidence = parsed.signals?.extractionConfidence || "moyenne";

  async function handleSave() {
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await onCorrectExtraction?.({ skills, experienceYears: Number(experienceYears) || 0, education });
    setSaved(true);
  }

  return (
    <div className="card block cv-preview">
      <div className="cv-preview-head">
        <h3>Aperçu de l'extraction</h3>
        <span className={`tag confidence-${confidence === "haute" ? "great" : confidence === "basse" ? "low" : "medium"}`}>
          Confiance : {confidence}
        </span>
      </div>
      <p className="muted small">
        Ces informations ont été détectées automatiquement dans ton CV. Corrige-les si besoin avant de lancer une analyse.
      </p>

      <label className="cv-preview-field">
        <span>Compétences détectées (séparées par des virgules)</span>
        <textarea value={skillsText} onChange={(event) => setSkillsText(event.target.value)} rows={2} />
      </label>

      <div className="cv-preview-row">
        <label className="cv-preview-field">
          <span>Années d'expérience</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={experienceYears}
            onChange={(event) => setExperienceYears(event.target.value)}
          />
        </label>
        <label className="cv-preview-field">
          <span>Niveau d'études</span>
          <select value={education} onChange={(event) => setEducation(event.target.value)}>
            <option value="">Non détecté</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
      </div>

      <button type="button" className="btn-secondary" onClick={handleSave}>
        {saved ? "✓ Corrections enregistrées" : "Enregistrer les corrections"}
      </button>
    </div>
  );
}

function ImportPage({
  latestCv,
  cvHistory,
  cvDraft,
  setCvDraft,
  offerText,
  setOfferText,
  onFileUpload,
  onDraftImport,
  onAnalyse,
  canAnalyse,
  isAnalysing,
  analyseProgress,
  onCorrectExtraction
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFileUpload(file);
  }

  return (
    <section className="section-grid">
      <div className="card block">
        <h2>Importer ton CV</h2>
        <p className="muted">Import de fichier ou collage manuel pour alimenter automatiquement le profil.</p>

        <label
          className={`upload-zone ${latestCv ? "done" : ""} ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={(event) => onFileUpload(event.target.files?.[0])}
          />
          <strong>{latestCv ? latestCv.fileName : isDragging ? "Dépose ton CV ici" : "Choisir un fichier CV"}</strong>
          <span>{latestCv ? "CV détecté et analysé" : "Formats acceptés: txt, pdf, doc, docx — ou glisse-dépose le fichier ici"}</span>
        </label>

        <div className="divider-small">ou</div>

        <textarea
          value={cvDraft}
          onChange={(event) => setCvDraft(event.target.value)}
          placeholder="Colle ici le contenu texte du CV..."
          rows={8}
        />
        <button className="btn-secondary" onClick={onDraftImport}>
          Importer le texte CV
        </button>

        <CvExtractionPreview latestCv={latestCv} onCorrectExtraction={onCorrectExtraction} />

        <div className="cv-history">
          <h3>Historique CV</h3>
          {cvHistory.length ? (
            <ul>
              {cvHistory.slice(-5).reverse().map((cv) => (
                <li key={cv.id}>
                  <span>{cv.fileName}</span>
                  <small>{formatDate(cv.createdAt)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aucun CV enregistré.</p>
          )}
        </div>
      </div>

      <div className="card block">
        <h2>Coller l'offre cible</h2>
        <p className="muted">Le matching se base sur cette offre et compare aussi des offres marketplace.</p>
        <textarea
          value={offerText}
          onChange={(event) => setOfferText(event.target.value)}
          placeholder="Colle l'offre d'emploi complète ici..."
          rows={12}
        />
        <div className="counter-row">
          <span>{offerText.trim().length} caractères</span>
          <span>{offerText.trim().length > 50 ? "Prêt" : "Minimum 50 caractères"}</span>
        </div>

        <button className={`btn-main ${canAnalyse ? "ready" : ""}`} disabled={!canAnalyse} onClick={onAnalyse}>
          {isAnalysing ? "Analyse en cours..." : "Analyser mon profil"}
        </button>

        {isAnalysing ? (
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${analyseProgress}%` }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProfilePage({
  user,
  premium,
  profileCompleteness,
  onSaveProfile,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onActivatePremium,
  onDeleteAccount
}) {
  const [profileForm, setProfileForm] = useState(() => profileToForm(user.profile));
  const [accountForm, setAccountForm] = useState(() => accountToForm(user));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setProfileForm(profileToForm(user.profile));
    setAccountForm(accountToForm(user));
  }, [user]);

  function updateProfileField(key, value) {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAccountField(key, value) {
    setAccountForm((prev) => ({ ...prev, [key]: value }));
  }

  function submitProfile(event) {
    event.preventDefault();
    onSaveProfile({
      ...profileForm,
      experienceYears: Number(profileForm.experienceYears || 0),
      skills: profileForm.skills,
      languages: profileForm.languages
    });
  }

  function submitAccount(event) {
    event.preventDefault();
    onSaveAccount(buildAccountPatch(accountForm));
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-avatar">
          <AvatarCircle user={user} large />
          <label className="avatar-upload-btn">
            <input type="file" accept="image/*" onChange={(event) => onAvatarUpload(event.target.files?.[0])} />
            {avatarUploading ? "Upload..." : "Changer photo"}
          </label>
        </div>
        <div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>{profileForm.headline || "Ajoute un titre professionnel cible."}</p>
          <div className="tag-row">
            <span className="tag">{user.email}</span>
            <span className="tag">{getAccountLabel(user.roleType)}</span>
            <span className="tag">Complétude du profil : {profileCompleteness}%</span>
            <span className="tag">Plan: {user.subscription?.plan || "free"}</span>
          </div>
        </div>
      </div>

      <div className="section-grid profile-grid-extended">
        <form className="card block" onSubmit={submitProfile}>
          <h3>Profil professionnel</h3>
          <label>
            Titre / headline
            <input
              value={profileForm.headline}
              onChange={(event) => updateProfileField("headline", event.target.value)}
              placeholder="Data Scientist - GenAI"
            />
          </label>
          <div className="two-cols">
            <label>
              Rôle cible
              <input
                value={profileForm.targetRole}
                onChange={(event) => updateProfileField("targetRole", event.target.value)}
                placeholder="Data Scientist GenAI"
              />
            </label>
            <label>
              Secteur visé
              <input
                value={profileForm.sector}
                onChange={(event) => updateProfileField("sector", event.target.value)}
                placeholder="Conseil, Santé, Finance..."
              />
            </label>
          </div>

          <div className="two-cols">
            <label>
              Localisation
              <input
                value={profileForm.location}
                onChange={(event) => updateProfileField("location", event.target.value)}
                placeholder="Paris"
              />
            </label>
            <label>
              Expérience (ans)
              <input
                type="number"
                min="0"
                value={profileForm.experienceYears}
                onChange={(event) => updateProfileField("experienceYears", event.target.value)}
              />
            </label>
          </div>

          <label>
            Niveau d'études
            <input
              value={profileForm.education}
              onChange={(event) => updateProfileField("education", event.target.value)}
              placeholder="Bac+5 / Master / Ingénieur"
            />
          </label>

          <label>
            Compétences (séparées par des virgules)
            <textarea
              rows={4}
              value={profileForm.skills}
              onChange={(event) => updateProfileField("skills", event.target.value)}
              placeholder="python, sql, llm, rag, azure"
            />
          </label>

          <label>
            Langues (séparées par des virgules)
            <input
              value={profileForm.languages}
              onChange={(event) => updateProfileField("languages", event.target.value)}
              placeholder="français, anglais"
            />
          </label>

          <button className="btn-main" type="submit">
            Sauvegarder le profil
          </button>
        </form>

        <form className="card block" onSubmit={submitAccount}>
          <h3>Paramètres compte (SaaS)</h3>
          <div className="two-cols">
            <label>
              Type de compte
              <select value={accountForm.accountType} onChange={(event) => updateAccountField("accountType", event.target.value)}>
                {ACCOUNT_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Téléphone
              <input value={accountForm.phone} onChange={(event) => updateAccountField("phone", event.target.value)} />
            </label>
          </div>

          <div className="two-cols">
            <label>
              Ville
              <input value={accountForm.city} onChange={(event) => updateAccountField("city", event.target.value)} />
            </label>
            <label>
              Pays
              <input value={accountForm.country} onChange={(event) => updateAccountField("country", event.target.value)} />
            </label>
          </div>

          <RoleSpecificFields form={accountForm} updateField={updateAccountField} />

          <button className="btn-main" type="submit">
            Sauvegarder le compte
          </button>
        </form>

        <div className="card block premium-card">
          <h3>Offre premium dynamique</h3>
          <p className="muted">
            L'activation premium se base sur le score de profil, l'historique de matching et la complétude d'onboarding.
          </p>

          <div className="premium-score">
            <div className="ring" style={{ "--pct": `${premium?.eligibility?.score || 0}%` }}>
              <strong>{premium?.eligibility?.score || 0}</strong>
              <span>/100</span>
            </div>
            <div>
              <h4>
                Niveau: {premium?.eligibility?.tier || "Starter"} · {premium?.hasAccess ? "Accès ouvert" : "Accès restreint"}
              </h4>
              <ul className="flat-list">
                {(premium?.eligibility?.reasons || []).map((reason, idx) => (
                  <li key={`${reason}-${idx}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="premium-meta">
            <span>Source d'accès: {premium?.source || "locked"}</span>
            <span>Renouvellement: {formatDate(user.subscription?.renewalAt)}</span>
          </div>

          <button className="btn-secondary" onClick={onActivatePremium}>
            Activer l'offre premium
          </button>
        </div>
      </div>

      <div className="card block danger-zone">
        <h3>Zone de danger</h3>
        <p className="muted small">
          La suppression de ton compte est immédiate et irréversible : profil, CV importés, historique de matching,
          sessions d'entretien et statut premium sont définitivement effacés (droit à l'effacement, Article 17 RGPD).
        </p>

        {!deleteOpen ? (
          <button type="button" className="btn-danger" onClick={() => setDeleteOpen(true)}>
            Supprimer mon compte
          </button>
        ) : (
          <div className="delete-confirm">
            <label>
              <span>Confirme avec ton mot de passe pour supprimer définitivement le compte :</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Mot de passe"
              />
            </label>
            {deleteError ? <p className="ai-analysis-error">{deleteError}</p> : null}
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteError(""); }}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={!deletePassword || deleting}
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError("");
                  try {
                    await onDeleteAccount(deletePassword);
                  } catch (error) {
                    setDeleteError(error.message || "Échec de la suppression.");
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Suppression..." : "Confirmer la suppression définitive"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RoleSpecificFields({ form, updateField }) {
  if (form.accountType === "candidate" || form.accountType === "student") {
    return (
      <div className="role-fields">
        <label>
          Titre actuel
          <input value={form.currentTitle} onChange={(event) => updateField("currentTitle", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            Rôle recherché
            <input value={form.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
          </label>
          <label>
            Expérience (ans)
            <input
              type="number"
              min="0"
              value={form.experienceYears}
              onChange={(event) => updateField("experienceYears", event.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            École / Université
            <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
          </label>
          <label>
            Niveau d'études
            <input value={form.studyLevel} onChange={(event) => updateField("studyLevel", event.target.value)} />
          </label>
        </div>
        <div className="two-cols">
          <label>
            Année de diplomation
            <input value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} />
          </label>
          <label>
            Contrat recherché
            <input
              placeholder="CDI, alternance, stage..."
              value={form.contractPreference}
              onChange={(event) => updateField("contractPreference", event.target.value)}
            />
          </label>
        </div>
        <label>
          Disponibilité
          <input
            placeholder="Immédiate, 1 mois..."
            value={form.availability}
            onChange={(event) => updateField("availability", event.target.value)}
          />
        </label>
        <div className="two-cols">
          <label>
            Portfolio
            <input value={form.portfolioUrl} onChange={(event) => updateField("portfolioUrl", event.target.value)} />
          </label>
          <label>
            LinkedIn
            <input value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} />
          </label>
        </div>
      </div>
    );
  }

  if (form.accountType === "recruiter_firm" || form.accountType === "recruiter_internal") {
    return (
      <div className="role-fields">
        <label>
          Nom de la structure
          <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            Fonction recrutement
            <input value={form.recruiterRole} onChange={(event) => updateField("recruiterRole", event.target.value)} />
          </label>
          <label>
            Volume de recrutements
            <input
              placeholder="ex: 20 postes / trimestre"
              value={form.hiringVolume}
              onChange={(event) => updateField("hiringVolume", event.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            Secteur
            <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
          </label>
          <label>
            Site web
            <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="role-fields">
      <label>
        Nom de l'organisation
        <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
      </label>
      <div className="two-cols">
        <label>
          Type d'organisation
          <input value={form.organizationType} onChange={(event) => updateField("organizationType", event.target.value)} />
        </label>
        <label>
          Département
          <input value={form.department} onChange={(event) => updateField("department", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          Taille
          <input value={form.sizeRange} onChange={(event) => updateField("sizeRange", event.target.value)} />
        </label>
        <label>
          Secteur
          <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          Rôle contact
          <input value={form.contactRole} onChange={(event) => updateField("contactRole", event.target.value)} />
        </label>
        <label>
          Site web
          <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>
      </div>
      <label>
        Notes complémentaires
        <textarea rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </label>
    </div>
  );
}

function scoreTier(value) {
  if (value >= 75) return "great";
  if (value >= 60) return "good";
  if (value >= 45) return "medium";
  return "low";
}

function confidenceBadge(level) {
  if (level === "basse") {
    return { label: "⚠️ Confiance d'extraction basse", tone: "low" };
  }
  if (level === "moyenne") {
    return { label: "Confiance d'extraction moyenne", tone: "medium" };
  }
  return { label: "✓ Confiance d'extraction haute", tone: "great" };
}

function AnalysisPage({ matchData }) {
  if (!matchData) {
    return <Placeholder title="Analyse indisponible" text="Importe un CV et lance le matching depuis l'onglet Importer." />;
  }

  const { summary, domainScores, strengths, gaps, bestMatch } = matchData;
  const tier = scoreTier(summary.globalScore);
  const badge = confidenceBadge(summary.extractionConfidence);

  return (
    <section className="analysis-page">
      <div className={`score-hero card tier-${tier}`}>
        <div className={`score-ring tier-${tier}`} style={{ "--pct": `${summary.globalScore}%` }}>
          <strong>{summary.globalScore}</strong>
          <span>/100</span>
        </div>
        <div>
          <h2>
            {ratingLabel(summary.globalScore)} · {summary.title}
          </h2>
          <p>{summary.subtitle}</p>
          <div className="tag-row">
            <span className={`tag tier-${scoreTier(bestMatch.skillCoverage)}`}>
              Couverture compétences: {bestMatch.skillCoverage}%
            </span>
            <span className={`tag tier-${scoreTier(bestMatch.experienceFit)}`}>
              Adéquation expérience: {bestMatch.experienceFit}%
            </span>
            <span className={`tag tier-${tier}`}>Verdict: {summary.verdict}</span>
            <span className={`tag confidence-${badge.tone}`}>{badge.label}</span>
          </div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card block">
          <h3>Compatibilité par domaine</h3>
          {domainScores.map((item) => (
            <div className="bar-item" key={item.domain}>
              <div className="bar-meta">
                <span>{item.domain}</span>
                <span>{item.value}%</span>
              </div>
              <div className="bar-track">
                <div className={`bar-fill tier-${scoreTier(item.value)}`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card block">
          <h3>Lecture rapide</h3>
          <div className="point-group">
            <h4 className="point-title-good">✓ Points forts</h4>
            <ul className="point-list-good">
              {strengths.map((point, idx) => (
                <li key={`${point}-${idx}`}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="point-group">
            <h4 className="point-title-warn">⚠ Points à combler</h4>
            <ul className="point-list-warn">
              {gaps.map((gap, idx) => (
                <li key={`${gap}-${idx}`}>{gap}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OffersPage({ matchData, premium, offerStatuses = {}, onToggleStatus }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState("score"); // score | company | favorites

  const sectorOptions = useMemo(() => {
    if (!matchData) return [];
    return unique(matchData.rankedOffers.map((item) => item.offer.sector)).sort();
  }, [matchData]);

  const locationOptions = useMemo(() => {
    if (!matchData) return [];
    return unique(matchData.rankedOffers.map((item) => item.offer.location)).sort();
  }, [matchData]);

  if (!matchData) {
    return <Placeholder title="Offres indisponibles" text="Lance une analyse pour débloquer la comparaison des offres." />;
  }

  const filteredOffers = filterScoredOffers(matchData.rankedOffers, { query, sector, location });

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    if (sortBy === "company") return a.offer.company.localeCompare(b.offer.company);
    if (sortBy === "favorites") {
      const aFav = offerStatuses[a.offer.id]?.isFavorite ? 1 : 0;
      const bFav = offerStatuses[b.offer.id]?.isFavorite ? 1 : 0;
      return bFav - aFav || b.score - a.score;
    }
    return b.score - a.score; // "score" par défaut
  });

  return (
    <section className="offers-page">
      <div className="card block offers-head">
        <h2>Matching CV × Offres</h2>
        <p>
          Score moyen du portefeuille : <strong>{matchData.portfolioScore}</strong> / 100
        </p>
        <p className="muted">
          Accès premium : {premium?.hasAccess ? "ouvert" : "fermé"} ({premium?.source || "locked"})
        </p>
      </div>

      <div className="card block offers-filters">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un poste, une entreprise, une compétence..."
        />
        <select value={sector} onChange={(event) => setSector(event.target.value)}>
          <option value="">Tous secteurs</option>
          {sectorOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select value={location} onChange={(event) => setLocation(event.target.value)}>
          <option value="">Toutes localisations</option>
          {locationOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="offers-sort">
          <option value="score">Trier par score</option>
          <option value="company">Trier par entreprise (A-Z)</option>
          <option value="favorites">Favoris d'abord</option>
        </select>
        {(query || sector || location) ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setQuery(""); setSector(""); setLocation(""); }}
          >
            Réinitialiser
          </button>
        ) : null}
        <span className="muted offers-filter-count">
          {filteredOffers.length} / {matchData.rankedOffers.length} offres
        </span>
      </div>

      <div className="offers-grid">
        {sortedOffers.length === 0 ? (
          <p className="muted">Aucune offre ne correspond à ces filtres.</p>
        ) : null}
        {sortedOffers.map((item) => {
          const status = offerStatuses[item.offer.id] || { isFavorite: false, isApplied: false };
          return (
          <article key={item.offer.id} className={`offer-card ${item.locked ? "locked" : ""}`}>
            <div className="offer-top">
              <div>
                <h3>{item.offer.title}</h3>
                <p>
                  {item.offer.company} · {item.offer.location} · {item.offer.contract}
                </p>
              </div>
              <div className="score-pill">{item.score}</div>
            </div>

            <div className="tag-row">
              <span className="tag">{ratingLabel(item.score)}</span>
              <span className="tag">compétences {item.skillCoverage}%</span>
              {item.offer.premium ? <span className="tag premium">Premium</span> : null}
              {item.locked ? <span className="tag crit">Verrouillé</span> : null}
              {status.isApplied ? <span className="tag applied">✓ Déjà postulé</span> : null}
            </div>

            <div className="offer-body">
              <div>
                <h4>Compétences détectées</h4>
                <p>{item.matchedSkills.length ? item.matchedSkills.join(", ") : "Aucune détection."}</p>
              </div>
              <div>
                <h4>Gaps principaux</h4>
                <p>{item.missingSkills.length ? item.missingSkills.slice(0, 5).join(", ") : "Aucun écart majeur"}</p>
              </div>
            </div>

            <div className="offer-actions">
              <button
                type="button"
                className={`offer-action-btn ${status.isFavorite ? "active-fav" : ""}`}
                onClick={() => onToggleStatus?.(item.offer.id, { isFavorite: !status.isFavorite })}
              >
                {status.isFavorite ? "★ Favori" : "☆ Ajouter aux favoris"}
              </button>
              <button
                type="button"
                className={`offer-action-btn ${status.isApplied ? "active-applied" : ""}`}
                onClick={() => onToggleStatus?.(item.offer.id, { isApplied: !status.isApplied })}
              >
                {status.isApplied ? "✓ Postulé" : "Marquer comme postulé"}
              </button>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function CvAdvicePage({ matchData, latestCv, userId, premium }) {
  const [exporting, setExporting] = useState(false);
  const [rewriteStatus, setRewriteStatus] = useState("idle"); // idle | loading | done | error
  const [rewrittenText, setRewrittenText] = useState("");
  const [rewriteError, setRewriteError] = useState("");

  if (!matchData) {
    return <Placeholder title="Recommandations indisponibles" text="Lance une analyse pour générer les recommandations CV." />;
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await downloadOptimizedCvPdf({
        cvRecord: latestCv,
        recommendations: matchData.recommendations,
        bestMatch: matchData.bestMatch
      });
    } catch (error) {
      window.alert(`Échec de l'export PDF : ${error.message || error}`);
    } finally {
      setExporting(false);
    }
  }

  function handleExportTxt() {
    const content = buildOptimizedCvText({
      cvRecord: latestCv,
      recommendations: matchData.recommendations,
      bestMatch: matchData.bestMatch
    });
    const safeName = (latestCv?.fileName || "cv").replace(/\.[^.]+$/, "");
    downloadTextFile(`${safeName}-optimise.txt`, content);
  }

  async function handleAiRewrite() {
    setRewriteStatus("loading");
    setRewriteError("");
    try {
      const result = await requestCvRewrite({
        userId,
        cvText: latestCv?.sourceText || "",
        offerTitle: matchData.bestMatch?.offer?.title,
        offerCompany: matchData.bestMatch?.offer?.company,
        offerSkills: matchData.bestMatch?.offer?.skills,
        missingSkills: matchData.bestMatch?.missingSkills
      });
      setRewrittenText(result.rewritten);
      setRewriteStatus("done");
    } catch (error) {
      setRewriteError(error.message || "Échec de la réécriture IA.");
      setRewriteStatus("error");
    }
  }

  function handleExportRewrittenTxt() {
    const safeName = (latestCv?.fileName || "cv").replace(/\.[^.]+$/, "");
    downloadTextFile(`${safeName}-reecrit-ia.txt`, rewrittenText);
  }

  return (
    <section className="cv-page">
      <div className="card block">
        <h2>Plan d'amélioration du CV</h2>
        <p className="muted">Recommandations automatiques basées sur les écarts détectés pendant le matching.</p>
        <div className="cv-export-row">
          <button type="button" className="btn-main" onClick={handleExportPdf} disabled={!latestCv || exporting}>
            {exporting ? "Génération..." : "📄 Exporter le CV optimisé (PDF)"}
          </button>
          <button type="button" className="btn-secondary" onClick={handleExportTxt} disabled={!latestCv}>
            Version texte (.txt)
          </button>
        </div>
        <p className="muted small">
          Le PDF reprend ton CV d'origine mis en page, précédé des recommandations à appliquer avant envoi.
          Génération 100% locale (jsPDF), aucun coût ni appel serveur.
        </p>
      </div>

      <div className="card block cv-rewrite-block">
        <h3>✨ Réécriture du CV par IA</h3>
        {!premium?.hasAccess ? (
          <p className="muted">
            🔒 Fonctionnalité premium. Complète ton profil pour débloquer la réécriture automatique de ton CV par IA,
            adaptée à l'offre analysée.
          </p>
        ) : (
          <>
            <p className="muted small">
              L'IA reformule ton CV (verbes d'action, mise en avant des points forts) sans inventer d'expérience,
              en le ciblant sur l'offre analysée. Coût d'un appel API réel à chaque génération.
            </p>
            <button
              type="button"
              className="btn-main"
              onClick={handleAiRewrite}
              disabled={!latestCv || rewriteStatus === "loading"}
            >
              {rewriteStatus === "loading" ? "Réécriture en cours..." : "✨ Réécrire mon CV avec l'IA"}
            </button>
            {rewriteStatus === "error" ? <p className="ai-analysis-error">{rewriteError}</p> : null}

            {rewriteStatus === "done" ? (
              <div className="cv-rewrite-compare">
                <div className="cv-rewrite-col">
                  <h4>Avant (original)</h4>
                  <pre className="cv-rewrite-text">{latestCv?.sourceText}</pre>
                </div>
                <div className="cv-rewrite-col">
                  <h4>Après (réécrit par IA)</h4>
                  <pre className="cv-rewrite-text highlighted">{rewrittenText}</pre>
                  <button type="button" className="btn-secondary" onClick={handleExportRewrittenTxt}>
                    Exporter cette version (.txt)
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {matchData.recommendations.map((item, index) => (
        <article key={`${item.title}-${index}`} className={`advice-card ${levelTag(item.level)}`}>
          <div className="advice-head">
            <h3>{item.title}</h3>
            <span className="tag">{item.level}</span>
          </div>
          <p>{item.detail}</p>
        </article>
      ))}
    </section>
  );
}

function InterviewPage({ userId, offer, premium }) {
  const [mode, setMode] = useState("text"); // "text" | "live"
  const [track, setTrack] = useState("rh");
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [modelOpenIdx, setModelOpenIdx] = useState(null);
  const [doneTracks, setDoneTracks] = useState({});
  const [answerEvaluations, setAnswerEvaluations] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState({}); // { [messageIdx]: { status, data, error } }

  const config = INTERVIEW_SCRIPTS[track];
  const currentQuestion = config.steps[step];
  const progress = Math.round((step / config.steps.length) * 100);

  useEffect(() => {
    resetTrack(track);
  }, [track]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listInterviewAttempts(userId)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function resetTrack(trackKey) {
    const first = INTERVIEW_SCRIPTS[trackKey].steps[0];
    setMessages([{ type: "ai", text: first.question }]);
    setStep(0);
    setInput("");
    setHintOpen(false);
    setModelOpenIdx(null);
    setAnswerEvaluations([]);
    setTranscript([]);
    setAiAnalysis({});
  }

  async function handleAiAnalysis(messageIdx, message) {
    setAiAnalysis((prev) => ({ ...prev, [messageIdx]: { status: "loading" } }));
    try {
      const result = await requestAiEvaluation({
        userId,
        question: message.question,
        answer: message.answer,
        personaName: config.meta.name,
        personaSubtitle: config.meta.subtitle
      });
      setAiAnalysis((prev) => ({ ...prev, [messageIdx]: { status: "done", data: result } }));
    } catch (error) {
      setAiAnalysis((prev) => ({
        ...prev,
        [messageIdx]: { status: "error", error: error.message || "Analyse IA indisponible." }
      }));
    }
  }

  async function submitReply() {
    const text = input.trim();
    if (!text || step >= config.steps.length) return;

    const reply = config.steps[step];
    const evaluation = evaluateAnswer({ answer: text, step: reply });

    const nextMessages = [
      ...messages,
      { type: "user", text },
      {
        type: "evaluation",
        text: `Score : ${evaluation.score}/100`,
        details: evaluation.feedback,
        modelAnswer: reply.model,
        question: reply.question,
        answer: text
      }
    ];

    const nextEvaluations = [...answerEvaluations, evaluation];
    const nextTranscript = [
      ...transcript,
      { question: reply.question, answer: text, score: evaluation.score, feedback: evaluation.feedback }
    ];
    const nextStep = step + 1;
    const isLastStep = nextStep >= config.steps.length;

    if (!isLastStep) {
      nextMessages.push({ type: "ai", text: config.steps[nextStep].question });
    } else {
      setDoneTracks((prev) => ({ ...prev, [track]: true }));
      const sessionSummary = summarizeSession(nextEvaluations);
      if (userId) {
        try {
          const saved = await saveInterviewAttempt(userId, track, {
            averageScore: sessionSummary.averageScore,
            label: sessionSummary.label,
            answerCount: nextEvaluations.length,
            personaName: config.meta.name,
            transcript: nextTranscript
          });
          setHistory((prev) => [saved, ...prev]);
        } catch (_error) {
          // La progression reste visible dans la session même si la sauvegarde échoue.
        }
      }
    }

    setMessages(nextMessages);
    setAnswerEvaluations(nextEvaluations);
    setTranscript(nextTranscript);
    setStep(nextStep);
    setInput("");
    setHintOpen(false);
  }

  const sessionSummary = summarizeSession(answerEvaluations);
  const trackHistory = history.filter((item) => item.track === track).slice(0, 5);

  return (
    <section className="interview-page">
      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-btn ${mode === "text" ? "active" : ""}`}
          onClick={() => setMode("text")}
        >
          💬 Mode texte
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "live" ? "active" : ""}`}
          onClick={() => setMode("live")}
        >
          🎙️ Mode live (avatar IA)
        </button>
        <button
          type="button"
          className={`mode-btn ${mode === "history" ? "active" : ""}`}
          onClick={() => setMode("history")}
        >
          📊 Historique
        </button>
      </div>

      {mode === "history" ? (
        <InterviewHistoryPanel history={history} historyLoaded={historyLoaded} />
      ) : mode === "live" ? (
        <LiveInterviewPanel userId={userId} track={track} setTrack={setTrack} offer={offer} premium={premium} />
      ) : (
        <>
      <div className="tabs">
        {Object.entries(INTERVIEW_SCRIPTS).map(([key, value]) => (
          <button
            key={key}
            className={`tab-btn ${track === key ? "active" : ""} ${doneTracks[key] ? "done" : ""}`}
            onClick={() => setTrack(key)}
          >
            <small>{value.label}</small>
            <strong>{value.meta.name}</strong>
          </button>
        ))}
      </div>

      {historyLoaded && trackHistory.length > 0 ? (
        <div className="card block interview-progress">
          <h4>Ta progression sur ce persona</h4>
          <div className="progress-history-row">
            {trackHistory.slice().reverse().map((attempt) => (
              <span key={attempt.id} className="progress-pill" title={formatDate(attempt.createdAt)}>
                {attempt.averageScore}/100
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="chat card">
        <div className="chat-top">
          <div className="avatar">{config.meta.avatar}</div>
          <div>
            <h3>{config.meta.name}</h3>
            <p>{config.meta.subtitle}</p>
          </div>
          <div className="progress">{progress}%</div>
        </div>

        <div className="chat-stream">
          {messages.map((msg, idx) => (
            <div key={`${msg.type}-${idx}`} className={`msg ${msg.type}`}>
              <p>{msg.text}</p>
              {msg.type === "evaluation" ? (
                <>
                  <ul className="eval-feedback">
                    {msg.details.map((point, pointIdx) => (
                      <li key={pointIdx}>{point}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="hint"
                    onClick={() => setModelOpenIdx(modelOpenIdx === idx ? null : idx)}
                  >
                    {modelOpenIdx === idx ? "Masquer un exemple de réponse" : "Voir un exemple de réponse"}
                  </button>
                  {modelOpenIdx === idx ? <p className="hint-body">{msg.modelAnswer}</p> : null}

                  {!aiAnalysis[idx] || aiAnalysis[idx].status === "error" ? (
                    <button
                      type="button"
                      className="hint ai-analysis-btn"
                      onClick={() => handleAiAnalysis(idx, msg)}
                    >
                      🔍 Analyse approfondie IA
                    </button>
                  ) : null}
                  {aiAnalysis[idx]?.status === "error" ? (
                    <p className="ai-analysis-error">{aiAnalysis[idx].error}</p>
                  ) : null}
                  {aiAnalysis[idx]?.status === "loading" ? (
                    <p className="ai-analysis-loading">Analyse IA en cours...</p>
                  ) : null}
                  {aiAnalysis[idx]?.status === "done" ? (
                    <div className="ai-analysis-result">
                      <div className="ai-analysis-score">Score IA : {aiAnalysis[idx].data.score}/100</div>
                      {aiAnalysis[idx].data.strengths.length ? (
                        <>
                          <h5>Points forts</h5>
                          <ul>
                            {aiAnalysis[idx].data.strengths.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {aiAnalysis[idx].data.improvements.length ? (
                        <>
                          <h5>À améliorer</h5>
                          <ul>
                            {aiAnalysis[idx].data.improvements.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                      {aiAnalysis[idx].data.suggestedAnswer ? (
                        <>
                          <h5>Suggestion de réponse</h5>
                          <p>{aiAnalysis[idx].data.suggestedAnswer}</p>
                        </>
                      ) : null}
                      {aiAnalysis[idx].data.quota && !aiAnalysis[idx].data.quota.unlimited ? (
                        <p className="ai-quota-note">
                          {aiAnalysis[idx].data.quota.remaining} analyse(s) IA gratuite(s) restante(s) ce mois-ci.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ))}
        </div>

        {step < config.steps.length ? (
          <>
            <button className="hint" onClick={() => setHintOpen((prev) => !prev)}>
              Astuce d'entretien
            </button>
            {hintOpen ? <p className="hint-body">{currentQuestion?.hint}</p> : null}

            <div className="chat-input-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ta réponse..."
                rows={2}
              />
              <button className="btn-main" onClick={submitReply}>
                Envoyer
              </button>
            </div>
          </>
        ) : (
          <div className="coaching-bilan">
            <h4>Bilan coaching — score de session : {sessionSummary.averageScore}/100 ({sessionSummary.label})</h4>
            <div className="three-cols">
              <div>
                <h5>Ce qui est bien</h5>
                <ul>
                  {config.feedback.positive.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>À améliorer</h5>
                <ul>
                  {config.feedback.improve.map((point, idx) => (
                    <li key={`${point}-${idx}`}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>Conseil clé</h5>
                <p>{config.feedback.key}</p>
              </div>
            </div>
            <div className="bilan-actions">
              <button className="btn-secondary" onClick={() => resetTrack(track)}>
                Rejouer cette session
              </button>
              <button
                className="btn-main"
                onClick={() =>
                  downloadInterviewReportPdf({
                    personaName: config.meta.name,
                    personaSubtitle: config.meta.subtitle,
                    transcript,
                    history
                  })
                }
              >
                📄 Télécharger le rapport (PDF)
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </section>
  );
}

function LiveInterviewPanel({ userId, track, setTrack, offer, premium }) {
  const [phase, setPhase] = useState("idle"); // idle | listening | thinking | speaking | closed
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const meterRef = useRef(null);
  const rafRef = useRef(null);

  const config = INTERVIEW_SCRIPTS[track];
  const supported = isSpeechRecognitionSupported() && isSpeechSynthesisSupported();

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      meterRef.current?.cleanup?.();
    };
  }, []);

  function stopMicMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    meterRef.current?.cleanup?.();
    meterRef.current = null;
    setMicLevel(0);
  }

  async function startMicMeter() {
    try {
      const meter = await createMicLevelMeter();
      meterRef.current = meter;
      const loop = () => {
        setMicLevel(meter.getLevel());
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (_error) {
      // Visualisation audio optionnelle : si le micro n'est pas accessible pour
      // l'AnalyserNode, la reconnaissance vocale (listenOnce) peut tout de même
      // fonctionner de son côté ; on n'affiche pas d'erreur bloquante ici.
    }
  }

  async function playAiTurn(nextUserMessage) {
    setPhase("thinking");
    setError(null);
    try {
      const result = await requestLiveTurn({
        userId,
        personaName: config.meta.name,
        personaSubtitle: config.meta.subtitle,
        offerTitle: offer?.title,
        offerCompany: offer?.company,
        offerSkills: offer?.skills,
        history: conversation,
        userMessage: nextUserMessage
      });

      const updatedConversation = [
        ...conversation,
        ...(nextUserMessage ? [{ role: "user", text: nextUserMessage }] : []),
        { role: "assistant", text: result.reply }
      ];
      setConversation(updatedConversation);

      setPhase("speaking");
      await speak(result.reply, {
        onStart: () => setPhase("speaking"),
        onEnd: () => setPhase(result.isClosing ? "closed" : "idle")
      });
    } catch (err) {
      setError(err.message || "Erreur pendant l'entretien live.");
      setPhase("idle");
    }
  }

  async function handleTalk() {
    setPhase("listening");
    setError(null);
    await startMicMeter();
    try {
      const transcript = await listenOnce({ onEnd: stopMicMeter });
      stopMicMeter();
      if (!transcript) {
        setPhase("idle");
        return;
      }
      await playAiTurn(transcript);
    } catch (err) {
      stopMicMeter();
      setError(err.message || "Erreur de reconnaissance vocale.");
      setPhase("idle");
    }
  }

  function handleRestart() {
    stopSpeaking();
    stopMicMeter();
    setConversation([]);
    setError(null);
    setPhase("idle");
  }

  if (!premium?.hasAccess) {
    return (
      <div className="card block live-locked">
        <h3>🔒 Entretien live avec avatar IA — fonctionnalité premium</h3>
        <p className="muted">
          La simulation d'entretien vocale fait partie des fonctionnalités premium (cf. plan d'abonnement).
          Complète ton profil pour débloquer l'accès premium et essayer ce mode.
        </p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="card block live-locked">
        <h3>Navigateur non compatible</h3>
        <p className="muted">
          La reconnaissance et la synthèse vocales ne sont pas prises en charge par ce navigateur.
          Utilise Chrome ou Edge pour le mode live, ou reviens au mode texte.
        </p>
      </div>
    );
  }

  return (
    <div className="live-panel">
      <div className="tabs">
        {Object.entries(INTERVIEW_SCRIPTS).map(([key, value]) => (
          <button
            key={key}
            className={`tab-btn ${track === key ? "active" : ""}`}
            onClick={() => {
              handleRestart();
              setTrack(key);
            }}
          >
            <small>{value.label}</small>
            <strong>{value.meta.name}</strong>
          </button>
        ))}
      </div>

      {offer?.title ? (
        <p className="live-offer-context">
          🎯 Entretien adapté à : <strong>{offer.title}</strong>
          {offer.company ? ` — ${offer.company}` : ""}
        </p>
      ) : (
        <p className="live-offer-context muted">
          Aucune offre ciblée détectée : entretien généraliste. Colle une offre dans l'onglet Importer pour un entretien personnalisé.
        </p>
      )}

      <div className="card block live-stage">
        <div className={`avatar-live phase-${phase}`} style={{ "--mic-level": micLevel }}>
          <div className="avatar-live-ring" />
          <div className="avatar-live-core">{config.meta.avatar}</div>
          <div className="avatar-live-bars">
            <span /><span /><span /><span /><span />
          </div>
        </div>
        <p className="avatar-live-status">
          {phase === "idle" && "Prêt(e) — appuie sur Parler pour répondre."}
          {phase === "listening" && "🎙️ Je t'écoute..."}
          {phase === "thinking" && "Réflexion..."}
          {phase === "speaking" && "🗣️ En train de parler..."}
          {phase === "closed" && "Entretien terminé."}
        </p>

        {error ? <p className="ai-analysis-error">{error}</p> : null}

        <div className="live-conversation">
          {conversation.map((turn, idx) => (
            <div key={idx} className={`msg ${turn.role === "assistant" ? "ai" : "user"}`}>
              <p>{turn.text}</p>
            </div>
          ))}
        </div>

        <div className="live-controls">
          {conversation.length === 0 ? (
            <button className="btn-main" onClick={() => playAiTurn(null)} disabled={phase !== "idle"}>
              Démarrer l'entretien
            </button>
          ) : phase === "closed" ? (
            <button className="btn-secondary" onClick={handleRestart}>
              Recommencer
            </button>
          ) : (
            <button
              className={`btn-main talk-btn ${phase === "listening" ? "recording" : ""}`}
              onClick={handleTalk}
              disabled={phase === "listening" || phase === "thinking" || phase === "speaking"}
            >
              🎙️ Parler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InterviewHistoryPanel({ history, historyLoaded }) {
  if (!historyLoaded) {
    return <div className="card block"><p className="muted">Chargement de l'historique...</p></div>;
  }

  if (!history.length) {
    return (
      <div className="card block">
        <h3>Historique des entretiens</h3>
        <p className="muted">Aucune session enregistrée pour l'instant. Termine une simulation en mode texte ou live pour la voir apparaître ici.</p>
      </div>
    );
  }

  const averageOverall = Math.round(history.reduce((acc, item) => acc + item.averageScore, 0) / history.length);
  const bestScore = Math.max(...history.map((item) => item.averageScore));

  return (
    <div className="card block interview-history">
      <h3>Historique des entretiens ({history.length} session{history.length > 1 ? "s" : ""})</h3>
      <div className="history-stats">
        <div>
          <span className="dash-card-label">Score moyen</span>
          <strong>{averageOverall}/100</strong>
        </div>
        <div>
          <span className="dash-card-label">Meilleur score</span>
          <strong>{bestScore}/100</strong>
        </div>
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Persona</th>
            <th>Score</th>
            <th>Niveau</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {history.map((attempt) => (
            <tr key={attempt.id}>
              <td>{formatDate(attempt.createdAt)}</td>
              <td>{attempt.personaName || attempt.track}</td>
              <td>
                <span className={`tag tier-${attempt.averageScore >= 75 ? "great" : attempt.averageScore >= 55 ? "good" : attempt.averageScore >= 35 ? "medium" : "low"}`}>
                  {attempt.averageScore}/100
                </span>
              </td>
              <td>{attempt.label}</td>
              <td>
                {attempt.transcript?.length ? (
                  <button
                    type="button"
                    className="btn-secondary small-btn"
                    onClick={() =>
                      downloadInterviewReportPdf({
                        personaName: attempt.personaName || attempt.track,
                        personaSubtitle: "",
                        transcript: attempt.transcript,
                        history: []
                      })
                    }
                  >
                    📄 Rapport
                  </button>
                ) : (
                  <span className="muted small">Détail non disponible</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Placeholder({ title, text }) {
  return (
    <section className="placeholder card">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  );
}

function profileToForm(profile = {}) {
  return {
    headline: profile.headline || "",
    location: profile.location || "",
    targetRole: profile.targetRole || "",
    sector: profile.sector || "",
    experienceYears: profile.experienceYears || 0,
    education: profile.education || "",
    skills: Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
    languages: Array.isArray(profile.languages) ? profile.languages.join(", ") : ""
  };
}





