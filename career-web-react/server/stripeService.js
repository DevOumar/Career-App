// Logique métier Stripe (session Checkout, application des événements webhook),
// isolée de index.js pour rester lisible et testable sans appel réseau réel.
// index.js reste responsable de la partie "réseau" (routes Express, vraie
// instance Stripe, vraie connexion base de données).

/**
 * Construit le nom de la variable d'env attendue pour le price_id Stripe d'un
 * plan donné. Les plans à prix unique (monthlyPrice == null, ex: Pack Élan,
 * Trajectoire Pro, Licence Campus) n'ont qu'un seul price_id ; les plans
 * récurrents (Cabinet Essentiel/Croissance) ont un price_id par cycle de
 * facturation (mensuel / annuel).
 */
export function resolveStripePriceEnvVar(plan, billingCycle) {
  const base = `STRIPE_PRICE_ID_${plan.id.toUpperCase()}`;
  if (plan.monthlyPrice == null) return base;
  return billingCycle === "annual" ? `${base}_ANNUAL` : `${base}_MONTHLY`;
}

/** "payment" pour un achat unique, "subscription" pour un abonnement récurrent. */
export function resolveStripeMode(plan) {
  return plan.monthlyPrice == null ? "payment" : "subscription";
}

/**
 * Construit les paramètres de création d'une session Stripe Checkout.
 * Stripe refuse `customer` ET `customer_email` en même temps, donc un seul
 * des deux doit être présent selon qu'un stripeCustomerId existe déjà.
 */
export function buildCheckoutSessionParams({ userId, userEmail, subscription, priceId, mode, planId, billingCycle, successUrl, cancelUrl, quantity = 1 }) {
  if (!userId) throw new Error("userId requis pour construire la session Checkout.");
  if (!priceId) throw new Error("priceId requis pour construire la session Checkout.");

  const params = {
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: Math.max(1, Math.round(Number(quantity) || 1)) }],
    client_reference_id: userId,
    metadata: { userId, planId, billingCycle: billingCycle || "", quantity: String(Math.max(1, Math.round(Number(quantity) || 1))) },
    success_url: successUrl,
    cancel_url: cancelUrl
  };

  if (subscription?.stripeCustomerId) {
    params.customer = subscription.stripeCustomerId;
  } else if (userEmail) {
    params.customer_email = userEmail;
  }

  return params;
}

/** Lit l'identifiant utilisateur et le plan visé depuis une session Checkout Stripe. */
export function extractPlanActivationFromSession(session) {
  const rawQuantity = Number(session?.metadata?.quantity);
  return {
    userId: session?.client_reference_id || session?.metadata?.userId || "",
    planId: session?.metadata?.planId || "",
    billingCycle: session?.metadata?.billingCycle || "",
    quantity: Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.round(rawQuantity) : null
  };
}

export function resolveSubscriptionStatus(stripeSubscriptionObject) {
  return stripeSubscriptionObject?.status === "active" ? "active" : "canceled";
}

/**
 * Applique un événement webhook Stripe déjà vérifié (signature validée en amont
 * par l'appelant, cf. stripe.webhooks.constructEvent dans index.js).
 *
 * `applyPlanToUser(userId, plan, billingCycle, licenseCode, stripeIds)` et
 * `getPlanById(planId)` sont injectés pour réutiliser exactement la même
 * logique d'activation que le parcours manuel (/api/plans/activate), plutôt
 * que de dupliquer la construction du subscription_json ici.
 */
export async function applyStripeWebhookEvent(
  event,
  { db, parseJsonField, getPlanById, applyPlanToUser, generateLicenseCodeForPlan, now = () => new Date() }
) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { userId, planId, billingCycle, quantity } = extractPlanActivationFromSession(session);
      if (!userId || !planId) {
        return { handled: false, reason: "missing_user_or_plan" };
      }

      // getPlanById peut être sync (plan statique) ou async (fusionné avec
      // une éventuelle surcharge de tarif admin) selon ce qui est injecté —
      // await fonctionne dans les deux cas (await sur une valeur non-Promise
      // la résout simplement telle quelle).
      const plan = await getPlanById(planId);
      if (!plan) {
        return { handled: false, reason: "unknown_plan" };
      }

      await applyPlanToUser(
        userId,
        plan,
        billingCycle,
        null,
        {
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
          // Présent uniquement pour les sessions mode "payment" (achat
          // unique) — permet un remboursement admin ultérieur. Les
          // abonnements (mode "subscription") n'ont pas de payment_intent
          // direct ici ; le remboursement n'est pas proposé pour ceux-là.
          stripePaymentIntentId: session.payment_intent || null
        },
        "stripe"
      );

      let licenseCode = null;
      if (plan.seats && generateLicenseCodeForPlan) {
        // Pour school_license (tarifé par étudiant), le nombre de sièges achetés
        // (quantity Stripe) prime sur le minimum par défaut du plan.
        const seatsOverride = plan.id === "school_license" && quantity ? quantity : null;
        licenseCode = await generateLicenseCodeForPlan(userId, plan, seatsOverride);
      }

      return { handled: true, userId, planId, licenseCode };
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
      return { handled: false, reason: "unhandled_event_type" };
  }
}
