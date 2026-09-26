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
import { fillTemplate, formatDate, formatDateTime } from "../../lib/format.js";
import { getPlanById } from "../../data/plans.js";
import {
  submitMatchFeedback,
  getMatchFeedback,
  optimizeCvForAts,
  listJobApplications,
  createJobApplication,
  deleteJobApplication,
  listTrashedCvs,
  trashCvs,
  restoreCvs,
  purgeCvs
} from "../../lib/inMemoryDb.js";
import { APPLICATIONS_COPY } from "../applications/applicationsCopy.js";
import { CV_COPY } from "./cvCopy.js";
import { ratingLabel, levelTag, recommendationLevelLabel } from "../../App.jsx";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";
import { CvUploadArt, JobPostArt, HistoryHeroArt, ModuleHero } from "../../components/ModuleWorkspace.jsx";

function ImportPage({
  onGoToModule,
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

  // --- Phase 1 : contrôle du fichier avant envoi (le serveur revérifie).
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const CV_MAX_BYTES = 7 * 1024 * 1024;

  function handlePickedFile(file) {
    if (!file) return;
    if (!/\.(pdf|docx?|txt|md)$/i.test(file.name || "")) {
      setUploadError(copy.uploadBadFormat);
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setUploadError(copy.uploadTooLarge);
      return;
    }
    if (!file.size) {
      setUploadError(copy.uploadEmpty);
      return;
    }
    setUploadError("");
    onFileUpload(file);
  }

  // --- Phase 2 : complétude réelle du profil extrait.
  const filled = (value) => (Array.isArray(value) ? value.some((item) => (typeof item === "string" ? item.trim() : item)) : String(value || "").trim());
  const completenessChecks = cvReview
    ? [
        [copy.fieldFirstName, cvReview.firstName],
        [copy.fieldLastName, cvReview.lastName],
        ["Email", cvReview.email],
        [copy.fieldPhone, cvReview.phone],
        [copy.fieldLocation, cvReview.location],
        [copy.fieldHeadline, cvReview.headline],
        [copy.fieldSummary, cvReview.summary],
        [copy.fieldSkills, cvReview.skills],
        [copy.fieldExperiences, cvReview.experiences],
        [copy.fieldEducation, cvReview.educationItems],
        [copy.fieldLanguages, cvReview.languages]
      ]
    : [];
  const completeness = {
    pct: completenessChecks.length ? Math.round((completenessChecks.filter(([, value]) => filled(value)).length / completenessChecks.length) * 100) : 0,
    missing: completenessChecks.filter(([, value]) => !filled(value)).map(([label]) => label)
  };
  const countFilled = (list) => (list || []).filter((item) => filled(typeof item === "string" ? item : Object.values(item || {}))).length;
  const reviewCounts = cvReview
    ? [
        { value: countFilled(cvReview.skills), label: copy.countSkills },
        { value: countFilled(cvReview.experiences), label: copy.countExperiences },
        { value: countFilled(cvReview.educationItems), label: copy.countEducation },
        { value: countFilled(cvReview.languages), label: copy.countLanguages }
      ]
    : [];

  // --- Phase 3 : saisie et fiche de l'offre.
  const offerLength = offerText.trim().length;
  const offerReady = offerLength > 50;
  const offerProgress = Math.min(100, Math.round((offerLength / 51) * 100));

  async function handlePasteOffer() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setOfferText(text);
    } catch (_error) {
      // Accès au presse-papiers refusé : l'utilisateur colle avec Ctrl+V.
    }
  }

  function cleanJobValue(value) {
    const text = String(value || "").trim();
    return !text || /^non pr[ée]cis[ée]$|^not specified$/i.test(text) ? "" : text;
  }

  const offerFacts = jobReview
    ? [
        cleanJobValue(jobReview.contract) ? { icon: "file", label: cleanJobValue(jobReview.contract) } : null,
        cleanJobValue(jobReview.sector) ? { icon: "network", label: cleanJobValue(jobReview.sector) } : null,
        Number(jobReview.experienceMin) > 0 ? { icon: "chart", label: copy.factExperience.replace("{years}", jobReview.experienceMin) } : null,
        cleanJobValue(jobReview.education) ? { icon: "profile", label: cleanJobValue(jobReview.education) } : null
      ].filter(Boolean)
    : [];

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
        <div className="iw-layout">
          <div className="iw-main">
            <header className="iw-head">
              <span className="mw-eyebrow">{copy.stepEyebrow.replace("{n}", "1")}</span>
              <h2>{copy.uploadTitle}</h2>
              <p>{copy.uploadText}</p>
            </header>

            <label
              className={`iw-drop ${dragActive ? "is-over" : ""} ${isExtractingCv ? "is-busy" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isExtractingCv) setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                if (!isExtractingCv) handlePickedFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept=".txt,.md,.pdf,.doc,.docx"
                disabled={isExtractingCv}
                onChange={(event) => {
                  handlePickedFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {isExtractingCv ? (
                <div className="iw-extracting">
                  <CvUploadArt scanning />
                  <strong>{copy.analysingTitle}</strong>
                  <span>{copy.analysingText}</span>
                  <ol className="iw-extract-steps">
                    {copy.extractingSteps.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ol>
                </div>
              ) : (
                <>
                  <CvUploadArt />
                  <strong className="iw-drop-title">{dragActive ? copy.dropRelease : copy.dropTitle}</strong>
                  <span className="iw-drop-sub">
                    {copy.dropOr} <em>{copy.dropBrowse}</em>
                  </span>
                  <span className="iw-formats">
                    {["PDF", "DOCX", "DOC", "TXT"].map((format) => (
                      <i key={format}>{format}</i>
                    ))}
                    <small>{copy.dropMaxSize}</small>
                  </span>
                </>
              )}
            </label>
            {uploadError ? (
              <p className="iw-error" role="alert">
                <UiIcon name="alert" />
                {uploadError}
              </p>
            ) : null}

            {latestCv && !isExtractingCv ? (
              <div className="iw-resume">
                <span className="iw-resume-icon">
                  <UiIcon name="file" />
                </span>
                <div>
                  <strong>{copy.lastCvLabel}</strong>
                  <small>
                    {latestCv.fileName}
                    {latestCv.createdAt ? ` · ${formatDateTime(latestCv.createdAt, language)}` : ""}
                  </small>
                </div>
                <button type="button" className="btn-secondary" onClick={() => onStepClick("job")}>
                  {copy.lastCvContinue} <UiIcon name="chevron" />
                </button>
              </div>
            ) : null}
          </div>

          <aside className="iw-side">
            <div className="mw-side-card">
              <div className="mw-side-head">
                <span>{copy.extractTitle}</span>
              </div>
              <ul className="iw-extract-list">
                {copy.extractItems.map((item) => (
                  <li key={item.label}>
                    <span>
                      <UiIcon name={item.icon} />
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mw-side-card iw-privacy">
              <UiIcon name="shield" />
              <p>{copy.privacyText}</p>
            </div>
          </aside>
        </div>
      ) : null}

      {importStep === "review" && cvReview ? (
        <div className="cv-review-shell iw-review">
          <div className="iw-review-head">
            <header className="iw-head">
              <span className="mw-eyebrow">{copy.stepEyebrow.replace("{n}", "2")}</span>
              <h2>{copy.reviewTitle}</h2>
              <p>{copy.reviewText}</p>
              <div className="iw-counts">
                {reviewCounts.map((item) => (
                  <span key={item.label}>
                    <strong>{item.value}</strong> {item.label}
                  </span>
                ))}
              </div>
            </header>
            <div className={`iw-complete ${completeness.pct === 100 ? "is-full" : ""}`}>
              <div className="iw-complete-ring" style={{ "--pct": `${completeness.pct}%` }}>
                <strong>{completeness.pct}%</strong>
              </div>
              <div>
                <strong>{copy.completenessTitle}</strong>
                {completeness.missing.length ? (
                  <>
                    <small>{copy.completenessMissing}</small>
                    <div className="iw-missing">
                      {completeness.missing.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <small>{copy.completenessFull}</small>
                )}
              </div>
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
                  <p className="review-empty">{language === "en" ? "No education detected. Add it manually if needed." : "Aucune formation détectée. Ajoutez-la manuellement si besoin."}</p>
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

          <div className="iw-sticky no-print">
            <span>
              <UiIcon name="edit" />
              {copy.reviewBarHint}
            </span>
            <div className="review-actions">
              <button className="btn-secondary" onClick={onReimport}>
                <UiIcon name="upload" />
                {copy.reimport}
              </button>
              <button className="btn-main ready" onClick={() => onReviewSave(cvReview)}>
                <UiIcon name="save" />
                {copy.saveContinue}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importStep === "job" ? (
        <div className="job-target-shell iw-job">
          {!jobReview ? (
            <div className="iw-layout">
              <div className="iw-main">
                <header className="iw-head">
                  <span className="mw-eyebrow">{copy.stepEyebrow.replace("{n}", "3")}</span>
                  <h2>{copy.jobTitle}</h2>
                  <p>{copy.jobText}</p>
                </header>
                <div className="card block job-card iw-job-card">
                  <div className="iw-job-toolbar">
                    <span>{copy.jobDescription}</span>
                    <div>
                      {offerText ? (
                        <button type="button" className="iw-mini-btn" onClick={() => setOfferText("")}>
                          <UiIcon name="trash" /> {copy.clearOffer}
                        </button>
                      ) : null}
                      <button type="button" className="iw-mini-btn" onClick={handlePasteOffer}>
                        <UiIcon name="file" /> {copy.pasteOffer}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={offerText}
                    onChange={(event) => setOfferText(event.target.value)}
                    placeholder={copy.offerPlaceholder}
                    rows={13}
                  />
                  <div className="iw-progress" aria-hidden="true">
                    <i style={{ width: `${offerProgress}%` }} className={offerReady ? "is-ready" : ""} />
                  </div>
                  <div className="counter-row">
                    <span>
                      {offerLength} {copy.chars}
                    </span>
                    <span className={offerReady ? "iw-ready" : ""}>{offerReady ? copy.ready : copy.minimum}</span>
                  </div>
                  <button className={`btn-main ${offerReady ? "ready" : ""}`} disabled={!offerReady || isReviewingJob} onClick={onJobReview}>
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
              </div>
              <aside className="iw-side">
                <div className="mw-side-card iw-side-art">
                  <JobPostArt />
                </div>
                <div className="mw-side-card">
                  <div className="mw-side-head">
                    <span>{copy.jobTipsTitle}</span>
                  </div>
                  <ul className="iw-tips">
                    {copy.jobTips.map((tip) => (
                      <li key={tip}>
                        <UiIcon name="check" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          ) : (
            <>
              <header className="iw-head">
                <span className="mw-eyebrow">{copy.stepEyebrow.replace("{n}", "3")}</span>
                <h2>{copy.jobSummaryTitle}</h2>
                <p>{copy.jobSummaryText}</p>
              </header>
              <article className="iw-offer">
                <div className="iw-offer-head">
                  <span className="iw-offer-logo">{(jobReview.company || jobReview.title || "?").trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <h3>{jobReview.title}</h3>
                    <p>{[jobReview.company, cleanJobValue(jobReview.location)].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
                {offerFacts.length ? (
                  <div className="iw-facts">
                    {offerFacts.map((fact) => (
                      <span key={fact.label}>
                        <UiIcon name={fact.icon} />
                        {fact.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="iw-offer-grid">
                  <div className="iw-offer-col">
                    {jobReview.description ? (
                      <section>
                        <h4>{copy.offerDescription}</h4>
                        <p>{jobReview.description}</p>
                      </section>
                    ) : null}
                    {jobReview.missions?.length ? (
                      <section>
                        <h4>{copy.offerMissions}</h4>
                        <ul className="iw-missions">
                          {jobReview.missions.map((mission) => (
                            <li key={mission}>
                              <UiIcon name="check" />
                              <span>{mission.replace(/^[-•+]\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                  <div className="iw-offer-col">
                    <section>
                      <h4>
                        {copy.technicalSkills} <em>{jobReview.skills?.length || 0}</em>
                      </h4>
                      <div className="mr-chips">
                        {jobReview.skills?.length ? (
                          jobReview.skills.map((skill) => (
                            <span key={skill} className="mr-chip iw-chip">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="muted">{copy.noSkillsDetected}</span>
                        )}
                      </div>
                    </section>
                    <section>
                      <h4>
                        {copy.softSkills} <em>{jobReview.softSkills?.length || 0}</em>
                      </h4>
                      <div className="mr-chips">
                        {jobReview.softSkills?.length ? (
                          jobReview.softSkills.map((skill) => (
                            <span key={skill} className="mr-chip iw-chip soft">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="muted">{copy.noSkillsDetected}</span>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
                <div className="iw-offer-actions">
                  <button className="btn-secondary" onClick={onEditJob}>
                    <UiIcon name="edit" /> {copy.backToEdit}
                  </button>
                  <button className={`btn-main ${canAnalyse ? "ready" : ""}`} disabled={!canAnalyse || isAnalysing} onClick={onAnalyse}>
                    {isAnalysing ? (
                      <>
                        <span className="btn-spinner" /> {copy.analysing}
                      </>
                    ) : (
                      <>
                        {copy.analyseJob} <UiIcon name="chevron" className="btn-chevron" />
                      </>
                    )}
                  </button>
                </div>
                <AiDisclaimer
                  language={language}
                  text={
                    language === "en"
                      ? "Job details extracted by AI: check them against the original posting."
                      : "Informations extraites par l'IA : vérifiez-les au regard de l'annonce d'origine."
                  }
                />
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
          onGoToModule={onGoToModule}
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
  onConsumeToken,
  onGoToModule
}) {
  const [feedback, setFeedback] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [networkingState, setNetworkingState] = useState("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("idle");
  const [trackerStatus, setTrackerStatus] = useState("idle");
  const [trackerApplicationId, setTrackerApplicationId] = useState(null);
  const trackerLockRef = useRef(false);
  const atsCardRef = useRef(null);
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
    const summary = `${title}${company ? ` · ${company}` : ""} · ${copy.matchScoreLabel}: ${matchInsights.score}/100 (${verdictLabel})`;
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

  // Compétences demandées par l'offre réellement présentes dans le CV (liste
  // de compétences ou texte du CV) : calcul exact, aucune estimation.
  const normalizeSkill = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, " ")
      .trim();
  const cvSkillSet = new Set((cvReview?.skills || []).map(normalizeSkill).filter(Boolean));
  const cvTextNormalized = ` ${normalizeSkill(cvTextSample)} `;
  const offerSkills = [...new Set((jobReview?.skills || []).map((skill) => String(skill || "").trim()).filter(Boolean))];
  const matchedSkills = offerSkills.filter((skill) => {
    const key = normalizeSkill(skill);
    return key && (cvSkillSet.has(key) || cvTextNormalized.includes(` ${key} `));
  });
  const matchedKeys = new Set(matchedSkills.map(normalizeSkill));
  const toStrengthen = missingKeywords.filter((keyword) => !matchedKeys.has(normalizeSkill(keyword)));
  const coveragePct = offerSkills.length ? Math.round((matchedSkills.length / offerSkills.length) * 100) : null;
  const strengths = matchInsights.strengths || [];
  const location = jobReview?.location && jobReview.location !== "Non précisé" ? jobReview.location : "";
  const gaugeRadius = 70;
  const gaugeLength = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeLength * (1 - Math.max(0, Math.min(100, matchInsights.score)) / 100);

  function scrollToAts() {
    atsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const nextSteps = [
    { page: "lettre", icon: "mail", tone: "orange", title: copy.nextLetterTitle, text: copy.nextLetterText },
    { page: "entretiens", icon: "chat", tone: "violet", title: copy.nextInterviewTitle, text: copy.nextInterviewText },
    { page: "negociation", icon: "scale", tone: "green", title: copy.nextNegotiationTitle, text: copy.nextNegotiationText }
  ];

  return (
    <div className="match-results-shell" id="match-print-area">
      <section className={`mr-hero tier-${scoreTier}`}>
        <div className="mr-gauge" role="img" aria-label={`${copy.matchScoreLabel} : ${matchInsights.score}/100`}>
          <svg viewBox="0 0 170 170" aria-hidden="true">
            <circle cx="85" cy="85" r={gaugeRadius} className="mr-gauge-track" />
            <circle
              cx="85"
              cy="85"
              r={gaugeRadius}
              className="mr-gauge-value"
              strokeDasharray={gaugeLength}
              strokeDashoffset={gaugeOffset}
              style={{ "--gauge-length": gaugeLength }}
            />
          </svg>
          <div className="mr-gauge-label">
            <strong>{matchInsights.score}</strong>
            <span>/100</span>
          </div>
        </div>

        <div className="mr-hero-body">
          <span className="mw-eyebrow">{copy.matchHeroEyebrow}</span>
          <h2>
            <span className={`mr-verdict tier-${scoreTier}`}>{verdictLabel}</span>
          </h2>
          {title || company ? (
            <p className="mr-hero-role">
              <UiIcon name="briefcase" />
              <span>
                <strong>{title}</strong>
                {[company, location].filter(Boolean).length ? ` · ${[company, location].filter(Boolean).join(" · ")}` : ""}
              </span>
            </p>
          ) : null}
          <p className="mr-hero-summary">{copy[`matchTierText_${scoreTier}`]}</p>
          <div className="mr-hero-actions no-print">
            {trackerStatus === "done" || trackerStatus === "removing" ? (
              <button
                type="button"
                className="btn-secondary match-tracker-btn match-tracker-btn-remove"
                disabled={trackerStatus === "removing"}
                onClick={handleRemoveFromTracker}
              >
                <UiIcon name="trash" />
                {trackerStatus === "removing" ? applicationsCopy.formSaving : applicationsCopy.removeFromTrackerBtn}
              </button>
            ) : (
              <button type="button" className="btn-main ready" disabled={trackerStatus === "saving"} onClick={handleAddToTracker}>
                <UiIcon name="briefcase" />
                {trackerStatus === "saving" ? applicationsCopy.formSaving : applicationsCopy.addToTrackerBtn}
              </button>
            )}
            {toStrengthen.length && hasOfferContext ? (
              <button type="button" className="btn-secondary" onClick={scrollToAts}>
                <UiIcon name="edit" /> {copy.matchOptimizeCta}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mr-stats">
          {coveragePct !== null ? (
            <div className="mr-stat mr-stat-coverage">
              <span className="mr-stat-label">{copy.matchCoverageLabel}</span>
              <strong>
                {matchedSkills.length}
                <small>/{offerSkills.length}</small>
              </strong>
              <div className="mr-bar" aria-hidden="true">
                <i style={{ width: `${coveragePct}%` }} />
              </div>
              <small>{copy.matchCoverageHint}</small>
            </div>
          ) : null}
          <div className="mr-stat-row">
            <div className="mr-stat mini ok">
              <strong>{strengths.length}</strong>
              <span>{copy.matchStrengthsCount}</span>
            </div>
            <div className="mr-stat mini warn">
              <strong>{toStrengthen.length}</strong>
              <span>{copy.matchToStrengthenCount}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mr-grid">
        <article className="card mr-card">
          <h3 className="mr-card-title ok">
            <span>
              <UiIcon name="thumbUp" />
            </span>
            {copy.matchStrengths}
          </h3>
          {strengths.length ? (
            <ul className="mr-strengths">
              {strengths.map((point, index) => (
                <li key={`${point}-${index}`}>
                  <UiIcon name="check" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{copy.matchNoStrengths}</p>
          )}
        </article>

        <article className="card mr-card">
          <h3 className="mr-card-title">
            <span>
              <UiIcon name="chart" />
            </span>
            {copy.matchSkillsTitle}
          </h3>
          {offerSkills.length ? (
            <div className="mr-skill-group">
              <span className="mr-skill-label ok">
                <i /> {copy.matchSkillsPresent} ({matchedSkills.length})
              </span>
              {matchedSkills.length ? (
                <div className="mr-chips">
                  {matchedSkills.map((skill) => (
                    <span key={skill} className="mr-chip ok">
                      <UiIcon name="check" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted mr-empty-line">{copy.matchSkillsNonePresent}</p>
              )}
            </div>
          ) : null}
          <div className="mr-skill-group">
            <span className="mr-skill-label warn">
              <i /> {copy.matchToStrengthen} ({toStrengthen.length})
            </span>
            {toStrengthen.length ? (
              <>
                <div className="mr-chips">
                  {toStrengthen.map((keyword) => (
                    <span key={keyword} className="mr-chip warn">
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="mr-skill-hint">
                  <UiIcon name="alert" />
                  {copy.matchToStrengthenHint}
                </p>
              </>
            ) : (
              <p className="muted mr-empty-line">{copy.matchNoMissingKeywords}</p>
            )}
          </div>
        </article>
      </div>

      {matchInsights.culturalFit ? (
        <article className="card mr-fit">
          <span className="mr-fit-icon">
            <UiIcon name="profile" />
          </span>
          <div>
            <h3>{copy.matchCulturalFit}</h3>
            <p>{matchInsights.culturalFit}</p>
          </div>
        </article>
      ) : null}

      {onGoToModule ? (
        <section className="mr-next no-print">
          <div className="mr-next-head">
            <h3>{copy.matchNextTitle}</h3>
            <p>{copy.matchNextText}</p>
          </div>
          <div className="mr-next-grid">
            {nextSteps.map((step) => (
              <button key={step.page} type="button" className={`mr-next-card tone-${step.tone}`} onClick={() => onGoToModule(step.page)}>
                <span className="mr-next-icon">
                  <UiIcon name={step.icon} />
                </span>
                <strong>{step.title}</strong>
                <small>{step.text}</small>
                <span className="mr-next-go">
                  {copy.matchNextGo} <UiIcon name="chevron" />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
        <AiDisclaimer language={language} />
      </article>

      <article className="card block ats-optimize-card no-print" ref={atsCardRef}>
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
            <AiDisclaimer language={language} />
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

function CvHistoryPage({ cvHistory, matchRuns = [], language, userId, onCvsChanged }) {
  const t = (fr, en) => (language === "en" ? en : fr);
  // Score affiché sur un CV : celui de la dernière analyse faite avec CE CV
  // (aucun score si le CV n'a jamais été analysé).
  const runsByCv = {};
  for (const run of matchRuns) {
    if (!run.cvId || typeof run.score !== "number") continue;
    (runsByCv[run.cvId] = runsByCv[run.cvId] || []).push(run);
  }
  const [expandedIds, setExpandedIds] = useState({});
  const [tab, setTab] = useState("history");
  const [trash, setTrash] = useState([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  async function loadTrash() {
    if (!userId) return;
    try {
      const data = await listTrashedCvs(userId);
      setTrash(data.items || []);
      if (data.retentionDays) setRetentionDays(data.retentionDays);
    } catch (_error) {
      setTrash([]);
    }
  }

  useEffect(() => {
    loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cvHistory.length]);

  useEffect(() => {
    setSelected(new Set());
  }, [tab]);

  const list = tab === "history" ? cvHistory : trash;
  const allSelected = list.length > 0 && list.every((cv) => selected.has(cv.id));

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(list.map((cv) => cv.id)));
  }

  function toggleExpanded(cvId) {
    setExpandedIds((prev) => ({ ...prev, [cvId]: !prev[cvId] }));
  }

  function toast(icon, title) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 3200,
      timerProgressBar: true,
      customClass: { popup: "career-toast", title: "career-toast-title" }
    });
  }

  const countLabel = (count) => (count > 1 ? t(`${count} CV`, `${count} CVs`) : t("1 CV", "1 CV"));

  async function runAction(ids, action) {
    if (!ids.length || busy) return;
    const confirmations = {
      trash: {
        icon: "warning",
        title: t(`Placer ${countLabel(ids.length)} dans la corbeille ?`, `Move ${countLabel(ids.length)} to the trash?`),
        text: t(
          `Vous pourrez ${ids.length > 1 ? "les" : "le"} restaurer pendant ${retentionDays} jours. Passé ce délai, la suppression est définitive.`,
          `You can restore ${ids.length > 1 ? "them" : "it"} for ${retentionDays} days. After that, deletion is permanent.`
        ),
        confirm: t("Mettre à la corbeille", "Move to trash")
      },
      purge: {
        icon: "error",
        title: t(`Supprimer définitivement ${countLabel(ids.length)} ?`, `Permanently delete ${countLabel(ids.length)}?`),
        text: t(
          "Cette action est irréversible. Les candidatures liées sont conservées, sans CV associé.",
          "This cannot be undone. Linked applications are kept, without an attached CV."
        ),
        confirm: t("Supprimer définitivement", "Delete permanently")
      }
    };
    const confirmation = confirmations[action];
    if (confirmation) {
      const result = await Swal.fire({
        icon: confirmation.icon,
        title: confirmation.title,
        text: confirmation.text,
        showCancelButton: true,
        confirmButtonText: confirmation.confirm,
        cancelButtonText: t("Annuler", "Cancel"),
        confirmButtonColor: action === "purge" ? "#a8071a" : "#b83309",
        reverseButtons: true,
        focusCancel: action === "purge"
      });
      if (!result.isConfirmed) return;
    }
    setBusy(true);
    try {
      if (action === "trash") {
        const result = await trashCvs(userId, ids);
        toast("success", t(`${countLabel(result.moved ?? ids.length)} placé(s) dans la corbeille.`, `${countLabel(result.moved ?? ids.length)} moved to trash.`));
      } else if (action === "restore") {
        const result = await restoreCvs(userId, ids);
        toast("success", t(`${countLabel(result.restored ?? ids.length)} restauré(s).`, `${countLabel(result.restored ?? ids.length)} restored.`));
      } else if (action === "purge") {
        const result = await purgeCvs(userId, { ids });
        toast("success", t(`${countLabel(result.deleted ?? ids.length)} supprimé(s) définitivement.`, `${countLabel(result.deleted ?? ids.length)} permanently deleted.`));
      }
      setSelected(new Set());
      await Promise.all([onCvsChanged?.(), loadTrash()]);
    } catch (error) {
      toast("error", getFriendlyErrorMessage(error, language));
    } finally {
      setBusy(false);
    }
  }

  async function emptyTrash() {
    if (!trash.length || busy) return;
    const result = await Swal.fire({
      icon: "error",
      title: t("Vider la corbeille ?", "Empty the trash?"),
      text: t(
        `${countLabel(trash.length)} ${trash.length > 1 ? "seront supprimés" : "sera supprimé"} définitivement. Cette action est irréversible.`,
        `${countLabel(trash.length)} will be permanently deleted. This cannot be undone.`
      ),
      showCancelButton: true,
      confirmButtonText: t("Vider la corbeille", "Empty trash"),
      cancelButtonText: t("Annuler", "Cancel"),
      confirmButtonColor: "#a8071a",
      reverseButtons: true,
      focusCancel: true
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      const response = await purgeCvs(userId, { all: true });
      toast("success", t(`Corbeille vidée (${countLabel(response.deleted ?? 0)}).`, `Trash emptied (${countLabel(response.deleted ?? 0)}).`));
      setSelected(new Set());
      await Promise.all([onCvsChanged?.(), loadTrash()]);
    } catch (error) {
      toast("error", getFriendlyErrorMessage(error, language));
    } finally {
      setBusy(false);
    }
  }

  function daysLeft(purgeAt) {
    return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  if (!cvHistory.length && !trash.length) {
    return (
      <section className="history-empty">
        <div className="history-empty-icon">
          <UiIcon name="history" />
        </div>
        <h2>{t("Aucun CV importé pour le moment", "No CV imported yet")}</h2>
        <p>
          {t(
            "Votre historique apparaîtra ici à chaque fois que vous importerez et optimiserez un CV.",
            "Your history will appear here each time you import and optimize a CV."
          )}
        </p>
      </section>
    );
  }

  const selectedIds = [...selected].filter((id) => list.some((cv) => cv.id === id));

  return (
    <section className="cv-history-page">
      <ModuleHero
        eyebrow={t("Vos CV", "Your CVs")}
        title={t("Historique CV", "CV history")}
        subtitle={t(
          "Tous vos CV importés, avec leurs données extraites et le score de leur dernière analyse.",
          "All your imported CVs, with their extracted data and the score of their latest analysis."
        )}
        art={<HistoryHeroArt />}
        chips={[
          { icon: "file", label: cvHistory.length > 1 ? t(`${cvHistory.length} CV importés`, `${cvHistory.length} CVs imported`) : t(`${cvHistory.length} CV importé`, `${cvHistory.length} CV imported`) },
          cvHistory[0]?.createdAt ? { icon: "history", label: t(`Dernier import : ${formatDateTime(cvHistory[0].createdAt, language)}`, `Last import: ${formatDateTime(cvHistory[0].createdAt, language)}`) } : null,
          { icon: "trash", label: t(`${trash.length} dans la corbeille`, `${trash.length} in the trash`) }
        ]}
      />

      <div className="history-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "is-active" : ""} onClick={() => setTab("history")}>
          <UiIcon name="history" />
          {t("Historique", "History")}
          <span>{cvHistory.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "trash"} className={tab === "trash" ? "is-active" : ""} onClick={() => setTab("trash")}>
          <UiIcon name="trash" />
          {t("Corbeille", "Trash")}
          <span>{trash.length}</span>
        </button>
      </div>

      {list.length ? (
        <div className="history-toolbar">
          <label className="history-check">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={busy} />
            <span>{selectedIds.length ? t(`${selectedIds.length} sélectionné(s)`, `${selectedIds.length} selected`) : t("Tout sélectionner", "Select all")}</span>
          </label>
          <div className="history-toolbar-actions">
            {tab === "history" ? (
              <button type="button" className="history-action danger" disabled={!selectedIds.length || busy} onClick={() => runAction(selectedIds, "trash")}>
                <UiIcon name="trash" />
                {t("Mettre à la corbeille", "Move to trash")}
              </button>
            ) : (
              <>
                <button type="button" className="history-action" disabled={!selectedIds.length || busy} onClick={() => runAction(selectedIds, "restore")}>
                  <UiIcon name="history" />
                  {t("Restaurer", "Restore")}
                </button>
                <button type="button" className="history-action danger" disabled={!selectedIds.length || busy} onClick={() => runAction(selectedIds, "purge")}>
                  <UiIcon name="trash" />
                  {t("Supprimer définitivement", "Delete permanently")}
                </button>
                <button type="button" className="history-action danger-solid" disabled={busy} onClick={emptyTrash}>
                  {t("Vider la corbeille", "Empty trash")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "trash" && trash.length ? (
        <p className="history-trash-note">
          <UiIcon name="alert" />
          {t(
            `Les CV restent ${retentionDays} jours dans la corbeille, puis sont supprimés définitivement. Ils ne comptent plus dans vos statistiques.`,
            `CVs stay in the trash for ${retentionDays} days, then are permanently deleted. They no longer count in your statistics.`
          )}
        </p>
      ) : null}

      {!list.length ? (
        <div className="history-tab-empty">
          <UiIcon name={tab === "trash" ? "trash" : "history"} />
          <strong>{tab === "trash" ? t("La corbeille est vide", "The trash is empty") : t("Aucun CV dans l'historique", "No CV in your history")}</strong>
          <span>
            {tab === "trash"
              ? t("Les CV supprimés apparaîtront ici avant leur suppression définitive.", "Deleted CVs will appear here before permanent deletion.")
              : t("Vos CV supprimés sont dans la corbeille : vous pouvez les restaurer.", "Your deleted CVs are in the trash: you can restore them.")}
          </span>
        </div>
      ) : null}

      <div className="history-list">
        {list.map((cv) => {
          const skills = cv.parsed?.skills || [];
          const cvRuns = runsByCv[cv.id] || [];
          const score = tab === "history" && cvRuns.length ? cvRuns[0].score : null;
          const scoreTier = score === null ? null : score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 50 ? "average" : "weak";
          const isExpanded = Boolean(expandedIds[cv.id]);
          const collapsedCount = 10;
          const visibleSkills = isExpanded ? skills : skills.slice(0, collapsedCount);
          const hiddenCount = skills.length - visibleSkills.length;
          const isSelected = selected.has(cv.id);
          const remaining = cv.purgeAt ? daysLeft(cv.purgeAt) : null;

          return (
            <article className={`history-card ${isSelected ? "is-selected" : ""} ${tab === "trash" ? "is-trashed" : ""}`} key={cv.id}>
              <div className="history-card-top">
                <div className="history-card-main">
                  <input
                    type="checkbox"
                    className="history-card-check"
                    checked={isSelected}
                    onChange={() => toggleSelected(cv.id)}
                    disabled={busy}
                    aria-label={t(`Sélectionner ${cv.fileName}`, `Select ${cv.fileName}`)}
                  />
                  <span className="history-card-icon">
                    <UiIcon name={tab === "trash" ? "trash" : "history"} />
                  </span>
                  <div>
                    <h3>{cv.fileName}</h3>
                    {tab === "trash" ? (
                      <p>
                        {t("Supprimé le", "Deleted on")} {formatDateTime(cv.deletedAt, language)} ·{" "}
                        <span className={remaining <= 3 ? "history-purge-soon" : ""}>
                          {remaining === 0
                            ? t("suppression définitive imminente", "permanent deletion imminent")
                            : t(`supprimé définitivement dans ${remaining} jour${remaining > 1 ? "s" : ""}`, `permanently deleted in ${remaining} day${remaining > 1 ? "s" : ""}`)}
                        </span>
                      </p>
                    ) : (
                      <p>{formatDateTime(cv.createdAt, language)}</p>
                    )}
                  </div>
                </div>
                <div className="history-card-side">
                  {score !== null ? (
                    <div className={`history-card-score tier-${scoreTier}`}>
                      <strong>{score}</strong>
                      <span>/100</span>
                    </div>
                  ) : null}
                  {tab === "history" ? (
                    <button type="button" className="history-card-action" title={t("Mettre à la corbeille", "Move to trash")} onClick={() => runAction([cv.id], "trash")} disabled={busy}>
                      <UiIcon name="trash" />
                    </button>
                  ) : (
                    <>
                      <button type="button" className="history-action" onClick={() => runAction([cv.id], "restore")} disabled={busy}>
                        <UiIcon name="history" />
                        {t("Restaurer", "Restore")}
                      </button>
                      <button type="button" className="history-card-action" title={t("Supprimer définitivement", "Delete permanently")} onClick={() => runAction([cv.id], "purge")} disabled={busy}>
                        <UiIcon name="trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="history-card-stats">
                <span className="history-card-stat">
                  <UiIcon name="chart" />
                  {skills.length} {t("compétences détectées", "skills detected")}
                </span>
              </div>

              <div className="job-chip-row history-skill-row">
                {visibleSkills.map((skill) => (
                  <span key={`${cv.id}-${skill}`}>{skill}</span>
                ))}
                {!skills.length ? <span>{t("Aucune compétence détectée", "No skill detected")}</span> : null}
              </div>
              {skills.length > collapsedCount ? (
                <button type="button" className="history-skill-toggle" onClick={() => toggleExpanded(cv.id)}>
                  {isExpanded ? t("Voir moins", "Show less") : t(`Voir tout (+${hiddenCount})`, `Show all (+${hiddenCount})`)}
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
