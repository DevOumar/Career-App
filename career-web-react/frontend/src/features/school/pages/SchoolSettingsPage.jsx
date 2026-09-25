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
  AdminLineIcon,
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

// Règles de format (identiques à la validation serveur, routes/school/profile.js).
const SETTINGS_RULES = {
  organizationName: (value) => (String(value || "").trim().length >= 2 ? "" : "name"),
  contactEmail: (value) => (!value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? "" : "email"),
  website: (value) => (!value || /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(value) ? "" : "website"),
  emailDomain: (value) => (!value || /^@?([a-z0-9-]+\.)+[a-z]{2,}$/i.test(value) ? "" : "domain"),
  contactPhone: (value) => (!value || /^\+?[0-9 ]{6,20}$/.test(value) ? "" : "phone")
};

const ORG_TYPES = [
  { value: "Université", en: "University" },
  { value: "École d'ingénieurs", en: "Engineering school" },
  { value: "École de commerce", en: "Business school" },
  { value: "École", en: "School" },
  { value: "Institut", en: "Institute" },
  { value: "Centre de formation", en: "Training center" },
  { value: "Autre", en: "Other" }
];

const SETTINGS_FIELDS = ["organizationName", "acronym", "organizationType", "website", "emailDomain", "address", "city", "country", "primaryContactName", "contactEmail", "contactPhone", "notes", "logoDataUrl"];

export default function SchoolSettingsPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverField, setServerField] = useState("");

  useEffect(() => {
    getSchoolProfile(user.id)
      .then((payload) => {
        setData(payload);
        setForm(payload.profile || {});
        setSaved(payload.profile || {});
      })
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const messages = {
    name: t("Au moins 2 caractères.", "At least 2 characters."),
    email: t("Adresse e-mail invalide (ex. contact@ecole.fr).", "Invalid email (e.g. contact@school.edu)."),
    website: t("Adresse de site invalide (ex. www.ecole.fr).", "Invalid website (e.g. www.school.edu)."),
    domain: t("Domaine invalide (ex. @ecole.fr).", "Invalid domain (e.g. @school.edu)."),
    phone: t("Numéro invalide : 6 à 20 chiffres (le + est accepté en tête).", "Invalid number: 6 to 20 digits (a leading + is allowed).")
  };
  const fieldError = (field) => {
    const rule = SETTINGS_RULES[field];
    const code = rule ? rule(form[field]) : "";
    if (code && (touched[field] || touched.__submit)) return messages[code];
    return serverField === field ? error : "";
  };
  const invalidFields = Object.keys(SETTINGS_RULES).filter((field) => SETTINGS_RULES[field](form[field]));
  const dirty = SETTINGS_FIELDS.some((field) => (form[field] || "") !== (saved[field] || ""));

  function update(field, value) {
    if (field === "contactPhone") {
      const digits = String(value).replace(/[^0-9+ ]/g, "");
      value = digits.replace(/(?!^)\+/g, "");
    }
    setForm((current) => ({ ...current, [field]: value }));
    if (serverField === field) {
      setServerField("");
      setError("");
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(t("Veuillez sélectionner une image.", "Please select an image file."));
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("Le logo est trop lourd (2 Mo maximum).", "The logo is too large (2 MB max)."));
      event.target.value = "";
      return;
    }
    try {
      // fileToBase64 renvoie le base64 brut : on reconstruit une data URL.
      const content = await fileToBase64(file);
      update("logoDataUrl", `data:${file.type};base64,${content}`);
      setError("");
    } catch (_error) {
      setError(t("Impossible de lire cette image.", "Unable to read this image."));
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event) {
    event?.preventDefault();
    setTouched((current) => ({ ...current, __submit: true }));
    if (invalidFields.length) {
      setError(t("Corrigez les champs signalés avant d'enregistrer.", "Fix the highlighted fields before saving."));
      return;
    }
    setSaving(true);
    setError("");
    setServerField("");
    try {
      const payload = await updateSchoolProfile(user.id, form);
      const next = payload.profile || form;
      setForm(next);
      setSaved(next);
      setTouched({});
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: t("Paramètres enregistrés.", "Settings saved."),
        showConfirmButton: false,
        timer: 2400,
        customClass: { popup: "career-toast", title: "career-toast-title" }
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
      if (String(err.code || "").startsWith("field:")) setServerField(err.code.slice(6));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return error ? <p className="field-error">{error}</p> : <AdminPageLoader language={language} />;

  const typeOptions = [...ORG_TYPES];
  if (form.organizationType && !typeOptions.some((item) => item.value === form.organizationType)) {
    typeOptions.unshift({ value: form.organizationType, en: form.organizationType });
  }
  const location = [form.city, form.country].filter(Boolean).join(", ");
  const websiteHref = form.website ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`) : "";
  const completion = Math.round(
    (["organizationName", "acronym", "organizationType", "website", "emailDomain", "address", "city", "country", "primaryContactName", "contactEmail", "contactPhone", "logoDataUrl"].filter((field) => String(form[field] || "").trim()).length / 12) * 100
  );

  const Field = ({ field, label, hint, placeholder, type = "text", wide = false, icon, inputMode }) => {
    const message = fieldError(field);
    return (
      <label className={`jy-field ${wide ? "wide" : ""} ${message ? "has-error" : ""}`}>
        <span className="jy-field-label">{label}</span>
        <span className="jy-field-control">
          {icon ? <AdminLineIcon name={icon} /> : null}
          <input
            type={type}
            inputMode={inputMode}
            value={form[field] || ""}
            placeholder={placeholder}
            onChange={(event) => update(field, event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
          />
        </span>
        {message ? <small className="jy-field-error">{message}</small> : hint ? <small className="jy-field-hint">{hint}</small> : null}
      </label>
    );
  };

  return (
    <section className="school-settings jy-settings">
      <header className="module-header">
        <h2>{t("Paramètres de l'établissement", "Institution settings")}</h2>
        <p>{t("L'identité de votre établissement, telle que vos étudiants la voient sur Career CV.", "Your institution's identity, as your students see it on Career CV.")}</p>
      </header>

      <div className="jy-settings-grid">
        <aside className="jy-settings-side">
          <div className="jy-card jy-org-preview">
            <span className="jy-org-preview-logo">
              {form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <AdminLineIcon name="schools" />}
            </span>
            <strong>{form.organizationName || t("Nom de l'établissement", "Institution name")}</strong>
            <span className="jy-org-preview-sub">{[form.acronym, form.organizationType].filter(Boolean).join(" · ") || t("Sigle · Type", "Acronym · Type")}</span>
            <ul className="jy-org-preview-list">
              <li>
                <AdminLineIcon name="link" />
                {websiteHref ? (
                  <a href={websiteHref} target="_blank" rel="noreferrer">
                    {form.website}
                  </a>
                ) : (
                  <span className="muted">{t("Site web non renseigné", "No website")}</span>
                )}
              </li>
              <li>
                <AdminLineIcon name="send" />
                <span>{form.emailDomain || t("Domaine e-mail non renseigné", "No email domain")}</span>
              </li>
              <li>
                <AdminLineIcon name="schools" />
                <span>{location || t("Ville non renseignée", "No city")}</span>
              </li>
            </ul>
            <div className="jy-completion">
              <div className="jy-completion-row">
                <span>{t("Fiche complétée", "Profile completion")}</span>
                <strong>{completion} %</strong>
              </div>
              <span className="jy-completion-bar">
                <span style={{ width: `${completion}%` }} />
              </span>
            </div>
          </div>

          <div className="jy-card jy-admin-card">
            <p className="jy-section-kicker">{t("Administrateur du compte", "Account administrator")}</p>
            <div className="jy-admin-card-row">
              <AvatarCircle user={data.admin} />
              <div>
                <strong>
                  {data.admin.firstName} {data.admin.lastName}
                </strong>
                <span>{data.admin.email}</span>
              </div>
            </div>
            <p className="jy-admin-card-note">
              {t(
                "Votre compte personnel (photo, mot de passe, double authentification) se gère depuis « Mon profil », en haut à droite.",
                "Your personal account (photo, password, two-factor authentication) is managed from “My profile”, top right."
              )}
            </p>
          </div>
        </aside>

        <form className="jy-settings-form" onSubmit={submit} noValidate>
          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Identité", "Identity")}</h3>
                <p className="jy-card-sub">{t("Nom, sigle et logo affichés à vos étudiants.", "Name, acronym and logo shown to your students.")}</p>
              </div>
            </div>
            <div className="jy-logo-row">
              <span className="jy-logo-box">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <AdminLineIcon name="schools" />}</span>
              <div className="jy-logo-actions">
                <strong>{t("Logo de l'établissement", "Institution logo")}</strong>
                <small>{t("PNG, JPG, WebP ou GIF · 2 Mo maximum · format carré conseillé.", "PNG, JPG, WebP or GIF · 2 MB max · square format recommended.")}</small>
                <div className="jy-logo-buttons">
                  <label className="jy-btn jy-btn-outline jy-btn-sm">
                    <AdminLineIcon name="upload" />
                    {form.logoDataUrl ? t("Changer le logo", "Change logo") : t("Importer un logo", "Upload a logo")}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoUpload} hidden />
                  </label>
                  {form.logoDataUrl ? (
                    <button type="button" className="jy-btn jy-btn-ghost-danger jy-btn-sm" onClick={() => update("logoDataUrl", "")}>
                      <AdminLineIcon name="trash" />
                      {t("Retirer", "Remove")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "organizationName", label: t("Nom officiel", "Official name"), placeholder: t("Ex. Université de Lyon", "e.g. University of Lyon"), wide: true })}
              {Field({ field: "acronym", label: t("Sigle", "Acronym"), placeholder: t("Ex. HETIC", "e.g. MIT") })}
              <label className="jy-field">
                <span className="jy-field-label">{t("Type d'établissement", "Institution type")}</span>
                <span className="jy-field-control">
                  <select value={form.organizationType || ""} onChange={(event) => update("organizationType", event.target.value)}>
                    <option value="">{t("Choisir…", "Choose…")}</option>
                    {typeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {language === "en" ? item.en : item.value}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Coordonnées", "Contact details")}</h3>
                <p className="jy-card-sub">{t("Site, domaine e-mail des étudiants et adresse.", "Website, students' email domain and address.")}</p>
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "website", label: t("Site web", "Website"), placeholder: "www.ecole.fr", icon: "link" })}
              {Field({
                field: "emailDomain",
                label: t("Domaine e-mail des étudiants", "Students' email domain"),
                placeholder: "@ecole.fr",
                icon: "send",
                hint: t("Permet de reconnaître les adresses de votre établissement.", "Helps recognize your institution's addresses.")
              })}
              {Field({ field: "address", label: t("Adresse", "Address"), placeholder: t("Numéro et rue", "Street address"), wide: true })}
              {Field({ field: "city", label: t("Ville", "City"), placeholder: "Paris" })}
              {Field({ field: "country", label: t("Pays", "Country"), placeholder: "France" })}
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Contact principal", "Primary contact")}</h3>
                <p className="jy-card-sub">{t("La personne que Career CV contacte pour votre licence.", "The person Career CV contacts about your license.")}</p>
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "primaryContactName", label: t("Nom et prénom", "Full name"), placeholder: t("Ex. Marie Dupont", "e.g. Jane Doe"), icon: "profile", wide: true })}
              {Field({ field: "contactEmail", label: t("E-mail", "Email"), placeholder: "contact@ecole.fr", type: "email", icon: "send" })}
              {Field({ field: "contactPhone", label: t("Téléphone", "Phone"), placeholder: "+33 1 23 45 67 89", type: "tel", icon: "phone", inputMode: "tel", hint: t("Chiffres uniquement, + accepté en tête.", "Digits only, leading + allowed.") })}
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Notes internes", "Internal notes")}</h3>
                <p className="jy-card-sub">{t("Visibles uniquement par votre équipe.", "Visible only to your team.")}</p>
              </div>
            </div>
            <label className="jy-field wide">
              <span className="jy-field-control">
                <textarea rows={4} value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder={t("Informations utiles pour l'équipe…", "Useful information for the team…")} />
              </span>
            </label>
          </div>

          {error && !serverField ? <p className="field-error">{error}</p> : null}

          <div className={`jy-savebar ${dirty ? "is-visible" : ""}`}>
            <span>
              <AdminLineIcon name="alert" />
              {t("Modifications non enregistrées", "Unsaved changes")}
            </span>
            <div>
              <button
                type="button"
                className="jy-btn jy-btn-outline jy-btn-sm"
                onClick={() => {
                  setForm(saved);
                  setTouched({});
                  setError("");
                  setServerField("");
                }}
                disabled={saving}
              >
                {t("Annuler", "Discard")}
              </button>
              <button type="submit" className="jy-btn jy-btn-primary jy-btn-sm" disabled={saving}>
                {saving ? <span className="btn-spinner" /> : null}
                {t("Enregistrer", "Save")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
