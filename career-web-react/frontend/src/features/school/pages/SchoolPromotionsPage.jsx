import React, { useEffect, useMemo, useState } from "react";
// Espace École › Promotions : organiser les étudiants par programme, niveau,
// campus et année académique. Une carte par promotion (indicateurs issus de
// /school/promotions/compare), un panneau latéral pour la gérer (étudiants,
// affectation, suppression) et une fenêtre de création validée.
import Swal from "sweetalert2";
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import {
  createSchoolPromotion,
  deleteSchoolPromotion,
  getSchoolPromotions,
  getSchoolPromotionsCompare,
  updateSchoolPromotion,
  updateSchoolPromotionStudent
} from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { MfaDialog, MfaError } from "../../account/mfa/MfaUi.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";

const LEVEL_OPTIONS = ["L1", "L2", "L3", "M1", "M2", "BUT1", "BUT2", "BUT3", "BTS1", "BTS2", "Prépa", "Bachelor", "MBA", "Doctorat"];
const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;
const EMPTY_FORM = { name: "", program: "", level: "", campus: "", academicYear: "" };

function academicYearOptions() {
  // Deux ans en arrière (promotions diplômées, encore consultables) à trois
  // ans devant (inscriptions anticipées).
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => `${current - 2 + index}-${current - 1 + index}`);
}

// Initiales d'une promotion pour sa pastille (ex. « Promo Data & IA » -> PD).
const promoInitials = (name = "") =>
  name
    .split(/[\s&-]+/)
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "P";

const scoreTone = (score) => (score == null ? "" : score >= 60 ? "good" : score >= 50 ? "mid" : "low");

export default function SchoolPromotionsPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState({});
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [assignId, setAssignId] = useState("");
  const [busy, setBusy] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  // null : création ; sinon, id de la promotion modifiée.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formTouched, setFormTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    getSchoolPromotions(user.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getSchoolPromotionsCompare(user.id)
      .then((items) => setStats(Object.fromEntries((items || []).map((item) => [item.id, item]))))
      .catch(() => setStats({}));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const students = data?.students || [];
  const promotions = data?.items || [];
  const studentById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);
  const assignedAnywhere = new Set(promotions.flatMap((item) => item.studentIds || []).filter((id) => studentById[id]));
  const unassigned = students.filter((student) => !assignedAnywhere.has(student.id));
  const years = [...new Set(promotions.map((item) => item.academicYear).filter(Boolean))].sort();
  const levels = [...new Set(promotions.map((item) => item.level).filter(Boolean))];
  const scored = promotions.map((item) => stats[item.id]?.avgScore).filter((score) => typeof score === "number");
  const avgScore = scored.length ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : null;

  const term = query.trim().toLowerCase();
  const visible = promotions.filter(
    (item) =>
      (!yearFilter || item.academicYear === yearFilter) &&
      (!levelFilter || item.level === levelFilter) &&
      (!term || [item.name, item.program, item.campus, item.level, item.academicYear].some((value) => String(value || "").toLowerCase().includes(term)))
  );
  const selected = promotions.find((item) => item.id === selectedId) || null;
  const membersOf = (item) => (item?.studentIds || []).map((id) => studentById[id]).filter(Boolean);

  // ------------------------------------------------------------- création
  const nameError = form.name.trim().length < 2 ? t("Au moins 2 caractères.", "At least 2 characters.") : "";
  const yearError = form.academicYear && !ACADEMIC_YEAR_PATTERN.test(form.academicYear) ? t("Format AAAA-AAAA (ex. 2025-2026).", "Format YYYY-YYYY (e.g. 2025-2026).") : "";
  const duplicate = promotions.some(
    (item) =>
      item.id !== editingId &&
      item.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
      (item.academicYear || "") === (form.academicYear || "")
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormTouched(false);
    setFormError("");
    setCreateOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      program: item.program || "",
      level: item.level || "",
      campus: item.campus || "",
      academicYear: item.academicYear || ""
    });
    setFormTouched(false);
    setFormError("");
    setCreateOpen(true);
  }

  async function submitCreate(event) {
    event?.preventDefault();
    setFormTouched(true);
    if (nameError || yearError) return;
    if (duplicate) {
      setFormError(t("Une promotion porte déjà ce nom pour cette année académique.", "A promotion already has this name for this academic year."));
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = { ...form, name: form.name.trim(), program: form.program.trim(), campus: form.campus.trim() };
      if (editingId) await updateSchoolPromotion(user.id, editingId, payload);
      else await createSchoolPromotion(user.id, payload);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setFormTouched(false);
      reload();
      toast(editingId ? t("Promotion modifiée.", "Promotion updated.") : t("Promotion créée.", "Promotion created."));
      setEditingId(null);
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, language));
    } finally {
      setSaving(false);
    }
  }

  function toast(title) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title,
      showConfirmButton: false,
      timer: 2200,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  // ------------------------------------------------------------- gestion
  async function remove(item) {
    const result = await Swal.fire({
      icon: "warning",
      title: t("Supprimer cette promotion ?", "Delete this promotion?"),
      html: `<p style="margin:0">${item.name}</p><p style="margin:0.6rem 0 0;color:#6d7269">${t(
        "Les étudiants restent rattachés à votre établissement : seule la promotion disparaît.",
        "Students stay linked to your institution: only the promotion is removed."
      )}</p>`,
      showCancelButton: true,
      confirmButtonText: t("Supprimer", "Delete"),
      cancelButtonText: t("Annuler", "Cancel"),
      confirmButtonColor: "#b3261e",
      focusCancel: true
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSchoolPromotion(user.id, item.id);
      setSelectedId("");
      reload();
      toast(t("Promotion supprimée.", "Promotion deleted."));
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    }
  }

  async function updateStudent(item, action, studentId) {
    if (!studentId) return;
    setBusy(`${action}-${studentId}`);
    try {
      await updateSchoolPromotionStudent(user.id, item.id, studentId, action);
      setAssignId("");
      reload();
    } catch (err) {
      Swal.fire({ icon: "error", title: getFriendlyErrorMessage(err, language) });
    } finally {
      setBusy("");
    }
  }

  if (error) return <p className="field-error">{error}</p>;
  if (!data) return <AdminPageLoader language={language} />;

  const cards = [
    { icon: "layers", label: t("Promotions", "Promotions"), value: promotions.length, tone: "" },
    { icon: "accounts", label: t("Étudiants affectés", "Assigned students"), value: `${assignedAnywhere.size} / ${students.length}`, tone: "green" },
    { icon: "alert", label: t("Sans promotion", "Without promotion"), value: unassigned.length, tone: unassigned.length ? "gold" : "" },
    { icon: "trend", label: t("Score moyen", "Average score"), value: avgScore == null ? "-" : `${avgScore} %`, tone: "gold" }
  ];

  const exportColumns = [
    { key: "name", label: t("Promotion", "Promotion"), exportValue: (item) => item.name },
    { key: "program", label: t("Programme", "Program"), exportValue: (item) => item.program || "" },
    { key: "level", label: t("Niveau", "Level"), exportValue: (item) => item.level || "" },
    { key: "campus", label: t("Campus", "Campus"), exportValue: (item) => item.campus || "" },
    { key: "year", label: t("Année académique", "Academic year"), exportValue: (item) => item.academicYear || "" },
    { key: "students", label: t("Étudiants", "Students"), exportValue: (item) => membersOf(item).length },
    { key: "activation", label: t("Activation (%)", "Activation (%)"), exportValue: (item) => stats[item.id]?.activationRate ?? "" },
    { key: "score", label: t("Score moyen (%)", "Average score (%)"), exportValue: (item) => stats[item.id]?.avgScore ?? "" },
    { key: "inactive", label: t("Inactifs 30 j+", "Inactive 30+ days"), exportValue: (item) => stats[item.id]?.inactiveCount ?? 0 },
    { key: "created", label: t("Créée le", "Created on"), exportValue: (item) => formatDateTime(item.createdAt, language) }
  ];
  const exportFilters = [
    term ? `${t("Recherche", "Search")} : ${query.trim()}` : "",
    yearFilter ? `${t("Année", "Year")} : ${yearFilter}` : "",
    levelFilter ? `${t("Niveau", "Level")} : ${levelFilter}` : ""
  ].filter(Boolean);

  const selectedStats = selected ? stats[selected.id] || {} : {};
  const selectedMembers = membersOf(selected);
  const available = selected ? students.filter((student) => !(selected.studentIds || []).includes(student.id)) : [];

  return (
    <section className="school-promotions">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Promotions", "Promotions")}</h2>
          <p>{t("Organisez vos étudiants par programme, niveau, campus et année académique.", "Organize your students by program, level, campus and academic year.")}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="jy-btn jy-btn-primary" onClick={openCreate}>
            <AdminLineIcon name="plus" />
            {t("Nouvelle promotion", "New promotion")}
          </button>
        </div>
      </header>

      <div className="jy-mini-cards">
        {cards.map((card) => (
          <div key={card.label} className="jy-mini-card">
            <span className="jy-mini-card-label">
              <AdminLineIcon name={card.icon} />
              {card.label}
            </span>
            <strong className={card.tone}>{card.value}</strong>
          </div>
        ))}
      </div>

      {unassigned.length && promotions.length ? (
        <div className="jy-callout">
          <AdminLineIcon name="alert" />
          <span>
            {t(
              `${unassigned.length} étudiant(s) ne sont dans aucune promotion : ouvrez une promotion pour les y affecter.`,
              `${unassigned.length} student(s) aren't in any promotion: open a promotion to assign them.`
            )}
          </span>
        </div>
      ) : null}

      <div className="admin-table-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Rechercher une promotion, un programme, un campus…", "Search a promotion, program, campus…")} />
        <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} aria-label={t("Année académique", "Academic year")}>
          <option value="">{t("Toutes les années", "All years")}</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label={t("Niveau", "Level")}>
          <option value="">{t("Tous les niveaux", "All levels")}</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Promotions", "Promotions")} fileBase="promotions" columns={exportColumns} rows={visible} filters={exportFilters} />
        </div>
      </div>

      {visible.length ? (
        <div className="jy-promo-grid">
          {visible.map((item) => {
            const itemStats = stats[item.id] || {};
            const members = membersOf(item);
            return (
              <button type="button" key={item.id} className={`jy-promo-card ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className="jy-promo-head">
                  <span className="jy-promo-badge">{promoInitials(item.name)}</span>
                  <span className="jy-promo-title">
                    <strong>{item.name}</strong>
                    <small>{item.program || t("Programme non renseigné", "No program")}</small>
                  </span>
                  <AdminLineIcon name="chevronRight" className="jy-promo-chevron" />
                </span>
                <span className="jy-promo-tags">
                  {item.level ? <span className="jy-chip small">{item.level}</span> : null}
                  {item.campus ? <span className="jy-chip small">{item.campus}</span> : null}
                  {item.academicYear ? <span className="jy-chip small">{item.academicYear}</span> : null}
                </span>
                <span className="jy-promo-stats">
                  <span>
                    <strong>{members.length}</strong>
                    <small>{t("étudiants", "students")}</small>
                  </span>
                  <span>
                    <strong>{itemStats.activationRate != null ? `${itemStats.activationRate} %` : "-"}</strong>
                    <small>{t("activation", "activation")}</small>
                  </span>
                  <span>
                    <strong className={`jy-score-text ${scoreTone(itemStats.avgScore)}`}>{itemStats.avgScore != null ? `${itemStats.avgScore} %` : "-"}</strong>
                    <small>{t("score moyen", "avg. score")}</small>
                  </span>
                  <span>
                    <strong className={itemStats.inactiveCount ? "warn" : ""}>{itemStats.inactiveCount ?? 0}</strong>
                    <small>{t("inactifs", "inactive")}</small>
                  </span>
                </span>
                <span className="jy-promo-foot">
                  <span className="jy-avatar-stack">
                    {members.slice(0, 5).map((student) => (
                      <AvatarCircle key={student.id} user={student} />
                    ))}
                    {members.length > 5 ? <span className="jy-avatar-more">+{members.length - 5}</span> : null}
                  </span>
                  <small>
                    {t("Créée le", "Created on")} {formatDateTime(item.createdAt, language)}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="layers" />
          </span>
          <strong>{promotions.length ? t("Aucune promotion ne correspond.", "No promotion matches.") : t("Aucune promotion pour le moment", "No promotion yet")}</strong>
          <span>
            {promotions.length
              ? t("Modifiez la recherche ou les filtres.", "Change the search or filters.")
              : t("Créez une première promotion pour regrouper vos étudiants et comparer leurs résultats.", "Create a first promotion to group your students and compare their results.")}
          </span>
          {!promotions.length ? (
            <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" onClick={openCreate}>
              <AdminLineIcon name="plus" />
              {t("Nouvelle promotion", "New promotion")}
            </button>
          ) : null}
        </div>
      )}

      {/* ------------------------------------------------ Panneau latéral : gérer une promotion */}
      <JyDrawer
        open={Boolean(selected)}
        onClose={() => {
          setSelectedId("");
          setAssignId("");
        }}
        language={language}
        avatar={selected ? <span className="jy-promo-badge large">{promoInitials(selected.name)}</span> : null}
        title={selected?.name || ""}
        subtitle={selected ? selected.program || t("Programme non renseigné", "No program") : ""}
        badges={
          selected ? (
            <>
              {selected.level ? <span className="tag">{selected.level}</span> : null}
              {selected.academicYear ? <span className="tag">{selected.academicYear}</span> : null}
              {selected.campus ? <span className="tag">{selected.campus}</span> : null}
            </>
          ) : null
        }
        sections={
          selected
            ? [
                {
                  title: t("Indicateurs", "Indicators"),
                  rows: [
                    [t("Étudiants", "Students"), String(selectedMembers.length)],
                    [t("Taux d'activation", "Activation rate"), selectedStats.activationRate != null ? `${selectedStats.activationRate} %` : "-"],
                    [t("Score moyen", "Average score"), selectedStats.avgScore != null ? `${selectedStats.avgScore} %` : "-"],
                    [t("Inactifs depuis 30 j+", "Inactive 30+ days"), String(selectedStats.inactiveCount ?? 0)],
                    [t("Sans CV", "Without CV"), String(selectedStats.withoutCvCount ?? 0)],
                    [t("Créée le", "Created on"), formatDateTime(selected.createdAt, language)]
                  ]
                },
                {
                  title: `${t("Étudiants", "Students")} (${selectedMembers.length})`,
                  content: (
                    <div className="jy-promo-members">
                      <div className="jy-promo-assign">
                        <select value={assignId} onChange={(event) => setAssignId(event.target.value)} aria-label={t("Affecter un étudiant", "Assign a student")}>
                          <option value="">{available.length ? t("Affecter un étudiant…", "Assign a student…") : t("Tous les étudiants sont affectés", "All students are assigned")}</option>
                          {available.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.firstName} {student.lastName} · {student.email}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" disabled={!assignId || Boolean(busy)} onClick={() => updateStudent(selected, "add", assignId)}>
                          <AdminLineIcon name="plus" />
                          {t("Ajouter", "Add")}
                        </button>
                      </div>
                      {selectedMembers.length ? (
                        <ul className="jy-member-list">
                          {selectedMembers.map((student) => (
                            <li key={student.id}>
                              <AvatarCircle user={student} />
                              <span>
                                <strong>
                                  {student.firstName} {student.lastName}
                                </strong>
                                <small>{student.email}</small>
                              </span>
                              <button
                                type="button"
                                className="admin-row-action danger icon-only"
                                title={t("Retirer de la promotion", "Remove from promotion")}
                                aria-label={t("Retirer de la promotion", "Remove from promotion")}
                                disabled={Boolean(busy)}
                                onClick={() => updateStudent(selected, "remove", student.id)}
                              >
                                <AdminLineIcon name="close" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="jy-drawer-empty">{t("Aucun étudiant dans cette promotion.", "No student in this promotion.")}</p>
                      )}
                    </div>
                  )
                },
                selectedStats.topSkills?.length
                  ? {
                      title: t("Compétences les plus présentes", "Most common skills"),
                      content: (
                        <div className="jy-chip-cloud">
                          {selectedStats.topSkills.map((skill) => (
                            <span key={skill.label} className="jy-chip small">
                              {skill.label}
                            </span>
                          ))}
                        </div>
                      )
                    }
                  : null
              ]
            : []
        }
        footer={
          selected ? (
            <>
              <button type="button" className="admin-row-action" onClick={() => openEdit(selected)}>
                <AdminLineIcon name="edit" /> {t("Modifier", "Edit")}
              </button>
              <button type="button" className="admin-row-action danger" onClick={() => remove(selected)}>
                <AdminLineIcon name="trash" /> {t("Supprimer", "Delete")}
              </button>
            </>
          ) : null
        }
      />

      {/* ------------------------------------------------ Création */}
      <MfaDialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        icon={editingId ? "edit" : "plus"}
        title={editingId ? t("Modifier la promotion", "Edit promotion") : t("Nouvelle promotion", "New promotion")}
        description={
          editingId
            ? t("Les étudiants affectés restent dans la promotion.", "Assigned students stay in the promotion.")
            : t("Regroupez des étudiants pour suivre et comparer leurs résultats.", "Group students to follow and compare their results.")
        }
        width={560}
        footer={
          <>
            <button type="button" className="mfa-btn ghost" onClick={() => setCreateOpen(false)} disabled={saving}>
              {t("Annuler", "Cancel")}
            </button>
            <button type="button" className="mfa-btn primary" onClick={submitCreate} disabled={saving}>
              {saving ? <span className="mfa-spinner" /> : null}
              {editingId ? t("Enregistrer", "Save") : t("Créer la promotion", "Create promotion")}
            </button>
          </>
        }
      >
        <MfaError message={formError} />
        <form className="jy-promo-form" onSubmit={submitCreate} noValidate>
          <label className={`mfa-field wide ${formTouched && nameError ? "has-error" : ""}`}>
            <span>{t("Nom de la promotion", "Promotion name")} *</span>
            <input autoFocus maxLength={80} value={form.name} placeholder={t("Ex. Master Data & IA", "e.g. Data & AI Master")} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            {formTouched && nameError ? <small className="jy-field-error">{nameError}</small> : null}
          </label>
          <label className="mfa-field wide">
            <span>{t("Programme", "Program")}</span>
            <input maxLength={80} value={form.program} placeholder={t("Ex. Data & Intelligence Artificielle", "e.g. Data & Artificial Intelligence")} onChange={(event) => setForm({ ...form, program: event.target.value })} />
          </label>
          <label className="mfa-field">
            <span>{t("Niveau", "Level")}</span>
            <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="">{t("Choisir…", "Choose…")}</option>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className={`mfa-field ${formTouched && yearError ? "has-error" : ""}`}>
            <span>{t("Année académique", "Academic year")}</span>
            <select value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })}>
              <option value="">{t("Choisir…", "Choose…")}</option>
              {academicYearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {formTouched && yearError ? <small className="jy-field-error">{yearError}</small> : null}
          </label>
          <label className="mfa-field wide">
            <span>{t("Campus", "Campus")}</span>
            <input maxLength={80} value={form.campus} placeholder={t("Ex. Campus Paris", "e.g. Paris campus")} onChange={(event) => setForm({ ...form, campus: event.target.value })} />
          </label>
        </form>
      </MfaDialog>
    </section>
  );
}
