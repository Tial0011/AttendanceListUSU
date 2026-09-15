import {
  subscribeSessions, subscribeCheckins, createSession,
  closeSession, deleteSession, isSessionOpen,
} from "../services/sessionsService.js";
import { showToast } from "./Toast.js";
import { skeletonRows } from "./Skeleton.js";

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function fmtDateTime(ts) {
  if (!ts) return "";
  return ts.toDate().toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function renderSessionsView(container) {
  container.innerHTML = `
    <h2>Sessions</h2>
    <div class="subtitle">Create a session and set how long it stays open for check-ins.</div>

    <div class="panel">
      <div class="panel-header"><h3>New session</h3></div>
      <form id="newSessionForm" class="form-grid">
        <div>
          <label for="sessionLabel">Session label</label>
          <input type="text" id="sessionLabel" placeholder="e.g. Day 1 — Intro to Layout" required />
        </div>
        <div>
          <label for="sessionDuration">Open for (minutes)</label>
          <input type="number" id="sessionDuration" min="1" value="30" required />
        </div>
        <div>
          <label for="sessionStart">Starts at</label>
          <input type="datetime-local" id="sessionStart" required />
        </div>
        <div style="display:flex; align-items:flex-end;">
          <button type="submit" class="btn primary" id="createBtn" style="width:100%;">Create session</button>
        </div>
      </form>
    </div>

    <div class="panel" style="margin-top:20px;">
      <div class="panel-header"><h3>All sessions</h3></div>
      <ul class="row-list" id="sessionsList">${skeletonRows(3)}</ul>
    </div>

    <div class="panel" id="checkinsPanel" style="display:none; margin-top:20px;">
      <div class="panel-header">
        <h3 id="checkinsPanelTitle">Check-ins</h3>
        <button class="btn small" id="closeCheckinsPanel">Close</button>
      </div>
      <ul class="row-list" id="checkinsList"></ul>
    </div>
  `;

  const form = container.querySelector("#newSessionForm");
  const createBtn = container.querySelector("#createBtn");
  const listEl = container.querySelector("#sessionsList");
  const checkinsPanel = container.querySelector("#checkinsPanel");
  const checkinsPanelTitle = container.querySelector("#checkinsPanelTitle");
  const checkinsList = container.querySelector("#checkinsList");

  let checkinCountUnsubs = new Map();
  let panelUnsub = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const label = container.querySelector("#sessionLabel").value.trim();
    const duration = parseInt(container.querySelector("#sessionDuration").value, 10);
    const startVal = container.querySelector("#sessionStart").value;
    if (!label || !duration || !startVal) return;

    createBtn.disabled = true;
    createBtn.innerHTML = `<span class="spinner"></span> Creating…`;

    try {
      await createSession({ label, durationMinutes: duration, startDate: new Date(startVal) });
      form.reset();
      container.querySelector("#sessionDuration").value = 30;
      showToast("Session created", "success");
    } catch (err) {
      console.error(err);
      showToast("Couldn't create session — check your connection and try again.", "error");
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Create session";
    }
  });

  container.querySelector("#closeCheckinsPanel").addEventListener("click", () => {
    checkinsPanel.style.display = "none";
    if (panelUnsub) panelUnsub();
  });

  function rowHTML(s) {
    const open = isSessionOpen(s);
    return `
      <li class="fade-in-row" data-row-for="${s.id}">
        <div class="row-main">
          <span class="row-title">${escapeHtml(s.label)}</span>
          <span class="row-sub">${fmtDateTime(s.startTime)} · ${s.durationMinutes} min · <span data-count-for="${s.id}">…</span></span>
        </div>
        <div class="row-actions">
          <span class="badge ${open ? "open" : "closed"}">${open ? "Open" : "Closed"}</span>
          <button class="btn small" data-action="view" data-id="${s.id}" data-label="${escapeHtml(s.label)}">View</button>
          ${open ? `<button class="btn small" data-action="close" data-id="${s.id}">Close now</button>` : ""}
          <button class="btn small danger" data-action="delete" data-id="${s.id}">Delete</button>
        </div>
      </li>
    `;
  }

  function attachRowHandlers() {
    listEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn));
    });
  }

  async function handleAction(btn) {
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "close") {
      btn.disabled = true;
      try {
        await closeSession(id);
        showToast("Session closed", "success");
      } catch (err) {
        showToast("Couldn't close session", "error");
        btn.disabled = false;
      }
    }

    if (action === "delete") {
      if (!confirm("Delete this session and all its check-ins? This can't be undone.")) return;
      btn.disabled = true;
      try {
        await deleteSession(id);
        showToast("Session deleted", "success");
      } catch (err) {
        showToast("Couldn't delete session", "error");
        btn.disabled = false;
      }
    }

    if (action === "view") {
      const label = btn.dataset.label;
      checkinsPanelTitle.textContent = `Check-ins — ${label}`;
      checkinsList.innerHTML = skeletonRows(2, 40);
      checkinsPanel.style.display = "block";
      checkinsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

      if (panelUnsub) panelUnsub();
      panelUnsub = subscribeCheckins(
        id,
        (checkins) => {
          if (!checkins.length) {
            checkinsList.innerHTML = `<li class="empty-state">No check-ins yet.</li>`;
            return;
          }
          checkinsList.innerHTML = checkins.map((c) => `
            <li class="fade-in-row">
              <div class="row-main"><span class="row-title">${escapeHtml(c.name)}</span></div>
              <div class="row-sub">${c.timestamp ? fmtDateTime(c.timestamp) : "…"}</div>
            </li>
          `).join("");
        },
        () => showToast("Couldn't load check-ins", "error")
      );
    }
  }

  const unsubSessions = subscribeSessions(
    (sessions) => {
      if (!sessions.length) {
        listEl.innerHTML = `<li class="empty-state">No sessions yet — create the first one above.</li>`;
        return;
      }
      listEl.innerHTML = sessions.map(rowHTML).join("");
      attachRowHandlers();

      checkinCountUnsubs.forEach((u) => u());
      checkinCountUnsubs = new Map();
      sessions.forEach((s) => {
        const unsub = subscribeCheckins(s.id, (checkins) => {
          const el = listEl.querySelector(`[data-count-for="${s.id}"]`);
          if (el) el.textContent = `${checkins.length} checked in`;
        });
        checkinCountUnsubs.set(s.id, unsub);
      });
    },
    () => showToast("Couldn't load sessions", "error")
  );

  return () => {
    unsubSessions();
    checkinCountUnsubs.forEach((u) => u());
    if (panelUnsub) panelUnsub();
  };
}
