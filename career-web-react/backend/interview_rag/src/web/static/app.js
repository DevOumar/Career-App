const DISCLAIMER =
  "Cet assistant propose des conseils génériques de préparation et ne " +
  "remplace pas un accompagnement RH ou un coach carrière personnalisé.";

const END_INTERVIEW_MESSAGE =
  "[Le candidat souhaite clore l'entretien. Conclus l'entretien et fournis " +
  "le bilan complet et la correction finale en détaillant ses points forts " +
  "et ses axes d'amélioration.]";

// Éléments du DOM
const setupPanel = document.getElementById("setup");
const chatPanel = document.getElementById("chat");
const callScreen = document.getElementById("call-screen");
const setupError = document.getElementById("setup-error");
const startChatBtn = document.getElementById("start-chat-btn");
const startCallBtn = document.getElementById("start-call-btn");
const resetBtn = document.getElementById("reset-btn");
const endBtn = document.getElementById("end-btn");
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

// Éléments spécifiques à l'appel téléphonique
const callTimerEl = document.getElementById("call-timer");
const callStatusEl = document.getElementById("call-status");
const callCaptionsEl = document.getElementById("call-captions");
const micToggleBtn = document.getElementById("mic-toggle-btn");
const micLabel = document.getElementById("mic-label");
const endCallBtn = document.getElementById("end-call-btn");
const micChatBtn = document.getElementById("mic-chat-btn");
const micChatStatus = document.getElementById("mic-chat-status");

// État de l'application
let callTimerInterval = null;
let callSeconds = 0;
let mediaRecorder = null;
let audioChunks = [];
let isRecordingCall = false;
let isRecordingChat = false;
let currentMode = "chat"; // "chat" ou "call"

function showError(el, message) {
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideError(el) {
  el.classList.add("hidden");
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const label = document.createElement("span");
  label.className = "role-label";
  label.textContent = role === "recruiter" ? "Recruteur" : "Toi";
  wrapper.appendChild(label);

  const cleanText = text.replace(DISCLAIMER, "").trim();
  wrapper.appendChild(document.createTextNode(cleanText));

  if (text.includes(DISCLAIMER)) {
    const disclaimer = document.createElement("span");
    disclaimer.className = "disclaimer";
    disclaimer.textContent = DISCLAIMER;
    wrapper.appendChild(disclaimer);
  }

  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur inconnue.");
  }
  return data;
}

async function postAudioBytes(url, audioBlob) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": audioBlob.type || "audio/webm" },
    body: audioBlob,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur lors de la transcription.");
  }
  return data;
}

// --- Synthèse Vocale (Text-to-Speech) ---
function speakText(text, onEnd) {
  if (!("speechSynthesis" in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel(); // Stoppe toute parole précédente

  const cleanText = text.replace(DISCLAIMER, "").trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "fr-FR";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Sélection d'une voix française si disponible
  const voices = window.speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frVoice) {
    utterance.voice = frVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// --- Gestion de la minuterie de l'appel ---
function startCallTimer() {
  callSeconds = 0;
  updateTimerDisplay();
  clearInterval(callTimerInterval);
  callTimerInterval = setInterval(() => {
    callSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimerInterval);
}

function updateTimerDisplay() {
  const mins = Math.floor(callSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (callSeconds % 60).toString().padStart(2, "0");
  callTimerEl.textContent = `${mins}:${secs}`;
}

// --- Captions sur l'écran d'appel ---
function updateCallCaption(role, text) {
  const cleanText = text.replace(DISCLAIMER, "").trim();
  callCaptionsEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = `caption-text ${role}`;
  p.textContent = role === "recruiter" ? `RH : ${cleanText}` : `Toi : ${cleanText}`;
  callCaptionsEl.appendChild(p);
}

// --- Démarrage d'un entretien (Chat ou Appel) ---
async function startSession(mode) {
  currentMode = mode;
  hideError(setupError);
  startChatBtn.disabled = true;
  startCallBtn.disabled = true;

  const type_entretien = document.getElementById("type-entretien").value;
  const domaine = document.getElementById("domaine").value.trim();
  const offre = document.getElementById("offre").value.trim();

  try {
    const data = await postJSON("/api/start", { type_entretien, domaine, offre });
    messagesEl.innerHTML = "";
    addMessage("recruiter", data.message);

    setupPanel.classList.add("hidden");
    resetBtn.classList.remove("hidden");

    if (mode === "chat") {
      chatPanel.classList.remove("hidden");
      callScreen.classList.add("hidden");
      if (endBtn) endBtn.classList.remove("hidden");
      chatInput.disabled = false;
      chatInput.focus();
    } else {
      // Mode Appel Téléphonique
      callScreen.classList.remove("hidden");
      chatPanel.classList.add("hidden");
      startCallTimer();
      callStatusEl.textContent = "En entretien téléphonique…";
      updateCallCaption("recruiter", data.message);

      // Énoncer la première question du recruteur à voix haute
      speakText(data.message, () => {
        callStatusEl.textContent = "Clique sur 'Parler' pour répondre au micro";
      });
    }
  } catch (err) {
    showError(setupError, err.message);
  } finally {
    startChatBtn.disabled = false;
    startCallBtn.disabled = false;
  }
}

startChatBtn.addEventListener("click", () => startSession("chat"));
startCallBtn.addEventListener("click", () => startSession("call"));

// --- Saisie texte en chat ---
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  addMessage("candidate", message);
  chatInput.value = "";
  chatInput.disabled = true;
  typingEl.classList.remove("hidden");

  try {
    const data = await postJSON("/api/message", { message });
    addMessage("recruiter", data.message);
  } catch (err) {
    addMessage("recruiter", `Erreur : ${err.message}`);
  } finally {
    typingEl.classList.add("hidden");
    chatInput.disabled = false;
    chatInput.focus();
  }
});

// --- Bouton Terminer & Obtenir le bilan (en chat) ---
if (endBtn) {
  endBtn.addEventListener("click", async () => {
    addMessage("candidate", "Je souhaite clore l'entretien et obtenir mon bilan complet.");
    chatInput.disabled = true;
    endBtn.classList.add("hidden");
    typingEl.classList.remove("hidden");

    try {
      const data = await postJSON("/api/message", { message: END_INTERVIEW_MESSAGE });
      addMessage("recruiter", data.message);
    } catch (err) {
      addMessage("recruiter", `Erreur : ${err.message}`);
      endBtn.classList.remove("hidden");
      chatInput.disabled = false;
    } finally {
      typingEl.classList.add("hidden");
    }
  });
}

// --- Micro enregistrement vocal pour l'Appel Téléphonique ---
micToggleBtn.addEventListener("click", async () => {
  if (isRecordingCall) {
    // Stopper l'enregistrement et envoyer à Whisper
    stopCallRecording();
  } else {
    // Démarrer l'enregistrement vocal
    startCallRecording();
  }
});

async function startCallRecording() {
  try {
    stopSpeaking();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      if (audioBlob.size === 0) return;

      callStatusEl.textContent = "Whisper analyse ta réponse orale…";
      micToggleBtn.disabled = true;

      try {
        const data = await postAudioBytes("/api/audio-message", audioBlob);
        // Ajout à l'historique du chat et mise à jour de l'écran d'appel
        addMessage("candidate", `[Vocal] ${data.transcribed_text}`);
        addMessage("recruiter", data.message);

        updateCallCaption("candidate", data.transcribed_text);

        // Faire répondre le recruteur à voix haute
        callStatusEl.textContent = "Le recruteur te répond…";
        speakText(data.message, () => {
          updateCallCaption("recruiter", data.message);
          callStatusEl.textContent = "Clique sur 'Parler' pour ta prochaine réplique";
          micToggleBtn.disabled = false;
        });
      } catch (err) {
        callStatusEl.textContent = `Erreur : ${err.message}`;
        micToggleBtn.disabled = false;
      }
    };

    mediaRecorder.start();
    isRecordingCall = true;
    micToggleBtn.classList.add("recording");
    micLabel.textContent = "Stop / Envoyer";
    callStatusEl.textContent = "🔴 Enregistrement vocal en cours… Parle à voix haute !";
  } catch (err) {
    callStatusEl.textContent = "Erreur micro : Autorisation refusée ou microphone introuvable.";
  }
}

function stopCallRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecordingCall = false;
  micToggleBtn.classList.remove("recording");
  micLabel.textContent = "Parler";
}

// --- Raccrocher l'Appel Téléphonique et Obtenir le Bilan Final ---
endCallBtn.addEventListener("click", async () => {
  stopCallTimer();
  stopSpeaking();
  if (isRecordingCall) {
    stopCallRecording();
  }

  callStatusEl.textContent = "Clôture de l'entretien et génération du bilan...";
  endCallBtn.disabled = true;
  micToggleBtn.disabled = true;

  try {
    const data = await postJSON("/api/message", { message: END_INTERVIEW_MESSAGE });
    addMessage("candidate", "Entretien terminé (Appel raccroché).");
    addMessage("recruiter", data.message);

    // Basculer vers l'écran de chat pour afficher le bilan complet et lisible
    callScreen.classList.add("hidden");
    chatPanel.classList.remove("hidden");

    // Énoncer une brève synthèse à voix haute
    speakText("L'entretien est terminé. Voici votre bilan complet avec vos points forts et axes d'amélioration.");
  } catch (err) {
    showError(setupError, err.message);
  } finally {
    endCallBtn.disabled = false;
    micToggleBtn.disabled = false;
  }
});

// --- Microphone rapide dans le Chat Écrit ---
if (micChatBtn) {
  micChatBtn.addEventListener("click", async () => {
    if (isRecordingChat) {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      isRecordingChat = false;
      micChatBtn.classList.remove("recording");
      micChatStatus.classList.add("hidden");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          if (audioBlob.size === 0) return;

          typingEl.textContent = "Whisper transcrit ton message vocal…";
          typingEl.classList.remove("hidden");

          try {
            const data = await postAudioBytes("/api/audio-message", audioBlob);
            addMessage("candidate", `[Vocal] ${data.transcribed_text}`);
            addMessage("recruiter", data.message);
          } catch (err) {
            addMessage("recruiter", `Erreur vocal : ${err.message}`);
          } finally {
            typingEl.classList.add("hidden");
            typingEl.textContent = "Le recruteur réfléchit…";
          }
        };

        mediaRecorder.start();
        isRecordingChat = true;
        micChatBtn.classList.add("recording");
        micChatStatus.classList.remove("hidden");
      } catch (err) {
        alert("Accès au microphone refusé ou non supporté.");
      }
    }
  });
}

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

resetBtn.addEventListener("click", () => {
  stopCallTimer();
  stopSpeaking();
  if (isRecordingCall) stopCallRecording();

  callScreen.classList.add("hidden");
  chatPanel.classList.add("hidden");
  resetBtn.classList.add("hidden");
  setupPanel.classList.remove("hidden");
  messagesEl.innerHTML = "";
});
