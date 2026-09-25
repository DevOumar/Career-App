// Espace Cabinet : clients, entretiens, factures d'honoraires, journal
// d'activité, e-mails aux candidats, RGPD et matching candidat / mission.
// Dépendances lues depuis app.locals.ctx (voir index.js).
export function registerCabinetExtrasRoutes(app) {
  const {
    requireMatchingSession,
    crypto,
    db,
    nowIso,
    coerceString,
    normalizeText,
    parseJsonField,
    escapeHtml,
    getMailTransporter,
    MAIL_FROM,
    MAIL_FROM_NAME,
    MAIL_FROM_ADDRESS,
    SMTP_USER,
    AUTH_EMAIL_TO,
    requireCabinetOwner,
    requireCabinetOwnerRole,
    detectSkillsFromText,
    analyzeMatchWithAi,
    aiActionRateLimiter,
    logCabinetActivity,
    anonymizeCabinetCandidates,
    getCabinetExpiredCandidateIds,
    ensureCabinetClient
  } = app.locals.ctx;

  const fail = (res, error) => res.status(error.statusCode || 500).json({ error: error.message || "Erreur serveur." });
  const badRequest = (message, field) => Object.assign(new Error(message), { statusCode: 400, code: field ? `field:${field}` : undefined });
  const notFound = (message) => Object.assign(new Error(message), { statusCode: 404 });
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_PATTERN = /^\+?[0-9 ]{6,20}$/;
  const str = (value, max = 500) => coerceString(value).trim().slice(0, max);
  const num = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const isoOrNull = (value) => {
    const raw = coerceString(value).trim();
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  async function context(req, res, source = "query") {
    const userId = coerceString(source === "body" ? req.body?.userId : req.query?.userId || req.body?.userId);
    if (!requireMatchingSession(req, res, userId)) return null;
    return requireCabinetOwner(userId);
  }

  async function ownedRow(table, id, cabinet, label) {
    const { rows } = await db.query(`SELECT * FROM ${table} WHERE id = $1 AND cabinet_user_id = $2`, [id, cabinet.cabinetRootId]);
    if (!rows.length) throw notFound(`${label} introuvable.`);
    return rows[0];
  }

  // ======================================================================
  // Clients
  // ======================================================================
  function clientPayload(body) {
    const client = {
      name: str(body?.name, 160),
      sector: str(body?.sector, 120),
      website: str(body?.website, 200),
      contactName: str(body?.contactName, 120),
      contactEmail: str(body?.contactEmail, 160).toLowerCase(),
      contactPhone: str(body?.contactPhone, 20),
      address: str(body?.address, 300),
      notes: str(body?.notes, 3000)
    };
    if (client.name.length < 2) throw badRequest("Le nom du client doit contenir au moins 2 caractères.", "name");
    if (client.contactEmail && !EMAIL_PATTERN.test(client.contactEmail)) throw badRequest("Adresse e-mail du contact invalide.", "contactEmail");
    if (client.contactPhone && !PHONE_PATTERN.test(client.contactPhone)) throw badRequest("Le téléphone ne doit contenir que des chiffres (et + au début).", "contactPhone");
    if (client.website && !/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(client.website)) throw badRequest("Adresse du site web invalide.", "website");
    return client;
  }

  app.get("/api/cabinet/clients", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const root = cabinet.cabinetRootId;
      const { rows: clients } = await db.query("SELECT * FROM cabinet_clients WHERE cabinet_user_id = $1 ORDER BY LOWER(name)", [root]);
      const { rows: missions } = await db.query(
        "SELECT id, client_id, title, status, placement_amount, created_at, closed_at FROM cabinet_missions WHERE cabinet_user_id = $1",
        [root]
      );
      const { rows: invoices } = await db.query(
        "SELECT client_id, status, amount_ht, vat_rate FROM cabinet_invoices WHERE cabinet_user_id = $1 AND status <> 'cancelled'",
        [root]
      );
      const { rows: placements } = await db.query(
        `SELECT m.client_id, COUNT(*)::int AS placed FROM cabinet_mission_candidates mc
         JOIN cabinet_missions m ON m.id = mc.mission_id
         WHERE m.cabinet_user_id = $1 AND mc.stage = 'placed' GROUP BY m.client_id`,
        [root]
      );
      const placedBy = new Map(placements.map((row) => [row.client_id, row.placed]));
      const ttc = (row) => Number(row.amount_ht || 0) * (1 + Number(row.vat_rate || 0) / 100);
      return res.json({
        items: clients.map((row) => {
          const own = missions.filter((mission) => mission.client_id === row.id);
          const ownInvoices = invoices.filter((invoice) => invoice.client_id === row.id);
          return {
            id: row.id,
            name: row.name,
            sector: row.sector,
            website: row.website,
            contactName: row.contact_name,
            contactEmail: row.contact_email,
            contactPhone: row.contact_phone,
            address: row.address,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            missionCount: own.length,
            openMissionCount: own.filter((mission) => mission.status !== "closed").length,
            placedCount: placedBy.get(row.id) || 0,
            feesRecorded: own.reduce((sum, mission) => sum + Number(mission.placement_amount || 0), 0),
            invoicedTtc: Math.round(ownInvoices.reduce((sum, invoice) => sum + ttc(invoice), 0) * 100) / 100,
            paidTtc: Math.round(ownInvoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + ttc(invoice), 0) * 100) / 100,
            missions: own
              .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
              .map((mission) => ({ id: mission.id, title: mission.title, status: mission.status, createdAt: mission.created_at }))
          };
        })
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/cabinet/clients", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const client = clientPayload(req.body);
      const { rows: duplicate } = await db.query("SELECT id FROM cabinet_clients WHERE cabinet_user_id = $1 AND LOWER(name) = LOWER($2)", [
        cabinet.cabinetRootId,
        client.name
      ]);
      if (duplicate.length) throw Object.assign(new Error("Un client porte déjà ce nom."), { statusCode: 409, code: "field:name" });
      const id = `ccli-${crypto.randomUUID()}`;
      const now = nowIso();
      await db.query(
        `INSERT INTO cabinet_clients (id, cabinet_user_id, name, sector, website, contact_name, contact_email, contact_phone, address, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
        [id, cabinet.cabinetRootId, client.name, client.sector, client.website, client.contactName, client.contactEmail, client.contactPhone, client.address, client.notes, now]
      );
      await logCabinetActivity(cabinet, "client_created", { entityType: "client", entityId: id, entityLabel: client.name });
      return res.status(201).json({ ok: true, id });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.put("/api/cabinet/clients/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const existing = await ownedRow("cabinet_clients", coerceString(req.params.id), cabinet, "Client");
      const client = clientPayload(req.body);
      const { rows: duplicate } = await db.query("SELECT id FROM cabinet_clients WHERE cabinet_user_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3", [
        cabinet.cabinetRootId,
        client.name,
        existing.id
      ]);
      if (duplicate.length) throw Object.assign(new Error("Un client porte déjà ce nom."), { statusCode: 409, code: "field:name" });
      await db.query(
        `UPDATE cabinet_clients SET name = $1, sector = $2, website = $3, contact_name = $4, contact_email = $5, contact_phone = $6,
           address = $7, notes = $8, updated_at = $9 WHERE id = $10 AND cabinet_user_id = $11`,
        [client.name, client.sector, client.website, client.contactName, client.contactEmail, client.contactPhone, client.address, client.notes, nowIso(), existing.id, cabinet.cabinetRootId]
      );
      // Le nom affiché sur les missions et factures en brouillon suit la fiche.
      await db.query("UPDATE cabinet_missions SET client_name = $1 WHERE client_id = $2 AND cabinet_user_id = $3", [client.name, existing.id, cabinet.cabinetRootId]);
      await db.query("UPDATE cabinet_invoices SET client_name = $1 WHERE client_id = $2 AND cabinet_user_id = $3 AND status = 'draft'", [
        client.name,
        existing.id,
        cabinet.cabinetRootId
      ]);
      await logCabinetActivity(cabinet, "client_updated", { entityType: "client", entityId: existing.id, entityLabel: client.name });
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.delete("/api/cabinet/clients/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const existing = await ownedRow("cabinet_clients", coerceString(req.params.id), cabinet, "Client");
      const { rows: linked } = await db.query(
        `SELECT (SELECT COUNT(*)::int FROM cabinet_missions WHERE client_id = $1) AS missions,
                (SELECT COUNT(*)::int FROM cabinet_invoices WHERE client_id = $1) AS invoices`,
        [existing.id]
      );
      if (linked[0]?.missions || linked[0]?.invoices) {
        throw Object.assign(new Error("Ce client a des missions ou des factures : supprimez-les ou rattachez-les à un autre client d'abord."), { statusCode: 409 });
      }
      await db.query("DELETE FROM cabinet_clients WHERE id = $1 AND cabinet_user_id = $2", [existing.id, cabinet.cabinetRootId]);
      await logCabinetActivity(cabinet, "client_deleted", { entityType: "client", entityId: existing.id, entityLabel: existing.name });
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // Entretiens
  // ======================================================================
  const INTERVIEW_MODES = new Set(["visio", "phone", "onsite"]);
  const INTERVIEW_STATUSES = new Set(["planned", "done", "cancelled", "no_show"]);

  function interviewRow(row) {
    return {
      id: row.id,
      candidateId: row.candidate_id,
      candidateFirstName: row.first_name || "",
      candidateLastName: row.last_name || "",
      candidateEmail: row.email || "",
      missionId: row.mission_id || "",
      missionTitle: row.mission_title || "",
      clientName: row.client_name || "",
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      mode: row.mode,
      location: row.location,
      interviewer: row.interviewer,
      notes: row.notes,
      status: row.status,
      feedback: row.feedback,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async function interviewPayload(body, cabinet) {
    const scheduledAt = isoOrNull(body?.scheduledAt);
    if (!scheduledAt) throw badRequest("Date et heure de l'entretien requises.", "scheduledAt");
    const duration = Math.round(Number(body?.durationMinutes || 60));
    if (!Number.isFinite(duration) || duration < 10 || duration > 480) throw badRequest("Durée invalide (10 à 480 minutes).", "durationMinutes");
    const mode = coerceString(body?.mode || "visio");
    if (!INTERVIEW_MODES.has(mode)) throw badRequest("Format d'entretien invalide.", "mode");
    const status = coerceString(body?.status || "planned");
    if (!INTERVIEW_STATUSES.has(status)) throw badRequest("Statut d'entretien invalide.", "status");
    const missionId = coerceString(body?.missionId).trim() || null;
    if (missionId) await ownedRow("cabinet_missions", missionId, cabinet, "Mission");
    return {
      scheduledAt,
      duration,
      mode,
      status,
      missionId,
      location: str(body?.location, 300),
      interviewer: str(body?.interviewer, 160),
      notes: str(body?.notes, 3000),
      feedback: str(body?.feedback, 3000)
    };
  }

  const INTERVIEW_SELECT = `SELECT i.*, c.first_name, c.last_name, c.email, m.title AS mission_title, m.client_name
    FROM cabinet_interviews i
    LEFT JOIN cabinet_candidates c ON c.id = i.candidate_id
    LEFT JOIN cabinet_missions m ON m.id = i.mission_id`;

  app.get("/api/cabinet/interviews", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const candidateId = coerceString(req.query?.candidateId);
      const params = [cabinet.cabinetRootId];
      let where = "WHERE i.cabinet_user_id = $1";
      if (candidateId) {
        params.push(candidateId);
        where += " AND i.candidate_id = $2";
      }
      const { rows } = await db.query(`${INTERVIEW_SELECT} ${where} ORDER BY i.scheduled_at DESC LIMIT 500`, params);
      return res.json({ items: rows.map(interviewRow) });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/cabinet/interviews", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const candidate = await ownedRow("cabinet_candidates", coerceString(req.body?.candidateId), cabinet, "Candidat");
      if (candidate.anonymized_at) throw badRequest("Ce candidat a été anonymisé.");
      const data = await interviewPayload(req.body, cabinet);
      const id = `cint-${crypto.randomUUID()}`;
      const now = nowIso();
      await db.query(
        `INSERT INTO cabinet_interviews (id, cabinet_user_id, candidate_id, mission_id, scheduled_at, duration_minutes, mode, location, interviewer, notes, status, feedback, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
        [id, cabinet.cabinetRootId, candidate.id, data.missionId, data.scheduledAt, data.duration, data.mode, data.location, data.interviewer, data.notes, data.status, data.feedback, cabinet.id, now]
      );
      // Un entretien planifié fait passer le candidat à l'étape « En entretien »
      // (dans le vivier et, le cas échéant, sur la mission).
      if (["sourced", "contacted"].includes(candidate.status)) {
        await db.query("UPDATE cabinet_candidates SET status = 'interviewing', status_updated_at = $1, updated_at = $1 WHERE id = $2", [now, candidate.id]);
      }
      if (data.missionId) {
        await db.query(
          `INSERT INTO cabinet_mission_candidates (mission_id, candidate_id, stage, created_at, stage_updated_at)
           VALUES ($1,$2,'interviewing',$3,$3)
           ON CONFLICT (mission_id, candidate_id) DO UPDATE SET
             stage = CASE WHEN cabinet_mission_candidates.stage IN ('sourced','contacted') THEN 'interviewing' ELSE cabinet_mission_candidates.stage END,
             stage_updated_at = CASE WHEN cabinet_mission_candidates.stage IN ('sourced','contacted') THEN $3 ELSE cabinet_mission_candidates.stage_updated_at END`,
          [data.missionId, candidate.id, now]
        );
      }
      await logCabinetActivity(cabinet, "interview_scheduled", {
        entityType: "candidate",
        entityId: candidate.id,
        entityLabel: `${candidate.first_name} ${candidate.last_name}`.trim(),
        details: { scheduledAt: data.scheduledAt, mode: data.mode }
      });
      return res.status(201).json({ ok: true, id });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.put("/api/cabinet/interviews/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const existing = await ownedRow("cabinet_interviews", coerceString(req.params.id), cabinet, "Entretien");
      const merged = {
        scheduledAt: req.body?.scheduledAt ?? existing.scheduled_at,
        durationMinutes: req.body?.durationMinutes ?? existing.duration_minutes,
        mode: req.body?.mode ?? existing.mode,
        status: req.body?.status ?? existing.status,
        missionId: req.body?.missionId ?? existing.mission_id,
        location: req.body?.location ?? existing.location,
        interviewer: req.body?.interviewer ?? existing.interviewer,
        notes: req.body?.notes ?? existing.notes,
        feedback: req.body?.feedback ?? existing.feedback
      };
      const data = await interviewPayload(merged, cabinet);
      await db.query(
        `UPDATE cabinet_interviews SET mission_id = $1, scheduled_at = $2, duration_minutes = $3, mode = $4, location = $5, interviewer = $6,
           notes = $7, status = $8, feedback = $9, updated_at = $10 WHERE id = $11 AND cabinet_user_id = $12`,
        [data.missionId, data.scheduledAt, data.duration, data.mode, data.location, data.interviewer, data.notes, data.status, data.feedback, nowIso(), existing.id, cabinet.cabinetRootId]
      );
      if (data.status !== existing.status) {
        const { rows } = await db.query("SELECT first_name, last_name FROM cabinet_candidates WHERE id = $1", [existing.candidate_id]);
        await logCabinetActivity(cabinet, "interview_status_changed", {
          entityType: "candidate",
          entityId: existing.candidate_id,
          entityLabel: `${rows[0]?.first_name || ""} ${rows[0]?.last_name || ""}`.trim(),
          details: { from: existing.status, to: data.status }
        });
      }
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.delete("/api/cabinet/interviews/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const existing = await ownedRow("cabinet_interviews", coerceString(req.params.id), cabinet, "Entretien");
      await db.query("DELETE FROM cabinet_interviews WHERE id = $1 AND cabinet_user_id = $2", [existing.id, cabinet.cabinetRootId]);
      await logCabinetActivity(cabinet, "interview_deleted", { entityType: "candidate", entityId: existing.candidate_id, details: { scheduledAt: existing.scheduled_at } });
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // Factures d'honoraires
  // ======================================================================
  const INVOICE_STATUSES = new Set(["draft", "sent", "paid", "cancelled"]);

  function invoiceRow(row) {
    const amountHt = Number(row.amount_ht || 0);
    const vatRate = Number(row.vat_rate || 0);
    const vat = Math.round(amountHt * vatRate) / 100;
    return {
      id: row.id,
      number: row.number,
      clientId: row.client_id || "",
      clientName: row.client_name,
      missionId: row.mission_id || "",
      missionTitle: row.mission_title || "",
      label: row.label,
      amountHt,
      vatRate,
      vatAmount: vat,
      amountTtc: Math.round((amountHt + vat) * 100) / 100,
      status: row.status,
      issuedAt: row.issued_at,
      dueAt: row.due_at,
      paidAt: row.paid_at,
      overdue: row.status === "sent" && row.due_at && row.due_at < nowIso(),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async function nextInvoiceNumber(cabinetRootId) {
    const year = new Date().getUTCFullYear();
    const prefix = `FAC-${year}-`;
    const { rows } = await db.query("SELECT number FROM cabinet_invoices WHERE cabinet_user_id = $1 AND number LIKE $2", [cabinetRootId, `${prefix}%`]);
    const highest = rows.reduce((max, row) => Math.max(max, Number(String(row.number).slice(prefix.length)) || 0), 0);
    return `${prefix}${String(highest + 1).padStart(4, "0")}`;
  }

  async function invoicePayload(body, cabinet) {
    const amountHt = num(body?.amountHt);
    if (amountHt === null || Number.isNaN(amountHt) || amountHt <= 0) throw badRequest("Montant HT invalide.", "amountHt");
    const vatRate = num(body?.vatRate ?? 20);
    if (vatRate === null || Number.isNaN(vatRate) || vatRate < 0 || vatRate > 30) throw badRequest("Taux de TVA invalide (0 à 30 %).", "vatRate");
    const label = str(body?.label, 300);
    if (label.length < 2) throw badRequest("Indiquez l'objet de la facture.", "label");
    let clientId = coerceString(body?.clientId).trim() || null;
    let clientName = "";
    if (clientId) {
      clientName = (await ownedRow("cabinet_clients", clientId, cabinet, "Client")).name;
    } else {
      clientName = str(body?.clientName, 160);
      if (clientName.length < 2) throw badRequest("Choisissez le client facturé.", "clientId");
      clientId = await ensureCabinetClient(cabinet.cabinetRootId, clientName);
    }
    const missionId = coerceString(body?.missionId).trim() || null;
    if (missionId) await ownedRow("cabinet_missions", missionId, cabinet, "Mission");
    const issuedAt = isoOrNull(body?.issuedAt);
    const dueAt = isoOrNull(body?.dueAt);
    if (issuedAt === undefined) throw badRequest("Date d'émission invalide.", "issuedAt");
    if (dueAt === undefined) throw badRequest("Date d'échéance invalide.", "dueAt");
    return { amountHt, vatRate, label, clientId, clientName, missionId, issuedAt, dueAt };
  }

  const INVOICE_SELECT = `SELECT f.*, m.title AS mission_title FROM cabinet_invoices f LEFT JOIN cabinet_missions m ON m.id = f.mission_id`;

  app.get("/api/cabinet/invoices", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const { rows } = await db.query(`${INVOICE_SELECT} WHERE f.cabinet_user_id = $1 ORDER BY f.created_at DESC`, [cabinet.cabinetRootId]);
      const { rows: profileRows } = await db.query("SELECT * FROM user_recruiter_profiles WHERE user_id = $1", [cabinet.cabinetRootId]);
      const profile = profileRows[0] || {};
      return res.json({
        items: rows.map(invoiceRow),
        issuer: {
          organizationName: profile.organization_name || "",
          legalName: profile.legal_name || "",
          siret: profile.siret || "",
          vatNumber: profile.vat_number || "",
          address: profile.address || "",
          city: profile.city || "",
          country: profile.country || "",
          contactEmail: profile.contact_email || "",
          contactPhone: profile.contact_phone || "",
          logoDataUrl: profile.logo_data_url || "",
          invoiceFooter: profile.invoice_footer || ""
        }
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/cabinet/invoices", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const data = await invoicePayload(req.body, cabinet);
      const status = coerceString(req.body?.status || "draft") === "sent" ? "sent" : "draft";
      const now = nowIso();
      const issuedAt = status === "sent" ? data.issuedAt || now : data.issuedAt;
      const dueAt = data.dueAt || (issuedAt ? new Date(new Date(issuedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null);
      const id = `cinvc-${crypto.randomUUID()}`;
      const number = await nextInvoiceNumber(cabinet.cabinetRootId);
      await db.query(
        `INSERT INTO cabinet_invoices (id, cabinet_user_id, number, client_id, client_name, mission_id, label, amount_ht, vat_rate, status, issued_at, due_at, paid_at, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,$13,$14,$14)`,
        [id, cabinet.cabinetRootId, number, data.clientId, data.clientName, data.missionId, data.label, data.amountHt, data.vatRate, status, issuedAt, dueAt, cabinet.id, now]
      );
      await logCabinetActivity(cabinet, "invoice_created", { entityType: "invoice", entityId: id, entityLabel: `${number} · ${data.clientName}`, details: { amountHt: data.amountHt, status } });
      return res.status(201).json({ ok: true, id, number });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.put("/api/cabinet/invoices/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const existing = await ownedRow("cabinet_invoices", coerceString(req.params.id), cabinet, "Facture");
      const nextStatus = coerceString(req.body?.status || existing.status);
      if (!INVOICE_STATUSES.has(nextStatus)) throw badRequest("Statut de facture invalide.");
      const now = nowIso();

      // Une facture émise n'est plus modifiable (numérotation et montants
      // figés) : seuls ses changements de statut sont possibles.
      if (existing.status === "draft" && req.body?.amountHt !== undefined) {
        const data = await invoicePayload({ ...req.body, clientId: req.body?.clientId ?? existing.client_id }, cabinet);
        await db.query(
          `UPDATE cabinet_invoices SET client_id = $1, client_name = $2, mission_id = $3, label = $4, amount_ht = $5, vat_rate = $6,
             issued_at = $7, due_at = $8, updated_at = $9 WHERE id = $10`,
          [data.clientId, data.clientName, data.missionId, data.label, data.amountHt, data.vatRate, data.issuedAt, data.dueAt, now, existing.id]
        );
      }
      if (nextStatus !== existing.status) {
        const allowed = { draft: ["sent", "cancelled"], sent: ["paid", "cancelled"], paid: ["sent"], cancelled: [] };
        if (!allowed[existing.status]?.includes(nextStatus)) throw badRequest("Changement de statut impossible pour cette facture.");
        const { rows } = await db.query("SELECT issued_at, due_at FROM cabinet_invoices WHERE id = $1", [existing.id]);
        const issuedAt = rows[0]?.issued_at || now;
        const dueAt = rows[0]?.due_at || new Date(new Date(issuedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const paidAt = nextStatus === "paid" ? isoOrNull(req.body?.paidAt) || now : null;
        await db.query("UPDATE cabinet_invoices SET status = $1, issued_at = $2, due_at = $3, paid_at = $4, updated_at = $5 WHERE id = $6", [
          nextStatus,
          nextStatus === "draft" ? rows[0]?.issued_at : issuedAt,
          dueAt,
          paidAt,
          now,
          existing.id
        ]);
        await logCabinetActivity(cabinet, "invoice_status_changed", {
          entityType: "invoice",
          entityId: existing.id,
          entityLabel: `${existing.number} · ${existing.client_name}`,
          details: { from: existing.status, to: nextStatus }
        });
      }
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.delete("/api/cabinet/invoices/:id", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const existing = await ownedRow("cabinet_invoices", coerceString(req.params.id), cabinet, "Facture");
      if (existing.status !== "draft") throw badRequest("Seul un brouillon peut être supprimé ; une facture émise s'annule.");
      await db.query("DELETE FROM cabinet_invoices WHERE id = $1", [existing.id]);
      await logCabinetActivity(cabinet, "invoice_deleted", { entityType: "invoice", entityId: existing.id, entityLabel: `${existing.number} · ${existing.client_name}` });
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // Journal d'activité
  // ======================================================================
  app.get("/api/cabinet/activity", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const { rows } = await db.query(
        "SELECT * FROM cabinet_activity WHERE cabinet_user_id = $1 ORDER BY created_at DESC LIMIT 1000",
        [cabinet.cabinetRootId]
      );
      return res.json({
        items: rows.map((row) => ({
          id: row.id,
          actorId: row.actor_id || "",
          actorName: row.actor_name || "",
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityLabel: row.entity_label,
          details: parseJsonField(row.details_json, {}),
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // E-mails aux candidats et fil de la fiche
  // ======================================================================
  app.post("/api/cabinet/candidates/:id/email", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const candidate = await ownedRow("cabinet_candidates", coerceString(req.params.id), cabinet, "Candidat");
      if (candidate.anonymized_at) throw badRequest("Ce candidat a été anonymisé.");
      if (candidate.consent_status === "refused") throw badRequest("Ce candidat a refusé d'être contacté (RGPD).");
      if (!EMAIL_PATTERN.test(candidate.email || "")) throw badRequest("Ce candidat n'a pas d'adresse e-mail valide.");
      const subject = str(req.body?.subject, 200);
      const message = coerceString(req.body?.message).trim().slice(0, 8000);
      if (subject.length < 2) throw badRequest("Indiquez un objet.", "subject");
      if (!message) throw badRequest("Écrivez un message.", "message");

      const transporter = getMailTransporter();
      if (!transporter) throw Object.assign(new Error("Envoi d'e-mails indisponible : le serveur SMTP n'est pas configuré."), { statusCode: 503 });

      const { rows: profileRows } = await db.query("SELECT organization_name FROM user_recruiter_profiles WHERE user_id = $1", [cabinet.cabinetRootId]);
      const firmName = profileRows[0]?.organization_name || "Votre cabinet de recrutement";
      const senderName = `${cabinet.first_name || ""} ${cabinet.last_name || ""}`.trim();
      const paragraphs = message
        .split(/\n{2,}/)
        .map((part) => `<p style="margin:0 0 14px;line-height:1.6;color:#1f2634;">${escapeHtml(part).replace(/\n/g, "<br/>")}</p>`)
        .join("");
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
        <p style="margin:0 0 18px;color:#b83309;font-weight:700;">${escapeHtml(firmName)}</p>
        ${paragraphs}
        <p style="margin:22px 0 0;color:#1f2634;">${escapeHtml(senderName)}<br/><span style="color:#5b6478;">${escapeHtml(firmName)}</span></p>
        <p style="margin:26px 0 0;color:#8a90a0;font-size:11px;">Vous recevez cet e-mail car votre candidature est suivie par ${escapeHtml(firmName)}. Pour ne plus être contacté ou demander la suppression de vos données, répondez simplement à ce message.</p>
      </div>`;
      const text = `${message}\n\n${senderName}\n${firmName}\n\nPour ne plus être contacté ou demander la suppression de vos données, répondez à ce message.`;

      let status = "sent";
      try {
        await transporter.sendMail({
          from: MAIL_FROM || `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS || SMTP_USER}>`,
          to: AUTH_EMAIL_TO || candidate.email,
          replyTo: cabinet.email || undefined,
          subject,
          text,
          html
        });
      } catch (sendError) {
        status = "failed";
        console.warn(`Echec e-mail candidat cabinet (${candidate.id}) : ${sendError.message}`);
      }
      const id = `cmail-${crypto.randomUUID()}`;
      const now = nowIso();
      await db.query(
        `INSERT INTO cabinet_candidate_emails (id, cabinet_user_id, candidate_id, subject, message, status, sent_by, sent_by_name, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, cabinet.cabinetRootId, candidate.id, subject, message, status, cabinet.id, senderName, now]
      );
      if (status === "sent") {
        if (candidate.status === "sourced") {
          await db.query("UPDATE cabinet_candidates SET status = 'contacted', status_updated_at = $1, updated_at = $1 WHERE id = $2", [now, candidate.id]);
        } else {
          await db.query("UPDATE cabinet_candidates SET updated_at = $1 WHERE id = $2", [now, candidate.id]);
        }
      }
      await logCabinetActivity(cabinet, status === "sent" ? "candidate_emailed" : "candidate_email_failed", {
        entityType: "candidate",
        entityId: candidate.id,
        entityLabel: `${candidate.first_name} ${candidate.last_name}`.trim(),
        details: { subject }
      });
      if (status === "failed") throw Object.assign(new Error("L'e-mail n'a pas pu être envoyé. Réessayez plus tard."), { statusCode: 502 });
      return res.status(201).json({ ok: true, id });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.get("/api/cabinet/candidates/:id/timeline", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const candidate = await ownedRow("cabinet_candidates", coerceString(req.params.id), cabinet, "Candidat");
      const { rows: emails } = await db.query(
        "SELECT id, subject, message, status, sent_by_name, created_at FROM cabinet_candidate_emails WHERE candidate_id = $1 ORDER BY created_at DESC",
        [candidate.id]
      );
      const { rows: interviews } = await db.query(`${INTERVIEW_SELECT} WHERE i.candidate_id = $1 ORDER BY i.scheduled_at DESC`, [candidate.id]);
      const { rows: missions } = await db.query(
        `SELECT m.id, m.title, m.client_name, m.status, mc.stage, mc.score, mc.created_at
         FROM cabinet_mission_candidates mc JOIN cabinet_missions m ON m.id = mc.mission_id
         WHERE mc.candidate_id = $1 AND m.cabinet_user_id = $2 ORDER BY mc.created_at DESC`,
        [candidate.id, cabinet.cabinetRootId]
      );
      return res.json({
        emails: emails.map((row) => ({ id: row.id, subject: row.subject, message: row.message, status: row.status, sentByName: row.sent_by_name, createdAt: row.created_at })),
        interviews: interviews.map(interviewRow),
        missions: missions.map((row) => ({ id: row.id, title: row.title, clientName: row.client_name, status: row.status, stage: row.stage, score: row.score, assignedAt: row.created_at }))
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // RGPD
  // ======================================================================
  app.get("/api/cabinet/candidates/:id/export", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const candidate = await ownedRow("cabinet_candidates", coerceString(req.params.id), cabinet, "Candidat");
      const { rows: notes } = await db.query("SELECT author_name, body, created_at FROM cabinet_candidate_notes WHERE candidate_id = $1 ORDER BY created_at", [candidate.id]);
      const { rows: emails } = await db.query("SELECT subject, message, status, created_at FROM cabinet_candidate_emails WHERE candidate_id = $1 ORDER BY created_at", [candidate.id]);
      const { rows: interviews } = await db.query(
        "SELECT scheduled_at, duration_minutes, mode, location, status, notes, feedback FROM cabinet_interviews WHERE candidate_id = $1 ORDER BY scheduled_at",
        [candidate.id]
      );
      const { rows: missions } = await db.query(
        `SELECT m.title, m.client_name, mc.stage, mc.created_at FROM cabinet_mission_candidates mc JOIN cabinet_missions m ON m.id = mc.mission_id
         WHERE mc.candidate_id = $1 AND m.cabinet_user_id = $2`,
        [candidate.id, cabinet.cabinetRootId]
      );
      const { rows: profileRows } = await db.query("SELECT organization_name, contact_email FROM user_recruiter_profiles WHERE user_id = $1", [cabinet.cabinetRootId]);
      await logCabinetActivity(cabinet, "candidate_data_exported", { entityType: "candidate", entityId: candidate.id, entityLabel: `${candidate.first_name} ${candidate.last_name}`.trim() });
      return res.json({
        exportedAt: nowIso(),
        controller: { organizationName: profileRows[0]?.organization_name || "", contactEmail: profileRows[0]?.contact_email || "" },
        candidate: {
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          email: candidate.email,
          phone: candidate.phone,
          headline: candidate.headline,
          skills: parseJsonField(candidate.skills_json, []),
          notes: candidate.notes,
          status: candidate.status,
          cvFileName: candidate.cv_file_name,
          cvText: candidate.source_text,
          consent: { status: candidate.consent_status, at: candidate.consent_at, source: candidate.consent_source },
          createdAt: candidate.created_at,
          updatedAt: candidate.updated_at
        },
        notes: notes.map((row) => ({ author: row.author_name, body: row.body, createdAt: row.created_at })),
        emails: emails.map((row) => ({ subject: row.subject, message: row.message, status: row.status, sentAt: row.created_at })),
        interviews: interviews.map((row) => ({
          scheduledAt: row.scheduled_at,
          durationMinutes: row.duration_minutes,
          mode: row.mode,
          location: row.location,
          status: row.status,
          notes: row.notes,
          feedback: row.feedback
        })),
        missions: missions.map((row) => ({ title: row.title, client: row.client_name, stage: row.stage, assignedAt: row.created_at }))
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/cabinet/candidates/anonymize", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const ids = Array.isArray(req.body?.candidateIds) ? req.body.candidateIds.map((value) => coerceString(value)).filter(Boolean).slice(0, 2000) : [];
      if (!ids.length) throw badRequest("Aucun candidat sélectionné.");
      const count = await anonymizeCabinetCandidates(cabinet.cabinetRootId, ids);
      await logCabinetActivity(cabinet, "candidates_anonymized", { entityType: "candidate", entityLabel: `${count} candidat(s)`, details: { count } });
      return res.json({ ok: true, count });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.get("/api/cabinet/rgpd", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const { rows: profileRows } = await db.query("SELECT retention_months, auto_anonymize FROM user_recruiter_profiles WHERE user_id = $1", [cabinet.cabinetRootId]);
      const retentionMonths = Number(profileRows[0]?.retention_months || 24);
      const expiredIds = await getCabinetExpiredCandidateIds(cabinet.cabinetRootId, retentionMonths);
      const { rows: consentRows } = await db.query(
        "SELECT consent_status, COUNT(*)::int AS count FROM cabinet_candidates WHERE cabinet_user_id = $1 GROUP BY consent_status",
        [cabinet.cabinetRootId]
      );
      const { rows: expiredRows } = expiredIds.length
        ? await db.query("SELECT id, first_name, last_name, email, updated_at FROM cabinet_candidates WHERE id = ANY($1) ORDER BY updated_at", [expiredIds])
        : { rows: [] };
      return res.json({
        retentionMonths,
        autoAnonymize: Boolean(Number(profileRows[0]?.auto_anonymize)),
        consentCounts: Object.fromEntries(consentRows.map((row) => [row.consent_status, row.count])),
        expired: expiredRows.map((row) => ({ id: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email, lastActivityAt: row.updated_at }))
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.put("/api/cabinet/rgpd", async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      requireCabinetOwnerRole(cabinet);
      const months = Math.round(Number(req.body?.retentionMonths));
      if (!Number.isFinite(months) || months < 1 || months > 120) throw badRequest("Durée de conservation invalide (1 à 120 mois).", "retentionMonths");
      const auto = req.body?.autoAnonymize ? 1 : 0;
      await db.query(
        `INSERT INTO user_recruiter_profiles (user_id, retention_months, auto_anonymize, updated_at) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id) DO UPDATE SET retention_months = EXCLUDED.retention_months, auto_anonymize = EXCLUDED.auto_anonymize, updated_at = EXCLUDED.updated_at`,
        [cabinet.cabinetRootId, months, auto, nowIso()]
      );
      await logCabinetActivity(cabinet, "rgpd_settings_updated", { entityType: "settings", details: { retentionMonths: months, autoAnonymize: Boolean(auto) } });
      return res.json({ ok: true });
    } catch (error) {
      return fail(res, error);
    }
  });

  // ======================================================================
  // Matching candidat / mission
  // ======================================================================
  const norm = (value) => normalizeText(coerceString(value)).trim();
  const uniqueNorm = (list) => {
    const seen = new Map();
    for (const item of list) {
      const key = norm(item);
      if (key && !seen.has(key)) seen.set(key, coerceString(item).trim());
    }
    return seen;
  };
  const STOP_WORDS = new Set(["de", "des", "du", "la", "le", "les", "et", "en", "a", "au", "aux", "pour", "the", "and", "of", "h", "f", "hf", "fh", "senior", "junior", "confirme", "confirmee"]);
  const words = (value) => norm(value).split(/[^a-z0-9+#]+/).filter((word) => word.length > 1 && !STOP_WORDS.has(word));

  function missionRequirements(mission) {
    const declared = parseJsonField(mission.skills_json, []);
    const fromText = declared.length ? [] : detectSkillsFromText(`${mission.title} ${mission.description || ""}`);
    return { skills: uniqueNorm([...declared, ...fromText]), declared: declared.length > 0 };
  }

  function candidateProfile(candidate) {
    const parsed = parseJsonField(candidate.parsed_json, {});
    const skills = uniqueNorm([
      ...parseJsonField(candidate.skills_json, []),
      ...(Array.isArray(parsed.skills) ? parsed.skills : []),
      ...(candidate.source_text ? detectSkillsFromText(candidate.source_text) : []),
      ...detectSkillsFromText(candidate.headline || "")
    ]);
    const years = Number(parsed.experienceYears ?? parsed.yearsOfExperience);
    return { skills, years: Number.isFinite(years) && years >= 0 ? years : null, parsed };
  }

  // Score de correspondance calculé sur des données réelles et entièrement
  // expliqué : compétences requises couvertes (70 pts), expérience connue
  // (20 pts, si la mission fixe un minimum) et proximité du poste visé (10 pts).
  function scoreCandidate(mission, requirements, candidate) {
    const profile = candidateProfile(candidate);
    const required = [...requirements.skills.keys()];
    const matched = required.filter((key) => profile.skills.has(key) || [...profile.skills.keys()].some((have) => have.length > 3 && (have.includes(key) || key.includes(have))));
    const missing = required.filter((key) => !matched.includes(key));
    const skillPoints = required.length ? Math.round((matched.length / required.length) * 70) : 0;

    let experiencePoints = 20;
    let experienceNote = "none";
    const minimum = Number(mission.experience_min);
    if (Number.isFinite(minimum) && minimum > 0) {
      if (profile.years === null) {
        experiencePoints = 0;
        experienceNote = "unknown";
      } else {
        experiencePoints = Math.round(Math.min(1, profile.years / minimum) * 20);
        experienceNote = profile.years >= minimum ? "ok" : "below";
      }
    }

    const titleWords = new Set(words(mission.title));
    const headlineWords = words(`${candidate.headline || ""} ${profile.parsed?.headline || ""}`);
    const titleOverlap = headlineWords.filter((word) => titleWords.has(word)).length;
    const titlePoints = titleWords.size ? Math.round(Math.min(1, titleOverlap / Math.min(titleWords.size, 2)) * 10) : 0;

    return {
      score: Math.min(100, skillPoints + experiencePoints + titlePoints),
      breakdown: { skills: skillPoints, experience: experiencePoints, title: titlePoints },
      matchedSkills: matched.map((key) => requirements.skills.get(key)),
      missingSkills: missing.map((key) => requirements.skills.get(key)),
      experienceYears: profile.years,
      experienceNote,
      hasCv: Boolean(candidate.source_text)
    };
  }

  app.get("/api/cabinet/missions/:id/matches", async (req, res) => {
    try {
      const cabinet = await context(req, res);
      if (!cabinet) return;
      const mission = await ownedRow("cabinet_missions", coerceString(req.params.id), cabinet, "Mission");
      const requirements = missionRequirements(mission);
      const { rows: candidates } = await db.query(
        "SELECT * FROM cabinet_candidates WHERE cabinet_user_id = $1 AND anonymized_at IS NULL AND status <> 'rejected'",
        [cabinet.cabinetRootId]
      );
      const { rows: links } = await db.query("SELECT candidate_id, stage FROM cabinet_mission_candidates WHERE mission_id = $1", [mission.id]);
      const stageById = new Map(links.map((row) => [row.candidate_id, row.stage]));
      const items = requirements.skills.size
        ? candidates
            .map((candidate) => ({
              candidateId: candidate.id,
              firstName: candidate.first_name,
              lastName: candidate.last_name,
              email: candidate.email,
              headline: candidate.headline,
              status: candidate.status,
              consentStatus: candidate.consent_status,
              assignedStage: stageById.get(candidate.id) || null,
              ...scoreCandidate(mission, requirements, candidate)
            }))
            .sort((a, b) => b.score - a.score)
        : [];
      return res.json({
        requiredSkills: [...requirements.skills.values()],
        skillsDeclared: requirements.declared,
        experienceMin: mission.experience_min ?? null,
        items
      });
    } catch (error) {
      return fail(res, error);
    }
  });

  app.post("/api/cabinet/missions/:id/matches/:candidateId/ai", aiActionRateLimiter, async (req, res) => {
    try {
      const cabinet = await context(req, res, "body");
      if (!cabinet) return;
      const mission = await ownedRow("cabinet_missions", coerceString(req.params.id), cabinet, "Mission");
      const candidate = await ownedRow("cabinet_candidates", coerceString(req.params.candidateId), cabinet, "Candidat");
      if (candidate.anonymized_at) throw badRequest("Ce candidat a été anonymisé.");
      const profile = candidateProfile(candidate);
      const analysis = await analyzeMatchWithAi(
        {
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          headline: candidate.headline,
          skills: [...profile.skills.values()],
          experienceYears: profile.years,
          summary: profile.parsed?.summary || profile.parsed?.professionalSummary || "",
          experiences: profile.parsed?.experiences || [],
          education: profile.parsed?.education || [],
          cvText: coerceString(candidate.source_text).slice(0, 6000)
        },
        {
          title: mission.title,
          company: mission.client_name,
          location: mission.location,
          contractType: mission.contract_type,
          remotePolicy: mission.remote_policy,
          experienceMin: mission.experience_min,
          skills: parseJsonField(mission.skills_json, []),
          description: mission.description
        }
      );
      if (!analysis) throw Object.assign(new Error("L'analyse IA est indisponible : aucun fournisseur IA n'est configuré sur le serveur."), { statusCode: 503 });
      const { rows: linkRows } = await db.query("SELECT 1 FROM cabinet_mission_candidates WHERE mission_id = $1 AND candidate_id = $2", [mission.id, candidate.id]);
      if (linkRows.length) {
        await db.query("UPDATE cabinet_mission_candidates SET score = $1, match_json = $2 WHERE mission_id = $3 AND candidate_id = $4", [
          analysis.score,
          JSON.stringify({ ...analysis, analyzedAt: nowIso() }),
          mission.id,
          candidate.id
        ]);
      }
      await logCabinetActivity(cabinet, "candidate_ai_analyzed", {
        entityType: "candidate",
        entityId: candidate.id,
        entityLabel: `${candidate.first_name} ${candidate.last_name}`.trim(),
        details: { missionId: mission.id, missionTitle: mission.title, score: analysis.score }
      });
      return res.json({ ok: true, analysis });
    } catch (error) {
      return fail(res, error);
    }
  });

  // Score de correspondance calculé au moment de l'affectation (utilisé par
  // les rapports et la fiche mission).
  app.locals.ctx.computeCabinetMatchScore = async (missionId, candidateId) => {
    const { rows: missionRows } = await db.query("SELECT * FROM cabinet_missions WHERE id = $1", [missionId]);
    const { rows: candidateRows } = await db.query("SELECT * FROM cabinet_candidates WHERE id = $1", [candidateId]);
    if (!missionRows.length || !candidateRows.length) return null;
    const requirements = missionRequirements(missionRows[0]);
    if (!requirements.skills.size) return null;
    return scoreCandidate(missionRows[0], requirements, candidateRows[0]).score;
  };
}
