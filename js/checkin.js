import { CLASS_LABEL } from "./firebase.js";
import { subscribeSessions, isSessionOpen } from "./services/sessionsService.js";
import { submitCheckin } from "./services/checkinsService.js";
import { showToast } from "./components/Toast.js";

const programTag = document.getElementById("programTag");
const sessionTitle = document.getElementById("sessionTitle");
const statusArea = document.getElementById("statusArea");
const form = document.getElementById("checkinForm");
const nameInput = document.getElementById("nameInput");
const submitBtn = document.getElementById("submitBtn");
const messageArea = document.getElementById("messageArea");
const card = document.querySelector(".checkin-card");

programTag.textContent = CLASS_LABEL;

let activeSession = null;
let countdownHandle = null;

function fmtRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function setMessage(text, type = "muted") {
  messageArea.textContent = text;
  messageArea.className = `message ${type}`;
}

function renderClosed(label) {
  if (countdownHandle) clearInterval(countdownHandle);
  sessionTitle.textContent = label || "No session is open right now";
  statusArea.innerHTML = `<span class="status-pill closed"><span class="dot"></span>Closed</span>`;
  nameInput.disabled = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Session closed";
}

function renderOpen(session) {
  activeSession = session;
  sessionTitle.textContent = session.label || "Attendance";
  nameInput.disabled = false;
  submitBtn.disabled = false;
  submitBtn.textContent = "Check In";
  startCountdown(session.endTime.toMillis());
}

function startCountdown(endTimeMs) {
  if (countdownHandle) clearInterval(countdownHandle);
  const tick = () => {
    const remaining = endTimeMs - Date.now();
    if (remaining <= 0) {
      renderClosed("Session just closed");
      return;
    }
    statusArea.innerHTML = `
      <span class="status-pill open"><span class="dot"></span>Open · closes in ${fmtRemaining(remaining)}</span>
    `;
  };
  tick();
  countdownHandle = setInterval(tick, 1000);
}

function pickOpenSession(sessions) {
  const now = Date.now();
  return sessions.find((s) => isSessionOpen(s, now)) || null;
}

card.classList.add("fade-in");

// Real-time: reacts instantly if the admin opens/closes a session,
// no polling needed.
subscribeSessions(
  (sessions) => {
    const open = pickOpenSession(sessions);
    const wasSameSession = activeSession && open && activeSession.id === open.id;

    if (open && !wasSameSession) {
      renderOpen(open);
    } else if (!open) {
      activeSession = null;
      renderClosed("No session is open right now");
    }
  },
  () => {
    sessionTitle.textContent = "Couldn't load session";
    setMessage("Check your connection and reload the page.", "error");
  }
);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeSession) return;

  const rawName = nameInput.value;
  if (!rawName.trim()) {
    setMessage("Please type your name.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Checking in…`;
  setMessage("");

  try {
    if (Date.now() >= activeSession.endTime.toMillis()) {
      renderClosed("Session just closed");
      setMessage("This session closed while you were typing.", "error");
      return;
    }

    const result = await submitCheckin(activeSession.id, rawName);

    if (result.duplicate) {
      setMessage(`You're already checked in as "${result.name}".`, "muted");
    } else {
      setMessage(`You're checked in, ${result.name}. ✓`, "success");
      nameInput.value = "";
    }
  } catch (err) {
    console.error(err);
    setMessage("Something went wrong — please try again.", "error");
  } finally {
    if (activeSession) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Check In";
    }
  }
});
