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

export default function SchoolPromotionsPage({ user, language }) {
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
      confirmButtonColor: "#f5222d"
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
