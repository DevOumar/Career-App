// Côté navigateur des clés de sécurité (WebAuthn / FIDO2).
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

/**
 * Les clés exigent un contexte sécurisé (HTTPS ou localhost) ET un nom de
 * domaine : les navigateurs refusent WebAuthn sur une adresse IP brute
 * (ex. 127.0.0.1) — en local, ouvrir l'application via « localhost ».
 */
export function supportsSecurityKeys() {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
  const host = window.location.hostname;
  return !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes(":");
}

// Annulation par l'utilisateur (fenêtre du navigateur fermée, délai dépassé).
const isCancelled = (error) => error?.name === "NotAllowedError" || error?.name === "AbortError";

export async function createSecurityKeyCredential(optionsJSON) {
  try {
    return { ok: true, response: await startRegistration({ optionsJSON }) };
  } catch (error) {
    return { ok: false, reason: isCancelled(error) ? "cancelled" : error?.name === "InvalidStateError" ? "duplicate" : "failed" };
  }
}

export async function getSecurityKeyAssertion(optionsJSON) {
  try {
    return { ok: true, response: await startAuthentication({ optionsJSON }) };
  } catch (error) {
    return { ok: false, reason: isCancelled(error) ? "cancelled" : "failed" };
  }
}
