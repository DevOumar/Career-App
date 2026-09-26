import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { UiIcon } from "../../components/UiIcon.jsx";
import {
  CODING_LANGUAGES,
  CODING_LEVELS,
  CODING_TOPICS,
  CODING_COPY
} from "./codingCopy.js";
import {
  generateCodingChallenge,
  reviewCodingSolution,
  listCodingSessions,
  saveCodingSession,
  deleteCodingSession
} from "../../lib/inMemoryDb.js";
import "./coding.css";
import { AiDisclaimer } from "../../components/AiDisclaimer.jsx";

export function CodingPage({ language = "fr", user }) {
  const copy = CODING_COPY[language] || CODING_COPY.fr;

  // Configuration de l'exercice
  const [selectedLang, setSelectedLang] = useState("python");
  const [customLang, setCustomLang] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [topic, setTopic] = useState("algorithms");
  const [customTopic, setCustomTopic] = useState("");

  // Défi & Code
  const [challenge, setChallenge] = useState(null);
  const [userCode, setUserCode] = useState("");
  const [revealedHintsCount, setRevealedHintsCount] = useState(0);

  // Onglets & Affichage
  const [activeLeftTab, setActiveLeftTab] = useState("problem");
  const [activeRightTab, setActiveRightTab] = useState("editor");

  // États de chargement
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Revue & Résultat
  const [evaluation, setEvaluation] = useState(null);

  // Historique & Tiroir
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);

  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const reviewRef = useRef(null);

  // Langage effectif
  const effectiveLanguage =
    selectedLang === "custom" && customLang.trim()
      ? customLang.trim()
      : CODING_LANGUAGES.find((l) => l.id === selectedLang)?.name || "Python";

  const isHtml = effectiveLanguage.toLowerCase().includes("html");

  // Charger automatiquement un premier défi au montage
  useEffect(() => {
    handleGenerate();
  }, []);

  // Charger l'historique de l'utilisateur quand il ouvre le tiroir
  useEffect(() => {
    if (historyOpen && user?.id) {
      loadHistory();
    }
  }, [historyOpen, user?.id]);

  async function loadHistory() {
    if (!user?.id) return;
    try {
      const items = await listCodingSessions(user.id);
      setHistoryItems(items);
    } catch (err) {
      console.warn("Erreur chargement historique coding:", err.message);
    }
  }

  // Générer un défi technique
  async function handleGenerate() {
    setIsGenerating(true);
    setEvaluation(null);
    setRevealedHintsCount(0);
    setActiveLeftTab("problem");
    setActiveRightTab("editor");

    try {
      const res = await generateCodingChallenge({
        userId: user?.id,
        language: effectiveLanguage,
        level,
        topic,
        customTopic
      });
      if (res) {
        setChallenge(res);
        setUserCode(res.starterCode || "");
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: language === "en" ? "Generation Error" : "Erreur de génération",
        text: err.message || (language === "en" ? "Failed to generate challenge." : "Impossible de générer le défi technique.")
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // Évaluer la solution
  async function handleEvaluate() {
    if (!userCode.trim()) {
      Swal.fire({
        icon: "warning",
        title: language === "en" ? "Empty Code" : "Code vide",
        text: language === "en" ? "Please write some code before requesting a review." : "Veuillez écrire du code avant de lancer l'évaluation."
      });
      return;
    }

    setIsEvaluating(true);
    try {
      const res = await reviewCodingSolution({
        userId: user?.id,
        language: effectiveLanguage,
        challenge,
        code: userCode
      });

      if (res) {
        setEvaluation(res);
        // Défilement doux vers la carte d'évaluation
        setTimeout(() => {
          reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: language === "en" ? "Review Error" : "Erreur d'évaluation",
        text: err.message || (language === "en" ? "Failed to review code." : "Impossible d'évaluer le code.")
      });
    } finally {
      setIsEvaluating(false);
    }
  }

  // Sauvegarder la session d'entraînement
  async function handleSaveSession() {
    if (!user?.id) {
      Swal.fire({
        icon: "info",
        title: language === "en" ? "Account Required" : "Compte requis",
        text: language === "en" ? "Sign in to save your training history." : "Connectez-vous pour enregistrer votre historique d'exercices."
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveCodingSession({
        userId: user.id,
        session: {
          title: challenge?.title || "Défi technique",
          language: effectiveLanguage,
          level,
          topic,
          code: userCode,
          challenge,
          evaluation
        }
      });
      Swal.fire({
        icon: "success",
        title: copy.sessionSaved,
        timer: 1800,
        showConfirmButton: false
      });
      loadHistory();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: language === "en" ? "Save Error" : "Erreur de sauvegarde",
        text: err.message
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Supprimer une session de l'historique
  async function handleDeleteHistoryItem(sessionId) {
    if (!user?.id) return;
    try {
      await deleteCodingSession({ userId: user.id, sessionId });
      setHistoryItems((prev) => prev.filter((item) => item.id !== sessionId));
    } catch (err) {
      Swal.fire({ icon: "error", text: err.message });
    }
  }

  // Recharger une session de l'historique
  function handleRestoreSession(item) {
    if (item.challenge) setChallenge(item.challenge);
    if (item.code) setUserCode(item.code);
    if (item.evaluation) setEvaluation(item.evaluation);
    if (item.language) setSelectedLang(item.language.toLowerCase());
    setHistoryOpen(false);
  }

  // Gestion de la touche TAB dans l'éditeur (insertion de 2 espaces sans perte de focus)
  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      setUserCode(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  }

  // Synchronisation du scroll entre le gutter des numéros de ligne et la textarea
  function handleScroll(e) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  }

  // Calcul du nombre de lignes
  const lineCount = Math.max(1, (userCode || "").split("\n").length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Copier le code dans le presse-papiers
  function handleCopyCode(text, type = "code") {
    navigator.clipboard.writeText(text);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedSolution(true);
      setTimeout(() => setCopiedSolution(false), 2000);
    }
  }

  return (
    <div className="coding-page">
      {/* 1. Header / Hero */}
      <div className="coding-hero">
        <div className="coding-hero-top">
          <span className="coding-hero-badge">
            <UiIcon name="code" />
            {copy.heroBadge}
          </span>
          <button
            type="button"
            className="coding-history-toggle-btn"
            onClick={() => setHistoryOpen(true)}
          >
            <UiIcon name="history" />
            {copy.historyOpenBtn}
          </button>
        </div>
        <h1>{copy.heroTitle}</h1>
        <p>{copy.heroSubtitle}</p>
      </div>

      {/* 2. Configuration & Paramètres */}
      <div className="coding-config-card">
        <h2 className="coding-config-title">
          <UiIcon name="settings" />
          {copy.configSectionTitle}
        </h2>

        {/* Sélection du Langage */}
        <div className="coding-config-group">
          <label className="coding-config-label">{copy.languageLabel}</label>
          <div className="coding-languages-grid">
            {CODING_LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                className={`coding-lang-chip ${selectedLang === lang.id ? "active" : ""}`}
                onClick={() => setSelectedLang(lang.id)}
              >
                <span className="coding-lang-icon">{lang.icon}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>

          {selectedLang === "custom" ? (
            <input
              type="text"
              className="coding-custom-lang-input"
              placeholder={copy.customLanguagePlaceholder}
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
            />
          ) : null}
        </div>

        {/* Sélection du Niveau */}
        <div className="coding-config-group">
          <label className="coding-config-label">{copy.levelLabel}</label>
          <div className="coding-levels-grid">
            {CODING_LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                className={`coding-level-card ${level === lvl.id ? "active" : ""}`}
                onClick={() => setLevel(lvl.id)}
              >
                <span className="coding-level-name">
                  {lvl.label[language] || lvl.label.fr}
                </span>
                <span className="coding-level-tag">
                  {lvl.tag[language] || lvl.tag.fr}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sélection de la Thématique */}
        <div className="coding-config-group">
          <label className="coding-config-label">{copy.topicLabel}</label>
          <div className="coding-topics-grid">
            {CODING_TOPICS.map((top) => (
              <button
                key={top.id}
                type="button"
                className={`coding-topic-pill ${topic === top.id ? "active" : ""}`}
                onClick={() => setTopic(top.id)}
              >
                <span>{top.icon}</span>
                <span>{top.label[language] || top.label.fr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Consigne libre spécifique */}
        <div className="coding-config-group">
          <label className="coding-config-label">{copy.customTopicLabel}</label>
          <input
            type="text"
            className="coding-custom-lang-input"
            placeholder={copy.customTopicPlaceholder}
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
          />
        </div>

        {/* Bouton Générer */}
        <div className="coding-generate-actions">
          <button
            type="button"
            className="btn-coding-generate"
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? <span className="btn-spinner" /> : <UiIcon name="code" />}
            {isGenerating ? copy.generatingBtn : copy.generateBtn}
          </button>
        </div>
      </div>

      {/* 3. Split Workspace (Énoncé & Éditeur) */}
      <div className="coding-workspace">
        {/* Volet Gauche : Énoncé, Exemples, Indices */}
        <div className="coding-panel-left">
          <div className="coding-panel-nav">
            <button
              type="button"
              className={`coding-panel-tab ${activeLeftTab === "problem" ? "active" : ""}`}
              onClick={() => setActiveLeftTab("problem")}
            >
              <UiIcon name="file" />
              {copy.problemTab}
            </button>
            <button
              type="button"
              className={`coding-panel-tab ${activeLeftTab === "examples" ? "active" : ""}`}
              onClick={() => setActiveLeftTab("examples")}
            >
              <UiIcon name="check" />
              {copy.examplesTab}
            </button>
            <button
              type="button"
              className={`coding-panel-tab ${activeLeftTab === "hints" ? "active" : ""}`}
              onClick={() => setActiveLeftTab("hints")}
            >
              <UiIcon name="thumbUp" />
              {copy.hintsTab}{" "}
              {challenge?.hints?.length ? `(${revealedHintsCount}/${challenge.hints.length})` : ""}
            </button>
          </div>

          <div className="coding-panel-content">
            {challenge ? (
              <>
                <div className="coding-challenge-header">
                  <div className="coding-challenge-badges">
                    <span className="badge-tag lang">{effectiveLanguage}</span>
                    <span className={`badge-tag level-${level}`}>{level.toUpperCase()}</span>
                  </div>
                  <h3 className="coding-challenge-title">{challenge.title}</h3>
                </div>

                {/* Onglet 1: Énoncé */}
                {activeLeftTab === "problem" && (
                  <div className="coding-challenge-desc">{challenge.description}</div>
                )}

                {/* Onglet 2: Exemples */}
                {activeLeftTab === "examples" && (
                  <div className="coding-hints-container">
                    {(challenge.examples || []).map((ex, idx) => (
                      <div key={idx} className="coding-example-card">
                        <span className="coding-example-title">Exemple {idx + 1}</span>
                        {ex.input && (
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Entrée :</span>
                            <div className="coding-io-box">{ex.input}</div>
                          </div>
                        )}
                        {ex.output && (
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Sortie attendue :</span>
                            <div className="coding-io-box">{ex.output}</div>
                          </div>
                        )}
                        {ex.explanation && (
                          <div className="coding-example-expl">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Onglet 3: Indices progressifs */}
                {activeLeftTab === "hints" && (
                  <div className="coding-hints-container">
                    {revealedHintsCount === 0 && (
                      <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>
                        {copy.hintsEmpty}
                      </p>
                    )}

                    {(challenge.hints || []).slice(0, revealedHintsCount).map((hint, idx) => (
                      <div key={idx} className="coding-hint-item">
                        <span className="coding-hint-label">
                          <UiIcon name="thumbUp" /> Indice {idx + 1}
                        </span>
                        <span className="coding-hint-text">{hint}</span>
                      </div>
                    ))}

                    {challenge.hints && revealedHintsCount < challenge.hints.length ? (
                      <button
                        type="button"
                        className="btn-editor-action"
                        style={{ alignSelf: "flex-start", marginTop: "8px", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)" }}
                        onClick={() => setRevealedHintsCount((c) => c + 1)}
                      >
                        <UiIcon name="plus" /> {copy.showHintBtn}
                      </button>
                    ) : challenge?.hints?.length > 0 ? (
                      <small style={{ color: "var(--muted)", fontWeight: 600 }}>{copy.allHintsRevealed}</small>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <span className="btn-spinner" />
              </div>
            )}
          </div>
        </div>

        {/* Volet Droit : Éditeur de Code */}
        <div className="coding-panel-right">
          <div className="coding-editor-toolbar">
            <div className="coding-editor-lang-indicator">
              <span>{effectiveLanguage}</span>
              {isHtml ? (
                <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
                  <button
                    type="button"
                    className={`btn-editor-action ${activeRightTab === "editor" ? "active" : ""}`}
                    onClick={() => setActiveRightTab("editor")}
                  >
                    Code
                  </button>
                  <button
                    type="button"
                    className={`btn-editor-action ${activeRightTab === "preview" ? "active" : ""}`}
                    onClick={() => setActiveRightTab("preview")}
                  >
                    {copy.htmlPreviewTab}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="coding-editor-actions">
              <button
                type="button"
                className="btn-editor-action"
                title={copy.copyCodeBtn}
                onClick={() => handleCopyCode(userCode, "code")}
              >
                <UiIcon name={copiedCode ? "check" : "docClassic"} />
                {copiedCode ? copy.codeCopied : copy.copyCodeBtn}
              </button>
              <button
                type="button"
                className="btn-editor-action"
                title={copy.resetCodeBtn}
                onClick={() => setUserCode(challenge?.starterCode || "")}
              >
                <UiIcon name="history" />
                {copy.resetCodeBtn}
              </button>
            </div>
          </div>

          {/* Corps de l'éditeur ou Preview HTML */}
          {activeRightTab === "preview" && isHtml ? (
            <div className="coding-html-preview">
              <iframe
                title="HTML Preview"
                srcDoc={userCode}
                className="coding-html-iframe"
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div className="coding-editor-body">
              <div ref={gutterRef} className="coding-editor-gutters">
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="coding-editor-textarea"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          )}

          {/* Barre d'action inférieure de l'éditeur */}
          <div className="coding-editor-footer">
            <button
              type="button"
              className="btn-coding-evaluate"
              disabled={isEvaluating}
              onClick={handleEvaluate}
            >
              {isEvaluating ? <span className="btn-spinner" /> : <UiIcon name="check" />}
              {isEvaluating ? copy.evaluatingBtn : copy.evaluateBtn}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Résultats & Revue de Code par l'IA */}
      {evaluation && (
        <div ref={reviewRef} className="coding-review-card">
          <div className="coding-review-hero">
            <div className="coding-score-block">
              <div
                className={`coding-score-circle ${
                  evaluation.score >= 80
                    ? "score-high"
                    : evaluation.score >= 50
                    ? "score-medium"
                    : "score-low"
                }`}
              >
                <span className="coding-score-number">{evaluation.score}</span>
                <span className="coding-score-percent">/ 100</span>
              </div>
              <div className="coding-verdict-details">
                <span className="coding-verdict-title">{copy.evaluationTitle}</span>
                <span className={`coding-verdict-badge ${evaluation.verdict}`}>
                  {copy.verdicts[evaluation.verdict] || evaluation.verdict}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-main"
              disabled={isSaving}
              onClick={handleSaveSession}
            >
              {isSaving ? <span className="btn-spinner" /> : <UiIcon name="plus" />}
              {copy.saveSessionBtn}
            </button>
          </div>

          <div className="coding-review-grid">
            {/* Exactitude & Cas limites */}
            {evaluation.correctness ? (
            <div className="coding-review-item">
              <div className="coding-review-item-header">
                <UiIcon name="check" />
                {copy.correctnessTitle}
              </div>
              <div style={{ fontSize: "0.92rem", lineHeight: 1.55, color: "var(--text)" }}>
                {evaluation.correctness}
              </div>
            </div>
            ) : null}

            {/* Complexité Algorithmique (uniquement si l'IA l'a évaluée) */}
            {evaluation.timeComplexity || evaluation.spaceComplexity ? (
            <div className="coding-review-item">
              <div className="coding-review-item-header">
                <UiIcon name="chart" />
                {copy.complexityTitle}
              </div>
              <div className="coding-complexity-tags">
                {evaluation.timeComplexity ? (
                  <div className="complexity-pill">
                    <span>⏱️ {copy.timeComplexity} :</span>
                    <strong>{evaluation.timeComplexity}</strong>
                  </div>
                ) : null}
                {evaluation.spaceComplexity ? (
                  <div className="complexity-pill">
                    <span>💾 {copy.spaceComplexity} :</span>
                    <strong>{evaluation.spaceComplexity}</strong>
                  </div>
                ) : null}
              </div>
            </div>
            ) : null}

            {/* Qualité & Bonnes Pratiques */}
            {evaluation.quality ? (
            <div className="coding-review-item">
              <div className="coding-review-item-header">
                <UiIcon name="thumbUp" />
                {copy.qualityTitle}
              </div>
              <div style={{ fontSize: "0.92rem", lineHeight: 1.55, color: "var(--text)" }}>
                {evaluation.quality}
              </div>
            </div>
            ) : null}

            {/* Bugs & Points d'attention */}
            {evaluation.bugs && evaluation.bugs.length > 0 ? (
              <div className="coding-review-item" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <div className="coding-review-item-header" style={{ color: "#991b1b" }}>
                  <UiIcon name="alert" />
                  {copy.bugsTitle}
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.9rem", color: "#7f1d1d" }}>
                  {evaluation.bugs.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Explication & Pédagogie */}
          {evaluation.explanation && (
            <div className="coding-review-item">
              <div className="coding-review-item-header">
                <UiIcon name="chat" />
                {copy.explanationTitle}
              </div>
              <div style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {evaluation.explanation}
              </div>
            </div>
          )}

          {/* Solution Optimale de Référence */}
          {evaluation.suggestedSolution && (
            <div className="coding-solution-box">
              <div className="coding-solution-header">
                <span>{copy.solutionTitle}</span>
                <button
                  type="button"
                  className="btn-editor-action"
                  onClick={() => handleCopyCode(evaluation.suggestedSolution, "solution")}
                >
                  <UiIcon name={copiedSolution ? "check" : "docClassic"} />
                  {copiedSolution ? copy.codeCopied : copy.copyCodeBtn}
                </button>
              </div>
              <pre className="coding-solution-pre">{evaluation.suggestedSolution}</pre>
            </div>
          )}
          <AiDisclaimer
            language={language}
            text={
              language === "en"
                ? "AI-generated review: the score and feedback are indicative. Always test your code yourself."
                : "Correction générée par l'IA : la note et les retours sont indicatifs. Testez toujours votre code vous-même."
            }
          />
        </div>
      )}

      {/* 5. Tiroir de l'historique d'entraînement */}
      {historyOpen && (
        <div className="modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div
            className="coding-history-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="coding-history-header">
              <h3>{copy.historyTitle}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setHistoryOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="coding-history-list">
              {historyItems.length === 0 ? (
                <p className="muted" style={{ textAlign: "center", marginTop: "40px" }}>
                  {copy.historyEmpty}
                </p>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="coding-history-card">
                    <div className="coding-history-top">
                      <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>
                        {item.title}
                      </strong>
                      {item.evaluation?.score !== undefined ? (
                        <span
                          className={`coding-history-score ${
                            item.evaluation.score >= 80
                              ? "score-high"
                              : item.evaluation.score >= 50
                              ? "score-medium"
                              : "score-low"
                          }`}
                          style={{ color: "#fff" }}
                        >
                          {item.evaluation.score}%
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: "6px", fontSize: "0.8rem", color: "var(--muted)" }}>
                      <span>{item.language}</span>
                      <span>•</span>
                      <span>{item.level}</span>
                    </div>

                    <div className="coding-history-actions">
                      <button
                        type="button"
                        className="btn-editor-action"
                        style={{ background: "var(--bg-accent)", color: "var(--text)", border: "1px solid var(--line)" }}
                        onClick={() => handleRestoreSession(item)}
                      >
                        {copy.loadHistoryBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-editor-action"
                        style={{ background: "transparent", color: "#ef4444", border: "1px solid transparent" }}
                        onClick={() => handleDeleteHistoryItem(item.id)}
                      >
                        {copy.deleteHistoryBtn}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

