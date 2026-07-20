// Entretien "live" : reconnaissance vocale + synthèse vocale du navigateur
// (Web Speech API), sans dépendance payante côté audio. Seule la génération
// de la réplique de l'IA passe par le backend (Claude), avec gating premium
// (cf. index.js /api/interviews/live-turn).
//
// Limite honnête à documenter : la reconnaissance vocale (SpeechRecognition)
// fonctionne de façon fiable sur Chrome/Edge ; le support est partiel ou absent
// sur Firefox et Safari selon les versions. isSpeechRecognitionSupported()
// permet d'afficher un message clair plutôt qu'un échec silencieux.

export function isSpeechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported() {
  return Boolean(window.speechSynthesis);
}

/**
 * Démarre une reconnaissance vocale ponctuelle (une réponse = un enregistrement).
 * Retourne une promesse résolue avec le texte transcrit.
 */
export function listenOnce({ onStart, onEnd, lang = "fr-FR" } = {}) {
  return new Promise((resolve, reject) => {
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      reject(new Error("La reconnaissance vocale n'est pas prise en charge par ce navigateur (utilise Chrome ou Edge)."));
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => onStart?.();
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      resolve(transcript);
    };
    recognition.onerror = (event) => {
      reject(new Error(`Erreur de reconnaissance vocale : ${event.error}`));
    };
    recognition.onend = () => onEnd?.();

    recognition.start();
  });
}

/**
 * Fait "parler" l'avatar via la synthèse vocale du navigateur. Les callbacks
 * onStart/onEnd pilotent l'état visuel de l'avatar (bouche/ondes animées).
 */
export function speak(text, { onStart, onEnd, lang = "fr-FR" } = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !text) {
      onEnd?.();
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // évite le chevauchement si un discours précédent traînait

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;

    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find((v) => v.lang?.startsWith("fr"));
    if (frenchVoice) utterance.voice = frenchVoice;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      onEnd?.();
      resolve();
    };
    utterance.onerror = () => {
      onEnd?.();
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

/**
 * Ouvre le micro pour une visualisation audio-réactive (avatar "à l'écoute"),
 * indépendamment de SpeechRecognition qui gère son propre accès micro en
 * interne. Retourne une fonction de lecture du niveau sonore (0-1) et une
 * fonction de nettoyage à appeler en fin d'écoute.
 */
export async function createMicLevelMeter() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  function getLevel() {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
    return Math.min(1, avg / 128);
  }

  function cleanup() {
    stream.getTracks().forEach((track) => track.stop());
    audioContext.close().catch(() => {});
  }

  return { getLevel, cleanup };
}
