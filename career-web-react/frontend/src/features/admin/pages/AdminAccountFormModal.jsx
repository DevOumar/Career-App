import React from "react";
// Fenêtre « Créer un compte » / « Modifier le compte » de l'espace admin,
// sur le modèle de la fenêtre « Inviter un membre » de Jurysia : champs
// étiquetés, erreurs sous chaque champ, choix en cartes radio, résumé final.
// La validation est faite ici ET côté serveur (routes/admin/users.js) : le
// serveur renvoie `code: "field:<nom>"` pour placer l'erreur sous le bon champ.
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { ADMIN_ACCOUNT_TYPES } from "../../../App.jsx";
import { PLANS } from "../../../data/plans.js";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { createAdminUser, updateAdminUser } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, ADMIN_MODULE_DEFS, ADMIN_MODULE_LABELS } from "../AdminApp.jsx";

// Mêmes règles que le serveur.
const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WEBSITE_RE = /^(https?:\/\/)?([\p{L}\d-]+\.)+[\p{L}]{2,}(\/\S*)?$/iu;

const TYPE_META = {
  student: { icon: "profile", fr: "Accès candidat : CV, matching, entretiens.", en: "Candidate access: CV, matching, interviews." },
  school: { icon: "schools", fr: "Espace école : promotions, étudiants, licences.", en: "School space: classes, students, licenses." },
  recruiter_firm: { icon: "cabinets", fr: "Espace cabinet : vivier, missions, recruteurs.", en: "Agency space: pool, missions, recruiters." },
  admin: { icon: "quality", fr: "Accès à l'administration de la plateforme.", en: "Access to platform administration." }
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  accountType: "student",
  planId: "",
  billingCycle: "monthly",
  organizationName: "",
  schoolName: "",
  website: "",
  adminModules: []
};

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(14);
  window.crypto.getRandomValues(bytes);
  let value = Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
  // Garantit au moins une lettre et un chiffre (règle serveur).
  if (!/\d/.test(value)) value = `${value.slice(0, -1)}7`;
  if (!/[a-zA-Z]/.test(value)) value = `K${value.slice(1)}`;
  return value;
}

function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
}

export default function AdminAccountFormModal({ mode = "create", target = null, user, language, onClose, onDone }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const isEdit = mode === "edit";
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          ...EMPTY_FORM,
          firstName: target.firstName || "",
          lastName: target.lastName || "",
          email: target.email || "",
          accountType: target.roleType,
          planId: target.planId || "",
          billingCycle: target.billingCycle || "monthly",
          organizationName: target.organizationName || "",
          website: target.website || "",
          adminModules: target.adminModules || []
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [moduleMode, setModuleMode] = useState(() => (isEdit && target.adminModules?.length ? "custom" : "full"));
  const firstFieldRef = useRef(null);

  useEffect(() => {
    setTimeout(() => firstFieldRef.current?.focus(), 60);
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const segment = ADMIN_ACCOUNT_TYPES.find((item) => item.id === form.accountType)?.segment;
  const plans = PLANS.filter((plan) => plan.segment === segment);
  const selectedPlan = plans.find((plan) => plan.id === form.planId) || null;
  const planHasBothCycles = selectedPlan && selectedPlan.monthlyPrice != null && selectedPlan.annualPrice != null && selectedPlan.monthlyPrice > 0;
  const isOrg = form.accountType === "school" || form.accountType === "recruiter_firm";
  const allModuleIds = ADMIN_MODULE_DEFS.map((item) => item.id);
  const selectedModules = moduleMode === "full" ? allModuleIds : form.adminModules;
  const strength = passwordStrength(form.password);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  }

  function changeType(nextType) {
    setForm((prev) => ({ ...prev, accountType: nextType, planId: "", organizationName: "", website: "", schoolName: "" }));
    setErrors({});
    setFormError("");
  }

  function toggleModule(id) {
    setForm((prev) => {
      const current = prev.adminModules.length ? prev.adminModules : [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, adminModules: next };
    });
    if (errors.adminModules) setErrors((prev) => ({ ...prev, adminModules: undefined }));
  }

  function validate() {
    const next = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName) next.firstName = t("Le prénom est requis.", "First name is required.");
    else if (firstName.length > 60 || !NAME_RE.test(firstName)) next.firstName = t("Prénom invalide (lettres, espaces, tirets).", "Invalid first name (letters, spaces, hyphens).");
    if (!lastName) next.lastName = t("Le nom est requis.", "Last name is required.");
    else if (lastName.length > 60 || !NAME_RE.test(lastName)) next.lastName = t("Nom invalide (lettres, espaces, tirets).", "Invalid last name (letters, spaces, hyphens).");

    if (!isEdit) {
      const email = form.email.trim().toLowerCase();
      if (!email) next.email = t("L'adresse e-mail est requise.", "Email address is required.");
      else if (email.length > 254 || !EMAIL_RE.test(email)) next.email = t("Adresse e-mail invalide (ex. prenom.nom@domaine.com).", "Invalid email address (e.g. first.last@domain.com).");

      if (!form.password) next.password = t("Le mot de passe est requis.", "Password is required.");
      else if (form.password.length < 8) next.password = t("8 caractères minimum.", "At least 8 characters.");
      else if (form.password.length > 128) next.password = t("128 caractères maximum.", "128 characters maximum.");
      else if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) next.password = t("Au moins une lettre et un chiffre.", "At least one letter and one digit.");
    }

    if (isOrg) {
      const name = form.organizationName.trim();
      if (!name) next.organizationName = form.accountType === "school" ? t("Le nom de l'école est requis.", "School name is required.") : t("Le nom du cabinet est requis.", "Agency name is required.");
      else if (name.length > 120) next.organizationName = t("120 caractères maximum.", "120 characters maximum.");
      if (form.website.trim() && !WEBSITE_RE.test(form.website.trim())) next.website = t("Adresse de site invalide (ex. www.ecole.com).", "Invalid website (e.g. www.school.com).");
    }
    if (form.accountType === "student" && form.schoolName.trim().length > 120) next.schoolName = t("120 caractères maximum.", "120 characters maximum.");

    if (form.accountType === "admin" && moduleMode === "custom" && !form.adminModules.length) {
      next.adminModules = t("Cochez au moins un module, ou choisissez l'accès complet.", "Check at least one module, or choose full access.");
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setFormError("");
    const adminModules = form.accountType === "admin" && moduleMode === "custom" ? form.adminModules : [];
    try {
      if (isEdit) {
        await updateAdminUser({
          adminUserId: user.id,
          userId: target.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          organizationName: form.organizationName.trim(),
          website: form.website.trim(),
          planId: form.planId || null,
          billingCycle: form.billingCycle,
          adminModules
        });
        onDone?.({ message: t("Compte mis à jour.", "Account updated.") });
      } else {
        const result = await createAdminUser({
          adminUserId: user.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          accountType: form.accountType,
          planId: form.planId || null,
          billingCycle: form.billingCycle,
          organizationName: form.organizationName.trim(),
          schoolName: form.schoolName.trim(),
          website: form.website.trim(),
          adminModules: form.accountType === "admin" ? adminModules : undefined
        });
        onDone?.({
          message: t("Compte créé.", "Account created."),
          email: form.email.trim().toLowerCase(),
          licenseCode: result.licenseCode || null
        });
      }
      onClose();
    } catch (err) {
      const code = String(err?.code || "");
      if (code.startsWith("field:")) {
        setErrors((prev) => ({ ...prev, [code.slice(6)]: err.message }));
      } else {
        setFormError(getFriendlyErrorMessage(err, language));
      }
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = (id) => {
    const item = ADMIN_ACCOUNT_TYPES.find((entry) => entry.id === id);
    return item?.label?.[language] || item?.label?.fr || id;
  };

  const summary = useMemo(() => {
    const rows = [[t("Type de compte", "Account type"), typeLabel(form.accountType)]];
    if (isEdit && (form.accountType === "student" || form.accountType === "candidate")) {
      rows.push([t("Rattachement", "Affiliation"), affiliationLabel(target?.affiliation, language)]);
      if (target?.affiliation?.licenseCode) rows.push([t("Code utilisé", "Code used"), target.affiliation.licenseCode]);
      if (target?.declaredSchool) rows.push([t("École déclarée", "Declared school"), target.declaredSchool]);
    }
    if (isOrg && form.organizationName.trim()) rows.push([form.accountType === "school" ? t("École", "School") : t("Cabinet", "Agency"), form.organizationName.trim()]);
    if (form.accountType !== "admin") {
      rows.push([
        t("Plan", "Plan"),
        selectedPlan
          ? `${selectedPlan.name[language] || selectedPlan.name.fr}${planHasBothCycles ? ` · ${form.billingCycle === "annual" ? t("annuel", "annual") : t("mensuel", "monthly")}` : ""}`
          : t("Aucun (gratuit)", "None (free)")
      ]);
      if (selectedPlan?.seats) rows.push([t("Code de licence", "License code"), t(`généré automatiquement (${selectedPlan.seats} sièges)`, `generated automatically (${selectedPlan.seats} seats)`)]);
    } else {
      rows.push([t("Modules accessibles", "Accessible modules"), moduleMode === "full" ? t(`Tous (${allModuleIds.length})`, `All (${allModuleIds.length})`) : `${form.adminModules.length} / ${allModuleIds.length}`]);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, moduleMode, selectedPlan, language]);

  const fieldProps = (key) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `acc-${key}-error` : undefined,
    className: errors[key] ? "is-invalid" : undefined
  });
  const fieldError = (key) => (errors[key] ? <p id={`acc-${key}-error`} className="jy-field-error">{errors[key]}</p> : null);

  return (
    <div className="jy-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="jy-modal jy-account-modal" role="dialog" aria-modal="true" aria-labelledby="acc-modal-title" onSubmit={handleSubmit} noValidate>
        <div className="jy-modal-head">
          <h3 id="acc-modal-title">{isEdit ? t("Modifier le compte", "Edit account") : t("Créer un compte", "Create an account")}</h3>
          <button type="button" className="jy-icon-btn" aria-label={t("Fermer", "Close")} onClick={onClose}>
            <AdminLineIcon name="close" />
          </button>
        </div>

        <div className="jy-modal-body">
          {isEdit ? (
            <div className="jy-account-identity">
              <AvatarCircle user={target} />
              <div>
                <strong>{target.email}</strong>
                <span>{typeLabel(target.roleType)}</span>
              </div>
            </div>
          ) : (
            <div className="jy-field">
              <span>{t("Type de compte", "Account type")}</span>
              <div className="jy-radio-cards">
                {ADMIN_ACCOUNT_TYPES.map((item) => (
                  <label key={item.id} className={`jy-radio-card ${form.accountType === item.id ? "is-checked" : ""}`}>
                    <input type="radio" name="accountType" checked={form.accountType === item.id} onChange={() => changeType(item.id)} />
                    <span className="jy-radio-card-icon">
                      <AdminLineIcon name={TYPE_META[item.id]?.icon || "profile"} />
                    </span>
                    <span className="jy-radio-card-text">
                      <strong>{typeLabel(item.id)}</strong>
                      <small>{TYPE_META[item.id]?.[language] || TYPE_META[item.id]?.fr}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="jy-field-grid">
            <label className="jy-field">
              <span>{t("Prénom", "First name")}</span>
              <input ref={firstFieldRef} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="off" maxLength={60} {...fieldProps("firstName")} />
              {fieldError("firstName")}
            </label>
            <label className="jy-field">
              <span>{t("Nom", "Last name")}</span>
              <input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="off" maxLength={60} {...fieldProps("lastName")} />
              {fieldError("lastName")}
            </label>
          </div>

          {!isEdit ? (
            <>
              <label className="jy-field">
                <span>{t("Adresse e-mail", "Email address")}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder={t("prenom.nom@domaine.com", "first.last@domain.com")}
                  autoComplete="off"
                  maxLength={254}
                  {...fieldProps("email")}
                />
                {fieldError("email")}
              </label>

              <div className="jy-field">
                <span>{t("Mot de passe provisoire", "Temporary password")}</span>
                <div className="jy-password-row">
                  <div className={`jy-password-input ${errors.password ? "is-invalid" : ""}`}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      autoComplete="new-password"
                      maxLength={128}
                      aria-label={t("Mot de passe provisoire", "Temporary password")}
                      aria-invalid={Boolean(errors.password)}
                    />
                    <button type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? t("Masquer", "Hide") : t("Afficher", "Show")}>
                      <AdminLineIcon name={showPassword ? "eyeOff" : "eye"} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => {
                      update("password", generatePassword());
                      setShowPassword(true);
                    }}
                  >
                    <AdminLineIcon name="key" /> {t("Générer", "Generate")}
                  </button>
                </div>
                {form.password ? (
                  <div className={`jy-strength s${strength}`} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <small>{[t("Très faible", "Very weak"), t("Faible", "Weak"), t("Moyen", "Fair"), t("Bon", "Good"), t("Robuste", "Strong")][strength]}</small>
                  </div>
                ) : null}
                {fieldError("password") || (
                  <p className="jy-field-hint">{t("8 caractères minimum, avec au moins une lettre et un chiffre.", "At least 8 characters, with at least one letter and one digit.")}</p>
                )}
              </div>
            </>
          ) : null}

          {isOrg ? (
            <div className="jy-field-grid">
              <label className="jy-field">
                <span>{form.accountType === "school" ? t("Nom de l'école", "School name") : t("Nom du cabinet", "Agency name")}</span>
                <input value={form.organizationName} onChange={(event) => update("organizationName", event.target.value)} maxLength={120} {...fieldProps("organizationName")} />
                {fieldError("organizationName")}
              </label>
              <label className="jy-field">
                <span>{t("Site web (facultatif)", "Website (optional)")}</span>
                <input value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="www.exemple.com" maxLength={200} {...fieldProps("website")} />
                {fieldError("website")}
              </label>
            </div>
          ) : null}

          {form.accountType === "student" && !isEdit ? (
            <label className="jy-field">
              <span>{t("École / établissement (facultatif)", "School / institution (optional)")}</span>
              <input value={form.schoolName} onChange={(event) => update("schoolName", event.target.value)} maxLength={120} {...fieldProps("schoolName")} />
              {fieldError("schoolName")}
            </label>
          ) : null}

          {form.accountType !== "admin" ? (
            <div className="jy-field">
              <span>{t("Plan (facultatif)", "Plan (optional)")}</span>
              <select value={form.planId} onChange={(event) => update("planId", event.target.value)} {...fieldProps("planId")}>
                <option value="">{t("Aucun plan (gratuit)", "No plan (free)")}</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name[language] || plan.name.fr}
                  </option>
                ))}
              </select>
              {fieldError("planId")}
              {planHasBothCycles ? (
                <div className="jy-seg jy-cycle-seg" role="radiogroup" aria-label={t("Facturation", "Billing")}>
                  {[
                    { id: "monthly", label: t("Mensuel", "Monthly") },
                    { id: "annual", label: t("Annuel", "Annual") }
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      type="button"
                      role="radio"
                      aria-checked={form.billingCycle === cycle.id}
                      className={form.billingCycle === cycle.id ? "active" : ""}
                      onClick={() => update("billingCycle", cycle.id)}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="jy-field">
              <span>{t("Accès aux modules", "Module access")}</span>
              <div className="jy-radio-list">
                <label className={`jy-radio-row ${moduleMode === "full" ? "is-checked" : ""}`}>
                  <input type="radio" checked={moduleMode === "full"} onChange={() => setModuleMode("full")} />
                  <span>
                    <strong>{t("Accès complet", "Full access")}</strong>
                    <small>{t("L'administrateur voit tous les modules, y compris ceux ajoutés plus tard.", "The administrator sees every module, including future ones.")}</small>
                  </span>
                </label>
                <label className={`jy-radio-row ${moduleMode === "custom" ? "is-checked" : ""}`}>
                  <input
                    type="radio"
                    checked={moduleMode === "custom"}
                    onChange={() => {
                      setModuleMode("custom");
                      if (!form.adminModules.length) setForm((prev) => ({ ...prev, adminModules: ["dashboard"] }));
                    }}
                  />
                  <span>
                    <strong>{t("Personnaliser les accès", "Customize access")}</strong>
                    <small>{t("Cochez précisément les modules visibles.", "Check exactly which modules are visible.")}</small>
                  </span>
                </label>
              </div>
              {moduleMode === "custom" ? (
                <div className={`jy-module-picker ${errors.adminModules ? "is-invalid" : ""}`}>
                  <div className="jy-module-picker-head">
                    <span>
                      {selectedModules.length} / {allModuleIds.length} {t("modules", "modules")}
                    </span>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, adminModules: prev.adminModules.length === allModuleIds.length ? [] : allModuleIds }))}>
                      {form.adminModules.length === allModuleIds.length ? t("Tout décocher", "Uncheck all") : t("Tout cocher", "Check all")}
                    </button>
                  </div>
                  <div className="jy-module-grid">
                    {ADMIN_MODULE_DEFS.map((moduleDef) => {
                      const checked = form.adminModules.includes(moduleDef.id);
                      return (
                        <label key={moduleDef.id} className={`jy-module-check ${checked ? "is-checked" : ""}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleModule(moduleDef.id)} />
                          <AdminLineIcon name={moduleDef.id} />
                          <span>{ADMIN_MODULE_LABELS[moduleDef.id]?.[language] || ADMIN_MODULE_LABELS[moduleDef.id]?.fr}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {fieldError("adminModules")}
            </div>
          )}

          <div className="jy-summary">
            <strong>{t("Résumé", "Summary")}</strong>
            {summary.map(([label, value]) => (
              <p key={label}>
                {label} : <span>{value}</span>
              </p>
            ))}
          </div>

          {!isEdit ? (
            <div className="jy-notice">
              <AdminLineIcon name="help" />
              <p>
                {t(
                  "Le compte est actif immédiatement. Transmettez le mot de passe provisoire à la personne : elle pourra le modifier depuis son profil.",
                  "The account is active immediately. Share the temporary password with the person: they can change it from their profile."
                )}
              </p>
            </div>
          ) : null}

          {formError ? <p className="field-error">{formError}</p> : null}
        </div>

        <div className="jy-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("Annuler", "Cancel")}
          </button>
          <button type="submit" className="btn-main ready" disabled={saving}>
            {saving ? <span className="btn-spinner" /> : <AdminLineIcon name={isEdit ? "edit" : "plus"} />}{" "}
            {saving ? t("Enregistrement…", "Saving…") : isEdit ? t("Enregistrer", "Save") : t("Créer le compte", "Create account")}
          </button>
        </div>
      </form>
    </div>
  );
}

// « École : HETIC (contact Awa Diallo) » / « Aucun (candidat solo) ».
export function affiliationLabel(affiliation, language) {
  const t = (fr, en) => (language === "en" ? en : fr);
  if (!affiliation) return t("Aucun (candidat solo)", "None (solo candidate)");
  const kind = affiliation.type === "school" ? t("École", "School") : t("Cabinet", "Agency");
  const contact = affiliation.contactName && affiliation.contactName !== affiliation.organizationName ? ` (${t("contact", "contact")} ${affiliation.contactName})` : "";
  return `${kind} : ${affiliation.organizationName || "-"}${contact}`;
}

// Toast de succès, avec le code de licence copiable s'il a été généré.
export function announceAccountResult(result, language) {
  const t = (fr, en) => (language === "en" ? en : fr);
  if (result?.licenseCode) {
    Swal.fire({
      icon: "success",
      title: result.message,
      html: `<p style="margin:0 0 .5rem">${t("Code de licence généré :", "Generated license code:")}</p><code style="font-size:1.05rem;padding:.3rem .6rem;border-radius:6px;background:#f3f1ec">${result.licenseCode}</code>`,
      confirmButtonText: t("Copier le code", "Copy code"),
      showCancelButton: true,
      cancelButtonText: t("Fermer", "Close"),
      confirmButtonColor: "#b83309"
    }).then((choice) => {
      if (choice.isConfirmed) navigator.clipboard?.writeText(result.licenseCode).catch(() => {});
    });
    return;
  }
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: result?.message,
    showConfirmButton: false,
    timer: 2600,
    timerProgressBar: true,
    customClass: { popup: "career-toast", title: "career-toast-title" }
  });
}
