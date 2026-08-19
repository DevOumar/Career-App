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
  ADMIN_PAGE_SIZE,
  planPriceLabel
} from "../../admin/AdminApp.jsx";
import AccountDrawer from "../../account/AccountDrawer.jsx";
import { ConnectedFooter } from "../../../App.jsx";
import { SchoolExportCsvButton, SchoolLicenseCard, SchoolEmptyState } from "../SchoolApp.jsx";

export default function SchoolSettingsPage({ user, language }) {
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
