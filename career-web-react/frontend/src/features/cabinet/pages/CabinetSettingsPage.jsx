import React, { useEffect, useState } from "react";
// Espace Cabinet › Paramètres du cabinet : identité, coordonnées, contact
// principal et page publique de recrutement. Seul le titulaire modifie ; un
// recruteur invité consulte en lecture seule.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { getCabinetProfile, updateCabinetProfile } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { cabinetToast } from "./cabinetToast.js";
import CabinetRgpdCard from "./CabinetRgpdCard.jsx";

// Règles de format (identiques à la validation serveur, routes/cabinet/profile.js).
const SETTINGS_RULES = {
  organizationName: (value) => (String(value || "").trim().length >= 2 ? "" : "name"),
  contactEmail: (value) => (!value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? "" : "email"),
  website: (value) => (!value || /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value) ? "" : "website"),
  contactPhone: (value) => (!value || /^\+?[0-9 ]{6,20}$/.test(value) ? "" : "phone"),
  siret: (value) => (!value || /^[0-9]{14}$/.test(String(value).replace(/\s+/g, "")) ? "" : "siret"),
  vatNumber: (value) => (!value || /^[A-Z]{2}[0-9A-Z]{2,13}$/.test(String(value).replace(/\s+/g, "").toUpperCase()) ? "" : "vat")
};
const SETTINGS_FIELDS = ["organizationName", "website", "address", "city", "country", "primaryContactName", "contactEmail", "contactPhone", "description", "logoDataUrl", "publicPageEnabled", "legalName", "siret", "vatNumber", "invoiceFooter"];

export default function CabinetSettingsPage({ user, language, isCabinetOwner = true }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [serverField, setServerField] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCabinetProfile(user.id)
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
    email: t("Adresse e-mail invalide (ex. contact@cabinet.fr).", "Invalid email (e.g. contact@firm.com)."),
    website: t("Adresse de site invalide (ex. www.cabinet.fr).", "Invalid website (e.g. www.firm.com)."),
    phone: t("Numéro invalide : 6 à 20 chiffres (le + est accepté en tête).", "Invalid number: 6 to 20 digits (a leading + is allowed)."),
    siret: t("Le SIRET contient 14 chiffres.", "The SIRET has 14 digits."),
    vat: t("Format attendu : FR suivi de 11 caractères (ex. FR12345678901).", "Expected format: country code then number (e.g. FR12345678901).")
  };
  const fieldError = (field) => {
    const rule = SETTINGS_RULES[field];
    const code = rule ? rule(form[field]) : "";
    if (code && (touched[field] || touched.__submit)) return messages[code];
    return serverField === field ? error : "";
  };
  const invalidFields = Object.keys(SETTINGS_RULES).filter((field) => SETTINGS_RULES[field](form[field]));
  const dirty = SETTINGS_FIELDS.some((field) => (form[field] ?? "") !== (saved[field] ?? ""));

  function update(field, value) {
    if (!isCabinetOwner) return;
    if (field === "contactPhone") {
      value = String(value).replace(/[^0-9+ ]/g, "").replace(/(?!^)\+/g, "");
    }
    if (field === "siret") value = String(value).replace(/[^0-9 ]/g, "").slice(0, 17);
    if (field === "vatNumber") value = String(value).toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 17);
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
    if (!isCabinetOwner) return;
    setTouched((current) => ({ ...current, __submit: true }));
    if (invalidFields.length) {
      setError(t("Corrigez les champs signalés avant d'enregistrer.", "Fix the highlighted fields before saving."));
      return;
    }
    setSaving(true);
    setError("");
    setServerField("");
    try {
      const result = await updateCabinetProfile(user.id, form);
      const next = { ...form, publicSlug: result?.publicSlug ?? form.publicSlug };
      setForm(next);
      setSaved(next);
      setTouched({});
      cabinetToast({ title: t("Paramètres enregistrés.", "Settings saved.") });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
      if (String(err.code || "").startsWith("field:")) setServerField(err.code.slice(6));
    } finally {
      setSaving(false);
    }
  }

  if (!data) return error ? <p className="field-error">{error}</p> : <AdminPageLoader language={language} />;

  const location = [form.city, form.country].filter(Boolean).join(", ");
  const websiteHref = form.website ? (/^https?:\/\//i.test(form.website) ? form.website : `https://${form.website}`) : "";
  const completionFields = ["organizationName", "website", "address", "city", "country", "primaryContactName", "contactEmail", "contactPhone", "description", "logoDataUrl"];
  const completion = Math.round((completionFields.filter((field) => String(form[field] || "").trim()).length / completionFields.length) * 100);
  const publicUrl = saved.publicPageEnabled && saved.publicSlug ? `${window.location.origin}${window.location.pathname}#/cabinet/${saved.publicSlug}` : "";

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_error) {
      // presse-papiers indisponible : le lien reste sélectionnable
    }
  }

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
            readOnly={!isCabinetOwner}
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
        <h2>{t("Paramètres du cabinet", "Firm settings")}</h2>
        <p>{t("L'identité de votre cabinet, telle que vos recruteurs et vos candidats la voient.", "Your firm's identity, as your recruiters and candidates see it.")}</p>
      </header>

      {!isCabinetOwner ? (
        <div className="jy-callout info">
          <AdminLineIcon name="info" />
          <span>{t("Lecture seule : seul le compte titulaire du cabinet peut modifier ces paramètres.", "Read-only: only the firm's owner account can edit these settings.")}</span>
        </div>
      ) : null}

      <div className="jy-settings-grid">
        <aside className="jy-settings-side">
          <div className="jy-card jy-org-preview">
            <span className="jy-org-preview-logo">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <AdminLineIcon name="cabinets" />}</span>
            <strong>{form.organizationName || t("Nom du cabinet", "Firm name")}</strong>
            <span className="jy-org-preview-sub">{t("Cabinet de recrutement", "Recruitment firm")}</span>
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
                <span>{form.contactEmail || t("E-mail non renseigné", "No email")}</span>
              </li>
              <li>
                <AdminLineIcon name="cabinets" />
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
            <p className="jy-section-kicker">{t("Titulaire du compte", "Account owner")}</p>
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
                <p className="jy-card-sub">{t("Nom, logo et présentation du cabinet.", "Firm name, logo and presentation.")}</p>
              </div>
            </div>
            <div className="jy-logo-row">
              <span className="jy-logo-box">{form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <AdminLineIcon name="cabinets" />}</span>
              <div className="jy-logo-actions">
                <strong>{t("Logo du cabinet", "Firm logo")}</strong>
                <small>{t("PNG, JPG, WebP ou GIF · 2 Mo maximum · format carré conseillé.", "PNG, JPG, WebP or GIF · 2 MB max · square format recommended.")}</small>
                {isCabinetOwner ? (
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
                ) : null}
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "organizationName", label: t("Nom du cabinet", "Firm name"), placeholder: t("Ex. Talents & Co", "e.g. Talents & Co"), wide: true })}
              <label className="jy-field wide">
                <span className="jy-field-label">{t("Présentation", "Presentation")}</span>
                <span className="jy-field-control">
                  <textarea
                    rows={4}
                    maxLength={2000}
                    readOnly={!isCabinetOwner}
                    value={form.description || ""}
                    onChange={(event) => update("description", event.target.value)}
                    placeholder={t("Spécialités, secteurs, zones géographiques… (affiché sur votre page publique)", "Specialties, sectors, regions… (shown on your public page)")}
                  />
                </span>
                <small className="jy-field-hint">{t(`${(form.description || "").length} / 2000 caractères`, `${(form.description || "").length} / 2000 characters`)}</small>
              </label>
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Coordonnées", "Contact details")}</h3>
                <p className="jy-card-sub">{t("Site web et adresse du cabinet.", "Firm website and address.")}</p>
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "website", label: t("Site web", "Website"), placeholder: "www.cabinet.fr", icon: "link", wide: true })}
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
              {Field({ field: "contactEmail", label: t("E-mail", "Email"), placeholder: "contact@cabinet.fr", type: "email", icon: "send" })}
              {Field({ field: "contactPhone", label: t("Téléphone", "Phone"), placeholder: "+33 1 23 45 67 89", type: "tel", icon: "phone", inputMode: "tel", hint: t("Chiffres uniquement, + accepté en tête.", "Digits only, leading + allowed.") })}
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Mentions de facturation", "Invoicing details")}</h3>
                <p className="jy-card-sub">{t("Obligatoires sur vos factures d'honoraires (module Factures clients).", "Mandatory on your fee invoices (Client invoices module).")}</p>
              </div>
            </div>
            <div className="jy-field-grid">
              {Field({ field: "legalName", label: t("Raison sociale", "Legal name"), placeholder: t("Ex. Talents & Co SAS", "e.g. Talents & Co Ltd"), wide: true })}
              {Field({ field: "siret", label: "SIRET", placeholder: "123 456 789 00012", inputMode: "numeric" })}
              {Field({ field: "vatNumber", label: t("N° de TVA intracommunautaire", "VAT number"), placeholder: "FR12345678901" })}
              <label className="jy-field wide">
                <span className="jy-field-label">{t("Pied de facture (facultatif)", "Invoice footer (optional)")}</span>
                <span className="jy-field-control">
                  <textarea rows={2} maxLength={1000} readOnly={!isCabinetOwner} value={form.invoiceFooter || ""} onChange={(event) => update("invoiceFooter", event.target.value)} placeholder={t("Ex. RIB, capital social, RCS…", "e.g. bank details, share capital…")} />
                </span>
              </label>
            </div>
          </div>

          <div className="jy-card">
            <div className="jy-card-head">
              <div>
                <h3>{t("Page publique de recrutement", "Public recruitment page")}</h3>
                <p className="jy-card-sub">{t("Une page sans connexion qui liste vos missions ouvertes, à partager avec des candidats.", "A no-login page listing your open missions, to share with candidates.")}</p>
              </div>
              <span className="jy-switch-row">
                <small>{form.publicPageEnabled ? t("Activée", "Enabled") : t("Désactivée", "Disabled")}</small>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(form.publicPageEnabled)}
                  aria-label={t("Page publique de recrutement", "Public recruitment page")}
                  className={`jy-switch ${form.publicPageEnabled ? "on" : ""}`}
                  disabled={!isCabinetOwner}
                  onClick={() => update("publicPageEnabled", !form.publicPageEnabled)}
                >
                  <span />
                </button>
              </span>
            </div>
            {publicUrl ? (
              <div className="jy-public-link">
                <AdminLineIcon name="link" />
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  {publicUrl}
                </a>
                <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={copyPublicLink}>
                  <AdminLineIcon name={copied ? "quality" : "link"} />
                  {copied ? t("Copié !", "Copied!") : t("Copier le lien", "Copy link")}
                </button>
              </div>
            ) : (
              <p className="jy-card-lead">
                {form.publicPageEnabled
                  ? t("Enregistrez pour générer le lien public.", "Save to generate the public link.")
                  : t("Activez la page puis enregistrez : son lien s'affichera ici.", "Enable the page then save: its link will show here.")}
              </p>
            )}
          </div>

          <CabinetRgpdCard user={user} language={language} isCabinetOwner={isCabinetOwner} />

          {error && !serverField ? <p className="field-error">{error}</p> : null}

          {isCabinetOwner ? (
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
          ) : null}
        </form>
      </div>
    </section>
  );
}
