import React, { useEffect, useState } from "react";
// Matching candidat / mission : classement du vivier par score de
// correspondance (calculé sur les compétences requises, l'expérience et le
// poste visé, avec son détail) et analyse IA approfondie à la demande.
import { AvatarCircle } from "../../../components/AvatarCircle.jsx";
import { getFriendlyErrorMessage } from "../../../lib/errors.js";
import { analyzeCabinetMatchWithAi, getCabinetMissionMatches, updateCabinetMissionCandidate } from "../../../lib/inMemoryDb.js";
import { AdminLineIcon } from "../../admin/AdminApp.jsx";
import { MfaDialog } from "../../account/mfa/MfaUi.jsx";
import { cabinetToast } from "./cabinetToast.js";
import { StatusPill, candidateName, candidateStatusLabel } from "./cabinetUi.jsx";
import { AiDisclaimer } from "../../../components/AiDisclaimer.jsx";

export const scoreTone = (score) => (score >= 75 ? "good" : score >= 50 ? "mid" : "low");

export function MissionMatches({ userId, mission, language, onAssigned, onEditMission }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState("");
  const [analysis, setAnalysis] = useState(null);

  function load() {
    setError("");
    getCabinetMissionMatches(userId, mission.id)
      .then(setData)
      .catch((err) => setError(getFriendlyErrorMessage(err, language)));
  }

  useEffect(() => {
    setData(null);
    setShowAll(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id, mission.candidates.length, JSON.stringify(mission.skills), mission.experienceMin]);

  async function assign(item) {
    setBusy(`assign-${item.candidateId}`);
    try {
      await updateCabinetMissionCandidate(userId, mission.id, item.candidateId, "add");
      cabinetToast({ title: t("Candidat affecté à la mission.", "Candidate assigned to the mission.") });
      await onAssigned?.();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy("");
    }
  }

  async function analyze(item) {
    setBusy(`ai-${item.candidateId}`);
    try {
      const result = await analyzeCabinetMatchWithAi(userId, mission.id, item.candidateId);
      setAnalysis({ candidate: item, result: result.analysis });
      if (item.assignedStage) await onAssigned?.();
    } catch (err) {
      cabinetToast({ title: getFriendlyErrorMessage(err, language), icon: "error" });
    } finally {
      setBusy("");
    }
  }

  if (error) return <p className="jy-drawer-empty">{error}</p>;
  if (!data) return <p className="jy-drawer-empty">{t("Calcul des correspondances…", "Computing matches…")}</p>;

  if (!data.requiredSkills.length) {
    return (
      <div className="jy-match-empty">
        <p>{t("Indiquez les compétences requises (ou une description du poste) pour classer les candidats du vivier.", "Add the required skills (or a job description) to rank the candidates in the pool.")}</p>
        {onEditMission ? (
          <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={onEditMission}>
            <AdminLineIcon name="edit" />
            {t("Compléter la fiche de poste", "Complete the job sheet")}
          </button>
        ) : null}
      </div>
    );
  }

  const list = showAll ? data.items : data.items.slice(0, 5);
  return (
    <div className="jy-matches">
      <p className="jy-match-basis">
        {data.skillsDeclared ? t("Compétences requises : ", "Required skills: ") : t("Compétences détectées dans la description : ", "Skills detected in the description: ")}
        <strong>{data.requiredSkills.join(", ")}</strong>
        {data.experienceMin ? t(` · ${data.experienceMin} an(s) d'expérience minimum`, ` · ${data.experienceMin} year(s) of experience minimum`) : ""}
      </p>
      {list.length ? (
        <ul className="jy-match-list">
          {list.map((item) => (
            <li key={item.candidateId}>
              <div className="jy-match-top">
                <AvatarCircle user={item} />
                <span className="jy-mission-person">
                  <strong>{candidateName(item)}</strong>
                  <small>{item.headline || candidateStatusLabel(item.status, language)}</small>
                </span>
                <span className={`jy-match-score ${scoreTone(item.score)}`}>{item.score}</span>
              </div>
              <div className="jy-match-detail">
                {item.matchedSkills.map((skill) => (
                  <span key={`ok-${skill}`} className="jy-chip small ok">
                    {skill}
                  </span>
                ))}
                {item.missingSkills.map((skill) => (
                  <span key={`ko-${skill}`} className="jy-chip small missing">
                    {skill}
                  </span>
                ))}
              </div>
              <small className="jy-match-why">
                {t(`Compétences ${item.breakdown.skills}/70 · expérience ${item.breakdown.experience}/20 · poste visé ${item.breakdown.title}/10`, `Skills ${item.breakdown.skills}/70 · experience ${item.breakdown.experience}/20 · target role ${item.breakdown.title}/10`)}
                {item.experienceNote === "unknown" ? t(" · expérience inconnue (pas de CV analysé)", " · experience unknown (no CV analysed)") : ""}
              </small>
              <div className="jy-match-actions">
                {item.assignedStage ? (
                  <StatusPill tone="green">
                    {t("Affecté", "Assigned")} · {candidateStatusLabel(item.assignedStage, language)}
                  </StatusPill>
                ) : (
                  <button type="button" className="jy-btn jy-btn-primary jy-btn-sm" disabled={busy !== ""} onClick={() => assign(item)}>
                    <AdminLineIcon name="plus" />
                    {t("Affecter", "Assign")}
                  </button>
                )}
                <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" disabled={busy !== ""} onClick={() => analyze(item)}>
                  {busy === `ai-${item.candidateId}` ? <span className="btn-spinner dark" /> : <AdminLineIcon name="trend" />}
                  {t("Analyse IA", "AI analysis")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="jy-drawer-empty">{t("Aucun candidat disponible dans le vivier.", "No candidate available in the pool.")}</p>
      )}
      {data.items.length > 5 ? (
        <button type="button" className="jy-link" onClick={() => setShowAll((value) => !value)}>
          {showAll ? t("Afficher les 5 meilleurs", "Show the top 5") : t(`Voir les ${data.items.length} candidats classés`, `See all ${data.items.length} ranked candidates`)}
        </button>
      ) : null}

      <AiAnalysisDialog analysis={analysis} mission={mission} language={language} onClose={() => setAnalysis(null)} />
    </div>
  );
}

const LEVEL_LABELS = { critique: { fr: "Critique", en: "Critical", tone: "danger" }, important: { fr: "Important", en: "Important", tone: "gold" }, bonus: { fr: "Bonus", en: "Bonus", tone: "blue" } };

export function AiAnalysisDialog({ analysis, mission, language, onClose }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  if (!analysis) return null;
  const { candidate, result } = analysis;
  return (
    <MfaDialog
      open
      onClose={onClose}
      icon="shieldCheck"
      title={t(`Analyse IA · ${candidateName(candidate)}`, `AI analysis · ${candidateName(candidate)}`)}
      description={`${mission.title}${mission.clientName ? ` · ${mission.clientName}` : ""}`}
      width={640}
      footer={
        <button type="button" className="mfa-btn primary" onClick={onClose}>
          {t("Fermer", "Close")}
        </button>
      }
    >
      <div className="jy-ai-analysis">
        <div className="jy-ai-head">
          <span className={`jy-match-score large ${scoreTone(result.score)}`}>{result.score}</span>
          <div>
            <strong>{result.verdict}</strong>
            <small>{t("Score de compatibilité évalué par l'IA", "Compatibility score assessed by AI")}</small>
          </div>
        </div>
        {result.strengths?.length ? (
          <section>
            <h4>{t("Points forts", "Strengths")}</h4>
            <ul>
              {result.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {result.missingKeywords?.length ? (
          <section>
            <h4>{t("Compétences manquantes", "Missing skills")}</h4>
            <div className="jy-match-detail">
              {result.missingKeywords.map((item) => (
                <span key={item} className="jy-chip small missing">
                  {item}
                </span>
              ))}
            </div>
          </section>
        ) : null}
        {result.culturalFit ? (
          <section>
            <h4>{t("Adéquation avec le poste", "Fit with the role")}</h4>
            <p>{result.culturalFit}</p>
          </section>
        ) : null}
        {result.recommendations?.length ? (
          <section>
            <h4>{t("Points à vérifier en entretien", "Points to check in interview")}</h4>
            <ul className="jy-ai-recos">
              {result.recommendations.map((item) => (
                <li key={item.title}>
                  <StatusPill tone={LEVEL_LABELS[item.level]?.tone || "neutral"}>{LEVEL_LABELS[item.level]?.[language === "en" ? "en" : "fr"] || item.level}</StatusPill>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <AiDisclaimer
          language={language}
          text={
            language === "en"
              ? "AI-generated analysis: a decision aid, not a decision. Check it with the candidate before any choice."
              : "Analyse générée par l'IA : une aide à la décision, pas une décision. Vérifiez-la avec le candidat avant tout choix."
          }
        />
      </div>
    </MfaDialog>
  );
}
