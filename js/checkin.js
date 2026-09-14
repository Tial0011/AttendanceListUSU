import { db, CLASS_LABEL } from "./firebase.js";
import {
  collection, query, where, orderBy, limit, getDocs,
  addDoc, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const programTag = document.getElementById("programTag");
const sessionTitle = document.getElementById("sessionTitle");
const statusArea = document.getElementById("statusArea");
const form = document.getElementById("checkinForm");
const nameInput = document.getElementById("nameInput");
const submitBtn = document.getElementById("submitBtn");
const messageArea = document.getElementById("messageArea");

programTag.textContent = CLASS_LABEL;

let activeSession = null;
let countdownHandle = null;

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function fmtRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function renderClosed(label) {
  sessionTitle.textContent = label || "No session is open right now";
  statusArea.innerHTML = `<span class="status-pill closed"><span class="dot"></span>Closed</span>`;
  nameInput.disabled = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Session closed";
}

function startCountdown(endTimeMs) {
  if (countdownHandle) clearInterval(countdownHandle);
  const tick = () => {
    const remaining = endTimeMs - Date.now();
    if (remaining <= 0) {
      clearInterval(countdownHandle);
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

async function loadActiveSession() {
  const sessionsRef = collection(db, "sessions");
  // Pull recent sessions and find one whose time window is currently open.
  const q = query(sessionsRef, orderBy("startTime", "desc"), limit(5));
  const snap = await getDocs(q);

  const now = Date.now();
  let found = null;

  snap.forEach((docSnap) => {
    if (found) return;
    const data = docSnap.data();
    const start = data.startTime?.toMillis?.() ?? 0;
    const end = data.endTime?.toMillis?.() ?? 0;
    if (data.status === "open" && now >= start && now < end) {
      found = { id: docSnap.id, ...data };
    }
  });

  if (!found) {
    renderClosed("No session is open right now");
    return;
  }

  activeSession = found;
  sessionTitle.textContent = found.label || "Attendance";
  nameInput.disabled = false;
  submitBtn.disabled = false;
  submitBtn.textContent = "Check In";
  startCountdown(found.endTime.toMillis());
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeSession) return;

  const rawName = nameInput.value;
  const name = normalizeName(rawName);

  if (!name) {
    messageArea.textContent = "Please type your name.";
    messageArea.className = "message error";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Checking in…";
  messageArea.textContent = "";

  try {
    // Re-check the session hasn't just closed
    const endMs = activeSession.endTime.toMillis();
    if (Date.now() >= endMs) {
      renderClosed("Session just closed");
      messageArea.textContent = "This session closed while you were typing.";
      messageArea.className = "message error";
      return;
    }

    // Prevent an obvious double check-in for the same name in this session
    const checkinsRef = collection(db, "sessions", activeSession.id, "checkins");
    const dupQuery = query(checkinsRef, where("nameLower", "==", name.toLowerCase()));
    const dupSnap = await getDocs(dupQuery);

    if (!dupSnap.empty) {
      messageArea.textContent = `You're already checked in as "${name}".`;
      messageArea.className = "message muted";
      submitBtn.disabled = false;
      submitBtn.textContent = "Check In";
      return;
    }

    await addDoc(checkinsRef, {
      name,
      nameLower: name.toLowerCase(),
      timestamp: serverTimestamp(),
    });

    messageArea.textContent = `You're checked in, ${name}. ✓`;
    messageArea.className = "message success";
    nameInput.value = "";
  } catch (err) {
    console.error(err);
    messageArea.textContent = "Something went wrong — please try again.";
    messageArea.className = "message error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Check In";
  }
});

loadActiveSession().catch((err) => {
  console.error(err);
  renderClosed("Couldn't load session");
});

// Re-check every 20s in case a session opens/closes while the page is sitting idle
setInterval(() => {
  if (!activeSession) loadActiveSession().catch(console.error);
}, 20000);
