// Routes skillsTest — memes conventions que coverLetter.js : toutes les
// dependances (db, helpers, constantes) sont lues depuis app.locals.ctx,
// rempli une fois dans index.js apres l'initialisation complete.
export function registerSkillsTestRoutes(app) {
  const {
    requireMatchingSession,
    aiActionRateLimiter,
    coerceString,
    db,
    crypto,
    nowIso,
    parseJsonField,
    getUserRowById,
    AI_PROVIDER,
    SKILLS_TEST_QCM_MAX,
    SKILLS_TEST_OPEN_MAX,
    SKILLS_TEST_MAX_RAW_SCORE,
    buildLocalSkillsTestQuestions,
    generateSkillsTestQuestionsWithAi,
    gradeQcmAnswer,
    buildLocalOpenAnswerScore,
    gradeSkillsTestOpenAnswersWithAi,
    computeSkillsTestFinalScore
  } = app.locals.ctx;

  // Ne renvoie jamais réponseCorrecte au client : /grade la relit depuis la
  // base (payload_json de skills_tests), jamais depuis ce que le client
  // renvoie — sans ça, la bonne réponse serait visible dans l'onglet réseau
  // du navigateur entre la génération et la notation.
  function stripCorrectAnswers(questions) {
    return questions.map((question) =>
      question.type === "qcm"
        ? { id: question.id, type: question.type, "énoncé": question["énoncé"], choix: question.choix }
        : question
    );
  }

  app.post("/api/skills-test/generate", aiActionRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      if (!userId) {
        return res.status(400).json({ error: "userId requis." });
      }
      const user = await getUserRowById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable." });
      }

      const offer = req.body?.offer && typeof req.body.offer === "object" ? req.body.offer : {};
      const language = req.body?.language === "en" ? "en" : "fr";

      let questionsResult = null;
      let provider = "local";
      try {
        questionsResult = await generateSkillsTestQuestionsWithAi(offer, language);
        if (questionsResult) provider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
      } catch (aiError) {
        questionsResult = null;
        console.warn(`Generation IA du test de competences indisponible: ${aiError.message}`);
      }

      const result = questionsResult || buildLocalSkillsTestQuestions(offer, language);
      const questions = result.questions;

      // Persistance immediate (avec réponseCorrecte, jamais renvoyée au
      // client) : /grade ira relire cette ligne par id, pas ce que le
      // client lui renverra.
      const id = `skillstest-${crypto.randomUUID()}`;
      const createdAt = nowIso();
      // Le prefixe "Test de competences" est deja le titre de la page :
      // l'historique n'affiche que le titre de l'offre, sans le repeter.
      const title = coerceString(req.body?.title) || coerceString(offer?.title) || "Test de compétences";
      const payload = { offer, language, status: "pending", questions, provider, createdAt };

      await db.query(
        `INSERT INTO skills_tests (id, user_id, title, created_at, updated_at, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, userId, title, createdAt, createdAt, JSON.stringify(payload)]
      );

      return res.status(201).json({ id, questions: stripCorrectAnswers(questions), provider });
    } catch (error) {
      return res.status(400).json({ error: error.message || "Generation du test impossible." });
    }
  });

  app.post("/api/skills-test/grade", aiActionRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const testId = coerceString(req.body?.id);
      const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};

      if (!userId || !testId) {
        return res.status(400).json({ error: "userId et id requis." });
      }

      const { rows } = await db.query("SELECT payload_json FROM skills_tests WHERE id = $1 AND user_id = $2", [testId, userId]);
      if (!rows[0]) {
        return res.status(404).json({ error: "Test introuvable." });
      }

      // Les questions (avec réponseCorrecte) et la langue viennent
      // exclusivement de ce qui a été persisté à la génération — jamais du
      // corps de cette requête, qui ne fournit que les réponses données.
      const stored = parseJsonField(rows[0].payload_json, {});
      const questions = Array.isArray(stored.questions) ? stored.questions : [];
      const language = stored.language === "en" ? "en" : "fr";

      const qcmQuestions = questions.filter((question) => question?.type === "qcm");
      const openQuestions = questions.filter((question) => question?.type === "ouverte");

      const qcmResults = qcmQuestions.map((question) => ({
        id: question.id,
        type: "qcm",
        score: gradeQcmAnswer(question, answers?.[question.id]),
        maxScore: SKILLS_TEST_QCM_MAX
      }));

      let openScores = null;
      let provider = "local";
      try {
        openScores = await gradeSkillsTestOpenAnswersWithAi(openQuestions, answers, language);
        if (openScores) provider = AI_PROVIDER === "grok" ? "xai" : AI_PROVIDER;
      } catch (aiError) {
        openScores = null;
        console.warn(`Notation IA du test de competences indisponible: ${aiError.message}`);
      }
      if (!openScores) {
        openScores = openQuestions.map((question) => ({
          id: question.id,
          score: buildLocalOpenAnswerScore(question, answers?.[question.id]),
          feedback: ""
        }));
      }

      const openResults = openScores.map((item) => ({ ...item, type: "ouverte", maxScore: SKILLS_TEST_OPEN_MAX }));
      const results = [...qcmResults, ...openResults];
      const finalScore = computeSkillsTestFinalScore(results);

      const updatedAt = nowIso();
      const updatedPayload = { ...stored, status: "graded", answers, results, finalScore, gradedAt: updatedAt };
      await db.query("UPDATE skills_tests SET payload_json = $1, updated_at = $2 WHERE id = $3", [
        JSON.stringify(updatedPayload),
        updatedAt,
        testId
      ]);

      return res.json({ id: testId, results, finalScore, maxRawScore: SKILLS_TEST_MAX_RAW_SCORE, provider });
    } catch (error) {
      return res.status(400).json({ error: error.message || "Notation du test impossible." });
    }
  });

  app.get("/api/skills-test/tests", async (req, res) => {
    try {
      const userId = coerceString(req.query.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      if (!userId) {
        return res.status(400).json({ error: "userId requis." });
      }

      const { rows } = await db.query(
        "SELECT id, title, created_at, updated_at, payload_json FROM skills_tests WHERE user_id = $1 ORDER BY updated_at DESC",
        [userId]
      );

      const items = rows.map((row) => ({
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...parseJsonField(row.payload_json, {})
      }));

      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.post("/api/skills-test/tests", async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const payload = req.body?.payload;
      const title = coerceString(req.body?.title) || "Test de compétences";

      if (!userId || !payload) {
        return res.status(400).json({ error: "userId et payload requis." });
      }

      const user = await getUserRowById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur introuvable." });
      }

      const id = `skillstest-${crypto.randomUUID()}`;
      const createdAt = nowIso();

      await db.query(
        `INSERT INTO skills_tests (id, user_id, title, created_at, updated_at, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, userId, title, createdAt, createdAt, JSON.stringify(payload)]
      );

      return res.status(201).json({
        test: { id, userId, title, createdAt, updatedAt: createdAt, ...payload }
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.put("/api/skills-test/tests/:id", async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const testId = coerceString(req.params.id);
      const payload = req.body?.payload;
      const title = coerceString(req.body?.title);

      if (!userId || !testId || !payload) {
        return res.status(400).json({ error: "userId, id et payload requis." });
      }

      const { rows } = await db.query("SELECT id FROM skills_tests WHERE id = $1 AND user_id = $2", [testId, userId]);
      if (!rows[0]) {
        return res.status(404).json({ error: "Test introuvable." });
      }

      const updatedAt = nowIso();
      if (title) {
        await db.query(
          "UPDATE skills_tests SET payload_json = $1, updated_at = $2, title = $3 WHERE id = $4",
          [JSON.stringify(payload), updatedAt, title, testId]
        );
      } else {
        await db.query(
          "UPDATE skills_tests SET payload_json = $1, updated_at = $2 WHERE id = $3",
          [JSON.stringify(payload), updatedAt, testId]
        );
      }

      return res.json({ ok: true, updatedAt });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });

  app.delete("/api/skills-test/tests/:id", async (req, res) => {
    try {
      const userId = coerceString(req.query.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const testId = coerceString(req.params.id);
      if (!userId || !testId) {
        return res.status(400).json({ error: "userId et id requis." });
      }

      await db.query("DELETE FROM skills_tests WHERE id = $1 AND user_id = $2", [testId, userId]);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message || "Erreur serveur." });
    }
  });
}
