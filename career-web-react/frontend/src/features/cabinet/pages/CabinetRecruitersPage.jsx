import React, { useEffect, useState } from "react";
// Espace Cabinet › Recruteurs : membres de l'équipe qui occupent un siège
// de la licence, avec leur performance (candidats sourcés / placés).
import { AdminPageLoader } from "../../../components/AdminPageLoader.jsx";
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { getCabinetOverview, getCabinetRecruiters, removeCabinetRecruiter } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon, JyDrawer } from "../../admin/AdminApp.jsx";
import { AdminExportMenu } from "../../admin/AdminListTools.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { StatusPill, candidateName, useConfirm } from "./cabinetUi.jsx";

export default function CabinetRecruitersPage({ user, language, isCabinetOwner = true, onGoToTab }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [items, setItems] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [confirm, confirmDialog] = useConfirm(language);

  function reload() {
    getCabinetRecruiters(user.id)
      .then(setItems)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
    getCabinetOverview(user.id, language)
      .then(setOverview)
      .catch(() => {});
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function remove(item) {
    const ok = await confirm({
      title: t("Retirer ce recruteur ?", "Remove this recruiter?"),
      description: `${candidateName(item)} · ${item.email}`,
      detail: t("Son siège est libéré. Les candidats et missions qu'il a créés restent dans le cabinet.", "Their seat is freed. The candidates and missions they created stay in the firm."),
      confirmLabel: t("Retirer", "Remove")
    });
    if (!ok) return;
    try {
      await removeCabinetRecruiter(user.id, item.id);
      setSelectedId("");
      reload();
      cabinetToast({ title: t("Recruteur retiré.", "Recruiter removed.") });
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    }
  }

  if (error && !items) return <p className="field-error">{error}</p>;
  if (!items) return <AdminPageLoader language={language} />;

  const perf = Object.fromEntries((overview?.recruiterPerformance || []).map((row) => [row.userId, row]));
  const statsOf = (item) => perf[item.id] || { sourcedCount: 0, placedCount: 0 };
  const needle = search.trim().toLowerCase();
  const visible = items.filter((item) => !needle || `${candidateName(item)} ${item.email}`.toLowerCase().includes(needle));
  const selected = items.find((item) => item.id === selectedId) || null;
  const ownerStats = perf[user.id];
  const teamPlaced = (overview?.recruiterPerformance || []).reduce((sum, row) => sum + row.placedCount, 0);
  const seatsTotal = overview?.seatsTotal || 0;
  const seatsUsed = overview?.seatsUsed || 0;

  const cards = [
    { icon: "profile", label: t("Recruteurs", "Recruiters"), value: items.length, tone: "" },
    { icon: "seat", label: t("Sièges utilisés", "Seats used"), value: `${seatsUsed} / ${seatsTotal}`, tone: seatsTotal && seatsUsed >= seatsTotal ? "danger" : "green" },
    { icon: "accounts", label: t("Candidats sourcés (équipe)", "Candidates sourced (team)"), value: (overview?.recruiterPerformance || []).reduce((sum, row) => sum + row.sourcedCount, 0), tone: "gold" },
    { icon: "quality", label: t("Placements (équipe)", "Placements (team)"), value: teamPlaced, tone: "green" }
  ];

  const exportColumns = [
    { key: "name", label: t("Nom", "Name"), exportValue: candidateName },
    { key: "email", label: "E-mail", exportValue: (item) => item.email },
    { key: "joined", label: t("Inscrit le", "Joined on"), exportValue: (item) => formatDateTime(item.createdAt, language) },
    { key: "sourced", label: t("Sourcés", "Sourced"), exportValue: (item) => statsOf(item).sourcedCount },
    { key: "placed", label: t("Placés", "Placed"), exportValue: (item) => statsOf(item).placedCount }
  ];

  return (
    <section className="admin-accounts">
      <header className="module-header admin-accounts-header">
        <div>
          <h2>{t("Recruteurs", "Recruiters")}</h2>
          <p>{t("Les membres de l'équipe qui utilisent un siège de votre licence et partagent le vivier.", "Team members using a seat on your license and sharing the pool.")}</p>
        </div>
        {isCabinetOwner && onGoToTab ? (
          <div className="admin-header-actions">
            <button type="button" className="jy-btn jy-btn-primary" onClick={() => onGoToTab("invitations")}>
              <AdminLineIcon name="send" />
              {t("Inviter un recruteur", "Invite a recruiter")}
            </button>
          </div>
        ) : null}
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

      {ownerStats ? (
        <div className="jy-callout info">
          <AdminLineIcon name="info" />
          <span>
            {t("Vos propres résultats (titulaire) : ", "Your own results (owner): ")}
            <strong>
              {ownerStats.sourcedCount} {t("sourcé(s)", "sourced")} · {ownerStats.placedCount} {t("placé(s)", "placed")}
            </strong>
          </span>
        </div>
      ) : null}

      <div className="admin-table-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Rechercher par nom ou e-mail…", "Search by name or email…")} />
        <div className="jy-list-tools">
          <AdminExportMenu language={language} title={t("Recruteurs", "Recruiters")} fileBase="recruteurs" columns={exportColumns} rows={visible} />
        </div>
      </div>

      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("Recruteur", "Recruiter")}</th>
                <th>{t("Inscrit le", "Joined on")}</th>
                <th>{t("Sourcés", "Sourced")}</th>
                <th>{t("Placés", "Placed")}</th>
                <th>{t("Taux de placement", "Placement rate")}</th>
                {isCabinetOwner ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((item) => {
                  const stats = statsOf(item);
                  const rate = stats.sourcedCount ? Math.round((stats.placedCount / stats.sourcedCount) * 100) : 0;
                  return (
                    <tr key={item.id} className={`jy-row-click ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                      <td>
                        <div className="admin-table-name">
                          <AvatarCircle user={item} />
                          <div>
                            <strong>{candidateName(item)}</strong>
                            <span className="muted">{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted jy-nowrap">{formatDateTime(item.createdAt, language)}</td>
                      <td>{stats.sourcedCount}</td>
                      <td>
                        <strong>{stats.placedCount}</strong>
                      </td>
                      <td>
                        <span className="jy-score-bar">
                          <span className="jy-score-bar-track good">
                            <span style={{ width: `${rate}%` }} />
                          </span>
                          <strong>{rate} %</strong>
                        </span>
                      </td>
                      {isCabinetOwner ? (
                        <td className="jy-actions-cell" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="admin-row-action danger icon-only" title={t("Retirer", "Remove")} aria-label={t("Retirer", "Remove")} onClick={() => remove(item)}>
                            <AdminLineIcon name="trash" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isCabinetOwner ? 6 : 5} className="admin-table-empty muted">
                    {t("Aucun recruteur ne correspond.", "No recruiter matches.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="jy-card jy-empty-block">
          <span className="jy-empty-icon">
            <AdminLineIcon name="profile" />
          </span>
          <strong>{t("Aucun recruteur dans l'équipe", "No recruiter in the team")}</strong>
          <span>{t("Invitez des recruteurs : ils partageront le vivier et les missions du cabinet.", "Invite recruiters: they'll share the firm's pool and missions.")}</span>
          {isCabinetOwner && onGoToTab ? (
            <button type="button" className="jy-btn jy-btn-primary" onClick={() => onGoToTab("invitations")}>
              <AdminLineIcon name="send" />
              {t("Inviter un recruteur", "Invite a recruiter")}
            </button>
          ) : null}
        </div>
      )}

      <JyDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId("")}
        language={language}
        avatar={selected ? <AvatarCircle user={selected} /> : null}
        title={selected ? candidateName(selected) : ""}
        subtitle={selected?.email}
        badges={selected ? <StatusPill tone="green">{t("Membre de l'équipe", "Team member")}</StatusPill> : null}
        sections={
          selected
            ? [
                {
                  title: t("Performance", "Performance"),
                  rows: [
                    [t("Candidats sourcés", "Candidates sourced"), String(statsOf(selected).sourcedCount)],
                    [t("Candidats placés", "Candidates placed"), String(statsOf(selected).placedCount)]
                  ]
                },
                {
                  title: t("Compte", "Account"),
                  rows: [
                    [t("Inscrit le", "Joined on"), formatDateTime(selected.createdAt, language)],
                    [t("Code de licence", "License code"), isCabinetOwner ? selected.licenseCode || "" : ""]
                  ]
                }
              ]
            : []
        }
        footer={
          selected && isCabinetOwner ? (
            <button type="button" className="jy-btn jy-btn-danger-outline" onClick={() => remove(selected)}>
              <AdminLineIcon name="trash" />
              {t("Retirer du cabinet", "Remove from the firm")}
            </button>
          ) : null
        }
      />

      {confirmDialog}
    </section>
  );
}
