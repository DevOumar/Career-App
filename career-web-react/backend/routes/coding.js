export function registerCodingRoutes(app) {
  const {
    requireMatchingSession,
    aiActionRateLimiter,
    AI_MODEL,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    XAI_API_KEY,
    db,
    crypto,
    nowIso,
    coerceString,
    parseJsonField,
    getUserRowById,
    getEffectivePlanById
  } = app.locals.ctx;

  // Limites des champs envoyés à l'IA (coût et injection de consignes).
  const clip = (value, max) => String(value ?? "").slice(0, max);
  const CODE_MAX_CHARS = 20000;

  // Même droit d'accès que le simulateur d'entretiens (plan qui débloque
  // les entretiens) : le test technique fait partie de la page Entretiens.
  async function requireInterviewAccess(req, res, userId) {
    if (!requireMatchingSession(req, res, userId)) return false;
    const user = await getUserRowById(userId);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return false;
    }
    const plan = await getEffectivePlanById(parseJsonField(user.subscription_json, {}).planId);
    if (!plan?.unlocksInterviews) {
      res.status(403).json({ error: "Le test technique n'est pas inclus dans le plan gratuit. Inclus dans les plans Élan et Trajectoire Pro, ainsi que dans les licences école et cabinet.", code: "PLAN_REQUIRED" });
      return false;
    }
    return true;
  }

  async function callLlm(systemPrompt, userPrompt, jsonMode = true) {
    const apiKey = GROQ_API_KEY || OPENAI_API_KEY || XAI_API_KEY;
    const preferredGroqModel = String(AI_MODEL || "").trim() || "openai/gpt-oss-120b";
    const groqModels = [...new Set([preferredGroqModel, "openai/gpt-oss-20b"])];

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    if (GROQ_API_KEY) {
      for (const model of groqModels) {
        try {
          const bodyPayload = {
            model,
            messages,
            temperature: 0.2,
            max_tokens: 2200
          };
          if (jsonMode) {
            bodyPayload.response_format = { type: "json_object" };
          }
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(bodyPayload)
          });
          if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";
          }
          const errText = await response.text().catch(() => "");
          console.warn(`Groq Coding error (${model}): ${response.status} ${errText.slice(0, 200)}`);
        } catch (err) {
          console.warn(`Groq Coding error (${model}):`, err.message);
        }
      }
    }

    if (OPENAI_API_KEY) {
      try {
        const bodyPayload = {
          model: "gpt-4o-mini",
          messages,
          temperature: 0.2,
          max_tokens: 2200
        };
        if (jsonMode) {
          bodyPayload.response_format = { type: "json_object" };
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify(bodyPayload)
        });
        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
      } catch (err) {
        console.warn("OpenAI Coding error:", err.message);
      }
    }

    return null;
  }

  // Fallback challenges if LLM key is absent or offline
  function getFallbackChallenge(language, level, topic, customTopic) {
    const langKey = (language || "").toLowerCase();
    if (langKey.includes("html")) {
      return {
        title: "Composant Profil Utilisateur Responsive",
        description:
          "Créez la structure HTML et le style CSS pour une carte de profil utilisateur moderne. La carte doit comporter un avatar circulaire, un nom, un titre de poste, un badge de disponibilité (vert si disponible), et un bouton d'action 'Contacter'.",
        starterCode: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    /* Écrivez votre CSS ici */
    .profile-card {
      max-width: 320px;
      margin: 20px auto;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-family: sans-serif;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Complétez la structure HTML -->
  <div class="profile-card">
    <h2>Thomas Dupont</h2>
  </div>
</body>
</html>`,
        examples: [
          { input: "Affichage mobile / desktop", output: "Carte centrée avec badge aligné", explanation: "Design propre et responsive sans débordement" }
        ],
        testCases: [
          { description: "Avatar circulaire avec balise <img> ou placeholder", input: "HTML DOM", expected: "border-radius: 50%" },
          { description: "Bouton d'action avec état au survol (:hover)", input: "CSS pseudo-class", expected: "Changement de couleur fluide" }
        ],
        hints: [
          "Utilisez Flexbox (display: flex; flex-direction: column; align-items: center;) sur .profile-card.",
          "Pour le badge disponible, un span avec display: inline-flex, une pastille verte et un fond clair offre un excellent rendu moderne."
        ]
      };
    }

    if (langKey.includes("sql")) {
      return {
        title: "Calcul du Salaire Moyen et Top Salaires par Département",
        description:
          "Vous disposez d'une table `employees (id, name, department_id, salary)` et d'une table `departments (id, department_name)`. Écrivez une requête SQL pour retourner le nom du département, le nombre d'employés, le salaire moyen (arrondi à 2 décimales), et le salaire maximum de chaque département comptant au moins 2 employés, triés par salaire moyen décroissant.",
        starterCode: `-- Écrivez votre requête SQL ci-dessous
SELECT 
    d.department_name,
    COUNT(e.id) AS total_employees,
    ROUND(AVG(e.salary), 2) AS avg_salary,
    MAX(e.salary) AS max_salary
FROM departments d
-- Complétez les jointures, groupements et conditions
GROUP BY d.department_name;`,
        examples: [
          { input: "Données départements et employés", output: "department_name | total_employees | avg_salary | max_salary", explanation: "Départements avec >= 2 employés classés du plus rémunérateur au moins rémunérateur" }
        ],
        testCases: [
          { description: "Filtrage des départements avec au moins 2 employés", input: "HAVING", expected: "HAVING COUNT(e.id) >= 2" },
          { description: "Tri décroissant", input: "ORDER BY", expected: "ORDER BY avg_salary DESC" }
        ],
        hints: [
          "Utilisez un INNER JOIN entre departments et employees sur `d.id = e.department_id`.",
          "Pour filtrer sur un agrégat (nombre d'employés >= 2), utilisez la clause HAVING après le GROUP BY."
        ]
      };
    }

    if (langKey.includes("java") && !langKey.includes("script")) {
      return {
        title: "Vérification d'Anagrame & Fréquence de Caractères",
        description:
          "Écrivez une méthode statique `boolean isAnagram(String s, String t)` qui détermine si deux chaînes sont des anagrammes l'une de l'autre (même nombre d'occurrences pour chaque caractère, insensible aux espaces et à la casse). Visez une complexité temporelle O(n) et spatiale O(1) ou O(k).",
        starterCode: `import java.util.HashMap;
import java.util.Map;

public class Solution {
    public static boolean isAnagram(String s, String t) {
        // Votre implémentation ici
        return false;
    }

    public static void main(String[] args) {
        System.out.println(isAnagram("listen", "silent")); // true
        System.out.println(isAnagram("rat", "car"));       // false
    }
}`,
        examples: [
          { input: "s = 'listen', t = 'silent'", output: "true", explanation: "Contient exactement les mêmes lettres" },
          { input: "s = 'anagramme', t = 'marganame'", output: "true", explanation: "Ordre différent mais même décompte" }
        ],
        testCases: [
          { description: "Chaînes de longueurs différentes", input: "s='abc', t='abcd'", expected: "false" },
          { description: "Gestion des majuscules", input: "s='Listen', t='silent'", expected: "true" }
        ],
        hints: [
          "Commencez par vérifier si les longueurs des deux chaînes nettoyées sont identiques ; si non, retournez immédiatement false.",
          "Un tableau d'entiers int[26] ou un HashMap<Character, Integer> permet d'incrémenter pour la chaîne s et de décrémenter pour t."
        ]
      };
    }

    // Default: Python / JavaScript / General
    return {
      title: "Somme de Deux Nombres (Two Sum - Variante Entretien)",
      description:
        "Étant donné un tableau d'entiers `nums` et un entier `target`, retournez les indices des deux nombres tels que leur somme soit égale à `target`. Vous devez garantir une solution optimale en O(n) temps en utilisant une table de hachage.",
      starterCode: langKey.includes("script")
        ? `function twoSum(nums, target) {
  // Votre code ici (recommandé en O(n))
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    // Complétez la boucle
  }
  return [];
}

// Tests
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));       // [1, 2]`
        : `def two_sum(nums: list[int], target: int) -> list[int]:
    """
    Retourne les indices des 2 éléments dont la somme vaut target.
    Complexité visée : O(n) temps, O(n) espace.
    """
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Tests
print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
print(two_sum([3, 2, 4], 6))       # [1, 2]
`,
      examples: [
        { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
        { input: "nums = [3, 2, 4], target = 6", output: "[1, 2]", explanation: "nums[1] + nums[2] = 2 + 4 = 6" }
      ],
      testCases: [
        { description: "Cas standard avec deux éléments", input: "[3, 3], target = 6", expected: "[0, 1]" },
        { description: "Nombres négatifs", input: "[-1, -2, -3, -4], target = -6", expected: "[1, 3]" }
      ],
      hints: [
        "Plutôt que deux boucles imbriquées en O(n²), stockez chaque nombre déjà vu dans un dictionnaire / Map avec son indice.",
        "À chaque élément `x`, calculez le complément nécessaire `target - x` et vérifiez s'il est déjà dans votre dictionnaire."
      ]
    };
  }

  // 1. Générer un exercice de coding sur-mesure
  app.post("/api/coding/generate", aiActionRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!(await requireInterviewAccess(req, res, userId))) return;
      const language = clip(req.body?.language || "Python", 40);
      const level = clip(req.body?.level || "intermediate", 20);
      const topic = clip(req.body?.topic || "algorithms", 80);
      const customTopic = clip(req.body?.customTopic, 300);
      const uiLanguage = clip(req.body?.uiLanguage || "fr", 8).toLowerCase();
      const answerLanguage = uiLanguage === "en" ? "English" : "francais";

      const levelLabel =
        level === "beginner" ? "Débutant (Junior / Fondations)" : level === "advanced" ? "Avancé (Senior / Haute performance)" : "Intermédiaire (Standard d'entretien)";

      const systemPrompt = `Tu dois repondre en ${answerLanguage}. Tous les champs textuels destines au candidat, y compris title, description, examples.explanation, testCases.description, hints et commentaires du starterCode, doivent etre en ${answerLanguage}.
Tu es un examinateur technique senior et lead developer dans une grande entreprise tech (style Big Tech / Scale-up).
Ta mission est de concevoir un défi technique de programmation réaliste, captivant et parfaitement calibré pour l'entraînement d'un candidat à un entretien d'embauche.

Règles impératives :
1. Adapte le problème strictement au langage demandé : "${language}".
2. Adapte la complexité au niveau "${levelLabel}".
3. Thématique visée : "${topic}". ${customTopic ? `Consigne spécifique utilisateur : "${customTopic}".` : ""}
4. Fournis un code de départ (starterCode) propre, idiomatique pour "${language}", avec la signature de fonction ou le squelette adéquat et des commentaires guidant le candidat.
5. Rends ta réponse EXCLUSIVEMENT sous forme d'un objet JSON strict avec la structure suivante :
{
  "title": "Titre court et professionnel de l'exercice",
  "description": "Énoncé complet du problème avec contexte d'entretien, objectifs clairs et contraintes techniques",
  "starterCode": "Code de départ complet et prêt à être complété par le candidat dans l'éditeur",
  "examples": [
    { "input": "...", "output": "...", "explanation": "..." }
  ],
  "testCases": [
    { "description": "Nom du cas test", "input": "...", "expected": "..." }
  ],
  "hints": [
    "Premier indice pour bien démarrer",
    "Deuxième indice sur la structure de données ou l'algorithme optimal"
  ]
}`;

      const userPrompt = `Génère un nouveau défi technique d'entraînement en ${language}, niveau ${levelLabel}, thématique : ${topic}.`;

      const rawJson = await callLlm(`Tu dois repondre en ${answerLanguage}.\n${systemPrompt}`, userPrompt, true);
      let parsed = null;
      if (rawJson) {
        try {
          parsed = JSON.parse(rawJson);
        } catch {
          const match = rawJson.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch {
              parsed = null;
            }
          }
        }
      }

      // IA indisponible ou réponse inexploitable : on le dit, plutôt que de
      // présenter un exercice pré-écrit comme généré pour ce candidat.
      if (!parsed || !parsed.title || !parsed.starterCode) {
        return res.status(503).json({ error: "La génération d'exercice est momentanément indisponible. Réessayez dans quelques instants." });
      }

      res.json({
        ok: true,
        challenge: {
          title: parsed.title,
          description: parsed.description,
          starterCode: parsed.starterCode,
          examples: Array.isArray(parsed.examples) ? parsed.examples : [],
          testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
          hints: Array.isArray(parsed.hints) ? parsed.hints : []
        }
      });
    } catch (err) {
      console.error("Erreur /api/coding/generate:", err);
      res.status(500).json({ error: err.message || "Erreur lors de la génération de l'exercice." });
    }
  });

  // 2. Évaluer et faire la revue de code
  app.post("/api/coding/review", aiActionRateLimiter, async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!(await requireInterviewAccess(req, res, userId))) return;
      const language = clip(req.body?.language || "Python", 40);
      const uiLanguage = clip(req.body?.uiLanguage || "fr", 8).toLowerCase();
      const answerLanguage = uiLanguage === "en" ? "English" : "francais";
      const rawChallenge = req.body?.challenge && typeof req.body.challenge === "object" ? req.body.challenge : {};
      if (JSON.stringify(rawChallenge).length > 20000) {
        return res.status(413).json({ error: "Énoncé d'exercice trop volumineux." });
      }
      const challenge = rawChallenge;

      const userCode = String(req.body?.code || "").trim();
      if (!userCode) {
        return res.status(400).json({ error: "Aucun code soumis pour évaluation." });
      }
      if (userCode.length > CODE_MAX_CHARS) {
        return res.status(413).json({ error: `Code trop long (${CODE_MAX_CHARS} caractères maximum).` });
      }

      const systemPrompt = `Tu es un Lead Software Engineer et Reviewer de code expérimenté.
Tu évalues la solution technique soumise par un candidat lors d'un test technique d'embauche.
Sois bienveillant mais très rigoureux sur l'exactitude, la complexité, les cas limites (edge cases) et les bonnes pratiques du langage ${language}.

Tu dois impérativement répondre en JSON STRICT avec exactement cette structure :
{
  "score": 85,
  "verdict": "success" | "partial" | "needs_work",
  "correctness": "Analyse de la justesse de l'implémentation, validité de la logique et prise en compte des cas limites.",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "quality": "Commentaires sur la lisibilité, le nommage, la propreté du code et l'idiomatique ${language}.",
  "bugs": [
    "Description d'un bug ou d'un risque potentiel s'il y en a"
  ],
  "suggestedSolution": "Code de référence optimal complet, élégant et bien commenté",
  "explanation": "Explication claire et didactique de la solution optimale et des axes d'amélioration clés."
}

Règles pour le champ verdict :
- "success" si score >= 80 (solution juste et efficace)
- "partial" si score entre 50 et 79 (solution partiellement correcte ou sous-optimale)
- "needs_work" si score < 50 (code non fonctionnel, erreurs de logique ou incomplet)`;

      const userPrompt = `DÉFI PROPOSÉ :
Titre : ${challenge.title || "Exercice"}
Énoncé : ${challenge.description || "Résoudre le problème"}
Langage : ${language}

CODE SOUMIS PAR LE CANDIDAT :
\`\`\`${language.toLowerCase()}
${userCode}
\`\`\`

Évalue ce code et renvoie l'analyse au format JSON demandé.`;

      const rawJson = await callLlm(`Tu dois repondre en ${answerLanguage}.\n${systemPrompt}`, userPrompt, true);
      let parsed = null;
      if (rawJson) {
        try {
          parsed = JSON.parse(rawJson);
        } catch {
          const match = rawJson.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              parsed = JSON.parse(match[0]);
            } catch {
              parsed = null;
            }
          }
        }
      }

      // IA indisponible ou réponse inexploitable : aucune note n'est inventée.
      if (!parsed || typeof parsed.score !== "number") {
        return res.status(503).json({ error: "La correction IA est momentanément indisponible. Votre code n'est pas perdu : réessayez dans quelques instants." });
      }

      res.json({
        ok: true,
        review: {
          score: Math.min(100, Math.max(0, Math.round(parsed.score))),
          verdict: parsed.verdict || (parsed.score >= 80 ? "success" : "partial"),
          correctness: parsed.correctness || "",
          timeComplexity: parsed.timeComplexity || "",
          spaceComplexity: parsed.spaceComplexity || "",
          quality: parsed.quality || "",
          bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
          suggestedSolution: parsed.suggestedSolution || "",
          explanation: parsed.explanation || ""
        }
      });
    } catch (err) {
      console.error("Erreur /api/coding/review:", err);
      res.status(500).json({ error: err.message || "Erreur lors de l'évaluation du code." });
    }
  });

  // 3. Sauvegarder une session d'entraînement
  app.post("/api/coding/sessions", async (req, res) => {
    try {
      const userId = coerceString(req.body?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      if (JSON.stringify(req.body?.session || {}).length > 200000) {
        return res.status(413).json({ error: "Session trop volumineuse." });
      }

      const session = req.body?.session || {};
      const id = clip(session.id, 80) || crypto.randomUUID();
      const title = String(session.title || "Exercice de code").slice(0, 200);
      const language = String(session.language || "Python").slice(0, 50);
      const level = String(session.level || "intermediate").slice(0, 50);
      const now = nowIso();

      const payloadJson = JSON.stringify({
        ...session,
        id,
        updatedAt: now
      });

      await db.query(
        `INSERT INTO coding_sessions (id, user_id, title, language, level, created_at, updated_at, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           language = EXCLUDED.language,
           level = EXCLUDED.level,
           updated_at = EXCLUDED.updated_at,
           payload_json = EXCLUDED.payload_json
         WHERE coding_sessions.user_id = EXCLUDED.user_id`,
        [id, userId, title, language, level, now, now, payloadJson]
      );
      const { rows: ownerRows } = await db.query("SELECT user_id FROM coding_sessions WHERE id = $1", [id]);
      if (ownerRows[0] && ownerRows[0].user_id !== userId) {
        return res.status(403).json({ error: "Accès refusé." });
      }

      res.json({ ok: true, id, updatedAt: now });
    } catch (err) {
      console.error("Erreur save coding session:", err);
      res.status(500).json({ error: err.message || "Erreur sauvegarde session." });
    }
  });

  // 4. Lister les sessions de coding de l'utilisateur
  app.get("/api/coding/sessions", async (req, res) => {
    try {
      const userId = coerceString(req.query?.userId);
      if (!requireMatchingSession(req, res, userId)) return;

      const result = await db.query(
        `SELECT id, title, language, level, created_at, updated_at, payload_json
         FROM coding_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 50`,
        [userId]
      );

      const items = (result.rows || []).map((row) => {
        const payload = parseJsonField(row.payload_json, {});
        return {
          id: row.id,
          title: row.title,
          language: row.language,
          level: row.level,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          ...payload
        };
      });

      res.json({ ok: true, items });
    } catch (err) {
      console.error("Erreur list coding sessions:", err);
      res.status(500).json({ error: err.message || "Erreur récupération sessions." });
    }
  });

  // 5. Supprimer une session de coding
  app.delete("/api/coding/sessions/:id", async (req, res) => {
    try {
      const userId = coerceString(req.query?.userId);
      if (!requireMatchingSession(req, res, userId)) return;
      const sessionId = coerceString(req.params?.id);
      if (!sessionId) {
        return res.status(400).json({ error: "userId et sessionId requis." });
      }

      await db.query(`DELETE FROM coding_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Erreur delete coding session:", err);
      res.status(500).json({ error: err.message || "Erreur suppression session." });
    }
  });
}

