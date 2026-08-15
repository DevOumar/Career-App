const DISCLAIMER =
  "Cet assistant propose des conseils génériques de préparation et ne " +
  "remplace pas un accompagnement RH ou un coach carrière personnalisé.";

const setupPanel = document.getElementById("setup");
const chatPanel = document.getElementById("chat");
const setupError = document.getElementById("setup-error");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

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

startBtn.addEventListener("click", async () => {
  hideError(setupError);
  startBtn.disabled = true;
  startBtn.textContent = "Démarrage…";

  const type_entretien = document.getElementById("type-entretien").value;
  const domaine = document.getElementById("domaine").value.trim();

  try {
    const data = await postJSON("/api/start", { type_entretien, domaine });
    messagesEl.innerHTML = "";
    addMessage("recruiter", data.message);
    setupPanel.classList.add("hidden");
    chatPanel.classList.remove("hidden");
    resetBtn.classList.remove("hidden");
    chatInput.focus();
  } catch (err) {
    showError(setupError, err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Commencer l'entretien";
  }
});

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

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

resetBtn.addEventListener("click", () => {
  chatPanel.classList.add("hidden");
  resetBtn.classList.add("hidden");
  setupPanel.classList.remove("hidden");
  messagesEl.innerHTML = "";
});
