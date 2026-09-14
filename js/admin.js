import { db, auth, CLASS_LABEL } from "./firebase.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, collectionGroup, doc, addDoc, getDocs, getDoc, deleteDoc,
  updateDoc, query, orderBy, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------- DOM refs ----------
const loginView = document.getElementById("loginView");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-item");
const viewSessions = document.getElementById("view-sessions");
const viewReport = document.getElementById("view-report");

const newSessionForm = document.getElementById("newSessionForm");
const sessionsList = document.getElementById("sessionsList");
const checkinsPanel = document.getElementById("checkinsPanel");
const checkinsPanelTitle = document.getElementById("checkinsPanelTitle");
const checkinsList = document.getElementById("checkinsList");
const closeCheckinsPanel = document.getElementById("closeCheckinsPanel");

const reportBody = document.getElementById("reportBody");
const reportSubtitle = document.getElementById("reportSubtitle");
const mergeBtn = document.getElementById("mergeBtn");

// ---------- Auth ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Couldn't sign in — check your email and password.";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginView.style.display = "none";
    adminShell.style.display = "flex";
    refreshSessions();
    refreshReport();
  } else {
    loginView.style.display = "flex";
    adminShell.style.display = "none";
  }
});

// ---------- Nav ----------
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    viewSessions.style.display = view === "sessions" ? "block" : "none";
    viewReport.style.display = view === "report" ? "block" : "none";
    if (view === "report") refreshReport();
  });
});

// ---------- Sessions ----------
newSessionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const label = document.getElementById("sessionLabel").value.trim();
  const duration = parseInt(document.getElementById("sessionDuration").value, 10);
  const startVal = document.getElementById("sessionStart").value;

  if (!label || !duration || !startVal) return;

  const startDate = new Date(startVal);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  await addDoc(collection(db, "sessions"), {
    label,
    classLabel: CLASS_LABEL,
    durationMinutes: duration,
    startTime: Timestamp.fromDate(startDate),
    endTime: Timestamp.fromDate(endDate),
    status: "open",
    createdAt: Timestamp.now(),
  });

  newSessionForm.reset();
  document.getElementById("sessionDuration").value = 30;
  refreshSessions();
});

function fmtDateTime(ts) {
  if (!ts) return "";
  const d = ts.toDate();
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

async function refreshSessions() {
  const q = query(collection(db, "sessions"), orderBy("startTime", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    sessionsList.innerHTML = `<li class="empty-state">No sessions yet — create the first one above.</li>`;
    return;
  }

  sessionsList.innerHTML = "";
  const now = Date.now();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const isOpen = data.status === "open" && now < data.endTime.toMillis();

    const checkinsSnap = await getDocs(collection(db, "sessions", docSnap.id, "checkins"));
    const count = checkinsSnap.size;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row-main">
        <span class="row-title">${data.label}</span>
        <span class="row-sub">${fmtDateTime(data.startTime)} · ${data.durationMinutes} min · ${count} checked in</span>
      </div>
      <div class="row-actions">
        <span class="badge ${isOpen ? "open" : "closed"}">${isOpen ? "Open" : "Closed"}</span>
        <button class="btn small" data-action="view" data-id="${docSnap.id}" data-label="${data.label}">View</button>
        ${isOpen ? `<button class="btn small" data-action="close" data-id="${docSnap.id}">Close now</button>` : ""}
        <button class="btn small danger" data-action="delete" data-id="${docSnap.id}">Delete</button>
      </div>
    `;
    sessionsList.appendChild(li);
  }

  sessionsList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleSessionAction(btn));
  });
}

async function handleSessionAction(btn) {
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "close") {
    await updateDoc(doc(db, "sessions", id), { status: "closed" });
    refreshSessions();
  }

  if (action === "delete") {
    if (!confirm("Delete this session and all its check-ins? This can't be undone.")) return;
    const checkinsSnap = await getDocs(collection(db, "sessions", id, "checkins"));
    const batch = writeBatch(db);
    checkinsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, "sessions", id));
    await batch.commit();
    refreshSessions();
    refreshReport();
  }

  if (action === "view") {
    const label = btn.dataset.label;
    const checkinsSnap = await getDocs(
      query(collection(db, "sessions", id, "checkins"), orderBy("timestamp", "asc"))
    );
    checkinsPanelTitle.textContent = `Check-ins — ${label}`;
    checkinsList.innerHTML = "";
    if (checkinsSnap.empty) {
      checkinsList.innerHTML = `<li class="empty-state">No check-ins yet.</li>`;
    } else {
      checkinsSnap.forEach((d) => {
        const data = d.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="row-main">
            <span class="row-title">${data.name}</span>
          </div>
          <div class="row-sub">${data.timestamp ? fmtDateTime(data.timestamp) : ""}</div>
        `;
        checkinsList.appendChild(li);
      });
    }
    checkinsPanel.style.display = "block";
    checkinsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

closeCheckinsPanel.addEventListener("click", () => {
  checkinsPanel.style.display = "none";
});

// ---------- Report ----------
let selectedForMerge = [];

async function refreshReport() {
  reportBody.innerHTML = `<tr><td colspan="3" class="empty-state">Loading…</td></tr>`;
  selectedForMerge = [];
  updateMergeBtn();

  const sessionsSnap = await getDocs(collection(db, "sessions"));
  const totalSessions = sessionsSnap.size;
  reportSubtitle.textContent = `Across ${totalSessions} session${totalSessions === 1 ? "" : "s"}`;

  const checkinsSnap = await getDocs(collectionGroup(db, "checkins"));

  const tally = new Map(); // nameLower -> { displayName, sessionIds:Set }
  checkinsSnap.forEach((d) => {
    const data = d.data();
    const key = data.nameLower || data.name?.toLowerCase();
    if (!key) return;
    const sessionId = d.ref.parent.parent.id;
    if (!tally.has(key)) {
      tally.set(key, { displayName: data.name, sessionIds: new Set() });
    }
    tally.get(key).sessionIds.add(sessionId);
  });

  if (tally.size === 0) {
    reportBody.innerHTML = `<tr><td colspan="3" class="empty-state">No check-ins recorded yet.</td></tr>`;
    return;
  }

  const rows = [...tally.entries()].sort((a, b) => b[1].sessionIds.size - a[1].sessionIds.size);

  reportBody.innerHTML = "";
  rows.forEach(([key, info]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="checkbox-cell"><input type="checkbox" data-key="${key}" data-name="${info.displayName}" /></td>
      <td>${info.displayName}</td>
      <td class="attend-count">${info.sessionIds.size} / ${totalSessions}</td>
    `;
    reportBody.appendChild(tr);
  });

  reportBody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.key;
      if (cb.checked) {
        if (selectedForMerge.length >= 2) {
          cb.checked = false;
          return;
        }
        selectedForMerge.push({ key, name: cb.dataset.name });
      } else {
        selectedForMerge = selectedForMerge.filter((s) => s.key !== key);
      }
      updateMergeBtn();
    });
  });
}

function updateMergeBtn() {
  mergeBtn.disabled = selectedForMerge.length !== 2;
}

mergeBtn.addEventListener("click", async () => {
  if (selectedForMerge.length !== 2) return;
  const [a, b] = selectedForMerge;
  const canonical = prompt(
    `Merge "${a.name}" and "${b.name}" into one name.\nType the correct name to use:`,
    a.name
  );
  if (!canonical) return;
  const canonicalTrim = canonical.trim();
  if (!canonicalTrim) return;

  const checkinsSnap = await getDocs(collectionGroup(db, "checkins"));
  const batch = writeBatch(db);
  let touched = 0;

  checkinsSnap.forEach((d) => {
    const data = d.data();
    const key = data.nameLower || data.name?.toLowerCase();
    if (key === a.key || key === b.key) {
      batch.update(d.ref, { name: canonicalTrim, nameLower: canonicalTrim.toLowerCase() });
      touched++;
    }
  });

  if (touched > 0) await batch.commit();
  refreshReport();
});
