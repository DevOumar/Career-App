import React from "react";
// Module Profil : profil professionnel, paramètres de compte, photo, offre
// premium dynamique.
import { useState, useEffect } from "react";
import { AvatarCircle } from "../../components/AvatarCircle.jsx";
import { getAccountLabel, accountToForm, buildAccountPatch } from "../../lib/accounts.js";
import { formatDate } from "../../lib/format.js";
import { PROFILE_COPY } from "./profileCopy.js";
import { ACCOUNT_TYPE_OPTIONS } from "../../App.jsx";

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

function ProfilePage({
  user,
  premium,
  profileCompleteness,
  onSaveProfile,
  onSaveAccount,
  onAvatarUpload,
  avatarUploading,
  onActivatePremium,
  language
}) {
  const copy = PROFILE_COPY[language] || PROFILE_COPY.fr;
  const [profileForm, setProfileForm] = useState(() => profileToForm(user.profile));
  const [accountForm, setAccountForm] = useState(() => accountToForm(user));
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

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

  async function submitProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await onSaveProfile({
        ...profileForm,
        experienceYears: Number(profileForm.experienceYears || 0),
        skills: profileForm.skills,
        languages: profileForm.languages
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitAccount(event) {
    event.preventDefault();
    setSavingAccount(true);
    try {
      await onSaveAccount(buildAccountPatch(accountForm));
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-avatar">
          <AvatarCircle user={user} large />
          <label className="avatar-upload-btn">
            <input type="file" accept="image/*" onChange={(event) => onAvatarUpload(event.target.files?.[0])} />
            {avatarUploading ? copy.uploading : copy.upload}
          </label>
        </div>
        <div>
          <h2>
            {user.firstName} {user.lastName}
          </h2>
          <p>{profileForm.headline || copy.addHeadline}</p>
          <div className="tag-row">
            <span className="tag">{user.email}</span>
            <span className="tag">{getAccountLabel(user.roleType, language)}</span>
            <span className="tag">{copy.completeness} : {profileCompleteness}%</span>
            <span className="tag">{copy.plan}: {user.subscription?.plan || "free"}</span>
          </div>
        </div>
      </div>

      <div className="section-grid profile-grid-extended">
        <form className="card block" onSubmit={submitProfile}>
          <h3>{copy.professional}</h3>
          <label>
            {copy.headline}
            <input
              value={profileForm.headline}
              onChange={(event) => updateProfileField("headline", event.target.value)}
              placeholder="Data Scientist - GenAI"
            />
          </label>
          <div className="two-cols">
            <label>
              {copy.targetRole}
              <input
                value={profileForm.targetRole}
                onChange={(event) => updateProfileField("targetRole", event.target.value)}
                placeholder="Data Scientist GenAI"
              />
            </label>
            <label>
              {copy.sector}
              <input
                value={profileForm.sector}
                onChange={(event) => updateProfileField("sector", event.target.value)}
                placeholder="Conseil, Santé, Finance..."
              />
            </label>
          </div>

          <div className="two-cols">
            <label>
              {copy.location}
              <input
                value={profileForm.location}
                onChange={(event) => updateProfileField("location", event.target.value)}
                placeholder="Paris"
              />
            </label>
            <label>
              {copy.experience}
              <input
                type="number"
                min="0"
                value={profileForm.experienceYears}
                onChange={(event) => updateProfileField("experienceYears", event.target.value)}
              />
            </label>
          </div>

          <label>
            {copy.education}
            <input
              value={profileForm.education}
              onChange={(event) => updateProfileField("education", event.target.value)}
              placeholder="Bac+5 / Master / Ingénieur"
            />
          </label>

          <label>
            {copy.skills}
            <textarea
              rows={4}
              value={profileForm.skills}
              onChange={(event) => updateProfileField("skills", event.target.value)}
              placeholder="python, sql, llm, rag, azure"
            />
          </label>

          <label>
            {copy.languages}
            <input
              value={profileForm.languages}
              onChange={(event) => updateProfileField("languages", event.target.value)}
              placeholder="français, anglais"
            />
          </label>

          <button className="btn-main" type="submit" disabled={savingProfile}>
            {savingProfile ? <span className="btn-spinner" /> : null} {copy.saveProfile}
          </button>
        </form>

        <form className="card block" onSubmit={submitAccount}>
          <h3>{copy.accountSettings}</h3>
          <div className="two-cols">
            <label>
              {copy.accountType}
              <select value={accountForm.accountType} onChange={(event) => updateAccountField("accountType", event.target.value)}>
                {ACCOUNT_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {getAccountLabel(item.value, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.phone}
              <input value={accountForm.phone} onChange={(event) => updateAccountField("phone", event.target.value)} />
            </label>
          </div>

          <div className="two-cols">
            <label>
              {copy.city}
              <input value={accountForm.city} onChange={(event) => updateAccountField("city", event.target.value)} />
            </label>
            <label>
              {copy.country}
              <input value={accountForm.country} onChange={(event) => updateAccountField("country", event.target.value)} />
            </label>
          </div>

          <RoleSpecificFields form={accountForm} updateField={updateAccountField} language={language} />

          <button className="btn-main" type="submit" disabled={savingAccount}>
            {savingAccount ? <span className="btn-spinner" /> : null} {copy.saveAccount}
          </button>
        </form>

        <div className="card block premium-card">
          <h3>{copy.premiumTitle}</h3>
          <p className="muted">{copy.premiumText}</p>

          <div className="premium-score">
            <div className="ring" style={{ "--pct": `${premium?.eligibility?.score || 0}%` }}>
              <strong>{premium?.eligibility?.score || 0}</strong>
              <span>/100</span>
            </div>
            <div>
              <h4>
                {copy.level}: {premium?.eligibility?.tier || "Starter"} · {premium?.hasAccess ? copy.accessOpen : copy.accessRestricted}
              </h4>
              <ul className="flat-list">
                {(premium?.eligibility?.reasons || []).map((reason, idx) => (
                  <li key={`${reason}-${idx}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="premium-meta">
            <span>{copy.accessSource}: {premium?.source || "locked"}</span>
            <span>{copy.renewal}: {formatDate(user.subscription?.renewalAt)}</span>
          </div>

          <button className="btn-secondary" onClick={onActivatePremium}>
            {copy.activatePremium}
          </button>
        </div>
      </div>
    </section>
  );
}

function RoleSpecificFields({ form, updateField, language }) {
  const t =
    language === "en"
      ? {
          currentTitle: "Current title",
          searchedRole: "Target role",
          experience: "Experience (years)",
          school: "School / University",
          studyLevel: "Education level",
          graduation: "Graduation year",
          contract: "Contract sought",
          contractPlaceholder: "Full-time, apprenticeship, internship...",
          availability: "Availability",
          availabilityPlaceholder: "Immediate, 1 month...",
          organization: "Organization name",
          recruiterFunction: "Recruiting function",
          hiringVolume: "Hiring volume",
          hiringPlaceholder: "e.g. 20 roles / quarter",
          sector: "Industry",
          website: "Website",
          organizationType: "Organization type",
          department: "Department",
          size: "Size",
          contactRole: "Contact role",
          notes: "Additional notes"
        }
      : {
          currentTitle: "Titre actuel",
          searchedRole: "Rôle recherché",
          experience: "Expérience (ans)",
          school: "École / Université",
          studyLevel: "Niveau d'études",
          graduation: "Année de diplomation",
          contract: "Contrat recherché",
          contractPlaceholder: "CDI, alternance, stage...",
          availability: "Disponibilité",
          availabilityPlaceholder: "Immédiate, 1 mois...",
          organization: "Nom de la structure",
          recruiterFunction: "Fonction recrutement",
          hiringVolume: "Volume de recrutements",
          hiringPlaceholder: "ex: 20 postes / trimestre",
          sector: "Secteur",
          website: "Site web",
          organizationType: "Type d'organisation",
          department: "Département",
          size: "Taille",
          contactRole: "Rôle contact",
          notes: "Notes complémentaires"
        };
  if (form.accountType === "candidate" || form.accountType === "student") {
    return (
      <div className="role-fields">
        <label>
          {t.currentTitle}
          <input value={form.currentTitle} onChange={(event) => updateField("currentTitle", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            {t.searchedRole}
            <input value={form.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
          </label>
          <label>
            {t.experience}
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
            {t.school}
            <input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
          </label>
          <label>
            {t.studyLevel}
            <input value={form.studyLevel} onChange={(event) => updateField("studyLevel", event.target.value)} />
          </label>
        </div>
        <div className="two-cols">
          <label>
            {t.graduation}
            <input value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} />
          </label>
          <label>
            {t.contract}
            <input
              placeholder={t.contractPlaceholder}
              value={form.contractPreference}
              onChange={(event) => updateField("contractPreference", event.target.value)}
            />
          </label>
        </div>
        <label>
          {t.availability}
          <input
            placeholder={t.availabilityPlaceholder}
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
          {t.organization}
          <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
        </label>
        <div className="two-cols">
          <label>
            {t.recruiterFunction}
            <input value={form.recruiterRole} onChange={(event) => updateField("recruiterRole", event.target.value)} />
          </label>
          <label>
            {t.hiringVolume}
            <input
              placeholder={t.hiringPlaceholder}
              value={form.hiringVolume}
              onChange={(event) => updateField("hiringVolume", event.target.value)}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            {t.sector}
            <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
          </label>
          <label>
            {t.website}
            <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="role-fields">
      <label>
        {t.organization}
        <input value={form.organizationName} onChange={(event) => updateField("organizationName", event.target.value)} />
      </label>
      <div className="two-cols">
        <label>
          {t.organizationType}
          <input value={form.organizationType} onChange={(event) => updateField("organizationType", event.target.value)} />
        </label>
        <label>
          {t.department}
          <input value={form.department} onChange={(event) => updateField("department", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          {t.size}
          <input value={form.sizeRange} onChange={(event) => updateField("sizeRange", event.target.value)} />
        </label>
        <label>
          {t.sector}
          <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
        </label>
      </div>
      <div className="two-cols">
        <label>
          {t.contactRole}
          <input value={form.contactRole} onChange={(event) => updateField("contactRole", event.target.value)} />
        </label>
        <label>
          {t.website}
          <input value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>
      </div>
      <label>
        {t.notes}
        <textarea rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </label>
    </div>
  );
}

export default ProfilePage;
