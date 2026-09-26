import React from "react";
import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { UiIcon } from "../../components/UiIcon.jsx";
import { getFriendlyErrorMessage } from "../../lib/errors.js";
import { generateSkillsTest, gradeSkillsTest, listSkillsTests, deleteSkillsTest } from "../../lib/inMemoryDb.js";
import { SKILLS_TEST_COPY } from "./skillsTestCopy.js";

function scoreClass(score, maxScore) {
  if (score >= maxScore) return "skills-test-score-good";
  if (score >= maxScore / 2) return "skills-test-score-mid";
  return "skills-test-score-bad";
}

function SkillsTestPage({ language, userId, candidate, offer, tokensBalance, onGoToTarifs, onConsumeToken }) {
  const copy = SKILLS_TEST_COPY[language] || SKILLS_TEST_COPY.fr;
  // "start" -> "in-progress" -> "result", jamais de retour arriere hors
  // "Refaire un test" qui repart explicitement de "start".
  const [stage, setStage] = useState("start");
  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [finalScore, setFinalScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState("");
  const [tests, setTests] = useState([]);

  const hasContext = Boolean(candidate && offer && (offer.title || offer.skills?.length));
  const hasUnlimitedTokens = tokensBalance >= 999;
  const outOfTokens = !hasUnlimitedTokens && tokensBalance <= 0;

  useEffect(() => {
    let cancelled = false;
    if (!userId) return undefined;
    listSkillsTests(userId)
      .then((items) => {
        if (!cancelled) setTests(items || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleGenerate() {
    if (!hasContext || isGenerating) return;
    if (outOfTokens) {
      onGoToTarifs();
      return;
    }
    setError("");
    setIsGenerating(true);
    try {
      const result = await generateSkillsTest({ userId, offer, language });
      setTestId(result.id);
      setQuestions(result.questions);
      setCurrentQuestionIndex(0);
      setAnswers({});
      // Un seul jeton pour tout le cycle (génération + notation) : consommé
      // ici, jamais lors de handleFinish.
      await onConsumeToken();
      setStage("in-progress");
      // /generate a déjà persisté le test côté serveur (statut "pending") :
      // on recharge la liste plutôt que de deviner le titre côté client.
      listSkillsTests(userId)
        .then((items) => setTests(items || []))
        .catch(() => {});
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsGenerating(false);
    }
  }

  function setAnswerForCurrentQuestion(value) {
    const question = questions[currentQuestionIndex];
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function currentAnswerIsGiven() {
    const question = questions[currentQuestionIndex];
    if (!question) return false;
    const value = answers[question.id];
    if (question.type === "qcm") return Number.isInteger(value);
    return typeof value === "string" && value.trim().length > 0;
  }

  function handleNextQuestion() {
    if (!currentAnswerIsGiven()) return;
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }

  async function handleFinish() {
    if (!currentAnswerIsGiven() || isGrading) return;
    setError("");
    setIsGrading(true);
    try {
      const result = await gradeSkillsTest({ userId, id: testId, answers });
      setResults(result.results);
      setFinalScore(result.finalScore);
      setStage("result");
      // idem : /grade a mis à jour le statut ("graded") et la note côté
      // serveur, on recharge la liste pour refléter le badge à jour.
      listSkillsTests(userId)
        .then((items) => setTests(items || []))
        .catch(() => {});
    } catch (err) {
      setError(getFriendlyErrorMessage(err, language));
    } finally {
      setIsGrading(false);
    }
  }

  function handleRetake() {
    setStage("start");
    setTestId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResults([]);
    setFinalScore(0);
    setError("");
  }

  async function handleDeleteTest(event, test) {
    event.stopPropagation();
    if (!userId) return;
    const result = await Swal.fire({
      icon: "warning",
      title: copy.deleteConfirm,
      text: test.title || copy.untitled,
      showCancelButton: true,
      confirmButtonText: copy.deleteTest,
      cancelButtonText: copy.cancel,
      confirmButtonColor: "#f5222d"
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSkillsTest({ userId, testId: test.id });
      setTests((prev) => prev.filter((item) => item.id !== test.id));
    } catch (_err) {
      // Non bloquant.
    }
  }

  if (!hasContext) {
    return (
      <section className="module-locked">
        <div className="module-locked-copy">
          <h2>{copy.title}</h2>
          <p>{copy.empty}</p>
        </div>
      </section>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progressPercent = questions.length ? Math.round(((currentQuestionIndex + (stage === "result" ? 1 : 0)) / questions.length) * 100) : 0;

  const historySidebar = (
    <aside className="negotiation-history">
      <button type="button" className="negotiation-new-btn" onClick={handleRetake}>
        <UiIcon name="plus" /> {copy.newTest}
      </button>
      <span className="negotiation-history-label">{copy.history}</span>
      {tests.length ? (
        <ul className="negotiation-history-list">
          {tests.map((test) => (
            <li key={test.id} className="negotiation-history-item">
              <span className="negotiation-history-main">
                <span className="negotiation-history-title">{test.title || copy.untitled}</span>
                <span className="negotiation-history-badges">
                  <span className="history-badge">
                    {test.status === "graded" ? `${test.finalScore}/100` : copy.statusPending}
                  </span>
                </span>
              </span>
              <button
                type="button"
                className="negotiation-history-delete"
                onClick={(event) => handleDeleteTest(event, test)}
                aria-label={copy.deleteTest}
              >
                <UiIcon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="negotiation-history-empty">{copy.noHistory}</p>
      )}
    </aside>
  );

  return (
    <div className="negotiation-layout skills-test-layout">
      {historySidebar}
      <section className="skills-test-page">
      <header className="module-header feature-page-header">
        <span className="feature-page-header-icon">
          <UiIcon name="check" />
        </span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      {error ? <p className="field-error">{error}</p> : null}

      {stage === "start" ? (
        <div className="skills-test-start">
          <p className="skills-test-start-description">{copy.startDescription}</p>
          {outOfTokens ? (
            <p className="field-hint">
              {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
            </p>
          ) : null}
          <button type="button" className="btn-main ready" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <span className="btn-spinner" /> {copy.generating}
              </>
            ) : hasUnlimitedTokens ? (
              copy.generateUnlimited
            ) : (
              copy.generate
            )}
          </button>
        </div>
      ) : null}

      {stage === "in-progress" && currentQuestion ? (
        <div className="skills-test-progress-card">
          <div className="skills-test-progress-header">
            <span>{copy.questionProgress.replace("{current}", currentQuestionIndex + 1).replace("{total}", questions.length)}</span>
            <div className="skills-test-progress-bar">
              <div className="skills-test-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <p className="skills-test-question-type">{currentQuestion.type === "qcm" ? copy.qcmType : copy.openType}</p>
          <p className="skills-test-question-statement">{currentQuestion["énoncé"]}</p>

          {currentQuestion.type === "qcm" ? (
            <div className="skills-test-options">
              {currentQuestion.choix.map((choice, index) => (
                <button
                  key={index}
                  type="button"
                  className={`skills-test-option ${answers[currentQuestion.id] === index ? "active" : ""}`}
                  onClick={() => setAnswerForCurrentQuestion(index)}
                >
                  <span className="skills-test-option-bullet" aria-hidden="true" />
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="skills-test-open-answer"
              value={answers[currentQuestion.id] || ""}
              placeholder={copy.openAnswerPlaceholder}
              onChange={(event) => setAnswerForCurrentQuestion(event.target.value)}
            />
          )}

          {isLastQuestion ? (
            <button type="button" className="btn-main ready" onClick={handleFinish} disabled={!currentAnswerIsGiven() || isGrading}>
              {isGrading ? (
                <>
                  <span className="btn-spinner" /> {copy.grading}
                </>
              ) : (
                copy.finishAndGrade
              )}
            </button>
          ) : (
            <button type="button" className="btn-main ready" onClick={handleNextQuestion} disabled={!currentAnswerIsGiven()}>
              {copy.nextQuestion}
            </button>
          )}
        </div>
      ) : null}

      {stage === "result" ? (
        <div className="skills-test-result">
          <h3>{copy.resultTitle}</h3>
          <div className="skills-test-result-score">
            <span className="skills-test-result-score-value">{finalScore}</span>
            <span className="skills-test-result-score-max">/100</span>
          </div>

          <h4>{copy.resultDetailTitle}</h4>
          <ul className="skills-test-result-list">
            {results.map((result) => {
              const question = questions.find((item) => item.id === result.id);
              return (
                <li key={result.id} className={`skills-test-result-item ${scoreClass(result.score, result.maxScore)}`}>
                  <div className="skills-test-result-item-header">
                    <span className="skills-test-result-item-type">{result.type === "qcm" ? copy.qcmType : copy.openType}</span>
                    <span className="skills-test-result-item-score">
                      {result.score}/{result.maxScore}
                    </span>
                  </div>
                  {question ? <p className="skills-test-result-item-statement">{question["énoncé"]}</p> : null}
                  {result.feedback ? (
                    <p className="skills-test-result-item-feedback">{result.feedback}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <button type="button" className="btn-main ready" onClick={handleRetake} disabled={outOfTokens}>
            {hasUnlimitedTokens ? copy.retakeTestUnlimited : copy.retakeTest}
          </button>
          {outOfTokens ? (
            <p className="field-hint">
              {copy.noTokens} <button type="button" className="link-button" onClick={onGoToTarifs}>{copy.noTokensCta}</button>
            </p>
          ) : null}
        </div>
      ) : null}
      </section>
    </div>
  );
}

export default SkillsTestPage;
