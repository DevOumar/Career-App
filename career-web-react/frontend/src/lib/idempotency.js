// Clés d'idempotence (en-tête Idempotency-Key, voir backend/index.js).
//
// Une action d'écriture sensible (enregistrer, importer, payer, envoyer) porte
// une clé : si la même requête arrive deux fois au serveur (double clic,
// nouvelle tentative après une coupure réseau), elle n'est exécutée qu'une
// fois et la seconde reçoit la même réponse.
//
// Clé = identifiant de l'action en cours + empreinte du contenu envoyé :
//  - même contenu renvoyé tant que l'action n'a pas abouti -> même clé ;
//  - contenu corrigé après une erreur -> nouvelle clé (nouvelle requête) ;
//  - après un succès, l'action est close : un nouvel envoi volontaire, même
//    identique, repart avec une nouvelle clé.

export function newIdempotencyKey(prefix = "action") {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${random}`;
}

// Empreinte 53 bits (cyrb53) : suffisante pour distinguer deux contenus d'une
// même action — le serveur vérifie de toute façon le corps complet.
function hashText(text, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const openActions = new Map();

export function actionIdempotencyKey(scope, payload) {
  if (!openActions.has(scope)) openActions.set(scope, newIdempotencyKey(scope));
  const { stepUp: _stepUp, ...content } = payload && typeof payload === "object" ? payload : { value: payload };
  return `${openActions.get(scope)}-${hashText(JSON.stringify(content))}`;
}

export function completeIdempotentAction(scope) {
  openActions.delete(scope);
}
