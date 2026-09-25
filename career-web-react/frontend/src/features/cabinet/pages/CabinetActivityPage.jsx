import React, { useEffect, useState } from "react";
// Espace Cabinet › Journal d'activité : historique des actions de l'équipe
// (qui a fait quoi, quand), filtrable par membre, type et période.
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getCabinetActivity } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, AdminPagination, ADMIN_PAGE_SIZE } from "../../admin/AdminApp.jsx";
import { AdminAdvancedFilters, AdminExportMenu, inAdminDateRange } from "../../admin/AdminListTools.jsx";
import { candidateStatusLabel, missionStatusLabel } from "./cabinetUi.jsx";

const INVOICE_STATUS = { draft: { fr: "brouillon", en: "draft" }, sent: { fr: "émise", en: "issued" }, paid: { fr: "payée", en: "paid" }, cancelled: { fr: "annulée", en: "cancelled" } };
const INTERVIEW_STATUS = { planned: { fr: "planifié", en: "planned" }, done: { fr: "réalisé", en: "done" }, cancelled: { fr: "annulé", en: "cancelled" }, no_show: { fr: "absent", en: "no-show" } };
const CONSENT = { pending: { fr: "en attente", en: "pending" }, granted: { fr: "accordé", en: "granted" }, refused: { fr: "refusé", en: "refused" }, anonymized: { fr: "anonymisé", en: "anonymized" } };

// Libellé lisible et icône de chaque action enregistrée par le serveur.
function describe(item, language) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const l = language === "en" ? "en" : "fr";
  const d = item.details || {};
  const target = item.entityLabel ? ` « ${item.entityLabel} »` : "";
  const onMission = d.missionTitle ? t(` sur la mission « ${d.missionTitle} »`, ` on mission “${d.missionTitle}”`) : "";
  const map = {
    candidate_created: ["accounts", t(`a ajouté le candidat${target}${d.fromCv ? " (depuis un CV)" : ""}`, `added candidate${target}${d.fromCv ? " (from a CV)" : ""}`)],
    candidate_updated: ["edit", t(`a modifié la fiche${target}`, `edited profile${target}`)],
    candidate_status_changed: ["trend", t(`a fait passer${target} de « ${candidateStatusLabel(d.from, language)} » à « ${candidateStatusLabel(d.to, language)} »`, `moved${target} from “${candidateStatusLabel(d.from, language)}” to “${candidateStatusLabel(d.to, language)}”`)],
    candidate_consent_changed: ["quality", t(`a mis à jour le consentement RGPD de${target} : ${CONSENT[d.to]?.[l] || d.to}`, `updated GDPR consent of${target}: ${CONSENT[d.to]?.[l] || d.to}`)],
    candidate_deleted: ["trash", t(`a supprimé le candidat${target}`, `deleted candidate${target}`)],
    candidate_note_added: ["paragraph", t(`a ajouté une note sur un candidat`, `added a note on a candidate`)],
    candidate_emailed: ["send", t(`a envoyé un e-mail à${target}${d.subject ? ` : « ${d.subject} »` : ""}`, `emailed${target}${d.subject ? `: “${d.subject}”` : ""}`)],
    candidate_email_failed: ["alert", t(`n'a pas pu envoyer d'e-mail à${target}`, `failed to email${target}`)],
    candidate_ai_analyzed: ["trend", t(`a lancé l'analyse IA de${target}${onMission} (score ${d.score ?? "-"} %)`, `ran the AI analysis of${target}${onMission} (score ${d.score ?? "-"}%)`)],
    candidate_data_exported: ["download", t(`a exporté les données RGPD de${target}`, `exported GDPR data of${target}`)],
    candidates_anonymized: ["reset", t(`a anonymisé ${d.count ?? ""} candidat(s)${d.automatic ? " (conservation expirée)" : ""}`, `anonymized ${d.count ?? ""} candidate(s)${d.automatic ? " (retention expired)" : ""}`)],
    mission_created: ["briefcase", t(`a créé la mission${target}`, `created mission${target}`)],
    mission_updated: ["edit", t(`a modifié la mission${target}`, `edited mission${target}`)],
    mission_status_changed: ["briefcase", t(`a passé la mission${target} de « ${missionStatusLabel(d.from, language)} » à « ${missionStatusLabel(d.to, language)} »`, `moved mission${target} from “${missionStatusLabel(d.from, language)}” to “${missionStatusLabel(d.to, language)}”`)],
    mission_amount_updated: ["finance", t(`a saisi les honoraires de la mission${target}`, `entered the fees of mission${target}`)],
    mission_deleted: ["trash", t(`a supprimé la mission${target}`, `deleted mission${target}`)],
    mission_duplicated: ["layers", t(`a dupliqué une mission :${target}`, `duplicated a mission:${target}`)],
    mission_candidate_added: ["plus", t(`a affecté${target}${onMission}`, `assigned${target}${onMission}`)],
    mission_candidate_removed: ["close", t(`a retiré${target}${onMission}`, `removed${target}${onMission}`)],
    mission_stage_changed: ["trend", t(`a fait passer${target}${onMission} à « ${candidateStatusLabel(d.to, language)} »`, `moved${target}${onMission} to “${candidateStatusLabel(d.to, language)}”`)],
    interview_scheduled: ["calendar", t(`a planifié un entretien avec${target}${d.scheduledAt ? ` le ${formatDateTime(d.scheduledAt, language)}` : ""}`, `scheduled an interview with${target}${d.scheduledAt ? ` on ${formatDateTime(d.scheduledAt, language)}` : ""}`)],
    interview_status_changed: ["calendar", t(`a marqué l'entretien avec${target} comme ${INTERVIEW_STATUS[d.to]?.[l] || d.to}`, `marked the interview with${target} as ${INTERVIEW_STATUS[d.to]?.[l] || d.to}`)],
    interview_deleted: ["trash", t(`a supprimé un entretien`, `deleted an interview`)],
    client_created: ["cabinets", t(`a ajouté le client${target}`, `added client${target}`)],
    client_updated: ["edit", t(`a modifié le client${target}`, `edited client${target}`)],
    client_deleted: ["trash", t(`a supprimé le client${target}`, `deleted client${target}`)],
    invoice_created: ["fileText", t(`a créé la facture${target}`, `created invoice${target}`)],
    invoice_status_changed: ["fileText", t(`a passé la facture${target} en ${INVOICE_STATUS[d.to]?.[l] || d.to}`, `set invoice${target} to ${INVOICE_STATUS[d.to]?.[l] || d.to}`)],
    invoice_deleted: ["trash", t(`a supprimé le brouillon${target}`, `deleted draft${target}`)],
    rgpd_settings_updated: ["settings", t(`a réglé la conservation des données à ${d.retentionMonths} mois${d.autoAnonymize ? " (anonymisation automatique)" : ""}`, `set data retention to ${d.retentionMonths} months${d.autoAnonymize ? " (automatic anonymization)" : ""}`)]
  };
  return map[item.action] || ["activity", item.action];
}

const TYPE_LABELS = { candidate: { fr: "Candidats", en: "Candidates" }, mission: { fr: "Missions", en: "Missions" }, client: { fr: "Clients", en: "Clients" }, invoice: { fr: "Factures", en: "Invoices" }, settings: { fr: "Paramètres", en: "Settings" } };

export default function CabinetActivityPage({ user, language }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ actor: "", type: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    getCabinetActivity(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }, [user.id, language]);
  useEffect(() => setPage(1), [search, filters]);

  if (error) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const actors = [...new Set(items.map((item) => item.actorName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const filterFields = [
    { key: "actor", label: t("Membre de l'équipe", "Team member"), allLabel: t("Toute l'équipe", "Whole team"), options: actors.map((name) => ({ value: name, label: name })) },
    { key: "type", label: t("Type", "Type"), allLabel: t("Tous les types", "All types"), options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label: label[language === "en" ? "en" : "fr"] })) },
    { key: "date", label: t("Entre le", "Between"), type: "dateRange" }
  ];
  const needle = search.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const [, text] = describe(item, language);
    return (
      (!filters.actor || item.actorName === filters.actor) &&
      (!filters.type || item.entityType === filters.type) &&
      inAdminDateRange(item.createdAt, filters.dateFrom, filters.dateTo) &&
      (!needle || `${item.actorName} ${text}`.toLowerCase().includes(needle))
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);
  const weekAgo = Date.now() - 7 * 86400000;
  const lastWeek = items.filter((item) => new Date(item.createdAt).getTime() >= weekAgo);
  const topActor = (() => {
    const counts = {};
    for (const item of lastWeek) if (item.actorName) counts[item.actorName] = (counts[item.actorName] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  })();

  const cards = [
    { icon: "activity", label: t("Actions enregistrées", "Recorded actions"), value: items.length, tone: "" },
    { icon: "clock", label: t("Ces 7 derniers jours", "Last 7 days"), value: lastWeek.length, tone: "green" },
    { icon: "profile", label: t("Membres actifs (7 j)", "Active members (7 d)"), value: new Set(lastWeek.map((item) => item.actorName).filter(Boolean)).size, tone: "gold" },
    { icon: "quality", label: t("Le plus actif (7 j)", "Most active (7 d)"), value: topActor ? topActor[0] : "-", tone: "" }
  ];

  const exportColumns = [
    { key: "date", label: t("Date", "Date"), exportValue: (item) => formatDateTime(item.createdAt, language) },
    { key: "actor", label: t("Membre", "Member"), exportValue: (item) => item.actorName },
    { key: "action", label: t("Action", "Action"), exportValue: (item) => describe(item, language)[1] }
  ];

  return (
    <section className="admin-accounts">
      <header className="module-header">
        <h2>{t("Journal d'activité", "Activity log")}</h2>
        <p>{t("Qui a fait quoi dans le cabinet : candidats, missions, entretiens, clients et factures.", "Who did what in the firm: candidates, missions, interviews, clients and invoices.")}</p>
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

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher une action, un nom…", "Search an action, a name…")} />
        <div className="jy-list-tools">
          <AdminAdvancedFilters fields={filterFields} value={filters} onChange={setFilters} language={language} />
          <AdminExportMenu language={language} title={t("Journal d'activité", "Activity log")} fileBase="journal-activite" columns={exportColumns} rows={filtered} />
        </div>
      </div>

      {paged.length ? (
        <>
          <div className="jy-card jy-card-flush">
            <ul className="jy-activity-feed">
              {paged.map((item) => {
                const [icon, text] = describe(item, language);
                return (
                  <li key={item.id}>
                    <span className="jy-activity-icon">
                      <AdminLineIcon name={icon} />
                    </span>
                    <span className="jy-activity-text">
                      <span>
                        <strong>{item.actorName || t("Système", "System")}</strong> {text}
                      </span>
                      <small>{formatDateTime(item.createdAt, language)}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} language={language} totalItems={filtered.length} />
        </>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="activity" />
          </span>
          <strong>{items.length ? t("Aucune action ne correspond.", "No action matches.") : t("Aucune action enregistrée pour le moment", "No action recorded yet")}</strong>
          <span>{t("Les actions de l'équipe sont enregistrées ici au fil de l'eau.", "Team actions are recorded here as they happen.")}</span>
        </div>
      )}
    </section>
  );
}
