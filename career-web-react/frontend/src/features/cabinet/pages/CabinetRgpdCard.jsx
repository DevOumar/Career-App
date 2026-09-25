import React, { useEffect, useState } from "react";
// Paramètres du cabinet › Données personnelles (RGPD) : durée de
// conservation des données candidats, anonymisation automatique, état des
// consentements et candidats à anonymiser.
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { formatDateTime } from "../../../lib/format.js";
import { anonymizeCabinetCandidates, getCabinetRgpd, updateCabinetRgpd } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { CONSENT_LABELS } from "./CandidateExtras.jsx";
import { StatusPill, candidateName, useConfirm } from "./cabinetUi.jsx";

const RETENTION_CHOICES = [6, 12, 24, 36];

export default function CabinetRgpdCard({ user, language, isCabinetOwner = true }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(24);
  const [auto, setAuto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, confirmDialog] = useConfirm(language);

  function load() {
    getCabinetRgpd(user.id)
      .then((payload) => {
        setData(payload);
        setMonths(payload.retentionMonths);
        setAuto(payload.autoAnonymize);
      })
      .catch(() => setData(null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (!data) return null;
  const dirty = months !== data.retentionMonths || auto !== data.autoAnonymize;
  const counts = data.consentCounts || {};

  async function save() {
    setSaving(true);
    try {
      await updateCabinetRgpd(user.id, { retentionMonths: months, autoAnonymize: auto });
      cabinetToast({ title: t("Règles de conservation enregistrées.", "Retention rules saved.") });
      load();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function anonymizeExpired() {
    const ok = await confirm({
      title: t(`Anonymiser ${data.expired.length} candidat(s) ?`, `Anonymize ${data.expired.length} candidate(s)?`),
      detail: t(
        "Leur identité, leurs coordonnées, CV, notes et e-mails sont effacés définitivement. Leurs étapes et compétences restent pour vos statistiques, sans lien avec leur personne.",
        "Their identity, contact details, CV, notes and emails are permanently erased. Stages and skills remain for your statistics, unlinked from them."
      ),
      confirmLabel: t("Anonymiser", "Anonymize")
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await anonymizeCabinetCandidates(
        user.id,
        data.expired.map((item) => item.id)
      );
      cabinetToast({ title: t(`${result.count} candidat(s) anonymisé(s).`, `${result.count} candidate(s) anonymized.`) });
      load();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="jy-card">
      <div className="jy-card-head">
        <div>
          <h3>{t("Données personnelles des candidats (RGPD)", "Candidate personal data (GDPR)")}</h3>
          <p className="jy-card-sub">
            {t(
              "La CNIL recommande de ne pas conserver les données d'un candidat plus de 2 ans après le dernier contact, sauf accord de sa part.",
              "Regulators recommend not keeping a candidate's data more than 2 years after the last contact, unless they agree."
            )}
          </p>
        </div>
      </div>

      <div className="jy-rgpd-consents">
        {["granted", "pending", "refused", "anonymized"].map((key) => (
          <span key={key}>
            <StatusPill tone={CONSENT_LABELS[key].tone}>{CONSENT_LABELS[key].short[language === "en" ? "en" : "fr"]}</StatusPill>
            <strong>{counts[key] || 0}</strong>
          </span>
        ))}
      </div>

      <div className="jy-field-grid">
        <label className="jy-field">
          <span className="jy-field-label">{t("Durée de conservation", "Retention period")}</span>
          <span className="jy-field-control">
            <select value={months} disabled={!isCabinetOwner} onChange={(event) => setMonths(Number(event.target.value))}>
              {[...new Set([...RETENTION_CHOICES, data.retentionMonths])].sort((a, b) => a - b).map((value) => (
                <option key={value} value={value}>
                  {t(`${value} mois sans interaction`, `${value} months without interaction`)}
                </option>
              ))}
            </select>
          </span>
          <small className="jy-field-hint">{t("Interaction : modification de la fiche, note, entretien ou e-mail.", "Interaction: profile edit, note, interview or email.")}</small>
        </label>
        <div className="jy-field">
          <span className="jy-field-label">{t("Anonymisation automatique", "Automatic anonymization")}</span>
          <span className="jy-switch-row">
            <button type="button" role="switch" aria-checked={auto} className={`jy-switch ${auto ? "on" : ""}`} disabled={!isCabinetOwner} onClick={() => setAuto((value) => !value)}>
              <span />
            </button>
            <small>{auto ? t("Activée : vérification toutes les 6 heures", "Enabled: checked every 6 hours") : t("Désactivée : anonymisation manuelle", "Disabled: manual anonymization")}</small>
          </span>
        </div>
      </div>

      {isCabinetOwner && dirty ? (
        <div className="jy-drawer-inline-actions">
          <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" disabled={saving} onClick={save}>
            {saving ? <span className="btn-spinner" /> : null}
            {t("Enregistrer ces règles", "Save these rules")}
          </button>
        </div>
      ) : null}

      <div className="jy-rgpd-expired">
        {data.expired.length ? (
          <>
            <p className="jy-funnel-title">{t(`${data.expired.length} candidat(s) au-delà de la durée de conservation`, `${data.expired.length} candidate(s) past the retention period`)}</p>
            <ul className="jy-mission-people">
              {data.expired.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span className="jy-mission-person">
                    <strong>{candidateName(item)}</strong>
                    <small>
                      {t("Dernière interaction", "Last interaction")} : {formatDateTime(item.lastActivityAt, language)}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
            {data.expired.length > 8 ? <small className="jy-dialog-note">{t(`et ${data.expired.length - 8} autre(s)`, `and ${data.expired.length - 8} more`)}</small> : null}
            {isCabinetOwner ? (
              <button type="button" className="jy-btn jy-btn-danger-outline jy-btn-sm" disabled={busy} onClick={anonymizeExpired}>
                <AdminLineIcon name="reset" />
                {t("Anonymiser ces candidats", "Anonymize these candidates")}
              </button>
            ) : null}
          </>
        ) : (
          <div className="jy-all-good">
            <AdminLineIcon name="quality" />
            <span>{t("Aucun candidat ne dépasse la durée de conservation.", "No candidate exceeds the retention period.")}</span>
          </div>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
