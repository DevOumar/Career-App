import { describe, it, expect } from "vitest";
import {
  applyStripeWebhookEvent,
  buildActivatedSubscriptionPayload,
  buildCheckoutSessionParams,
  extractUserIdFromCheckoutSession,
  resolvePriceIdForUser,
  resolveSubscriptionStatus
} from "../stripeService";

// Faux "db" en mémoire, compatible avec l'interface { query(sql, params) } utilisée
// par index.js (PGlite). Suffisant pour tester applyStripeWebhookEvent sans PGlite
// ni serveur Express réel.
function createFakeDb(initialUsers = []) {
  const users = new Map(initialUsers.map((u) => [u.id, { ...u }]));

  return {
    users, // exposé pour inspection directe dans les assertions
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      if (normalized.startsWith("UPDATE users SET subscription_json")) {
        const [subscriptionJson, updatedAt, userId] = params;
        const user = users.get(userId);
        if (user) {
          user.subscription_json = subscriptionJson;
          user.updated_at = updatedAt;
        }
        return { rows: [] };
      }

      if (normalized.startsWith("SELECT id, subscription_json FROM users WHERE subscription_json LIKE")) {
        const [likePattern] = params;
        const needle = likePattern.replace(/%/g, "");
        const rows = Array.from(users.values())
          .filter((u) => (u.subscription_json || "").includes(needle))
          .map((u) => ({ id: u.id, subscription_json: u.subscription_json }));
        return { rows };
      }

      throw new Error(`Requête non supportée par le faux db de test: ${sql}`);
    }
  };
}

function parseJsonField(input, fallback) {
  try {
    return JSON.parse(input);
  } catch (_error) {
    return fallback;
  }
}

describe("resolvePriceIdForUser", () => {
  const prices = { individual: "price_individual", school: "price_school" };

  it("choisit le prix école (BtoB annuel) pour un compte de type 'school'", () => {
    expect(resolvePriceIdForUser("school", prices)).toBe("price_school");
  });

  it("choisit le prix particulier (BtoC mensuel) pour tout autre type de compte", () => {
    expect(resolvePriceIdForUser("candidate", prices)).toBe("price_individual");
    expect(resolvePriceIdForUser("student", prices)).toBe("price_individual");
    expect(resolvePriceIdForUser("recruiter_firm", prices)).toBe("price_individual");
    expect(resolvePriceIdForUser("company", prices)).toBe("price_individual");
    expect(resolvePriceIdForUser("coach", prices)).toBe("price_individual");
    expect(resolvePriceIdForUser("other", prices)).toBe("price_individual");
  });

  it("lève une erreur explicite si STRIPE_PRICE_ID_SCHOOL est manquant pour un compte école", () => {
    expect(() => resolvePriceIdForUser("school", { individual: "price_individual", school: "" })).toThrow(
      /STRIPE_PRICE_ID_SCHOOL/
    );
  });

  it("lève une erreur explicite si STRIPE_PRICE_ID_INDIVIDUAL est manquant pour un compte particulier", () => {
    expect(() => resolvePriceIdForUser("candidate", { individual: "", school: "price_school" })).toThrow(
      /STRIPE_PRICE_ID_INDIVIDUAL/
    );
  });
});

describe("buildCheckoutSessionParams", () => {
  it("construit une session en mode subscription avec client_reference_id = userId", () => {
    const params = buildCheckoutSessionParams({
      userId: "user-1",
      userEmail: "jean@example.com",
      subscription: {},
      priceId: "price_123"
    });

    expect(params.mode).toBe("subscription");
    expect(params.client_reference_id).toBe("user-1");
    expect(params.line_items).toEqual([{ price: "price_123", quantity: 1 }]);
  });

  it("utilise customer_email quand aucun stripeCustomerId n'existe encore", () => {
    const params = buildCheckoutSessionParams({
      userId: "user-1",
      userEmail: "jean@example.com",
      subscription: {},
      priceId: "price_123"
    });

    expect(params.customer_email).toBe("jean@example.com");
    expect(params.customer).toBeUndefined();
  });

  it("réutilise le stripeCustomerId existant plutôt que customer_email (Stripe refuse les deux)", () => {
    const params = buildCheckoutSessionParams({
      userId: "user-1",
      userEmail: "jean@example.com",
      subscription: { stripeCustomerId: "cus_existing" },
      priceId: "price_123"
    });

    expect(params.customer).toBe("cus_existing");
    expect(params.customer_email).toBeUndefined();
  });

  it("lève une erreur explicite si priceId est absent (config .env manquante)", () => {
    expect(() =>
      buildCheckoutSessionParams({ userId: "user-1", userEmail: "jean@example.com", subscription: {}, priceId: "" })
    ).toThrow(/priceId/);
  });

  it("lève une erreur explicite si userId est absent", () => {
    expect(() =>
      buildCheckoutSessionParams({ userId: "", userEmail: "jean@example.com", subscription: {}, priceId: "price_123" })
    ).toThrow(/userId/);
  });
});

describe("extractUserIdFromCheckoutSession", () => {
  it("lit client_reference_id en priorité", () => {
    const userId = extractUserIdFromCheckoutSession({ client_reference_id: "user-1", metadata: { userId: "user-2" } });
    expect(userId).toBe("user-1");
  });

  it("retombe sur metadata.userId si client_reference_id est absent", () => {
    const userId = extractUserIdFromCheckoutSession({ metadata: { userId: "user-2" } });
    expect(userId).toBe("user-2");
  });

  it("retourne une chaîne vide si aucun des deux n'est présent", () => {
    expect(extractUserIdFromCheckoutSession({})).toBe("");
  });
});

describe("resolveSubscriptionStatus", () => {
  it("retourne 'active' si Stripe indique un abonnement actif", () => {
    expect(resolveSubscriptionStatus({ status: "active" })).toBe("active");
  });

  it("retourne 'canceled' pour tout autre statut Stripe (canceled, past_due, unpaid...)", () => {
    expect(resolveSubscriptionStatus({ status: "canceled" })).toBe("canceled");
    expect(resolveSubscriptionStatus({ status: "past_due" })).toBe("canceled");
    expect(resolveSubscriptionStatus({ status: "unpaid" })).toBe("canceled");
  });
});

describe("buildActivatedSubscriptionPayload", () => {
  it("utilise le renewalAt fourni (ex: date réelle de fin de période Stripe pour un plan annuel école)", () => {
    const fixedNow = new Date("2026-01-01T00:00:00.000Z");
    const payload = buildActivatedSubscriptionPayload(
      { customer: "cus_1", subscription: "sub_1" },
      { now: () => fixedNow, renewalAt: "2027-01-01T00:00:00.000Z" }
    );

    expect(payload.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.renewalAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("retombe sur +30 jours si aucun renewalAt n'est fourni (fallback, ex: appel Stripe échoué)", () => {
    const fixedNow = new Date("2026-01-01T00:00:00.000Z");
    const payload = buildActivatedSubscriptionPayload(
      { customer: "cus_1", subscription: "sub_1" },
      { now: () => fixedNow }
    );

    expect(payload.renewalAt).toBe("2026-01-31T00:00:00.000Z");
  });

  it("met stripeCustomerId/stripeSubscriptionId à null si absents de la session", () => {
    const payload = buildActivatedSubscriptionPayload(
      {},
      { now: () => new Date("2026-01-01T00:00:00.000Z"), renewalAt: "2026-01-31T00:00:00.000Z" }
    );
    expect(payload.stripeCustomerId).toBeNull();
    expect(payload.stripeSubscriptionId).toBeNull();
  });
});

describe("applyStripeWebhookEvent — checkout.session.completed", () => {
  it("active le premium de l'utilisateur ciblé par client_reference_id", async () => {
    const db = createFakeDb([{ id: "user-1", subscription_json: JSON.stringify({ plan: "free" }) }]);
    const fixedNow = new Date("2026-01-01T00:00:00.000Z");

    const result = await applyStripeWebhookEvent(
      {
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1" } }
      },
      { db, parseJsonField, now: () => fixedNow }
    );

    expect(result.handled).toBe(true);
    expect(result.userId).toBe("user-1");

    const stored = parseJsonField(db.users.get("user-1").subscription_json, {});
    expect(stored.plan).toBe("premium");
    expect(stored.status).toBe("active");
    expect(stored.stripeCustomerId).toBe("cus_1");
  });

  it("utilise resolveRenewalAt pour fixer la vraie échéance (ex: +1 an pour un abonnement école)", async () => {
    const db = createFakeDb([{ id: "user-1", subscription_json: JSON.stringify({ plan: "free" }) }]);

    const result = await applyStripeWebhookEvent(
      {
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "user-1", customer: "cus_1", subscription: "sub_school_1" } }
      },
      {
        db,
        parseJsonField,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
        resolveRenewalAt: async () => "2027-01-01T00:00:00.000Z"
      }
    );

    expect(result.payload.renewalAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("retombe sur le fallback +30 jours si resolveRenewalAt échoue", async () => {
    const db = createFakeDb([{ id: "user-1", subscription_json: JSON.stringify({ plan: "free" }) }]);

    const result = await applyStripeWebhookEvent(
      {
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "user-1", customer: "cus_1", subscription: "sub_1" } }
      },
      {
        db,
        parseJsonField,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
        resolveRenewalAt: async () => {
          throw new Error("Stripe API indisponible");
        }
      }
    );

    expect(result.payload.renewalAt).toBe("2026-01-31T00:00:00.000Z");
  });

  it("n'active rien et signale la raison si client_reference_id/metadata.userId sont absents", async () => {
    const db = createFakeDb([{ id: "user-1", subscription_json: JSON.stringify({ plan: "free" }) }]);

    const result = await applyStripeWebhookEvent(
      { type: "checkout.session.completed", data: { object: { customer: "cus_1" } } },
      { db, parseJsonField }
    );

    expect(result.handled).toBe(false);
    expect(result.reason).toBe("missing_user_id");
    // La ligne utilisateur ne doit pas avoir été modifiée.
    expect(parseJsonField(db.users.get("user-1").subscription_json, {}).plan).toBe("free");
  });
});

describe("applyStripeWebhookEvent — customer.subscription.updated / .deleted", () => {
  it("repasse le statut à 'canceled' pour l'utilisateur dont le stripeSubscriptionId correspond", async () => {
    const db = createFakeDb([
      {
        id: "user-1",
        subscription_json: JSON.stringify({ plan: "premium", status: "active", stripeSubscriptionId: "sub_1" })
      },
      {
        id: "user-2",
        subscription_json: JSON.stringify({ plan: "premium", status: "active", stripeSubscriptionId: "sub_2" })
      }
    ]);

    const result = await applyStripeWebhookEvent(
      { type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } },
      { db, parseJsonField }
    );

    expect(result.handled).toBe(true);
    expect(result.updatedIds).toEqual(["user-1"]);
    expect(parseJsonField(db.users.get("user-1").subscription_json, {}).status).toBe("canceled");
    // L'autre utilisateur (abonnement différent) ne doit pas être affecté.
    expect(parseJsonField(db.users.get("user-2").subscription_json, {}).status).toBe("active");
  });

  it("réactive le statut à 'active' sur customer.subscription.updated si Stripe renvoie active", async () => {
    const db = createFakeDb([
      {
        id: "user-1",
        subscription_json: JSON.stringify({ plan: "premium", status: "canceled", stripeSubscriptionId: "sub_1" })
      }
    ]);

    await applyStripeWebhookEvent(
      { type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active" } } },
      { db, parseJsonField }
    );

    expect(parseJsonField(db.users.get("user-1").subscription_json, {}).status).toBe("active");
  });

  it("préserve les autres champs du subscription_json existant (ne fait pas qu'écraser)", async () => {
    const db = createFakeDb([
      {
        id: "user-1",
        subscription_json: JSON.stringify({
          plan: "premium",
          status: "active",
          startedAt: "2026-01-01T00:00:00.000Z",
          stripeSubscriptionId: "sub_1"
        })
      }
    ]);

    await applyStripeWebhookEvent(
      { type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } },
      { db, parseJsonField }
    );

    const stored = parseJsonField(db.users.get("user-1").subscription_json, {});
    expect(stored.startedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(stored.plan).toBe("premium");
  });
});

describe("applyStripeWebhookEvent — événements non gérés", () => {
  it("ne fait rien et le signale, sans lever d'erreur (la route répond quand même 200)", async () => {
    const db = createFakeDb([]);
    const result = await applyStripeWebhookEvent(
      { type: "invoice.payment_failed", data: { object: {} } },
      { db, parseJsonField }
    );

    expect(result.handled).toBe(false);
    expect(result.reason).toBe("unhandled_event_type");
  });
});
