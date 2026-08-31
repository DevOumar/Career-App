import React from "react";
// Module Compte : drawer de gestion du compte (profil, nom d'utilisateur,
// e-mails, sécurité, comptes connectés, école associée...).
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { AvatarCircle, getAvatarSource } from "../../components/AvatarCircle.jsx";
import { LanguageSwitch } from "../../components/LanguageSwitch.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { formatDate, CURRENCY_OPTIONS } from "../../lib/format.js";
import { getUsernameValidation } from "../../lib/accounts.js";
import { resizeImageFileToDataUrl } from "../../lib/images.js";
// GoogleSignInButton/GoogleLogo restent dans App.jsx (utilisés aussi par
// l'écran de connexion) — import "arrière" volontaire et sûr : ils ne sont
// utilisés qu'au rendu, jamais à l'évaluation du module.
import { GoogleSignInButton, GoogleLogo, THEME_PRESETS } from "../../App.jsx";

export function AccountDrawer({
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
  activePanel,
  setActivePanel,
  onClose,
  onSaveAccount,
  onSaveProfile,
  roleOptions = [],
  sectorOptions = [],
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
  currentSessionId,
  onExportData,
  onExportSummary,
  onDeleteAccount
}) {
  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username || ""
  });
  // targetRole/sector alimentent le % de complétude du profil (voir
  // App.jsx) — les proposer ici évite d'obliger l'utilisateur à aller sur
  // la page Profil complète juste pour ces deux champs. Mêmes listes
  // d'options que le quiz de bienvenue (roleOptions/sectorOptions), pour
  // rester cohérent entre inscription et modification ultérieure.
  const [careerForm, setCareerForm] = useState({
    targetRole: user.profile?.targetRole || "",
    sector: user.profile?.sector || ""
  });
  const otherLabel = language === "en" ? "Other" : "Autre";
  const [roleIsOther, setRoleIsOther] = useState(
    Boolean(careerForm.targetRole) && !roleOptions.includes(careerForm.targetRole)
  );
  const [sectorIsOther, setSectorIsOther] = useState(
    Boolean(careerForm.sector) && !sectorOptions.includes(careerForm.sector)
  );
  const [emailForm, setEmailForm] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(() => getAvatarSource(user));
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [connectedMenuOpen, setConnectedMenuOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const emails = user.emailAddresses?.length
    ? user.emailAddresses
    : [{ id: "primary", email: user.email, isPrimary: true, isVerified: true }];

  useEffect(() => {
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || ""
    });
    setProfileAvatarPreview(getAvatarSource(user));
    setProfileAvatarFile(null);
  }, [user]);

  async function submitProfile(event) {
    event.preventDefault();
    setLocalError("");
    if (editingUsername) {
      const usernameError = getUsernameValidation(profileForm.username, language);
      if (usernameError) {
        setLocalError(usernameError);
        return;
      }
    }
    setSavingProfile(true);
    try {
      if (profileAvatarFile) {
        await onAvatarUpload(profileAvatarFile);
        setProfileAvatarFile(null);
      } else if (profileAvatarPreview === "") {
        await onAvatarUpload(null);
      }
      await onSaveAccount({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username
      });
      if (onSaveProfile && (careerForm.targetRole !== (user.profile?.targetRole || "") || careerForm.sector !== (user.profile?.sector || ""))) {
        await onSaveProfile({ targetRole: careerForm.targetRole, sector: careerForm.sector });
      }
      setEditingProfile(false);
      setEditingUsername(false);
    } finally {
      setSavingProfile(false);
    }
  }

  async function chooseProfileImage(file) {
    setLocalError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError(language === "en" ? "Select a valid image." : "Sélectionne une image valide.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError(language === "en" ? "Image too large. Maximum 10 MB." : "Image trop lourde. Maximum 10 Mo.");
      return;
    }
    setProfileAvatarFile(file);
    setProfileAvatarPreview(await resizeImageFileToDataUrl(file));
  }

  async function requestEmail(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setEmailSaving(true);
      await onRequestSecondaryEmail(emailForm);
      setPendingEmail(emailForm.trim());
      setEmailCode("");
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setEmailSaving(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setEmailSaving(true);
      await onVerifySecondaryEmail(pendingEmail, emailCode);
      setEmailForm("");
      setPendingEmail("");
      setEmailCode("");
      setAddingEmail(false);
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setEmailSaving(false);
    }
  }

  async function submitDeleteAccount(event) {
    event.preventDefault();
    setLocalError("");
    try {
      setDeleteSaving(true);
      await onDeleteAccount(deleteConfirm);
    } catch (error) {
      setLocalError(getFriendlyErrorMessage(error, language));
    } finally {
      setDeleteSaving(false);
    }
  }

  const copy =
    language === "en"
      ? {
          title: "Profile",
          subtitle: "Manage your account.",
          account: "Account",
          security: "Security",
          profile: "Profile",
          updateProfile: "Update profile",
          username: "Username",
          changeUsername: "Change username",
          emails: "Email addresses",
          primary: "Primary",
          verified: "Verified",
          pending: "Pending",
          addEmail: "Add an email address",
          addText: "Verify this email before it can be added to your account.",
          email: "Email address",
          sendCode: "Send code",
          code: "Verification code",
          verify: "Verify and add",
          connected: "Connected accounts",
          removeConnected: "Remove",
          connectedRemoveTitle: "Google sign-in",
          connectedRemoveText: "This unlinks your Google account. You won't be able to sign in with it anymore, but password and email-code login remain available.",
          schoolSection: "School",
          cabinetSection: "Recruitment firm",
          schoolType: "Type",
          schoolWebsite: "Website",
          schoolLocation: "Location",
          schoolEmailDomain: "Email domain",
          schoolContactPerson: "Primary contact",
          schoolContact: "Contact email",
          schoolPhone: "Phone",
          preferences: "Preferences",
          language: "Language",
          currency: "Currency",
          currencyHint: "Prices shown across the app (plans, pricing) are converted to your chosen currency using a fixed indicative rate.",
          theme: "Color theme",
          themeHint: "Changes the accent color used across buttons, links and highlights throughout the app.",
          mode: "Appearance",
          modeLight: "Light",
          modeDark: "Dark",
          density: "Density",
          densityComfortable: "Comfortable",
          densityCompact: "Compact",
          password: "Password",
          setPassword: "Set password",
          updatePassword: "Update password",
          currentPassword: "Current password",
          newPassword: "New password",
          confirmPassword: "Confirm password",
          passwordTooShort: "Your password must contain 8 characters or more.",
          logoutOthers: "Log out of all other devices",
          logoutOthersText: "Recommended if another device may have used your previous password.",
          activeDevices: "Active devices",
          danger: "Danger",
          deleteTitle: "Delete account",
          deleteLead: "Are you sure you want to delete your account? Some associated data may be retained. For complete data deletion, contact support.",
          deleteWarning: "This action is final and irreversible.",
          deletePrompt: 'Type "Supprimer le compte" below to continue.',
          deletePlaceholder: "Supprimer le compte",
          deleteButton: "Delete account",
          cancel: "Cancel",
          save: "Save",
          makePrimary: "Make primary",
          remove: "Remove",
          usernameHint: "3 to 30 characters: letters, numbers, - or _.",
          secured: "Secured by Career CV"
        }
      : {
          title: "Profil",
          subtitle: "Gérer votre compte.",
          account: "Compte",
          security: "Sécurité",
          profile: "Profil",
          updateProfile: "Mettre à jour le profil",
          username: "Nom d'utilisateur",
          changeUsername: "Changer le nom d'utilisateur",
          emails: "Adresses e-mail",
          primary: "Principal",
          verified: "Vérifiée",
          pending: "En attente",
          addEmail: "Ajouter une adresse e-mail",
          addText: "Vous devrez vérifier cette adresse e-mail avant qu'elle puisse être ajoutée à votre compte.",
          email: "Adresse e-mail",
          sendCode: "Envoyer le code",
          code: "Code de vérification",
          verify: "Vérifier et ajouter",
          connected: "Comptes connectés",
          removeConnected: "Retirer",
          connectedRemoveTitle: "Connexion Google",
          connectedRemoveText: "Cela délie votre compte Google. Vous ne pourrez plus l'utiliser pour vous connecter, mais la connexion par mot de passe et code e-mail reste disponible.",
          schoolSection: "École",
          cabinetSection: "Cabinet de recrutement",
          schoolType: "Type",
          schoolWebsite: "Site web",
          schoolLocation: "Localisation",
          schoolEmailDomain: "Domaine email",
          schoolContactPerson: "Contact principal",
          schoolContact: "Email de contact",
          schoolPhone: "Téléphone",
          preferences: "Préférences",
          language: "Langue",
          currency: "Devise",
          currencyHint: "Les prix affichés dans l'app (offres, tarifs) sont convertis dans votre devise avec un taux indicatif fixe.",
          theme: "Thème de couleur",
          themeHint: "Changez la couleur d'accent utilisée pour les boutons, liens et éléments mis en avant dans toute l'app.",
          mode: "Apparence",
          modeLight: "Clair",
          modeDark: "Sombre",
          density: "Densité",
          densityComfortable: "Confortable",
          densityCompact: "Compact",
          password: "Mot de passe",
          setPassword: "Définir le mot de passe",
          updatePassword: "Mettre à jour le mot de passe",
          currentPassword: "Mot de passe actuel",
          newPassword: "Nouveau mot de passe",
          confirmPassword: "Confirmer le mot de passe",
          passwordTooShort: "Votre mot de passe doit contenir 8 caractères ou plus.",
          logoutOthers: "Se déconnecter de tous les autres appareils",
          logoutOthersText: "Il est recommandé de se déconnecter de tous les autres appareils qui pourraient avoir utilisé votre ancien mot de passe.",
          activeDevices: "Appareils actifs",
          danger: "Danger",
          deleteTitle: "Supprimer le compte",
          deleteLead: "Êtes-vous sûr de vouloir supprimer votre compte ? Certaines données associées peuvent être conservées. Pour demander la suppression complète des données, veuillez contacter l'assistance.",
          deleteWarning: "Cette action est définitive et irréversible.",
          deletePrompt: 'Saisissez "Supprimer le compte" ci-dessous pour continuer.',
          deletePlaceholder: "Supprimer le compte",
          deleteButton: "Supprimer le compte",
          cancel: "Annuler",
          save: "Enregistrer",
          makePrimary: "Définir principale",
          remove: "Supprimer",
          usernameHint: "3 à 30 caractères : lettres, chiffres, - ou _.",
          secured: "Sécurisé par Career CV"
        };

  const usernameValidation = editingUsername ? getUsernameValidation(profileForm.username, language) : "";

  return (
    <div className="account-drawer-backdrop" onMouseDown={onClose}>
      <aside className="account-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-drawer-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="account-drawer-sidebar">
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          <button className={activePanel === "account" ? "active" : ""} onClick={() => setActivePanel("account")}>
            <UiIcon name="profile" />
            {copy.account}
          </button>
          <button className={activePanel === "security" ? "active" : ""} onClick={() => setActivePanel("security")}>
            <UiIcon name="shield" />
            {copy.security}
          </button>
          <button className={activePanel === "preferences" ? "active" : ""} onClick={() => setActivePanel("preferences")}>
            <UiIcon name="globe" />
            {copy.preferences}
          </button>
          <div className="account-drawer-secured">{copy.secured}</div>
        </div>

        <div className="account-drawer-main">
          {activePanel === "account" ? (
            <>
              <h3>{copy.account}</h3>
              <form className="account-rows" onSubmit={submitProfile}>
                <div className={`account-row ${editingProfile ? "popover-open profile-edit-open" : ""}`}>
                  <span>{copy.profile}</span>
                  <div className="account-profile-mini">
                    <AvatarCircle user={user} />
                    <strong>{user.firstName} {user.lastName}</strong>
                  </div>
                  <button type="button" className="account-link" onClick={() => setEditingProfile((prev) => !prev)}>
                    {copy.updateProfile}
                  </button>
                  {editingProfile ? (
                    <div className="account-edit-card profile-popover">
                      <h4>{copy.updateProfile}</h4>
                      <div className="profile-photo-editor">
                        <div className="profile-photo-preview">
                          {profileAvatarPreview ? (
                            <img src={profileAvatarPreview} alt="" />
                          ) : (
                            <AvatarCircle user={{ ...user, avatarDataUrl: "" }} />
                          )}
                        </div>
                        <label className="profile-photo-upload">
                          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => chooseProfileImage(event.target.files?.[0])} />
                          {avatarUploading ? (language === "en" ? "Uploading..." : "Téléchargement...") : language === "en" ? "Upload image" : "Télécharger une image"}
                        </label>
                        <button type="button" className="profile-photo-remove" onClick={() => { setProfileAvatarPreview(""); setProfileAvatarFile(null); }}>
                          {language === "en" ? "Remove image" : "Supprimer l'image"}
                        </button>
                        <p>{language === "en" ? "Upload a JPG, PNG, GIF or WEBP image under 10 MB" : "Téléchargez une image JPG, PNG, GIF ou WEBP inférieure à 10 Mo"}</p>
                      </div>
                      {localError ? <div className="form-error">{localError}</div> : null}
                      <div className="account-inline-fields two">
                        <label>
                          {language === "en" ? "First name" : "Prénom"}
                          <input value={profileForm.firstName} onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))} />
                        </label>
                        <label>
                          {language === "en" ? "Last name" : "Nom"}
                          <input value={profileForm.lastName} onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))} />
                        </label>
                      </div>
                      {user.roleType === "candidate" || user.roleType === "student" ? (
                      <div className="account-inline-fields two">
                        <label>
                          {language === "en" ? "Target role" : "Poste visé"}
                          <select
                            value={roleIsOther ? otherLabel : careerForm.targetRole}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === otherLabel) {
                                setRoleIsOther(true);
                                setCareerForm((prev) => ({ ...prev, targetRole: "" }));
                              } else {
                                setRoleIsOther(false);
                                setCareerForm((prev) => ({ ...prev, targetRole: value }));
                              }
                            }}
                          >
                            <option value="">{language === "en" ? "Select..." : "Choisir..."}</option>
                            {roleOptions.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                          {roleIsOther ? (
                            <input
                              value={careerForm.targetRole}
                              placeholder={language === "en" ? "Your target role..." : "Précisez le poste visé..."}
                              onChange={(event) => setCareerForm((prev) => ({ ...prev, targetRole: event.target.value }))}
                            />
                          ) : null}
                        </label>
                        <label>
                          {language === "en" ? "Sector" : "Secteur"}
                          <select
                            value={sectorIsOther ? otherLabel : careerForm.sector}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === otherLabel) {
                                setSectorIsOther(true);
                                setCareerForm((prev) => ({ ...prev, sector: "" }));
                              } else {
                                setSectorIsOther(false);
                                setCareerForm((prev) => ({ ...prev, sector: value }));
                              }
                            }}
                          >
                            <option value="">{language === "en" ? "Select..." : "Choisir..."}</option>
                            {sectorOptions.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                          {sectorIsOther ? (
                            <input
                              value={careerForm.sector}
                              placeholder={language === "en" ? "Your sector..." : "Précisez votre secteur..."}
                              onChange={(event) => setCareerForm((prev) => ({ ...prev, sector: event.target.value }))}
                            />
                          ) : null}
                        </label>
                      </div>
                      ) : null}
                      <div className="account-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setEditingProfile(false)}>{copy.cancel}</button>
                        <button className="btn-main" disabled={savingProfile}>
                          {savingProfile ? <span className="btn-spinner" /> : null} {copy.save}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={`account-row ${editingUsername ? "popover-open" : ""}`}>
                  <span>{copy.username}</span>
                  <strong className="account-value">{user.username || user.email.split("@")[0]}</strong>
                  <button type="button" className="account-link" onClick={() => setEditingUsername((prev) => !prev)}>
                    {copy.changeUsername}
                  </button>
                  {editingUsername ? (
                    <div className="account-edit-card compact">
                      <h4>{copy.changeUsername}</h4>
                      <label>
                        {copy.username}
                        <input
                          value={profileForm.username}
                          onChange={(event) => {
                            setLocalError("");
                            setProfileForm((prev) => ({ ...prev, username: event.target.value }));
                          }}
                          aria-invalid={Boolean(usernameValidation)}
                          aria-describedby="username-help"
                        />
                      </label>
                      <p id="username-help" className={usernameValidation ? "field-hint error" : "field-hint"}>
                        {usernameValidation || copy.usernameHint}
                      </p>
                      <div className="account-form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setEditingUsername(false)}>{copy.cancel}</button>
                        <button className="btn-main" disabled={Boolean(usernameValidation)}>{copy.save}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </form>

              <div className="account-rows">
                <div className={`account-row email-row ${addingEmail ? "popover-open" : ""}`}>
                  <span>{copy.emails}</span>
                  <div className="email-list">
                    {emails.map((item) => (
                      <div className="email-item" key={item.id}>
                        <div>
                          <strong>{item.email}</strong>
                          <small>{item.isPrimary ? copy.primary : item.isVerified ? copy.verified : copy.pending}</small>
                        </div>
                        <div className="email-actions">
                          {!item.isPrimary && item.isVerified ? (
                            <button type="button" onClick={() => onSetPrimaryEmail(item.id)}>{copy.makePrimary}</button>
                          ) : null}
                          {!item.isPrimary ? (
                            <button type="button" onClick={() => onRemoveEmail(item.id)}>{copy.remove}</button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    <button type="button" className="add-email-link" onClick={() => setAddingEmail((prev) => !prev)}>
                      <span>+</span>
                      {copy.addEmail}
                    </button>
                  </div>
                  {addingEmail ? (
                    <div className="account-add-email">
                      <h4>{copy.addEmail}</h4>
                      <p>{copy.addText}</p>
                      {localError ? <div className="form-error">{localError}</div> : null}
                      {!pendingEmail ? (
                        <form onSubmit={requestEmail}>
                          <label>
                            {copy.email}
                            <input type="email" value={emailForm} onChange={(event) => setEmailForm(event.target.value)} placeholder={copy.email} required />
                          </label>
                          <div className="account-form-actions">
                            <button type="button" className="btn-secondary" onClick={() => { setEmailForm(""); setAddingEmail(false); }}>{copy.cancel}</button>
                            <button className="btn-main" disabled={emailSaving}>{emailSaving ? "..." : copy.sendCode}</button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={verifyEmail}>
                          <label>
                            {copy.code}
                            <input inputMode="numeric" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required />
                          </label>
                          <div className="account-form-actions">
                            <button type="button" className="btn-secondary" onClick={() => setPendingEmail("")}>{copy.cancel}</button>
                            <button className="btn-main" disabled={emailSaving || emailCode.length !== 6}>{emailSaving ? "..." : copy.verify}</button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="account-row">
                  <span>{copy.connected}</span>
                  {user.googleLinked ? (
                    <>
                      <div className="connected-provider"><GoogleLogo /> Google · {user.email}</div>
                      <button type="button" className="account-kebab" onClick={() => setConnectedMenuOpen((prev) => !prev)}>...</button>
                      {connectedMenuOpen ? (
                        <div className="connected-popover">
                          <strong>{copy.connectedRemoveTitle}</strong>
                          <p>{copy.connectedRemoveText}</p>
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveConnectedAccount("google");
                              setConnectedMenuOpen(false);
                            }}
                          >
                            {copy.removeConnected}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="connected-provider connected-provider-empty">
                        {language === "en" ? "No connected account" : "Aucun compte connecté"}
                      </div>
                      <GoogleSignInButton
                        language={language}
                        onCredential={(credential) => onLinkGoogleAccount(credential)}
                      />
                    </>
                  )}
                </div>

                {user.schoolLicense && !user.schoolLicense.revoked && user.schoolLicense.organizationName ? (
                  <div className="account-row account-row-school">
                    <span>{user.roleType === "recruiter_internal" || user.roleType === "recruiter_firm" ? copy.cabinetSection : copy.schoolSection}</span>
                    <div className="account-school-card">
                      <div className="account-school-head">
                        {user.schoolLicense.logoDataUrl ? (
                          <img src={user.schoolLicense.logoDataUrl} alt="" className="account-school-logo" />
                        ) : (
                          <span className="account-school-logo account-school-logo-fallback">
                            <UiIcon name="briefcase" />
                          </span>
                        )}
                        <div>
                          <strong>{user.schoolLicense.organizationName}</strong>
                          {user.schoolLicense.acronym ? <span className="muted">{user.schoolLicense.acronym}</span> : null}
                        </div>
                      </div>
                      <ul className="account-school-details">
                        {user.schoolLicense.organizationType ? (
                          <li>
                            <span className="muted">{copy.schoolType}</span>
                            <span>{user.schoolLicense.organizationType}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.website ? (
                          <li>
                            <span className="muted">{copy.schoolWebsite}</span>
                            <a href={/^https?:\/\//i.test(user.schoolLicense.website) ? user.schoolLicense.website : `https://${user.schoolLicense.website}`} target="_blank" rel="noreferrer">
                              {user.schoolLicense.website}
                            </a>
                          </li>
                        ) : null}
                        {user.schoolLicense.address || user.schoolLicense.city || user.schoolLicense.country ? (
                          <li>
                            <span className="muted">{copy.schoolLocation}</span>
                            <span>{[user.schoolLicense.address, user.schoolLicense.city, user.schoolLicense.country].filter(Boolean).join(", ")}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.emailDomain ? (
                          <li>
                            <span className="muted">{copy.schoolEmailDomain}</span>
                            <span>{user.schoolLicense.emailDomain}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.primaryContactName ? (
                          <li>
                            <span className="muted">{copy.schoolContactPerson}</span>
                            <span>{user.schoolLicense.primaryContactName}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.contactEmail ? (
                          <li>
                            <span className="muted">{copy.schoolContact}</span>
                            <span>{user.schoolLicense.contactEmail}</span>
                          </li>
                        ) : null}
                        {user.schoolLicense.contactPhone ? (
                          <li>
                            <span className="muted">{copy.schoolPhone}</span>
                            <span>{user.schoolLicense.contactPhone}</span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : activePanel === "preferences" ? (
            <>
              <h3>{copy.preferences}</h3>
              <div className="account-rows">
                <div className="account-row account-row-preference">
                  <span>{copy.language}</span>
                  <LanguageSwitch language={language} setLanguage={setLanguage} />
                </div>
                <div className="account-row account-row-preference">
                  <span>{copy.currency}</span>
                  <div className="currency-pills">
                    {CURRENCY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`currency-pill ${currency === option.id ? "active" : ""}`}
                        onClick={() => setCurrency(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="preferences-hint">{copy.currencyHint}</p>

              <div className="account-rows">
                <div className="account-row account-row-preference account-row-theme">
                  <span>{copy.theme}</span>
                  <div className="theme-swatch-row">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`theme-swatch ${theme === preset.id ? "active" : ""}`}
                        style={{ "--swatch-color": preset.swatch }}
                        onClick={() => setTheme(preset.id)}
                        title={preset.label[language] || preset.label.fr}
                        aria-label={preset.label[language] || preset.label.fr}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="preferences-hint">{copy.themeHint}</p>

              <div className="account-rows">
                {/* Sélecteur de mode sombre retiré temporairement : la
                    plupart des composants utilisent des couleurs codées en
                    dur plutôt que les variables de thème, ce qui rend l'app
                    illisible par endroits une fois activé. À réintégrer une
                    fois un vrai passage fait sur tout le CSS. */}
                <div className="account-row account-row-preference">
                  <span>{copy.density}</span>
                  <div className="currency-pills">
                    <button
                      type="button"
                      className={`currency-pill ${density === "comfortable" ? "active" : ""}`}
                      onClick={() => setDensity("comfortable")}
                    >
                      {copy.densityComfortable}
                    </button>
                    <button
                      type="button"
                      className={`currency-pill ${density === "compact" ? "active" : ""}`}
                      onClick={() => setDensity("compact")}
                    >
                      {copy.densityCompact}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3>{copy.security}</h3>
              <div className="account-rows">
                <div className="account-row">
                  <span>{copy.password}</span>
                  <strong>{copy.setPassword}</strong>
                  <button type="button" className="account-link" onClick={() => setPasswordOpen((prev) => !prev)}>
                    {copy.updatePassword}
                  </button>
                </div>

                {passwordOpen ? (
                  <form className="account-security-card" onSubmit={onSubmitPassword}>
                    <h4>{copy.updatePassword}</h4>
                    <label>
                      {copy.currentPassword}
                      <input
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      {copy.newPassword}
                      <input
                        type="password"
                        minLength={8}
                        value={securityForm.newPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                        required
                      />
                      {securityForm.newPassword && securityForm.newPassword.length < 8 ? (
                        <small className="field-error">{copy.passwordTooShort}</small>
                      ) : null}
                    </label>
                    <label>
                      {copy.confirmPassword}
                      <input
                        type="password"
                        minLength={8}
                        value={securityForm.confirmPassword}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                        required
                      />
                    </label>
                    <label className="security-checkbox">
                      <input
                        type="checkbox"
                        checked={securityForm.logoutOtherSessions}
                        onChange={(event) => setSecurityForm((prev) => ({ ...prev, logoutOtherSessions: event.target.checked }))}
                      />
                      <span>
                        <strong>{copy.logoutOthers}</strong>
                        <small>{copy.logoutOthersText}</small>
                      </span>
                    </label>
                    <div className="account-form-actions">
                      <button type="button" className="btn-secondary" onClick={() => setPasswordOpen(false)}>
                        {copy.cancel}
                      </button>
                      <button
                        className="btn-main"
                        disabled={securitySaving || !securityForm.currentPassword || securityForm.newPassword.length < 8}
                      >
                        {securitySaving ? "..." : copy.save}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="account-row">
                  <span>{copy.activeDevices}</span>
                  <div className="device-list">
                    {user.sessions?.length ? (
                      user.sessions.map((deviceSession) => {
                        const isCurrent = currentSessionId && deviceSession.id === currentSessionId;
                        return (
                          <div className="device-info" key={deviceSession.id}>
                            <span className="device-screen" />
                            <div>
                              <strong>
                                {deviceSession.device || "—"} {isCurrent ? <em>{language === "en" ? "This device" : "Cet appareil"}</em> : null}
                              </strong>
                              <small>{deviceSession.browser || "—"} · {deviceSession.ipAddress || "—"}</small>
                              <small>{formatDate(deviceSession.lastSeenAt || deviceSession.createdAt)}</small>
                            </div>
                            {!isCurrent && onRevokeSession ? (
                              <button
                                type="button"
                                className="device-revoke"
                                onClick={() => onRevokeSession(deviceSession.id)}
                              >
                                {language === "en" ? "Disconnect" : "Déconnecter"}
                              </button>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">{language === "en" ? "No active session." : "Aucune session active."}</p>
                    )}
                  </div>
                </div>

                {onExportData ? (
                  <div className="account-row">
                    <span>{language === "en" ? "Your data" : "Vos données"}</span>
                    <div className="account-row-actions">
                      <button type="button" className="account-link" onClick={onExportData}>
                        {language === "en" ? "Download (JSON)" : "Télécharger (JSON)"}
                      </button>
                      {onExportSummary ? (
                        <button type="button" className="account-link" onClick={onExportSummary}>
                          {language === "en" ? "Readable summary (PDF)" : "Résumé lisible (PDF)"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="account-row danger">
                  <span>{copy.danger}</span>
                  <button type="button" onClick={() => setDeleteOpen((prev) => !prev)}>
                    {copy.deleteButton}
                  </button>
                </div>

                {deleteOpen ? (
                  <form className="delete-account-card" onSubmit={submitDeleteAccount}>
                    <h4>{copy.deleteTitle}</h4>
                    <p>{copy.deleteLead}</p>
                    <p className="delete-warning">{copy.deleteWarning}</p>
                    {localError ? <div className="form-error">{localError}</div> : null}
                    <label>
                      {copy.deletePrompt}
                      <input
                        value={deleteConfirm}
                        onChange={(event) => setDeleteConfirm(event.target.value)}
                        placeholder={copy.deletePlaceholder}
                      />
                    </label>
                    <div className="account-form-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setDeleteOpen(false);
                          setDeleteConfirm("");
                        }}
                      >
                        {copy.cancel}
                      </button>
                      <button className="delete-account-btn" disabled={deleteConfirm !== "Supprimer le compte" || deleteSaving}>
                        {deleteSaving ? "..." : copy.deleteButton}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default AccountDrawer;
