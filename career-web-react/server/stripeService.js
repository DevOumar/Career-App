// Logique métier autour de Stripe (création de session Checkout, traitement des
// événements webhook), extraite de index.js pour rester testable en isolation.
// index.js reste responsable de la partie "réseau" (routes Express, vraie
// instance Stripe, vraie connexion PGlite) ; ce module ne fait que construire
// des payloads ou appliquer une mise à jour via un objet `db` injecté, ce qui
// permet de le tester avec un faux `db` en mémoire (cf. __tests__/stripeService.test.js),
// sans jamais appeler l'API Stripe ni PGlite pour de vrai.

const SUBSCRIPTION_RENEWAL_DAYS = 30;

// Type de compte "school" = facturation BtoB annuelle (990 €/an, cf. scénarios
// de rentabilité du mémoire). Tous les autres types (candidate, student,
// recruiter_firm, recruiter_internal, company, coach, other) restent sur le
// tarif BtoC mensuel (4,99 €/mois) — seule la distinction école/non-école est
// gérée pour l'instant, les 3 formules particulier évoquées restent une
// évolution future non implémentée ici.
const SCHOOL_ROLE_TYPE = "school";

/**
 * Sélectionne le bon price_id Stripe selon le type de compte. Isolé en fonction
 * pure pour éviter de dupliquer cette règle (et le bug qu'elle appelle : oublier
 * un des deux .env) à chaque endroit qui crée une session Checkout.
 */
export function resolvePriceIdForUser(roleType, { individual, school }) {
  const priceId = roleType === SCHOOL_ROLE_TYPE ? school : individual;
  if (!priceId) {
    throw new Error(
      roleType === SCHOOL_ROLE_TYPE
        ? "STRIPE_PRICE_ID_SCHOOL manquant dans .env pour un compte de type 'school'."
        : "STRIPE_PRICE_ID_INDIVIDUAL manquant dans .env."
    );
  }
  return priceId;
}

/**
 * Construit les paramètres de création d'une session Stripe Checkout.
 * Isolé pour tester un point qui a déjà causé un bug une fois : Stripe refuse
 * `customer` ET `customer_email` en même temps (erreur API), donc un seul des
 * deux doit être présent selon qu'un stripeCustomerId existe déjà.
 */
export function buildCheckoutSessionParams({ userId, userEmail, subscription, priceId }) {
  if (!userId) throw new Error("userId requis pour construire la session Checkout.");
  if (!priceId) throw new Error("priceId requis pour construire la session Checkout.");

  const params = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId
  };

  if (subscription?.stripeCustomerId) {
    params.customer = subscription.stripeCustomerId;
  } else if (userEmail) {
    params.customer_email = userEmail;
  }

  return params;
}

/** Lit l'identifiant utilisateur depuis une session Checkout Stripe. */
export function extractUserIdFromCheckoutSession(session) {
  return session?.client_reference_id || session?.metadata?.userId || "";
}

/** Statut à appliquer côté app selon le statut d'abonnement renvoyé par Stripe. */
export function resolveSubscriptionStatus(stripeSubscriptionObject) {
  return stripeSubscriptionObject?.status === "active" ? "active" : "canceled";
}

/**
 * Construit le subscription_json à écrire en base après un paiement réussi.
 * `renewalAt` doit être fourni par l'appelant (date de fin de période Stripe
 * réelle) plutôt que recalculé ici : avec l'introduction du plan école annuel
 * en plus du plan particulier mensuel, un "+30 jours" fixe serait faux pour
 * un abonnement annuel. Un fallback +30 jours reste disponible si l'appelant
 * n'a pas pu récupérer la date réelle (ex: échec de l'appel Stripe), pour ne
 * jamais laisser renewalAt vide.
 */
export function buildActivatedSubscriptionPayload(session, { now = () => new Date(), renewalAt } = {}) {
  const startedAt = now().toISOString();
  const resolvedRenewalAt =
    renewalAt || new Date(now().getTime() + SUBSCRIPTION_RENEWAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan: "premium",
    status: "active",
    startedAt,
    renewalAt: resolvedRenewalAt,
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: session.subscription || null
  };
}

/**
 * Applique un événement webhook Stripe déjà vérifié (signature validée en amont
 * par l'appelant, cf. stripe.webhooks.constructEvent dans index.js) sur la base.
 *
 * `db` doit exposer une méthode `query(sql, params) -> Promise<{ rows }>`,
 * compatible avec l'API PGlite/pg utilisée par index.js — un faux `db` en
 * mémoire suffit donc pour les tests.
 *
 * `resolveRenewalAt(session) -> Promise<string|null>` est optionnel : permet à
 * l'appelant d'aller chercher la vraie date de fin de période auprès de l'API
 * Stripe (mensuel vs annuel). Si absent ou si elle retourne null/rejette, on
 * retombe sur le fallback +30 jours de buildActivatedSubscriptionPayload.
 *
 * Retourne un résumé de ce qui a été fait plutôt que undefined, pour permettre
 * des assertions précises en test (pas seulement "ça n'a pas throw").
 */
export async function applyStripeWebhookEvent(event, { db, parseJsonField, now = () => new Date(), resolveRenewalAt }) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = extractUserIdFromCheckoutSession(session);
      if (!userId) {
        return { handled: false, reason: "missing_user_id" };
      }

      let renewalAt = null;
      if (resolveRenewalAt) {
        try {
          renewalAt = await resolveRenewalAt(session);
        } catch (error) {
          console.error("resolveRenewalAt a échoué, repli sur +30 jours par défaut:", error.message);
        }
      }

      const payload = buildActivatedSubscriptionPayload(session, { now, renewalAt });
      await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [
        JSON.stringify(payload),
        now().toISOString(),
        userId
      ]);
      return { handled: true, userId, payload };
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const status = resolveSubscriptionStatus(subscription);
      const rows = await db.query("SELECT id, subscription_json FROM users WHERE subscription_json LIKE $1", [
        `%${subscription.id}%`
      ]);

      const updatedIds = [];
      for (const row of rows.rows) {
        const current = parseJsonField(row.subscription_json, {});
        await db.query("UPDATE users SET subscription_json = $1, updated_at = $2 WHERE id = $3", [
          JSON.stringify({ ...current, status }),
          now().toISOString(),
          row.id
        ]);
        updatedIds.push(row.id);
      }
      return { handled: true, status, updatedIds };
    }

    default:
      // Répondre 200 pour ces événements est géré côté route (index.js) ; ici on
      // se contente de signaler qu'on ne fait rien pour ce type d'événement.
      return { handled: false, reason: "unhandled_event_type" };
  }
}
