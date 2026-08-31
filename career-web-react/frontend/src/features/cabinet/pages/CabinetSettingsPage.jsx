import React from "react";
import { useState, useEffect } from "react";
import { UiIcon } from "../../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { getCabinetProfile, updateCabinetProfile } from "../../../lib/inMemoryDb.js";
import { fileToBase64 } from "../../../lib/cvService.js";
import { cabinetToast } from "./cabinetToast.js";

export default function CabinetSettingsPage({ user, language, isCabinetOwner = true }) {
  const copy =
    language === "en"
      ? {
          title: "Firm settings",
          subtitle: "Information shown to your invited recruiters.",
          logo: "Firm logo",
          logoUpload: "Upload logo",
          logoRemove: "Remove logo",
          logoInvalid: "Please select an image file.",
          logoError: "Unable to read this image.",
          organizationName: "Firm name",
          website: "Website",
          address: "Address",
          city: "City",
          country: "Country",
          contactEmail: "Contact email",
          contactPhone: "Contact phone",
          primaryContactName: "Primary contact",
          description: "Description (shown on your public page)",
          publicPage: "Public recruitment page",
          publicPageHint: "Publish an unauthenticated page listing your open missions — shareable with candidates.",
          publicLink: "Public link",
          save: "Save",
          saved: "Saved.",
          ownerOnly: "Only the firm's owner account can edit these settings."
        }
      : {
          title: "Paramètres du cabinet",
          subtitle: "Informations affichées à vos recruteurs invités.",
          logo: "Logo du cabinet",
          logoUpload: "Télécharger le logo",
          logoRemove: "Supprimer le logo",
          logoInvalid: "Veuillez sélectionner une image.",
          logoError: "Impossible de lire cette image.",
          organizationName: "Nom du cabinet",
          website: "Site web",
          address: "Adresse",
          city: "Ville",
          country: "Pays",
          contactEmail: "Email de contact",
          contactPhone: "Téléphone de contact",
          primaryContactName: "Contact principal",
          description: "Description (affichée sur votre page publique)",
          publicPage: "Page publique de recrutement",
          publicPageHint: "Publiez une page sans connexion listant vos missions ouvertes — partageable avec des candidats.",
          publicLink: "Lien public",
          save: "Enregistrer",
          saved: "Enregistré.",
          ownerOnly: "Seul le compte titulaire du cabinet peut modifier ces paramètres."
        };

  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCabinetProfile(user.id)
      .then((data) => setForm(data.profile))
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError(copy.logoInvalid);
      event.target.value = "";
      return;
    }
    try {
      // fileToBase64 renvoie le base64 brut sans préfixe "data:" — on
      // reconstruit une vraie data URL avec son type MIME pour <img src>.
      const content = await fileToBase64(file);
      setForm((prev) => ({ ...prev, logoDataUrl: `data:${file.type};base64,${content}` }));
    } catch (_error) {
      setError(copy.logoError);
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await updateCabinetProfile(user.id, form);
      if (result?.publicSlug !== undefined) {
        setForm((prev) => ({ ...prev, publicSlug: result.publicSlug }));
      }
      cabinetToast({ title: copy.saved });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="extracting-state"><div className="loader-ring" /></div>;

  const publicUrl = form.publicPageEnabled && form.publicSlug ? `${window.location.origin}${window.location.pathname}#/cabinet/${form.publicSlug}` : "";

  return (
    <section className="cv-history-page cabinet-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="settings" />
          </span>
          <div>
            <h2>{copy.title}</h2>
            <p className="muted">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {!isCabinetOwner ? (
        <div className="card block">
          <p className="muted">{copy.ownerOnly}</p>
        </div>
      ) : null}

      <fieldset disabled={!isCabinetOwner} style={{ border: "none", padding: 0, margin: 0 }}>
        <form className="card block application-form" onSubmit={submit}>
          <label>
            {copy.logo}
            <div className="school-logo-editor">
              <span className="school-logo-preview">
                {form.logoDataUrl ? <img src={form.logoDataUrl} alt="" /> : <UiIcon name="briefcase" />}
              </span>
              <label className="btn-ghost">
                <UiIcon name="upload" />
                {copy.logoUpload}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoUpload} disabled={!isCabinetOwner} />
              </label>
              {form.logoDataUrl ? (
                <button type="button" className="admin-row-action danger" onClick={() => setForm((prev) => ({ ...prev, logoDataUrl: "" }))}>
                  {copy.logoRemove}
                </button>
              ) : null}
            </div>
          </label>
          <input value={form.organizationName} onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))} placeholder={copy.organizationName} />
          <input value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} placeholder={copy.website} />
          <input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder={copy.address} />
          <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} placeholder={copy.city} />
          <input value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} placeholder={copy.country} />
          <input value={form.contactEmail} onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))} placeholder={copy.contactEmail} />
          <input value={form.contactPhone} onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))} placeholder={copy.contactPhone} />
          <input value={form.primaryContactName} onChange={(event) => setForm((prev) => ({ ...prev, primaryContactName: event.target.value }))} placeholder={copy.primaryContactName} />
          <textarea rows={3} value={form.description || ""} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={copy.description} />

          <label className="cabinet-checkbox-filter">
            <input
              type="checkbox"
              checked={Boolean(form.publicPageEnabled)}
              onChange={(event) => setForm((prev) => ({ ...prev, publicPageEnabled: event.target.checked }))}
            />
            {copy.publicPage}
          </label>
          <p className="field-hint">{copy.publicPageHint}</p>
          {publicUrl ? (
            <p className="field-hint success">
              {copy.publicLink}: <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
            </p>
          ) : null}

          {error ? <p className="field-error">{error}</p> : null}
          <button type="submit" className="btn-main ready" disabled={saving}>{copy.save}</button>
        </form>
      </fieldset>
    </section>
  );
}
