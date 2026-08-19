import React from "react";
// Module CV : assistant d'import (upload -> révision -> poste visé ->
// analyse), résultat de matching avec optimisation ATS, aperçu/export du
// CV (2 modèles), comparaison des offres, historique des CV.
//
// NOTE : comme pour le module Admin, ce fichier regroupe plusieurs
// composants historiquement définis à la suite dans App.jsx (déplacement
// mécanique, pas une réécriture) : ImportPage, MatchResultsStep,
// CvPreviewCard, CvDocumentClassic/Sidebar, TokenEditor, ReviewCard,
// AnalysisPage, OffersPage, CvHistoryPage.
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import { Placeholder } from "../../components/Placeholder.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { fillTemplate, formatDate } from "../../lib/format.js";
import { getPlanById } from "../../data/plans.js";
import {
  submitMatchFeedback,
  getMatchFeedback,
  optimizeCvForAts,
  listJobApplications,
  createJobApplication,
  deleteJobApplication
} from "../../lib/inMemoryDb.js";
import { APPLICATIONS_COPY } from "../applications/applicationsCopy.js";
import { CV_COPY } from "./cvCopy.js";
import { ratingLabel, levelTag, recommendationLevelLabel } from "../../App.jsx";

function ImportPage({
  latestCv,
  offerText,
  setOfferText,
  onFileUpload,
  onReviewSave,
  onReimport,
  onAnalyse,
  onJobReview,
  jobReview,
  onEditJob,
  onStepClick,
  canAnalyse,
  isReviewingJob,
  isAnalysing,
  matchInsights,
  matchRunId,
  userId,
  subscription,
  onGoToTarifs,
  language,
  importStep,
  isExtractingCv,
  cvReview,
  setCvReview,
  cvFileName,
  cvSourceText,
  avatarDataUrl,
  tokensBalance,
  onApplyOptimization,
  onSaveCvReview,
  onConsumeToken
}) {
  const copy = CV_COPY[language]?.import || CV_COPY.fr.import;
  const activeIndex = importStep === "review" ? 1 : importStep === "job" ? 2 : importStep === "results" ? 3 : 0;
  const stepKeys = ["upload", "review", "job", "results"];
  const maxReachableIndex = importStep === "results" ? 3 : latestCv ? 2 : cvReview ? 1 : 0;

  function updateReview(key, value) {
    setCvReview((prev) => ({ ...(prev || {}), [key]: value }));
  }

  function updateList(key, value) {
    updateReview(key, value.split(",").map((item) => item.trim()).filter(Boolean));
  }

  function updateArrayItem(key, index, value) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).map((item, itemIndex) => (itemIndex === index ? value : item))
    }));
  }

  function addArrayItem(key) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: [...(prev?.[key] || []), ""]
    }));
  }

  function removeArrayItem(key, index) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function addCollectionItem(key, item) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: [...(prev?.[key] || []), item]
    }));
  }

  function updateCollectionItem(key, index, field, value) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  }

  function removeCollectionItem(key, index) {
    setCvReview((prev) => ({
      ...(prev || {}),
      [key]: (prev?.[key] || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <section className="import-wizard-page">
      <div className="import-steps">
        {copy.steps.map((step, index) => {
          const isReachable = index <= maxReachableIndex && index !== activeIndex && stepKeys[index] !== "results";
          const StepTag = isReachable ? "button" : "div";
          return (
            <StepTag
              key={step.title}
              type={isReachable ? "button" : undefined}
              className={`import-step ${index === activeIndex ? "active" : ""} ${index < activeIndex ? "done" : ""} ${isReachable ? "clickable" : ""}`}
              onClick={isReachable ? () => onStepClick(stepKeys[index]) : undefined}
              aria-current={index === activeIndex ? "step" : undefined}
            >
              <span>{index < activeIndex ? <UiIcon name="check" /> : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
              </div>
            </StepTag>
          );
        })}
      </div>

      {importStep === "upload" ? (
        <div className="import-upload-shell">
          <header>
            <h2>{copy.uploadTitle}</h2>
            <p>{copy.uploadText}</p>
          </header>

          <label className={`upload-zone import-dropzone ${latestCv ? "done" : ""}`}>
            <input
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx"
              onChange={(event) => onFileUpload(event.target.files?.[0])}
            />
            {isExtractingCv ? (
              <div className="extracting-state">
                <div className="loader-ring" />
                <strong>{copy.analysingTitle}</strong>
                <span>{copy.analysingText}</span>
              </div>
            ) : (
              <>
                <span className="upload-icon">
                  <UiIcon name="upload" />
                </span>
                <strong>{cvFileName || copy.chooseFile}</strong>
                <span>{copy.formats}</span>
              </>
            )}
          </label>

        </div>
      ) : null}

      {importStep === "review" && cvReview ? (
        <div className="cv-review-shell">
          <div className="review-head">
            <div>
              <h2>{copy.reviewTitle}</h2>
              <p>{copy.reviewText}</p>
            </div>
            <div className="review-actions">
              <button className="btn-secondary" onClick={onReimport}>
                <UiIcon name="upload" />
                {copy.reimport}
              </button>
              <button className="btn-main" onClick={() => onReviewSave(cvReview)}>
                <UiIcon name="save" />
                {copy.saveContinue}
              </button>
            </div>
          </div>

          <div className="cv-review-grid">
            <div className="review-column compact">
              <ReviewCard title={copy.personalInfo} icon="profile">
                <div className="two-cols">
                  <label>
                    {language === "en" ? "First name" : "Prénom"}
                    <input value={cvReview.firstName || ""} onChange={(event) => updateReview("firstName", event.target.value)} />
                  </label>
                  <label>
                    {language === "en" ? "Last name" : "Nom"}
                    <input value={cvReview.lastName || ""} onChange={(event) => updateReview("lastName", event.target.value)} />
                  </label>
                </div>
                <label>
                  Email
                  <input value={cvReview.email || ""} onChange={(event) => updateReview("email", event.target.value)} />
                </label>
                <label>
                  LinkedIn
                  <input value={cvReview.linkedinUrl || ""} onChange={(event) => updateReview("linkedinUrl", event.target.value)} />
                </label>
                <label>
                  {language === "en" ? "Phone" : "Téléphone"}
                  <input value={cvReview.phone || ""} onChange={(event) => updateReview("phone", event.target.value)} />
                </label>
                <label>
                  {language === "en" ? "Location" : "Localisation"}
                  <input value={cvReview.location || ""} onChange={(event) => updateReview("location", event.target.value)} />
                </label>
              </ReviewCard>

              <ReviewCard title={copy.summary} icon="chart">
                <label>
                  {language === "en" ? "Headline" : "Titre professionnel"}
                  <input value={cvReview.headline || ""} onChange={(event) => updateReview("headline", event.target.value)} />
                </label>
                <textarea rows={7} value={cvReview.summary || ""} onChange={(event) => updateReview("summary", event.target.value)} />
              </ReviewCard>
            </div>

            <div className="review-column">
              <ReviewCard title={copy.skillsLanguages} icon="chart">
                <TokenEditor
                  label="Technical skills"
                  items={cvReview.skills || []}
                  addLabel={copy.addSkill}
                  onChange={(index, value) => updateArrayItem("skills", index, value)}
                  onRemove={(index) => removeArrayItem("skills", index)}
                  onAdd={() => addArrayItem("skills")}
                />
                <TokenEditor
                  label={language === "en" ? "Languages" : "Langues"}
                  items={cvReview.languages || []}
                  addLabel={copy.addLanguage}
                  onChange={(index, value) => updateArrayItem("languages", index, value)}
                  onRemove={(index) => removeArrayItem("languages", index)}
                  onAdd={() => addArrayItem("languages")}
                />
              </ReviewCard>

              <ReviewCard title={copy.experiences} icon="briefcase">
                {(cvReview.experiences || []).map((item, index) => (
                  <EditableBlock
                    key={`exp-${index}`}
                    title={[item.company, item.role].filter(Boolean).join("  |  ") || `${copy.experiences} ${index + 1}`}
                    onRemove={() => removeCollectionItem("experiences", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "Company" : "Entreprise"}
                        <input value={item.company || ""} onChange={(event) => updateCollectionItem("experiences", index, "company", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Role" : "Rôle"}
                        <input value={item.role || ""} onChange={(event) => updateCollectionItem("experiences", index, "role", event.target.value)} />
                      </label>
                    </div>
                    <label>
                      Dates
                      <input value={item.dates || ""} onChange={(event) => updateCollectionItem("experiences", index, "dates", event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea rows={4} value={item.description || ""} onChange={(event) => updateCollectionItem("experiences", index, "description", event.target.value)} />
                    </label>
                  </EditableBlock>
                ))}
                <button className="btn-ghost full" onClick={() => addCollectionItem("experiences", { company: "", role: "", dates: "", description: "" })}>
                  + {copy.addExperience}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.educationBlock} icon="chart">
                {(cvReview.educationItems || []).length ? (
                  (cvReview.educationItems || []).map((item, index) => (
                  <EditableBlock
                    key={`edu-${index}`}
                    title={[item.school, item.degree].filter(Boolean).join("  |  ") || `${copy.educationBlock} ${index + 1}`}
                    onRemove={() => removeCollectionItem("educationItems", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "School" : "École"}
                        <input value={item.school || ""} onChange={(event) => updateCollectionItem("educationItems", index, "school", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Degree" : "Diplôme"}
                        <input value={item.degree || ""} onChange={(event) => updateCollectionItem("educationItems", index, "degree", event.target.value)} />
                      </label>
                    </div>
                    <label>
                      Dates
                      <input value={item.dates || ""} onChange={(event) => updateCollectionItem("educationItems", index, "dates", event.target.value)} />
                    </label>
                    <label>
                      Description
                      <textarea rows={3} value={item.description || ""} onChange={(event) => updateCollectionItem("educationItems", index, "description", event.target.value)} />
                    </label>
                  </EditableBlock>
                  ))
                ) : (
                  <p className="review-empty">{language === "en" ? "No education detected. Add it manually if needed." : "Aucune formation détectée. Ajoute-la manuellement si besoin."}</p>
                )}
                <button className="btn-ghost full" onClick={() => addCollectionItem("educationItems", { school: "", degree: "", dates: "", description: "" })}>
                  + {copy.addEducation}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.certifications} icon="shield">
                {(cvReview.certifications || []).length ? (
                  (cvReview.certifications || []).map((item, index) => (
                  <EditableBlock
                    key={`cert-${index}`}
                    title={item.name || `${copy.certifications} ${index + 1}`}
                    onRemove={() => removeCollectionItem("certifications", index)}
                  >
                    <div className="two-cols field-grid">
                      <label>
                        {language === "en" ? "Certification name" : "Nom de la certification"}
                        <input value={item.name || ""} onChange={(event) => updateCollectionItem("certifications", index, "name", event.target.value)} />
                      </label>
                      <label>
                        {language === "en" ? "Validation link" : "Lien de validation"}
                        <input placeholder="https://..." value={item.url || ""} onChange={(event) => updateCollectionItem("certifications", index, "url", event.target.value)} />
                      </label>
                    </div>
                  </EditableBlock>
                  ))
                ) : (
                  <p className="review-empty">{language === "en" ? "No certification detected." : "Aucune certification détectée."}</p>
                )}
                <button className="btn-ghost full" onClick={() => addCollectionItem("certifications", { name: "", url: "" })}>
                  + {copy.addCertification}
                </button>
              </ReviewCard>

              <ReviewCard title={copy.interests} icon="chat">
                {(cvReview.interests || []).length ? (
                  <TokenEditor
                    label="Interests"
                    items={cvReview.interests || []}
                    addLabel={copy.addInterest}
                    onChange={(index, value) => updateArrayItem("interests", index, value)}
                    onRemove={(index) => removeArrayItem("interests", index)}
                    onAdd={() => addArrayItem("interests")}
                  />
                ) : (
                  <>
                    <p className="review-empty">{language === "en" ? "No interest detected." : "Aucun centre d'intérêt détecté."}</p>
                    <button type="button" className="btn-ghost token-add" onClick={() => addArrayItem("interests")}>
                      + {copy.addInterest}
                    </button>
                  </>
                )}
              </ReviewCard>
            </div>
          </div>
        </div>
      ) : null}

      {importStep === "job" ? (
        <div className="job-target-shell">
          {!jobReview ? (
            <>
              <header>
                <h2>{copy.jobTitle}</h2>
                <p>{copy.jobText}</p>
              </header>
              <div className="card block job-card">
                <label>
                  {copy.jobDescription}
                  <textarea
                    value={offerText}
                    onChange={(event) => setOfferText(event.target.value)}
                    placeholder={copy.offerPlaceholder}
                    rows={12}
                  />
                </label>
                <div className="counter-row">
                  <span>{offerText.trim().length} {copy.chars}</span>
                  <span>{offerText.trim().length > 50 ? copy.ready : copy.minimum}</span>
                </div>
                <button className={`btn-main ${offerText.trim().length > 50 ? "ready" : ""}`} disabled={offerText.trim().length <= 50 || isReviewingJob} onClick={onJobReview}>
                  {isReviewingJob ? (
                    <>
                      <span className="btn-spinner" /> {copy.reviewingJob}
                    </>
                  ) : (
                    <>
                      {copy.reviewJob} <UiIcon name="chevron" className="btn-chevron" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <header>
                <h2>{copy.jobSummaryTitle}</h2>
                <p>{copy.jobSummaryText}</p>
              </header>
              <article className="job-summary-card">
                <div className="job-summary-title">
                  <span>
                    <UiIcon name="briefcase" />
                  </span>
                  <h3>{jobReview.title}</h3>
                </div>
                <div className="job-summary-company">
                  <UiIcon name="briefcase" />
                  <strong>{jobReview.company}</strong>
                </div>
                <div className="job-description-box">
                  <strong>Description</strong>
                  <p>{jobReview.description}</p>
                </div>
                <div className="job-skill-groups">
                  <div>
                    <h4>{copy.technicalSkills}</h4>
                    <div className="job-chip-row">
                      {jobReview.skills?.length ? (
                        jobReview.skills.map((skill) => <span key={skill}>{skill}</span>)
                      ) : (
                        <span className="muted">{copy.noSkillsDetected}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4>{copy.softSkills}</h4>
                    <div className="job-chip-row">
                      {jobReview.softSkills?.length ? (
                        jobReview.softSkills.map((skill) => <span key={skill}>{skill}</span>)
                      ) : (
                        <span className="muted">{copy.noSkillsDetected}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="job-summary-actions">
                  <button className="btn-secondary" onClick={onEditJob}>{copy.backToEdit}</button>
                  <button className={`btn-main ${canAnalyse ? "ready" : ""}`} disabled={!canAnalyse} onClick={onAnalyse}>
                    {isAnalysing ? copy.analysing : copy.analyseJob} <UiIcon name="chevron" className="btn-chevron" />
                  </button>
                </div>
              </article>
            </>
          )}
        </div>
      ) : null}

      {importStep === "results" ? (
        <MatchResultsStep
          isAnalysing={isAnalysing}
          matchInsights={matchInsights}
          matchRunId={matchRunId}
          userId={userId}
          subscription={subscription}
          onGoToTarifs={onGoToTarifs}
          jobReview={jobReview}
          cvReview={cvReview}
          cvSourceText={cvSourceText}
          copy={copy}
          language={language}
          avatarDataUrl={avatarDataUrl}
          cvId={latestCv?.id || ""}
          tokensBalance={tokensBalance}
          onApplyOptimization={onApplyOptimization}
          onSaveCvReview={onSaveCvReview}
          onConsumeToken={onConsumeToken}
        />
      ) : null}
    </section>
  );
}

const CV_LANGUAGE_MARKERS = {
  fr: ["le ", "la ", "les ", "des ", "et ", "avec ", "pour ", "expérience", "compétences", "formation", "diplôme", "années", "projet", "responsable", "société", "entreprise"],
  en: ["the ", "and ", "with ", "for ", "experience", "skills", "education", "degree", "years", "project", "responsible", "company", "team"]
};

function linkedinSearchUrl(query) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

function buildNetworkingQueries({ title, company, language, copy }) {
  if (!company) return [];
  const roleWord = title ? title.split(/[\/,|-]/)[0].trim() : "";
  const recruiterWord = language === "en" ? "Recruiter" : "Recruteur";
  const hrWord = language === "en" ? "Talent Acquisition" : "RH Ressources Humaines";

  return [
    { label: copy.matchNetworkingRoleLabel, query: [roleWord, company].filter(Boolean).join(" ") },
    { label: copy.matchNetworkingRecruiterLabel, query: `${recruiterWord} ${company}` },
    { label: copy.matchNetworkingHrLabel, query: `${hrWord} ${company}` }
  ].filter((item) => item.query.trim().length > company.length);
}

function detectCvLanguage(text) {
  const normalized = ` ${String(text || "").toLowerCase()} `;
  if (!normalized.trim()) return "";

  let frScore = 0;
  let enScore = 0;
  for (const marker of CV_LANGUAGE_MARKERS.fr) {
    if (normalized.includes(marker)) frScore += 1;
  }
  for (const marker of CV_LANGUAGE_MARKERS.en) {
    if (normalized.includes(marker)) enScore += 1;
  }

  if (frScore === 0 && enScore === 0) return "";
  return frScore >= enScore ? "fr" : "en";
}

function MatchResultsStep({
  isAnalysing,
  matchInsights,
  matchRunId,
  userId,
  subscription,
  onGoToTarifs,
  jobReview,
  cvReview,
  cvSourceText,
  copy,
  language,
  avatarDataUrl,
  cvId,
  tokensBalance,
  onApplyOptimization,
  onSaveCvReview,
  onConsumeToken
}) {
  const [feedback, setFeedback] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [networkingState, setNetworkingState] = useState("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("idle");
  const [trackerStatus, setTrackerStatus] = useState("idle");
  const [trackerApplicationId, setTrackerApplicationId] = useState(null);
  const trackerLockRef = useRef(false);
  const cvCopy = CV_COPY[language]?.cv || CV_COPY.fr.cv;
  const applicationsCopy = APPLICATIONS_COPY[language] || APPLICATIONS_COPY.fr;
  const [atsOptimization, setAtsOptimization] = useState(null);
  const [isAtsOptimizing, setIsAtsOptimizing] = useState(false);
  const [atsError, setAtsError] = useState("");
  const [atsApplied, setAtsApplied] = useState(false);
  const [atsSaving, setAtsSaving] = useState(false);
  const hasOfferContext = Boolean(cvReview?.experiences?.length || cvReview?.summary) && Boolean(jobReview?.title);
  const outOfTokens = tokensBalance < 999 && tokensBalance <= 0;

  async function handleAtsOptimize() {
    if (!hasOfferContext || isAtsOptimizing) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setAtsError("");
    setAtsApplied(false);
    setIsAtsOptimizing(true);
    try {
      const result = await optimizeCvForAts({ candidate: cvReview, offer: jobReview, language });
      setAtsOptimization(result);
      await onConsumeToken();
    } catch (err) {
      setAtsError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsAtsOptimizing(false);
    }
  }

  async function handleAtsApply() {
    if (!atsOptimization || atsSaving) return;
    const compact = (value) => String(value || "").toLowerCase().trim();
    const nextExperiences = (cvReview.experiences || []).map((exp) => {
      const match = atsOptimization.experiences.find((item) => compact(item.company) === compact(exp.company));
      return match ? { ...exp, description: match.optimizedDescription } : exp;
    });
    const nextReview = {
      ...cvReview,
      headline: atsOptimization.optimizedHeadline || cvReview.headline,
      summary: atsOptimization.optimizedSummary || cvReview.summary,
      skills: atsOptimization.prioritizedSkills?.length ? atsOptimization.prioritizedSkills : cvReview.skills,
      experiences: nextExperiences
    };
    onApplyOptimization(nextReview);
    setAtsSaving(true);
    setAtsError("");
    try {
      // Enregistré tout de suite en base, sans faire naviguer l'utilisateur
      // vers une autre étape du wizard (qui ferait perdre sa progression).
      await onSaveCvReview(nextReview);
      setAtsApplied(true);
    } catch (err) {
      setAtsApplied(false);
      setAtsError(getFriendlyErrorMessage(err, language));
    } finally {
      setAtsSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setFeedback(null);
    if (!userId || !matchRunId) return undefined;

    getMatchFeedback({ userId, matchRunId }).then((existing) => {
      if (!cancelled && existing) {
        setFeedback(existing.useful ? "yes" : "no");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, matchRunId]);

  // Vérifie si cette offre (même poste + même entreprise) est déjà dans le
  // suivi de candidatures, pour ne pas proposer d'en créer un doublon quand
  // l'utilisateur revient sur cette analyse plus tard.
  useEffect(() => {
    let cancelled = false;
    setTrackerStatus("idle");
    setTrackerApplicationId(null);
    if (!userId || !jobReview?.title) return undefined;

    const compact = (value) => String(value || "").toLowerCase().trim();
    listJobApplications(userId).then((list) => {
      if (cancelled) return;
      const existing = (list || []).find(
        (app) => compact(app.title) === compact(jobReview.title) && compact(app.company) === compact(jobReview.company)
      );
      if (existing) {
        setTrackerApplicationId(existing.id);
        setTrackerStatus("done");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, jobReview?.title, jobReview?.company]);

  async function handleFeedback(useful) {
    if (feedbackSaving || !userId || !matchRunId) return;
    const previous = feedback;
    setFeedback(useful ? "yes" : "no");
    setFeedbackSaving(true);
    try {
      await submitMatchFeedback({ userId, matchRunId, useful });
    } catch (_error) {
      setFeedback(previous);
    } finally {
      setFeedbackSaving(false);
    }
  }

  function fireTrackerToast(icon, title) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: icon === "error" ? 4200 : 3200,
      timerProgressBar: true,
      customClass: {
        popup: "career-toast",
        title: "career-toast-title"
      }
    });
  }

  async function handleAddToTracker() {
    // Garde-fou synchrone : trackerStatus (state React) ne se met à jour
    // qu'au prochain rendu, donc un double-clic très rapide peut passer ce
    // contrôle deux fois avant que le bouton soit visuellement désactivé.
    // trackerLockRef, lui, change de valeur immédiatement, sans attendre
    // de rendu — il bloque vraiment dès le premier clic.
    if (!userId || trackerLockRef.current) return;
    trackerLockRef.current = true;
    setTrackerStatus("saving");
    try {
      const created = await createJobApplication({
        userId,
        status: "to_apply",
        title: jobReview?.title || "",
        company: jobReview?.company || "",
        location: jobReview?.location || "",
        offerText: jobReview?.description || "",
        matchScore: typeof matchInsights?.score === "number" ? matchInsights.score : null,
        cvId: cvId || ""
      });
      setTrackerApplicationId(created.id);
      setTrackerStatus("done");
      fireTrackerToast("success", applicationsCopy.addedToTracker);
    } catch (error) {
      setTrackerStatus("idle");
      fireTrackerToast("error", getFriendlyErrorMessage(error, language));
    } finally {
      trackerLockRef.current = false;
    }
  }

  async function handleRemoveFromTracker() {
    if (!userId || !trackerApplicationId || trackerLockRef.current) return;
    trackerLockRef.current = true;
    setTrackerStatus("removing");
    try {
      await deleteJobApplication({ id: trackerApplicationId, userId });
      setTrackerApplicationId(null);
      setTrackerStatus("idle");
      fireTrackerToast("success", applicationsCopy.removedFromTracker);
    } catch (error) {
      setTrackerStatus("done");
      fireTrackerToast("error", getFriendlyErrorMessage(error, language));
    } finally {
      trackerLockRef.current = false;
    }
  }

  if (isAnalysing || !matchInsights) {
    return (
      <div className="match-results-shell">
        <div className="extracting-state match-loading">
          <div className="loader-ring" />
          <strong>{copy.matchingTitle}</strong>
          <span>{copy.matchingText}</span>
        </div>
      </div>
    );
  }

  const missingKeywords = matchInsights.missingKeywords || [];
  const company = jobReview?.company || "";
  const title = jobReview?.title || "";
  const searchQuery = [company, title].filter(Boolean).join(" ") || title || company;
  const networkingQueries = buildNetworkingQueries({ title, company, language, copy });
  const verdictLabel = matchInsights.verdict || ratingLabel(matchInsights.score, language);
  const cvTextSample =
    cvSourceText ||
    [cvReview?.headline, cvReview?.summary, ...(cvReview?.experiences || []).map((item) => item.description)].filter(Boolean).join(" ");
  const detectedCvLanguage = detectCvLanguage(cvTextSample) || language;
  const languageLabel = detectedCvLanguage === "en" ? "English" : "Français";

  function handleFindContacts() {
    setNetworkingState("searching");
    setTimeout(() => setNetworkingState("done"), 700);
  }

  const isFreePlan = !getPlanById(subscription?.planId)?.grantsPremium;

  async function handleShare() {
    if (isFreePlan) {
      onGoToTarifs();
      return;
    }
    const summary = `${title}${company ? ` · ${company}` : ""} — ${copy.matchScoreLabel}: ${matchInsights.score}/100 (${verdictLabel})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: copy.matchResultsTitle, text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2400);
    } catch (_error) {
      // Share cancelled or unavailable, nothing to surface.
    }
  }

  function handleDownloadPdf() {
    if (isFreePlan) {
      onGoToTarifs();
      return;
    }
    if (!cvReview) {
      window.print();
      return;
    }
    // Le bouton doit imprimer uniquement le CV, pas toute la page de
    // résultats (score, recommandations, réseautage...). On force l'aperçu
    // CV à s'ouvrir si besoin, on masque le reste via une classe le temps de
    // l'impression, puis on restaure l'état initial.
    const wasPreviewOpen = previewOpen;
    if (!wasPreviewOpen) setPreviewOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add("print-cv-only");
        window.print();
        document.body.classList.remove("print-cv-only");
        if (!wasPreviewOpen) setPreviewOpen(false);
      });
    });
  }

  const scoreTier =
    matchInsights.score >= 80 ? "excellent" : matchInsights.score >= 65 ? "good" : matchInsights.score >= 50 ? "average" : "weak";

  return (
    <div className="match-results-shell" id="match-print-area">
      <div className="match-top-grid">
        <article className="card match-score-card">
          <h3>
            <UiIcon name="chart" /> {copy.matchScoreLabel}
          </h3>
          <div className={`score-ring match-score-ring-lg tier-${scoreTier}`} style={{ "--pct": `${matchInsights.score}%` }}>
            <strong>{matchInsights.score}%</strong>
          </div>
          <span className={`match-verdict-pill tier-${scoreTier}`}>{verdictLabel}</span>
          {trackerStatus === "done" ? (
            <button
              type="button"
              className="btn-secondary match-tracker-btn match-tracker-btn-remove no-print"
              disabled={trackerStatus === "removing"}
              onClick={handleRemoveFromTracker}
            >
              <UiIcon name="trash" />
              {trackerStatus === "removing" ? applicationsCopy.formSaving : applicationsCopy.removeFromTrackerBtn}
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary match-tracker-btn no-print"
              disabled={trackerStatus === "saving"}
              onClick={handleAddToTracker}
            >
              <UiIcon name="briefcase" />
              {trackerStatus === "saving" ? applicationsCopy.formSaving : applicationsCopy.addToTrackerBtn}
            </button>
          )}
        </article>

        <article className="card match-results-card">
          <h3>
            <UiIcon name="chart" /> {copy.matchResultsTitle}
          </h3>
          <p className="muted">{copy.matchResultsSubtitle}</p>
          <div className="match-grid">
            <div className="match-subblock match-subblock-success">
              <h4 className="success-heading">
                <UiIcon name="shield" /> {copy.matchStrengths}
              </h4>
              <ul className="match-strength-list">
                {(matchInsights.strengths || []).map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="match-subblock match-subblock-danger">
              <h4 className="danger-heading">
                <UiIcon name="alert" /> {copy.matchMissingKeywords}
              </h4>
              {missingKeywords.length ? (
                <div className="job-chip-row missing-keyword-row">
                  {missingKeywords.map((keyword) => (
                    <span key={keyword} className="missing-keyword-chip">
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted">{copy.matchNoMissingKeywords}</p>
              )}
            </div>
          </div>
        </article>
      </div>

      <article className="card block cultural-fit-card">
        <h3>
          <UiIcon name="chat" /> {copy.matchCulturalFit}
        </h3>
        <div className="cultural-fit-box">
          <p>{matchInsights.culturalFit}</p>
        </div>
      </article>

      <article className="card block match-block">
        <div className="match-block-head">
          <h3>
            <UiIcon name="chart" /> {copy.matchRecommendations}
          </h3>
          <div className="match-feedback no-print">
            {feedback ? (
              <span className="match-feedback-thanks">{copy.matchFeedbackThanks}</span>
            ) : (
              <>
                <span>{copy.matchFeedbackQuestion}</span>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(true)}>
                  <UiIcon name="thumbUp" /> {copy.matchFeedbackYes}
                </button>
                <button type="button" className="match-feedback-btn" disabled={feedbackSaving} onClick={() => handleFeedback(false)}>
                  <UiIcon name="thumbDown" /> {copy.matchFeedbackNo}
                </button>
              </>
            )}
          </div>
        </div>
        <ol className="match-recommendation-list">
          {(matchInsights.recommendations || []).map((item, index) => (
            <li key={`${item.title}-${index}`} className={`match-recommendation ${levelTag(item.level)}`}>
              <span className="match-recommendation-index">{index + 1}</span>
              <div className="match-recommendation-body">
                <div className="match-recommendation-head">
                  <strong>{item.title}</strong>
                  <span className={`match-recommendation-level ${levelTag(item.level)}`}>
                    {recommendationLevelLabel(item.level, language)}
                  </span>
                </div>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="card block ats-optimize-card no-print">
        <h3>
          <UiIcon name="spark" /> {cvCopy.atsOptimizeTitle}
        </h3>
        <p className="muted">{cvCopy.atsOptimizeText}</p>
        {atsError ? <p className="field-error">{atsError}</p> : null}
        {!hasOfferContext ? (
          <p className="muted">{cvCopy.atsNoOffer}</p>
        ) : (
          <button type="button" className="btn-main ready" onClick={handleAtsOptimize} disabled={isAtsOptimizing}>
            {isAtsOptimizing ? (
              <>
                <span className="btn-spinner" /> {cvCopy.atsOptimizing}
              </>
            ) : (
              cvCopy.atsOptimizeBtn
            )}
          </button>
        )}

        {atsOptimization ? (
          <div className="ats-result">
            <h4>{cvCopy.atsResultTitle}</h4>
            {atsOptimization.optimizedHeadline ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsHeadline}</span>
                <p>{atsOptimization.optimizedHeadline}</p>
              </div>
            ) : null}
            {atsOptimization.optimizedSummary ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsSummary}</span>
                <p>{atsOptimization.optimizedSummary}</p>
              </div>
            ) : null}
            {atsOptimization.experiences?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsExperiences}</span>
                {atsOptimization.experiences.map((item, index) => (
                  <div key={`${item.company}-${index}`} className="ats-result-experience">
                    <strong>{item.role} · {item.company}</strong>
                    <CvEntryDescription text={item.optimizedDescription} />
                  </div>
                ))}
              </div>
            ) : null}
            {atsOptimization.prioritizedSkills?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsSkillsOrder}</span>
                <div className="cv-document-skill-chips">
                  {atsOptimization.prioritizedSkills.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {atsOptimization.missingKeywords?.length ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsMissingKeywords}</span>
                <div className="cv-document-skill-chips">
                  {atsOptimization.missingKeywords.map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="ats-missing-hint muted">{cvCopy.atsMissingKeywordsHint}</p>
              </div>
            ) : null}
            {atsOptimization.atsNotes ? (
              <div className="ats-result-block">
                <span className="muted">{cvCopy.atsNotesTitle}</span>
                <p>{atsOptimization.atsNotes}</p>
              </div>
            ) : null}
            <button type="button" className="btn-main ready" onClick={handleAtsApply} disabled={atsSaving}>
              {atsSaving ? (
                <>
                  <span className="btn-spinner" /> {cvCopy.atsApplying}
                </>
              ) : (
                <>
                  <UiIcon name="check" /> {cvCopy.atsApply}
                </>
              )}
            </button>
            {atsApplied ? <p className="ats-applied-hint">{cvCopy.atsApplied}</p> : null}
          </div>
        ) : null}
      </article>

      <article className="card block match-networking-card no-print">
        <h3>
          <UiIcon name="briefcase" /> {copy.matchNetworkingTitle}
        </h3>
        <p className="muted">{fillTemplate(copy.matchNetworkingText, { company: company || "cette entreprise" })}</p>
        <button type="button" className="btn-main ready" onClick={handleFindContacts} disabled={networkingState === "searching"}>
          {networkingState === "searching" ? copy.matchNetworkingSearching : copy.matchNetworkingButton}
        </button>
        {networkingState === "done" ? (
          <div className="match-networking-result">
            <p>{copy.matchNetworkingEmpty}</p>
            <div className="match-networking-links">
              {(networkingQueries.length ? networkingQueries : [{ label: copy.matchNetworkingOpenLinkedin, query: searchQuery }]).map(
                (item) => (
                  <a key={item.label} href={linkedinSearchUrl(item.query)} target="_blank" rel="noreferrer">
                    <UiIcon name="briefcase" />
                    <span>{item.label}</span>
                    <UiIcon name="chevron" className="match-networking-arrow" />
                  </a>
                )
              )}
            </div>
          </div>
        ) : null}
      </article>

      {previewOpen ? (
        <CvPreviewCard cvReview={cvReview} copy={copy} language={language} avatarDataUrl={avatarDataUrl} onClose={() => setPreviewOpen(false)} />
      ) : null}

      <div className="match-action-bar no-print">
        <div className="match-language-pill">
          <UiIcon name="globe" />
          <span>{copy.matchCvLanguageLabel}</span>
          <strong>{languageLabel}</strong>
        </div>
        <div className="match-action-buttons">
          <button type="button" className="btn-secondary" onClick={() => setPreviewOpen((value) => !value)}>
            <UiIcon name="eye" /> {previewOpen ? copy.matchHidePreview : copy.matchPreviewCv}
          </button>
          <button type="button" className="btn-secondary" onClick={handleShare}>
            <UiIcon name="share" /> {shareStatus === "copied" ? copy.matchShareCopied : copy.matchShare}
          </button>
          <button type="button" className="btn-main ready" onClick={handleDownloadPdf}>
            <UiIcon name="download" /> {copy.matchDownloadPdf}
          </button>
        </div>
      </div>
    </div>
  );
}

// Rend une description d'expérience/formation en points distincts (une
// réalisation par ligne) plutôt qu'un seul paragraphe bloc — bien plus lisible
// dès qu'il y a plusieurs missions. Le texte source peut arriver déjà
// découpé par \n (heuristique et prompt IA) ou en un seul bloc plus ancien ;
// dans ce dernier cas on retombe sur un découpage par phrase.
function CvEntryDescription({ text }) {
  if (!text) return null;
  const rawLines = text.includes("\n") ? text.split("\n") : text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/);
  const lines = rawLines.map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return <p className="cv-document-entry-desc">{lines[0] || text}</p>;
  }
  return (
    <ul className="cv-document-entry-desc-list">
      {lines.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
    </ul>
  );
}

function CvPreviewCard({ cvReview, copy, language, avatarDataUrl, onClose }) {
  const [template, setTemplate] = useState("classic");

  if (!cvReview) {
    return (
      <article className="card block cv-preview-card no-print">
        <h3>
          <UiIcon name="profile" /> {copy.matchCvPreviewTitle}
        </h3>
        <p className="muted">{copy.matchCvPreviewEmpty}</p>
      </article>
    );
  }

  return (
    <article className="card block cv-preview-card">
      <div className="cv-preview-toolbar no-print">
        <h3>
          <UiIcon name="profile" /> {copy.matchCvPreviewTitle}
        </h3>
        <div className="cv-template-switch">
          <button type="button" className={template === "classic" ? "active" : ""} onClick={() => setTemplate("classic")}>
            {copy.cvTemplateClassic}
          </button>
          <button type="button" className={template === "sidebar" ? "active" : ""} onClick={() => setTemplate("sidebar")}>
            {copy.cvTemplateSidebar}
          </button>
        </div>
        <button type="button" className="cv-preview-close" onClick={onClose}>
          {copy.matchHidePreview}
        </button>
      </div>

      {template === "sidebar" ? (
        <CvDocumentSidebar cvReview={cvReview} copy={copy} avatarDataUrl={avatarDataUrl} />
      ) : (
        <CvDocumentClassic cvReview={cvReview} copy={copy} />
      )}
    </article>
  );
}

function CvDocumentClassic({ cvReview, copy }) {
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const contactItems = [cvReview.email, cvReview.phone, cvReview.location].filter(Boolean);

  return (
    <>
      <div className="cv-document" id="cv-preview-document">
        <header className="cv-document-header">
          {fullName ? <h2>{fullName.toUpperCase()}</h2> : null}
          {cvReview.headline ? <p className="cv-document-headline">{cvReview.headline}</p> : null}
          {contactItems.length || cvReview.linkedinUrl ? (
            <div className="cv-document-contact">
              {contactItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
              {cvReview.linkedinUrl ? (
                <a href={cvReview.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        {cvReview.summary ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewSummary}</h4>
            <p>{cvReview.summary}</p>
          </section>
        ) : null}

        {(cvReview.experiences || []).length ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewExperience}</h4>
            {cvReview.experiences.slice(0, 6).map((experience, index) => (
              <div className="cv-document-entry" key={`${experience.company}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{experience.role}</strong>
                  {experience.dates ? <span>{experience.dates}</span> : null}
                </div>
                {experience.company ? <p className="cv-document-entry-org">{experience.company}</p> : null}
                <CvEntryDescription text={experience.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.educationItems || []).length ? (
          <section className="cv-document-section">
            <h4>{copy.cvPreviewEducation}</h4>
            {cvReview.educationItems.slice(0, 4).map((item, index) => (
              <div className="cv-document-entry" key={`${item.school}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{item.school}</strong>
                  {item.dates ? <span>{item.dates}</span> : null}
                </div>
                {item.degree ? <p className="cv-document-entry-org">{item.degree}</p> : null}
                <CvEntryDescription text={item.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <section className="cv-document-section cv-document-skills-grid">
            {(cvReview.skills || []).length ? (
              <div>
                <h4>{copy.cvPreviewTechnicalSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.skills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <div>
                <h4>{copy.cvPreviewSoftSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.softSkills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(cvReview.languages || []).length || (cvReview.certifications || []).length || (cvReview.interests || []).length ? (
          <section className="cv-document-section cv-document-skills-grid">
            {(cvReview.languages || []).length ? (
              <div>
                <h4>{copy.cvPreviewLanguages}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.languages.filter(Boolean).map((language) => (
                    <span key={language} className="cv-document-skill-chip">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.certifications || []).length ? (
              <div>
                <h4>{copy.cvPreviewCertifications}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.certifications
                    .filter((item) => item?.name || item?.issuer)
                    .map((item, index) => (
                      <span key={`${item.name}-${index}`} className="cv-document-skill-chip">
                        {[item.name, item.issuer].filter(Boolean).join(" · ")}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
            {(cvReview.interests || []).length ? (
              <div>
                <h4>{copy.cvPreviewInterests}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.interests.filter(Boolean).map((interest) => (
                    <span key={interest} className="cv-document-skill-chip soft">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}

function CvSidebarInitials({ firstName, lastName }) {
  const initials = [firstName, lastName]
    .map((part) => (part || "").trim().charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return <span className="cv-sidebar-avatar-initials">{initials || "?"}</span>;
}

function CvDocumentSidebar({ cvReview, copy, avatarDataUrl }) {
  const fullName = [cvReview.firstName, cvReview.lastName].filter(Boolean).join(" ");
  const socialLinks = [
    cvReview.linkedinUrl ? { label: "LinkedIn", url: cvReview.linkedinUrl } : null,
    cvReview.portfolioUrl ? { label: copy.cvPreviewPortfolio, url: cvReview.portfolioUrl } : null
  ].filter(Boolean);

  return (
    <div className="cv-document cv-document-sidebar" id="cv-preview-document">
      <aside className="cv-sidebar-aside">
        <div className="cv-sidebar-avatar">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt={fullName} />
          ) : (
            <CvSidebarInitials firstName={cvReview.firstName} lastName={cvReview.lastName} />
          )}
        </div>

        {cvReview.email || cvReview.phone || cvReview.location ? (
          <div className="cv-sidebar-block">
            {cvReview.email ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="mail" />
                <span>{cvReview.email}</span>
              </div>
            ) : null}
            {cvReview.phone ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="phone" />
                <span>{cvReview.phone}</span>
              </div>
            ) : null}
            {cvReview.location ? (
              <div className="cv-sidebar-contact-row">
                <UiIcon name="pin" />
                <span>{cvReview.location}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {(cvReview.certifications || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewCertifications}</h4>
            <ul className="cv-sidebar-list">
              {cvReview.certifications
                .filter((item) => item?.name || item?.issuer)
                .map((item, index) => (
                  <li key={`${item.name}-${index}`}>{[item.name, item.issuer].filter(Boolean).join(" · ")}</li>
                ))}
            </ul>
          </div>
        ) : null}

        {(cvReview.languages || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewLanguages}</h4>
            <div className="cv-document-skill-chips">
              {cvReview.languages.filter(Boolean).map((item) => (
                <span key={item} className="cv-document-skill-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {socialLinks.length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewSocial}</h4>
            <ul className="cv-sidebar-list cv-sidebar-links">
              {socialLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(cvReview.interests || []).length ? (
          <div className="cv-sidebar-block">
            <h4>{copy.cvPreviewInterests}</h4>
            <ul className="cv-sidebar-list">
              {cvReview.interests.filter(Boolean).map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>

      <main className="cv-sidebar-main">
        <header className="cv-sidebar-header">
          {fullName ? <h2>{fullName}</h2> : null}
          {cvReview.headline ? <p className="cv-document-headline">{cvReview.headline}</p> : null}
        </header>

        {cvReview.summary ? (
          <section className="cv-sidebar-summary">
            <h4>{copy.cvPreviewSummary}</h4>
            <p>{cvReview.summary}</p>
          </section>
        ) : null}

        {(cvReview.skills || []).length || (cvReview.softSkills || []).length ? (
          <section className="cv-document-section">
            {(cvReview.skills || []).length ? (
              <div>
                <h4>{copy.cvPreviewTechnicalSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.skills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(cvReview.softSkills || []).length ? (
              <div style={{ marginTop: (cvReview.skills || []).length ? "0.9rem" : 0 }}>
                <h4>{copy.cvPreviewSoftSkills}</h4>
                <div className="cv-document-skill-chips">
                  {cvReview.softSkills.filter(Boolean).map((skill) => (
                    <span key={skill} className="cv-document-skill-chip soft">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {(cvReview.experiences || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewExperience}</h4>
            {cvReview.experiences.slice(0, 6).map((experience, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${experience.company}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{[experience.role, experience.company].filter(Boolean).join(" | ")}</strong>
                  {experience.dates ? <span>{experience.dates}</span> : null}
                </div>
                {experience.location ? <p className="cv-document-entry-org">{experience.location}</p> : null}
                <CvEntryDescription text={experience.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.projects || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewProjects}</h4>
            {cvReview.projects.slice(0, 4).map((project, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${project.name}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{project.name}</strong>
                </div>
                {(project.technologies || []).length ? (
                  <div className="cv-document-skill-chips">
                    {project.technologies.filter(Boolean).map((tech) => (
                      <span key={tech} className="cv-document-skill-chip soft">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : null}
                <CvEntryDescription text={project.description} />
              </div>
            ))}
          </section>
        ) : null}

        {(cvReview.educationItems || []).length ? (
          <section className="cv-document-section cv-sidebar-timeline">
            <h4>{copy.cvPreviewEducation}</h4>
            {cvReview.educationItems.slice(0, 4).map((item, index) => (
              <div className="cv-sidebar-timeline-entry" key={`${item.school}-${index}`}>
                <div className="cv-document-entry-head">
                  <strong>{item.school}</strong>
                  {item.dates ? <span>{item.dates}</span> : null}
                </div>
                {item.degree ? <p className="cv-document-entry-org">{item.degree}</p> : null}
                <CvEntryDescription text={item.description} />
              </div>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function TokenEditor({ label, items, addLabel, onChange, onRemove, onAdd }) {
  return (
    <div className="token-editor">
      <div className="review-field-label">{label}</div>
      <div className="token-grid">
        {items.map((item, index) => (
          <div className="token-input" key={`${label}-${index}`}>
            <input value={item} onChange={(event) => onChange(index, event.target.value)} />
            <button type="button" onClick={() => onRemove(index)} aria-label="Remove">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost token-add" onClick={onAdd}>
        + {addLabel}
      </button>
    </div>
  );
}

function ReviewCard({ title, icon, children }) {
  return (
    <section className="review-card">
      <header>
        <span>
          <UiIcon name={icon} />
        </span>
        <h3>{title}</h3>
      </header>
      <div className="review-card-body">{children}</div>
    </section>
  );
}

function EditableBlock({ title, onRemove, children }) {
  return (
    <div className="editable-block">
      <div className="editable-block-head">
        <strong>{title}</strong>
        <button type="button" onClick={onRemove} aria-label="Remove">
          ×
        </button>
      </div>
      <div className="editable-block-body">{children}</div>
    </div>
  );
}


function AnalysisPage({ matchData, language }) {
  const copy = CV_COPY[language]?.analysis || CV_COPY.fr.analysis;
  if (!matchData) {
    return <Placeholder title={copy.unavailableTitle} text={copy.unavailableText} />;
  }

  const { summary, domainScores, strengths, gaps, bestMatch } = matchData;

  return (
    <section className="analysis-page">
      <div className="score-hero card">
        <div className="score-ring" style={{ "--pct": `${summary.globalScore}%` }}>
          <strong>{summary.globalScore}</strong>
          <span>/100</span>
        </div>
        <div>
          <h2>
            {ratingLabel(summary.globalScore, language)} · {summary.title}
          </h2>
          <p>{summary.subtitle}</p>
          <div className="tag-row">
            <span className="tag">{copy.skillCoverage}: {bestMatch.skillCoverage}%</span>
            <span className="tag">{copy.experienceFit}: {bestMatch.experienceFit}%</span>
            <span className="tag">{copy.verdict}: {summary.verdict}</span>
          </div>
        </div>
      </div>

      <div className="section-grid">
        <div className="card block">
          <h3>{copy.domain}</h3>
          {domainScores.map((item) => (
            <div className="bar-item" key={item.domain}>
              <div className="bar-meta">
                <span>{item.domain}</span>
                <span>{item.value}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card block">
          <h3>{copy.quickRead}</h3>
          <div className="point-group">
            <h4>{copy.strengths}</h4>
            <ul>
              {strengths.map((point, idx) => (
                <li key={`${point}-${idx}`}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="point-group">
            <h4>{copy.gaps}</h4>
            <ul>
              {gaps.map((gap, idx) => (
                <li key={`${gap}-${idx}`}>{gap}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OffersPage({ matchData, premium, language }) {
  const copy = CV_COPY[language]?.offers || CV_COPY.fr.offers;
  if (!matchData) {
    return <Placeholder title={copy.unavailableTitle} text={copy.unavailableText} />;
  }

  return (
    <section className="offers-page">
      <div className="card block offers-head">
        <h2>{copy.title}</h2>
        <p>
          {copy.average} : <strong>{matchData.portfolioScore}</strong> / 100
        </p>
        <p className="muted">
          {copy.premiumAccess} : {premium?.hasAccess ? copy.open : copy.closed} ({premium?.source || "locked"})
        </p>
      </div>

      <div className="offers-grid">
        {matchData.rankedOffers.map((item) => (
          <article key={item.offer.id} className={`offer-card ${item.locked ? "locked" : ""}`}>
            <div className="offer-top">
              <div>
                <h3>{item.offer.title}</h3>
                <p>
                  {item.offer.company} · {item.offer.location} · {item.offer.contract}
                </p>
              </div>
              <div className="score-pill">{item.score}</div>
            </div>

            <div className="tag-row">
              <span className="tag">{ratingLabel(item.score, language)}</span>
              <span className="tag">{copy.skills} {item.skillCoverage}%</span>
              {item.offer.premium ? <span className="tag premium">Premium</span> : null}
              {item.locked ? <span className="tag crit">{copy.locked}</span> : null}
            </div>

            <div className="offer-body">
              <div>
                <h4>{copy.detected}</h4>
                <p>{item.matchedSkills.length ? item.matchedSkills.join(", ") : copy.noDetection}</p>
              </div>
              <div>
                <h4>{copy.mainGaps}</h4>
                <p>{item.missingSkills.length ? item.missingSkills.slice(0, 5).join(", ") : copy.noGap}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CvHistoryPage({ cvHistory, latestMatch, language }) {
  const [expandedIds, setExpandedIds] = useState({});

  const emptyTitle = language === "en" ? "No CV generated yet" : "Aucun CV généré pour le moment";
  const emptyText =
    language === "en"
      ? "Your history will appear here each time you import and optimize a CV."
      : "Votre historique apparaîtra ici à chaque fois que vous importerez et optimiserez un CV.";

  function toggleExpanded(cvId) {
    setExpandedIds((prev) => ({ ...prev, [cvId]: !prev[cvId] }));
  }

  if (!cvHistory.length) {
    return (
      <section className="history-empty">
        <div className="history-empty-icon">
          <UiIcon name="history" />
        </div>
        <h2>{emptyTitle}</h2>
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="cv-history-page">
      <div className="card block history-head">
        <div className="feature-page-header">
          <span className="feature-page-header-icon">
            <UiIcon name="history" />
          </span>
          <div>
            <h2>{language === "en" ? "CV history" : "Historique CV"}</h2>
            <p className="muted">
              {language === "en"
                ? "All imported CVs are kept here with their extracted data."
                : "Tous les CV importés sont conservés ici avec leurs données extraites."}
            </p>
          </div>
        </div>
        <div className="history-count-badge">
          <strong>{cvHistory.length}</strong>
          <span>{cvHistory.length > 1 ? (language === "en" ? "CVs" : "CV importés") : (language === "en" ? "CV" : "CV importé")}</span>
        </div>
      </div>

      <div className="history-list">
        {cvHistory.map((cv) => {
          const skills = cv.parsed?.skills || [];
          const score = latestMatch?.summary?.globalScore ?? null;
          const scoreTier = score === null ? null : score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 50 ? "average" : "weak";
          const isExpanded = Boolean(expandedIds[cv.id]);
          const collapsedCount = 10;
          const visibleSkills = isExpanded ? skills : skills.slice(0, collapsedCount);
          const hiddenCount = skills.length - visibleSkills.length;

          return (
            <article className="history-card" key={cv.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <span className="history-card-icon">
                    <UiIcon name="history" />
                  </span>
                  <div>
                    <h3>{cv.fileName}</h3>
                    <p>{formatDate(cv.createdAt)}</p>
                  </div>
                </div>
                {score !== null ? (
                  <div className={`history-card-score tier-${scoreTier}`}>
                    <strong>{score}</strong>
                    <span>/100</span>
                  </div>
                ) : null}
              </div>

              <div className="history-card-stats">
                <span className="history-card-stat">
                  <UiIcon name="chart" />
                  {skills.length} {language === "en" ? "skills detected" : "compétences détectées"}
                </span>
              </div>

              <div className="job-chip-row history-skill-row">
                {visibleSkills.map((skill) => (
                  <span key={`${cv.id}-${skill}`}>{skill}</span>
                ))}
                {!skills.length ? <span>{language === "en" ? "No skill detected" : "Aucune compétence détectée"}</span> : null}
              </div>
              {skills.length > collapsedCount ? (
                <button type="button" className="history-skill-toggle" onClick={() => toggleExpanded(cv.id)}>
                  {isExpanded
                    ? language === "en"
                      ? "Show less"
                      : "Voir moins"
                    : language === "en"
                    ? `Show all (+${hiddenCount})`
                    : `Voir tout (+${hiddenCount})`}
                  <UiIcon name="chevron" className={`history-skill-toggle-icon ${isExpanded ? "open" : ""}`} />
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export { ImportPage, AnalysisPage, OffersPage, CvHistoryPage };
